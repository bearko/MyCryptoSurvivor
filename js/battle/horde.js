// ============================================================
// battle/horde.js — 大群 (= SPEC-065)
// ============================================================
//
// - トロイは中盤から湧きが速まり (= 1:30 → 3:00 で 3.5 倍まで)、 2:00 からは群れが 1 方向からまとまって押し寄せる
// - 出ていられる敵の上限はステージごと (= トロイだけ 320。 ほかは 200 のまま)
// - 敵どうしは重なりすぎないよう押し分ける (= 群れが 1 点に固まらず、 画面を埋める)。 格子に分けて近いものだけ比べる
// どれも純関数 (= tests/horde.test.mjs)。 敵の配列だけを触る。

import { MAX_ENEMIES } from "../constants.js";

export const SEP_CELL_PX = 36;          // 押し分けの格子の大きさ
export const SEP_MAX_PER_CELL = 10;     // 1 マスで比べる数の上限 (= 固まりすぎても重くならない)
export const SEP_STRENGTH = 0.5;        // 重なりの何割を 1 コマで戻すか
export const PACK_SPREAD_RAD = 0.7;     // 群れが来る向きの広がり

/** ステージの敵の上限 */
export function stageMaxEnemies(stage) {
  return stage?.maxEnemies ?? MAX_ENEMIES;
}

/** 湧きの速さの倍率 (= fromMs から fullMs まで 1 → maxMul に上がる。 flood がなければ 1) */
export function floodMul(flood, elapsedMs) {
  if (!flood) return 1;
  const t = (elapsedMs - flood.fromMs) / Math.max(1, flood.fullMs - flood.fromMs);
  const k = Math.max(0, Math.min(1, t));
  return 1 + (flood.maxMul - 1) * k;
}

/** 群れの n 体が来る向き (= center のまわりに広がりを持って並べる) */
export function packAngles(n, center, spread = PACK_SPREAD_RAD) {
  if (n <= 1) return [center];
  const out = [];
  for (let i = 0; i < n; i++) out.push(center + (i / (n - 1) - 0.5) * spread);
  return out;
}

const _skip = (e) => e.isProp || e.isBoss || e.behavior === "trojan";
const _key = (cx, cy) => (cx + 2048) * 4096 + (cy + 2048);

function _pushApart(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let d2 = dx * dx + dy * dy;
  const rr = a.r + b.r;
  if (d2 >= rr * rr) return;
  if (d2 < 1e-6) { dx = (a.id % 2 ? 1 : -1) * 0.5; dy = 0.3; d2 = dx * dx + dy * dy; }   // ぴったり重なったら決まった向きへ
  const d = Math.sqrt(d2);
  const push = (rr - d) * SEP_STRENGTH * 0.5;
  const nx = dx / d, ny = dy / d;
  a.x -= nx * push; a.y -= ny * push;
  b.x += nx * push; b.y += ny * push;
}

/** 敵どうしを押し分ける (= 壺・宝箱・ボス・木馬は動かさない)。 同じマスと、 右・下・右下・左下のマスだけ比べる */
export function separateEnemies(enemies, cell = SEP_CELL_PX, maxPerCell = SEP_MAX_PER_CELL) {
  const grid = new Map();
  for (const e of enemies) {
    if (_skip(e)) continue;
    const k = _key(Math.floor(e.x / cell), Math.floor(e.y / cell));
    let list = grid.get(k);
    if (!list) { list = []; grid.set(k, list); }
    if (list.length < maxPerCell) list.push(e);
  }
  for (const [k, list] of grid) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) _pushApart(list[i], list[j]);
    }
    const cx = Math.floor(k / 4096) - 2048, cy = (k % 4096) - 2048;
    for (const [ox, oy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const other = grid.get(_key(cx + ox, cy + oy));
      if (!other) continue;
      for (const a of list) for (const b of other) _pushApart(a, b);
    }
  }
}
