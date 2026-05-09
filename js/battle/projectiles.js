// ============================================================
// battle/projectiles.js — 投射体の移動 + 衝突 + 寿命 (= SPEC-008)
// ============================================================

import { state } from "../state.js";
import { spawnGem } from "./gems.js";

export function tickProjectiles(dt) {
  const b = state.battle;
  const dms = dt * 1000;

  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const p = b.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dms;

    if (p.age >= p.life) {
      b.projectiles.splice(i, 1);
      continue;
    }

    // 敵衝突 (= 単発命中で消滅、 pierce なし)
    let hit = false;
    for (let j = b.enemies.length - 1; j >= 0; j--) {
      const e = b.enemies[j];
      const dx = e.x - p.x, dy = e.y - p.y;
      const sumR = e.r + p.r;
      if (dx * dx + dy * dy <= sumR * sumR) {
        e.hp -= p.dmg;
        if (e.hp <= 0) {
          spawnGem(e.x, e.y);
          b.enemies.splice(j, 1);
        }
        hit = true;
        break;
      }
    }
    if (hit) b.projectiles.splice(i, 1);
  }
}
