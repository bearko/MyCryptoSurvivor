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
import { storyAllows } from "../story.js";   // SPEC-165
import { spawnGem } from "./gems.js";
import { spawnMagicCard } from "./magic-cards.js";
import { fxEnemyHit, fxEnemyKilled } from "./fx.js";
import { dropFromProp } from "./field.js";
import { breakTrojan } from "./gimmicks.js";
import {
  HIT_FREEZE_MS, DAMAGE_NUMBER_LIFE_MS, DAMAGE_NUMBER_RISE_PX_S,
} from "../constants.js";
import { bossDmgDealtMul } from "../perks.js";   // SPEC-090c
import { sigDamageMul } from "./signature.js";   // SPEC-100
import { boostDmgMul } from "./missions.js";   // SPEC-125
import { recordDealt, recordKill } from "./run-stats.js";   // SPEC-148
import { dropBossChest, BOSS_CHEST } from "./boss-chest.js";   // SPEC-153

/** SPEC-148: 武器の与ダメの出どころの名前 (= run-stats の dealt の鍵) */
export const weaponSrc = (extId) => (extId == null ? "other" : `w:${extId}`);

/**
 * 敵に damage を与える。 数字 floater + hit freeze を一括処理。
 * @param {number} idx - state.battle.enemies のインデックス
 * @param {number} dmg - 適用するダメージ (= 浮動小数を round)
 * @param {string} [src] - SPEC-148: 出どころ (= weaponSrc(extId) か "sig" / "ll" / "thunder" / "gimmick")
 * @returns {boolean} true if killed (= splice 済)
 */
export function hitEnemy(idx, dmg, src = "other") {
  const enemies = state.battle.enemies;
  const e = enemies[idx];
  if (!e) return false;
  if (e.isBoss) dmg *= bossDmgDealtMul();   // SPEC-090c: 竜の爪・竜殺し
  dmg *= sigDamageMul(e);   // SPEC-100: ワンホールショット・ランゲルライン・虎痴
  dmg *= boostDmgMul();     // SPEC-125: ミッションのごほうびの力添え
  const dmgInt = Math.max(0, Math.round(dmg));
  if (dmgInt <= 0) return false;
  e.hp -= dmgInt;
  if (!e.isProp && src !== "gimmick") recordDealt(state.run?.stats, src, dmgInt, !!e.isBoss);   // SPEC-148: 壺・宝箱と、 仕掛け (= 自分の火力ではない) は数えない
  e.hitFreezeMs = HIT_FREEZE_MS;
  fxEnemyHit(e);   // SPEC-045: 一瞬白く光る
  // SPEC-057: 大きいダメージほど大きく、 金色で
  const big = dmgInt >= 100 ? "xl" : (dmgInt >= 40 ? "lg" : "");
  pushDamageNumber(e.x, e.y - e.r - 4, dmgInt, big === "xl" ? "#ffd56a" : (big ? "#ffe9c2" : "#ffffff"), big);
  if (e.hp <= 0 && e.isProp) {
    // SPEC-053: 壺・宝箱は撃破数・経験値に数えず、 お助けアイテムか CE を落とす
    dropFromProp(e);
    enemies.splice(idx, 1);
    fxEnemyKilled(e);
    return true;
  }
  if (e.hp <= 0 && e.behavior === "trojan") {
    // SPEC-064: 木馬は開く前に壊すと、 宝箱の中身と CE (= 撃破数には数えない)
    breakTrojan(e);
    enemies.splice(idx, 1);
    fxEnemyKilled(e);
    return true;
  }
  if (e.hp <= 0) {
    // SPEC-026: 強敵ほど高 XP を落とす (= ENEMY_SPECS.xpValue 由来、 enemy.xpValue が未設定なら 1)
    if (storyAllows("ce")) spawnGem(e.x, e.y, e.xpValue ?? 1);   // SPEC-165: ストーリーの 1-1・1-2 は CE を落とさない
    // SPEC-033: レアエネミー撃破時はマジックカード (= 即時レベルアップアイテム) も同位置にドロップ
    if (e.isRare) spawnMagicCard(e.x, e.y);
    enemies.splice(idx, 1);
    state.killCount++;
    recordKill(state.run?.stats);   // SPEC-148
    fxEnemyKilled(e);   // SPEC-045: 粒・撃破音 (= ボスなら揺れ・閃光)
    // SPEC-022 + SPEC-033: ボス撃破フラグ → 次 tick で triggerStageEndOrTransition
    // 旧: BOSS_ENEMY_ID hardcode (= ヨシュカ id 171 のみ) → ステージ 2/3 では発火しなかった
    // 新: e.isBoss を見るので Fao / yamap / 任意ボスで発火
    if (e.isBoss) {
      state.battle.bossDefeated = true;
      state.battle.bossChestOpen = true;   // SPEC-153: 宝箱を開けるまでステージの終わりを待たせる (= 落ちてくるのは 0.5 秒後)
      setTimeout(dropBossChest, BOSS_CHEST.dropMs);   // SPEC-153: 倒した瞬間に宝箱 (= 撃破の粒と音のあとに)
    }
    return true;
  }
  return false;
}

/**
 * ダメージ数字 floater を push (= 自動的に上昇 + age で消滅)。
 */
export function pushDamageNumber(x, y, value, color, size = "") {
  state.battle.damageNumbers.push({
    size,   // SPEC-057: "" / "lg" / "xl" (= 文字の大きさ)
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
