// SPEC-163: バランス調整 (= 湧き・HP・ボス・木の効き目・店の連続購入) と、 机上 sim の純関数
// 実行: node --test tests/balance-163.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const { STAGE_TABLE, ENEMY_SPECS } = await import("../js/constants.js");
const { NODE_MAP } = await import("../js/skill-data.js");
const { weaponDps, spawnPerSec, enemyAvg, simStage, tierOf } = await import("../tools/sim/balance.mjs");
const EXT = JSON.parse(read("../data/extensions.json")).extensions;

test("ステージの湧き: 始まりはゆっくり (= 0.8 秒 × 1.4 / 1.1 / 0.9)、 洪水は ×5 / ×7 / ×9、 密度は 0.45 / 0.7 / 0.95。 HP は ×1 / ×2.2 / ×3.5", () => {
  assert.deepEqual(STAGE_TABLE.map((s) => s.spawnIntervalMul), [1.4, 1.1, 0.9]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.flood.maxMul), [4, 7, 9]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.flood.pow), [1.8, 1.8, 1.8]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.flood.packSize), [8, 14, 18]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.density.max), [0.35, 0.7, 0.95]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.enemyHpMul), [1, 2.2, 3.5]);
  assert.deepEqual(STAGE_TABLE.map((s) => s.maxEnemies), [260, 380, 480]);
  // 始まりの流入 HP/秒 は、 初期武器 Lv.1 の DPS (= 15〜25) を超えない
  for (const [i, s] of STAGE_TABLE.entries()) {
    const sp = spawnPerSec(s, 0), en = enemyAvg(s, 0, 0);
    if (i === 0) assert.ok(sp.total * en.hp < 25, `ステージ 1 の始まり ${sp.total * en.hp}`);
    assert.ok(sp.total < 1.5, `ステージ ${i + 1} の始まりの湧き ${sp.total}/秒`);
  }
});

test("ボスの HP は 5000 / 11000 / 20000 (= 育った装備の DPS で 20〜30 秒)", () => {
  assert.deepEqual([171, 373, 1189].map((id) => ENEMY_SPECS[id].hp), [5000, 11000, 20000]);
});

test("木の効き目: 頑丈なからだ 6%・厚い皮 4%・鋭い一撃 5%・手早さ 3% (段ごと)", () => {
  assert.equal(NODE_MAP.vit_hp.fx.hpMul, 0.06);
  assert.equal(NODE_MAP.vit_armor.fx.dmgTakenMul, -0.04);
  assert.equal(NODE_MAP.atk_dmg.fx.dmgMul, 0.05);
  assert.equal(NODE_MAP.atk_cd.fx.cdMul, -0.03);
});

test("店: 同じ札を続けて買える (= 買っても札は残り、 上がりきったら売り切れ)", () => {
  const shop = read("../js/battle/shop.js");
  assert.match(shop, /o\.sold = !offerFor\(extId, new Set\(s\.bans\)\);/);
  assert.match(shop, /o\.bought = \(o\.bought \| 0\) \+ 1;/);
  assert.match(shop, /o\.sale = false;/, "セールは 1 回だけ");
});

test("机上 sim: 武器の DPS は段で単調に伸びる。 段階は撃破数で上がる。 ステージ 1 は 2 分までは圧が 1 を超えない", () => {
  for (const e of EXT.filter((x) => x.category === "weapon")) {
    let prev = 0;
    for (const lv of [1, 4, 7, 10, 13, 15, 16]) { const d = weaponDps(e, lv); assert.ok(d >= prev, `${e.series} Lv${lv}`); prev = d; }
  }
  assert.deepEqual([0, 149, 150, 400, 1500].map(tierOf), [0, 0, 1, 2, 4]);
  const r = simStage({ stageIdx: 0, k: 0.3 });
  assert.ok(r.rows.length > 60);
  for (const row of r.rows) if (row.t <= 120) assert.ok(row.pressure <= 1, `t=${row.t} 圧 ${row.pressure}`);
});
