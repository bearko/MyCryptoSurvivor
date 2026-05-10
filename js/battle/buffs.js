// ============================================================
// battle/buffs.js — 強化 7 系列の効果適用 + 毎フレーム HP regen (= SPEC-011)
// ============================================================
//
// 各 buff は state.buffs の対応 field を **絶対値** で上書き (= 累積ではなく現 tier の値)。
// HP max up は statsMax.hp + delta、 同 delta だけ stats.hp も増やす (= 上限超えはクランプ)。

import { state } from "../state.js";
import { getExt, getCategory } from "../extensions.js";
import { STATS_INITIAL } from "../constants.js";

/**
 * pick された buff を即時適用。 weapon entry が来た場合は何もしない (= 呼出側で分岐前提)。
 */
export function applyBuff(extId, level) {
  const ext = getExt(extId);
  if (!ext || getCategory(ext) !== "buff") return;
  const params = ext.tierParams?.[Math.max(0, (level | 0) - 1)] ?? {};
  const m = params.magnitude ?? 0;
  const buffs = state.buffs;

  switch (ext.archetype) {
    case "hpMaxUp": {
      const before = buffs.hpMaxBonus;
      const delta  = m - before;
      buffs.hpMaxBonus  = m;
      state.statsMax.hp = STATS_INITIAL.hp + m;
      state.stats.hp    = Math.min(state.statsMax.hp, state.stats.hp + delta);
      break;
    }
    case "regen":         buffs.regenPerSec     = m; break;
    case "speedUp":       buffs.speedMul        = m; break;
    case "cdDown":        buffs.cdMul           = m; break;
    case "dmgTakenDown":  buffs.dmgTakenMul     = m; break;
    case "dmgUp":         buffs.dmgMul          = m; break;
    case "bulletCount":   buffs.bulletCountBonus = m; break;
    case "attackRangeUp": buffs.rangeMul         = m; break;   // SPEC-019: 液浸標本
    case "pickupRangeUp": buffs.pickupMul        = m; break;   // SPEC-019: ギョク
    case "pierceUp":      buffs.pierceBonus      = m; break;   // SPEC-031: グンバイ
    default:
      console.warn("[buffs] unknown archetype:", ext.archetype);
  }
}

/**
 * RAF ループ毎に呼ぶ HP regen (= 1 sec ごとに regenPerSec hp 回復、 上限クランプ)。
 */
export function tickRegen(dt) {
  const r = state.buffs.regenPerSec;
  if (r <= 0) return;
  if (state.stats.hp <= 0) return;     // 死亡中は回復しない
  const max = state.statsMax.hp;
  const next = state.stats.hp + r * dt;
  state.stats.hp = next > max ? max : next;
}

/**
 * startBattle で呼んで buffs を初期値に戻す。
 */
export function resetBuffs() {
  state.buffs.hpMaxBonus       = 0;
  state.buffs.regenPerSec      = 0;
  state.buffs.speedMul         = 1;
  state.buffs.cdMul            = 1;
  state.buffs.dmgTakenMul      = 1;
  state.buffs.dmgMul           = 1;
  state.buffs.bulletCountBonus = 0;
  state.buffs.rangeMul         = 1;   // SPEC-019: 液浸標本
  state.buffs.pickupMul        = 1;   // SPEC-019: ギョク
  state.buffs.pierceBonus      = 0;   // SPEC-031: グンバイ
}
