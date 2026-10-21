// ============================================================
// battle/enemy-shots.js — 離れたところから撃ってくる敵 (= SPEC-062)
// ============================================================
//
// - 撃ってくる敵は、 自分から少し離れた距離を保つ。 距離は画面の大きさに合わせた楕円 (= 縦長の画面でも画面の中に収まる)。
//   遠ければ近づき、 近すぎると下がり、 ちょうどよい距離では横へ回る (= 全員がまっすぐ突っこんでくるわけではない)
// - 撃つ前に 0.45 秒、 狙う線を見せる (= 見てから避けられる)。 弾は遅め・建物で止まる
// - 画面に映っていないときは撃たない (= 見えない敵に撃たれない)
// 弾は state.battle.enemyShots。 ボスの弾 (= bossProjectiles) とは別にする (= ボスの弾は、 ボスが倒れると消すため)

import { enemyNameOf } from "./enemy-name.js";   // SPEC-148
import { state } from "../state.js";
import { WORLD_W, WORLD_H } from "../constants.js";
import { hurtPlayer } from "./hurt.js";   // SPEC-090c
import { getObstacleRects } from "./field.js";
import { resolveCircle, circleHitsAnyRect } from "./field-geom.js";
import { naviTipOnce } from "../navi-tips.js";
import { missionMods } from "./missions.js";   // SPEC-112

export const SHOOTER_KEEP_RATIO = 0.72;    // 保つ距離 = 画面の半分 × これ (= 楕円)
export const SHOOTER_KEEP_MIN_PX = 160;    // 小さい画面でも、 これより近くには寄らない
export const SHOOTER_BAND = 0.2;           // 楕円の 1 ± BAND の間は横へ回る
export const SHOOTER_RETREAT_MUL = 0.8;    // 下がる速さ (= 追う速さに対して)
export const SHOOTER_STRAFE_MUL = 0.55;    // 横へ回る速さ
export const SHOOTER_AIM_MS = 450;         // 撃つ前に狙う線を見せる長さ
export const SHOOTER_FIRE_RANGE_PX = 520;  // 大きな画面でも、 これより遠いと撃たない
export const SHOOTER_ONSCREEN_MARGIN_PX = 12;   // 画面の縁からこれだけ内側にいるときだけ撃つ
export const SPREAD_RAD = 0.28;            // 3 方向に撃つときの開き
export const ENEMY_SHOT_LIFE_MS = 4000;
export const ENEMY_SHOT_RADIUS = 7;
export const MAX_ENEMY_SHOTS = 80;

/** 保つ距離の楕円の半径 (= 純関数。 画面の大きさから) */
export function shooterKeep(vw, vh) {
  return {
    rx: Math.max(SHOOTER_KEEP_MIN_PX, (vw / 2) * SHOOTER_KEEP_RATIO),
    ry: Math.max(SHOOTER_KEEP_MIN_PX, (vh / 2) * SHOOTER_KEEP_RATIO),
  };
}

/**
 * 動き方を決める (= 純関数): approach (近づく) / retreat (下がる) / strafe (横へ回る)
 * dx, dy: 敵から自分への向き。 keep: shooterKeep() の楕円
 */
export function shooterMode(dx, dy, keep, band = SHOOTER_BAND) {
  const dn = Math.hypot(dx / keep.rx, dy / keep.ry);
  if (dn > 1 + band) return "approach";
  if (dn < 1 - band) return "retreat";
  return "strafe";
}

/** 画面に映っているか (= 純関数。 自分は画面の真ん中) */
export function shooterOnScreen(dx, dy, vw, vh, margin = SHOOTER_ONSCREEN_MARGIN_PX) {
  return Math.abs(dx) <= vw / 2 - margin && Math.abs(dy) <= vh / 2 - margin;
}

/** SPEC-112: 1 発を mul 発に (= 真ん中と、 左右に少しずつ) */
export function spreadMul(a, mul, step = 0.14) {
  const out = [a];
  for (let k = 1; out.length < mul; k++) { out.push(a + k * step); if (out.length < mul) out.push(a - k * step); }
  return out;
}

/** 撃ち方ごとの弾の速度 (= 純関数)。 aimed: 狙って 1 発、 spread3: 3 方向、 spread5: 5 方向 (= SPEC-107 の連射) */
export function shotAngles(pattern, aimAngle) {
  if (pattern === "spread5") return [-2, -1, 0, 1, 2].map((k) => aimAngle + k * SPREAD_RAD);
  return pattern === "spread3" ? [aimAngle - SPREAD_RAD, aimAngle, aimAngle + SPREAD_RAD] : [aimAngle];
}

/** 次に撃つまでの間 (= 毎回少しずらして、 何体いても一斉に撃たない) */
export function nextFireMs(everyMs, rand = Math.random()) {
  return Math.round(everyMs * (0.85 + rand * 0.3));
}

/**
 * 撃ってくる敵の 1 フレーム (= enemies.js の「まっすぐ追う」の代わり)。
 * 動く → 狙う → 撃つ。 当たって止まっているあいだ (= hitFreezeMs) は動かず撃たない
 */
export function tickShooter(e, dt, px, py) {
  const b = state.battle;
  const dms = dt * 1000;
  const dx = px - e.x;
  const dy = py - e.y;
  const d = Math.hypot(dx, dy) || 1;
  if ((e.hitFreezeMs ?? 0) > 0) return;

  const vw = b.viewport?.w || 390, vh = b.viewport?.h || 700;
  const mode = shooterMode(dx, dy, shooterKeep(vw, vh));
  let mx = 0, my = 0, sp = e.speed;
  if (mode === "approach") { mx = dx / d; my = dy / d; }
  else if (mode === "retreat") { mx = -dx / d; my = -dy / d; sp *= SHOOTER_RETREAT_MUL; }
  else { mx = (-dy / d) * e.strafeDir; my = (dx / d) * e.strafeDir; sp *= SHOOTER_STRAFE_MUL; }
  e.x += mx * sp * dt;
  e.y += my * sp * dt;
  const rects = getObstacleRects();
  if (rects.length) {
    const res = resolveCircle(e.x, e.y, e.r, rects);
    if (res.hit) {
      e.x = res.x; e.y = res.y;
      if (mode === "strafe") e.strafeDir *= -1;   // 建物に当たったら逆へ回る
    }
  }
  const HW = WORLD_W / 2 - e.r, HH = WORLD_H / 2 - e.r;
  e.x = Math.max(-HW, Math.min(HW, e.x));
  e.y = Math.max(-HH, Math.min(HH, e.y));

  // 狙う → 撃つ
  e.fireCdMs -= dms;
  const inRange = d <= SHOOTER_FIRE_RANGE_PX && shooterOnScreen(dx, dy, vw, vh);
  if (!e.aiming && e.fireCdMs <= SHOOTER_AIM_MS && inRange) {
    e.aiming = true;
    e.aimAngle = Math.atan2(dy, dx);   // 狙う向きは線を出した時に決める (= 線を見て避けられる)
    naviTipOnce("enemy.shooter");   // SPEC-068: 初めて狙われたときだけ
  }
  if (e.fireCdMs > 0) return;
  if (!e.aiming) {
    // 遠くて狙えなかった: 少し待って、 また狙う
    e.fireCdMs = SHOOTER_AIM_MS + 300;
    return;
  }
  e.aiming = false;
  e.fireCdMs = nextFireMs(e.shot.everyMs);
  const shots = b.enemyShots;
  // SPEC-112: 三段撃ち (= 1 発ごとに左右へ少しずらした弾を足して 3 倍)
  const mul = missionMods().shotMul;
  const angles = shotAngles(e.shot.pattern, e.aimAngle).flatMap((a) => (mul > 1 ? spreadMul(a, mul) : [a]));
  for (const a of angles) {
    if (shots.length >= MAX_ENEMY_SHOTS) break;
    shots.push({
      id: b.nextEntityId++,
      x: e.x + Math.cos(a) * (e.r + 4),
      y: e.y + Math.sin(a) * (e.r + 4),
      vx: Math.cos(a) * e.shot.speed,
      vy: Math.sin(a) * e.shot.speed,
      r: ENEMY_SHOT_RADIUS,
      dmg: e.shotDmg,
      age: 0,
      from: enemyNameOf(e),   // SPEC-148: とどめに出す名前
    });
  }
}

/** 弾の移動・寿命・建物・自分への当たり (= 当たると消える。 被弾の間隔は体当たりと共通) */
export function tickEnemyShots(dt) {
  const b = state.battle;
  const shots = b.enemyShots;
  if (!shots || shots.length === 0) return;
  const dms = dt * 1000;
  const rects = getObstacleRects();
  const px = b.player.x, py = b.player.y, pr = b.player.r;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.age += dms;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.age >= ENEMY_SHOT_LIFE_MS || circleHitsAnyRect(s.x, s.y, s.r, rects)) { shots.splice(i, 1); continue; }
    const ddx = s.x - px, ddy = s.y - py, sumR = s.r + pr;
    if (ddx * ddx + ddy * ddy > sumR * sumR) continue;
    shots.splice(i, 1);
    hurtPlayer(s.dmg, { boss: false, shake: false, kind: "shot", name: s.from ?? null });   // SPEC-090c: 被弾は 1 か所 (= hurt.js)。 SPEC-148: 弾
  }
}
