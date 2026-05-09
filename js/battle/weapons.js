// ============================================================
// battle/weapons.js — 仮 hardcoded shockwave 武器 (= SPEC-007)
// ============================================================
//
// SPEC-008 で extension 駆動に置き換える前提の placeholder。
// 1.0 sec ごとに player 周囲半径 80px に 10 dmg。

import { state } from "../state.js";
import { SHOCKWAVE_VISUAL_LIFE_MS, SHOCKWAVE_VISUAL_COLOR } from "../constants.js";
import { spawnGem } from "./gems.js";

export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  for (const w of b.weapons) {
    if (w.kind !== "shockwave") continue;
    if (nowMs - w.lastFireMs < w.cooldownMs) continue;
    w.lastFireMs = nowMs;
    fireShockwave(w);
  }
}

function fireShockwave(w) {
  const b = state.battle;
  const px = b.player.x;
  const py = b.player.y;

  // visual
  b.shockwaveAnims.push({
    x: px, y: py,
    r0: 0, r1: w.radius,
    age: 0, life: SHOCKWAVE_VISUAL_LIFE_MS,
    color: SHOCKWAVE_VISUAL_COLOR,
  });

  // damage (= 反復中 splice するので逆順走査)
  const r2 = w.radius * w.radius;
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e  = b.enemies[i];
    const dx = e.x - px;
    const dy = e.y - py;
    if (dx * dx + dy * dy <= r2) {
      e.hp -= w.dmg;
      if (e.hp <= 0) {
        spawnGem(e.x, e.y);
        b.enemies.splice(i, 1);
      }
    }
  }
}

/**
 * shockwave の視覚アニメ寿命管理。 age >= life で除去。
 */
export function tickShockwaveAnims(dt) {
  const arr = state.battle.shockwaveAnims;
  const dms = dt * 1000;
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].age += dms;
    if (arr[i].age >= arr[i].life) arr.splice(i, 1);
  }
}
