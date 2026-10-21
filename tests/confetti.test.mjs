// SPEC-149: 紙吹雪 (= マイクリの金宝箱の演出の値のまま)・レッスンのボイスの中断・EASY の釣り合い
// 実行: node --test tests/confetti.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFETTI, CONFETTI_COLORS, resetParticle, stepParticle } from "../js/confetti.js";
import { EASY_STAGES } from "../js/easy.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("マイクリの値のまま: 粒子 120・速さ 2・12 色・15 ms", () => {
  assert.equal(CONFETTI.maxCount, 120);
  assert.equal(CONFETTI.speed, 2);
  assert.equal(CONFETTI.frameInterval, 15);
  assert.equal(CONFETTI_COLORS.length, 12);
  assert.ok(CONFETTI_COLORS.includes("rgba(255,215,0,"), "Gold");
  assert.ok(CONFETTI_COLORS.includes("rgba(220,20,60,"), "Crimson");
});

test("粒は画面の上から落ち、 下に抜けたら外に出たと分かる", () => {
  const p = resetParticle({}, 400, 800, () => 0.5);
  assert.equal(p.x, 200);
  assert.equal(p.y, -400);
  assert.equal(p.diameter, 10);
  assert.match(p.color, /^rgba\(\d+,\d+,\d+,1\)$/);
  const y0 = p.y;
  assert.equal(stepParticle(p, 0, 400, 800, true), false);
  assert.ok(p.y > y0, "落ちる");
  p.y = 801;
  assert.equal(stepParticle(p, 0, 400, 800, true), true);
  // 降らせるのをやめたあと、 上に残っていた粒は下へ回して消す
  const q = { x: 10, y: -30, diameter: 8, tilt: 0, tiltAngle: 0, tiltAngleIncrement: 0.05 };
  stepParticle(q, 0, 400, 800, false);
  assert.equal(q.y, 900);
});

test("配線: ステージクリアと全クリアで紙吹雪、 閉じたら消す。 ステージの終わりでボイスを止める", () => {
  const st = read("../js/battle/stage-transition.js");
  assert.match(st, /if \(state\.battle\.gameOver\) return;\n\s+stopVoice\(\);/);
  assert.match(st, /startConfetti\(\);\s*\/\/ SPEC-149/);
  assert.match(st, /removeConfetti\(\);\s*\/\/ SPEC-149/);
  const ar = read("../js/battle/activity-report.js");
  assert.match(ar, /pauseTime\(\);\n\s+stopVoice\(\);/);
  assert.match(ar, /startConfetti\(\);\s*\/\/ SPEC-149/);
  assert.match(ar, /removeConfetti\(\);\s*\/\/ SPEC-149/);
  assert.match(read("../js/battle/gameover.js"), /removeConfetti\(\);\s*\/\/ SPEC-149/);
  assert.match(read("../css/components.css"), /\.confetti \{[^}]*pointer-events: none;[^}]*z-index: calc\(var\(--z-help\) \+ 2\)/);
});

test("EASY: 敵の数は 1/3。 ステージ 1 は雑魚が弱く、 ステージ 2 から本気", () => {
  assert.equal(EASY_STAGES[0].spawnIntervalMs, 960);
  assert.equal(EASY_STAGES[1].spawnIntervalMs, 1140);
  assert.equal(EASY_STAGES[2].spawnIntervalMs, 1140);
  assert.ok(EASY_STAGES[0].enemyDmgMul <= 0.5);
  assert.ok(EASY_STAGES[1].enemyDmgMul > EASY_STAGES[0].enemyDmgMul);
});
