// ============================================================
// battle/extensions-as-weapons.js — extension → weapon spec (= SPEC-008)
// ============================================================
//
// EXT_ROSTER の各要素を 「自動発射ホーミング投射体」 武器として扱う。
// 性能 (= dmg / cdMs / speedPx) は ext.stats から導出。

import { state } from "../state.js";
import { getExt } from "../extensions.js";
import {
  EXT_MAX_LEVEL,
  SERIES_COLOR, SERIES_COLOR_DEFAULT,
} from "../constants.js";

/**
 * @param {number|string} extId
 * @param {number} level
 * @returns {object|null} weapon spec (= state.battle.weapons の要素形)
 */
export function weaponFromExt(extId, level) {
  const ext = getExt(extId);
  if (!ext) return null;
  const lv    = Math.max(1, Math.min(EXT_MAX_LEVEL, level));
  const stats = ext.stats || {};
  const baseDmg = 8 + (stats.phy ?? 0) * 0.15 + (stats.int ?? 0) * 0.15;
  const dmg     = Math.round(baseDmg * (1 + (lv - 1) * 0.20));
  const cdMs    = Math.max(300, 1500 - (stats.agi ?? 0) * 5 - (lv - 1) * 100);
  const speedPx = 260 + (stats.agi ?? 0) * 1.5;
  const range   = 320;
  const color   = SERIES_COLOR[ext.series] ?? SERIES_COLOR_DEFAULT;
  return { extId, level: lv, dmg, cdMs, speedPx, range, color, lastFireMs: 0 };
}

/**
 * state.ownedExtensions → state.battle.weapons を再生成。
 * 既存 weapon の lastFireMs を保持して、 picks 直後の即発射 = level up 後ボーナス。
 */
export function rebuildWeaponsFromOwned() {
  const oldByExtId = new Map(state.battle.weapons.map(w => [w.extId, w]));
  const next = [];
  for (const o of state.ownedExtensions) {
    const w = weaponFromExt(o.extId, o.level);
    if (!w) continue;
    const old = oldByExtId.get(o.extId);
    if (old) w.lastFireMs = old.lastFireMs;
    next.push(w);
  }
  state.battle.weapons = next;
}
