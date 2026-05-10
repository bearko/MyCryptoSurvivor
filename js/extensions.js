// ============================================================
// extensions.js — エクステンションのロスター読み込み + 参照ヘルパ
// ============================================================
//
// SPEC-003: bearko/mycryptoheroes 図鑑由来のエクステンションを fetch + 参照する。
// SPEC-011: schema v2 = 17 系列 × 5 段階レアリティ。 entry は category (weapon/buff) と
// archetype (radial/orbit/.../hpMaxUp 等) を持つ。 tier 名 / スキル名 / 効果説明テンプレを
// 内蔵し、 武器も強化も同じ shape で扱う。

import { img } from "./constants.js";
import { loadJson } from "./data-loader.js";

export const EXT_ROSTER = [];
export const EXT_DEFS   = {};

/**
 * Extensions JSON v2 を fetch + 整形して EXT_ROSTER / EXT_DEFS を満たす。
 * @returns {Promise<Array>} EXT_ROSTER
 */
export function loadExtensions() {
  return loadJson("extensions", "./data/extensions.json", (raw) => {
    const arr = Array.isArray(raw?.extensions) ? raw.extensions : [];
    if (raw?.version !== 2) {
      console.warn("extensions.json version mismatch (expected 2):", raw?.version);
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
 * @returns {"weapon"|"buff"|undefined}
 */
export function getCategory(ext) {
  return ext?.category;
}

/**
 * 図鑑画像 URL。 schema v2 では entry.iconId (= MCH ext ID) を画像 ID として使う。
 * 後方互換として entry.extId フォールバックも見る。
 */
export function extImg(extOrId) {
  const id = (typeof extOrId === "object")
    ? (extOrId.iconId ?? extOrId.extId)
    : (() => {
        const e = getExt(extOrId);
        return e?.iconId ?? extOrId;
      })();
  return img(`Image/Extensions/${id}.png`);
}

/**
 * SPEC-021: tier ごとのアイコン URL を返す。
 * ext.tierIconIds[level-1] が無ければ ext.iconId にフォールバック。
 * @param {object} ext - extension entry (必須)
 * @param {number} level - 1..5
 */
export function extTierImg(ext, level) {
  if (!ext) return img(`Image/Extensions/0.png`);
  const idx = Math.max(0, Math.min((ext.tierIconIds?.length ?? 1) - 1, (level | 0) - 1));
  const id = ext.tierIconIds?.[idx] ?? ext.iconId;
  return img(`Image/Extensions/${id}.png`);
}

/**
 * tier index (0..4) でローカライズ済の tier 名を返す。
 * @param {object} ext - extension entry
 * @param {number} level - 1..5 (= tier index = level-1)
 * @param {string} lang
 */
export function getTierName(ext, level, lang) {
  if (!ext) return "";
  const idx = Math.max(0, Math.min((ext.tierNames?.length ?? 1) - 1, (level | 0) - 1));
  const t = ext.tierNames?.[idx];
  if (!t) return "";
  return t[lang] ?? t.ja ?? t.en ?? "";
}

/**
 * skillDescTpl を tierParams[level-1] で fill して返す。
 * テンプレ内の `{cd}` は `tierParams.cdMs / 1000` を 1 桁で展開する特例。
 */
export function getSkillDesc(ext, level, lang) {
  if (!ext) return "";
  const tplObj = ext.skillDescTpl;
  const idx = Math.max(0, Math.min((ext.tierParams?.length ?? 1) - 1, (level | 0) - 1));
  const params = ext.tierParams?.[idx] ?? {};
  const tplStr = (tplObj && (tplObj[lang] ?? tplObj.ja ?? tplObj.en)) ?? "";
  return _fill(tplStr, params);
}

export function getSkillName(ext, lang) {
  const n = ext?.skillName;
  if (!n) return "";
  return n[lang] ?? n.ja ?? n.en ?? "";
}

/**
 * SPEC-002 互換: 旧 `ext.name` を見ていた呼出を受けるため、 tier 1 の名前にフォールバック。
 */
export function localizedExtName(ext, lang) {
  if (!ext) return "";
  if (ext.name) {
    if (typeof ext.name === "string") return ext.name;
    return ext.name?.[lang] ?? ext.name?.ja ?? ext.name?.en ?? "";
  }
  return getTierName(ext, 1, lang);
}

function _fill(tplStr, params) {
  if (!tplStr) return "";
  return tplStr.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === "cd") {
      const ms = params.cdMs ?? 0;
      return (ms / 1000).toFixed(1);
    }
    const v = params[key];
    return v == null ? `{${key}}` : String(v);
  });
}
