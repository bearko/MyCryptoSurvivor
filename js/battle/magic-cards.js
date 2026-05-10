// ============================================================
// battle/magic-cards.js — マジックカード (= 即時レベルアップアイテム)  SPEC-033
// ============================================================
//
// レアエネミー撃破時に CE gem と一緒にドロップ。 取得すると state.level を +1 して
// 通常の triggerLevelUpPick(1) でピックモーダルを開く。 既得 CE (= state.xp) は
// 持ち越し (= 通常 LV up と違って xp は減らさない)。

import { state } from "../state.js";
import {
  MAGIC_CARD_RADIUS, MAGIC_CARD_PICKUP_RADIUS,
  XP_TO_NEXT_GROWTH,
  SFX,
} from "../constants.js";
import { triggerLevelUpPick } from "./levelup.js";
import { playSe } from "../audio.js";

/**
 * マジックカードを (x, y) にドロップ (= CE gem と同位置に重ねて出すことが多い)。
 */
export function spawnMagicCard(x, y) {
  const b = state.battle;
  b.magicCards.push({
    id: b.nextEntityId++,
    x, y,
    r: MAGIC_CARD_RADIUS,
  });
}

/**
 * 1 frame: プレイヤー周囲のマジックカードを吸収 → 即時 LV up trigger。
 * 取得個数だけまとめて triggerLevelUpPick(N) を呼ぶ (= 連鎖でモーダル N 回)。
 */
export function tickMagicCards(_dt) {
  const b = state.battle;
  if (b.magicCards.length === 0) return;
  const px = b.player.x;
  const py = b.player.y;
  // 通常 gem と同じく Gyoku の pickupMul で半径拡張
  const pickupMul = state.buffs?.pickupMul ?? 1;
  const pickupR = MAGIC_CARD_PICKUP_RADIUS * pickupMul;
  const r2 = pickupR * pickupR;

  let picked = 0;
  for (let i = b.magicCards.length - 1; i >= 0; i--) {
    const c = b.magicCards[i];
    const dx = c.x - px, dy = c.y - py;
    if (dx * dx + dy * dy <= r2) {
      b.magicCards.splice(i, 1);
      picked++;
    }
  }
  if (picked === 0) return;

  // 即時レベルアップ (= xp は減らさない、 state.xpToNext のみ次段に進める)
  for (let n = 0; n < picked; n++) {
    state.level += 1;
    state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
  }
  // 既存 LV up SE + ピックモーダル trigger (= triggerLevelUpPick が open_treasure SE を鳴らす)
  triggerLevelUpPick(picked);
  // open SE は levelup.js が鳴らすが、 拾得感の補強で crash も鳴らす (= 100ms throttle)
  playSe(SFX.GEM_PICKUP, 100, 0.5);
}
