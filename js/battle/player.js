// ============================================================
// battle/player.js — プレイヤー update (= 入力 × speed × dt)  SPEC-006 / SPEC-011
// ============================================================

import { state } from "../state.js";

/**
 * 入力ベクタとフレーム時間を元に player.x / player.y を更新する。
 * SPEC-011: state.buffs.speedMul を反映 (= Boots 系列)。
 * @param {number} dt - 秒
 * @param {{x:number,y:number}} input - unit vector (= |v| ≤ 1)
 */
export function tickPlayer(dt, input) {
  const p   = state.battle.player;
  const mul = state.buffs?.speedMul ?? 1;
  p.x += input.x * p.speed * mul * dt;
  p.y += input.y * p.speed * mul * dt;
}

/**
 * カメラを player を中心に置く (= viewport の半分だけ左上にずらす)。
 */
export function centerCameraOnPlayer() {
  const { player, camera, viewport } = state.battle;
  camera.x = player.x - viewport.w / 2;
  camera.y = player.y - viewport.h / 2;
}
