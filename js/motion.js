// ============================================================
// motion.js — 動きを減らすかどうか (= SPEC-043 / SPEC-044)
// ============================================================
//
// OS の prefers-reduced-motion か、 設定の「演出を減らす」のどちらかが ON なら true。

import { getSettings, onSettingsChange } from "./settings.js";

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

/**
 * SPEC-055: 「演出を減らす」を html の data-reduce-fx に映す (= CSS の常に動く演出を止める)。 起動時に 1 回
 */
export function installReduceFxAttr() {
  const apply = () => {
    try {
      const on = prefersReducedMotion();
      document.documentElement.toggleAttribute("data-reduce-fx", on);
    } catch (_) { /* document がない (= テスト) */ }
  };
  apply();
  onSettingsChange(apply);
}
