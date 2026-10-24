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
import { EXT_MAX_LEVEL, LL_LEVEL, SERIES_COLOR_DEFAULT } from "../constants.js";
import { rankOf, levelParams } from "../ext-level.js";   // SPEC-162
import { weaponKey } from "./team-battle.js";   // SPEC-168

/**
 * @param {number|string} extId
 * @param {number} level - 1..EXT_MAX_LEVEL
 * @returns {object|null} weapon spec or null (= weapon カテゴリ以外 / 該当 ext なし)
 */
export function weaponFromExt(extId, level) {
  const ext = getExt(extId);
  if (!ext || getCategory(ext) !== "weapon") return null;
  // SPEC-101: LL (= 6 段目) はその系列に LL 版があるときだけ。 数値は ext.ll.params
  const isLL   = !!ext.ll && (level | 0) >= LL_LEVEL;
  const lv     = isLL ? LL_LEVEL : Math.max(1, Math.min(EXT_MAX_LEVEL, level | 0));
  const params = isLL ? ext.ll.params : levelParams(ext, lv);   // SPEC-162: 15 段に伸ばした数値
  const tierIcon = isLL ? ext.ll.extId : (ext.tierIconIds?.[rankOf(lv) - 1] ?? ext.iconId ?? null);
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
    pierce:     params.pierce  ?? 0,         // SPEC-031: Panjandrum 系列の貫通体数
    color,
    // SPEC-021: tier ごとの icon (= ext.tierIconIds[level-1])、 fallback で iconId
    iconId:     tierIcon,
    isLL,
    // SPEC-019: 投射体専用 icon を ext で明示できる (= null で circle fallback)
    // SPEC-021: tier 連動 (= projectileIconId 明示なら全 tier 共通、 未設定なら現 tier icon に追従)
    projectileIconId: (ext.projectileIconId !== undefined)
      ? ext.projectileIconId
      : tierIcon,
    series:     ext.series ?? null,           // SPEC-015: rotation offset 判定用
    lastFireMs: 0,
    // SPEC-012 が読む可能性のある archetype 別パラメータをそのまま渡す
    params,
  };
}

/**
 * state.ownedExtensions のうち category=weapon のものから state.battle.weapons を再生成。
 * buff entry は対象外 (= 別途 buffs.js で適用)。 lastFireMs は維持できる範囲で維持。
 * SPEC-168: サブの武器 (= state.battle.subs[i].extId / level) も持ち主つきで足す (= メインの枠とは別)
 */
export function rebuildWeaponsFromOwned() {
  const oldByKey = new Map(state.battle.weapons.map(w => [weaponKey(w), w]));
  const next = [];
  const add = (w) => {
    if (!w) return;
    const old = oldByKey.get(weaponKey(w));
    if (old) w.lastFireMs = old.lastFireMs;
    next.push(w);
  };
  for (const o of state.ownedExtensions) {
    const ext = getExt(o.extId);
    if (!ext || getCategory(ext) !== "weapon") continue;
    add(weaponFromExt(o.extId, o.level));
  }
  (state.battle.subs ?? []).forEach((s, i) => {
    const w = weaponFromExt(s.extId, Math.min(EXT_MAX_LEVEL, s.level ?? 1));   // サブは LL にならない
    if (w) w.owner = i;
    add(w);
  });
  state.battle.weapons = next;
}
