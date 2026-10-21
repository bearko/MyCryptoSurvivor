// ============================================================
// battle/revive-picks.js — 復活の画面の「おすすめの強化」 (= SPEC-155)。 木へ行かずにここで 1 回押して強化する
// ============================================================
//
// 倒れた理由 (= SPEC-148 のおすすめの節) を先に、 足りなければいま買える節を安い順に足して 3 つまで。
// 根をまだ取っていなければ、 まず根 (= 0 GUM)。 押すと木と同じ手順で買う (= tryBuy → spend → setNodeRank)。
// 上半分は純関数 (= テストする)。 下半分が DOM。

import { getMeta, spend, setNodeRank } from "../meta.js";
import { tryBuy, claimableNodes, nodeCost, nodeRank, nodeMax, owns } from "../skill-logic.js";
import { NODE_MAP, ROOT_ID } from "../skill-data.js";
import { t, getLang } from "../i18n.js";
import { img, SFX } from "../constants.js";
import { playSe } from "../audio.js";
import { setRichText } from "../rich-text.js";

export const PICKS_MAX = 3;

/**
 * おすすめの節の id (= 純関数)。 meta: いまの木。 adviceNodes: SPEC-148 のおすすめ (= 無ければ [])
 *   根をまだ取っていなければ [] (= SPEC-157: 初回は「スキルツリーへ」から木が広がるのを見てもらう。 おすすめは 2 回目から)。
 *   取ってあれば おすすめのうち買えるもの → 残りを安い順 (= 得意武器は除く) で 3 つまで
 */
export function pickRecommendations(meta, adviceNodes = []) {
  if (!meta || !owns(meta, ROOT_ID)) return [];
  const can = claimableNodes(meta);
  const canIds = new Set(can.map((n) => n.id));
  const out = [];
  for (const id of adviceNodes) if (canIds.has(id) && !out.includes(id)) out.push(id);
  const rest = can.filter((n) => !out.includes(n.id) && n.id !== "wm_main")
    .sort((a, b) => (nodeCost(meta, a.id).gum - nodeCost(meta, b.id).gum) || (nodeCost(meta, a.id).dust - nodeCost(meta, b.id).dust));
  for (const n of rest) { if (out.length >= PICKS_MAX) break; out.push(n.id); }
  return out.slice(0, PICKS_MAX);
}

/** 買う (= 木の unlock と同じ手順)。 { ok, rank } */
export function buyPick(id) {
  const m = getMeta();
  const r = tryBuy(m, id);
  if (!r.ok) return { ok: false, reason: r.reason };
  if (!spend(r.cost)) return { ok: false, reason: "short" };
  setNodeRank(id, r.rank);
  return { ok: true, rank: r.rank, cost: r.cost };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * 描く。 adviceNodes: SPEC-148 のおすすめ。 onBought(id, rank): 買えたら (= 復活のボタンを脈打たせるなど)
 */
export function renderRevivePicks(el, { adviceNodes = [], onBought = null } = {}) {
  if (!el) return;
  const m = getMeta();
  const ids = pickRecommendations(m, adviceNodes);
  el.classList.toggle("hidden", ids.length === 0);
  if (!ids.length) { el.innerHTML = ""; return; }
  const lang = getLang();
  el.innerHTML =
    `<p class="picks__title">${esc(t("picks.title", "おすすめの強化"))} <span class="picks__gum num">${esc(t("meta.gum", "GUM"))} ${esc(String(m.gum | 0))}</span></p>` +
    ids.map((id) => {
      const n = NODE_MAP[id];
      const cost = nodeCost(m, id);
      const rank = nodeRank(m, id), max = nodeMax(n);
      const rankText = n.kind === "repeat" ? `Lv ${rank} → ${rank + 1} / ${max}` : "";
      const costText = cost.dust > 0 ? `${cost.gum} GUM ＋ ${cost.dust} ${t("meta.dust", "ゴールドダスト")}` : (cost.gum > 0 ? `${cost.gum} GUM` : t("picks.free", "無料"));
      return `<div class="pick" data-node="${esc(id)}">` +
        `<img class="pick__icon" src="${esc(img(`Image/Extensions/${n.icon}.png`))}" alt="" onerror="this.remove()" />` +
        `<div class="pick__body"><div class="pick__name">${esc(n.name?.[lang] ?? n.name?.ja ?? id)}${rankText ? ` <span class="pick__rank num">${esc(rankText)}</span>` : ""}</div>` +
        `<p class="pick__desc"></p></div>` +
        `<button type="button" class="btn pick__buy"><span class="pick__cost num">${esc(costText)}</span><span>${esc(t("picks.buy", "強化"))}</span></button>` +
        `</div>`;
    }).join("");
  for (const row of el.querySelectorAll(".pick")) {
    const id = row.dataset.node;
    const n = NODE_MAP[id];
    setRichText(row.querySelector(".pick__desc"), n.desc?.[lang] ?? n.desc?.ja ?? "");
    row.querySelector(".pick__buy").addEventListener("click", () => {
      const r = buyPick(id);
      if (!r.ok) { playSe(SFX.UI_CLICK, 0, 0.3); return; }
      playSe(SFX.LEVEL_UP, 0, 0.5);
      renderRevivePicks(el, { adviceNodes, onBought });
      onBought?.(id, r.rank);
    });
  }
}
