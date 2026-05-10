// ============================================================
// battle/extensions-as-weapons.js — extension → weapon spec
// (= SPEC-008 / SPEC-011)
// ============================================================
//
// schema v2 では entry.tierParams[level-1] が weapon の数値を持つ。
// archetype フィールドはここに保持しておき、 SPEC-012 の per-archetype tick が利用する。
// SPEC-011 段階では archetype に関わらず単一の homing projectile (= SPEC-008 と同形) で発射、
// dmg / cdMs / range / speedPx だけ tier params から読む。

import { state } from "../state.js";
import { getExt, getCategory } from "../extensions.js";
import { EXT_MAX_LEVEL, SERIES_COLOR_DEFAULT } from "../constants.js";

/**
 * @param {number|string} extId
 * @param {number} level - 1..EXT_MAX_LEVEL
 * @returns {object|null} weapon spec or null (= weapon カテゴリ以外 / 該当 ext なし)
 */
export function weaponFromExt(extId, level) {
  const ext = getExt(extId);
  if (!ext || getCategory(ext) !== "weapon") return null;
  const lv     = Math.max(1, Math.min(EXT_MAX_LEVEL, level | 0));
  const params = ext.tierParams?.[lv - 1] ?? {};
  const color  = ext.seriesColor ?? SERIES_COLOR_DEFAULT;
  return {
    extId,
    level:      lv,
    archetype:  ext.archetype ?? "homing",
    dmg:        params.dmg     ?? 8,
    cdMs:       params.cdMs    ?? 1500,
    range:      params.range   ?? 320,
    speedPx:    params.speedPx ?? 280,
    bullets:    params.bullets ?? 1,
    color,
    // SPEC-021: tier ごとの icon (= ext.tierIconIds[level-1])、 fallback で iconId
    iconId:     ext.tierIconIds?.[lv - 1] ?? ext.iconId ?? null,
    // SPEC-019: 投射体専用 icon を ext で明示できる (= null で circle fallback)
    // SPEC-021: tier 連動 (= projectileIconId 明示なら全 tier 共通、 未設定なら現 tier icon に追従)
    projectileIconId: (ext.projectileIconId !== undefined)
      ? ext.projectileIconId
      : (ext.tierIconIds?.[lv - 1] ?? ext.iconId ?? null),
    series:     ext.series ?? null,           // SPEC-015: rotation offset 判定用
    lastFireMs: 0,
    // SPEC-012 が読む可能性のある archetype 別パラメータをそのまま渡す
    params,
  };
}

/**
 * state.ownedExtensions のうち category=weapon のものから state.battle.weapons を再生成。
 * buff entry は対象外 (= 別途 buffs.js で適用)。 lastFireMs は維持できる範囲で維持。
 */
export function rebuildWeaponsFromOwned() {
  const oldByExtId = new Map(state.battle.weapons.map(w => [String(w.extId), w]));
  const next = [];
  for (const o of state.ownedExtensions) {
    const ext = getExt(o.extId);
    if (!ext || getCategory(ext) !== "weapon") continue;
    const w = weaponFromExt(o.extId, o.level);
    if (!w) continue;
    const old = oldByExtId.get(String(o.extId));
    if (old) w.lastFireMs = old.lastFireMs;
    next.push(w);
  }
  state.battle.weapons = next;
}
