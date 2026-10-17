// SPEC-060: メニューの BGM とボタンの音
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clickSoundTarget, UI_CLICK_SELECTOR, UI_CLICK_SKIP_SELECTOR, JINGLE_MS, MENU_BGM_VOLUME,
  TITLE_BGM_VOLUME, UI_CLICK_VOLUME, GESTURE_EVENTS, waitAutoplay,
} from "../js/ui-sound.js";
import { SFX, BGM_MENU, BGM_BATTLE, BGM_TITLE } from "../js/constants.js";

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

// ---- SPEC-069 ----

test("タイトルは craft.mp3、 モード選択・ヒーロー選択は land.mp3、 戦闘は pvp.mp3 (= 3 つとも別の曲)", () => {
  assert.equal(BGM_TITLE, "Audio/SE/Actions/craft.mp3");
  assert.equal(BGM_MENU, "Audio/BGM/land.mp3");
  assert.equal(new Set([BGM_TITLE, BGM_MENU, BGM_BATTLE]).size, 3);
  assert.equal(TITLE_BGM_VOLUME, MENU_BGM_VOLUME, "craft.mp3 と land.mp3 はほぼ同じ大きさ (= -12.9 / -12.5 LUFS)");
});

test("ボタンの音は crash.mp3 をいちばん大きく (= 小さい音なので、 0.45 では BGM に埋もれた)", () => {
  assert.match(SFX.UI_CLICK, /\/crash\.mp3$/);
  assert.equal(UI_CLICK_VOLUME, 1);
});

test("止められた BGM は、 指を離した・クリック・キーで鳴らし直す (= iOS は指を置いた瞬間を操作と認めない)", () => {
  for (const ev of ["pointerup", "touchend", "click", "keydown"]) assert.ok(GESTURE_EVENTS.includes(ev), ev);
  assert.equal(GESTURE_EVENTS.includes("pointerdown"), false);
  assert.equal(GESTURE_EVENTS.includes("touchstart"), false);
});

test("読み込みのあと: 止められたときだけ「タップしてはじめる」を挟む", async () => {
  const err = (name) => Object.assign(new Error(name), { name });
  assert.equal(await waitAutoplay(Promise.resolve()), true);
  assert.equal(await waitAutoplay(Promise.reject(err("NotAllowedError"))), false);
  assert.equal(await waitAutoplay(Promise.reject(err("NotSupportedError"))), true, "曲が読めないのは、 押しても直らない");
  assert.equal(await waitAutoplay(null), true, "設定が 0 で鳴らさなかった");
  assert.equal(await waitAutoplay(new Promise(() => {}), 20), true, "読み込みに時間がかかっている");
});
