// ============================================================
// battle/extra-panels.js — Extra パネル (= SPEC-176。 エンドコンテンツ)
// ============================================================
//
// 店で並べる通常の品が尽きたら (= 装備の枠が全部埋まり、 どれも Lv.MAX)、 商人が難しさに干渉するパネルを売る。
// 1 枚 10,000 CE・各 Lv.10 まで (= レベルを上げても値段は同じ)。 買ったら挑戦が終わるまで効く (= ステージをまたぐ)。
// 見返りはスコアの倍率 (= ABSOLUTE の倍率に足す。 合わせて 2.0 倍まで。 総合スコアは共通基盤が同じ表で計算する)。
// ストーリーと RTA では出さない。 上半分は純関数 (= テストする)。

import { state } from "../state.js";

/** 1 枚の値段 (= レベルを上げても変わらない) と、 各パネルの上限 */
export const EXTRA_PRICE = 10000;
export const EXTRA_MAX_LEVEL = 10;
/** スコアの倍率の上限 (= ABSOLUTE と同じ 2.0。 共通基盤の MUL_MAX) */
export const EXTRA_MUL_MAX = 2.0;

/**
 * パネル。 icon: Image/Enemies/<id>.png (= エネミーとシャドーヒーロー)。 per: 1 レベルあたりの効き目。 add: 1 レベルあたりのスコア倍率
 * (= 共通基盤の scoring/survivor.v5.js の EXTRA_ADD と同じ値にする)
 */
export const EXTRA_PANELS = [
  { id: "horde",    icon: 481,  per: 0.10, add: 0.03 },   // 大軍の令: 敵の数 +10%      (= 呂布)
  { id: "gale",     icon: 396,  per: 0.05, add: 0.03 },   // 疾風の令: 敵の速さ +5%     (= いちばん足の速い雑魚)
  { id: "iron",     icon: 170,  per: 0.10, add: 0.03 },   // 鉄壁の令: 敵の HP +10%     (= いちばん固い雑魚)
  { id: "famine",   icon: 468,  per: 0.10, add: 0.02 },   // 禁止令 パンケーキ: 回復 -10% (= Lv.10 で出ない。 始皇帝)
  { id: "trial",    icon: 433,  per: 0.06, add: 0.01 },   // 試練の令: ミッションの出現率 +6pt (= 40% → 100%。 クレオパトラ)
  { id: "harsh",    icon: 519,  per: 0.10, add: 0.02 },   // 苛烈の令: ミッションの時間と撃破の条件 +10% (= 武田信玄)
  { id: "bell",     icon: 373,  per: 10,   add: 0.03 },   // 早鐘: ボスが 10 秒早く来る (= 4:00 → 2:20。 魔王ファオ)
  { id: "overlord", icon: 893,  per: 0.10, add: 0.03 },   // 覇王の令: ボスの HP と攻撃 +10% (= 項羽)
];
export const EXTRA_MAP = Object.fromEntries(EXTRA_PANELS.map((p) => [p.id, p]));

/** レベルの表を正す (= 知らないパネル・範囲の外を落とす) */
export function normalizeExtra(raw) {
  const out = {};
  for (const p of EXTRA_PANELS) {
    const lv = Math.floor(Number(raw?.[p.id] ?? 0));
    if (lv > 0) out[p.id] = Math.min(EXTRA_MAX_LEVEL, lv);
  }
  return out;
}

/** 効き目 (= levels: { id: Lv })。 どれも買っていなければ効かない値 */
export function extraModsOf(levels = {}) {
  const lv = (id) => Math.max(0, Math.min(EXTRA_MAX_LEVEL, levels?.[id] | 0));
  const P = EXTRA_MAP;
  return {
    spawnMul: 1 + lv("horde") * P.horde.per,
    speedMul: 1 + lv("gale") * P.gale.per,
    hpMul: 1 + lv("iron") * P.iron.per,
    healMul: Math.max(0, 1 - lv("famine") * P.famine.per),
    missionChanceAdd: lv("trial") * P.trial.per,
    missionMul: 1 + lv("harsh") * P.harsh.per,
    bossEarlyMs: lv("bell") * P.bell.per * 1000,
    bossMul: 1 + lv("overlord") * P.overlord.per,
  };
}

/** スコアの倍率に足す分 (= 小数 2 桁) */
export function extraScoreAdd(levels = {}) {
  const sum = EXTRA_PANELS.reduce((a, p) => a + Math.max(0, Math.min(EXTRA_MAX_LEVEL, levels?.[p.id] | 0)) * p.add, 0);
  return Math.round(sum * 100) / 100;
}

/** スコアの倍率 (= 難易度の倍率 + パネル。 2.0 倍まで) */
export function scoreMulWithExtra(regMul, levels = {}) {
  return Math.min(EXTRA_MUL_MAX, Math.round((regMul + extraScoreAdd(levels)) * 100) / 100);
}

// ---- 下半分: 戦闘の状態 ----

/** いまの挑戦で使えるか (= ストーリーと RTA は出さない) */
export function extraAllowed({ story = false, rta = false } = {}) {
  return !story && !rta;
}

/** 買ったレベル (= state.shop.extra。 ステージをまたいで残る) */
export function extraLevels() {
  return state.shop?.extra ?? {};
}

/** いま効いている効き目 */
export function extraMods() {
  return extraModsOf(extraLevels());
}
