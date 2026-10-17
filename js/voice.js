// ============================================================
// voice.js — マインちゃんのボイス (= SPEC-085)
// ============================================================
//
// - 1 度に 1 つ。 次のセリフを鳴らしたら、 前のボイスは止める
// - タイトルコールのように hold で鳴らしたボイスは、 終わるまで次を待たせる (= 重ねない。 あいさつがタイトルコールを消さない)
// - 要素は 1 つを使い回す (= iOS は、 操作の中で一度鳴らした要素なら、 あとから src を替えても鳴らせる。 SPEC-069 の BGM と同じ)
// - 音量は 設定の「ボイス」 (= settings.voice)。 0 なら鳴らさない
// MP3 はこのリポジトリの assets/voice/mine/ (= タイトル固有の音声。 作者の決定 2026-10-17)。

import { getSettings, mixVolume, onSettingsChange } from "./settings.js";
import { VOICE_LINES } from "./voice-lines.js";

/** 設定 100% のときの音量 */
export const VOICE_VOLUME = 1;

let _el = null;
let _holdUntil = 0;
let _timer = 0;

/** そのボイスがあるか */
export function hasVoice(id) {
  return !!(id && VOICE_LINES[id]);
}

/** ボイスの長さ (= ms。 なければ 0) */
export function voiceMs(id) {
  return VOICE_LINES[id]?.ms ?? 0;
}

/** 待たせる長さ (= hold のボイスが鳴り終わるまで。 純関数) */
export function voiceWaitMs(holdUntil, nowMs) {
  return Math.max(0, holdUntil - nowMs);
}

function _audio() {
  if (!_el && typeof Audio !== "undefined") {
    _el = new Audio();
    _el.preload = "auto";
  }
  return _el;
}

function _start(v, hold) {
  _holdUntil = hold ? Date.now() + v.ms : 0;
  const vol = mixVolume(VOICE_VOLUME, getSettings().voice);
  const el = _audio();
  if (!el) return;
  try { el.pause(); } catch (_) {}
  if (vol <= 0) return;
  try {
    if (!el.src.endsWith(v.file)) el.src = v.file;
    el.currentTime = 0;
  } catch (_) {}
  el.volume = vol;
  try {
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {}
}

/**
 * ボイスを鳴らす。 hold: 鳴り終わるまで次のボイスを待たせる (= タイトルコール)。 戻り値: 鳴らした (= 待たせた) か
 */
export function playVoice(id, { hold = false } = {}) {
  const v = VOICE_LINES[id];
  if (!v) return false;
  clearTimeout(_timer);
  const wait = hold ? 0 : voiceWaitMs(_holdUntil, Date.now());
  if (wait > 0) {
    _timer = setTimeout(() => _start(v, false), wait);
    return true;
  }
  _start(v, hold);
  return true;
}

/** 止める (= タブを離れたとき) */
export function stopVoice() {
  clearTimeout(_timer);
  _holdUntil = 0;
  try { _el?.pause(); } catch (_) {}
}

onSettingsChange((s) => {
  if (!_el) return;
  _el.volume = mixVolume(VOICE_VOLUME, s.voice);
  if (s.voice <= 0) { try { _el.pause(); } catch (_) {} }
});
