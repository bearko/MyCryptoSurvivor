// ============================================================
// ui-sound.js — メニューの BGM とボタンの音 (= SPEC-060。 SPEC-069 で画面ごとの曲と、 鳴らし始めを見直し)
// ============================================================
//
// - ボタンを押すと短い音 (= crash.mp3)。 自分の音を持つもの (= レベルアップのカード・冒険を始める) は鳴らさない
// - 画面ごとの BGM (= SPEC-069):
//     タイトル craft.mp3 → モード選択・ヒーロー選択 land.mp3 → 戦闘 pvp.mp3 → 結果 land.mp3 (= ジングルのあと)
// - ブラウザは操作の前に音を出せない。 読み込みのあとに鳴らせなければ、 main.js が「タップしてはじめる」を挟む。
//   止められた曲は、 次に触ったとき (= 指を離した・クリック・キー) に鳴らし直す。
//   iOS は指を置いた瞬間 (= touchstart・pointerdown) を操作と認めないので、 離したときに鳴らす
// 音量は設定 (= settings.js) に従い、 0 なら鳴らさない (= audio.js)。 演出だけで、 ゲームの中身には関わらない。

import { playSe, startBgm, unlockAudio, currentBgmPath, isBgmBlocked, retryBgm } from "./audio.js";
import { SFX, BGM_MENU, BGM_TITLE } from "./constants.js";

/** クリックの音を鳴らすもの */
export const UI_CLICK_SELECTOR = 'button, .btn, [role="button"], input[type="checkbox"]';
/** 自分の音を持つもの・鳴らしたくないもの */
export const UI_CLICK_SKIP_SELECTOR = '.levelup-card, #heroSelectCta, [data-se="off"]';
/** crash.mp3 は小さい音 (= 平均 -31 dB) なので、 いちばん大きく鳴らす (= SPEC-069。 0.45 では BGM に埋もれた) */
export const UI_CLICK_VOLUME = 1;
export const MENU_BGM_VOLUME = 0.26;
/** タイトルの曲 (= craft.mp3) は land.mp3 とほぼ同じ大きさ (= -12.9 / -12.5 LUFS) なので同じ音量 */
export const TITLE_BGM_VOLUME = 0.26;
/** ジングル (= 勝ち 3.5 秒・負け 5.3 秒) が鳴り終わってから BGM に戻すまで */
export const JINGLE_MS = { win: 3800, lose: 5600 };
/** ブラウザが操作として認める (= 音を出してよくなる) 出来事。 pointerdown は入れない (= iOS のタッチでは認められない) */
export const GESTURE_EVENTS = ["pointerup", "touchend", "click", "keydown"];
/** 読み込みのあと、 鳴らせたかを待つ長さ。 止められるときはすぐ返ってくる (= 読み込み中なら鳴らせるとみなす) */
export const AUTOPLAY_WAIT_MS = 600;

/** 押したところが、 クリックの音を鳴らすボタンなら、 そのボタン (= 純関数。 closest を持つものなら何でも) */
export function clickSoundTarget(el) {
  const hit = el?.closest?.(UI_CLICK_SELECTOR);
  if (!hit || hit.disabled) return null;
  if (hit.closest(UI_CLICK_SKIP_SELECTOR)) return null;
  return hit;
}

/**
 * 鳴らせたか (= play() の Promise を待つ)。 止められた (= NotAllowedError) ときだけ false。
 * 鳴らさなかった (= 設定が 0 で null)・読み込みに時間がかかっている・ほかの失敗 (= 曲が読めない) は true
 * (= 「タップしてはじめる」を挟んでも直らないので)
 */
export function waitAutoplay(p, ms = AUTOPLAY_WAIT_MS) {
  if (!p || typeof p.then !== "function") return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), ms);
    p.then(
      () => { clearTimeout(timer); resolve(true); },
      (e) => { clearTimeout(timer); resolve(e?.name !== "NotAllowedError"); },
    );
  });
}

/** その曲を流す (= すでに流れていれば頭から流し直さない。 止められていたら鳴らし直す) */
function _ensureBgm(path, volume) {
  if (currentBgmPath() === path) return isBgmBlocked() ? retryBgm() : null;
  return startBgm(path, volume);
}

/** タイトルの BGM (= craft.mp3。 SPEC-069)。 play() の Promise か null */
export function startTitleBgm() {
  return _ensureBgm(BGM_TITLE, TITLE_BGM_VOLUME);
}

/** メニューの BGM (= land.mp3。 モード選択・ヒーロー選択・結果の画面) */
export function startMenuBgm() {
  return _ensureBgm(BGM_MENU, MENU_BGM_VOLUME);
}

let _jingleTimer = null;
/**
 * 結果の画面: ジングルが鳴り終わってから、 メニューの BGM を流す。
 * stillHere: そのときまだ結果の画面にいるか (= リトライやタイトルに戻ったあとなら何もしない)
 */
export function startMenuBgmAfterJingle(kind, stillHere) {
  clearTimeout(_jingleTimer);
  _jingleTimer = setTimeout(() => {
    if (stillHere()) startMenuBgm();
  }, JINGLE_MS[kind] ?? JINGLE_MS.win);
}

let _installed = false;
/** ボタンの音と、 止められた BGM の鳴らし直し */
export function installUiSound() {
  if (_installed || typeof document === "undefined") return;
  _installed = true;
  document.addEventListener("click", (e) => {
    if (clickSoundTarget(e.target)) playSe(SFX.UI_CLICK, 60, UI_CLICK_VOLUME);
  }, true);
  const onGesture = () => {
    unlockAudio();
    retryBgm();   // 止められていなければ何もしない
  };
  for (const type of GESTURE_EVENTS) document.addEventListener(type, onGesture, true);
}
