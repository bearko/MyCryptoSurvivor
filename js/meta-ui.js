// ============================================================
// meta-ui.js — 結果の画面に出す「GUM ＋N ／ ゴールドダスト ＋M」 (= SPEC-090)
// ============================================================

import { t } from "./i18n.js";
import { img } from "./constants.js";
import { countUp } from "./reveal.js";

export const ICON_GUM = "Image/Icons/gum.png";
export const ICON_DUST = "Image/Icons/gold_dust.webp";

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plus = (n) => `+${Math.round(n).toLocaleString()}`;

/**
 * el の中に報酬の札を描き、 数え上げる。 gum / dust が 0 のものは出さない (= 何も無ければ el を隠す)
 */
export function renderRewards(el, { gum = 0, dust = 0 } = {}, { delayMs = 300 } = {}) {
  if (!el) return;
  const rows = [];
  if (gum > 0) rows.push({ cls: "gum", icon: ICON_GUM, label: t("meta.gum", "GUM"), n: gum });
  if (dust > 0) rows.push({ cls: "dust", icon: ICON_DUST, label: t("meta.dust", "ゴールドダスト"), n: dust });
  el.classList.toggle("hidden", rows.length === 0);
  el.innerHTML = rows.map((r) =>
    `<span class="reward reward--${r.cls}">` +
    `<img class="reward__icon" src="${esc(img(r.icon))}" alt="" onerror="this.remove()" />` +
    `<span class="reward__label">${esc(r.label)}</span>` +
    `<b class="reward__value num" data-n="${r.n | 0}">${esc(plus(0))}</b>` +
    `</span>`).join("");
  let i = 0;
  for (const b of el.querySelectorAll(".reward__value")) {
    countUp(b, Number(b.dataset.n) || 0, { durMs: 600, delayMs: delayMs + i * 150, format: plus });
    i += 1;
  }
}
