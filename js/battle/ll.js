// ============================================================
// battle/ll.js — LL 武器の追加の効き目 (= SPEC-101)
// ============================================================
//
// LL の数値 (= 弾の数・ダメージ・貫通・大きさ) は data/extensions.json の ll.params で決まり、
// 型ごとの撃ち方は archetypes.js のまま。 ここは型の外にある追加の効き目だけ:
//   novaEveryMs   — 真・MCHブレード: 間隔ごとに、 周り一帯 (= novaR) の敵すべてへ一撃
//   thunderEveryMs — 真・ミョルニル: 間隔ごとに、 近くの敵 (= thunderR 以内) へ雷を thunderCount 本
// (= 真・絶対零度ゴールデンスノーマンの「凍る」は archetypes.js の爆弾が持つ)

import { state } from "../state.js";

/** 近い順に count 体 (= 純関数。 壺は狙わない) */
export function nearestEnemies(enemies, x, y, r, count) {
  return enemies
    .filter((e) => !e.isProp && Math.hypot(e.x - x, e.y - y) <= r)
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
    .slice(0, count);
}

/** 毎フレーム (= battle/index.js)。 hitEnemy は damage.js のもの */
export function tickLLExtras(dt, hitEnemy) {
  const b = state.battle;
  if (!b?.weapons) return;
  b.llFx ??= [];
  for (let i = b.llFx.length - 1; i >= 0; i--) { b.llFx[i].age += dt; if (b.llFx[i].age >= b.llFx[i].life) b.llFx.splice(i, 1); }
  const p = b.player;
  const dmgMul = (state.buffs?.dmgMul ?? 1) * (b.heroDmgMul ?? 1);
  for (const w of b.weapons) {
    if (!w.isLL) continue;
    const prm = w.params ?? {};
    w.llT = (w.llT ?? 0) + dt * 1000;
    if (prm.novaEveryMs && w.llT >= prm.novaEveryMs) {
      w.llT = 0;
      for (let j = b.enemies.length - 1; j >= 0; j--) {
        const e = b.enemies[j];
        if (!e.isProp && Math.hypot(e.x - p.x, e.y - p.y) <= prm.novaR) hitEnemy(j, prm.novaDmg * dmgMul);
      }
      b.llFx.push({ kind: "nova", x: p.x, y: p.y, r: prm.novaR, age: 0, life: 0.5 });
    }
    if (prm.thunderEveryMs && w.llT >= prm.thunderEveryMs) {
      w.llT = 0;
      for (const e of nearestEnemies(b.enemies, p.x, p.y, prm.thunderR, prm.thunderCount)) {
        b.llFx.push({ kind: "thunder", x: e.x, y: e.y, age: 0, life: 0.3 });
        const j = b.enemies.indexOf(e);
        if (j >= 0) hitEnemy(j, prm.thunderDmg * dmgMul);
      }
    }
  }
}

/** 戦場に描く (= render.js) */
export function renderLLWorld(ctx, camera) {
  const fx = state.battle?.llFx;
  if (!fx?.length) return;
  for (const f of fx) {
    const k = f.age / f.life;
    const sx = f.x - camera.x, sy = f.y - camera.y;
    if (f.kind === "nova") {
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 14 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(sx, sy, f.r * (0.2 + 0.8 * k), 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === "thunder") {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#cfe9ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy - 260);
      ctx.lineTo(sx - 8, sy - 150);
      ctx.lineTo(sx + 6, sy - 80);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
