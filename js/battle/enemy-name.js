// ============================================================
// battle/enemy-name.js — 敵の表示名 (= SPEC-148: 「とどめ」に出す。 型があれば前に付ける)
// ============================================================

import { ENEMY_DEFS, localizedEnemyName } from "../enemies.js";
import { t, getLang } from "../i18n.js";

/** 敵の名前 (= 「疾走 クリーパー」。 図鑑に無ければ #id) */
export function enemyDisplayName(enemyId, variant = null) {
  const base = localizedEnemyName(ENEMY_DEFS[enemyId], getLang()) || `#${enemyId}`;
  return variant ? `${t(`analysis.variant.${variant}`, variant)} ${base}` : base;
}

/** 敵オブジェクトから */
export function enemyNameOf(e) {
  return e ? enemyDisplayName(e.enemyId, e.variant ?? null) : null;
}
