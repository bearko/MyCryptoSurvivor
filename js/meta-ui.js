// ============================================================
// meta-ui.js — 結果の画面に出す「GUM ＋N ／ ゴールドダスト ＋M」 (= SPEC-090)
// ============================================================

import { t, tpl } from "./i18n.js";
import { formatElapsed } from "./survival.js";   // SPEC-136
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

/**
 * SPEC-136: GUM の内訳 (= 遊んだぶんが、 それぞれ GUM になった式)。
 *   r: { rows: [{ key, n, rate, gum, kills?, stageNos? }], bonus, mul, missions, missionGum, gum }
 *   1 行: 「生存時間 04:34 ｜ 1 GUM × 274 秒 ｜ 274」。 最後に合計
 */
export function renderGumBreakdown(el, r) {
  if (!el) return;
  const rows = r?.rows ?? [];
  const lines = [];
  const num = (n) => Math.round(n).toLocaleString();
  const fx = (rate, n, unit = "") => tpl(t("gum.fx", "{rate} GUM × {n}{unit}"), { rate: String(rate), n: num(n), unit });
  for (const x of rows) {
    if (x.key === "sec") lines.push([t("gum.sec", "生存時間"), formatElapsed(x.n), fx(x.rate, x.n, t("gum.unit.sec", " 秒")), x.gum]);
    else if (x.key === "kills") lines.push([t("gum.kills", "撃破数"), tpl(t("gum.killsN", "{n} 体"), { n: num(x.kills ?? 0) }), fx(x.rate, x.n, t("gum.unit.kills", "（20 体ごと）")), x.gum]);
    else if (x.key === "stage") lines.push([t("gum.stage", "ステージクリア"), tpl(t("gum.stageN", "{n} 回"), { n: String(x.stageNos?.length ?? 1) }),
      (x.stageNos?.length ?? 0) > 1 ? tpl(t("gum.fxStages", "{rate} GUM × ({list})"), { rate: String(x.rate), list: x.stageNos.join(" ＋ ") }) : fx(x.rate, x.n), x.gum]);
    else if (x.key === "level") lines.push([t("gum.level", "到達レベル"), `Lv.${x.n}`, fx(x.rate, x.n), x.gum]);
    else if (x.key === "gifts") lines.push([t("gum.gifts", "所持ギフト券"), tpl(t("gum.giftsN", "{n} 枚"), { n: String(x.n) }), fx(x.rate, x.n), x.gum]);
  }
  if ((r?.missionGum | 0) > 0) lines.push([t("gum.missions", "ミッション達成"), tpl(t("gum.stageN", "{n} 回"), { n: String(r.missions | 0) }), "", r.missionGum]);
  if ((r?.bonus | 0) > 0) lines.push([t("gum.bonus", "スキルツリー"), t("gum.bonusWhat", "金勘定・金運"), `＋${Math.round((r.mul ?? 0) * 100)}%`, r.bonus]);
  el.classList.toggle("hidden", lines.length === 0);
  if (!lines.length) { el.innerHTML = ""; return; }
  const total = lines.reduce((a, l) => a + (l[3] | 0), 0);
  el.innerHTML =
    `<p class="gum-bd__title">${esc(t("gum.title", "GUM の内訳"))}</p>` +
    lines.map(([k, v, f, g]) =>
      `<div class="gum-bd__row"><span class="gum-bd__k">${esc(k)} <b>${esc(v)}</b></span>` +
      `<span class="gum-bd__f">${esc(f)}</span><span class="gum-bd__v num">${esc(f ? "＝ " : "")}${esc(num(g))}</span></div>`).join("") +
    `<div class="gum-bd__row gum-bd__sum"><span class="gum-bd__k">${esc(t("gum.total", "合計"))}</span><span class="gum-bd__f"></span>` +
    `<span class="gum-bd__v num">${esc(num(total))} GUM</span></div>`;
}
