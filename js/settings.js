// ============================================================
// settings.js — 設定 (= 音量・演出を減らす) の保存と通知 (= SPEC-044)
// ============================================================
//
// localStorage["mcs.settings"] = { v: 1, bgm: 0〜1, se: 0〜1, voice: 0〜1 (= SPEC-085 マインちゃんのボイス), reduceFx: bool }
// 音量は「呼び出し側の音量 × 設定」。 1.0 で今までと同じ大きさ。

import { LS_SETTINGS } from "./constants.js";

export const DEFAULT_SETTINGS = Object.freeze({ v: 1, bgm: 1, se: 1, voice: 1, reduceFx: false });

function _clamp01(x, fallback) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/** 壊れた値・範囲外を既定値と 0〜1 に直す (= 純関数) */
export function normalizeSettings(raw) {
  const r = (raw && typeof raw === "object") ? raw : {};
  return {
    v: 1,
    bgm: _clamp01(r.bgm, DEFAULT_SETTINGS.bgm),
    se: _clamp01(r.se, DEFAULT_SETTINGS.se),
    voice: _clamp01(r.voice, DEFAULT_SETTINGS.voice),   // SPEC-085: 前の版の設定 (= voice なし) は 100%
    reduceFx: r.reduceFx === true,
  };
}

/** 呼び出し側の音量 × 設定 (= 純関数) */
export function mixVolume(base, level) {
  return _clamp01(_clamp01(base, 0) * _clamp01(level, 0), 0);
}

let _settings = null;
const _listeners = new Set();

function _load() {
  try {
    const s = globalThis.localStorage?.getItem(LS_SETTINGS);
    return normalizeSettings(s ? JSON.parse(s) : null);
  } catch (_) {
    return normalizeSettings(null);
  }
}

export function getSettings() {
  if (!_settings) _settings = _load();
  return _settings;
}

export function updateSettings(patch) {
  _settings = normalizeSettings({ ...getSettings(), ...patch });
  try { globalThis.localStorage?.setItem(LS_SETTINGS, JSON.stringify(_settings)); } catch (_) {}
  for (const fn of _listeners) {
    try { fn(_settings); } catch (e) { console.error("settings listener", e); }
  }
  return _settings;
}

export function onSettingsChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
