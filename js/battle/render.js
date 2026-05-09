// ============================================================
// battle/render.js — clear + grid + bombs + beams + projectiles + gems + enemies + orbits + player
// (= SPEC-006 / SPEC-007 / SPEC-008 / SPEC-010 / SPEC-012)
// ============================================================

import { state } from "../state.js";
import { BATTLE_GRID_SIZE } from "../constants.js";
import { drawSpriteCircular } from "./sprites.js";

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提。
 */
export function renderBattle(ctx) {
  const { player, camera, viewport, enemies, gems, projectiles, orbits, beams, bombs } = state.battle;
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // 背景
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);

  // グリッド
  _drawGrid(ctx, camera, w, h);

  // SPEC-012: bombs (= 円 + fuseMs 残り少なくなったら点滅)
  for (const b of bombs) {
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const R = b.radius;
    if (sx + R < 0 || sx - R > w || sy + R < 0 || sy - R > h) continue;
    const t = b.age / b.fuseMs;
    const blink = t > 0.7 ? 0.4 + 0.6 * Math.abs(Math.sin(b.age / 60)) : 0.6;
    ctx.globalAlpha = blink;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // SPEC-012: beams (= 太い線、 age で alpha fade out)
  for (const beam of beams) {
    const sx0 = beam.x - camera.x;
    const sy0 = beam.y - camera.y;
    const sx1 = sx0 + beam.dirX * beam.len;
    const sy1 = sy0 + beam.dirY * beam.len;
    const t = beam.age / beam.life;
    ctx.globalAlpha = Math.max(0.25, 1 - t);
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
    // 薄いコアグロー
    ctx.globalAlpha = Math.max(0.15, 0.6 - t);
    ctx.lineWidth = beam.thick * 2;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
  }

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

  // projectiles (= 投射体、 enemy/player の前に描く)
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx + p.r < 0 || sx - p.r > w || sy + p.r < 0 || sy - p.r > h) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();
    if (p.r >= 10) {
      // 大型弾は外周線で見やすく
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // SPEC-010: enemies (sprite で円形クリップ、 fallback は単色円)
  const enemySprite = state.battle.defaultEnemySprite;
  for (const e of enemies) {
    const sx = e.x - camera.x;
    const sy = e.y - camera.y;
    if (sx + e.r < 0 || sx - e.r > w || sy + e.r < 0 || sy - e.r > h) continue;
    const drew = drawSpriteCircular(ctx, enemySprite, sx, sy, e.r);
    if (!drew) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // SPEC-012: orbits (= Book 系は円、 Blade 系は短い長方形を angle で回転)
  for (const o of orbits) {
    const sx = (o.x ?? player.x + Math.cos(o.angle) * o.r) - camera.x;
    const sy = (o.y ?? player.y + Math.sin(o.angle) * o.r) - camera.y;
    const rad = o.radius ?? 10;
    if (sx + rad < 0 || sx - rad > w || sy + rad < 0 || sy - rad > h) continue;
    if (o.kind === "orbitClose") {
      // Blade: 細い長方形を angle 方向に
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(o.angle);
      ctx.fillStyle = o.color;
      ctx.fillRect(-rad, -2, rad * 2, 4);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-rad, -2, rad * 2, 4);
      ctx.restore();
    } else {
      // Book: 円
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // SPEC-010: player (sprite で円形クリップ、 fallback は単色円)
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const drewPlayer = drawSpriteCircular(ctx, state.battle.playerSprite, px, py, player.r);
  if (!drewPlayer) {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, py, player.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, player.r, 0, Math.PI * 2);
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
