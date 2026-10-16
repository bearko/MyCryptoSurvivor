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
