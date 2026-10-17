// SPEC-079: ボス戦の場 (= 敵が消える・枠が 1/4 に縮む・真ん中に出る)
// 実行: node --test tests/arena.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ARENA, BOSS_SPAWN_POS, arenaBoundsAt, clampToBounds } from "../js/battle/arena.js";
import { bossMarkerActive } from "../js/battle/arena-render.js";
import { clearForBoss } from "../js/battle/enemies.js";
import { WORLD_W, WORLD_H, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } from "../js/constants.js";
import { state } from "../js/state.js";

test("枠はステージの 1/4 の広さ (= 幅も高さも半分)、 真ん中にある", () => {
  assert.equal(ARENA.halfW * 2, WORLD_W / 2);
  assert.equal(ARENA.halfH * 2, WORLD_H / 2);
  assert.deepEqual(BOSS_SPAWN_POS, { x: 0, y: 0 });
});

test("枠は世界の縁から閉じていき、 閉じきったら 1/4", () => {
  assert.deepEqual(arenaBoundsAt(0), { minX: -WORLD_W / 2, maxX: WORLD_W / 2, minY: -WORLD_H / 2, maxY: WORLD_H / 2 });
  assert.deepEqual(arenaBoundsAt(1), { minX: -ARENA.halfW, maxX: ARENA.halfW, minY: -ARENA.halfH, maxY: ARENA.halfH });
  const mid = arenaBoundsAt(0.5);
  assert.ok(mid.maxX < WORLD_W / 2 && mid.maxX > ARENA.halfW);
  assert.deepEqual(arenaBoundsAt(2), arenaBoundsAt(1));
});

test("外にいたら縁の中へ入る", () => {
  const bd = arenaBoundsAt(1);
  assert.deepEqual(clampToBounds(400, -600, 20, bd), { x: ARENA.halfW - 20, y: -ARENA.halfH + 20 });
  assert.deepEqual(clampToBounds(10, 10, 20, bd), { x: 10, y: 10 });
});

test("赤い丸は予告のあいだだけ (= ボスが出たら消える)", () => {
  assert.equal(bossMarkerActive(BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS - 1, false), false);
  assert.equal(bossMarkerActive(BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS, false), true);
  assert.equal(bossMarkerActive(BOSS_SPAWN_AT_MS - 1, false), true);
  assert.equal(bossMarkerActive(BOSS_SPAWN_AT_MS - 1, true), false);
});

test("ボスが出るとき: ほかの敵は消え (= 撃破にも数えず CE も落とさない)、 壺・宝箱と落ちている CE は残り、 枠が閉じはじめる", () => {
  const b = state.battle;
  b.camera = { x: -200, y: -400 };
  b.viewport = { w: 390, h: 800 };
  b.enemies = [
    { id: 1, x: 0, y: 0, r: 17 },
    { id: 2, x: 900, y: 900, r: 17, behavior: "shooter" },
    { id: 3, x: 50, y: 50, r: 20, isProp: true, propKind: "chest" },
    { id: 4, x: 60, y: 60, r: 40, behavior: "trojan" },
  ];
  b.gems = [{ x: 5, y: 5, value: 3 }];
  b.enemyShots = [{ x: 1, y: 1 }];
  b.arena = null;
  state.killCount = 7;
  clearForBoss();
  assert.deepEqual(b.enemies.map((e) => e.id), [3]);
  assert.equal(b.gems.length, 1);
  assert.equal(b.enemyShots.length, 0);
  assert.equal(state.killCount, 7);
  assert.deepEqual(b.arena, { t: 0 });
});
