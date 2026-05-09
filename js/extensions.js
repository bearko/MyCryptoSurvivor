// ============================================================
// extensions.js — エクステンション (= 装備) ロスター読み込み + 参照ヘルパ
// ============================================================
//
// SPEC-003: bearko/mycryptoheroes 図鑑由来のエクステンションを fetch + 参照する。
// UI への接続は後続 SPEC (= クラフト / 装備 SPEC) で行うが、 データソース層は先行整備。

import { img } from "./constants.js";
import { loadJson } from "./data-loader.js";

export const EXT_ROSTER = [];
export const EXT_DEFS   = {};

/**
 * Extensions JSON を fetch + 整形して EXT_ROSTER / EXT_DEFS を満たす。
 * @returns {Promise<Array>} EXT_ROSTER
 */
export function loadExtensions() {
  return loadJson("extensions", "./data/extensions.json", (raw) => {
    const arr = Array.isArray(raw?.extensions) ? raw.extensions : [];
    if (raw?.version !== 1) {
      console.warn("extensions.json version mismatch (expected 1):", raw?.version);
    }
    EXT_ROSTER.length = 0;
    for (const k of Object.keys(EXT_DEFS)) delete EXT_DEFS[k];
    for (const e of arr) {
      EXT_ROSTER.push(e);
      EXT_DEFS[String(e.extId)] = e;
    }
    return EXT_ROSTER;
  });
}

/**
 * @param {number|string} extId
 * @returns {object|undefined}
 */
export function getExt(extId) {
  return EXT_DEFS[String(extId)];
}

/**
 * @param {number|string} extId
 * @returns {string}
 */
export function extImg(extId) {
  return img(`Image/Extensions/${extId}.png`);
}

/**
 * @param {object} ext
 * @param {string} lang
 * @returns {string}
 */
export function localizedExtName(ext, lang) {
  if (!ext) return "";
  const n = ext.name;
  if (typeof n === "string") return n;
  return n?.[lang] ?? n?.ja ?? n?.en ?? "";
}
