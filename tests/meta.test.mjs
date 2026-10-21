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
  gumRows, mergeGumRows, gumTotal, GUM_RATE, dustForStage, rewardScore, normalizeMeta, getMeta, addRewards, spend, setNodeRank, nodeRank, resetNodes,
  grantRunRewards, grantBossDust, runDust, runStagesForRewards, _reloadMeta, GUM_MIN,
} = await import("../js/meta.js");
const { computeScore } = await import("../js/battle/activity-report.js");
const { state } = await import("../js/state.js");
const { LS_META } = await import("../js/constants.js");

test("SPEC-136: GUM は遊んだぶんの式 (= 秒 1 ・ 撃破 20 体で 1 ・ ステージ 50 × 番号 ・ Lv 5 ・ ギフト券 30)", () => {
  assert.deepEqual({ ...GUM_RATE }, { sec: 1, killsPer: 20, kill: 1, stage: 50, level: 5, gift: 30 });
  const rows = gumRows({ sec: 274.6, kills: 6994, stageNos: [1], level: 31, gifts: 3 });
  assert.deepEqual(rows.map((r) => [r.key, r.n, r.gum]), [["sec", 275, 275], ["kills", 349, 349], ["stage", 1, 50], ["level", 31, 155], ["gifts", 3, 90]]);
  assert.equal(rows.find((r) => r.key === "kills").kills, 6994);
  assert.deepEqual(gumRows({}), [], "0 の行は出さない");
  assert.deepEqual(gumRows({ sec: -3, kills: "x", gifts: -1 }), []);
  const m = mergeGumRows(gumRows({ sec: 100, kills: 30, stageNos: [1] }), gumRows({ sec: 50, kills: 25, stageNos: [2] }));
  assert.deepEqual(m.map((r) => [r.key, r.n, r.gum]), [["sec", 150, 150], ["kills", 2, 2], ["stage", 3, 150]]);
  assert.deepEqual(m.find((r) => r.key === "stage").stageNos, [1, 2]);
  assert.deepEqual(gumTotal(rows, 0.1), { base: 919, mul: 0.1, bonus: 92, total: 1011 });
  assert.deepEqual(gumTotal(rows), { base: 919, mul: 0, bonus: 0, total: 919 });
  assert.ok(GUM_MIN > 0);
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
  assert.deepEqual(normalizeMeta(null), { v: 1, gum: 0, dust: 0, nodes: {}, earned: { gum: 0, dust: 0 }, runs: 0, heroClears: {} });
  const m = normalizeMeta({ gum: "12.7", dust: -3, nodes: { vit_hp: 2, bad: 0, "x y": 3, atk_dmg: "1" }, earned: { gum: 5 }, runs: 2 });
  assert.deepEqual(m, { v: 1, gum: 12, dust: 0, nodes: { vit_hp: 2, atk_dmg: 1 }, earned: { gum: 5, dust: 0 }, runs: 2, heroClears: {} });
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
  state.shop = { gifts: 2 };
  const st = runStagesForRewards();
  assert.equal(st.length, 2);
  assert.equal(st[1].kills, 300);
  assert.equal(grantBossDust(1), 2);
  state.run.stages[0].dust = 1;
  assert.equal(runDust(), 1);
  const r = grantRunRewards(false);
  assert.equal(r.score, rewardScore(st, false));
  // SPEC-136: 生存 250 ＋ 80 秒 ・ 撃破 1300 体 (= 65) ・ Lv.24 (= 120) ・ ギフト券 2 枚 (= 60)
  assert.equal(r.gum, 330 + 65 + 120 + 60);
  assert.deepEqual(r.rows.map((x) => [x.key, x.gum]), [["sec", 330], ["kills", 65], ["level", 120], ["gifts", 60]]);
  assert.equal(state.shop.gifts, 0, "残ったギフト券は GUM に換わる");
  const m = getMeta();
  assert.deepEqual([m.gum, m.dust, m.runs, m.earned.gum], [r.gum, 2, 1, r.gum]);
});

test("SPEC-136: ステージクリアでもらったぶんは二重にしない (= 内訳には並べる)", () => {
  store.clear(); _reloadMeta();
  state.currentStageIdx = 1;
  const rows0 = gumRows({ sec: 200, kills: 400, stageNos: [1] });
  state.run = { stages: [{ idx: 0, kills: 400, level: 20, elapsedMs: 200000, gum: 270, gumRows: rows0, gumBonus: 0 }], totalKills: 400, totalElapsedMs: 200000, missionGum: 90, missionClears: 2 };
  state.killCount = 100; state.level = 22; state.battle.stageElapsedMs = 60000;
  state.shop = { gifts: 0 };
  const r = grantRunRewards(false);
  assert.equal(r.gum, 270 + (60 + 5 + 110) + 90);
  assert.deepEqual(r.rows.map((x) => [x.key, x.gum]), [["sec", 260], ["kills", 25], ["stage", 50], ["level", 110]]);
  assert.deepEqual([r.missions, r.missionGum], [2, 90]);
  assert.equal(getMeta().gum, 60 + 5 + 110, "いま払うのはステージクリアのあとのぶんだけ");
  // 撃破の端数は持ち越す: 390 ＋ 30 = 420 体 → 21 (= ステージ 1 で 19 ・ いま 2)
  state.run.stages[0].kills = 390; state.run.stages[0].gumRows = gumRows({ sec: 200, kills: 390, stageNos: [1] }); state.killCount = 30;
  const r2 = grantRunRewards(false);
  assert.equal(r2.rows.find((x) => x.key === "kills").n, 21);
  assert.equal(r2.rows.find((x) => x.key === "kills").kills, 420);
});
