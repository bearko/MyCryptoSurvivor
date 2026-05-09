// ============================================================
// heroes.js — ヒーローロスター読み込み + 参照ヘルパ
// ============================================================
//
// `data/heroes.json` を一度だけ fetch し、 以降は HERO_ROSTER / HERO_DEFS から参照する。
// 画像 URL は `ASSET_BASE/Image/Heroes/{heroId}.png`。 onerror フォールバックは描画側で行う。
//
// SPEC-002 — Hero Roster

import { img } from "./constants.js";
import { loadJson } from "./data-loader.js";

export const HERO_ROSTER = [];      // [{heroId, name, element, rarity, stats, blurb}, ...]
export const HERO_DEFS   = {};      // heroId(string) → hero

const ELEMENT_EMOJI = {
  garuda:    "🌿",
  ifrit:     "🔥",
  leviathan: "💧",
  tiamat:    "⛰",
};

/**
 * Heroes JSON を fetch + 整形して HERO_ROSTER / HERO_DEFS を満たす。
 * 重複 fetch はしない (= loadJson 側で cache)。
 * @returns {Promise<Array>} HERO_ROSTER
 */
export function loadHeroes() {
  return loadJson("heroes", "./data/heroes.json", (raw) => {
    const arr = Array.isArray(raw?.heroes) ? raw.heroes : [];
    if (raw?.version !== 1) {
      console.warn("heroes.json version mismatch:", raw?.version);
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
 * @param {string} element
 * @returns {string}
 */
export function elementEmoji(element) {
  return ELEMENT_EMOJI[element] || "✦";
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
 * @param {object} hero
 * @param {string} lang - "ja" | "en"
 * @returns {string}
 */
export function localizedHeroBlurb(hero, lang) {
  if (!hero) return "";
  const b = hero.blurb;
  if (typeof b === "string") return b;
  return b?.[lang] ?? b?.ja ?? b?.en ?? "";
}
