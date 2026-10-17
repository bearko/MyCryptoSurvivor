// ============================================================
// battle/gimmicks-render.js — ステージの仕掛けの描画 (= SPEC-064)
// ============================================================
//
// - 下の層 (= 敵より下): 珠の列の予告の線とレール、 パンチの印と穴
// - 上の層 (= 敵より上): 珠
// - 木馬: 敵の層で、 絵 (= 素材のエクステンション 5179) と開くまでの輪・残り秒
// 予告は点滅させて、 いつ・どこに来るかを先に見せる。

import { state } from "../state.js";
import { BEADS, PUNCH, TROJAN, TROJAN_EXT_ID, beadLead, beadX, trojanSecLeft } from "./gimmicks.js";
import { getExtSprite, drawSpriteRotated } from "./sprites.js";

/** 敵より下: 珠の列の予告とレール・パンチの印と穴 */
export function renderGimmicksUnder(ctx, camera, w, h, nowMs) {
  const g = state.battle.gimmick;
  if (!g) return;
  for (const row of g.rows) _drawRowRail(ctx, camera, w, row, nowMs);
  for (const pu of g.punches) _drawPunch(ctx, camera, w, h, pu, nowMs);
}

/** 敵より上: 珠 */
export function renderGimmicksOver(ctx, camera, w, h) {
  const g = state.battle.gimmick;
  if (!g) return;
  for (const row of g.rows) {
    if (row.t < BEADS.warnMs) continue;
    const lead = beadLead(row, row.t);
    const sy = row.y - camera.y;
    if (sy < -40 || sy > h + 40) continue;
    for (let i = 0; i < BEADS.count; i++) {
      const sx = beadX(lead, row.dir, i) - camera.x;
      if (sx < -40 || sx > w + 40) continue;
      _drawBead(ctx, sx, sy, BEADS.r);
    }
  }
}

function _drawRowRail(ctx, camera, w, row, nowMs) {
  const sy = row.y - camera.y;
  const xa = Math.min(row.x0, row.x1) - camera.x, xb = Math.max(row.x0, row.x1) - camera.x;
  ctx.save();
  if (row.t < BEADS.warnMs) {
    // 予告: 点滅する赤い帯と、 進む向きの矢印
    const blink = 0.45 + 0.4 * Math.abs(Math.sin(nowMs / 90));
    ctx.globalAlpha = 0.18 * blink;
    ctx.fillStyle = "#ff5a6a";
    ctx.fillRect(xa, sy - BEADS.r, xb - xa, BEADS.r * 2);
    ctx.globalAlpha = blink;
    ctx.strokeStyle = "#ff5a6a";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    for (const dy of [-BEADS.r, BEADS.r]) {
      ctx.beginPath();
      ctx.moveTo(xa, sy + dy);
      ctx.lineTo(xb, sy + dy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd0d6";
    ctx.font = "700 18px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const arrow = row.dir > 0 ? "▶▶" : "◀◀";
    for (let x = Math.max(xa, 0) + 40; x < Math.min(xb, w); x += 120) ctx.fillText(arrow, x, sy);
  } else {
    // 珠が通るあいだは、 そろばんの軸 (= 木の棒)
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#5a3a20";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(xa, sy);
    ctx.lineTo(xb, sy);
    ctx.stroke();
  }
  ctx.restore();
}

/** そろばんの珠 (= 横から見た、 左右がとがった木の珠) */
function _drawBead(ctx, sx, sy, r) {
  const rx = r * 1.25, ry = r * 0.85;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx - rx, sy);
  ctx.quadraticCurveTo(sx - rx * 0.55, sy - ry * 1.15, sx, sy - ry);
  ctx.quadraticCurveTo(sx + rx * 0.55, sy - ry * 1.15, sx + rx, sy);
  ctx.quadraticCurveTo(sx + rx * 0.55, sy + ry * 1.15, sx, sy + ry);
  ctx.quadraticCurveTo(sx - rx * 0.55, sy + ry * 1.15, sx - rx, sy);
  ctx.closePath();
  const grad = ctx.createLinearGradient(sx, sy - ry, sx, sy + ry);
  grad.addColorStop(0, "#e8b47a");
  grad.addColorStop(0.45, "#b8743a");
  grad.addColorStop(1, "#6a3a18");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(40, 20, 8, 0.85)";
  ctx.stroke();
  // 光沢
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff1d6";
  ctx.beginPath();
  ctx.ellipse(sx - rx * 0.2, sy - ry * 0.45, rx * 0.45, ry * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _drawPunch(ctx, camera, w, h, pu, nowMs) {
  const k = Math.min(1, pu.t / PUNCH.warnMs);
  ctx.save();
  for (const hole of pu.holes) {
    const sx = hole.x - camera.x, sy = hole.y - camera.y;
    if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
    const x = sx - PUNCH.w / 2, y = sy - PUNCH.h / 2;
    if (!pu.done) {
      // 印: 点滅する赤い枠が、 下から埋まっていく (= 埋まりきるとパンチ)
      const blink = 0.5 + 0.4 * Math.abs(Math.sin(nowMs / 80));
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#ff5a6a";
      ctx.fillRect(x, y + PUNCH.h * (1 - k), PUNCH.w, PUNCH.h * k);
      ctx.globalAlpha = blink;
      ctx.strokeStyle = "#ff5a6a";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, PUNCH.w, PUNCH.h);
      ctx.setLineDash([]);
    } else {
      // 穴: 打たれた瞬間は白く光り、 暗い穴が残って消えていく
      const after = (pu.t - PUNCH.warnMs) / PUNCH.decalMs;
      ctx.globalAlpha = Math.max(0, 1 - after);
      ctx.fillStyle = after < 0.18 ? "#ffffff" : "#0e0c14";
      ctx.fillRect(x, y, PUNCH.w, PUNCH.h);
      ctx.strokeStyle = "#f4efe2";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, PUNCH.w, PUNCH.h);
    }
  }
  ctx.restore();
}

/** 木馬 (= 絵・開くまでの輪・残り秒。 残り 3 秒からは揺れる) */
export function drawTrojan(ctx, e, sx, sy, nowMs) {
  const left = e.openMs / TROJAN.openMs;
  const shake = e.openMs < 3000 ? Math.sin(nowMs / 30) * 3 : 0;
  ctx.save();
  // 足もとの影
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + TROJAN.size * 0.4, TROJAN.size * 0.36, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  const drew = drawSpriteRotated(ctx, getExtSprite(TROJAN_EXT_ID), sx + shake, sy, TROJAN.size, 0);
  if (!drew) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 開くまでの輪 (= 減っていく赤い弧)
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(sx, sy, e.r + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = e.openMs < 3000 ? "#ff3b4e" : "#ff9a6a";
  ctx.beginPath();
  ctx.arc(sx, sy, e.r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
  ctx.stroke();
  // 残り秒
  ctx.font = "700 20px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  const label = String(trojanSecLeft(e.openMs));
  ctx.strokeText(label, sx, sy - e.r - 30);
  ctx.fillStyle = e.openMs < 3000 ? "#ff7676" : "#ffe9c2";
  ctx.fillText(label, sx, sy - e.r - 30);
  ctx.restore();
}
