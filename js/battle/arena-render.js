// ============================================================
// battle/arena-render.js — ボス戦の枠とボスの出る場所の描画 (= SPEC-079)
// ============================================================
//
// - 予告のあいだ: ボスの出る場所 (= ステージの真ん中) に赤い丸。 これから閉じる枠を点線で。 画面の外なら縁に赤い矢印
// - ボス戦: 枠の外を暗くし、 枠の縁を赤く光らせる (= 閉じてくる動きもこの縁で見える)

import { state } from "../state.js";
import { ENEMY_SPECS, STAGE_TABLE, BOSS_CHAR_SCALE } from "../constants.js";
import { bossSpawnAtMs, bossWarnLeadMs } from "../easy.js";   // SPEC-147: EASY は短い
import { ARENA, BOSS_SPAWN_POS, currentBounds } from "./arena.js";

/** 予告のあいだか (= 純関数) */
export function bossMarkerActive(elapsedMs, bossSpawned, bossAt = bossSpawnAtMs(), lead = bossWarnLeadMs()) {
  return !bossSpawned && elapsedMs >= bossAt - lead && elapsedMs < bossAt;
}

function _bossRadius() {
  const stage = STAGE_TABLE[state.currentStageIdx ?? 0];
  const spec = ENEMY_SPECS[stage?.bossEnemyId];
  return Math.round((spec?.radius ?? 48) * BOSS_CHAR_SCALE);
}

/** 世界の層 (= 建物の上、 敵の下) */
export function renderArenaWorld(ctx, camera, w, h, nowMs) {
  const b = state.battle;
  if (bossMarkerActive(b.stageElapsedMs, b.bossSpawned)) _drawMarker(ctx, camera, nowMs);
  if (b.arena) _drawArena(ctx, camera, w, h, nowMs);
}

function _drawMarker(ctx, camera, nowMs) {
  const sx = BOSS_SPAWN_POS.x - camera.x, sy = BOSS_SPAWN_POS.y - camera.y;
  const r = _bossRadius();
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 160);
  ctx.save();
  // これから閉じる枠 (= 点線)
  ctx.globalAlpha = 0.35 + 0.2 * pulse;
  ctx.strokeStyle = "#ff5a6a";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(-ARENA.halfW - camera.x, -ARENA.halfH - camera.y, ARENA.halfW * 2, ARENA.halfH * 2);
  ctx.setLineDash([]);
  // 赤い丸 (= 中が脈打ち、 外の点線の輪が回る)
  ctx.globalAlpha = 0.16 + 0.16 * pulse;
  ctx.fillStyle = "#ff3048";
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ff3048";
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -nowMs / 30;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(sx, sy, r + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 照準の十字
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(sx + dx * (r * 0.35), sy + dy * (r * 0.35));
    ctx.lineTo(sx + dx * (r * 0.75), sy + dy * (r * 0.75));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffd0d6";
  ctx.font = "700 14px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("BOSS", sx, sy - r - 16);
  ctx.restore();
}

function _drawArena(ctx, camera, w, h, nowMs) {
  const bd = currentBounds();
  const x = bd.minX - camera.x, y = bd.minY - camera.y;
  const aw = bd.maxX - bd.minX, ah = bd.maxY - bd.minY;
  ctx.save();
  // 枠の外を暗く (= 偶奇の塗り)
  ctx.fillStyle = "rgba(6, 3, 12, 0.66)";
  ctx.beginPath();
  ctx.rect(-40, -40, w + 80, h + 80);
  ctx.rect(x, y, aw, ah);
  ctx.fill("evenodd");
  // 枠の縁 (= 赤く脈打つ太い線と、 内側の細い白い線)
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(nowMs / 260));
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "#ff3048";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, aw, ah);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#ffe0e4";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, aw - 8, ah - 8);
  // 角の括弧 (= 端末の選択枠)
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ff8090";
  ctx.lineWidth = 3;
  const k = 26;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + aw, y, -1, 1], [x, y + ah, 1, -1], [x + aw, y + ah, -1, -1]]) {
    ctx.moveTo(cx + sx * k, cy - sy * 6);
    ctx.lineTo(cx - sx * 6, cy - sy * 6);
    ctx.lineTo(cx - sx * 6, cy + sy * k);
  }
  ctx.stroke();
  ctx.restore();
}

/** 画面の層: 予告のあいだ、 ボスの出る場所が画面の外なら縁に赤い矢印 */
export function renderBossMarkerPointer(ctx, camera, w, h) {
  const b = state.battle;
  if (!bossMarkerActive(b.stageElapsedMs, b.bossSpawned)) return;
  const sx = BOSS_SPAWN_POS.x - camera.x, sy = BOSS_SPAWN_POS.y - camera.y;
  if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) return;
  const cx = w / 2, cy = h / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const m = 22;
  const kx = Math.abs(Math.cos(a)) > 1e-6 ? (w / 2 - m) / Math.abs(Math.cos(a)) : Infinity;
  const ky = Math.abs(Math.sin(a)) > 1e-6 ? (h / 2 - m) / Math.abs(Math.sin(a)) : Infinity;
  const kk = Math.min(kx, ky);
  ctx.save();
  ctx.translate(cx + Math.cos(a) * kk, cy + Math.sin(a) * kk);
  ctx.rotate(a);
  ctx.fillStyle = "#ff3048";
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
