// ============================================================
// battle/horde.js — 大群 (= SPEC-065)
// ============================================================
//
// - トロイは中盤から湧きが速まり (= 1:30 → 3:00 で 3.5 倍まで)、 2:00 からは群れが 1 方向からまとまって押し寄せる
// - 出ていられる敵の上限はステージごと (= トロイだけ 320。 ほかは 200 のまま)
// - 敵どうしは重なりすぎないよう押し分ける (= 群れが 1 点に固まらず、 画面を埋める)。 格子に分けて近いものだけ比べる
// どれも純関数 (= tests/horde.test.mjs)。 敵の配列だけを触る。

import { MAX_ENEMIES } from "../constants.js";

export const SEP_CELL_PX = 56;          // 押し分けの格子の大きさ (= SPEC-077 で敵が大きくなったので 36 → 56)
export const SEP_MAX_PER_CELL = 12;     // 1 マスで比べる数の上限 (= 固まりすぎても重くならない)
export const SEP_STRENGTH = 0.5;        // 重なりの何割を 1 コマで戻すか
export const PACK_SPREAD_RAD = 0.7;     // 群れが来る向きの広がり

/** ステージの敵の上限 */
export function stageMaxEnemies(stage) {
  return stage?.maxEnemies ?? MAX_ENEMIES;
}

// ---- SPEC-078: 画面の敵の密度を、 ステージの時刻ごとの目標に保つ ----
/** 密度を見る間隔 */
export const DENSITY_CHECK_MS = 150;
/** 足りない数のうち、 1 回に湧かせる割合 (= 画面の外から歩いてくるので、 少しずつ) */
export const DENSITY_GAIN = 0.4;
/** 足りない数を数えるときの、 ふつうの敵の半径 (= SPEC-077 の 1.4 倍のあと) */
export const DENSITY_AVG_R = 20;
/** 1 回に足す数の上限 (= 強い武器でまとめて倒されても、 すぐ埋め戻す。 1 秒に 200 体ほどまで) */
export const DENSITY_MAX_PER_CHECK = 32;

/**
 * 密度の目標 (= 0〜1)。 fromMs から fullMs にかけて、 終わりほど急に上がる (= ボスの直前がいちばん濃い)。 純関数
 *   d: { fromMs, fullMs, max }
 */
export function densityTarget(d, elapsedMs) {
  if (!d) return 0;
  const k = Math.max(0, Math.min(1, (elapsedMs - d.fromMs) / Math.max(1, d.fullMs - d.fromMs)));
  return d.max * Math.pow(k, 1.6);
}

/** 画面の密度 (= 画面の中にいる敵の円の面積の和 ÷ 画面の面積)。 壺・宝箱・木馬・ボスは数えない。 純関数 */
export function screenDensity(enemies, camX, camY, vw, vh) {
  let a = 0;
  for (const e of enemies) {
    if (e.isProp || e.isBoss || e.behavior === "trojan") continue;
    const sx = e.x - camX, sy = e.y - camY;
    if (sx < 0 || sx > vw || sy < 0 || sy > vh) continue;
    a += Math.PI * e.r * e.r;
  }
  return a / Math.max(1, vw * vh);
}

/** 目標まで、 ふつうの大きさの敵があと何体足りないか。 純関数 */
export function densityShortfall(target, density, vw, vh, avgR = DENSITY_AVG_R) {
  if (target <= density) return 0;
  return Math.ceil(((target - density) * vw * vh) / (Math.PI * avgR * avgR));
}

/** SPEC-078: 1 コマに湧くのは多くてもこの数 (= 湧きが速くても、 1 コマに固まらない) */
export const SPAWN_MAX_PER_FRAME = 12;

/**
 * SPEC-078: 湧く数を、 経った時間から数える (= 1 コマに 1 体までだと、 湧きの速さに上限ができる)。 純関数
 *   acc: 前のコマの余り (= 0〜1)。 戻り値 { n: このコマに湧かせる数, acc: 次の余り }
 */
export function spawnBudget(acc, dms, intervalMs, room, maxPerFrame = SPAWN_MAX_PER_FRAME) {
  let a = (acc ?? 0) + dms / Math.max(1, intervalMs);
  const n = Math.max(0, Math.min(Math.floor(a), room, maxPerFrame));
  a -= n;
  if (n >= room) a = Math.min(a, 1);   // 上限に届いたら、 余りをためこまない
  return { n, acc: Math.min(a, maxPerFrame) };
}

// ---- SPEC-078: 置いていかれた敵を、 画面のすぐ外へ寄せ直す ----
/** 寄せ直しを見る間隔・1 回に寄せ直す数の上限 */
export const RECYCLE_CHECK_MS = 250;
export const RECYCLE_MAX = 24;
/** 湧く輪 (= 画面の半分 + 余白) の何倍より遠ければ寄せ直すか */
export const RECYCLE_K = 1.7;

/**
 * 置いていかれたか (= 自分を中心にした湧く輪の楕円の k 倍より外)。 純関数
 *   dx, dy: 自分から敵まで / halfW, halfH: 湧く輪の半径
 */
export function isLeftBehind(dx, dy, halfW, halfH, k = RECYCLE_K) {
  const u = dx / Math.max(1, halfW), v = dy / Math.max(1, halfH);
  return u * u + v * v > k * k;
}

/** 寄せ直してよい敵か (= 壺・宝箱・木馬・ボス・レアは動かさない)。 純関数 */
export function canRecycle(e) {
  return !e.isProp && !e.isBoss && !e.isRare && e.behavior !== "trojan";
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
