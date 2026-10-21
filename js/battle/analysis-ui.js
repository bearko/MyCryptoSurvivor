// ============================================================
// battle/analysis-ui.js — 負けた理由の分析の表 (= SPEC-148)。 倒れた画面と全クリアの画面に描く
// ============================================================
//
// 数字は run-stats.js (= 純関数) が作る。 ここは集めて (= collectAnalysis)、 描く (= renderAnalysis) だけ。
//   被ダメの内訳 (= 接触 / 弾 / ボス / 仕掛け) → とどめ → 今回・前回・自己ベストの表 → 与ダメ (= 武器ごと) → マインちゃんのおすすめ
// 前回は「同じヒーロー・同じモード」の前回の敗北 (= クリアの画面では前回のクリア)。 自己ベストは長く生き残った挑戦。
// 色は SPEC-144 の rich-text と同じ (= 数字は金・用語は水色)。

import { state } from "../state.js";
import { t, tpl, getLang } from "../i18n.js";
import { getExt, localizedExtName } from "../extensions.js";
import { NODE_MAP } from "../skill-data.js";
import { formatElapsed } from "../survival.js";
import { isEasy } from "../easy.js";
import { summarize, rememberRun, loadRunLog, saveRunLog, runLogKey, suggest, COMPARE_ROWS, compareRow } from "./run-stats.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => Math.round(Number(n) || 0).toLocaleString();

/** 与ダメの出どころの名前 (= w:<extId> は武器の名前) */
export function srcLabel(src) {
  const s = String(src ?? "other");
  if (s.startsWith("w:")) {
    const id = s.slice(2);
    return localizedExtName(getExt(id), getLang()) || `#${id}`;
  }
  return t(`analysis.src.${s}`, s);
}

/** 節の名前 (= おすすめに出す) */
export function nodeName(id) {
  const n = NODE_MAP[id];
  return n ? (n.name?.[getLang()] ?? n.name?.ja ?? id) : id;
}

/** おすすめの文に入れる名前 */
export function adviceVars(sug) {
  return { a: nodeName(sug?.nodes?.[0] ?? ""), b: nodeName(sug?.nodes?.[1] ?? "") };
}

/**
 * この挑戦の数字をまとめ、 記録に足して、 比べる相手を返す (= 倒れた・全クリアのときに 1 回)
 *   返す: { sum, prev, best, newBest, cleared }
 */
export function collectAnalysis({ cleared = false } = {}) {
  const sum = summarize(state.run?.stats, { level: state.level, stage: state.currentStageIdx ?? 0 });
  const key = runLogKey(state.ownedHero?.heroId, { easy: isEasy(), regulation: state.regulation });
  const r = rememberRun(loadRunLog(), key, sum, cleared);
  saveRunLog(r.log);
  return { sum, prev: r.prev, best: r.best, newBest: r.newBest, cleared };
}

const TAKEN_LABEL = (kind) => t(`analysis.kind.${kind}`, kind);
const WEAPON_COLORS = ["#ffb37a", "#7fd6ff", "#c99bff", "#9ef0b0", "#ffe17a", "#ff9bf5"];

function bar(parts, colorOf) {
  const segs = parts.filter((p) => p.pct > 0).map((p) =>
    `<span class="anl__seg" style="width:${p.pct}%;background:${colorOf(p)}" title="${esc(p.label)} ${p.pct}%"></span>`).join("");
  const legend = parts.filter((p) => p.pct > 0).map((p) =>
    `<span class="anl__chip"><i class="anl__dot" style="background:${colorOf(p)}"></i>${esc(p.label)} <b class="num">${p.pct}%</b></span>`).join("");
  return `<div class="anl__bar">${segs}</div><div class="anl__legend">${legend}</div>`;
}

function rowValue(key, v) {
  if (v == null) return "—";
  if (key === "sec") return formatElapsed(Math.round(v));
  if (key === "dps") return (Math.round(v * 10) / 10).toLocaleString();
  return num(v);
}
function deltaText(row) {
  if (row.delta == null || row.delta === 0) return "";
  const d = row.key === "sec" ? formatElapsed(Math.abs(Math.round(row.delta))) : (row.key === "dps" ? Math.abs(row.delta).toLocaleString() : num(Math.abs(row.delta)));
  const arrow = row.delta > 0 ? "▲" : "▼";
  const cls = row.up == null ? "" : (row.up ? " anl__d--up" : " anl__d--down");
  return `<span class="anl__d${cls}">${arrow}${esc(d)}</span>`;
}

/**
 * 表を描く
 * @param {HTMLElement} el   #gameOverAnalysis / #activityReportAnalysis
 * @param {{sum, prev, best, newBest, cleared}} a   collectAnalysis の結果
 * @param {{advice?: boolean, onNode?: (id: string) => void}} opt  advice: マインちゃんのおすすめを出す (= 倒れたとき)
 */
export function renderAnalysis(el, a, { advice = false, onNode = null } = {}) {
  if (!el) return;
  const sum = a?.sum;
  if (!sum || (sum.sec <= 0 && sum.takenTotal <= 0 && sum.dealtTotal <= 0)) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  const taken = sum.taken.map((x) => ({ ...x, label: TAKEN_LABEL(x.kind) }));
  const takenColor = (p) => ({ contact: "#ff9b6a", shot: "#7fd6ff", boss: "#c99bff", gimmick: "#ffe17a" }[p.kind] ?? "#ccc");
  const weapons = sum.weapons.slice(0, 5).map((w, i) => ({ ...w, label: srcLabel(w.src), i }));
  const wColor = (p) => WEAPON_COLORS[p.i % WEAPON_COLORS.length];

  const prevLabel = t(a.cleared ? "analysis.prevClear" : "analysis.prevDefeat", a.cleared ? "前回のクリア" : "前回の敗北");
  const rows = COMPARE_ROWS.map(({ key, better }) => {
    const r = compareRow(key, sum, a.prev, better);
    const b = a.best ? rowValue(key, a.best[key]) : "—";
    return `<tr><th>${esc(t(`analysis.row.${key}`, key))}</th>` +
      `<td class="num anl__now">${esc(rowValue(key, r.now))}</td>` +
      `<td class="num">${esc(rowValue(key, r.prev))}${deltaText(r)}</td>` +
      `<td class="num anl__best">${esc(b)}</td></tr>`;
  }).join("");

  let html =
    `<p class="anl__title">${esc(t(a.cleared ? "analysis.titleClear" : "analysis.title", a.cleared ? "この挑戦の数字" : "倒れた理由"))}` +
    (a.newBest ? ` <span class="anl__new">${esc(t("analysis.newBest", "自己ベスト更新！"))}</span>` : "") + `</p>`;
  if (sum.takenTotal > 0) {
    html += `<div class="anl__sec"><span class="anl__k">${esc(t("analysis.taken", "被ダメ"))} <b class="num">${num(sum.takenTotal)}</b></span>${bar(taken, takenColor)}</div>`;
  }
  if (!a.cleared && sum.killer) {
    const who = sum.killer.name ? esc(sum.killer.name) : esc(TAKEN_LABEL(sum.killer.kind));
    html += `<div class="anl__sec anl__killer"><span class="anl__k">${esc(t("analysis.killer", "とどめ"))}</span> <b>${who}</b>` +
      (sum.killer.name ? `<span class="anl__kind">（${esc(TAKEN_LABEL(sum.killer.kind))}）</span>` : "") + `</div>`;
  }
  html += `<table class="anl__cmp"><thead><tr><th></th><th>${esc(t("analysis.now", "今回"))}</th><th>${esc(prevLabel)}</th><th>${esc(t("analysis.best", "自己ベスト"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  if (sum.dealtTotal > 0) {
    html += `<div class="anl__sec"><span class="anl__k">${esc(t("analysis.dealt", "与ダメ"))} <b class="num">${num(sum.dealtTotal)}</b>` +
      (sum.dealtBoss > 0 ? ` <span class="anl__sub">${esc(tpl(t("analysis.toBoss", "ボスへ {n}"), { n: num(sum.dealtBoss) }))}</span>` : "") +
      `</span>${bar(weapons, wColor)}</div>`;
  }
  const sug = advice ? suggest(sum) : null;
  if (sug) {
    const chips = sug.nodes.map((id) => `<button type="button" class="anl__node" data-node="${esc(id)}">${esc(nodeName(id))} ▶</button>`).join("");
    html += `<div class="anl__advice"><span class="anl__k">${esc(t("analysis.advice", "マインちゃんのおすすめ"))}</span>` +
      `<p class="anl__advice-text">${esc(tpl(t(sug.key, sug.key), adviceVars(sug)))}</p>${chips ? `<div class="anl__nodes">${chips}</div>` : ""}</div>`;
  }
  el.innerHTML = html;
  if (onNode) {
    for (const btn of el.querySelectorAll(".anl__node")) btn.addEventListener("click", () => onNode(btn.dataset.node));
  }
}
