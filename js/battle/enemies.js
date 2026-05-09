// ============================================================
// battle/enemies.js — 敵スポーン + 追跡 AI + 接触ダメージ (= SPEC-007 / SPEC-016)
// ============================================================

import { state } from "../state.js";
import {
  ENEMY_SPAWN_INTERVAL_MS, ENEMY_SPAWN_MARGIN_PX,
  ENEMY_SPEED_PX_S, ENEMY_HP_INITIAL, ENEMY_DMG,
  ENEMY_RADIUS, ENEMY_COLOR, MAX_ENEMIES,
  CONTACT_COOLDOWN_MS,
} from "../constants.js";
import { triggerGameOver } from "./gameover.js";
import { pushDamageNumber } from "./damage.js";

/**
 * 1 frame 分: 必要ならスポーン → 全敵がプレイヤーに 1 step 接近 → 接触判定
 */
export function tickEnemies(dt, nowMs) {
  const b = state.battle;

  // spawn
  if (b.enemies.length < MAX_ENEMIES &&
      nowMs - b.lastEnemySpawnMs >= ENEMY_SPAWN_INTERVAL_MS) {
    spawnEnemyAtRing();
    b.lastEnemySpawnMs = nowMs;
  }

  const px = b.player.x;
  const py = b.player.y;

  const dms = dt * 1000;

  for (const e of b.enemies) {
    // SPEC-016: 被弾直後 hitFreezeMs > 0 のあいだは移動停止
    if ((e.hitFreezeMs ?? 0) > 0) {
      e.hitFreezeMs -= dms;
      if (e.hitFreezeMs < 0) e.hitFreezeMs = 0;
    }

    const dx = px - e.x;
    const dy = py - e.y;
    const d  = Math.hypot(dx, dy) || 1;
    if ((e.hitFreezeMs ?? 0) <= 0) {
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
    }

    // 接触判定: 1 体でも触れたら 1 回被弾、 throttle 中はスキップ
    if (b.contactCooldownMs <= 0 && d < e.r + b.player.r) {
      // SPEC-011: state.buffs.dmgTakenMul (= Shield 系列) で被ダメ軽減
      const taken = e.dmg * (state.buffs?.dmgTakenMul ?? 1);
      const takenInt = Math.max(1, Math.round(taken));
      state.stats.hp -= takenInt;
      if (state.stats.hp < 0) state.stats.hp = 0;
      b.contactCooldownMs = CONTACT_COOLDOWN_MS;
      // SPEC-016: プレイヤー被弾も damage number で表示 (= 赤色)
      pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, takenInt, "#ff7676");
      // SPEC-009: HP 0 で Game Over (= 多重 trigger 防止は gameover.js 側で gate)
      if (state.stats.hp <= 0 && !b.gameOver) {
        triggerGameOver();
      }
    }
  }
}

/**
 * viewport 外周のランダム位置に 1 体スポーン。
 * camera ではなく player 中心 + viewport サイズ / 2 + マージンの楕円リング上。
 */
export function spawnEnemyAtRing() {
  const b = state.battle;
  const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
  const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
  const angle = Math.random() * Math.PI * 2;
  const x = b.player.x + Math.cos(angle) * halfW;
  const y = b.player.y + Math.sin(angle) * halfH;
  b.enemies.push({
    id: b.nextEntityId++,
    x, y, r: ENEMY_RADIUS,
    hp: ENEMY_HP_INITIAL, hpMax: ENEMY_HP_INITIAL,
    dmg: ENEMY_DMG,
    speed: ENEMY_SPEED_PX_S,
    color: ENEMY_COLOR,
    hitFreezeMs: 0,   // SPEC-016: 被弾時 100ms 停止用
  });
}
