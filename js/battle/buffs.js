// ============================================================
// battle/buffs.js — 強化 7 系列の効果適用 + 毎フレーム HP regen (= SPEC-011)
// ============================================================
//
// 各 buff は state.buffs の対応 field を **絶対値** で上書き (= 累積ではなく現 tier の値)。
// HP max up は statsMax.hp + delta、 同 delta だけ stats.hp も増やす (= 上限超えはクランプ)。

import { state } from "../state.js";
import { getExt, getCategory } from "../extensions.js";
import { STATS_INITIAL } from "../constants.js";
import { perks, perkBuffBase } from "../perks.js";   // SPEC-090c: スキルツリーの土台

/**
 * pick された buff を即時適用。 weapon entry が来た場合は何もしない (= 呼出側で分岐前提)。
 */
export function applyBuff(extId, level) {
  const ext = getExt(extId);
  if (!ext || getCategory(ext) !== "buff") return;
  const params = ext.tierParams?.[Math.max(0, (level | 0) - 1)] ?? {};
  const m = params.magnitude ?? 0;
  const buffs = state.buffs;
  const base  = perkBuffBase(perks());   // SPEC-090c: スキルツリーの土台に掛ける (= 絶対値ではなく、 土台 × tier)

  switch (ext.archetype) {
    case "hpMaxUp": {
      const before = buffs.hpMaxBonus;
      const delta  = m - before;
      buffs.hpMaxBonus  = m;
      state.statsMax.hp = (state.battle.baseMaxHp ?? STATS_INITIAL.hp) + m;   // SPEC-090c: 開始 HP (= ヒーロー × 頑丈なからだ) に足す
      state.stats.hp    = Math.min(state.statsMax.hp, state.stats.hp + delta);
      break;
    }
    case "regen":         buffs.regenPerSec     = base.regenPerSec + m; break;
    case "speedUp":       buffs.speedMul        = base.speedMul * m; break;
    case "cdDown":        buffs.cdMul           = base.cdMul * m; break;
    case "dmgTakenDown":  buffs.dmgTakenMul     = base.dmgTakenMul * m; break;
    case "dmgUp":         buffs.dmgMul          = base.dmgMul * m; break;
    case "bulletCount":   buffs.bulletCountBonus = base.bulletCountBonus + m; break;
    case "attackRangeUp": buffs.rangeMul         = base.rangeMul * m; break;   // SPEC-019: 液浸標本
    case "pickupRangeUp": buffs.pickupMul        = base.pickupMul * m; break;   // SPEC-019: ギョク
    case "pierceUp":      buffs.pierceBonus      = base.pierceBonus + m; break;   // SPEC-031: グンバイ
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
  // SPEC-090c: 初期値はスキルツリーの土台 (= 何も取っていなければ 0 / 1)
  Object.assign(state.buffs, perkBuffBase(perks()));
}
