// ============================================================
// battle/projectiles.js — 投射体の移動 + 衝突 + 寿命 (= SPEC-008 / SPEC-015)
// ============================================================

import { state } from "../state.js";
import { hitEnemy } from "./damage.js";

export function tickProjectiles(dt) {
  const b = state.battle;
  const dms = dt * 1000;

  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const p = b.projectiles[i];

    // SPEC-015: Moai 弾は target enemy の x に追従しながら落下
    if (p.kind === "moaiDrop" && p.moaiTargetId != null) {
      const t = b.enemies.find(e => e.id === p.moaiTargetId);
      if (t) {
        p.x = t.x;   // 水平追従 (= y は通常落下)
      } else {
        p.moaiTargetId = null;   // target 消失 → 追従解除、 直進落下継続
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dms;

    if (p.age >= p.life) {
      // SPEC-015: Moai 弾は寿命切れ時にも衝撃波を出す (= 着弾失敗の救済)
      if (p.kind === "moaiDrop" && p.moaiAoeR > 0) {
        _spawnMoaiShockwave(p);
      }
      b.projectiles.splice(i, 1);
      continue;
    }

    // 敵衝突。 SPEC-031: pierceLeft が 0 なら単発消滅、 > 0 なら同 frame で複数体ヒット可。
    // p.hitIds で同 frame / 同弾内の重複ヒットを防ぐ。
    // SPEC-016: hitEnemy 経由で 数字 + freeze。
    let despawn = false;
    let dropShockwave = false;
    for (let j = b.enemies.length - 1; j >= 0; j--) {
      const e = b.enemies[j];
      if (p.hitIds && p.hitIds.has(e.id)) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const sumR = e.r + p.r;
      if (dx * dx + dy * dy > sumR * sumR) continue;
      hitEnemy(j, p.dmg);
      if (!p.hitIds) p.hitIds = new Set();
      p.hitIds.add(e.id);
      if ((p.pierceLeft ?? 0) <= 0) {
        despawn = true;
        if (p.kind === "moaiDrop" && p.moaiAoeR > 0) dropShockwave = true;
        break;
      }
      p.pierceLeft -= 1;
      // 残 pierce > 0 → 続けて他の敵もチェック (= 重なって並ぶ群を 1 frame で抜ける)
    }
    if (despawn) {
      if (dropShockwave) _spawnMoaiShockwave(p);
      b.projectiles.splice(i, 1);
    }
  }
}

function _spawnMoaiShockwave(p) {
  state.battle.shockwaves.push({
    id: state.battle.nextEntityId++,
    x: p.x, y: p.y,
    r0: 0, r1: p.moaiAoeR,
    age: 0, life: 350,
    dmg: Math.max(1, Math.round(p.moaiAoeDmg ?? p.dmg)),
    color: "#ffffff",
    hitSet: new Set(),
  });
}
