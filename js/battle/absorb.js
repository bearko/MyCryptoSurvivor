// ============================================================
// battle/absorb.js — CE がヒーローに吸い込まれる動き (= SPEC-102)
// ============================================================
//
// 拾える範囲に入った CE は、 その場で消さずに「吸い込み中」にして、
// 最初はゆっくり・だんだん速くヒーローへ飛ばす。 届いた瞬間に経験値が入る。
// DOM にも state にも触れない純関数だけ (= テストしやすくするため)。

export const ABSORB_V0_PX_S     = 60;     // 吸い込みはじめの速さ
export const ABSORB_ACCEL_PX_S2 = 2000;   // 加速 (= 28px なら約 0.14 秒、 84px なら約 0.26 秒で届く)
export const ABSORB_SHRINK      = 0.35;   // 届く直前に、 この割合だけ小さくなる
export const ABSORB_SHRINK_S    = 0.25;   // 小さくなりきるまでの時間

// 「じゃらじゃら」: 続けて届くほど音を少しずつ高くする (= 上限あり)
export const CHAIN_WINDOW_MS = 400;
export const CHAIN_MAX       = 8;
export const CHAIN_PITCH     = 0.04;

/** CE を吸い込み中にする (= すでに吸い込み中なら何もしない) */
export function startAbsorb(g) {
  if (g.absorbing) return;
  g.absorbing = true;
  g.absorbT = 0;
  g.lx = g.x;
  g.ly = g.y;
}

/**
 * 吸い込み中の CE を 1 フレーム進める。 ヒーローに届いたら true。
 * ヒーローは動くので、 毎フレームいまの位置へ向け直す。
 */
export function absorbStep(g, px, py, dt) {
  g.lx = g.x;
  g.ly = g.y;
  const v = ABSORB_V0_PX_S + ABSORB_ACCEL_PX_S2 * (g.absorbT ?? 0);
  g.absorbT = (g.absorbT ?? 0) + dt;
  const dx = px - g.x, dy = py - g.y;
  const d = Math.hypot(dx, dy);
  const step = v * dt;
  if (step >= d) {
    g.x = px;
    g.y = py;
    return true;
  }
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  return false;
}

/** 描くときの大きさの倍率 (= 吸い込み中は少しずつ小さくなる) */
export function absorbScale(g) {
  if (!g.absorbing) return 1;
  return 1 - ABSORB_SHRINK * Math.min(1, (g.absorbT ?? 0) / ABSORB_SHRINK_S);
}

/**
 * 続けて届いた数を数え、 音の高さを返す。 chain = { n, ms } を書き換える。
 * dtMs だけ時間を進めてから、 届いた数 arrived を足す。
 */
export function chainPitch(chain, dtMs, arrived) {
  chain.ms = Math.max(0, (chain.ms ?? 0) - dtMs);
  if (arrived <= 0) {
    if (chain.ms === 0) chain.n = 0;
    return 1;
  }
  chain.n = chain.ms > 0 ? Math.min(CHAIN_MAX, (chain.n ?? 0) + arrived) : 0;
  chain.ms = CHAIN_WINDOW_MS;
  return 1 + CHAIN_PITCH * chain.n;
}
