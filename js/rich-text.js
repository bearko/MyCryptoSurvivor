// ============================================================
// rich-text.js — 説明の文で、 数字と用語を色で目立たせる (= SPEC-144)
// ============================================================
//
// スキルツリーの詳しい欄・ミッションの説明などの文を、 数字 (= 金色) ・用語 (= 水色) ・「」の中 (= 白の太字) に分けて出す。
// 文は data のまま (= 印を書き足さない)。 ここで切り分けるだけなので、 文を足しても自動で色がつく。
// DOM は textContent で入れる (= 文の中身を HTML として読まない)。

import { EXT_MASTERY } from "./skill-data.js";

/** 用語 (= 長いものから当てる。 エクステの名前も) */
const TERMS_JA = [
  "ゴールドダスト", "マジックカード", "ギフト券", "初期武器", "レベルアップ", "ショップ", "クールダウン", "リロール",
  "レアエネミー", "パンケーキ", "棒磁石", "雷鼓", "合体ロボ", "懐中時計", "宝箱", "壺", "ボス", "無敵", "貫通", "弾数",
  "最大 HP", "HP", "CE", "GUM", "Lv",
];
const TERMS_EN = [
  "Gold Dust", "Magic Card", "gift ticket", "starting weapon", "level-up", "level-ups", "shops", "shop", "cooldown", "rerolls",
  "rare enemies", "pancake", "Raiko", "bar magnet", "Combined Robot", "pocket watch", "chests", "chest", "pots", "pot",
  "bosses", "boss", "invincibility", "invincible", "Pierce", "Projectiles", "Max HP", "HP", "CE", "GUM", "Lv",
];
const EXT_NAMES = EXT_MASTERY.flatMap((e) => [e[3], e[4]]);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERMS = [...new Set([...TERMS_JA, ...TERMS_EN, ...EXT_NAMES])].sort((a, b) => b.length - a.length);
// 数字: 符号 (＋ − + - ×) ・ 小数 ・ 単位 (% 秒 体 枚 倍 段 回 マス s)。 「Lv ＋1」 の ＋1 も
const NUM = String.raw`(?:[＋+−\-×]\s?)?\d+(?:[.,]\d+)?(?:\s?(?:%|％|秒|体|枚|倍|段|回|マス|s\b))?`;
// 英字だけの用語は語の切れ目で (= 「pot」 が 「spot」 に当たらないように)
const termRe = (w) => (/^[\x00-\x7f]+$/.test(w) ? `\\b${esc(w)}\\b` : esc(w));
const RE = new RegExp(`(「[^」]*」)|(${NUM})|(${TERMS.map(termRe).join("|")})`, "g");

/** 文を切り分ける (= 純関数)。 [{ kind: "text" | "num" | "term" | "quote", s }] */
export function richParts(text) {
  const s = String(text ?? "");
  const out = [];
  let last = 0;
  for (const m of s.matchAll(RE)) {
    if (m.index > last) out.push({ kind: "text", s: s.slice(last, m.index) });
    out.push({ kind: m[1] ? "quote" : (m[2] ? "num" : "term"), s: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", s: s.slice(last) });
  return out;
}

/** 要素の中身を、 色分けした文にする */
export function setRichText(el, text) {
  if (!el) return el;
  el.textContent = "";
  for (const p of richParts(text)) {
    if (p.kind === "text") { el.append(p.s); continue; }
    const span = el.ownerDocument.createElement("span");
    span.className = `rt-${p.kind}`;
    span.textContent = p.s;
    el.append(span);
  }
  return el;
}

/** 色分けした文の要素を作る (= スキルツリーの h() に渡す) */
export function richNode(tag, className, text) {
  const el = globalThis.document.createElement(tag);
  if (className) el.className = className;
  return setRichText(el, text);
}
