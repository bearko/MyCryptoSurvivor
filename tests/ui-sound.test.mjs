// SPEC-060: メニューの BGM とボタンの音
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clickSoundTarget, UI_CLICK_SELECTOR, UI_CLICK_SKIP_SELECTOR, JINGLE_MS, MENU_BGM_VOLUME,
} from "../js/ui-sound.js";
import { SFX, BGM_MENU, BGM_BATTLE } from "../js/constants.js";

/** closest だけを持つ、 にせの要素 */
const fake = ({ button = true, disabled = false, skip = false } = {}) => {
  const el = {
    disabled,
    closest(sel) {
      if (sel === UI_CLICK_SELECTOR) return button ? el : null;
      if (sel === UI_CLICK_SKIP_SELECTOR) return skip ? el : null;
      return null;
    },
  };
  return el;
};

test("ボタンを押すとクリックの音。 ボタンでないところ・押せないボタンでは鳴らさない", () => {
  const b = fake();
  assert.equal(clickSoundTarget(b), b);
  assert.equal(clickSoundTarget(fake({ button: false })), null);
  assert.equal(clickSoundTarget(fake({ disabled: true })), null);
  assert.equal(clickSoundTarget(null), null);
  assert.equal(clickSoundTarget({}), null);
});

test("自分の音を持つもの (= レベルアップのカード・冒険を始める) は鳴らさない", () => {
  assert.equal(clickSoundTarget(fake({ skip: true })), null);
  assert.ok(UI_CLICK_SKIP_SELECTOR.includes(".levelup-card"));
  assert.ok(UI_CLICK_SKIP_SELECTOR.includes("#heroSelectCta"));
});

test("クリックの音は crash.mp3、 メニューの BGM は戦闘の BGM と別の曲", () => {
  assert.match(SFX.UI_CLICK, /\/crash\.mp3$/);
  assert.match(BGM_MENU, /^Audio\/BGM\/.+\.mp3$/);
  assert.notEqual(BGM_MENU, BGM_BATTLE);
  assert.ok(MENU_BGM_VOLUME > 0 && MENU_BGM_VOLUME <= 0.4, "戦闘の BGM (0.32) より大きくしない");
});

test("結果の画面の BGM は、 ジングル (= 勝ち 3.5 秒・負け 5.3 秒) が鳴り終わってから", () => {
  assert.ok(JINGLE_MS.win >= 3500 && JINGLE_MS.win <= 5000);
  assert.ok(JINGLE_MS.lose >= 5300 && JINGLE_MS.lose <= 7000);
});
