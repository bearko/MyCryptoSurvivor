// ============================================================
// motion.js — 動きを減らすかどうか (= SPEC-043 / SPEC-044)
// ============================================================
//
// OS の prefers-reduced-motion か、 設定の「演出を減らす」のどちらかが ON なら true。

import { getSettings } from "./settings.js";

export function osPrefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

export function prefersReducedMotion() {
  return osPrefersReducedMotion() || getSettings().reduceFx;
}
