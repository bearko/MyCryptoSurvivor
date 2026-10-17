// SPEC-057: 戦闘の UI と演出の数値 (= 純関数と定数)
// 実行: node --test tests/battle-ui.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { damagePopScale, DAMAGE_FONT_PX, BG_DESATURATE } from "../js/battle/render.js";
import { PICK_FX_MS } from "../js/battle/levelup.js";

test("ダメージの数字は出た瞬間に 1.6 倍で跳ね、 140ms で 1 倍に戻る", () => {
  assert.equal(damagePopScale(0), 1.6);
  assert.ok(damagePopScale(70) > 1 && damagePopScale(70) < 1.6);
  assert.equal(damagePopScale(140), 1);
  assert.equal(damagePopScale(800), 1);
  assert.equal(damagePopScale(undefined), 1);
});

test("大きいダメージほど文字が大きい", () => {
  assert.ok(DAMAGE_FONT_PX[""] < DAMAGE_FONT_PX.lg && DAMAGE_FONT_PX.lg < DAMAGE_FONT_PX.xl);
});

test("背景の彩度は落とすが、 消さない (= UI をいちばん鮮やかに。 憲章 14.3)", () => {
  assert.ok(BG_DESATURATE > 0 && BG_DESATURATE < 1);
});

test("レベルアップで選んだカードが光るのは短く (= 遊びを待たせない)", () => {
  assert.ok(PICK_FX_MS >= 150 && PICK_FX_MS <= 300);
});
