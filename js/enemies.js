// ============================================================
// enemies.js — エネミー (= 戦闘相手) ロスター読み込み + 参照ヘルパ
// ============================================================
//
// SPEC-003: bearko/mycryptoheroes 図鑑由来のエネミーを fetch + 参照する。
// UI への接続は後続 SPEC (= 戦闘 / 遭遇 SPEC) で行うが、 データソース層は先行整備。

import { img } from "./constants.js";
import { loadJson } from "./data-loader.js";

export const ENEMY_ROSTER = [];
export const ENEMY_DEFS   = {};

/**
 * Enemies JSON を fetch + 整形して ENEMY_ROSTER / ENEMY_DEFS を満たす。
 * @returns {Promise<Array>} ENEMY_ROSTER
 */
export function loadEnemies() {
  return loadJson("enemies", "./data/enemies.json", (raw) => {
    const arr = Array.isArray(raw?.enemies) ? raw.enemies : [];
    if (raw?.version !== 1) {
      console.warn("enemies.json version mismatch (expected 1):", raw?.version);
    }
    ENEMY_ROSTER.length = 0;
    for (const k of Object.keys(ENEMY_DEFS)) delete ENEMY_DEFS[k];
    for (const e of arr) {
      ENEMY_ROSTER.push(e);
      ENEMY_DEFS[String(e.enemyId)] = e;
    }
    return ENEMY_ROSTER;
  });
}

/**
 * @param {number|string} enemyId
 * @returns {object|undefined}
 */
export function getEnemy(enemyId) {
  return ENEMY_DEFS[String(enemyId)];
}

/**
 * 図鑑側は `Image/Enemies/{filename}.png` だが、 命名は file 名ベースで統一性が低い。
 * 当面 enemyId.png のシンボリック参照とし、 onerror で透明化する設計とする。
 * @param {number|string} enemyId
 * @returns {string}
 */
export function enemyImg(enemyId) {
  return img(`Image/Enemies/${enemyId}.png`);
}

/**
 * @param {object} enemy
 * @param {string} lang
 * @returns {string}
 */
export function localizedEnemyName(enemy, lang) {
  if (!enemy) return "";
  const n = enemy.name;
  if (typeof n === "string") return n;
  return n?.[lang] ?? n?.ja ?? n?.en ?? "";
}
