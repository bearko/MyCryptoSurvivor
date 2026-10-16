// SPEC-046: 結果画面のカウントアップ (= 純関数)。
// 実行: node --test tests/reveal.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, countValueAt } from "../js/reveal.js";

test("easeOutCubic は 0→0、 1→1、 範囲外は丸める", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(2), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);   // 最初に速く、 最後にゆっくり
});

test("countValueAt は 0 から to まで", () => {
  assert.equal(countValueAt(1000, 0, 700), 0);
  assert.equal(countValueAt(1000, 700, 700), 1000);
  assert.equal(countValueAt(1000, 9999, 700), 1000);
  const mid = countValueAt(1000, 350, 700);
  assert.ok(mid > 500 && mid < 1000, String(mid));
  assert.equal(countValueAt(1234, 10, 0), 1234);   // 時間 0 ならすぐ最後の値
});
