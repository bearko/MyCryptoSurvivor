// ============================================================
// battle/enemies.js — 敵スポーン + 追跡 AI + 接触ダメージ
// (= SPEC-007 / SPEC-016 / SPEC-022 wave + boss / SPEC-030 stage 連動)
// ============================================================

import { state } from "../state.js";
import {
  ENEMY_SPAWN_INTERVAL_MS, ENEMY_SPAWN_MARGIN_PX,
  ENEMY_COLOR, MAX_ENEMIES,
  CONTACT_COOLDOWN_MS,
  STAGE_DURATION_MS, BOSS_SPAWN_AT_MS,
  WAVE_TABLE, ENEMY_SPECS, STAGE_TABLE,
  WORLD_W, WORLD_H,
  SFX,
} from "../constants.js";
import { triggerStageEndOrTransition } from "./stage-transition.js";
import { triggerGameOver } from "./gameover.js";
import { pushDamageNumber } from "./damage.js";
import { playSe } from "../audio.js";

const DEFAULT_SPEC = { hp: 25, dmg: 10, speed: 80, radius: 12, xpValue: 1 };

function _currentStage() {
  return STAGE_TABLE[state.currentStageIdx] ?? STAGE_TABLE[0];
}

/**
 * SPEC-022: stageElapsedMs から該当 wave の pool を返す (= 配列)
 */
function _currentPool(elapsedMs) {
  let pool = WAVE_TABLE[0].pool;
  for (const w of WAVE_TABLE) {
    if (elapsedMs >= w.fromMs) pool = w.pool;
  }
  return pool;
}

/**
 * 1 frame 分: stage 経過更新 → 必要ならスポーン → ボス trigger →
 * 全敵がプレイヤーに 1 step 接近 → 接触判定 → クリア判定
 */
export function tickEnemies(dt, nowMs) {
  const b = state.battle;
  const dms = dt * 1000;
  b.stageElapsedMs += dms;

  const stage = _currentStage();

  // SPEC-022 / SPEC-030: ボス時刻到達で 1 度だけスポーン (= ボス id はステージ別)
  if (!b.bossSpawned && b.stageElapsedMs >= BOSS_SPAWN_AT_MS) {
    spawnEnemyAtRing(stage.bossEnemyId);
    b.bossSpawned = true;
  }

  // SPEC-022 / SPEC-030: 5 分経過 or ボス撃破で **ステージ終了** (= 次ステージ or 全クリア)
  if (!b.gameOver && (b.bossDefeated || b.stageElapsedMs >= STAGE_DURATION_MS)) {
    triggerStageEndOrTransition();
    return;
  }

  // 通常 spawn (= wave pool からランダム、 ステージごと spawn 間隔 mul)
  const spawnInterval = ENEMY_SPAWN_INTERVAL_MS * (stage.spawnIntervalMul ?? 1);
  if (b.enemies.length < MAX_ENEMIES &&
      nowMs - b.lastEnemySpawnMs >= spawnInterval) {
    const pool = _currentPool(b.stageElapsedMs);
    const id = pool[Math.floor(Math.random() * pool.length)];
    spawnEnemyAtRing(id);
    b.lastEnemySpawnMs = nowMs;
  }

  const px = b.player.x;
  const py = b.player.y;

  for (const e of b.enemies) {
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

    if (b.contactCooldownMs <= 0 && d < e.r + b.player.r) {
      const taken = e.dmg * (state.buffs?.dmgTakenMul ?? 1);
      const takenInt = Math.max(1, Math.round(taken));
      state.stats.hp -= takenInt;
      if (state.stats.hp < 0) state.stats.hp = 0;
      b.contactCooldownMs = CONTACT_COOLDOWN_MS;
      pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, takenInt, "#ff7676");
      playSe(SFX.PLAYER_DAMAGED, 200, 0.55);
      if (state.stats.hp <= 0 && !b.gameOver) {
        triggerGameOver();
      }
    }
  }
}

/**
 * SPEC-022 / SPEC-030: enemyId 指定でスポーン。 雑魚はステージ mul を hp/dmg/xp に適用、
 * ボス (= 任意 isBoss) は ENEMY_SPECS の絶対値 + ステージ別の bossAttack を持たせる。
 */
export function spawnEnemyAtRing(enemyId = 101) {
  const b = state.battle;
  const stage = _currentStage();
  const spec = ENEMY_SPECS[enemyId] ?? DEFAULT_SPEC;
  const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
  const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
  const isBoss = enemyId === stage.bossEnemyId;

  let x, y;
  if (isBoss) {
    x = b.player.x;
    y = b.player.y - halfH;   // 上から登場
  } else {
    const angle = Math.random() * Math.PI * 2;
    x = b.player.x + Math.cos(angle) * halfW;
    y = b.player.y + Math.sin(angle) * halfH;
  }
  // SPEC-026: 世界端でクランプ (= 半径分だけ内側に収める)
  const r = spec.radius;
  const HW = WORLD_W / 2 - r;
  const HH = WORLD_H / 2 - r;
  if (x < -HW) x = -HW;
  if (x >  HW) x =  HW;
  if (y < -HH) y = -HH;
  if (y >  HH) y =  HH;

  // SPEC-030: 雑魚はステージ mul で強化、 ボス は絶対値 (= ENEMY_SPECS そのまま)
  const hpMul  = isBoss ? 1 : (stage.enemyHpMul  ?? 1);
  const dmgMul = isBoss ? 1 : (stage.enemyDmgMul ?? 1);
  const xpMul  = isBoss ? 1 : (stage.xpMul       ?? 1);

  const hp     = Math.max(1, Math.round(spec.hp  * hpMul));
  const dmg    = Math.max(1, Math.round(spec.dmg * dmgMul));
  const xpVal  = Math.max(1, Math.round((spec.xpValue ?? 1) * xpMul));

  b.enemies.push({
    id: b.nextEntityId++,
    enemyId,
    x, y,
    r: spec.radius,
    hp, hpMax: hp,
    dmg,
    speed: spec.speed,
    color: ENEMY_COLOR,
    hitFreezeMs: 0,
    isBoss,
    xpValue: xpVal,
    bossAttack: isBoss ? (stage.bossAttack ?? null) : null,        // SPEC-030
    bossAttackExtId: isBoss ? (stage.bossAttackExtId ?? null) : null,
  });
}
