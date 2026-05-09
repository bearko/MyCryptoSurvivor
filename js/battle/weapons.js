// ============================================================
// battle/weapons.js — extension 由来の自動発射ホーミング投射体 (= SPEC-008)
// ============================================================
//
// SPEC-007 の hardcoded shockwave は SPEC-008 で完全撤去。
// 各 weapon は cdMs ごとに range 内の最寄り敵を狙って 1 発 spawn。

import { state } from "../state.js";
import { PROJECTILE_RADIUS, PROJECTILE_LIFE_MS } from "../constants.js";

export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  const px = b.player.x, py = b.player.y;
  for (const w of b.weapons) {
    if (nowMs - w.lastFireMs < w.cdMs) continue;
    const target = _findNearestEnemy(px, py, w.range);
    if (!target) continue;
    w.lastFireMs = nowMs;
    _spawnProjectile(px, py, target, w);
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

function _spawnProjectile(x, y, target, w) {
  const dx = target.x - x, dy = target.y - y;
  const d  = Math.hypot(dx, dy) || 1;
  const speed = w.speedPx;
  state.battle.projectiles.push({
    id: state.battle.nextEntityId++,
    x, y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    r: PROJECTILE_RADIUS,
    dmg: w.dmg,
    color: w.color,
    life: PROJECTILE_LIFE_MS,
    age: 0,
  });
}
