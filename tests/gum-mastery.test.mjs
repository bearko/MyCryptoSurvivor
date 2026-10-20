// SPEC-131: ミッション達成の確定 GUM・撃破数の GUM・エクステ別の強化 (= 武器の威力・強化の値引き)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { gumForKills, KILLS_PER_GUM, missionGum, MISSION_GUM } = await import("../js/meta.js");
const { EXT_MASTERY, NODE_MAP, ROOT_ID } = await import("../js/skill-data.js");
const { computePerks, perkRows } = await import("../js/perks.js");
const { shopPrice } = await import("../js/battle/shop-logic.js");

test("撃破 15 体ごとに GUM ＋1", () => {
  assert.equal(KILLS_PER_GUM, 15);
  assert.deepEqual([0, 14, 15, 1500, 15645].map(gumForKills), [0, 0, 1, 100, 1043]);
});

test("ミッションの確定 GUM は 重さ × ステージの番号", () => {
  assert.deepEqual(MISSION_GUM, { light: 30, medium: 60, heavy: 120 });
  assert.equal(missionGum("light", 0), 30);
  assert.equal(missionGum("medium", 1), 120);
  assert.equal(missionGum("heavy", 2), 360);
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
  assert.match(read("js/battle/missions.js"), /grantMissionGum\(missionGum\(mission\.weight/);
  assert.ok(read("index.html").includes('id="missionRewardGum"'));
});
