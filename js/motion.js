// ============================================================
// motion.js — 動きを減らすかどうか (= SPEC-043)
// ============================================================
//
// OS の prefers-reduced-motion を見る。 SPEC-044 で「演出を減らす」設定を足したら、ここで合わせて返す。

export function prefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}
