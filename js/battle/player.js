// ============================================================
// battle/player.js — プレイヤー update (= 入力 × speed × dt)  SPEC-006 / SPEC-011 / SPEC-026
// ============================================================

import { state } from "../state.js";
import { WORLD_W, WORLD_H } from "../constants.js";

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
  const mul = state.buffs?.speedMul ?? 1;
  p.x += input.x * p.speed * mul * dt;
  p.y += input.y * p.speed * mul * dt;
  // SPEC-026: 世界端でクランプ
  const r = p.r;
  if (p.x < -HALF_W + r) p.x = -HALF_W + r;
  if (p.x >  HALF_W - r) p.x =  HALF_W - r;
  if (p.y < -HALF_H + r) p.y = -HALF_H + r;
  if (p.y >  HALF_H - r) p.y =  HALF_H - r;
}

/**
 * カメラを player を中心に置く (= viewport の半分だけ左上にずらす)。
 * SPEC-026: 世界端から外を見せないようクランプ。 ただし viewport > world のときは
 * world を viewport の中央に置く (= 余白は overlay の dark で埋める)。
 */
export function centerCameraOnPlayer() {
  const { player, camera, viewport } = state.battle;
  camera.x = player.x - viewport.w / 2;
  camera.y = player.y - viewport.h / 2;
  // X 軸クランプ: viewport ≥ world なら world を画面中央に固定、 そうでなければ端で止める
  if (viewport.w >= WORLD_W) {
    camera.x = -viewport.w / 2;
  } else {
    if (camera.x < -HALF_W) camera.x = -HALF_W;
    if (camera.x >  HALF_W - viewport.w) camera.x = HALF_W - viewport.w;
  }
  // Y 軸クランプ
  if (viewport.h >= WORLD_H) {
    camera.y = -viewport.h / 2;
  } else {
    if (camera.y < -HALF_H) camera.y = -HALF_H;
    if (camera.y >  HALF_H - viewport.h) camera.y = HALF_H - viewport.h;
  }
}
