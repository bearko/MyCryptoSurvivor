// ============================================================
// heroes.js — ヒーローロスター読み込み + 参照ヘルパ (= SPEC-003 MCH 図鑑連携)
// ============================================================
//
// `data/heroes.json` (v2) を一度だけ fetch し、 以降は HERO_ROSTER / HERO_DEFS から参照する。
// 画像 URL は `ASSET_BASE/Image/Heroes/{heroId}.png` (= bearko/mycryptoheroes 図鑑直結)。
// onerror フォールバックは描画側で行う。

import { img } from "./constants.js";
import { loadJson } from "./data-loader.js";

export const HERO_ROSTER = [];      // [{heroId, name, faction, rarity, attributes, stats}, ...]
export const HERO_DEFS   = {};      // heroId(string) → hero

const FACTION_EMOJI = {
  SEIRYU:  "🐉",   // 青龍 / 東 / 木
  SUZAKU:  "🔥",   // 朱雀 / 南 / 火
  BYAKKO:  "🐅",   // 白虎 / 西 / 金
  GENBU:   "🐢",   // 玄武 / 北 / 水
  KOURYU:  "🐲",   // 黄龍 / 中央 / 土
};

/**
 * Heroes JSON を fetch + 整形して HERO_ROSTER / HERO_DEFS を満たす。
 * 重複 fetch はしない (= loadJson 側で cache)。
 * @returns {Promise<Array>} HERO_ROSTER
 */
export function loadHeroes() {
  return loadJson("heroes", "./data/heroes.json", (raw) => {
    const arr = Array.isArray(raw?.heroes) ? raw.heroes : [];
    if (raw?.version !== 2) {
      console.warn("heroes.json version mismatch (expected 2):", raw?.version);
    }
    HERO_ROSTER.length = 0;
    for (const k of Object.keys(HERO_DEFS)) delete HERO_DEFS[k];
    for (const h of arr) {
      HERO_ROSTER.push(h);
      HERO_DEFS[String(h.heroId)] = h;
    }
    return HERO_ROSTER;
  });
}

/**
 * @param {number|string} heroId
 * @returns {object|undefined}
 */
export function getHero(heroId) {
  return HERO_DEFS[String(heroId)];
}

/**
 * @param {number|string} heroId
 * @returns {string}
 */
export function heroImg(heroId) {
  return img(`Image/Heroes/${heroId}.png`);
}

/**
 * @param {string} faction - GENBU / SUZAKU / BYAKKO / SEIRYU / KOURYU
 * @returns {string}
 */
export function factionEmoji(faction) {
  return FACTION_EMOJI[faction] || "✦";
}

/**
 * @param {object} hero
 * @param {string} lang - "ja" | "en"
 * @returns {string}
 */
export function localizedHeroName(hero, lang) {
  if (!hero) return "";
  const n = hero.name;
  if (typeof n === "string") return n;
  return n?.[lang] ?? n?.ja ?? n?.en ?? "";
}

/**
 * attributes 配列を hint 行向けの 1 行に整形する。
 * MCH 図鑑由来の attributes は英語固定 (= 言語非依存)。
 * @param {object} hero
 * @returns {string}
 */
export function heroAttributesLine(hero) {
  if (!hero || !Array.isArray(hero.attributes)) return "";
  return hero.attributes.join(" / ");
}
