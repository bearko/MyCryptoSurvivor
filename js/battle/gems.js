// ============================================================
// battle/gems.js — XP gem スポーン + 拾う + level up (= SPEC-007)
// ============================================================

import { state } from "../state.js";
import {
  GEM_VALUE, GEM_RADIUS, GEM_COLOR, GEM_PICKUP_RADIUS,
  XP_TO_NEXT_GROWTH,
} from "../constants.js";

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
  const r2 = GEM_PICKUP_RADIUS * GEM_PICKUP_RADIUS;

  for (let i = b.gems.length - 1; i >= 0; i--) {
    const g  = b.gems[i];
    const dx = g.x - px;
    const dy = g.y - py;
    if (dx * dx + dy * dy <= r2) {
      state.xp += g.value;
      b.gems.splice(i, 1);
    }
  }

  // level up loop (= 1 frame で複数 LV 上がる可能性あり)
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
  }
}
