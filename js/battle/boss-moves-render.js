// ============================================================
// battle/boss-moves-render.js — ボスの型の予告の描画 (= SPEC-080)
// ============================================================
//
// - 突進: ボスから通り道の赤い帯 (= ボスの幅)。 向きが固まると濃くなり、 矢印が流れる
// - 叩きつけ: ボスのまわりの赤い円が中から満ちていく (= 満ちたら衝撃)。 衝撃のあとは輪が広がって消える
// 敵の層の下 (= 敵より先) に描く。

import { state } from "../state.js";
import { windupMs } from "../perks.js";   // SPEC-090c: 見切り (= 予告の長さに合わせて描く)
import { CHARGE, SLAM } from "./boss-moves.js";

export function renderBossMovesWorld(ctx, camera, w, h, nowMs) {
  const b = state.battle;
  for (const boss of b.enemies) {
    const act = boss.isBoss ? boss.mv?.act : null;
    if (!act) continue;
    const sx = boss.x - camera.x, sy = boss.y - camera.y;
    if (act.kind === "charge" && (act.phase === "windup" || act.phase === "dash")) _drawLane(ctx, boss, act, sx, sy, nowMs);
    else if (act.kind === "slam" && act.phase === "windup") _drawSlam(ctx, act, sx, sy);
  }
  for (const r of b.bossRings ?? []) {
    const k = r.age / r.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.strokeStyle = "#ff8a8a";
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(r.x - camera.x, r.y - camera.y, r.r * (0.85 + 0.35 * k), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function _drawLane(ctx, boss, act, sx, sy, nowMs) {
  const locked = act.phase === "dash" || act.t >= windupMs(CHARGE.windupMs) * CHARGE.lockAt;
  const k = act.phase === "dash" ? 1 : Math.min(1, act.t / windupMs(CHARGE.windupMs));
  const len = act.len - (act.phase === "dash" ? act.run : 0);
  const half = boss.r;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(Math.atan2(act.dy, act.dx));
  ctx.globalAlpha = locked ? 0.3 + 0.12 * Math.abs(Math.sin(nowMs / 70)) : 0.12 + 0.12 * k;
  ctx.fillStyle = "#ff3048";
  ctx.fillRect(0, -half, len, half * 2);
  ctx.globalAlpha = locked ? 0.95 : 0.55;
  ctx.strokeStyle = "#ff5a6a";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(0, -half); ctx.lineTo(len, -half);
  ctx.moveTo(0, half); ctx.lineTo(len, half);
  ctx.stroke();
  ctx.setLineDash([]);
  // 流れる矢印 (= 進む向き)
  ctx.fillStyle = "#ffd0d6";
  ctx.globalAlpha = locked ? 0.9 : 0.5;
  const step = 70, off = (nowMs / 6) % step;
  for (let x = boss.r + off; x < len - 10; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 12, 0);
    ctx.lineTo(x - 6, -half * 0.45);
    ctx.lineTo(x - 6, half * 0.45);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function _drawSlam(ctx, act, sx, sy) {
  const k = Math.min(1, act.t / windupMs(SLAM.windupMs));
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#ff3048";
  ctx.beginPath();
  ctx.arc(sx, sy, act.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.28 + 0.2 * k;
  ctx.beginPath();
  ctx.arc(sx, sy, act.radius * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "#ff5a6a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(sx, sy, act.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
