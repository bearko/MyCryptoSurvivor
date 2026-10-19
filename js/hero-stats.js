// ============================================================
// hero-stats.js — ヒーローのステータス → 戦闘の数値 (= SPEC-014 / SPEC-097)
// ============================================================
//
// 戦闘・ヒーローの詳しい欄・レーダーチャート (= SPEC-099) が同じ式を使うよう、 ここに集める。
// DOM にも state にも触れない純関数だけ。

import {
  HERO_HP_BASE, HERO_HP_PER_STAT, HERO_SPEED_BASE, HERO_SPEED_PER_AGI,
  HERO_PHY_BASE, HERO_PHY_DIV, HERO_INT_BASE, HERO_INT_DIV,
} from "./constants.js";

/** HP の上限 (= スキルツリーの頑丈なからだを掛ける前) */
export function heroMaxHp(hero) {
  return HERO_HP_BASE + Math.round((hero?.stats?.hp ?? 0) * HERO_HP_PER_STAT);
}

/** 移動の速さ (px/秒) */
export function heroSpeed(hero) {
  return HERO_SPEED_BASE + Math.round((hero?.stats?.agi ?? 0) * HERO_SPEED_PER_AGI);
}

/** 武器のダメージの倍率 (= PHY。 SPEC-097) */
export function heroDmgMul(hero) {
  const phy = hero?.stats?.phy;
  if (phy == null) return 1;
  return 1 + (phy - HERO_PHY_BASE) / HERO_PHY_DIV;
}

/** 武器の間隔の倍率 (= INT。 1 より小さいほど速く撃つ。 SPEC-097) */
export function heroCdMul(hero) {
  const int = hero?.stats?.int;
  if (int == null) return 1;
  return 1 - (int - HERO_INT_BASE) / HERO_INT_DIV;
}
