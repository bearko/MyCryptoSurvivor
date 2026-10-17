// SPEC-073: パンジャンドラムは回りながら敵に向かう
// 実行: node --test tests/panjandrum.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spinStep } from "../js/battle/projectiles.js";
import { fireBigHoming, fireHoming } from "../js/battle/archetypes.js";
import { PANJANDRUM_SPIN_RAD_S } from "../js/constants.js";
import { state } from "../js/state.js";

test("転がるように回る: 右へ進むときは時計回り、 左へ進むときは反時計回り", () => {
  assert.equal(spinStep(0, 10, 50, 0.1), 1);
  assert.equal(spinStep(0, 10, -50, 0.1), -1);
  assert.equal(spinStep(0, 10, 0, 0.1), 1, "真上・真下へ進むときは時計回り");
  assert.equal(spinStep(2, 0, 50, 0.1), 2, "回らない弾は角度が変わらない");
  assert.ok(PANJANDRUM_SPIN_RAD_S >= 6 && PANJANDRUM_SPIN_RAD_S <= 20, "見て回っていると分かる速さ (= 1〜3 回転/秒)");
});

test("パンジャンドラムの弾は回る。 ほかの追尾弾は進む向きを向く (= 回らない)", () => {
  const b = state.battle;
  b.player = { x: 0, y: 0, r: 12 };
  b.enemies = [{ id: 1, x: 100, y: 0, r: 10, hp: 10, hpMax: 10 }];
  b.projectiles = [];
  b.nextEntityId = 10;
  const w = { bullets: 1, dmg: 10, range: 600, speedPx: 90, params: { size: 14 }, iconId: 1153, level: 1 };
  fireBigHoming(w, 1, 0);
  assert.equal(b.projectiles.length, 1);
  assert.equal(b.projectiles[0].spin, PANJANDRUM_SPIN_RAD_S);
  assert.equal(b.projectiles[0].rot, 0);
  fireHoming({ ...w, iconId: 1 }, 1);
  assert.equal(b.projectiles[1].spin, 0);
});
