// ============================================================
// ext-level.js — エクステンションの 15 段階 (= SPEC-162)。 純関数 (= tests/ext-level.test.mjs)
// ============================================================
//
// データ (= data/extensions.json の tierParams / tierNames / tierIconIds) は 5 段のまま。 ここで 15 段に伸ばす。
//   ランク (= 絵と名前)  : 3 段ごとに 1 つ上がる (= Lv1〜3 が 1 段目、 4〜6 が 2 段目 … 13〜15 が 5 段目)
//   数値 (= 威力・間隔…) : 5 段の数値を Lv1・3.25・5.5・7.75・10 に置いて、 あいだを線で結ぶ (= Lv10 が今までの最大)。
//                           Lv11〜15 は 4 → 5 段目の傾きのまま伸ばす (= 今までより強い)。 LL (= Lv16) は ll.params
// 引き継ぎ (= ステージをまたいでも装備と CE が残る) と組で、 1 回の挑戦のあいだに 15 段を登る。

import { EXT_MAX_LEVEL, LL_LEVEL, EXT_RANK_SIZE } from "./constants.js";

/** ランクの数 (= データの段の数) */
export const EXT_RANKS = 5;
/** 現行の最大 (= 5 段目の数値) を置く段 */
export const EXT_LEGACY_MAX_LEVEL = 10;
/** 間隔 (cdMs など、 小さいほど良い数値) は 5 段目のこの倍までしか縮まない */
export const EXT_EXTRAPOLATE_FLOOR = 0.5;

/** 段 → ランク (1〜5)。 LL は 5 (= 絵と名前は ll で別に持つ) */
export function rankOf(level) {
  const l = Math.max(1, Math.min(EXT_MAX_LEVEL, level | 0));
  return Math.min(EXT_RANKS, Math.ceil(l / EXT_RANK_SIZE));
}

/** ランク → そのランクの最初の段 (1, 4, 7, 10, 13) */
export function levelOfRank(rank) {
  return (Math.max(1, Math.min(EXT_RANKS, rank | 0)) - 1) * EXT_RANK_SIZE + 1;
}

/** n 段のデータを置く段 (= 1 〜 EXT_LEGACY_MAX_LEVEL に等間隔) */
export function tierAnchors(n) {
  if (n <= 1) return [1];
  return Array.from({ length: n }, (_, i) => 1 + (EXT_LEGACY_MAX_LEVEL - 1) * (i / (n - 1)));
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const allInt = (arr) => arr.every((v) => Number.isInteger(v));

/**
 * その段の数値 (= tierParams を 15 段に伸ばしたもの)。 level は 1〜EXT_MAX_LEVEL (= LL は呼ぶ側が ll.params を使う)
 *   数値でない欄 (= 文字列など) はそのランクの段のものをそのまま
 */
export function levelParams(ext, level) {
  const tiers = Array.isArray(ext?.tierParams) ? ext.tierParams : [];
  const n = tiers.length;
  if (!n) return {};
  const L = Math.max(1, Math.min(EXT_MAX_LEVEL, Number(level) || 1));
  const A = tierAnchors(n);
  const keys = [...new Set(tiers.flatMap((t) => Object.keys(t ?? {})))];
  const out = {};
  for (const k of keys) {
    // 欄が無い段は、 前後の段から埋める
    const vals = tiers.map((t) => t?.[k]);
    for (let i = 0; i < n; i++) if (vals[i] === undefined) vals[i] = i > 0 ? vals[i - 1] : vals.find((v) => v !== undefined);
    if (!vals.every(isNum)) { out[k] = vals[Math.min(n - 1, rankOf(L) - 1)]; continue; }
    let v;
    if (n === 1) v = vals[0];
    else if (L <= A[n - 1]) {
      let i = 0;
      while (i < n - 2 && L > A[i + 1]) i++;
      const t = (L - A[i]) / (A[i + 1] - A[i]);
      v = vals[i] + (vals[i + 1] - vals[i]) * t;
    } else {
      const slope = (vals[n - 1] - vals[n - 2]) / (A[n - 1] - A[n - 2]);
      v = vals[n - 1] + slope * (L - A[n - 1]);
      if (slope < 0 && vals[n - 1] > 0) v = Math.max(v, vals[n - 1] * EXT_EXTRAPOLATE_FLOOR);   // 間隔などは縮みすぎない
    }
    out[k] = allInt(vals) ? Math.round(v) : Math.round(v * 100) / 100;
  }
  return out;
}

/** 表示用: 「Lv 7 (3 段目)」のようにランクも分かる文 (= 純関数) */
export function levelLabel(level) {
  return (level | 0) >= LL_LEVEL ? "LL" : `Lv.${level | 0}`;
}
