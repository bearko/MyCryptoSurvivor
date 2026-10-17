// ============================================================
// perks.js — スキルツリーの効果 (= SPEC-090c)。 取った節の fx を 1 つの表に足し合わせ、 戦闘の定数に写す
// ============================================================
//
// - computePerks(meta): 純関数。 節の段 × fx を足した { hpMul, dmgMul, … }
// - state.perks: いまの挑戦に効いている表 (= startBattle が perksForRun で置く。 RTA では NO_PERKS)
// - 下の小さな関数は、 戦闘の各所が「定数の代わり」に呼ぶ (= state.perks が無ければ元の定数のまま)
// 効果はすべて足し算の倍率 (= 強化エクステンション (SPEC-011) はその上に掛かる。 buffs.js)。

import { state } from "./state.js";
import { TREE_NODES } from "./skill-data.js";
import { nodeRank } from "./skill-logic.js";
import {
  CONTACT_COOLDOWN_MS, REROLL_PER_BATTLE, STOCK_LIMIT_WEAPON, STOCK_LIMIT_BUFF,
  POT_MAX_ON_FIELD, CHEST_TIMES_MS, HEAL_RATIO, THUNDER_BOSS_RATIO,
  BOSS_CHEST, BOSS_CHEST_DROPS, POT_DROPS, RARE_SPAWN_INTERVAL_MS,
} from "./constants.js";

/** 何も取っていないときの表 (= すべて 0。 倍率は 1 + 値、 個数は + 値) */
export const NO_PERKS = Object.freeze({
  hpMul: 0, dmgTakenMul: 0, regen: 0, pancakeHeal: 0, phoenix: 0,
  dmgMul: 0, cdMul: 0, rangeMul: 0, pierce: 0, bullets: 0,
  speedMul: 0, pickupMul: 0, itemPickupMul: 0, iframeMul: 0, dashMul: 0,
  xpMul: 0, reroll: 0, startLevels: 0, stock: 0, skipHeal: 0,
  gumMul: 0, pots: 0, earlyChest: 0, pancakeWeight: 0, rareIntervalSec: 0,
  bossDust: 0, thunderBossRatio: 0, bossChestFast: 0, telegraphSec: 0, bossDmgMul: 0, bossCardRate: 0, bossDmgTakenMul: 0,
});

/** 段で積まず、 値をそのまま置くもの (= 1 つの節しか持たない) */
const SET_KEYS = new Set(["pancakeHeal", "pancakeWeight", "rareIntervalSec", "bossCardRate"]);

/** 取った節の効果を足し合わせる。 純関数 */
export function computePerks(meta) {
  const p = { ...NO_PERKS };
  for (const n of TREE_NODES) {
    const r = nodeRank(meta, n.id);
    if (r <= 0 || !n.fx) continue;
    for (const [k, v] of Object.entries(n.fx)) {
      if (!(k in p)) continue;
      p[k] = SET_KEYS.has(k) ? v : Math.round((p[k] + v * r) * 1000) / 1000;
    }
  }
  return p;
}

/** いまの挑戦の表 (= RTA では切る。 SPEC-090 §7) */
export function perksForRun(meta, { rta = false } = {}) {
  return rta ? { ...NO_PERKS } : computePerks(meta);
}

export function perks() {
  return state.perks ?? NO_PERKS;
}

export function perk(key) {
  return perks()[key] ?? 0;
}

/** 強化エクステンション (buffs.js) の土台 (= resetBuffs がこれを置き、 applyBuff はこれに掛ける)。 純関数 */
export function perkBuffBase(p = NO_PERKS) {
  return {
    hpMaxBonus:       0,
    regenPerSec:      p.regen,
    speedMul:         1 + p.speedMul,
    cdMul:            1 + p.cdMul,
    dmgTakenMul:      1 + p.dmgTakenMul,
    dmgMul:           1 + p.dmgMul,
    bulletCountBonus: p.bullets,
    rangeMul:         1 + p.rangeMul,
    pickupMul:        1 + p.pickupMul,
    pierceBonus:      p.pierce,
  };
}

/** 抽選の表で、 kind の割合を share にする (= ほかの重みはそのまま)。 純関数 */
export function reweight(table, kind, share) {
  const others = table.filter((t) => t.kind !== kind).reduce((a, t) => a + t.w, 0);
  const w = share >= 1 ? others * 99 : (others * share) / (1 - share);
  return table.map((t) => (t.kind === kind ? { ...t, w: Math.round(w) } : t));
}

/** 表の kind の重みを mul 倍にする。 純関数 */
export function scaleWeight(table, kind, mul) {
  return table.map((t) => (t.kind === kind ? { ...t, w: Math.round(t.w * mul) } : t));
}

// ---- 戦闘の各所が定数の代わりに呼ぶもの (= state.perks を読む) ----

export const EARLY_CHEST_MS = 10000;
export const PHOENIX_HP_RATIO = 0.5;
export const PHOENIX_IFRAME_MS = 1500;
export const BOSS_CHEST_FAST = { firstMs: 3000, everyMs: 10000 };

/** 被弾のあとの無敵時間 */
export const contactCooldownMs = () => Math.round(CONTACT_COOLDOWN_MS * (1 + perk("iframeMul")));
/** 1 戦闘のリロールの回数 */
export const rerollsPerBattle = () => REROLL_PER_BATTLE + perk("reroll");
/** 武器 / 強化の枠 */
export const stockLimit = (category) => (category === "buff" ? STOCK_LIMIT_BUFF : STOCK_LIMIT_WEAPON) + perk("stock");
/** 場に出る壺の数 */
export const potMaxOnField = () => POT_MAX_ON_FIELD + perk("pots");
/** ふつうの宝箱が出る時刻 */
export const chestTimesMs = () => (perk("earlyChest") ? [EARLY_CHEST_MS, ...CHEST_TIMES_MS] : CHEST_TIMES_MS);
/** パンケーキの回復 */
export const healRatio = () => perk("pancakeHeal") || HEAL_RATIO;
/** 雷鼓のボスへのダメージ (= 最大 HP の割合) */
export const thunderBossRatio = () => Math.round((THUNDER_BOSS_RATIO + perk("thunderBossRatio")) * 1000) / 1000;
/** ボス戦の宝箱の間隔 */
export const bossChestCfg = () => (perk("bossChestFast") ? { ...BOSS_CHEST, ...BOSS_CHEST_FAST } : BOSS_CHEST);
/** ボス戦の宝箱の中身 */
export const bossChestDrops = () => (perk("bossCardRate") ? reweight(BOSS_CHEST_DROPS, "card", perk("bossCardRate")) : BOSS_CHEST_DROPS);
/** 壺の中身 */
export const potDrops = () => (perk("pancakeWeight") ? scaleWeight(POT_DROPS, "heal", perk("pancakeWeight")) : POT_DROPS);
/** レアエネミーの間隔 */
export const rareIntervalMs = () => (perk("rareIntervalSec") ? perk("rareIntervalSec") * 1000 : RARE_SPAWN_INTERVAL_MS);
/** お助けアイテムを拾う範囲の倍率 */
export const itemPickupMul = () => 1 + perk("itemPickupMul");
/** 経験値の倍率 */
export const xpGainMul = () => 1 + perk("xpMul");
/** ボスの突進・叩きつけの予告 */
export const windupMs = (base) => base + perk("telegraphSec") * 1000;
/** ボスに与えるダメージの倍率 */
export const bossDmgDealtMul = () => 1 + perk("bossDmgMul");
/** ボスから受けるダメージの倍率 */
export const bossDmgTakenMul = () => 1 + perk("bossDmgTakenMul");
/** 無敵時間のあいだの移動速度の倍率 */
export const dashMul = () => 1 + perk("dashMul");
/** 開始 HP (= ヒーローの HP に最大 HP の倍率) */
export const baseMaxHp = (heroMaxHp) => Math.round(heroMaxHp * (1 + perk("hpMul")));

// ---- 画面に出す 1 行 (= ヒーロー選択) ----

const PCT = (v) => `${v >= 0 ? "＋" : "−"}${Math.round(Math.abs(v) * 100)}%`;
const NUM = (v) => `${v >= 0 ? "＋" : "−"}${Math.abs(v)}`;
const LINES = {
  hpMul:           { ja: (v) => `最大 HP ${PCT(v)}`,        en: (v) => `Max HP ${PCT(v)}` },
  dmgTakenMul:     { ja: (v) => `被ダメ ${PCT(v)}`,          en: (v) => `Dmg taken ${PCT(v)}` },
  regen:           { ja: (v) => `回復 ${v}/秒`,              en: (v) => `Regen ${v}/s` },
  pancakeHeal:     { ja: () => "大盛り",                     en: () => "Big Serving" },
  phoenix:         { ja: () => "不死鳥",                     en: () => "Phoenix" },
  dmgMul:          { ja: (v) => `攻撃 ${PCT(v)}`,            en: (v) => `Attack ${PCT(v)}` },
  cdMul:           { ja: (v) => `CD ${PCT(v)}`,              en: (v) => `CD ${PCT(v)}` },
  rangeMul:        { ja: (v) => `範囲 ${PCT(v)}`,            en: (v) => `Range ${PCT(v)}` },
  pierce:          { ja: (v) => `貫通 ${NUM(v)}`,            en: (v) => `Pierce ${NUM(v)}` },
  bullets:         { ja: (v) => `弾数 ${NUM(v)}`,            en: (v) => `Shots ${NUM(v)}` },
  speedMul:        { ja: (v) => `速さ ${PCT(v)}`,            en: (v) => `Speed ${PCT(v)}` },
  pickupMul:       { ja: (v) => `CE の範囲 ${PCT(v)}`,       en: (v) => `CE range ${PCT(v)}` },
  itemPickupMul:   { ja: (v) => `アイテムの範囲 ${PCT(v)}`,  en: (v) => `Item range ${PCT(v)}` },
  iframeMul:       { ja: (v) => `無敵時間 ${PCT(v)}`,        en: (v) => `I-frames ${PCT(v)}` },
  dashMul:         { ja: () => "逃げ足",                     en: () => "Quick Escape" },
  xpMul:           { ja: (v) => `経験値 ${PCT(v)}`,          en: (v) => `XP ${PCT(v)}` },
  reroll:          { ja: (v) => `リロール ${NUM(v)}`,        en: (v) => `Rerolls ${NUM(v)}` },
  startLevels:     { ja: (v) => `開始レベル ${NUM(v)}`,      en: (v) => `Start levels ${NUM(v)}` },
  stock:           { ja: (v) => `枠 ${NUM(v)}`,              en: (v) => `Slots ${NUM(v)}` },
  skipHeal:        { ja: () => "見送りの礼",                 en: () => "Pass Reward" },
  gumMul:          { ja: (v) => `GUM ${PCT(v)}`,             en: (v) => `GUM ${PCT(v)}` },
  pots:            { ja: (v) => `壺 ${NUM(v)}`,              en: (v) => `Pots ${NUM(v)}` },
  earlyChest:      { ja: () => "早い宝箱",                   en: () => "Early Chest" },
  pancakeWeight:   { ja: () => "甘い匂い",                   en: () => "Sweet Scent" },
  rareIntervalSec: { ja: (v) => `レア ${v} 秒ごと`,          en: (v) => `Rare every ${v}s` },
  bossDust:        { ja: (v) => `ダスト ${NUM(v)}`,          en: (v) => `Dust ${NUM(v)}` },
  thunderBossRatio:{ ja: (v) => `雷鼓 ${PCT(v)}`,            en: (v) => `Raiko ${PCT(v)}` },
  bossChestFast:   { ja: () => "急ぎの宝箱",                 en: () => "Hasty Chest" },
  telegraphSec:    { ja: (v) => `予告 ＋${v} 秒`,            en: (v) => `Telegraph +${v}s` },
  bossDmgMul:      { ja: (v) => `対ボス ${PCT(v)}`,          en: (v) => `vs Boss ${PCT(v)}` },
  bossCardRate:    { ja: () => "切り札",                     en: () => "Trump Card" },
  bossDmgTakenMul: { ja: (v) => `ボスの被ダメ ${PCT(v)}`,    en: (v) => `Boss dmg taken ${PCT(v)}` },
};

/** 効いているものだけを短い語で (= 何も無ければ空)。 純関数 */
export function perksSummary(p, lang = "ja") {
  const out = [];
  for (const [k, v] of Object.entries(p ?? {})) {
    if (!v || !LINES[k]) continue;
    const f = LINES[k][lang] ?? LINES[k].ja;
    out.push(f(Math.round(v * 1000) / 1000));
  }
  return out;
}
