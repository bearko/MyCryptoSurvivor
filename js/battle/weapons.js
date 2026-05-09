// ============================================================
// battle/weapons.js — extension 由来の自動発射ホーミング投射体 (= SPEC-008 / SPEC-011)
// ============================================================
//
// SPEC-007 の hardcoded shockwave は SPEC-008 で完全撤去。
// 各 weapon は cdMs ごとに range 内の最寄り敵を狙って 1 発 spawn。
// SPEC-011: state.buffs の cdMul / dmgMul を発射判定 / 投射体に反映。
// SPEC-012 で archetype 別挙動に分岐予定 (= 現状は全 archetype 単一 homing)。

import { state } from "../state.js";
import { PROJECTILE_RADIUS, PROJECTILE_LIFE_MS } from "../constants.js";

export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  const px = b.player.x, py = b.player.y;
  const cdMul  = state.buffs?.cdMul  ?? 1;
  const dmgMul = state.buffs?.dmgMul ?? 1;
  for (const w of b.weapons) {
    const effectiveCd = w.cdMs * cdMul;
    if (nowMs - w.lastFireMs < effectiveCd) continue;
    const target = _findNearestEnemy(px, py, w.range);
    if (!target) continue;
    w.lastFireMs = nowMs;
    _spawnProjectile(px, py, target, w, dmgMul);
  }
}

function _findNearestEnemy(px, py, range) {
  const arr = state.battle.enemies;
  let best = null;
  let bestD2 = range * range;
  for (const e of arr) {
    const dx = e.x - px, dy = e.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

function _spawnProjectile(x, y, target, w, dmgMul) {
  const dx = target.x - x, dy = target.y - y;
  const d  = Math.hypot(dx, dy) || 1;
  const speed = w.speedPx;
  state.battle.projectiles.push({
    id: state.battle.nextEntityId++,
    x, y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    r: PROJECTILE_RADIUS,
    dmg: Math.max(1, Math.round(w.dmg * (dmgMul ?? 1))),
    color: w.color,
    life: PROJECTILE_LIFE_MS,
    age: 0,
  });
}
