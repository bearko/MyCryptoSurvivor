// SPEC-065: トロイの大群・押し分け・レベルアップの速さ (= SPEC-078 で大群はどのステージにも)
import { test } from "node:test";
import assert from "node:assert/strict";
import { floodMul, packAngles, separateEnemies, stageMaxEnemies, PACK_SPREAD_RAD } from "../js/battle/horde.js";
import { STAGE_TABLE, MAX_ENEMIES, XP_TO_NEXT_INITIAL, XP_TO_NEXT_GROWTH, BOSS_SPAWN_AT_MS } from "../js/constants.js";

test("SPEC-078: 大群はどのステージにも。 中盤から湧きが速まり、 上がりきったらそのまま", () => {
  assert.deepEqual(STAGE_TABLE.map((s) => !!s.flood), [true, true, true]);
  for (const s of STAGE_TABLE) {
    const f = s.flood;
    assert.equal(floodMul(f, 0), 1);
    assert.equal(floodMul(f, f.fromMs), 1);
    assert.ok(Math.abs(floodMul(f, (f.fromMs + f.fullMs) / 2) - (1 + (f.maxMul - 1) * Math.pow(0.5, f.pow ?? 1))) < 1e-9);
    assert.equal(floodMul(f, f.fullMs), f.maxMul);
    assert.equal(floodMul(f, BOSS_SPAWN_AT_MS), f.maxMul);
    assert.ok(f.packFromMs >= f.fromMs && f.packFromMs < BOSS_SPAWN_AT_MS);
  }
  assert.equal(floodMul(null, 200000), 1);
  assert.equal(floodMul({ fromMs: 0, fullMs: 100, maxMul: 3 }, 50), 2, "pow がなければまっすぐ");
  // 後のステージほど激しい
  const mul = STAGE_TABLE.map((s) => s.flood.maxMul);
  assert.ok(mul[0] < mul[1] && mul[1] < mul[2]);
});

test("SPEC-078: 敵の上限は後のステージほど大きい (= 画面を埋める)。 重くなりすぎない", () => {
  const caps = STAGE_TABLE.map((s) => stageMaxEnemies(s));
  assert.ok(caps[0] > MAX_ENEMIES);
  assert.ok(caps[0] < caps[1] && caps[1] < caps[2]);
  assert.ok(caps[2] <= 600, "重くなりすぎない");
  assert.equal(stageMaxEnemies({}), MAX_ENEMIES);
});

test("群れは 1 方向から、 広がりを持って来る", () => {
  const a = packAngles(5, 1);
  assert.equal(a.length, 5);
  assert.ok(Math.abs(a[0] - (1 - PACK_SPREAD_RAD / 2)) < 1e-9 && Math.abs(a[4] - (1 + PACK_SPREAD_RAD / 2)) < 1e-9);
  assert.deepEqual(packAngles(1, 2), [2]);
});

test("重なった敵は押し分ける。 ボス・壺・木馬は動かさない。 ぴったり重なっても壊れない", () => {
  const e1 = { id: 1, x: 0, y: 0, r: 10 }, e2 = { id: 2, x: 5, y: 0, r: 10 };
  const boss = { id: 3, x: 2, y: 2, r: 40, isBoss: true }, pot = { id: 4, x: -3, y: 0, r: 14, isProp: true };
  const same1 = { id: 5, x: 100, y: 100, r: 10 }, same2 = { id: 6, x: 100, y: 100, r: 10 };
  const list = [e1, e2, boss, pot, same1, same2];
  for (let i = 0; i < 30; i++) separateEnemies(list);
  assert.ok(Math.hypot(e2.x - e1.x, e2.y - e1.y) > 15, "離れていく");
  assert.deepEqual([boss.x, boss.y, pot.x, pot.y], [2, 2, -3, 0]);
  for (const e of list) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y));
  assert.ok(Math.hypot(same2.x - same1.x, same2.y - same1.y) > 5);
});

test("レベルアップは約 2 倍速い (= Lv15 までの経験値が 710 → 約 310)", () => {
  assert.equal(XP_TO_NEXT_GROWTH, 1.2);
  let need = XP_TO_NEXT_INITIAL, total = 0;
  for (let lv = 1; lv < 15; lv++) { total += need; need = Math.ceil(need * XP_TO_NEXT_GROWTH); }
  assert.ok(total >= 280 && total <= 340, `Lv15 まで ${total}`);
});

test("SPEC-084: 湧きの速まりは、 はじめはゆるく、 ボスの前に急に (= 1:10 では 1.7 倍まで。 3:30 では半分より上)", () => {
  for (const s of STAGE_TABLE) {
    const f = s.flood;
    assert.ok(f.pow > 1);
    assert.ok(floodMul(f, 70000) <= 1.7, `stage ${s.idx}: ${floodMul(f, 70000)}`);
    assert.ok(floodMul(f, 210000) >= 1 + (f.maxMul - 1) / 2);
  }
});
