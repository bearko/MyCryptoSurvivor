// ============================================================
// skill-tree.js — スキルツリーの画面 (= SPEC-090 §4・§5)。 参考作の木の画面の作りを写した
// ============================================================
//
// タイトルの上に重ねて開く (= BGM はタイトルの曲のまま。 pauseTime は要らない)。
// 木は絶対配置の <button> と 1 枚の SVG。 つまんで動かす・2 本指で拡大縮小・ホイールで拡大。
// 押すと選ぶ、 2 度押しで買う (= 確認は挟まない)。 根を買うと金の輪が広がって 1 段目が飛び出す。
// 入口: タイトルの「スキルツリー」(= 1 回も遊んでいなければ出さない) と、 結果の画面の「スキルツリーへ」。

import { richNode } from "./rich-text.js";   // SPEC-144
import { isEasy } from "./easy.js";   // SPEC-147
import { chatDockWidth, onChatDockChange } from "./chat-dock.js";   // SPEC-156
import { bulkPlan } from "./skill-bulk.js";   // SPEC-157: 一括解放
import { chatLayout, chatShown, setChatCollapsed } from "./platform.js";   // SPEC-156
import { getMeta, onMetaChange, spend, setNodeRank, resetNodes } from "./meta.js";
import { ROUTES, ROUTE_MAP, NODE_MAP, TREE_NODES, ROOT_ID, CAPSTONE_NEED, nodePos, routeLabelPos } from "./skill-data.js";
import { getUnlockedHeroes, unlockOf, GAME_TITLES } from "./hero-unlock.js";   // SPEC-133: ヒーローの条件
import { getHero, localizedHeroName } from "./heroes.js";
import {
  nodeRank, owns, nodeMax, nodeCost, canAfford, shortBy, routeCounts, nodeState,
  nodeVisible, nodeShown, claimableNodes, tryBuy, spentTotal,
  treeNudge, treeGuide, guideTarget, heroOk,
} from "./skill-logic.js";
import { t, tpl, getLang, onLangChange } from "./i18n.js";
import { img, SFX } from "./constants.js";
import { playSe } from "./audio.js";
import { ICON_GUM, ICON_DUST } from "./meta-ui.js";
import { prefersReducedMotion } from "./motion.js";
import { state } from "./state.js";
import { computePerks, perksSummary, perkRows } from "./perks.js";   // SPEC-090c: ヒーロー選択の 1 行 / SPEC-093: いまの効果の欄
import { naviSay, naviHide, naviLines, naviTitle, setTitleExtra } from "./navi.js";   // SPEC-093

const UNIT = 108;                 // 1 マスのピクセル
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
/** SPEC-133: 木の判定に使う状態 (= 保存の中身 ＋ 使えるヒーロー。 武器の極意の条件) */
const treeMeta = () => ({ ...getMeta(), heroes: getUnlockedHeroes() });
/** SPEC-133: 「霧隠才蔵を仲間にする」 (= ほかのタイトルなら、 その名前も) */
function heroCondText(heroId) {
  const hero = getHero(heroId);
  const name = hero ? localizedHeroName(hero, getLang()) : String(heroId);
  const u = unlockOf(heroId);
  return u && u.game !== "survivor"
    ? tpl(t("tree.condHeroOther", "「{name}」を仲間にする（{game} で）"), { name, game: GAME_TITLES[u.game]?.name ?? u.game })
    : tpl(t("tree.condHero", "「{name}」を仲間にする"), { name });
}

// ---- 画面の状態 ----
let _screen = null;       // <section id="skillTreeScreen">
let _open = false;
let _parts = null;        // 開いているあいだの DOM と view
let _selected = null;
let _resetAsk = false;    // 「作り直す」の確認中
let _noticeTimer = 0;
let _lastTap = { id: null, at: 0 };
let _statsOpen = false;   // 狭い画面の「いまの効果」の札 (= 既定は閉じる)
let _bulkDust = false;    // SPEC-157: 一括解放でゴールドダストも使うか (= 既定は使わない。 開いているあいだだけ覚える)
let _hintSaid = false;    // タイトルの案内 (= 起動中に 1 回)
const NAVI_TREE_HIDE_MS = 2600;
const WIDE = typeof matchMedia === "function" ? matchMedia("(min-width: 861px)") : { matches: false, addEventListener() {} };   // SPEC-135: Workshop と同じ 860px で分ける
const WIDE_MIN = 861;
/** SPEC-156: 広い画面か (= 窓の幅からチャットのドックのぶんを引いて見る) */
const isWide = () => (typeof window !== "undefined" ? window.innerWidth : 0) - chatDockWidth() >= WIDE_MIN;

export function isSkillTreeOpen() { return _open; }

// ============================================================
// 入口 (= main.js が起動時に 1 回呼ぶ)
// ============================================================
export function installSkillTree() {
  _screen = document.getElementById("skillTreeScreen");
  document.getElementById("btnTitleSkillTree")?.addEventListener("click", () => openSkillTree());
  // 結果の画面から (= ゲームオーバー・全クリア・SPEC-132 のステージクリア): その画面を隠して木を開き、 閉じたら元の画面に戻す
  for (const [id, modalId, midRun, retry, next] of [
    ["gameOverSkillTree", "gameOverModal", false, true],   // SPEC-146: 倒れたあとは木から「もう一度挑む」
    ["activityReportSkillTree", "activityReportModal", false],
    ["stageTransitionSkillTree", "stageTransitionModal", true, false, true],   // SPEC-161: ステージクリアからは木から「次のノードに挑む」
  ]) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      const back = document.getElementById(modalId) ?? btn.closest('[role="dialog"]');
      openSkillTree({ returnTo: back, midRun, retry: !!retry, next: !!next });
    });
    const ic = btn.querySelector("img");
    if (ic) ic.src = img(ICON_GUM);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && _open) closeSkillTree(); });
  // 幅が 860px をまたいだら組み直す (= 右の列 ⇔ 下の欄)。 見ている場所と選んだ節はそのまま
  const rebuild = () => {
    if (!_open || !_parts) return;
    const view = { ..._parts.view };
    buildScreen();
    Object.assign(_parts.view, view);
    applyView();
    renderAll();
  };
  WIDE.addEventListener?.("change", rebuild);
  onChatDockChange(rebuild);   // SPEC-156: ドックを畳む・広げると、 木の幅が変わる
  onMetaChange(() => { refreshTitleEntry(); });
  onLangChange(() => { refreshTitleEntry(); renderHeroPerks(); if (_open) renderAll(); });
  // SPEC-093: 根をまだ取っていなければ、 タイトルでマインちゃんが入口を教える (= 起動中に 1 回)
  setTitleExtra(() => {
    if (_hintSaid || _open || !treeNudge(treeMeta())) return [];
    _hintSaid = true;
    return naviLines("treeHint");
  });
  refreshTitleEntry();
}

/** タイトルの「スキルツリー」: 1 回も遊んでいなければ出さない。 買える節があれば数の札 */
export function refreshTitleEntry() {
  const btn = document.getElementById("btnTitleSkillTree");
  const badge = document.getElementById("titleSkillTreeBadge");
  const m = treeMeta();
  if (btn) btn.classList.toggle("hidden", (m.runs | 0) === 0);
  // SPEC-093: 根をまだ取っていなければ、 入口を脈打たせて「NEW」 (= タイトルと結果の画面)
  const nudge = treeNudge(m);
  for (const id of ["btnTitleSkillTree", "gameOverSkillTree", "activityReportSkillTree", "stageTransitionSkillTree"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle("tree-nudge", nudge);
    el.dataset.new = t("tree.new", "NEW");
  }
  const n = claimableNodes(m).length;
  for (const b of [badge, document.getElementById("stageTreeBadge")]) {   // SPEC-132: ステージクリアの画面にも、 解放できる数
    if (!b) continue;
    b.textContent = n > 9 ? "9+" : String(n);
    b.classList.toggle("hidden", n === 0);
  }
}

/** SPEC-090c: ヒーロー選択の見せ場の下に、 いま効いている恒久強化を 1 行 (= 無ければ出さない。 RTA では「効かない」と 1 行) */
export function renderHeroPerks() {
  const el = document.getElementById("heroPerks");
  if (!el) return;
  const m = treeMeta();
  if (state.rtaMode) {
    const any = owns(m, ROOT_ID);
    el.textContent = any ? t("hero.perks.rta", "RTA ではスキルツリーの効果は切れる") : "";
    el.classList.toggle("hidden", !any);
    return;
  }
  const lines = perksSummary(computePerks(m), getLang());
  el.classList.toggle("hidden", lines.length === 0);
  el.textContent = lines.length ? `${t("hero.perks.title", "スキルツリー")}：${lines.join("・")}` : "";
}

// ============================================================
// 開く / 閉じる
// ============================================================
/**
 * returnTo: 木を開くあいだ隠し、 閉じたら戻す画面 (= 結果の画面)。 無ければタイトルの上に開く
 * midRun: 挑戦の途中 (= ステージクリア)。 「次のステージから効く」と出す
 */
let _returnTo = null;
let _midRun = false;
let _retry = false;   // SPEC-146: 倒れたあとに開いた (= 「もう一度挑む」を木の右下に)
let _next = false;    // SPEC-161: ステージクリアから開いた (= 同じ場所に「次のノードに挑む」。 元の画面に戻らず次のステージへ)
let _go = null;       // SPEC-165: ストーリーの 3-1 (= 根を取ったら「ステージへ ▶」。 押すと閉じてステージを始める)
let _bought = 0;      // SPEC-146: 開いているあいだに取った・上げた数
export function openSkillTree({ focus = null, returnTo = null, midRun = false, retry = false, next = false, go = null } = {}) {
  if (_open || !_screen) return;
  _open = true;
  _returnTo = returnTo;
  _midRun = !!midRun;
  _retry = !!retry;
  _next = !!next && !retry;
  _go = typeof go === "function" ? go : null;
  _bought = 0;
  _returnTo?.classList.add("hidden");   // SPEC-132: 元の画面は消さずに隠すだけ (= 閉じたらそのまま戻る)
  document.getElementById("reviveFx")?.classList.add("revive-fx--hold");   // SPEC-152: 渦の canvas は木より上なので、 開いているあいだは隠す
  _selected = null;
  _resetAsk = false;
  _lastTap = { id: null, at: 0 };
  buildScreen();
  _screen.classList.remove("hidden");
  renderAll();
  // 中心へ (= 描いてから寸法を測る)
  requestAnimationFrame(() => {
    if (!_open) return;
    const guide = focus && NODE_MAP[focus] && !owns(treeMeta(), focus) && nodeVisible(treeMeta(), focus) ? focus : null;
    if (guide) select(guide, true); else centerOn(ROOT_ID);
    sayOnOpen();
  });
}

// ============================================================
// SPEC-093: マインちゃん (= 木の左上の小窓)。 案内の段なら案内、 そうでなければ開いたときのひとこと
// ============================================================
function naviTop() {
  const r = _parts?.viewport.getBoundingClientRect();
  return r ? r.top + 8 : 96;
}

function guideLine(m) {
  const step = treeGuide(m);
  if (step === "root") return "root";
  if (step === "first") return guideTarget(m) ? "first" : "noGum";
  return null;
}

function sayTree(step, { stay = false } = {}) {
  if (!_open || !step) return;
  naviSay(naviLines("tree", { step }), { place: "tree", top: naviTop(), autoHideMs: stay ? 0 : NAVI_TREE_HIDE_MS });
}

function sayOnOpen() {
  const m = treeMeta();
  const g = guideLine(m);
  if (g) return sayTree(g, { stay: true });
  sayTree(claimableNodes(m).length ? "claimable" : "idle");
}

/** SPEC-146: 木からそのまま「もう一度挑む」 (= 結果の画面を通らずにステージ 1 から) */
function retryFromTree() {
  _returnTo = null;   // 結果の画面には戻さない
  closeSkillTree();
  import("./battle/gameover.js").then((g) => g.applyRetry()).catch(() => {});
}

/** SPEC-165: ストーリーの木 (= 根を取ったら「ステージへ ▶」で閉じて始める) */
function goFromTree() {
  const fn = _go; _go = null;
  _returnTo = null;
  closeSkillTree();
  fn?.();
}

/** SPEC-161: 木からそのまま「次のノードに挑む」 (= ステージクリアの画面に戻らずに次のステージへ) */
function nextFromTree() {
  _returnTo = null;   // ステージクリアの画面には戻さない (= 隠れたまま。 次のステージが始まる)
  closeSkillTree();
  // SPEC-165: ストーリーは結果の画面の「次のステージへ」と同じ道 (= 詳細の画面に戻って旅の演出。 直接始めるとランドの演出が飛ぶ)
  Promise.all([import("./battle/stage-transition.js"), import("./story.js")]).then(([m, S]) => (S.isStory() ? m.proceedStory() : m.proceedToNextStage())).catch(() => {});
}

export function closeSkillTree() {
  if (!_open) return;
  _open = false;
  clearTimeout(_noticeTimer);
  _screen?.classList.add("hidden");
  document.getElementById("reviveFx")?.classList.remove("revive-fx--hold");   // SPEC-152
  if (_screen) clear(_screen);
  _parts?.ac?.abort();   // SPEC-134: window の受け口を外す
  _parts = null;
  refreshTitleEntry();
  // SPEC-093: 戻った先 (= タイトル) のセリフ
  naviHide();
  // SPEC-132: 結果の画面から開いたなら、 その画面に戻す
  if (_returnTo) {
    const back = _returnTo;
    _returnTo.classList.remove("hidden"); _returnTo = null;
    // SPEC-146: 倒れたあとなら、 マインちゃんが「もう一度挑む」へ (= 強くしたかで言い分ける)
    if (_retry && back.id === "gameOverModal") import("./battle/gameover.js").then((g) => g.onBackFromTree({ bought: _bought, fromTree: true })).catch(() => {});
    return;
  }
  if (!document.getElementById("titleScreen")?.classList.contains("hidden")) naviTitle({ greet: false });
}

// ============================================================
// SPEC-134: 動かし方 (= MyCryptoWorkshop の作り。 パン・ピンチ・ホイール・ミニマップ・道へ移動・全体を表示)
// ============================================================
const MAX_ZOOM = 1.6;
const MINIMAP_W = 150, MINIMAP_H = 110;
/** マス目の範囲 (= 全体を表示・ミニマップ・ズームの下限に使う) */
const BOUNDS = TREE_NODES.reduce((b, n) => ({ x0: Math.min(b.x0, n.x), x1: Math.max(b.x1, n.x), y0: Math.min(b.y0, n.y), y1: Math.max(b.y1, n.y) }), { x0: 0, x1: 0, y0: 0, y1: 0 });

/** ズームの範囲: 上限 1.6。 下限は木全体が余白 1.5 マスつきで収まる倍率 (= 0.35 を超えない) */
function clampZoom(z) {
  const r = _parts.viewport.getBoundingClientRect();
  const margin = 1.5;
  const fit = Math.min(r.width / ((BOUNDS.x1 - BOUNDS.x0 + margin * 2) * UNIT), r.height / ((BOUNDS.y1 - BOUNDS.y0 + margin * 2) * UNIT));
  const min = r.width > 0 && r.height > 0 ? Math.min(0.35, fit) : 0.35;
  return Math.min(MAX_ZOOM, Math.max(min, z));
}

/** マス目の (gx, gy) を表示の真ん中へ */
function panTo(gx, gy, animate = false) {
  if (!_parts) return;
  const { viewport, world, view, px } = _parts;
  const p = px({ x: gx, y: gy });
  const rect = viewport.getBoundingClientRect();
  view.x = rect.width / 2 - p.x * view.scale;
  view.y = rect.height / 2 - p.y * view.scale;
  world.classList.toggle("glide", animate && !prefersReducedMotion());
  applyView();
  if (animate) setTimeout(() => world.classList.remove("glide"), 450);
}

/** 道の中心 (= いま取れる節の平均。 無ければ見えている節、 それも無ければ道全体) */
export function branchCenter(routeId, m) {
  const all = TREE_NODES.filter((n) => n.route === routeId);
  const open = all.filter((n) => nodeVisible(m, n.id) && nodeState(m, n.id) === "available");
  const seen = all.filter((n) => nodeShown(m, n.id));
  const ns = open.length ? open : seen.length ? seen : all;
  return { x: ns.reduce((a, n) => a + n.x, 0) / ns.length, y: ns.reduce((a, n) => a + n.y, 0) / ns.length };
}

/** 全体を表示 (= いちばん引いて、 木の真ん中へ) */
function overview() {
  _parts.view.scale = clampZoom(0);
  panTo((BOUNDS.x0 + BOUNDS.x1) / 2, (BOUNDS.y0 + BOUNDS.y1) / 2, true);
}

/** ミニマップ (= 見えている節を点で。 取った節は塗り、 まだは輪。 いま見えている範囲は枠) */
function drawMinimap() {
  const cv = _parts?.minimap;
  const ctx = cv?.getContext?.("2d");
  if (!ctx) return;
  const W = cv.width, H = cv.height;
  const spanX = BOUNDS.x1 - BOUNDS.x0 + 2, spanY = BOUNDS.y1 - BOUNDS.y0 + 2;
  const mx = (gx) => ((gx - BOUNDS.x0 + 1) / spanX) * W;
  const my = (gy) => ((gy - BOUNDS.y0 + 1) / spanY) * H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(12, 9, 18, 0.88)";
  ctx.fillRect(0, 0, W, H);
  const m = treeMeta();
  for (const n of TREE_NODES) {
    if (!nodeShown(m, n.id)) continue;
    const has = owns(m, n.id);
    const color = n.route ? ROUTE_MAP[n.route].color : "#f6e2a0";
    ctx.globalAlpha = has ? 1 : nodeVisible(m, n.id) ? 0.8 : 0.3;
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx(n.x), my(n.y), 5, 0, Math.PI * 2);
    if (has) ctx.fill(); else ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const { viewport, view, px } = _parts;
  const rect = viewport.getBoundingClientRect();
  const o = px({ x: 0, y: 0 });   // マス目 (0, 0) の world 座標
  const toG = (sx, sy) => ({ x: ((sx - view.x) / view.scale - o.x) / UNIT, y: ((sy - view.y) / view.scale - o.y) / UNIT });
  const a = toG(0, 0), b = toG(rect.width, rect.height);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.strokeRect(mx(a.x), my(a.y), mx(b.x) - mx(a.x), my(b.y) - my(a.y));
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
  const stats = h("aside", { class: "tree-stats", "aria-live": "polite" });   // SPEC-093: いまの効果
  const main = h("div", { class: "tree-main" });
  world.append(links, nodeLayer);
  viewport.append(world, notice);
  // SPEC-094: 木の左下に 縮める・広げる・中心へ (= Workshop の作り。 下の欄から外して、 木のそばに置く)
  const tools = h("div", { class: "tree-tools" },
    h("button", { class: "tree-tool", type: "button", "aria-label": t("tree.zoomOut", "縮める"), onclick: () => zoomStep(1 / 1.25) }, "−"),
    h("button", { class: "tree-tool", type: "button", "aria-label": t("tree.zoomIn", "広げる"), onclick: () => zoomStep(1.25) }, "＋"),
    h("button", { class: "tree-tool wide", type: "button", onclick: () => centerOn(ROOT_ID, true) }, t("tree.center", "中心へ")),
    h("button", { class: "tree-tool wide", type: "button", onclick: overview }, t("tree.overview", "全体")));   // SPEC-134
  // SPEC-134: ミニマップ (= 押す・なぞるとその場所へ。 1 本目の指だけ)
  const minimap = h("canvas", { class: "tree-minimap", width: MINIMAP_W * 2, height: MINIMAP_H * 2, "aria-label": t("tree.minimap", "ミニマップ") });
  // SPEC-132: 戻るは木の右下 (= スマホで押しやすい。 開く前の画面に戻る)
  const backBtn = h("button", { class: "tree-tool tree-back2", type: "button", onclick: closeSkillTree },
    h("span", { "aria-hidden": "true" }, "◀"), h("span", {}, t("tree.backTo", "戻る")));
  // SPEC-146: 倒れたあとに開いたときは、 戻るの上に「もう一度挑む」 (= 強くして、 そのまま挑む)
  // SPEC-161: ステージクリアから開いたときは、 同じ場所に「次のノードに挑む」
  const retryBtn = _retry ? h("button", { class: "tree-tool tree-retry", type: "button", onclick: retryFromTree },
    h("span", {}, t("tree.retryNow", "復活する")), h("span", { "aria-hidden": "true" }, "▶"))
    : (_next ? h("button", { class: "tree-tool tree-retry tree-next", type: "button", onclick: nextFromTree },
      h("span", {}, t("tree.nextNode", "次のノードに挑む")), h("span", { "aria-hidden": "true" }, "▶"))
    : (_go ? h("button", { class: "tree-tool tree-retry tree-next tree-go", type: "button", onclick: goFromTree },
      h("span", {}, t("tree.storyGo", "ステージへ")), h("span", { "aria-hidden": "true" }, "▶")) : null));
  // SPEC-094: 広い画面は Workshop と同じく、 右の列に「詳しい欄」と「いまの効果」を縦に並べる。 狭い画面は下の欄と右上の札
  const wide = isWide();
  _screen.classList.toggle("wide", wide);
  if (wide) {
    main.append(viewport, minimap, tools, backBtn, ...(retryBtn ? [retryBtn] : []), h("div", { class: "tree-side" }, sheet, stats));
    clear(_screen).append(bg, head, routeBar, main);
  } else {
    main.append(viewport, minimap, tools, backBtn, ...(retryBtn ? [retryBtn] : []), stats);
    clear(_screen).append(bg, head, routeBar, main, sheet);
  }

  const view = { x: 0, y: 0, scale: window.innerWidth < 560 ? 0.62 : 0.85 };
  _parts?.ac?.abort();   // 前に組んだ画面の window の受け口を外す
  _parts = { head, routeBar, viewport, world, links, nodeLayer, notice, sheet, stats, view, px, W, H, minimap, ac: new AbortController() };
  installPanZoom();
  installMinimap();
}

const applyView = () => {
  const { world, view } = _parts;
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  drawMinimap();   // SPEC-134
};

function centerOn(id, animate = false) {
  const n = NODE_MAP[id];
  if (n) panTo(n.x, n.y, animate);
}

function installMinimap() {
  const { minimap } = _parts;
  const jump = (e) => {
    const r = minimap.getBoundingClientRect();
    const gx = BOUNDS.x0 - 1 + ((e.clientX - r.left) / r.width) * (BOUNDS.x1 - BOUNDS.x0 + 2);
    const gy = BOUNDS.y0 - 1 + ((e.clientY - r.top) / r.height) * (BOUNDS.y1 - BOUNDS.y0 + 2);
    panTo(gx, gy);
  };
  minimap.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;   // 2 本目の指はピンチのもの
    e.stopPropagation();
    jump(e);
    try { minimap.setPointerCapture(e.pointerId); } catch (_) {}
  });
  minimap.addEventListener("pointermove", (e) => { if (minimap.hasPointerCapture?.(e.pointerId)) jump(e); });
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
  renderStats();
  drawMinimap();
  applyRootGate();
}

/** 選んだ節を買ったあとの表 (= 買えない・上限なら null)。 SPEC-093 */
function nextPerks(m, id) {
  if (!id || !nodeVisible(m, id) || nodeState(m, id) !== "available") return null;
  const n = NODE_MAP[id];
  if (n.kind === "root") return null;
  return computePerks({ ...m, nodes: { ...m.nodes, [id]: nodeRank(m, id) + 1 } });
}

const statRow = (r) => h("li", { class: `stat-row ${r.changed ? "chg" : ""}`, style: { "--c": ROUTE_MAP[r.route].color } },
  h("span", { class: "stat-k" }, r.label),
  h("span", { class: "stat-v num" }, r.value, r.next ? h("b", {}, ` → ${r.next}`) : null));

/** いまの効果の欄 (= 数値の行と、 数値でない効果の名前)。 SPEC-093 §2.2 */
function renderStats() {
  const { stats } = _parts;
  const m = treeMeta();
  const { rows, flags } = perkRows(computePerks(m), nextPerks(m, _selected), getLang());
  const count = rows.filter((r) => r.value !== "—").length + flags.length;
  stats.classList.toggle("open", _statsOpen);
  clear(stats).append(
    h("button", { class: "stats-head", type: "button", "aria-expanded": String(_statsOpen), onclick: () => { _statsOpen = !_statsOpen; renderStats(); } },
      h("b", {}, t("tree.stats", "いまの効果")), count ? h("em", { class: "num" }, String(count)) : null, h("i", { "aria-hidden": "true" }, _statsOpen ? "▴" : "▾")),
    h("div", { class: "stats-body" },
      h("p", { class: "stats-note" }, _midRun ? t("tree.statsNoteStage", "次のステージから効く（RTA では切れる）") : t("tree.statsNote", "次の挑戦から効く（RTA では切れる）")),
      rows.length ? h("ul", { class: "stats-list" }, rows.map(statRow)) : h("p", { class: "stats-none" }, t("tree.statsNone", "まだ効果はない")),
      flags.length ? h("p", { class: "stats-flags" }, flags.join("・")) : null,
      resetBox(m)),
  );
}

/** 作り直す (= めったに使わないので、 効果の欄のいちばん下に小さく。 押すと確かめる。 SPEC-094) */
function resetBox(m) {
  if (!owns(m, ROOT_ID)) return null;
  if (!_resetAsk) {
    return h("div", { class: "stats-reset" },
      h("button", { class: "reset-link", type: "button", onclick: () => { _resetAsk = true; renderStats(); } }, t("tree.reset", "作り直す")));
  }
  const back = spentTotal(m);
  return h("div", { class: "stats-reset ask" },
    h("p", {}, tpl(t("tree.resetConfirm", "全部戻す？（GUM {gum}・ゴールドダスト {dust} が戻る）"), back)),
    h("div", { class: "reset-btns" },
      h("button", { class: "tree-btn sub danger", type: "button", onclick: () => doReset(back) }, t("tree.resetYes", "戻す")),
      h("button", { class: "tree-btn sub", type: "button", onclick: () => { _resetAsk = false; renderStats(); } }, t("tree.resetNo", "やめる"))));
}

/** 頭: 戻る・題・右に残高 (= 選んだ節の費用を「−40」と並べ、 足りないぶんは赤く。 木に重ねないので節が隠れない) */
function renderHead() {
  const m = treeMeta();
  const n = _selected ? NODE_MAP[_selected] : null;
  const cost = n && nodeVisible(m, n.id) && nodeState(m, n.id) === "available" ? nodeCost(m, n.id) : { gum: 0, dust: 0 };
  const chip = (cls, icon, label, have, need) => h("span", { class: `tree-bal ${cls} ${need ? (have >= need ? "ok" : "ng") : ""}`, title: label, "aria-label": `${label} ${have | 0}` },
    h("img", { src: img(icon), alt: "", draggable: "false" }),
    h("b", { class: "num" }, (have | 0).toLocaleString()),
    need ? h("i", { class: "num" }, `−${need}`) : null);
  // SPEC-156: PC のドックのときだけ、 チャットを畳む・広げるボタン (= 畳むと木が広がる)
  const shown = chatShown();
  const chatBtn = chatLayout() === "dock" ? h("button", { class: "tree-tool tree-chat", type: "button", "aria-pressed": String(shown), onclick: () => setChatCollapsed(shown) },
    "💬", h("span", {}, shown ? t("tree.chatHide", "チャットをたたむ") : t("tree.chatShow", "チャットをひらく"))) : null;
  clear(_parts.head).append(
    h("div", { class: "tree-title" }, h("b", {}, t("tree.title", "スキルツリー")), h("small", {}, "SKILL TREE")),
    ...(chatBtn ? [chatBtn] : []),   // DOM の append は null を "null" の文字にするので、 h() と違って自分で外す
    h("div", { class: "tree-bals" },
      chip("gum", ICON_GUM, t("meta.gum", "GUM"), m.gum, cost.gum),
      chip("dust", ICON_DUST, t("meta.dust", "ゴールドダスト"), m.dust, cost.dust)),
  );
}

function renderRouteBar() {
  const m = treeMeta();
  const counts = routeCounts(m);
  clear(_parts.routeBar).append(...ROUTES.filter((r) => !r.minor).map((r) => {   // SPEC-131: エクステ別の道は一覧に出さない
    const total = TREE_NODES.filter((x) => x.route === r.id).length;
    const n = counts[r.id] || 0;
    return h("button", {
      class: `route-pip ${n ? "on" : ""}`, type: "button",
      style: { "--c": r.color },
      title: tpl(t("tree.routeNodes", "{name}：{n} / {total}"), { name: L(r.name), n, total }),
      onclick: () => { const c = branchCenter(r.id, treeMeta()); panTo(c.x, c.y, true); },   // SPEC-134: その道のいま取れる節の真ん中へ
    }, h("span", {}, L(r.name)), h("em", { class: "num" }, `${n}/${total}`));
  }));
}

function renderLinks(fresh, burst) {
  const m = treeMeta();
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
  // SPEC-133: 見えている親から見えている子へ、 まっすぐ (= Workshop の作り)。
  //   off: 親をまだ取っていない (= 点線) / open: 親は取った、 子はまだ (= 道の色を薄く) / on: 両方取った (= 道の色で光る)
  for (const n of TREE_NODES) {
    if (n.kind === "root" || !nodeShown(m, n.id)) continue;
    const color = ROUTE_MAP[n.route].color;
    for (const r of n.requires ?? []) {
      const parent = NODE_MAP[r];
      if (!parent || !nodeShown(m, r)) continue;
      const state = owns(m, r) && owns(m, n.id) ? "on" : owns(m, r) ? "open" : "off";
      const pa = px(nodePos(parent)), pb = px(nodePos(n));
      const d = `M${pa.x},${pa.y} L${pb.x},${pb.y}`;
      const base = svg("path", { d, class: `link ${state}`, stroke: state === "off" ? "#6f6488" : color });
      links.append(base);
      if (state === "on" && !still) links.append(svg("path", { d, class: "link-flow", stroke: color, filter: "url(#treeGlow)" }));
      if (fresh.has(n.id) && !still) {
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 100;
        base.style.strokeDasharray = `${len}`;
        base.style.strokeDashoffset = `${len}`;
        base.classList.add("grow");
        base.style.animationDelay = `${fresh.get(n.id) * (burst ? 70 : 110)}ms`;
      }
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
  const m = treeMeta();
  const { nodeLayer, px } = _parts;
  clear(nodeLayer);
  const center = px(nodePos(NODE_MAP[ROOT_ID]));
  const still = prefersReducedMotion();
  const guide = guideTarget(m);
  for (const n of TREE_NODES) {
    if (!nodeShown(m, n.id)) continue;
    const p = px(nodePos(n));
    const cls = nodeClass(m, n);
    const color = n.route ? ROUTE_MAP[n.route].color : "#f6e2a0";
    const lvl = levelText(m, n);
    const anim = fresh.has(n.id) && !still ? (burst && n.kind !== "root" ? "burst" : "pop") : "";
    const guided = guide === n.id;   // SPEC-093: 初回の案内で指し示す節
    const btn = h("button", {
      class: `tnode k-${cls === "teaser" ? "teaser" : n.kind} ${cls} ${_selected === n.id ? "sel" : ""} ${anim} ${cls === "owned" || cls === "max" ? "has" : ""} ${guided ? "guide" : ""}`,
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
    h("span", { class: "tnode-name" }, cls === "teaser" ? t("tree.hidden", "？？？") : nameOf(n)),
    guided ? h("span", { class: "tnode-guide", "aria-hidden": "true" }, t("tree.guide", "ここを 2 回！")) : null);
    nodeLayer.append(btn);
  }
}

// ---- 下の欄 ----
const costChips = (cost) => h("span", { class: "cost-row" },
  cost.gum ? h("span", { class: "cost-chip" }, h("img", { src: img(ICON_GUM), alt: "" }), `${cost.gum}`) : null,
  cost.dust ? h("span", { class: "cost-chip dust" }, h("img", { src: img(ICON_DUST), alt: "" }), `${cost.dust}`) : null);

function shortText(m, cost) {
  const s = shortBy(m, cost);
  const list = [];
  if (s.gum) list.push(tpl(t("tree.shortGum", "GUM あと {n}"), { n: s.gum }));
  if (s.dust) list.push(tpl(t("tree.shortDust", "ゴールドダスト あと {n}"), { n: s.dust }));
  return tpl(t("tree.short", "足りない：{list}"), { list: list.join("／") });
}

function renderSheet() {
  const m = treeMeta();
  const { sheet } = _parts;
  clear(sheet);
  sheet.classList.toggle("idle", !_selected);
  const add = (...xs) => sheet.append(...xs.flat().filter(Boolean));
  if (!_selected) return renderIdle(add, m);
  const n = NODE_MAP[_selected];
  const closeX = h("button", { class: "sheet-x", type: "button", "aria-label": t("menu.close", "閉じる"), onclick: () => { _selected = null; renderAll(); } }, "×");
  if (!nodeVisible(m, n.id)) {
    // SPEC-133: 親のうち、 いま見えているもの (= requires はどれか 1 つ)
    const parent = NODE_MAP[(n.requires ?? []).find((r) => nodeShown(m, r)) ?? n.requires?.[0] ?? ROOT_ID];
    add(
      h("div", { class: "dt-head" },
        h("div", { class: "dt-icon teaser", style: { "--c": ROUTE_MAP[n.route].color } }, "？"),
        h("div", { class: "dt-title" },
          h("div", { class: "dt-tags" }, h("span", { class: "route-tag", style: { "--c": ROUTE_MAP[n.route].color } }, L(ROUTE_MAP[n.route].name))),
          h("div", { class: "dt-name" }, t("tree.hidden", "？？？"))),
        closeX),
      richNode("p", "dt-desc", tpl(t("tree.hiddenDesc", "「{name}」を解放すると、この先が見える。"), { name: nameOf(parent) })),   // SPEC-144: 数字と用語に色
      detailConds(m, n, nodeState(m, n.id), nodeCost(m, n.id), { hideParent: true }),
      h("button", { class: "tree-btn", type: "button", onclick: () => select(parent.id, true) }, tpl(t("tree.toParent", "「{name}」へ"), { name: nameOf(parent) })),
    );
    return;
  }
  const st = nodeState(m, n.id);
  const route = n.route ? ROUTE_MAP[n.route] : null;
  const color = route ? route.color : "#f6e2a0";
  const cost = nodeCost(m, n.id);
  const afford = canAfford(m, cost);
  const rank = nodeRank(m, n.id);
  // 頭: 大きなアイコン・道と種類の札・名前・段 (= 強化は目盛り)
  const pips = n.kind === "repeat"
    ? h("div", { class: "dt-pips", "aria-label": tpl(t("tree.lv", "Lv {n} / {max}"), { n: rank, max: nodeMax(n) }) },
      Array.from({ length: nodeMax(n) }, (_, k) => h("i", { class: k < rank ? "on" : "" })),
      h("b", { class: "num" }, tpl(t("tree.lv", "Lv {n} / {max}"), { n: rank, max: nodeMax(n) })))
    : null;
  add(
    h("div", { class: "dt-head" },
      h("div", { class: `dt-icon ${owns(m, n.id) ? "has" : ""}`, style: { "--c": color } }, h("img", { src: iconUrl(n.icon), alt: "", draggable: "false", onerror: (e) => e.target.remove() })),
      h("div", { class: "dt-title" },
        h("div", { class: "dt-tags" },
          route ? h("span", { class: "route-tag", style: { "--c": route.color } }, L(route.name)) : null,
          h("span", { class: "kind-tag" }, t(KIND_KEY[n.kind], n.kind))),
        h("div", { class: "dt-name" }, nameOf(n)),
        pips),
      closeX),
    richNode("p", "dt-desc", L(n.desc)),   // SPEC-144: 数字と用語に色
    detailConds(m, n, st, cost),
    detailChanges(m, n.id),
    actionButton(m, n, st, cost, afford),
  );
}

/** 条件の一覧 (= 満たしたものは ✓ で薄く、 まだのものは ✗。 Workshop の作り) */
function detailConds(m, n, st, cost, { hideParent = false } = {}) {
  if (n.kind === "root" || st === "owned") return null;
  const items = [];
  // SPEC-133: 親はどれか 1 つ (= 「A または B」)・ヒーローの条件
  const req = (n.requires ?? []).filter((r) => NODE_MAP[r]?.kind !== "root");
  if (req.length && !hideParent) items.push({ ok: req.some((r) => owns(m, r)), text: tpl(t("tree.condParent", "「{name}」を解放"), { name: req.map((r) => nameOf(NODE_MAP[r])).join(t("tree.or", "」または「")) }) });
  if (n.hero) items.push({ ok: heroOk(m, n), text: heroCondText(n.hero) });
  if (n.hero && hideParent) return items.length ? h("ul", { class: "dt-conds" }, items.map((c) => h("li", { class: c.ok ? "met" : "" }, h("i", { "aria-hidden": "true" }, c.ok ? "✓" : "✗"), richNode("span", "", c.text)))) : null;
  if (n.kind === "capstone") {
    const have = routeCounts(m)[n.route] || 0;
    items.push({ ok: have >= CAPSTONE_NEED, text: tpl(t("tree.condRoute", "この道のスキルを {need} つ（いま {n} つ）"), { need: CAPSTONE_NEED, n: have }) });
  }
  const s = shortBy(m, cost);
  if (cost.gum) items.push({ ok: !s.gum, text: s.gum ? tpl(t("tree.condGumShort", "GUM {need}（あと {n}）"), { need: cost.gum, n: s.gum }) : tpl(t("tree.condGum", "GUM {need}"), { need: cost.gum }) });
  if (cost.dust) items.push({ ok: !s.dust, text: s.dust ? tpl(t("tree.condDustShort", "ゴールドダスト {need}（あと {n}）"), { need: cost.dust, n: s.dust }) : tpl(t("tree.condDust", "ゴールドダスト {need}"), { need: cost.dust }) });
  if (!items.length) return null;
  return h("ul", { class: "dt-conds" }, items.map((c) => h("li", { class: c.ok ? "met" : "" }, h("i", { "aria-hidden": "true" }, c.ok ? "✓" : "✗"), richNode("span", "", c.text))));
}

/** 解放・強化のボタン (= 金のグラデーション。 費用は中に並べる) */
function actionButton(m, n, st, cost, afford) {
  if (n.kind === "root" && owns(m, n.id)) return h("button", { class: "tree-btn", type: "button", disabled: true }, t("tree.rootOwned", "すべてはここから"));
  if (n.kind === "root") return h("button", { class: "tree-btn gold", type: "button", onclick: () => unlock(n) }, t("tree.unlockRoot", "解放する（0 GUM）"));
  if (st === "owned") return h("button", { class: "tree-btn done", type: "button", disabled: true }, n.kind === "repeat" ? t("tree.maxed", "最大") : t("tree.owned", "解放済み"));
  if (st === "available") {
    return h("button", { class: `tree-btn ${n.kind === "repeat" && nodeRank(m, n.id) > 0 ? "green" : "gold"}`, type: "button", disabled: !afford, onclick: () => unlock(n) },
      h("span", {}, n.kind === "repeat" && nodeRank(m, n.id) > 0 ? t("tree.upgrade", "強化する") : t("tree.unlock", "解放する")), costChips(cost));
  }
  return h("button", { class: "tree-btn", type: "button", disabled: true }, h("span", {}, t("tree.locked", "まだ解放できない")), costChips(cost));
}

/** 選んだ節で変わる値 (= 「攻撃  ＋9% → ＋12%」 の一覧。 狭い画面で効果の欄を閉じていても分かる)。 SPEC-093 / SPEC-094 */
function detailChanges(m, id) {
  const next = nextPerks(m, id);
  if (!next) return null;
  const rows = perkRows(computePerks(m), next, getLang()).rows.filter((r) => r.changed);
  if (!rows.length) return null;
  return h("ul", { class: "dt-changes" }, rows.map((r) => h("li", { style: { "--c": ROUTE_MAP[r.route].color } },
    h("span", {}, r.label), h("b", { class: "num" }, r.value === "—" ? "" : `${r.value} → `, h("em", {}, r.next)))));
}

/** 何も選んでいないとき: 解放できる節への近道だけ (= 「中心へ」 は木の左下、 「作り直す」 は効果の欄の下へ。 SPEC-094) */
function renderIdle(add, m) {
  const claimable = claimableNodes(m);
  const first = claimable[0];
  // SPEC-157: 「解放可能なスキル ▶」は押すとその節を選ぶ (= 黄色い枠で囲んで、 詳しい欄を出す)
  add(first
    ? h("button", { class: "sheet-go ok", type: "button", onclick: () => select(first.id, true) },
      tpl(t("tree.claimable", "▶ 解放可能なスキル：{name}{more}（タップで選ぶ）"), { name: nameOf(first), more: claimable.length > 1 ? tpl(t("tree.claimableMore", " ほか {n}"), { n: claimable.length - 1 }) : "" }))
    : h("p", { class: "sheet-note" }, t("tree.idleHint", "挑戦を終えると GUM が、ボスを倒すとゴールドダストが貯まる。スキルを 2 回押すと解放。")));
  // SPEC-157: 一括解放 (= 安い順に、 買えなくなるまで。 ゴールドダストは切り替えで)
  if (first) {
    const plan = bulkPlan(m, { useDust: _bulkDust });
    const costText = plan.dust > 0 ? tpl(t("tree.bulkCostDust", "GUM {gum}・ゴールドダスト {dust}"), plan) : tpl(t("tree.bulkCost", "GUM {gum}"), plan);
    add(h("div", { class: "sheet-bulk" },
      h("button", { class: "tree-btn sub gold", type: "button", disabled: plan.steps.length === 0, onclick: bulkUnlock },
        plan.steps.length ? tpl(t("tree.bulk", "{n} 個を一括解放（{cost}）"), { n: plan.steps.length, cost: costText }) : t("tree.bulkNone", "一括で解放できるものはない")),
      h("label", { class: "sheet-check" },
        h("input", { type: "checkbox", checked: _bulkDust, onchange: (e) => { _bulkDust = !!e.target.checked; renderSheet(); } }),
        h("span", {}, t("tree.bulkDust", "ゴールドダストも使う")))));
  }
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
  renderStats();
  // SPEC-135: 欄の先頭は選んだノードの詳しい欄 (= 選ぶたびに一番上へ)
  if (_parts) { _parts.sheet.scrollTop = 0; _parts.sheet.closest(".tree-side")?.scrollTo?.(0, 0); }
  if (move) centerOn(id, true);
}

function notice(text, kind = "") {
  const { notice: el } = _parts;
  el.textContent = text;
  el.className = `tree-notice ${kind}`;
  clearTimeout(_noticeTimer);
  _noticeTimer = setTimeout(() => el.classList.add("hidden"), NOTICE_MS);
}

/**
 * SPEC-164: 根 (= サバイバーの覚醒) を取るまでは、 真ん中の根以外のボタンを押せなくする
 *   (= 「復活する」が目立つので、 強化せずにそのまま復活してしまいそうだった)。 縮める・広げる・中心へ・全体・チャットは残す
 */
export function rootGated(meta) {
  return !owns(meta, ROOT_ID);
}
function applyRootGate() {
  if (!_screen) return;
  const gate = rootGated(treeMeta());
  _screen.classList.toggle("gate", gate);
  for (const el of _screen.querySelectorAll(".tree-retry, .tree-back2, .route-pip, .sheet-bulk button, .sheet-bulk input")) el.disabled = gate;
}

/** 買う (= tryBuy で確かめてから meta.js に書く)。 新しく見えた節は中心から近い順に飛び出す */
function unlock(n) {
  const m = treeMeta();
  const r = tryBuy(m, n.id);
  if (!r.ok) {
    if (r.reason === "short") notice(shortText(m, r.cost), "bad");
    else if (r.reason === "locked") notice(t("tree.locked", "まだ解放できない"), "bad");
    return;
  }
  const before = new Set(TREE_NODES.filter((x) => nodeShown(m, x.id)).map((x) => x.id));
  const stepBefore = treeGuide(m);
  if (!spend(r.cost)) return;
  setNodeRank(n.id, r.rank);
  _bought += 1;   // SPEC-146
  const burst = n.kind === "root";
  playSe(SFX.LEVEL_UP, 0, 0.6);
  notice(r.rank > 1 ? tpl(t("tree.upgraded", "「{name}」Lv {lv}！"), { name: nameOf(n), lv: r.rank }) : tpl(t("tree.bought", "「{name}」を解放！"), { name: nameOf(n) }), "good");
  const after = treeMeta();
  const fresh = new Map();
  let i = 0;
  const order = TREE_NODES.filter((x) => nodeShown(after, x.id) && !before.has(x.id))
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));   // SPEC-133: 中心に近い順
  for (const x of order) fresh.set(x.id, i++);
  fresh.set(n.id, 0);
  if (burst) {
    _selected = null;
    if (!prefersReducedMotion()) shockwave();
    zoomToFit();
  }
  renderAll(fresh, burst);
  // SPEC-093: 案内の段が進んだら、 次の案内 (= 根 → 最初の 1 つ → できた)
  const stepAfter = treeGuide(after);
  if (stepBefore === "first" && stepAfter === null) { _statsOpen = true; renderStats(); sayTree("done"); }   // 「右の欄」を狭い画面でも開いて見せる
  else if (stepBefore !== stepAfter) { const g = guideLine(after); if (g) setTimeout(() => sayTree(g, { stay: true }), burst ? 900 : 0); }
}

/** SPEC-157: いま解放できる節を安い順に一括で (= 計画は skill-bulk.js。 ここで払って書く)。 新しく見えた節は中心から近い順に飛び出す */
function bulkUnlock() {
  const m = treeMeta();
  const plan = bulkPlan(m, { useDust: _bulkDust });
  if (!plan.steps.length) return;
  const before = new Set(TREE_NODES.filter((x) => nodeShown(m, x.id)).map((x) => x.id));
  const stepBefore = treeGuide(m);
  let n = 0, root = false;
  for (const s of plan.steps) {
    const r = tryBuy(treeMeta(), s.id);   // 1 つ買うたびに meta が変わるので、 毎回確かめる
    if (!r.ok || !spend(r.cost)) break;
    setNodeRank(s.id, r.rank);
    n += 1;
    if (NODE_MAP[s.id].kind === "root") root = true;
  }
  if (!n) return;
  _bought += plan.steps.length;   // SPEC-146 (= 実際に買えた数で数え直す)
  _bought -= plan.steps.length - n;
  playSe(SFX.LEVEL_UP, 0, 0.6);
  notice(tpl(t("tree.bulkDone", "{n} 個を解放！"), { n }), "good");
  const after = treeMeta();
  const fresh = new Map();
  let i = 0;
  const order = TREE_NODES.filter((x) => nodeShown(after, x.id) && !before.has(x.id))
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  for (const x of order) fresh.set(x.id, i++);
  for (const s of plan.steps.slice(0, n)) fresh.set(s.id, 0);
  _selected = null;
  if (root) { if (!prefersReducedMotion()) shockwave(); zoomToFit(); }
  renderAll(fresh, root);
  const stepAfter = treeGuide(after);
  if (stepBefore === "first" && stepAfter === null) { _statsOpen = true; renderStats(); sayTree("done"); }
  else if (stepBefore !== stepAfter) { const g = guideLine(after); if (g) setTimeout(() => sayTree(g, { stay: true }), root ? 900 : 0); }
}

function doReset(back) {
  resetNodes(back);
  _resetAsk = false;
  _selected = null;
  playSe(SFX.GEM_PICKUP, 0, 0.5);
  renderAll();
  notice(tpl(t("tree.resetDone", "ツリーを作り直した。GUM {gum}・ゴールドダスト {dust} が戻った"), back), "good");
  centerOn(ROOT_ID, true);
  const g = guideLine(treeMeta());
  if (g) sayTree(g, { stay: true });
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
  const r = 3.2 * UNIT;   // SPEC-133: 中心と 1・2 段目がおさまる距離 (マス)
  view.scale = Math.max(0.55, Math.min(view.scale, Math.min(rect.width, rect.height) / (2 * r)));
  centerOn(ROOT_ID, true);
}

/** 節を押す: 1 度目は選ぶ、 2 度目 (= 0.4 秒以内) で買う */
function tapNode(id) {
  const now = performance.now();
  const dbl = _lastTap.id === id && now - _lastTap.at < DBL_TAP_MS;
  _lastTap = dbl ? { id: null, at: 0 } : { id, at: now };
  if (!dbl) { playSe(SFX.UI_CLICK, 60, 1); return select(id); }
  const m = treeMeta();
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

// ---- パン・ズーム (= SPEC-134: Workshop の作り) ----
// pointerdown は表示領域、 move と up は window で受ける (= 領域の外へ出ても続く)。 新しい 1 本目の指が来たら、
// 取りこぼした古い指を忘れる。 動いた量が 6px を超えたら、 そのあとのタップは節を選ばない
function installPanZoom() {
  const { viewport, view, ac } = _parts;
  const opt = { signal: ac.signal };
  const pointers = new Map();
  let drag = null, pinch = null, moved = false, target = null;
  const local = (x, y) => { const r = viewport.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const startPinch = () => {
    const [a, b] = [...pointers.values()];
    const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
    // 指の中点の下にある盤面の点が、 拡大縮小しても指の下に残るように
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: view.scale, wx: (mid.x - view.x) / view.scale, wy: (mid.y - view.y) / view.scale };
    drag = null;
  };
  const down = (e) => {
    if (pointers.has(e.pointerId)) return;
    if (e.isPrimary) pointers.clear();   // 新しい手ぶりの 1 本目: 取りこぼした指を忘れる
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      moved = false; pinch = null;
      target = e.target.closest?.(".tnode") ?? null;
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    } else {
      moved = true; target = null;
      startPinch();
    }
  };
  viewport.addEventListener("pointerdown", down, opt);
  // 2 本目の指は、 どこに置いてもピンチに加わる (= ミニマップやボタンの上でも)
  window.addEventListener("pointerdown", (e) => { if (pointers.size > 0 && e.pointerType === "touch" && !e.isPrimary) down(e); }, { capture: true, signal: ac.signal });
  window.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      view.scale = clampZoom((pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist);
      view.x = mid.x - pinch.wx * view.scale;
      view.y = mid.y - pinch.wy * view.scale;
      applyView();
    } else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      view.x = drag.vx + dx;
      view.y = drag.vy + dy;
      applyView();
    }
  }, opt);
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    // 動かさずに離した 1 本の指は、 節のタップ (= 1 度目は選ぶ・2 度目で買う)
    if (e.type === "pointerup" && !moved && pointers.size === 1 && target) tapNode(target.dataset.id);
    pointers.delete(e.pointerId);
    pinch = null;
    // ピンチのあと 1 本だけ残ったら、 そこからドラッグを続ける
    const rest = [...pointers.values()][0];
    drag = rest ? { x: rest.x, y: rest.y, vx: view.x, vy: view.y } : null;
    if (!rest) target = null;
  };
  window.addEventListener("pointerup", end, opt);
  window.addEventListener("pointercancel", end, opt);
  // ホイールはカーソルの位置を軸に
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    zoomAt(view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p.x, p.y);
  }, { passive: false, signal: ac.signal });
}

/** 縮める・広げるのボタン (= 表示の真ん中を軸に) */
function zoomStep(k) {
  const r = _parts.viewport.getBoundingClientRect();
  zoomAt(_parts.view.scale * k, r.width / 2, r.height / 2);
}

/** 表示領域の点 (px, py) を動かさずに拡大縮小する */
function zoomAt(z, px, py) {
  const { view } = _parts;
  const next = clampZoom(z);
  const wx = (px - view.x) / view.scale;
  const wy = (py - view.y) / view.scale;
  view.scale = next;
  view.x = px - wx * next;
  view.y = py - wy * next;
  applyView();
}
