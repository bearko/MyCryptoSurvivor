// SPEC-090: GUM とゴールドダスト (= 式・保存・挑戦からの付与)
// 実行: node --test tests/meta.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  gumForScore, dustForStage, rewardScore, normalizeMeta, getMeta, addRewards, spend, setNodeRank, nodeRank, resetNodes,
  grantRunRewards, grantBossDust, runDust, runStagesForRewards, _reloadMeta, GUM_MIN,
} = await import("../js/meta.js");
const { computeScore } = await import("../js/battle/activity-report.js");
const { state } = await import("../js/state.js");
const { LS_META } = await import("../js/constants.js");

test("GUM は √スコア ÷ 2 (= 最低 5)", () => {
  assert.equal(gumForScore(18000), 67);
  assert.equal(gumForScore(520000), 361);
  assert.equal(gumForScore(2800000), 837);
  assert.equal(gumForScore(0), GUM_MIN);
  assert.equal(gumForScore(-5), GUM_MIN);
  assert.equal(gumForScore("x"), GUM_MIN);
});

test("ゴールドダストはステージ 1/2/3 のボスで 1/2/3", () => {
  assert.deepEqual([0, 1, 2].map(dustForStage), [1, 2, 3]);
});

test("報酬のスコアは活動レポートと同じ式 (= 敗北では速さの点を入れない)", () => {
  const stages = [
    { idx: 0, kills: 100, level: 5, elapsedMs: 60000, ownedExtensions: [{ extId: 1 }, { extId: 13 }] },
    { idx: 1, kills: 50, level: 7, elapsedMs: 30000, ownedExtensions: [{ extId: 1 }, { extId: 13 }, { extId: 2 }] },
  ];
  const run = { stages, totalKills: 150, totalElapsedMs: 90000 };
  assert.equal(rewardScore(stages, true), computeScore(run), "全クリアは同じ");
  assert.equal(rewardScore(stages, false), computeScore(run) - Math.max(0, 60000 - 90 * 50), "敗北は速さの点なし");
  assert.equal(rewardScore([], false), 500 + 5000);
});

test("壊れた保存は既定に直す", () => {
  assert.deepEqual(normalizeMeta(null), { v: 1, gum: 0, dust: 0, nodes: {}, earned: { gum: 0, dust: 0 }, runs: 0 });
  const m = normalizeMeta({ gum: "12.7", dust: -3, nodes: { vit_hp: 2, bad: 0, "x y": 3, atk_dmg: "1" }, earned: { gum: 5 }, runs: 2 });
  assert.deepEqual(m, { v: 1, gum: 12, dust: 0, nodes: { vit_hp: 2, atk_dmg: 1 }, earned: { gum: 5, dust: 0 }, runs: 2 });
});

test("足す・払う・節・作り直す (= 保存される)", () => {
  store.clear(); _reloadMeta();
  addRewards({ gum: 100, dust: 2 });
  assert.equal(spend({ gum: 60, dust: 1 }), true);
  assert.equal(spend({ gum: 60 }), false, "足りなければ払わない");
  setNodeRank("vit_hp", 2);
  assert.equal(nodeRank("vit_hp"), 2);
  assert.equal(nodeRank("nope"), 0);
  const saved = JSON.parse(store.get(LS_META));
  assert.deepEqual([saved.gum, saved.dust, saved.nodes, saved.earned], [40, 1, { vit_hp: 2 }, { gum: 100, dust: 2 }]);
  resetNodes({ gum: 60, dust: 1 });
  const m = _reloadMeta();
  assert.deepEqual([m.gum, m.dust, m.nodes], [100, 2, {}]);
});

test("挑戦から: 倒れたときはいまのステージも数え、 ボスを倒した分のダストが結果に出る", () => {
  store.clear(); _reloadMeta();
  state.currentStageIdx = 1;
  state.run = { stages: [{ idx: 0, kills: 1000, level: 20, elapsedMs: 250000, ownedExtensions: [{ extId: 1 }], dust: 1 }], totalKills: 1000, totalElapsedMs: 250000 };
  state.killCount = 300; state.level = 24; state.ownedExtensions = [{ extId: 1, level: 3 }, { extId: 13, level: 1 }];
  state.battle.stageElapsedMs = 80000;
  const st = runStagesForRewards();
  assert.equal(st.length, 2);
  assert.equal(st[1].kills, 300);
  assert.equal(grantBossDust(1), 2);
  state.run.stages[0].dust = 1;
  assert.equal(runDust(), 1);
  const r = grantRunRewards(false);
  assert.equal(r.score, rewardScore(st, false));
  assert.equal(r.gum, gumForScore(r.score));
  const m = getMeta();
  assert.deepEqual([m.gum, m.dust, m.runs, m.earned.gum], [r.gum, 2, 1, r.gum]);
});
