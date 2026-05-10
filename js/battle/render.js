// ============================================================
// battle/render.js — clear + grid + bombs + beams + projectiles + gems + enemies + orbits + player
// (= SPEC-006 / SPEC-007 / SPEC-008 / SPEC-010 / SPEC-012)
// ============================================================

import { state } from "../state.js";
import {
  BATTLE_GRID_SIZE,
  HP_BAR_WIDTH, HP_BAR_HEIGHT,
  HP_BAR_PLAYER_WIDTH, HP_BAR_PLAYER_HEIGHT,
  DAMAGE_NUMBER_LIFE_MS,
} from "../constants.js";
import { drawSpriteCircular, drawSpriteRotated, getExtSprite, getGemSprite, getEnemySprite } from "./sprites.js";

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提。
 */
export function renderBattle(ctx) {
  const { player, camera, viewport, enemies, gems, projectiles, orbits, beams, bombs, shockwaves, damageNumbers } = state.battle;
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // 背景
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);

  // グリッド
  _drawGrid(ctx, camera, w, h);

  // SPEC-012 / SPEC-015: bombs (= icon 描画 + 残時間 70% 超で点滅、 AoE 範囲を線で示唆)
  for (const b of bombs) {
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const R = b.radius;
    if (sx + R < 0 || sx - R > w || sy + R < 0 || sy - R > h) continue;
    const t = b.age / b.fuseMs;
    const blink = t > 0.7 ? 0.4 + 0.6 * Math.abs(Math.sin(b.age / 60)) : 0.85;
    ctx.globalAlpha = blink;
    let drew = false;
    if (b.iconId != null) {
      drew = drawSpriteRotated(ctx, getExtSprite(b.iconId), sx, sy, 26, 0);
    }
    if (!drew) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // gems (= SPEC-019: MCH の CE icon、 fallback で従来の黄ダイヤ)
  const gemSprite = getGemSprite();
  for (const g of gems) {
    const sx = g.x - camera.x;
    const sy = g.y - camera.y;
    const drawR = g.r * 1.6;   // ce.png は丸い MCH エンブレム、 ダイヤより大きめに
    if (sx < -drawR || sx > w + drawR || sy < -drawR || sy > h + drawR) continue;
    const drew = drawSpriteCircular(ctx, gemSprite, sx, sy, drawR);
    if (!drew) {
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
  }

  // SPEC-015: projectiles を extension icon で描画 (= 進行方向に rotate、 系列ごと iconRotOffset)
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    const halfSize = (p.iconSize ?? 18) / 2;
    if (sx + halfSize < 0 || sx - halfSize > w || sy + halfSize < 0 || sy - halfSize > h) continue;
    let drew = false;
    if (p.iconId != null) {
      const sp = getExtSprite(p.iconId);
      const angle = Math.atan2(p.vy, p.vx) + (p.iconRotOffset ?? 0);
      drew = drawSpriteRotated(ctx, sp, sx, sy, p.iconSize ?? 18, angle);
    }
    if (!drew) {
      // fallback: 単色円
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.r >= 10) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // SPEC-015: shockwaves (= Moai 着弾の AoE ring、 r0 → r1 に成長、 alpha fade)
  for (const s of shockwaves) {
    const sx = s.x - camera.x;
    const sy = s.y - camera.y;
    const t = s.age / s.life;
    const r = s.r0 + (s.r1 - s.r0) * t;
    if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    // 内側のソフトリング
    ctx.globalAlpha = Math.max(0, 0.5 - t * 0.5);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // SPEC-010: enemies (sprite で円形クリップ、 fallback は単色円)
  // SPEC-016: アイコン下に HP バー (= 満タン非表示)
  // SPEC-022: enemyId 別 sprite を引き当て、 fallback で default
  for (const e of enemies) {
    const sx = e.x - camera.x;
    const sy = e.y - camera.y;
    if (sx + e.r < 0 || sx - e.r > w || sy + e.r < 0 || sy - e.r > h) continue;
    const sp = (e.enemyId != null)
      ? (getEnemySprite(e.enemyId) || state.battle.defaultEnemySprite)
      : state.battle.defaultEnemySprite;
    const drew = drawSpriteCircular(ctx, sp, sx, sy, e.r);
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
    // HP バー (= 満タン以外で表示)
    if (e.hp < e.hpMax) {
      _drawHpBar(ctx, sx, sy + e.r + 4, HP_BAR_WIDTH, HP_BAR_HEIGHT, e.hp / e.hpMax);
    }
  }

  // SPEC-012 / SPEC-015: orbits (= Book / Blade、 icon を公転接線方向に回転して描画)
  for (const o of orbits) {
    const sx = (o.x ?? player.x + Math.cos(o.angle) * o.r) - camera.x;
    const sy = (o.y ?? player.y + Math.sin(o.angle) * o.r) - camera.y;
    const sz = o.iconSize ?? 22;
    if (sx + sz < 0 || sx - sz > w || sy + sz < 0 || sy - sz > h) continue;
    let drew = false;
    if (o.iconId != null) {
      // 公転接線方向 = angle + π/2 (= 進行方向を向く)
      const angle = o.angle + Math.PI / 2;
      drew = drawSpriteRotated(ctx, getExtSprite(o.iconId), sx, sy, sz, angle);
    }
    if (!drew) {
      // fallback (= 既存の単色円 / 棒)
      const rad = o.radius ?? 10;
      if (o.kind === "orbitClose") {
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
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
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
  // SPEC-016: プレイヤー HP バー (= 満タン以外)
  if (state.stats.hp < state.statsMax.hp) {
    _drawHpBar(ctx, px, py + player.r + 5,
               HP_BAR_PLAYER_WIDTH, HP_BAR_PLAYER_HEIGHT,
               state.stats.hp / state.statsMax.hp);
  }

  // SPEC-016: ダメージ数字 floater (= 一番上の layer)
  ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const d of damageNumbers) {
    const dx = d.x - camera.x;
    const dy = d.y - camera.y;
    if (dx < -40 || dx > w + 40 || dy < -40 || dy > h + 40) continue;
    const t = d.age / d.life;
    const a = Math.max(0, 1 - t);
    ctx.globalAlpha = a;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeText(d.value, dx, dy);
    ctx.fillStyle = d.color;
    ctx.fillText(d.value, dx, dy);
  }
  ctx.globalAlpha = 1;
}

/**
 * SPEC-016: HP バー描画 (= ratio 0..1)。 cx は中央 x、 cy は上端 y。
 * 緑 / 黄 / 赤の 3 段階で 「あと何発で倒せるか」 を直感的に。
 */
function _drawHpBar(ctx, cx, cy, w, h, ratio) {
  const r = Math.max(0, Math.min(1, ratio));
  const x = cx - w / 2;
  // 背景
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x - 1, cy - 1, w + 2, h + 2);
  // 残量
  let color = "#5ecf8a";    // 緑 (60% 超)
  if (r < 0.6) color = "#f0c14b";   // 黄 (60% 以下)
  if (r < 0.3) color = "#e76060";   // 赤 (30% 以下)
  ctx.fillStyle = color;
  ctx.fillRect(x, cy, w * r, h);
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
