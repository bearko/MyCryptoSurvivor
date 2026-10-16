// SPEC-043: Esc で押すボタンの選び方 (= escTarget は純関数)。
// 実行: node --test tests/modal-a11y.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { escTarget } from "../js/modal-a11y.js";

const d = (escClose, open) => ({ escClose, open });

test("開いているダイアログがなければ何もしない", () => {
  assert.equal(escTarget([]), null);
  assert.equal(escTarget([d("rankingClose", false), d("pauseMenuClose", false)]), null);
});

test("開いているメニュー・ランキングは Esc で閉じる", () => {
  assert.equal(escTarget([d("rankingClose", true), d("pauseMenuClose", false)]), "rankingClose");
  assert.equal(escTarget([d("rankingClose", false), d("pauseMenuClose", true)]), "pauseMenuClose");
});

test("一番上 (= DOM の後ろ) に開いているものが Esc を受け付けないなら、下のものも閉じない", () => {
  // 例: メニューの上にレベルアップ (= 選ぶまで進めない) が開いている
  assert.equal(escTarget([d("pauseMenuClose", true), d(null, true)]), null);
});

test("下が閉じていて上だけ開いていれば上を見る", () => {
  assert.equal(escTarget([d(null, false), d("rankingClose", true)]), "rankingClose");
});
