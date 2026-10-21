// ============================================================
// battle/gems.js — XP gem スポーン + 拾う + level up (= SPEC-007)
// ============================================================

import { state } from "../state.js";
import {
  GEM_VALUE, GEM_RADIUS, GEM_COLOR, GEM_PICKUP_RADIUS, MAGNET_SPEED_PX_S,
  XP_TO_NEXT_GROWTH,
  SFX,
} from "../constants.js";
import { triggerLevelUpPick } from "./levelup.js";
import { playSe } from "../audio.js";
import { xpGainMul } from "../perks.js";   // SPEC-090c
import { prefersReducedMotion } from "../motion.js";
import { startAbsorb, absorbStep, chainPitch } from "./absorb.js";   // SPEC-102
import { sigPickupMul, sigOnGemsPicked, sigOnLevelUp } from "./signature.js";   // SPEC-100
import { hitEnemy } from "./damage.js";
import { addShopCe } from "./shop.js";   // SPEC-109

export function spawnGem(x, y, value = GEM_VALUE) {
  const b = state.battle;
  b.gems.push({
    id: b.nextEntityId++,
    x, y, r: GEM_RADIUS, value, color: GEM_COLOR,
  });
}

/**
 * 1 frame: プレイヤー周囲の gem を吸収 → XP 加算 → 必要なら level up を繰り返す。
 */
export function tickGems(dt) {
  const b = state.battle;
  const px = b.player.x;
  const py = b.player.y;
  // SPEC-019: ギョク (pickupMul) で吸引半径拡大
  const pickupMul = state.buffs?.pickupMul ?? 1;
  const pickupR = GEM_PICKUP_RADIUS * pickupMul * sigPickupMul();   // SPEC-100: 女王直属海賊
  const r2 = pickupR * pickupR;

  // SPEC-102: 範囲に入った CE は吸い込み中にして、 ヒーローに届いた瞬間に経験値を入れる。
  // 動きを減らす設定のときは、 いままでどおりその場で拾う (= 棒磁石は一直線に飛んでくる)
  const instant = prefersReducedMotion();
  let picked = 0;
  for (let i = b.gems.length - 1; i >= 0; i--) {
    const g  = b.gems[i];
    let arrived = false;
    if (instant) {
      // SPEC-053: 棒磁石を拾ったあとの CE はプレイヤーへ飛んでくる
      if (g.magnet) {
        const mx = px - g.x, my = py - g.y;
        const md = Math.hypot(mx, my) || 1;
        const step = Math.min(md, MAGNET_SPEED_PX_S * dt);
        g.x += (mx / md) * step;
        g.y += (my / md) * step;
      }
      const dx = g.x - px;
      const dy = g.y - py;
      arrived = dx * dx + dy * dy <= r2;
    } else {
      if (!g.absorbing) {
        const dx = g.x - px;
        const dy = g.y - py;
        // SPEC-053: 棒磁石は画面のすべての CE を一度に吸い込み中にするだけ
        if (g.magnet || dx * dx + dy * dy <= r2) startAbsorb(g);
      }
      if (g.absorbing) arrived = absorbStep(g, px, py, dt);
    }
    if (arrived) {
      // SPEC-090c: 学びの速さ (= 端数は貯めて、 整数になったぶんだけ足す)
      b.xpAcc = (b.xpAcc ?? 0) + g.value * xpGainMul() * (state.buffs.ceGainMul ?? 1);   // SPEC-108: クラウン
      const whole = Math.floor(b.xpAcc + 1e-9);
      b.xpAcc -= whole;
      if (state.shop) addShopCe(whole);   // SPEC-109: ショップでは財布へ (= レベルは上がらない)
      else state.xp += whole;
      b.gems.splice(i, 1);
      picked += 1;
    }
  }
  // SPEC-017: 経験値獲得 SE (= 80ms throttle で連発時の連鎖もリズミカルに 1 音ずつ)
  // SPEC-102: 続けて届くほど少しずつ高く鳴らす (= じゃらじゃら)
  b.gemChain ??= { n: 0, ms: 0 };
  const pitch = chainPitch(b.gemChain, dt * 1000, picked);
  if (picked > 0) playSe(SFX.GEM_PICKUP, 80, 0.4, pitch);
  sigOnGemsPicked(picked);   // SPEC-100

  // level up loop (= 1 frame で複数 LV 上がる可能性あり、 まとめて pick を queue)
  let levelUps = 0;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
    levelUps += 1;
  }
  if (levelUps > 0) {
    sigOnLevelUp(levelUps, (j, d) => hitEnemy(j, d, "sig"));   // SPEC-100: クリプトスラッシュ (= 呼ばれていなかった)。 SPEC-148: 出どころ
    triggerLevelUpPick(levelUps);       // SPEC-008: モーダル trigger
  }
}
