// ============================================================
// audio.js — BGM / SE
// ============================================================
//
// SPEC-044: 音量は「呼び出し側の音量 × 設定 (= settings.js)」。 0 なら鳴らさない。
// SE はパスごとに 1 つ読み込んだ Audio を cloneNode() で鳴らす (= 連打で読み込みが重ならない)。

import { audioUrl } from "./constants.js";
import { getSettings, mixVolume, onSettingsChange } from "./settings.js";

let _bgm = null;
let _bgmPath = null;        // 今かけたい BGM (= 設定が 0 で止めていても覚えておく)
let _bgmBase = 0.32;        // 呼び出し側の音量
let _bgmSuspended = false;  // タブを離れて止めている
const _seThrottle = new Map();
const _seCache = new Map();
let _audioUnlocked = false;

/**
 * SPEC-017: 初回 user gesture (= Press Start click) で audio policy を解除する。
 * dummy <audio> を一度 play しておくと、 mobile Safari の autoplay 制限が緩む。
 * 既に解除済なら no-op。
 */
export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try {
    const a = new Audio();
    a.muted = true;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {}
}

function _bgmVolume() {
  return mixVolume(_bgmBase, getSettings().bgm);
}

function _playBgmElement() {
  if (!_bgmPath || _bgmSuspended) return;
  const vol = _bgmVolume();
  if (vol <= 0) return;   // 0% のときは読み込みもしない
  try {
    if (!_bgm) {
      _bgm = new Audio(audioUrl(_bgmPath));
      _bgm.loop = true;
    }
    _bgm.volume = vol;
    _bgm.play().catch(() => {});
  } catch (_) {
    _bgm = null;
  }
}

/**
 * BGM を切り替える (= autoplay 制限回避のため、 必ずユーザー操作後に呼ぶこと)
 * @param {string} relPath - "Audio/bgm_title.mp3" 等
 * @param {number} volume - 0.0 〜 1.0 (= 設定 100% のときの音量)
 */
export function startBgm(relPath, volume = 0.32) {
  stopBgm();
  _bgmPath = relPath;
  _bgmBase = volume;
  _playBgmElement();
}

/** いまかけたい BGM のパス (= 設定が 0 で止めていても覚えている。 SPEC-060) */
export function currentBgmPath() {
  return _bgmPath;
}

export function stopBgm() {
  _bgmPath = null;
  if (_bgm) {
    try { _bgm.pause(); _bgm.currentTime = 0; } catch (_) {}
    _bgm = null;
  }
}

export function setBgmVolume(v) {
  _bgmBase = Math.max(0, Math.min(1, v));
  applyAudioSettings();
}

/** SPEC-044: 設定が変わったら、 鳴っている BGM の音量を直す (= 0 なら止め、 0 から上げたら鳴らし直す) */
export function applyAudioSettings() {
  const vol = _bgmVolume();
  if (vol <= 0) {
    if (_bgm) { try { _bgm.pause(); } catch (_) {} }
    return;
  }
  if (_bgm) {
    _bgm.volume = vol;
    if (_bgm.paused && !_bgmSuspended) _bgm.play().catch(() => {});
  } else {
    _playBgmElement();
  }
}

/** SPEC-044: タブを離れたら止め、 戻ったら再開する */
export function suspendBgm() {
  _bgmSuspended = true;
  if (_bgm) { try { _bgm.pause(); } catch (_) {} }
}
export function resumeBgm() {
  if (!_bgmSuspended) return;
  _bgmSuspended = false;
  applyAudioSettings();
}

onSettingsChange(() => applyAudioSettings());

/**
 * SE 再生 (= throttle 付き)
 * @param {string} relPath - "Audio/se_click.mp3" 等
 * @param {number} throttleMs - 連発防止 (default 80ms)
 * @param {number} volume - 0.0 〜 1.0 (= 設定 100% のときの音量)
 */
export function playSe(relPath, throttleMs = 80, volume = 0.5) {
  const vol = mixVolume(volume, getSettings().se);
  if (vol <= 0) return;
  const now = Date.now();
  const last = _seThrottle.get(relPath) || 0;
  if (now - last < throttleMs) return;
  _seThrottle.set(relPath, now);
  try {
    let base = _seCache.get(relPath);
    if (!base) {
      base = new Audio(audioUrl(relPath));
      base.preload = "auto";
      _seCache.set(relPath, base);
    }
    const a = base.cloneNode();
    a.volume = vol;
    a.play().catch(() => {});
  } catch (_) {}
}
