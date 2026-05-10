// ============================================================
// battle/damage.js — ダメージ適用 + 数字 floater + hit freeze (= SPEC-016)
// ============================================================
//
// 全武器系列 (= projectiles / orbits / beams / bombs / shockwaves) は
// 敵 hp を直接弄らず、 hitEnemy(enemyArrIdx, dmg) を呼ぶ。
// 統一処理:
//   - 浮動 dmg を整数に整形して enemy.hp から減算
//   - state.battle.damageNumbers に floater を push (= 上昇 + alpha fade)
//   - enemy.hitFreezeMs を HIT_FREEZE_MS にセット (= tickEnemies 側で移動停止)
//   - 死亡時は gem ドロップ + state.killCount++ + 配列から splice
// 戻り値: 死亡で配列から除外された場合 true、 それ以外 false。
// 呼出側は逆順走査して splice 不整合を回避すること。

import { state } from "../state.js";
import { spawnGem } from "./gems.js";
import { spawnMagicCard } from "./magic-cards.js";
import {
  HIT_FREEZE_MS, DAMAGE_NUMBER_LIFE_MS, DAMAGE_NUMBER_RISE_PX_S,
} from "../constants.js";

/**
 * 敵に damage を与える。 数字 floater + hit freeze を一括処理。
 * @param {number} idx - state.battle.enemies のインデックス
 * @param {number} dmg - 適用するダメージ (= 浮動小数を round)
 * @returns {boolean} true if killed (= splice 済)
 */
export function hitEnemy(idx, dmg) {
  const enemies = state.battle.enemies;
  const e = enemies[idx];
  if (!e) return false;
  const dmgInt = Math.max(0, Math.round(dmg));
  if (dmgInt <= 0) return false;
  e.hp -= dmgInt;
  e.hitFreezeMs = HIT_FREEZE_MS;
  pushDamageNumber(e.x, e.y - e.r - 4, dmgInt, "#ffffff");
  if (e.hp <= 0) {
    // SPEC-026: 強敵ほど高 XP を落とす (= ENEMY_SPECS.xpValue 由来、 enemy.xpValue が未設定なら 1)
    spawnGem(e.x, e.y, e.xpValue ?? 1);
    // SPEC-033: レアエネミー撃破時はマジックカード (= 即時レベルアップアイテム) も同位置にドロップ
    if (e.isRare) spawnMagicCard(e.x, e.y);
    enemies.splice(idx, 1);
    state.killCount++;
    // SPEC-022 + SPEC-033: ボス撃破フラグ → 次 tick で triggerStageEndOrTransition
    // 旧: BOSS_ENEMY_ID hardcode (= ヨシュカ id 171 のみ) → ステージ 2/3 では発火しなかった
    // 新: e.isBoss を見るので Fao / yamap / 任意ボスで発火
    if (e.isBoss) {
      state.battle.bossDefeated = true;
    }
    return true;
  }
  return false;
}

/**
 * ダメージ数字 floater を push (= 自動的に上昇 + age で消滅)。
 */
export function pushDamageNumber(x, y, value, color) {
  state.battle.damageNumbers.push({
    id: state.battle.nextEntityId++,
    x, y,
    value: String(value),
    age: 0,
    life: DAMAGE_NUMBER_LIFE_MS,
    vy: -DAMAGE_NUMBER_RISE_PX_S,
    color: color ?? "#ffffff",
  });
}

/**
 * 毎フレームの floater 更新 (= 寿命管理 + 上昇アニメ)。
 */
export function tickDamageNumbers(dt) {
  const dms = dt * 1000;
  const arr = state.battle.damageNumbers;
  for (let i = arr.length - 1; i >= 0; i--) {
    const d = arr[i];
    d.age += dms;
    d.y  += d.vy * dt;
    if (d.age >= d.life) arr.splice(i, 1);
  }
}
