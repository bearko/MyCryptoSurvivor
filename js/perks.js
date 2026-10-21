// ============================================================
// perks.js — スキルツリーの効果 (= SPEC-090c)。 取った節の fx を 1 つの表に足し合わせ、 戦闘の定数に写す
// ============================================================
//
// - computePerks(meta): 純関数。 節の段 × fx を足した { hpMul, dmgMul, … }
// - state.perks: いまの挑戦に効いている表 (= startBattle が perksForRun で置く。 RTA では NO_PERKS)
// - 下の小さな関数は、 戦闘の各所が「定数の代わり」に呼ぶ (= state.perks が無ければ元の定数のまま)
// 効果はすべて足し算の倍率 (= 強化エクステンション (SPEC-011) はその上に掛かる。 buffs.js)。

import { state } from "./state.js";
import { TREE_NODES, EXT_MASTERY, MAIN_CHANCE_PER_RANK } from "./skill-data.js";
import { nodeRank } from "./skill-logic.js";
import {
  CONTACT_COOLDOWN_MS, REROLL_PER_BATTLE, STOCK_LIMIT_WEAPON, STOCK_LIMIT_BUFF,
  POT_MAX_ON_FIELD, CHEST_TIMES_MS, HEAL_RATIO, THUNDER_BOSS_RATIO,
  BOSS_CHEST, BOSS_CHEST_DROPS, POT_DROPS, RARE_SPAWN_INTERVAL_MS,
  CHEST_DROPS, ROBOT_EXT_IDS, ROBOT_SEC, ROBOT_DROP_W,
} from "./constants.js";

/** 何も取っていないときの表 (= すべて 0。 倍率は 1 + 値、 個数は + 値) */
export const NO_PERKS = Object.freeze({
  hpMul: 0, dmgTakenMul: 0, regen: 0, pancakeHeal: 0, phoenix: 0,
  dmgMul: 0, cdMul: 0, rangeMul: 0, pierce: 0, bullets: 0,
  speedMul: 0, pickupMul: 0, itemPickupMul: 0, iframeMul: 0, dashMul: 0,
  xpMul: 0, reroll: 0, startLevels: 0, stock: 0, skipHeal: 0,
  gumMul: 0, pots: 0, earlyChest: 0, pancakeWeight: 0, rareIntervalSec: 0,
  bossDust: 0, thunderBossRatio: 0, bossChestFast: 0, telegraphSec: 0, bossDmgMul: 0, bossCardRate: 0, bossDmgTakenMul: 0,
  // SPEC-131: エクステ別 (= 武器の威力 wdmg_<extId> ・ 強化の値引き cut_<extId>)
  ...Object.fromEntries(EXT_MASTERY.map(([, extId, kind]) => [kind === "w" ? `wdmg_${extId}` : `cut_${extId}`, 0])),
  // SPEC-139: 武器の目利き (= cut_<extId>)・仕込み (= slv_<extId>)・得意武器
  ...Object.fromEntries(EXT_MASTERY.filter((e) => e[2] === "w").map(([, extId]) => [`cut_${extId}`, 0])),
  ...Object.fromEntries(EXT_MASTERY.map(([, extId]) => [`slv_${extId}`, 0])),
  mainBias: 0,
  robot: 0,   // SPEC-140: 合体ロボの段
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
    ceGainMul:        1,   // SPEC-108: クラウン (= 拾う CE の倍率。 スキルツリーの「学びの速さ」とは別に掛かる)
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
/** SPEC-140: 合体ロボを解放していれば表に足す (= 純関数) */
export function withRobot(table, w, rank = perk("robot")) {
  return rank > 0 && w > 0 ? [...table, { kind: "robot", w }] : table;
}
/** SPEC-140: 合体ロボの段 (= 0 は出ない)・絵・無敵の秒 */
export const robotRank = () => Math.max(0, Math.min(ROBOT_SEC.length, perk("robot") | 0));
export const robotExtId = (rank = robotRank()) => ROBOT_EXT_IDS[Math.max(1, rank) - 1];
export const robotSec = (rank = robotRank()) => ROBOT_SEC[Math.max(1, rank) - 1];
/** ボス戦の宝箱の中身 */
export const bossChestDrops = () => withRobot(perk("bossCardRate") ? reweight(BOSS_CHEST_DROPS, "card", perk("bossCardRate")) : BOSS_CHEST_DROPS, ROBOT_DROP_W.boss);
/** 壺の中身 */
export const potDrops = () => withRobot(perk("pancakeWeight") ? scaleWeight(POT_DROPS, "heal", perk("pancakeWeight")) : POT_DROPS, ROBOT_DROP_W.pot);
/** SPEC-140: ふつうの宝箱の中身 (= RTA は懐中時計の表のまま。 スキルツリーも切れているので出ない) */
export const chestDropsFor = (rta) => (rta ? null : withRobot(CHEST_DROPS, ROBOT_DROP_W.chest));
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
  xpMul:           { ja: (v) => `拾う CE ${PCT(v)}`,         en: (v) => `CE ${PCT(v)}` },
  reroll:          { ja: (v) => `リロール ${NUM(v)}`,        en: (v) => `Rerolls ${NUM(v)}` },
  startLevels:     { ja: (v) => `開始の CE ＋${v * 20}`,     en: (v) => `Start CE +${v * 20}` },   // SPEC-109: 1 段 = 20 CE
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

// ---- SPEC-093: スキルツリーの「いまの効果」の欄 ----

/** 数値を変える効果 (= 欄に 1 行ずつ。 道の順)。 f: pct (割合) / num (個数) / sec (秒) / ps (毎秒) / every (秒ごと) */
export const STAT_ROWS = [
  { key: "hpMul",            route: "vit", f: "pct", ja: "最大 HP",         en: "Max HP" },
  { key: "dmgTakenMul",      route: "vit", f: "pct", ja: "被ダメ",          en: "Damage taken" },
  { key: "regen",            route: "vit", f: "ps",  ja: "自然回復",        en: "Regen" },
  { key: "dmgMul",           route: "atk", f: "pct", ja: "攻撃",            en: "Attack" },
  { key: "cdMul",            route: "atk", f: "pct", ja: "クールダウン",    en: "Cooldown" },
  { key: "rangeMul",         route: "atk", f: "pct", ja: "範囲",            en: "Range" },
  { key: "bullets",          route: "atk", f: "num", ja: "弾数",            en: "Projectiles" },
  { key: "pierce",           route: "atk", f: "num", ja: "貫通",            en: "Pierce" },
  { key: "speedMul",         route: "mov", f: "pct", ja: "移動速度",        en: "Move speed" },
  { key: "pickupMul",        route: "mov", f: "pct", ja: "CE を拾う範囲",   en: "CE pickup" },
  { key: "itemPickupMul",    route: "mov", f: "pct", ja: "アイテムの範囲",  en: "Item pickup" },
  { key: "iframeMul",        route: "mov", f: "pct", ja: "無敵時間",        en: "I-frames" },
  { key: "xpMul",            route: "grw", f: "pct", ja: "拾う CE",         en: "CE gained" },
  { key: "reroll",           route: "grw", f: "num", ja: "リロール",        en: "Rerolls" },
  { key: "startLevels",      route: "grw", f: "ce20", ja: "開始の CE",      en: "Start CE" },
  { key: "stock",            route: "grw", f: "num", ja: "武器と強化の枠",  en: "Slots" },
  { key: "gumMul",           route: "trs", f: "pct", ja: "GUM",             en: "GUM" },
  { key: "pots",             route: "trs", f: "num", ja: "壺",              en: "Pots" },
  { key: "rareIntervalSec",  route: "trs", f: "every", ja: "レアエネミー",  en: "Rare enemies" },
  { key: "bossDust",         route: "trs", f: "num", ja: "ボスのダスト",    en: "Boss Dust" },
  { key: "thunderBossRatio", route: "bos", f: "pct", ja: "雷鼓の対ボス",    en: "Raiko vs boss" },
  { key: "telegraphSec",     route: "bos", f: "sec", ja: "ボスの予告",      en: "Boss telegraph" },
  { key: "bossDmgMul",       route: "bos", f: "pct", ja: "対ボスの攻撃",    en: "Damage to bosses" },
  { key: "bossDmgTakenMul",  route: "bos", f: "pct", ja: "ボスからの被ダメ", en: "Damage from bosses" },
  // SPEC-131: エクステ別 (= 武器の威力・強化の値引き)
  ...EXT_MASTERY.map(([route, extId, kind, ja, en]) => kind === "w"
    ? { key: `wdmg_${extId}`, route, f: "pct", ja: `${ja}の威力`, en: `${en} damage` }
    : { key: `cut_${extId}`, route, f: "cut", ja: `${ja}の値段`, en: `${en} price` }),
  // SPEC-139: 武器の目利き・仕込み・得意武器
  ...EXT_MASTERY.filter((e) => e[2] === "w").map(([route, extId, , ja, en]) => ({ key: `cut_${extId}`, route, f: "cut", ja: `${ja}の値段`, en: `${en} price` })),
  ...EXT_MASTERY.map(([route, extId, , ja, en]) => ({ key: `slv_${extId}`, route, f: "lv", ja: `${ja}の初期レベル`, en: `${en} start level` })),
  { key: "mainBias", route: "wm", f: "main", ja: "初期武器が必ず並ぶ確率", en: "Starting weapon guaranteed" },
  { key: "robot", route: "itm", f: "robot", ja: "合体ロボの無敵", en: "Robot invincibility" },   // SPEC-140
];
const STAT_KEYS = new Set(STAT_ROWS.map((r) => r.key));

/** 1 つの値を短い文字に (= 純関数) */
export function formatStat(f, v, lang = "ja") {
  const r = Math.round(v * 1000) / 1000;
  const sign = r >= 0 ? "＋" : "−";
  const a = Math.abs(r);
  if (f === "pct") return `${sign}${Math.round(a * 100)}%`;
  if (f === "num") return `${sign}${a}`;
  if (f === "cut") return `−${Math.round(a * 100)}%`;
  if (f === "lv") return `Lv ＋${a}`;   // SPEC-139: 仕込み
  if (f === "main") return `${Math.round(a * MAIN_CHANCE_PER_RANK * 100)}%`;   // SPEC-144: 得意武器 (= 段 × 20%)
  if (f === "robot") { const s = ROBOT_SEC[Math.max(1, Math.min(ROBOT_SEC.length, a)) - 1]; return lang === "en" ? `${s}s` : `${s} 秒`; }   // SPEC-140   // SPEC-131: 値引き (= 正の数で持つ)
  if (f === "ce20") return `${sign}${a * 20}`;   // SPEC-109: 先手は 1 段 = 20 CE
  if (f === "sec") return lang === "en" ? `+${a}s` : `＋${a} 秒`;
  if (f === "ps") return lang === "en" ? `${a}/s` : `${a}/秒`;
  if (f === "every") return lang === "en" ? `every ${a}s` : `${a} 秒ごと`;
  return String(r);
}

/**
 * 欄の行 (= 純関数)。 now: いまの表、 next: 選んだ節を買ったあとの表 (= 無ければ null)
 *   返す: { rows: [{ key, route, label, value, next, changed }], flags: [名前] }
 *   rows はいま効いているものと、 next で変わるものだけ。 flags は数値でない効果 (= 大盛りなど) の名前
 */
export function perkRows(now, next = null, lang = "ja") {
  const rows = [];
  for (const r of STAT_ROWS) {
    const a = now?.[r.key] ?? 0;
    const b = next ? (next[r.key] ?? 0) : a;
    const changed = !!next && a !== b;
    if (!a && !changed) continue;
    rows.push({
      key: r.key, route: r.route, label: lang === "en" ? r.en : r.ja,
      value: a ? formatStat(r.f, a, lang) : "—",
      next: changed ? formatStat(r.f, b, lang) : null,
      changed,
    });
  }
  const flags = [];
  for (const [k, v] of Object.entries(now ?? {})) {
    if (!v || STAT_KEYS.has(k) || !LINES[k]) continue;
    flags.push((LINES[k][lang] ?? LINES[k].ja)(v));
  }
  return { rows, flags };
}

/** SPEC-131: その武器の威力の倍率 (= 武器の極意) */
export const weaponDmgMul = (extId) => 1 + perk(`wdmg_${extId}`);
/** SPEC-131: その強化エクステのショップの値引き (= 強化の目利き。 0〜0.3) */
export const buffPriceCut = (extId) => Math.min(0.9, Math.max(0, perk(`cut_${extId}`)));
/** SPEC-144: 得意武器 (= 札を引くときに初期武器が必ず並ぶ確率。 0〜0.6) */
export const mainWeaponChance = () => Math.min(1, Math.max(0, perk("mainBias") * MAIN_CHANCE_PER_RANK));
/** SPEC-139: 仕込み (= 手に入れたときに足す Lv) */
export const startLevelBonus = (extId) => Math.max(0, perk(`slv_${extId}`) | 0);
