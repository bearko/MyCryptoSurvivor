// ============================================================
// threat.js — 敵の段階と新しい型 (= SPEC-107)
// ============================================================
//
// そのステージの撃破数で「脅威の段階」 T0〜T4 が上がり、 段階ごとに強い型が混じりはじめる。
// 強い型ほど CE が多い (= xpValue に掛ける。 拾うと経験値。 v1.6 のショップでは通貨)。
//   巨大 giant   : T1〜。 大きく少し遅い。 HP ×4
//   疾走 runner  : T1〜。 速い。 HP ×1.2
//   連射 gatling : T2〜。 撃つ敵の強化版 (= 5 方向・間隔が短い)
//   横断 crosser : T3〜。 プレイヤーを追わず、 画面の端から反対の端へ一直線に高速で横切る列 (= 予告の線を 0.6 秒)
//   精鋭 elite   : T4〜。 巨大＋疾走。 金の縁
// 型は雑魚の湧きを置き換えて出す (= 同時の上限 maxEnemies は変えない)。 ボス・レア・木馬には付けない。
// 絵は同じ系統の上位の姿 (= クリーパー ショート → トール → ヴェンティ…)。

/** 段階の境目 (= そのステージの撃破数) */
export const THREAT_TIERS = Object.freeze([0, 150, 400, 800, 1500]);

/** 型ごとの強さ (= 雑魚の何倍) */
export const VARIANTS = Object.freeze({
  giant:   { from: 1, hpMul: 4,   dmgMul: 1.5, rMul: 1.6,  speedMul: 0.85, ceMul: 4 },
  runner:  { from: 1, hpMul: 1.2, dmgMul: 1,   rMul: 0.95, speedMul: 1.8,  ceMul: 2 },
  gatling: { from: 2, hpMul: 2,   dmgMul: 1,   rMul: 1.15, speedMul: 1,    ceMul: 4, everyMul: 0.6, pattern: "spread5" },
  crosser: { from: 3, hpMul: 1.5, dmgMul: 2,   rMul: 1,    speedMul: 1,    ceMul: 5 },
  elite:   { from: 4, hpMul: 8,   dmgMul: 1.5, rMul: 1.5,  speedMul: 1.5,  ceMul: 10 },
});

/** 段階ごとの混じる割合 (= 突っこんでくる雑魚 1 体ごと。 残りはふつうの雑魚) */
export const VARIANT_CHANCE = Object.freeze([
  {},
  { giant: 0.06, runner: 0.08 },
  { giant: 0.09, runner: 0.11 },
  { giant: 0.12, runner: 0.13 },
  { giant: 0.13, runner: 0.14, elite: 0.05 },
]);
/** 撃つ敵が連射になる割合 */
export const GATLING_CHANCE = Object.freeze([0, 0, 0.35, 0.5, 0.6]);

/** 横断の列 (= T3 から。 間隔は段階で縮む) */
export const CROSS = Object.freeze({ everyMs: [0, 0, 0, 14000, 10000], warnMs: 600, speed: 420, minN: 3, maxN: 5, gap: 70 });

/** 型ごとの絵 (= 系統の上位の姿。 資産リポジトリの Image/Enemies に絵がある id だけ) */
export const VARIANT_SPRITES = Object.freeze({
  101: { giant: 104, runner: 102, crosser: 105, elite: 145 },   // クリーパー
  124: { giant: 126, runner: 122, crosser: 125, elite: 126 },   // ハートブリード
  134: { giant: 138, runner: 132, crosser: 135, elite: 144 },   // メリッサ
  164: { giant: 165, runner: 162, crosser: 167, elite: 169 },   // バイトバンディット
});

/**
 * SPEC-146: 初めての人の最初の挑戦 (= meta.runs が 0) は、 段階を上げない (= T0 のまま)。
 * ステージ 1 の 1〜2 分で T1 (= 巨大・疾走) に入り、 初めての人が倒れていた (= 共通基盤の記録と自動プレイで確かめた)。
 * 2 回目からは今までどおり (= RTA・レギュレーション・総合スコアに効く難しさは変えない)
 */
export function runThreatTier(kills, { firstRun = false } = {}) {
  return firstRun ? 0 : threatTier(kills);
}

/** そのステージの撃破数 → 段階 (= 純関数) */
export function threatTier(kills) {
  const k = Math.max(0, kills | 0);
  let t = 0;
  for (let i = 0; i < THREAT_TIERS.length; i++) if (k >= THREAT_TIERS[i]) t = i;
  return t;
}

/** 1 体ごとの型 (= 純関数。 rand は 0〜1)。 撃つ敵は連射か、 ふつう */
export function rollVariant(tier, { shooter = false } = {}, rand = Math.random) {
  const t = Math.max(0, Math.min(VARIANT_CHANCE.length - 1, tier | 0));
  if (shooter) return rand() < GATLING_CHANCE[t] ? "gatling" : null;
  const r = rand();
  let acc = 0;
  for (const [k, p] of Object.entries(VARIANT_CHANCE[t])) {
    acc += p;
    if (r < acc) return k;
  }
  return null;
}

/** 敵 1 体に型を付ける (= 純関数ではない: e を書き換える)。 baseId は湧いた雑魚の id */
export function applyVariant(e, variant, baseId = e.enemyId) {
  const v = VARIANTS[variant];
  if (!v) return e;
  e.variant = variant;
  e.hp = e.hpMax = Math.max(1, Math.round(e.hpMax * v.hpMul));
  e.dmg = Math.max(1, Math.round(e.dmg * v.dmgMul));
  e.r = Math.max(4, Math.round(e.r * v.rMul));
  e.speed = e.speed * v.speedMul;
  e.xpValue = Math.max(1, Math.round((e.xpValue ?? 1) * v.ceMul));
  e.spriteId = VARIANT_SPRITES[baseId]?.[variant] ?? e.spriteId ?? null;
  if (variant === "gatling" && e.shot) e.shot = { ...e.shot, pattern: v.pattern, everyMs: Math.round(e.shot.everyMs * v.everyMul) };
  return e;
}

/** 横断の列の向きと位置 (= 純関数)。 画面 vw×vh・自分の位置 px,py。 dir 0..3 (= 左→右 / 右→左 / 上→下 / 下→上) */
export function crossLine(dir, px, py, vw, vh, laneOffset = 0) {
  const hx = vw / 2 + 80, hy = vh / 2 + 80;
  if (dir === 0) return { x1: px - hx, y1: py + laneOffset, x2: px + hx, y2: py + laneOffset };
  if (dir === 1) return { x1: px + hx, y1: py + laneOffset, x2: px - hx, y2: py + laneOffset };
  if (dir === 2) return { x1: px + laneOffset, y1: py - hy, x2: px + laneOffset, y2: py + hy };
  return { x1: px + laneOffset, y1: py + hy, x2: px + laneOffset, y2: py - hy };
}

/** 横断の敵が走りきったか (= 線の終わりを越えた。 純関数) */
export function crossedOut(e) {
  if (!e.cross) return false;
  const { x2, y2, ux, uy } = e.cross;
  return (e.x - x2) * ux + (e.y - y2) * uy > 0;
}
