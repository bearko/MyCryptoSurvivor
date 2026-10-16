// SPEC-044: 設定の正規化と音量の掛け算 (= 純関数)。
// 実行: node --test tests/settings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings, mixVolume, DEFAULT_SETTINGS } from "../js/settings.js";

test("何もなければ既定値（今までと同じ音量）", () => {
  assert.deepEqual(normalizeSettings(null), { ...DEFAULT_SETTINGS });
  assert.deepEqual(normalizeSettings("broken"), { ...DEFAULT_SETTINGS });
  assert.deepEqual(normalizeSettings({}), { ...DEFAULT_SETTINGS });
});

test("範囲外は 0〜1 に、数でないものは既定値に", () => {
  const s = normalizeSettings({ bgm: 3, se: -1, reduceFx: "yes" });
  assert.equal(s.bgm, 1);
  assert.equal(s.se, 0);
  assert.equal(s.reduceFx, false);   // true だけを ON とみなす
  assert.equal(normalizeSettings({ bgm: "abc" }).bgm, 1);
  assert.equal(normalizeSettings({ bgm: 0 }).bgm, 0);   // 0 (= ミュート) は残す
});

test("音量は 呼び出し側 × 設定", () => {
  assert.equal(mixVolume(0.5, 1), 0.5);
  assert.equal(mixVolume(0.32, 0.5), 0.16);
  assert.equal(mixVolume(0.5, 0), 0);
  assert.equal(mixVolume(2, 2), 1);
  assert.equal(mixVolume(NaN, 1), 0);
});
