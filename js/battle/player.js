// ============================================================
// battle/player.js — プレイヤー update (= 入力 × speed × dt)  SPEC-006 / SPEC-011 / SPEC-026
// ============================================================

import { state } from "../state.js";
import { WORLD_W, WORLD_H } from "../constants.js";
import { getObstacleRects } from "./field.js";
import { resolveCircle } from "./field-geom.js";
import { currentBounds } from "./arena.js";
import { dashMul } from "../perks.js";   // SPEC-090c

const HALF_W = WORLD_W / 2;
const HALF_H = WORLD_H / 2;

/**
 * 入力ベクタとフレーム時間を元に player.x / player.y を更新する。
 * SPEC-011: state.buffs.speedMul を反映 (= Boots 系列)。
 * SPEC-026: 世界端でクランプ (= 端まで行ったら越えない)。
 * @param {number} dt - 秒
 * @param {{x:number,y:number}} input - unit vector (= |v| ≤ 1)
 */
export function tickPlayer(dt, input) {
  const p   = state.battle.player;
  // SPEC-090c: 逃げ足 (= 無敵時間のあいだだけ速い)
  const mul = (state.buffs?.speedMul ?? 1) * (state.battle.contactCooldownMs > 0 ? dashMul() : 1);
  p.x += input.x * p.speed * mul * dt;
  p.y += input.y * p.speed * mul * dt;
  // SPEC-077: 動いている感じ (= 横に動く向きへ少し傾け、 歩くあいだ弾ませる。 見た目だけ)
  p.face = (p.face ?? 0) + (input.x - (p.face ?? 0)) * Math.min(1, dt * 10);
  p.moving = Math.hypot(input.x, input.y) > 0.1;
  if (p.moving) p.walkT = (p.walkT ?? 0) + dt;
  // SPEC-026: 世界端でクランプ
  const r = p.r;
  if (p.x < -HALF_W + r) p.x = -HALF_W + r;
  if (p.x >  HALF_W - r) p.x =  HALF_W - r;
  if (p.y < -HALF_H + r) p.y = -HALF_H + r;
  if (p.y >  HALF_H - r) p.y =  HALF_H - r;
  // SPEC-053: 建物は通れない
  const rects = getObstacleRects();
  if (rects.length) {
    const res = resolveCircle(p.x, p.y, r, rects);
    if (res.hit) { p.x = res.x; p.y = res.y; }
  }
}

/**
 * カメラを player を中心に置く (= viewport の半分だけ左上にずらす)。
 * SPEC-026: 世界端から外を見せないようクランプ。 ただし viewport > world のときは
 * world を viewport の中央に置く (= 余白は overlay の dark で埋める)。
 */
export function centerCameraOnPlayer() {
  const { player, camera, viewport } = state.battle;
  // SPEC-079: ボス戦の枠があれば、 世界ではなく枠の中を見せる (= 縁で止める。 枠のほうが小さければ枠を真ん中に)
  const bd = currentBounds();
  const cx = (bd.minX + bd.maxX) / 2, cy = (bd.minY + bd.maxY) / 2;
  camera.x = player.x - viewport.w / 2;
  camera.y = player.y - viewport.h / 2;
  // X 軸クランプ: viewport ≥ 縁の幅なら真ん中に固定、 そうでなければ端で止める
  if (viewport.w >= bd.maxX - bd.minX) {
    camera.x = cx - viewport.w / 2;
  } else {
    if (camera.x < bd.minX) camera.x = bd.minX;
    if (camera.x > bd.maxX - viewport.w) camera.x = bd.maxX - viewport.w;
  }
  // Y 軸クランプ
  if (viewport.h >= bd.maxY - bd.minY) {
    camera.y = cy - viewport.h / 2;
  } else {
    if (camera.y < bd.minY) camera.y = bd.minY;
    if (camera.y > bd.maxY - viewport.h) camera.y = bd.maxY - viewport.h;
  }
}
