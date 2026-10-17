// ============================================================
// battle/field-geom.js — 建物の当たり・出す場所・ドロップの抽選 (= SPEC-053)
// ============================================================
//
// state にも DOM にも触らない純関数だけ (= tests/field.test.mjs)。
// 四角 rect は { x, y, w, h } で、 x・y は中心。

/** 絵の中心と大きさから当たりの四角を作る */
export function obstacleRect(o, hitboxRatio) {
  const s = (o.size ?? 96) * hitboxRatio;
  return { x: o.x, y: o.y, w: s, h: s };
}

/**
 * 円が四角に重なっていれば、 重ならない位置まで押し出す。 重なっていなければ null。
 * 返り値: { x, y, nx, ny } (= 押し出した位置と、 押し出した向きの単位ベクトル)
 */
export function pushCircleOutOfRect(x, y, r, rect) {
  const hw = rect.w / 2, hh = rect.h / 2;
  const L = rect.x - hw, R = rect.x + hw, T = rect.y - hh, B = rect.y + hh;
  const cx = Math.max(L, Math.min(R, x));
  const cy = Math.max(T, Math.min(B, y));
  const dx = x - cx, dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    return { x: cx + nx * r, y: cy + ny * r, nx, ny };
  }
  // 円の中心が四角の中: いちばん浅い辺から外へ出す
  const toL = x - L, toR = R - x, toT = y - T, toB = B - y;
  const m = Math.min(toL, toR, toT, toB);
  if (m === toL) return { x: L - r, y, nx: -1, ny: 0 };
  if (m === toR) return { x: R + r, y, nx: 1, ny: 0 };
  if (m === toT) return { x, y: T - r, nx: 0, ny: -1 };
  return { x, y: B + r, nx: 0, ny: 1 };
}

/**
 * 円をすべての四角の外へ出す (= 角で 2 つに挟まれたときのために 2 回まわす)。
 * 返り値: { x, y, hit, nx, ny } (= hit なら最後に押し出した向き)
 */
export function resolveCircle(x, y, r, rects) {
  let hit = false, nx = 0, ny = 0;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (const rect of rects) {
      const p = pushCircleOutOfRect(x, y, r, rect);
      if (!p) continue;
      x = p.x; y = p.y; nx = p.nx; ny = p.ny;
      hit = true; moved = true;
    }
    if (!moved) break;
  }
  return { x, y, hit, nx, ny };
}

/** 円がどれかの四角に重なっているか */
export function circleHitsAnyRect(x, y, r, rects) {
  for (const rect of rects) if (pushCircleOutOfRect(x, y, r, rect)) return true;
  return false;
}

/**
 * 壁に当たった敵が、 壁に沿ってどちらへ回りこむか (= 目標に近づく側の接線)。 単位ベクトル
 *   (nx, ny): 押し出された向き、 (tx, ty): 敵から目標へのベクトル
 */
export function slideAlongWall(nx, ny, tx, ty) {
  let sx = -ny, sy = nx;
  if (sx * tx + sy * ty < 0) { sx = -sx; sy = -sy; }
  return { x: sx, y: sy };
}

/**
 * 半直線 (原点 o・単位ベクトル d) が四角に入るまでの距離。 入らなければ Infinity。
 * 原点が四角の中なら 0。
 */
export function rayRectDistance(ox, oy, dx, dy, rect) {
  const hw = rect.w / 2, hh = rect.h / 2;
  let tmin = -Infinity, tmax = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, rect.x - hw, rect.x + hw], [oy, dy, rect.y - hh, rect.y + hh]]) {
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return Infinity;
      continue;
    }
    let t1 = (lo - o) / d, t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }
  if (tmax < 0 || tmin > tmax) return Infinity;
  return Math.max(0, tmin);
}

/** レーザーの長さを、 最初に当たる建物の手前までに縮める */
export function clipRayLength(ox, oy, dx, dy, len, rects) {
  let best = len;
  for (const rect of rects) {
    const t = rayRectDistance(ox, oy, dx, dy, rect);
    if (t < best) best = t;
  }
  return best;
}

/** 重み付きの抽選。 table: [{ kind, w }]、 rnd: 0 以上 1 未満 */
export function rollTable(table, rnd) {
  const total = table.reduce((a, e) => a + Math.max(0, e.w), 0);
  if (!(total > 0)) return null;
  let x = rnd * total;
  for (const e of table) {
    x -= Math.max(0, e.w);
    if (x < 0) return e.kind;
  }
  return table[table.length - 1].kind;
}

/**
 * 壺・宝箱を置く場所を探す。 プレイヤーから minD〜maxD 離れていて、 世界の中で、 建物から pad 以上離れたところ。
 * 見つからなければ null。 rnd は 0 以上 1 未満を返す関数
 */
export function pickSpawnPoint({ rnd, px, py, minD, maxD, halfW, halfH, rects, r, pad = 24, tries = 24 }) {
  for (let i = 0; i < tries; i++) {
    const a = rnd() * Math.PI * 2;
    const d = minD + rnd() * (maxD - minD);
    const x = px + Math.cos(a) * d;
    const y = py + Math.sin(a) * d;
    if (x < -halfW + r + pad || x > halfW - r - pad || y < -halfH + r + pad || y > halfH - r - pad) continue;
    if (circleHitsAnyRect(x, y, r + pad, rects)) continue;
    return { x, y };
  }
  return null;
}
