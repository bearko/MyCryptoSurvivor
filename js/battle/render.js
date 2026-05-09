// ============================================================
// battle/render.js — clear + grid + shockwave + gems + enemies + player
// (= SPEC-006 / SPEC-007)
// ============================================================

import { state } from "../state.js";
import { BATTLE_GRID_SIZE } from "../constants.js";

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提。
 */
export function renderBattle(ctx) {
  const { player, camera, viewport, enemies, gems, shockwaveAnims } = state.battle;
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // 背景
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);

  // グリッド
  _drawGrid(ctx, camera, w, h);

  // shockwave (= 後ろから順に: anim → gem → enemy → player)
  for (const a of shockwaveAnims) {
    const t  = Math.min(1, a.age / a.life);
    const r  = a.r0 + (a.r1 - a.r0) * t;
    const sx = a.x - camera.x;
    const sy = a.y - camera.y;
    if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // gems (= 黄ダイヤ = 45 度回転正方形)
  for (const g of gems) {
    const sx = g.x - camera.x;
    const sy = g.y - camera.y;
    if (sx < -g.r || sx > w + g.r || sy < -g.r || sy > h + g.r) continue;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(sx,        sy - g.r);
    ctx.lineTo(sx + g.r,  sy);
    ctx.lineTo(sx,        sy + g.r);
    ctx.lineTo(sx - g.r,  sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // enemies
  for (const e of enemies) {
    const sx = e.x - camera.x;
    const sy = e.y - camera.y;
    if (sx + e.r < 0 || sx - e.r > w || sy + e.r < 0 || sy - e.r > h) continue;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // player
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(px, py, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function _drawGrid(ctx, camera, w, h) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  const G = BATTLE_GRID_SIZE;
  const startX = -(((camera.x % G) + G) % G);
  const startY = -(((camera.y % G) + G) % G);
  ctx.beginPath();
  for (let x = startX; x < w; x += G) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = startY; y < h; y += G) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}
