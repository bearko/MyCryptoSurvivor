// ============================================================
// skill-tree.js — スキルツリーの画面 (= SPEC-090 §4・§5)。 参考作の木の画面の作りを写した
// ============================================================
//
// タイトルの上に重ねて開く (= BGM はタイトルの曲のまま。 pauseTime は要らない)。
// 木は絶対配置の <button> と 1 枚の SVG。 つまんで動かす・2 本指で拡大縮小・ホイールで拡大。
// 押すと選ぶ、 2 度押しで買う (= 確認は挟まない)。 根を買うと金の輪が広がって 1 段目が飛び出す。
// 入口: タイトルの「スキルツリー」(= 1 回も遊んでいなければ出さない) と、 結果の画面の「スキルツリーへ」。

import { getMeta, onMetaChange, spend, setNodeRank, resetNodes } from "./meta.js";
import { ROUTES, ROUTE_MAP, NODE_MAP, TREE_NODES, ROOT_ID, CAPSTONE_NEED, nodePos, routeLabelPos } from "./skill-data.js";
import {
  nodeRank, owns, nodeMax, nodeCost, canAfford, shortBy, routeCounts, nodeBlockers, nodeState,
  nodeVisible, nodeShown, claimableNodes, tryBuy, spentTotal,
} from "./skill-logic.js";
import { t, tpl, getLang, onLangChange } from "./i18n.js";
import { img, SFX } from "./constants.js";
import { playSe } from "./audio.js";
import { ICON_GUM, ICON_DUST } from "./meta-ui.js";
import { prefersReducedMotion } from "./motion.js";
import { returnToTitle } from "./battle/gameover.js";

const UNIT = 108;                 // 1 マスのピクセル
const RING_R = 2.6 + 0.9;         // 中心から 1 段目と、 その先の「？」が収まる距離 (マス)
const SVGNS = "http://www.w3.org/2000/svg";
const DBL_TAP_MS = 400;
const NOTICE_MS = 1700;

// ---- 小さな DOM の道具 (= 参考作の h と同じ形) ----
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) { if (sv == null) continue; sk.startsWith("--") ? el.style.setProperty(sk, sv) : (el.style[sk] = sv); }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const clear = (el) => { el.replaceChildren(); return el; };
const L = (o) => (o && typeof o === "object") ? (o[getLang()] ?? o.ja ?? "") : String(o ?? "");
const nameOf = (n) => L(n.name);
const KIND_KEY = { root: "tree.kind.root", repeat: "tree.kind.repeat", perk: "tree.kind.perk", capstone: "tree.kind.capstone" };
const iconUrl = (id) => img(`Image/Extensions/${id}.png`);

// ---- 画面の状態 ----
let _screen = null;       // <section id="skillTreeScreen">
let _open = false;
let _parts = null;        // 開いているあいだの DOM と view
let _selected = null;
let _resetAsk = false;    // 「作り直す」の確認中
let _noticeTimer = 0;
let _lastTap = { id: null, at: 0 };

export function isSkillTreeOpen() { return _open; }

// ============================================================
// 入口 (= main.js が起動時に 1 回呼ぶ)
// ============================================================
export function installSkillTree() {
  _screen = document.getElementById("skillTreeScreen");
  document.getElementById("btnTitleSkillTree")?.addEventListener("click", () => openSkillTree());
  // 結果の画面から: レポートを閉じてタイトルへ戻してから、 その上に開く
  for (const id of ["gameOverSkillTree", "activityReportSkillTree"]) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try { await returnToTitle(); } finally { btn.disabled = false; }
      openSkillTree();
    });
    const ic = btn.querySelector("img");
    if (ic) ic.src = img(ICON_GUM);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && _open) closeSkillTree(); });
  onMetaChange(() => { refreshTitleEntry(); });
  onLangChange(() => { refreshTitleEntry(); if (_open) renderAll(); });
  refreshTitleEntry();
}

/** タイトルの「スキルツリー」: 1 回も遊んでいなければ出さない。 買える節があれば数の札 */
export function refreshTitleEntry() {
  const btn = document.getElementById("btnTitleSkillTree");
  const badge = document.getElementById("titleSkillTreeBadge");
  const m = getMeta();
  if (btn) btn.classList.toggle("hidden", (m.runs | 0) === 0);
  if (badge) {
    const n = claimableNodes(m).length;
    badge.textContent = n > 9 ? "9+" : String(n);
    badge.classList.toggle("hidden", n === 0);
  }
}

// ============================================================
// 開く / 閉じる
// ============================================================
export function openSkillTree({ focus = null } = {}) {
  if (_open || !_screen) return;
  _open = true;
  _selected = null;
  _resetAsk = false;
  _lastTap = { id: null, at: 0 };
  buildScreen();
  _screen.classList.remove("hidden");
  renderAll();
  // 中心へ (= 描いてから寸法を測る)
  requestAnimationFrame(() => {
    if (!_open) return;
    const guide = focus && NODE_MAP[focus] && !owns(getMeta(), focus) && nodeVisible(getMeta(), focus) ? focus : null;
    if (guide) select(guide, true); else centerOn(ROOT_ID);
  });
}

export function closeSkillTree() {
  if (!_open) return;
  _open = false;
  clearTimeout(_noticeTimer);
  _screen?.classList.add("hidden");
  if (_screen) clear(_screen);
  _parts = null;
  refreshTitleEntry();
}

// ============================================================
// 組み立て
// ============================================================
function buildScreen() {
  // ワールド座標の範囲
  const pts = TREE_NODES.map(nodePos).concat(ROUTES.map(routeLabelPos));
  const pad = 2.2;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const W = (Math.max(...pts.map((p) => p.x)) + pad - minX) * UNIT;
  const H = (Math.max(...pts.map((p) => p.y)) + pad - minY) * UNIT;
  const px = (p) => ({ x: (p.x - minX) * UNIT, y: (p.y - minY) * UNIT });

  const bg = h("div", { class: "tree-bg", "aria-hidden": "true", style: { backgroundImage: `url("${img("Image/Backgrounds/1001.png")}")` } });
  const head = h("header", { class: "tree-head" });
  const routeBar = h("div", { class: "tree-routebar" });
  const viewport = h("div", { class: "tree-viewport" });
  const world = h("div", { class: "tree-world", style: { width: `${W}px`, height: `${H}px` } });
  const links = svg("svg", { class: "tree-links", width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  const nodeLayer = h("div", { class: "tree-nodes" });
  const notice = h("div", { class: "tree-notice hidden", role: "status", "aria-live": "polite" });
  const sheet = h("footer", { class: "tree-sheet" });
  world.append(links, nodeLayer);
  viewport.append(world, notice);
  clear(_screen).append(bg, head, routeBar, viewport, sheet);

  const view = { x: 0, y: 0, scale: window.innerWidth < 560 ? 0.62 : 0.85 };
  _parts = { head, routeBar, viewport, world, links, nodeLayer, notice, sheet, view, px, W, H };
  installPanZoom();
}

const applyView = () => {
  const { world, view } = _parts;
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
};

function centerOn(id, animate = false) {
  if (!_parts) return;
  const { viewport, world, view, px } = _parts;
  const p = px(nodePos(NODE_MAP[id]));
  const rect = viewport.getBoundingClientRect();
  view.x = rect.width / 2 - p.x * view.scale;
  view.y = rect.height / 2 - p.y * view.scale;
  world.classList.toggle("glide", animate && !prefersReducedMotion());
  applyView();
  if (animate) setTimeout(() => world.classList.remove("glide"), 450);
}

// ============================================================
// 描画
// ============================================================
function renderAll(fresh = new Map(), burst = false) {
  if (!_parts) return;
  renderHead();
  renderRouteBar();
  renderLinks(fresh, burst);
  renderNodes(fresh, burst);
  renderSheet();
}

/** 頭: 戻る・題・右に残高 (= 選んだ節の費用を「−40」と並べ、 足りないぶんは赤く。 木に重ねないので節が隠れない) */
function renderHead() {
  const m = getMeta();
  const n = _selected ? NODE_MAP[_selected] : null;
  const cost = n && nodeVisible(m, n.id) && nodeState(m, n.id) === "available" ? nodeCost(m, n.id) : { gum: 0, dust: 0 };
  const chip = (cls, icon, label, have, need) => h("span", { class: `tree-bal ${cls} ${need ? (have >= need ? "ok" : "ng") : ""}`, title: label, "aria-label": `${label} ${have | 0}` },
    h("img", { src: img(icon), alt: "", draggable: "false" }),
    h("b", { class: "num" }, (have | 0).toLocaleString()),
    need ? h("i", { class: "num" }, `−${need}`) : null);
  clear(_parts.head).append(
    h("button", { class: "tree-back", type: "button", "aria-label": t("tree.back", "戻る"), onclick: closeSkillTree }, "←"),
    h("div", { class: "tree-title" }, h("b", {}, t("tree.title", "スキルツリー")), h("small", {}, "SKILL TREE")),
    h("div", { class: "tree-bals" },
      chip("gum", ICON_GUM, t("meta.gum", "GUM"), m.gum, cost.gum),
      chip("dust", ICON_DUST, t("meta.dust", "ゴールドダスト"), m.dust, cost.dust)),
  );
}

function renderRouteBar() {
  const m = getMeta();
  const counts = routeCounts(m);
  clear(_parts.routeBar).append(...ROUTES.map((r) => {
    const total = TREE_NODES.filter((x) => x.route === r.id).length;
    const n = counts[r.id] || 0;
    return h("button", {
      class: `route-pip ${n ? "on" : ""}`, type: "button",
      style: { "--c": r.color },
      title: tpl(t("tree.routeNodes", "{name}：{n} / {total}"), { name: L(r.name), n, total }),
      onclick: () => centerOn(TREE_NODES.find((x) => x.route === r.id && x.depth === 1).id, true),
    }, h("span", {}, L(r.name)), h("em", { class: "num" }, `${n}/${total}`));
  }));
}

function linkPath(a, b) {
  const { px } = _parts;
  const pa = px(nodePos(a));
  const pb = px(nodePos(b));
  // 少し曲げて「神経」のような線にする
  const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  const bend = 0.12;
  return `M${pa.x},${pa.y} Q${mx - dy * bend},${my + dx * bend} ${pb.x},${pb.y}`;
}

function renderLinks(fresh, burst) {
  const m = getMeta();
  const { links, px } = _parts;
  clear(links);
  const defs = svg("defs");
  const glow = svg("filter", { id: "treeGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
  glow.append(svg("feGaussianBlur", { stdDeviation: "3", result: "b" }));
  const merge = svg("feMerge");
  merge.append(svg("feMergeNode", { in: "b" }), svg("feMergeNode", { in: "SourceGraphic" }));
  glow.append(merge);
  defs.append(glow);
  links.append(defs);
  // 道の名前 (= 各道の先)
  for (const r of ROUTES) {
    const p = px(routeLabelPos(r));
    const tx = svg("text", { x: p.x, y: p.y, class: "route-label", fill: r.color, "text-anchor": "middle" });
    tx.textContent = L(r.name);
    links.append(tx);
  }
  const still = prefersReducedMotion();
  for (const n of TREE_NODES) {
    if (n.kind === "root" || !nodeShown(m, n.id)) continue;
    const parent = NODE_MAP[n.parent];
    const teaser = !nodeVisible(m, n.id);
    const color = teaser ? "#4a4360" : ROUTE_MAP[n.route].color;
    const on = owns(m, n.id);
    const d = linkPath(parent, n);
    const base = svg("path", { d, class: `link ${on ? "on" : ""} ${teaser ? "teaser" : ""}`, stroke: color });
    links.append(base);
    if (on && !still) links.append(svg("path", { d, class: "link-flow", stroke: color, filter: "url(#treeGlow)" }));
    if (fresh.has(n.id) && !still) {
      const len = base.getTotalLength?.() || 200;
      base.style.strokeDasharray = `${len}`;
      base.style.strokeDashoffset = `${len}`;
      base.classList.add("grow");
      base.style.animationDelay = `${fresh.get(n.id) * (burst ? 70 : 110)}ms`;
    }
  }
}

function nodeClass(m, n) {
  if (!nodeVisible(m, n.id)) return "teaser";
  const st = nodeState(m, n.id);
  if (n.kind === "root") return owns(m, n.id) ? "owned" : "can";
  if (st === "owned") return n.kind === "repeat" || n.kind === "capstone" ? "max" : "owned";
  // 強化の途中の節も、 次の段が取れる＝緑、 足りない＝赤
  if (st === "available") return canAfford(m, nodeCost(m, n.id)) ? "can" : "short";
  if (owns(m, n.id)) return "owned";
  return "locked";
}

function levelText(m, n) {
  if (n.kind === "root") return "";
  if (n.kind === "repeat") return `${nodeRank(m, n.id)}/${n.max}`;
  return owns(m, n.id) ? "1/1" : "0/1";
}

function renderNodes(fresh, burst) {
  const m = getMeta();
  const { nodeLayer, px } = _parts;
  clear(nodeLayer);
  const center = px(nodePos(NODE_MAP[ROOT_ID]));
  const still = prefersReducedMotion();
  for (const n of TREE_NODES) {
    if (!nodeShown(m, n.id)) continue;
    const p = px(nodePos(n));
    const cls = nodeClass(m, n);
    const color = n.route ? ROUTE_MAP[n.route].color : "#f6e2a0";
    const lvl = levelText(m, n);
    const anim = fresh.has(n.id) && !still ? (burst && n.kind !== "root" ? "burst" : "pop") : "";
    const btn = h("button", {
      class: `tnode k-${cls === "teaser" ? "teaser" : n.kind} ${cls} ${_selected === n.id ? "sel" : ""} ${anim} ${cls === "owned" || cls === "max" ? "has" : ""}`,
      type: "button",
      "data-se": "off",
      style: {
        left: `${p.x}px`, top: `${p.y}px`, "--c": color,
        "--fx": `${center.x - p.x}px`, "--fy": `${center.y - p.y}px`,   // 中心から飛び出してくる距離
        animationDelay: anim ? `${fresh.get(n.id) * (burst ? 70 : 110) + (burst ? 250 : 380)}ms` : null,
      },
      "data-id": n.id,
      "aria-label": cls === "teaser" ? t("tree.hidden", "？？？") : nameOf(n),
      // キーボードの Enter / Space だけ (= 指とマウスは pointerup で拾う。 detail 0 がキーボード)
      onclick: (e) => { if (e.detail === 0) tapNode(n.id); },
    },
    h("span", { class: "tnode-panel" }, cls === "teaser" ? h("span", { class: "tnode-q" }, "？") : h("img", { src: iconUrl(n.icon), alt: "", draggable: "false", onerror: (e) => e.target.remove() })),
    lvl && cls !== "teaser" ? h("span", { class: "tnode-lv num" }, cls === "max" ? "MAX" : lvl) : null,
    h("span", { class: "tnode-name" }, cls === "teaser" ? t("tree.hidden", "？？？") : nameOf(n)));
    nodeLayer.append(btn);
  }
}

// ---- 下の欄 ----
const costChips = (cost) => h("span", { class: "cost-row" },
  cost.gum ? h("span", { class: "cost-chip" }, h("img", { src: img(ICON_GUM), alt: "" }), `${cost.gum}`) : null,
  cost.dust ? h("span", { class: "cost-chip dust" }, h("img", { src: img(ICON_DUST), alt: "" }), `${cost.dust}`) : null);

function blockerText(b) {
  if (b.key === "parent") return tpl(t("tree.blockParent", "「{name}」の先"), { name: nameOf(NODE_MAP[b.id]) });
  if (b.key === "route") return tpl(t("tree.blockRoute", "この道の節を {need} つ（いま {n} つ）"), { need: b.need, n: b.n });
  return "";
}

function shortText(m, cost) {
  const s = shortBy(m, cost);
  const list = [];
  if (s.gum) list.push(tpl(t("tree.shortGum", "GUM あと {n}"), { n: s.gum }));
  if (s.dust) list.push(tpl(t("tree.shortDust", "ゴールドダスト あと {n}"), { n: s.dust }));
  return tpl(t("tree.short", "足りない：{list}"), { list: list.join("／") });
}

function renderSheet() {
  const m = getMeta();
  const { sheet } = _parts;
  clear(sheet);
  const add = (...xs) => sheet.append(...xs.flat().filter(Boolean));
  if (!_selected) return renderIdle(add, m);
  const n = NODE_MAP[_selected];
  const closeX = h("button", { class: "sheet-x", type: "button", "aria-label": t("menu.close", "閉じる"), onclick: () => { _selected = null; renderAll(); } }, "×");
  if (!nodeVisible(m, n.id)) {
    const parent = NODE_MAP[n.parent];
    add(
      h("div", { class: "sheet-top" },
        h("div", {}, h("div", { class: "sheet-name" }, t("tree.hidden", "？？？")), h("div", { class: "sheet-meta" }, h("span", { class: "route-tag", style: { "--c": ROUTE_MAP[n.route].color } }, L(ROUTE_MAP[n.route].name)))),
        closeX),
      h("p", { class: "sheet-desc" }, tpl(t("tree.hiddenDesc", "「{name}」を解放すると、この先が見える。"), { name: nameOf(parent) })),
      h("button", { class: "tree-btn", type: "button", onclick: () => select(parent.id, true) }, tpl(t("tree.toParent", "「{name}」へ"), { name: nameOf(parent) })),
    );
    return;
  }
  const st = nodeState(m, n.id);
  const route = n.route ? ROUTE_MAP[n.route] : null;
  const cost = nodeCost(m, n.id);
  const blockers = nodeBlockers(m, n.id);
  const afford = canAfford(m, cost);
  let action;
  if (n.kind === "root" && owns(m, n.id)) action = h("button", { class: "tree-btn", type: "button", disabled: true }, t("tree.rootOwned", "すべてはここから"));
  else if (n.kind === "root") action = h("button", { class: "tree-btn gold", type: "button", onclick: () => unlock(n) }, t("tree.unlockRoot", "解放する（0 GUM）"));
  else if (st === "owned") action = h("button", { class: "tree-btn", type: "button", disabled: true }, n.kind === "repeat" ? t("tree.maxed", "最大") : t("tree.owned", "解放済み"));
  else if (st === "available") {
    action = h("button", { class: "tree-btn gold", type: "button", disabled: !afford, onclick: () => unlock(n) },
      n.kind === "repeat" && nodeRank(m, n.id) > 0 ? t("tree.upgrade", "強化する") : t("tree.unlock", "解放する"), costChips(cost));
  } else action = h("button", { class: "tree-btn", type: "button", disabled: true }, t("tree.locked", "まだ解放できない"), costChips(cost));
  add(
    h("div", { class: "sheet-top" },
      h("div", {},
        h("div", { class: "sheet-name" }, nameOf(n)),
        h("div", { class: "sheet-meta" },
          route ? h("span", { class: "route-tag", style: { "--c": route.color } }, L(route.name)) : null,
          h("span", {}, t(KIND_KEY[n.kind], n.kind)))),
      n.kind === "repeat" ? h("div", { class: "sheet-lv num" }, tpl(t("tree.lv", "Lv {n} / {max}"), { n: nodeRank(m, n.id), max: nodeMax(n) })) : null,
      closeX),
    h("p", { class: "sheet-desc" }, L(n.desc)),
    n.kind === "capstone" ? h("p", { class: "sheet-note" }, tpl(t("tree.capNote", "この道の節を {need} つそろえると解放できる。道の到達点。"), { need: CAPSTONE_NEED })) : null,
    blockers.length && st !== "owned" ? h("p", { class: "sheet-block" }, blockers.map(blockerText).join("／")) : null,
    st === "available" && !afford ? h("p", { class: "sheet-block" }, shortText(m, cost)) : null,
    action,
  );
}

function renderIdle(add, m) {
  const claimable = claimableNodes(m);
  if (_resetAsk) {
    const back = spentTotal(m);
    add(
      h("p", { class: "sheet-desc" }, tpl(t("tree.resetConfirm", "全部戻す？（GUM {gum}・ゴールドダスト {dust} が戻る）"), back)),
      h("div", { class: "sheet-btns two" },
        h("button", { class: "tree-btn sub danger", type: "button", onclick: () => doReset(back) }, t("tree.resetYes", "戻す")),
        h("button", { class: "tree-btn sub", type: "button", onclick: () => { _resetAsk = false; renderSheet(); } }, t("tree.resetNo", "やめる"))),
    );
    return;
  }
  const first = claimable[0];
  add(
    first
      ? h("button", { class: "sheet-go ok", type: "button", onclick: () => select(first.id, true) },
        tpl(t("tree.claimable", "▶ 解放できます：{name}{more}（タップで移動）"), { name: nameOf(first), more: claimable.length > 1 ? tpl(t("tree.claimableMore", " ほか {n}"), { n: claimable.length - 1 }) : "" }))
      : h("p", { class: "sheet-note" }, t("tree.idleHint", "挑戦を終えると GUM が、ボスを倒すとゴールドダストが貯まる。節を 2 回押すと解放。")),
    h("div", { class: "sheet-btns two" },
      h("button", { class: "tree-btn sub", type: "button", onclick: () => centerOn(ROOT_ID, true) }, t("tree.center", "中心へ")),
      h("button", { class: "tree-btn sub", type: "button", disabled: !owns(m, ROOT_ID), onclick: () => { _resetAsk = true; renderSheet(); } }, t("tree.reset", "作り直す"))),
  );
}

// ============================================================
// 操作
// ============================================================
function select(id, move = false) {
  _selected = id;
  _resetAsk = false;
  renderNodes(new Map(), false);
  renderHead();
  renderSheet();
  if (move) centerOn(id, true);
}

function notice(text, kind = "") {
  const { notice: el } = _parts;
  el.textContent = text;
  el.className = `tree-notice ${kind}`;
  clearTimeout(_noticeTimer);
  _noticeTimer = setTimeout(() => el.classList.add("hidden"), NOTICE_MS);
}

/** 買う (= tryBuy で確かめてから meta.js に書く)。 新しく見えた節は中心から近い順に飛び出す */
function unlock(n) {
  const m = getMeta();
  const r = tryBuy(m, n.id);
  if (!r.ok) {
    if (r.reason === "short") notice(shortText(m, r.cost), "bad");
    else if (r.reason === "locked") notice(t("tree.locked", "まだ解放できない"), "bad");
    return;
  }
  const before = new Set(TREE_NODES.filter((x) => nodeShown(m, x.id)).map((x) => x.id));
  if (!spend(r.cost)) return;
  setNodeRank(n.id, r.rank);
  const burst = n.kind === "root";
  playSe(SFX.LEVEL_UP, 0, 0.6);
  notice(r.rank > 1 ? tpl(t("tree.upgraded", "「{name}」Lv {lv}！"), { name: nameOf(n), lv: r.rank }) : tpl(t("tree.bought", "「{name}」を解放！"), { name: nameOf(n) }), "good");
  const after = getMeta();
  const fresh = new Map();
  let i = 0;
  const order = TREE_NODES.filter((x) => nodeShown(after, x.id) && !before.has(x.id))
    .sort((a, b) => (a.depth || 0) - (b.depth || 0) || (ROUTE_MAP[a.route]?.angle ?? 0) - (ROUTE_MAP[b.route]?.angle ?? 0));
  for (const x of order) fresh.set(x.id, i++);
  fresh.set(n.id, 0);
  if (burst) {
    _selected = null;
    if (!prefersReducedMotion()) shockwave();
    zoomToFit();
  }
  renderAll(fresh, burst);
}

function doReset(back) {
  resetNodes(back);
  _resetAsk = false;
  _selected = null;
  playSe(SFX.GEM_PICKUP, 0, 0.5);
  renderAll();
  notice(tpl(t("tree.resetDone", "ツリーを作り直した。GUM {gum}・ゴールドダスト {dust} が戻った"), back), "good");
  centerOn(ROOT_ID, true);
}

/** 中心から光の輪が広がる */
function shockwave() {
  const { world, px } = _parts;
  const c = px(nodePos(NODE_MAP[ROOT_ID]));
  for (let k = 0; k < 3; k++) {
    const ring = h("div", { class: "tree-shock", style: { left: `${c.x}px`, top: `${c.y}px`, animationDelay: `${k * 180}ms` } });
    world.append(ring);
    setTimeout(() => ring.remove(), 1600 + k * 180);
  }
}

/** 新しく見えた枝がおさまるように少し引く */
function zoomToFit() {
  const { viewport, view } = _parts;
  const rect = viewport.getBoundingClientRect();
  const r = RING_R * UNIT;
  view.scale = Math.max(0.55, Math.min(view.scale, Math.min(rect.width, rect.height) / (2 * r)));
  centerOn(ROOT_ID, true);
}

/** 節を押す: 1 度目は選ぶ、 2 度目 (= 0.4 秒以内) で買う */
function tapNode(id) {
  const now = performance.now();
  const dbl = _lastTap.id === id && now - _lastTap.at < DBL_TAP_MS;
  _lastTap = dbl ? { id: null, at: 0 } : { id, at: now };
  if (!dbl) { playSe(SFX.UI_CLICK, 60, 1); return select(id); }
  const m = getMeta();
  const n = NODE_MAP[id];
  if (!nodeVisible(m, id) || (owns(m, id) && n.kind !== "repeat")) return select(id);
  const r = tryBuy(m, id);
  if (!r.ok) {
    if (r.reason === "locked") notice(t("tree.locked", "まだ解放できない"), "bad");
    else if (r.reason === "short") notice(shortText(m, r.cost), "bad");
    return select(id);
  }
  _selected = id;
  unlock(n);
}

// ---- パン・ズーム ----
function installPanZoom() {
  const { viewport, view } = _parts;
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  viewport.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0, target: e.target.closest?.(".tnode") };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: view.x, vy: view.y };
      drag = null;
    }
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const next = Math.min(1.6, Math.max(0.4, (pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
      zoomAt(next, pinch.cx, pinch.cy, pinch);
    } else if (drag) {
      view.x = drag.vx + e.clientX - drag.x;
      view.y = drag.vy + e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
      applyView();
    }
  });
  const up = (e) => {
    if (drag && drag.moved < 6 && drag.target) tapNode(drag.target.dataset.id);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) drag = null;
  };
  viewport.addEventListener("pointerup", up);
  viewport.addEventListener("pointercancel", up);
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const next = Math.min(1.6, Math.max(0.4, view.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    zoomAt(next, e.clientX, e.clientY);
  }, { passive: false });
}

function zoomAt(next, cx, cy, from) {
  const { viewport, view } = _parts;
  const rect = viewport.getBoundingClientRect();
  const ox = cx - rect.left, oy = cy - rect.top;
  const base = from || { vx: view.x, vy: view.y, scale: view.scale };
  const wx = (ox - base.vx) / base.scale;
  const wy = (oy - base.vy) / base.scale;
  view.scale = next;
  view.x = ox - wx * next;
  view.y = oy - wy * next;
  applyView();
}
