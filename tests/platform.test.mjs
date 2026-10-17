// SPEC-039: ステージ → トロフィー ID の対応と、SDK がない・失敗するときに例外を出さないこと。
// 実行: node --test tests/platform.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { trophyIdsForStageEnd, reportStageEnd, initPlatform } from "../js/platform.js";

const STAGES = 3; // js/constants.js の STAGE_TABLE（あかばす・ほれりす・とろい）

test("ステージ終了で送るトロフィー", () => {
  assert.deepEqual(trophyIdsForStageEnd(0, STAGES), ["survivor.stage1"]);
  assert.deepEqual(trophyIdsForStageEnd(1, STAGES), []);
  assert.deepEqual(trophyIdsForStageEnd(2, STAGES), ["survivor.clear"]);
});

test("SDK がなくても例外を出さない", () => {
  assert.doesNotThrow(() => initPlatform("0.1.0"));
  assert.doesNotThrow(() => reportStageEnd(0, STAGES));
});

test("SDK があれば unlockTrophy を呼び、失敗してもゲームを止めない", async () => {
  const sent = [];
  globalThis.window = {
    BearkoGames: {
      init: async () => ({ ok: true }),
      unlockTrophy: async (id) => { sent.push(id); return { ok: id !== "survivor.clear", error: "network" }; },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    initPlatform("0.1.0");
    reportStageEnd(0, STAGES);
    reportStageEnd(2, STAGES);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, ["survivor.stage1", "survivor.clear"]);
    globalThis.window.BearkoGames.unlockTrophy = () => { throw new Error("boom"); };
    assert.doesNotThrow(() => reportStageEnd(0, STAGES));
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------- SPEC-091: 全体チャット
import { setChatVisible } from "../js/platform.js";

test("チャット：SDK がない・古い (= chat が無い) なら何もしない", () => {
  assert.doesNotThrow(() => setChatVisible(true));
  globalThis.window = { BearkoGames: { init: async () => ({ ok: true }) } };
  try {
    assert.doesNotThrow(() => setChatVisible(false));
  } finally {
    delete globalThis.window;
  }
});

test("チャット：init で右上に置いて読み込み中は隠し、出す・隠すを SDK に渡す", async () => {
  const calls = [];
  let initOpts = null;
  globalThis.window = {
    BearkoGames: {
      init: async (o) => { initOpts = o; return { ok: true }; },
      chat: { setVisible: (on) => { calls.push(on); } },
    },
  };
  try {
    initPlatform("0.1.0");
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(initOpts.chat.position, "top-right");
    assert.deepEqual(calls, [false]);
    setChatVisible(true);
    setChatVisible(0);
    assert.deepEqual(calls, [false, true, false]);
    globalThis.window.BearkoGames.chat.setVisible = () => { throw new Error("boom"); };
    const warn = console.warn;
    console.warn = () => {};
    try { assert.doesNotThrow(() => setChatVisible(true)); } finally { console.warn = warn; }
  } finally {
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------- SPEC-040: RTA
import { rtaCheckpointForStageEnd, isRtaAvailable, startRtaRun, reportRtaStageEnd, abortRtaRun, RTA_REGULATION } from "../js/platform.js";

test("RTA：ステージ終了で送る区切り", () => {
  assert.equal(rtaCheckpointForStageEnd(0, STAGES), "stage1");
  assert.equal(rtaCheckpointForStageEnd(1, STAGES), "stage2");
  assert.equal(rtaCheckpointForStageEnd(2, STAGES), "clear");
  assert.equal(rtaCheckpointForStageEnd(3, STAGES), null);
  assert.equal(rtaCheckpointForStageEnd(0, 0), null);
});

test("RTA：SDK がなければ出さず、例外も出さない", () => {
  assert.equal(isRtaAvailable(), false);
  assert.doesNotThrow(() => { startRtaRun(); reportRtaStageEnd(0, STAGES, 1000); abortRtaRun(); });
});

test("RTA：計測中だけ区切り・中断を送り、失敗してもゲームを止めない", async () => {
  const calls = [];
  let running = false;
  globalThis.window = {
    BearkoGames: {
      rta: {
        start: async (o) => { calls.push(["start", o.regulation]); running = true; return { ok: true }; },
        checkpoint: async (id, o) => { calls.push(["checkpoint", id, o.igtMs]); return { ok: false, error: "network" }; },
        abort: async () => { calls.push(["abort"]); running = false; return { ok: true }; },
        current: () => (running ? { runId: "x" } : null),
      },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(isRtaAvailable(), true);
    reportRtaStageEnd(0, STAGES, 1); // 始める前は送らない
    startRtaRun();
    await new Promise((r) => setTimeout(r, 0));
    reportRtaStageEnd(0, STAGES, 240000);
    reportRtaStageEnd(2, STAGES, 720000);
    abortRtaRun();
    abortRtaRun(); // 2 回目は送らない
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(calls, [["start", RTA_REGULATION], ["checkpoint", "stage1", 240000], ["checkpoint", "clear", 720000], ["abort"]]);
    globalThis.window.BearkoGames.rta.start = () => { throw new Error("boom"); };
    assert.doesNotThrow(() => startRtaRun());
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------- SPEC-048: ABSOLUTE ×2.0 の RTA
import { rtaRegulationFor, RTA_REGULATION_ABSOLUTE_2X } from "../js/platform.js";

test("RTA：ルールからレギュレーションを決める", () => {
  const all = (m) => ({ spawnMul: m, hpMul: m, dmgMul: m, speedMul: m });
  assert.equal(rtaRegulationFor("NORMAL", all(1)), RTA_REGULATION);
  assert.equal(rtaRegulationFor(undefined, undefined), RTA_REGULATION);
  assert.equal(rtaRegulationFor("ABSOLUTE", all(2)), RTA_REGULATION_ABSOLUTE_2X);
  assert.equal(RTA_REGULATION, "survivor-normal-v4", "SPEC-082: v1.3 から");
  assert.equal(RTA_REGULATION_ABSOLUTE_2X, "survivor-absolute-2x-v4");
  assert.equal(rtaRegulationFor("ABSOLUTE", all(1.5)), null, "×2.0 以外の ABSOLUTE は計測しない");
  assert.equal(rtaRegulationFor("ABSOLUTE", { ...all(2), speedMul: 1.75 }), null, "1 軸でも違えば計測しない");
  assert.equal(rtaRegulationFor("ABSOLUTE", null), null);
  assert.equal(rtaRegulationFor("HARD", all(1)), null);
});

test("RTA：ABSOLUTE ×2.0 のレギュレーションで始める", async () => {
  const calls = [];
  globalThis.window = { BearkoGames: { rta: { start: async (o) => { calls.push(o.regulation); return { ok: true }; }, current: () => null } } };
  try {
    startRtaRun(RTA_REGULATION_ABSOLUTE_2X);
    startRtaRun();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(calls, ["survivor-absolute-2x-v4", "survivor-normal-v4"]);
  } finally {
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------- SPEC-041: 総合スコア
import { scoreMetrics, reportRunScore, SCORE_BALANCE } from "../js/platform.js";

test("総合スコア：送る成績の形", () => {
  const run = { stages: [{}, {}, {}] };
  assert.deepEqual(scoreMetrics({ run, cleared: true, reportScore: 150000.4, regulation: "NORMAL", absolute: { spawnMul: 3 } }),
    { stagesCleared: 3, cleared: true, reportScore: 150000, difficulty: "normal", balance: 3 }, "NORMAL では 4 軸を送らない");
  // SPEC-051: ABSOLUTE は名前と 4 軸だけ。 倍率 (= regulationMul) は送らない
  assert.deepEqual(scoreMetrics({ run, cleared: true, reportScore: 1, regulation: "ABSOLUTE", absolute: { spawnMul: 2, hpMul: 2.5, dmgMul: 1, speedMul: 0.5 } }),
    { stagesCleared: 3, cleared: true, reportScore: 1, difficulty: "absolute", balance: 3, absolute: { spawnMul: 2, hpMul: 2.5, dmgMul: 1, speedMul: 0.5 } });
  assert.deepEqual(scoreMetrics({ run, cleared: false, regulation: "ABSOLUTE", absolute: { hpMul: 2 } }).absolute,
    { spawnMul: 1, hpMul: 2, dmgMul: 1, speedMul: 1 }, "足りない軸は 1.0");
  const lost = scoreMetrics({ run: { stages: [{}] }, cleared: false, reportScore: 999 });
  assert.deepEqual([lost.stagesCleared, lost.cleared, lost.reportScore], [1, false, 0], "倒れたら活動レポートのスコアは入れない");
  // SPEC-066 / SPEC-082: バランスの版 (= 共通基盤の総合スコア v4 が、 版ごとの係数を使う。 v1.3 は 3)
  assert.equal(SCORE_BALANCE, 3);
  assert.equal(lost.balance, 3);
});

test("総合スコア：ステージを 1 つも終えていなければ送らず、SDK がなくても例外を出さない", async () => {
  assert.doesNotThrow(() => reportRunScore(scoreMetrics({ run: { stages: [{}] }, cleared: false })));
  const sent = [];
  globalThis.window = { BearkoGames: { submitScore: async (m) => { sent.push(m.stagesCleared); return { ok: true }; } } };
  try {
    reportRunScore(scoreMetrics({ run: { stages: [] }, cleared: false }));
    reportRunScore(scoreMetrics({ run: { stages: [{}, {}] }, cleared: false }));
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, [2]);
  } finally {
    delete globalThis.window;
  }
});

// ---------------------------------------------------------------- SPEC-052: 結果画面 (= 通知の置き場所・名前の既定)
import { defaultPlayerName, platformUserName, placePlatformToasts, PORTAL_URL } from "../js/platform.js";

test("名前の既定：ログイン中の名前 → 前に送った名前 → 空 (= anonymous にしない)", () => {
  assert.equal(defaultPlayerName({ accountName: "くま", saved: "bear" }), "くま");
  assert.equal(defaultPlayerName({ accountName: null, saved: "bear" }), "bear");
  assert.equal(defaultPlayerName({ accountName: "  ", saved: " bear " }), "bear");
  assert.equal(defaultPlayerName({ saved: "anonymous" }), "", "前に送った anonymous は空に");
  assert.equal(defaultPlayerName({ saved: "Anonymous" }), "");
  assert.equal(defaultPlayerName({}), "");
  assert.equal(defaultPlayerName(), "");
  assert.equal(defaultPlayerName({ accountName: "あ".repeat(40) }).length, 30, "ランキングの名前は 30 文字まで");
  assert.equal(PORTAL_URL, "https://bearko.games/");
});

test("SDK がなければ名前は null、 通知の置き場所も何もしない", () => {
  assert.equal(platformUserName(), null);
  assert.doesNotThrow(() => placePlatformToasts(100));
});

test("SDK があればログイン中の名前を読み、 通知を上に置く (= 古い SDK・失敗でも止めない)", () => {
  const calls = [];
  globalThis.window = {
    BearkoGames: {
      getUser: () => ({ id: "u1", name: " くま " }),
      setToastPosition: (o) => calls.push(o),
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(platformUserName(), "くま");
    placePlatformToasts(120);
    assert.deepEqual(calls, [{ position: "top", offset: 120 }]);
    globalThis.window.BearkoGames.getUser = () => null;
    assert.equal(platformUserName(), null, "ログインしていない");
    globalThis.window.BearkoGames.getUser = () => { throw new Error("boom"); };
    assert.equal(platformUserName(), null);
    delete globalThis.window.BearkoGames.setToastPosition; // SDK 1.4 以前
    assert.doesNotThrow(() => placePlatformToasts(120));
    globalThis.window.BearkoGames.setToastPosition = () => { throw new Error("boom"); };
    assert.doesNotThrow(() => placePlatformToasts(120));
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});
