// ============================================================
// audio.js — BGM / SE
// ============================================================

import { audioUrl } from "./constants.js";

let _bgm = null;
const _seThrottle = new Map();
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

/**
 * BGM を切り替える (= autoplay 制限回避のため、 必ずユーザー操作後に呼ぶこと)
 * @param {string} relPath - "Audio/bgm_title.mp3" 等
 * @param {number} volume - 0.0 〜 1.0
 */
export function startBgm(relPath, volume = 0.32) {
  stopBgm();
  try {
    _bgm = new Audio(audioUrl(relPath));
    _bgm.loop = true;
    _bgm.volume = volume;
    _bgm.play().catch(() => {});
  } catch (_) {
    _bgm = null;
  }
}

export function stopBgm() {
  if (_bgm) {
    try { _bgm.pause(); _bgm.currentTime = 0; } catch (_) {}
    _bgm = null;
  }
}

export function setBgmVolume(v) {
  if (_bgm) _bgm.volume = Math.max(0, Math.min(1, v));
}

/**
 * SE 再生 (= throttle 付き)
 * @param {string} relPath - "Audio/se_click.mp3" 等
 * @param {number} throttleMs - 連発防止 (default 80ms)
 * @param {number} volume - 0.0 〜 1.0
 */
export function playSe(relPath, throttleMs = 80, volume = 0.5) {
  const now = Date.now();
  const last = _seThrottle.get(relPath) || 0;
  if (now - last < throttleMs) return;
  _seThrottle.set(relPath, now);
  try {
    const a = new Audio(audioUrl(relPath));
    a.volume = volume;
    a.play().catch(() => {});
  } catch (_) {}
}
