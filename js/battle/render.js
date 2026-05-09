// ============================================================
// battle/render.js — clear + grid + projectiles + gems + enemies + player
// (= SPEC-006 / SPEC-007 / SPEC-008)
// ============================================================

import { state } from "../state.js";
import { BATTLE_GRID_SIZE } from "../constants.js";

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提。
 */
export function renderBattle(ctx) {
  const { player, camera, viewport, enemies, gems, projectiles } = state.battle;
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // 背景
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);

  // グリッド
  _drawGrid(ctx, camera, w, h);

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

  // projectiles (= 投射体、 SPEC-008、 enemy/player の前に描く)
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx + p.r < 0 || sx - p.r > w || sy + p.r < 0 || sy - p.r > h) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();
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
