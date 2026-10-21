// SPEC-131: ミッション達成の確定 GUM・撃破数の GUM・エクステ別の強化 (= 武器の威力・強化の値引き)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { gumRows, GUM_RATE, missionGum, MISSION_GUM } = await import("../js/meta.js");
const { EXT_MASTERY, NODE_MAP, ROOT_ID } = await import("../js/skill-data.js");
const { computePerks, perkRows } = await import("../js/perks.js");
const { shopPrice } = await import("../js/battle/shop-logic.js");

test("SPEC-136: 撃破 20 体ごとに GUM ＋1", () => {
  assert.equal(GUM_RATE.killsPer, 20);
  const k = (kills) => gumRows({ kills }).find((r) => r.key === "kills")?.gum ?? 0;
  assert.deepEqual([0, 19, 20, 1500, 15645].map(k), [0, 0, 1, 75, 782]);
});

test("ミッションの確定 GUM は ★ × ステージの番号", () => {
  assert.deepEqual(MISSION_GUM, { 1: 30, 2: 60, 3: 120 });   // SPEC-137: ★で
  assert.equal(missionGum(1, 0), 30);
  assert.equal(missionGum(2, 1), 120);
  assert.equal(missionGum(3, 2), 360);
});

test("エクステ別の節は 21 (= 武器 10 ・ 強化 11)。 段ごとに武器の威力 ＋5% ・ 強化の値段 −6%", () => {
  assert.equal(EXT_MASTERY.filter((e) => e[2] === "w").length, 10);
  assert.equal(EXT_MASTERY.filter((e) => e[2] === "b").length, 11);
  assert.equal(new Set(EXT_MASTERY.map((e) => e[1])).size, 21, "同じエクステが 2 度出ない");
  const p = computePerks({ nodes: { [ROOT_ID]: 1, wm_10: 3, bm_21: 5 } });
  assert.equal(p.wdmg_10, 0.15);
  assert.equal(p.cut_21, 0.3);
  assert.equal(p.wdmg_1, 0);
  const rows = perkRows(p, null, "ja").rows.map((r) => [r.label, r.value]);
  assert.deepEqual(rows, [["ブレードの威力", "＋15%"], ["クラウンの値段", "−30%"]]);
  assert.equal(NODE_MAP.wm_10.name.ja, "ブレードの極意");
  assert.equal(NODE_MAP.bm_21.name.ja, "クラウンの目利き");
});

test("値引きはショップの値段に掛かる (= 5 の倍数に丸める)", () => {
  assert.equal(shopPrice({ nextLevel: 3 }, 0, null, false, 0.3), 350);   // 500 × 0.7
  assert.equal(shopPrice({ nextLevel: 3 }, 0, null, false, 0), 500);
});

test("つなぎ: 武器ごとの威力・強化の値引き・ミッションの GUM", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(read("js/battle/weapons.js"), /baseDmgMul \* weaponDmgMul\(w\.extId\)/);
  assert.match(read("js/battle/shop.js"), /buffPriceCut\(o\.extId\)/);
  assert.match(read("js/battle/missions.js"), /grantMissionGum\(missionGum\(a\.star/);
  assert.ok(read("index.html").includes('id="missionRewardGum"'));
});

test("SPEC-132 + 136: ステージクリアの GUM は 50 × ステージの番号 ＋ 生存時間 ＋ 撃破数のぶん", () => {
  assert.equal(GUM_RATE.stage, 50);
  const sum = (rows) => rows.reduce((a, r) => a + r.gum, 0);
  assert.equal(sum(gumRows({ stageNos: [1], kills: 1500 })), 50 + 75);
  assert.equal(sum(gumRows({ stageNos: [3] })), 150);
  assert.equal(sum(gumRows({ stageNos: [1], sec: 274.6 })), 50 + 275, "秒は結果の時間の表示と同じく四捨五入");
});

test("SPEC-132: ステージクリアの画面からスキルツリーへ (= 閉じると元の画面に戻る)・戻るは木の右下", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.ok(read("index.html").includes('id="stageTransitionSkillTree"'));
  const tree = read("js/skill-tree.js");
  assert.match(tree, /\["stageTransitionSkillTree", "stageTransitionModal", true\]/);
  assert.match(tree, /if \(_returnTo\) \{ _returnTo\.classList\.remove\("hidden"\)/);
  assert.match(tree, /tree-back2/);
  assert.doesNotMatch(tree, /returnToTitle\(/, "結果の画面から開いてもタイトルに戻さない");
  assert.match(read("js/battle/stage-transition.js"), /grantStageGum\(snap, \{ gumMul: perk\("gumMul"\) \}\)/);
  assert.match(read("js/meta.js"), /stages\.filter\(\(s\) => s\.gum == null\)/, "ステージクリアでもらった撃破数は二重にしない");
});
