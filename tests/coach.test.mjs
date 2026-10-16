// SPEC-042: はじめての操作ガイドの進み方 (= nextCoach は純関数)。
// 実行: node --test tests/coach.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextCoach, COACH_MOVE_MS, COACH_STEP1_MAX_MS, COACH_STEP2_MS,
} from "../js/battle/coach.js";

const start = () => ({ step: 0, movedMs: 0, stepMs: 0 });

function run(coach, frames, dtMs, moving) {
  let c = coach;
  for (let i = 0; i < frames && c; i++) c = nextCoach(c, dtMs, moving);
  return c;
}

test("終わったガイドは null のまま", () => {
  assert.equal(nextCoach(null, 16, true), null);
});

test("動いた合計が COACH_MOVE_MS に届くと 2 段目へ", () => {
  const before = run(start(), Math.floor(COACH_MOVE_MS / 50) - 1, 50, true);
  assert.equal(before.step, 0);
  const after = nextCoach(before, 50, true);
  assert.deepEqual(after, { step: 1, movedMs: 0, stepMs: 0 });
});

test("止まっている時間は「動いた」に数えない", () => {
  const c = run(start(), 20, 50, false);   // 1 秒止まっている
  assert.equal(c.step, 0);
  assert.equal(c.movedMs, 0);
  assert.equal(c.stepMs, 1000);
});

test("動かなくても COACH_STEP1_MAX_MS で 2 段目へ", () => {
  const c = run(start(), COACH_STEP1_MAX_MS / 100, 100, false);
  assert.equal(c.step, 1);
});

test("2 段目は COACH_STEP2_MS で終わる（動いていても）", () => {
  const second = { step: 1, movedMs: 0, stepMs: 0 };
  const almost = run(second, COACH_STEP2_MS / 100 - 1, 100, true);
  assert.equal(almost.step, 1);
  assert.equal(nextCoach(almost, 100, true), null);
});

test("前の状態を書き換えない", () => {
  const c = start();
  nextCoach(c, 100, true);
  assert.deepEqual(c, start());
});
