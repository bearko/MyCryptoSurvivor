// SPEC-065: トロイの大群・押し分け・レベルアップの速さ
import { test } from "node:test";
import assert from "node:assert/strict";
import { floodMul, packAngles, separateEnemies, stageMaxEnemies, PACK_SPREAD_RAD } from "../js/battle/horde.js";
import { STAGE_TABLE, MAX_ENEMIES, XP_TO_NEXT_INITIAL, XP_TO_NEXT_GROWTH, BOSS_SPAWN_AT_MS } from "../js/constants.js";

test("大群はトロイだけ。 中盤から湧きが速まり、 上がりきったらそのまま", () => {
  assert.deepEqual(STAGE_TABLE.map((s) => !!s.flood), [false, false, true]);
  const f = STAGE_TABLE[2].flood;
  assert.equal(floodMul(f, 0), 1);
  assert.equal(floodMul(f, f.fromMs), 1);
  assert.ok(Math.abs(floodMul(f, (f.fromMs + f.fullMs) / 2) - (1 + (f.maxMul - 1) / 2)) < 1e-9);
  assert.equal(floodMul(f, f.fullMs), f.maxMul);
  assert.equal(floodMul(f, BOSS_SPAWN_AT_MS), f.maxMul);
  assert.equal(floodMul(null, 200000), 1);
  assert.ok(f.packFromMs >= f.fromMs && f.packFromMs < BOSS_SPAWN_AT_MS);
});

test("敵の上限はトロイだけ大きい (= 画面を埋める)", () => {
  assert.equal(stageMaxEnemies(STAGE_TABLE[0]), MAX_ENEMIES);
  assert.equal(stageMaxEnemies(STAGE_TABLE[1]), MAX_ENEMIES);
  assert.ok(stageMaxEnemies(STAGE_TABLE[2]) > MAX_ENEMIES);
  assert.ok(stageMaxEnemies(STAGE_TABLE[2]) <= 400, "重くなりすぎない");
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
