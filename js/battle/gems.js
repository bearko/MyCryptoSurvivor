// ============================================================
// battle/gems.js — XP gem スポーン + 拾う + level up (= SPEC-007)
// ============================================================

import { state } from "../state.js";
import {
  GEM_VALUE, GEM_RADIUS, GEM_COLOR, GEM_PICKUP_RADIUS,
  XP_TO_NEXT_GROWTH,
  SFX,
} from "../constants.js";
import { triggerLevelUpPick } from "./levelup.js";
import { playSe } from "../audio.js";

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
export function tickGems(_dt) {
  const b = state.battle;
  const px = b.player.x;
  const py = b.player.y;
  // SPEC-019: ギョク (pickupMul) で吸引半径拡大
  const pickupMul = state.buffs?.pickupMul ?? 1;
  const pickupR = GEM_PICKUP_RADIUS * pickupMul;
  const r2 = pickupR * pickupR;

  let pickedAny = false;
  for (let i = b.gems.length - 1; i >= 0; i--) {
    const g  = b.gems[i];
    const dx = g.x - px;
    const dy = g.y - py;
    if (dx * dx + dy * dy <= r2) {
      state.xp += g.value;
      b.gems.splice(i, 1);
      pickedAny = true;
    }
  }
  // SPEC-017: 経験値獲得 SE (= 80ms throttle で連発時の連鎖もリズミカルに 1 音ずつ)
  if (pickedAny) playSe(SFX.GEM_PICKUP, 80, 0.4);

  // level up loop (= 1 frame で複数 LV 上がる可能性あり、 まとめて pick を queue)
  let levelUps = 0;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
    levelUps += 1;
  }
  if (levelUps > 0) triggerLevelUpPick(levelUps);   // SPEC-008: モーダル trigger
}
