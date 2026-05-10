// ============================================================
// battle/boss-attack.js — ステージ別ボスの攻撃挙動 (= SPEC-030)
// ============================================================
//
// stage.bossAttack:
//   "fao"   — Axe 風: 周期的にランダム放射 N 発、 アイコン = ext 5055 (とっておきのフルーツパフェ)
//   "yamap" — Blade 風: ボスを中心に 8 個の高速周回、 アイコン = ext 5002 (グランダルメ)
//
// 投射体は state.battle.bossProjectiles、 周回は state.battle.bossOrbits に格納。
// 共に player と接触したら接触ダメージ throttle を共有 (= contactCooldownMs)。
// ボスが死亡 (= state.battle.enemies から消える) したら関連エンティティも掃除する。

import { state } from "../state.js";
import {
  CONTACT_COOLDOWN_MS,
  FAO_FIRE_INTERVAL_MS, FAO_BULLETS,
  FAO_PROJ_SPEED_PX_S, FAO_PROJ_DMG, FAO_PROJ_LIFE_MS,
  FAO_PROJ_R, FAO_PROJ_ICON_SIZE,
  YAMAP_ORBIT_COUNT, YAMAP_ORBIT_RADIUS, YAMAP_ORBIT_HIT_R,
  YAMAP_ORBIT_DMG, YAMAP_ORBIT_ANG_SPEED, YAMAP_ORBIT_ICON_SIZE,
  YAMAP_ORBIT_HIT_COOLDOWN_MS,
  SFX,
} from "../constants.js";
import { pushDamageNumber } from "./damage.js";
import { triggerGameOver } from "./gameover.js";
import { playSe } from "../audio.js";

/**
 * 1 frame: 各ボス (= state.battle.enemies の isBoss=true) の攻撃を更新。
 * 死亡したボスに紐づくエンティティは掃除する。
 */
export function tickBossAttack(dt, nowMs) {
  const b = state.battle;
  // 生存ボスのリスト
  const liveBosses = b.enemies.filter(e => e.isBoss);

  // ファオ: 周期的に bossProjectiles を spawn
  for (const boss of liveBosses) {
    if (boss.bossAttack === "fao") _tickFaoFire(boss, nowMs);
  }

  // yamap: ボス周りに常時 8 個の orbit を維持 + 角度更新
  _tickYamapOrbits(liveBosses, dt);

  // 投射体の移動 + 寿命
  _tickBossProjectiles(dt);

  // プレイヤー衝突 (= contactCooldownMs throttle を共有)
  _tickPlayerCollision(nowMs);

  // 死亡ボスに紐づくエンティティを掃除
  _purgeOrphanedEntities(liveBosses);
}

function _tickFaoFire(boss, nowMs) {
  const last = boss._lastFaoFireMs ?? 0;
  if (nowMs - last < FAO_FIRE_INTERVAL_MS) return;
  boss._lastFaoFireMs = nowMs;
  const b = state.battle;
  for (let i = 0; i < FAO_BULLETS; i++) {
    const a = (Math.PI * 2 * i) / FAO_BULLETS + Math.random() * 0.4 - 0.2;
    b.bossProjectiles.push({
      id: b.nextEntityId++,
      bossId: boss.id,
      x: boss.x, y: boss.y,
      vx: Math.cos(a) * FAO_PROJ_SPEED_PX_S,
      vy: Math.sin(a) * FAO_PROJ_SPEED_PX_S,
      r: FAO_PROJ_R,
      dmg: FAO_PROJ_DMG,
      life: FAO_PROJ_LIFE_MS,
      age: 0,
      iconId: boss.bossAttackExtId ?? 5055,
      iconSize: FAO_PROJ_ICON_SIZE,
    });
  }
}

function _tickYamapOrbits(liveBosses, dt) {
  const b = state.battle;
  // ボスごとに orbit を維持
  for (const boss of liveBosses) {
    if (boss.bossAttack !== "yamap") continue;
    let owned = b.bossOrbits.filter(o => o.bossId === boss.id);
    if (owned.length < YAMAP_ORBIT_COUNT) {
      while (owned.length < YAMAP_ORBIT_COUNT) {
        b.bossOrbits.push({
          id: b.nextEntityId++,
          bossId: boss.id,
          angle: 0,
          r: YAMAP_ORBIT_RADIUS,
          dmg: YAMAP_ORBIT_DMG,
          iconId: boss.bossAttackExtId ?? 5002,
          iconSize: YAMAP_ORBIT_ICON_SIZE,
          hitR: YAMAP_ORBIT_HIT_R,
          lastHitMs: 0,
          x: boss.x, y: boss.y,
        });
        owned = b.bossOrbits.filter(o => o.bossId === boss.id);
      }
      // 等間隔再配置
      const step = (Math.PI * 2) / owned.length;
      for (let i = 0; i < owned.length; i++) owned[i].angle = step * i;
    }
    // 角度更新 + 位置追従
    for (const o of owned) {
      o.angle += YAMAP_ORBIT_ANG_SPEED * dt;
      o.x = boss.x + Math.cos(o.angle) * o.r;
      o.y = boss.y + Math.sin(o.angle) * o.r;
    }
  }
}

function _tickBossProjectiles(dt) {
  const b = state.battle;
  const dms = dt * 1000;
  for (let i = b.bossProjectiles.length - 1; i >= 0; i--) {
    const p = b.bossProjectiles[i];
    p.age += dms;
    if (p.age >= p.life) { b.bossProjectiles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function _tickPlayerCollision(nowMs) {
  const b = state.battle;
  if (b.gameOver) return;
  const px = b.player.x;
  const py = b.player.y;
  const pr = b.player.r;

  const applyDmg = (rawDmg) => {
    if (b.contactCooldownMs > 0) return;
    const taken = Math.max(1, Math.round(rawDmg * (state.buffs?.dmgTakenMul ?? 1)));
    state.stats.hp -= taken;
    if (state.stats.hp < 0) state.stats.hp = 0;
    b.contactCooldownMs = CONTACT_COOLDOWN_MS;
    pushDamageNumber(px, py - pr - 4, taken, "#ff7676");
    playSe(SFX.PLAYER_DAMAGED, 200, 0.55);
    if (state.stats.hp <= 0 && !b.gameOver) triggerGameOver();
  };

  // ファオ projectile (= 当たって消える)
  for (let i = b.bossProjectiles.length - 1; i >= 0; i--) {
    const p = b.bossProjectiles[i];
    const dx = p.x - px, dy = p.y - py;
    const sumR = p.r + pr;
    if (dx * dx + dy * dy > sumR * sumR) continue;
    applyDmg(p.dmg);
    b.bossProjectiles.splice(i, 1);
  }

  // yamap orbit (= 当たっても消えない、 個別に hit cooldown)
  for (const o of b.bossOrbits) {
    const dx = o.x - px, dy = o.y - py;
    const sumR = (o.hitR ?? 12) + pr;
    if (dx * dx + dy * dy > sumR * sumR) continue;
    if (nowMs - (o.lastHitMs ?? 0) < YAMAP_ORBIT_HIT_COOLDOWN_MS) continue;
    o.lastHitMs = nowMs;
    applyDmg(o.dmg);
  }
}

function _purgeOrphanedEntities(liveBosses) {
  const b = state.battle;
  const liveIds = new Set(liveBosses.map(e => e.id));
  for (let i = b.bossProjectiles.length - 1; i >= 0; i--) {
    if (!liveIds.has(b.bossProjectiles[i].bossId)) b.bossProjectiles.splice(i, 1);
  }
  for (let i = b.bossOrbits.length - 1; i >= 0; i--) {
    if (!liveIds.has(b.bossOrbits[i].bossId)) b.bossOrbits.splice(i, 1);
  }
}
