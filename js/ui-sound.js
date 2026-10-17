// ============================================================
// ui-sound.js — メニューの BGM とボタンの音 (= SPEC-060)
// ============================================================
//
// - ボタンを押すと短い音 (= crash.mp3)。 自分の音を持つもの (= レベルアップのカード・冒険を始める) は鳴らさない
// - タイトル・モード選択・ヒーロー選択と、 ゲームオーバー・活動レポート (= ジングルが鳴り終わってから) にメニューの BGM
// - ブラウザは操作の前に音を出せないので、 タイトルでは最初に触ったときに始める
// 音量は設定 (= settings.js) に従い、 0 なら鳴らさない (= audio.js)。 演出だけで、 ゲームの中身には関わらない。

import { playSe, startBgm, unlockAudio, currentBgmPath } from "./audio.js";
import { SFX, BGM_MENU } from "./constants.js";

/** クリックの音を鳴らすもの */
export const UI_CLICK_SELECTOR = 'button, .btn, [role="button"], input[type="checkbox"]';
/** 自分の音を持つもの・鳴らしたくないもの */
export const UI_CLICK_SKIP_SELECTOR = '.levelup-card, #heroSelectCta, [data-se="off"]';
export const UI_CLICK_VOLUME = 0.45;
export const MENU_BGM_VOLUME = 0.26;
/** ジングル (= 勝ち 3.5 秒・負け 5.3 秒) が鳴り終わってから BGM に戻すまで */
export const JINGLE_MS = { win: 3800, lose: 5600 };

/** 押したところが、 クリックの音を鳴らすボタンなら、 そのボタン (= 純関数。 closest を持つものなら何でも) */
export function clickSoundTarget(el) {
  const hit = el?.closest?.(UI_CLICK_SELECTOR);
  if (!hit || hit.disabled) return null;
  if (hit.closest(UI_CLICK_SKIP_SELECTOR)) return null;
  return hit;
}

/** メニューの BGM (= すでに流れていれば、 頭から流し直さない) */
export function startMenuBgm() {
  if (currentBgmPath() === BGM_MENU) return;
  startBgm(BGM_MENU, MENU_BGM_VOLUME);
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
/** inMenu: いまメニューの画面か (= 戦闘中でないか)。 最初に触ったときに BGM を始めるかどうか */
export function installUiSound({ inMenu = () => true } = {}) {
  if (_installed || typeof document === "undefined") return;
  _installed = true;
  document.addEventListener("click", (e) => {
    if (clickSoundTarget(e.target)) playSe(SFX.UI_CLICK, 60, UI_CLICK_VOLUME);
  }, true);
  const first = () => {
    document.removeEventListener("pointerdown", first, true);
    document.removeEventListener("keydown", first, true);
    unlockAudio();
    if (inMenu()) startMenuBgm();
  };
  document.addEventListener("pointerdown", first, true);
  document.addEventListener("keydown", first, true);
}
