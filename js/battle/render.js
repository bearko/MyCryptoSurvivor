// ============================================================
// battle/render.js — clear + 背景グリッド + プレイヤー描画 (= SPEC-006)
// ============================================================

import { state } from "../state.js";
import { BATTLE_GRID_SIZE } from "../constants.js";

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提 (= index.js が setTransform)。
 */
export function renderBattle(ctx) {
  const { player, camera, viewport } = state.battle;
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // 背景塗りつぶし
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);

  // 背景グリッド (= viewport 内のセルのみ)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  const G = BATTLE_GRID_SIZE;
  // camera.x / G の余りを使って、 「画面内の最初の縦線の x 座標」 を求める
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

  // プレイヤー (= world → screen 変換)
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
