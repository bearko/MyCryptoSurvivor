// ============================================================
// story-map.js — ランドマップ (= SPEC-165)。 5 ランド × ステージの丸。 押すとそのステージへ
// ============================================================
//
// モード選択の「ストーリー」から開く。 一本道 (= 前をクリアすると次が開く)。 クリア済みはいつでも遊び直せる。
// 行がまだ無いステージ (= レシピが入っていない) は「準備中」。 ヒーローはレシピが決める (= ヒーロー選択は開かない)。

import { state } from "./state.js";
import { t, tpl, onLangChange } from "./i18n.js";
import { playWipe } from "./transition.js";
import { naviHide } from "./navi.js";
import { startMenuBgm } from "./ui-sound.js";
import { getHero } from "./heroes.js";
import { img, REGULATION_NORMAL } from "./constants.js";
import { LANDS, STORY_PLAN, STORY_MAP, loadStory, storyUnlocked, currentStoryId, SECTOR_RARITY, stageRole, TOWER } from "./story.js";
import { owns } from "./skill-logic.js";
import { ROOT_ID } from "./skill-data.js";
import { getMeta } from "./meta.js";
import { newRunStats } from "./battle/run-stats.js";

let _wired = false;
let _onBack = null;
let _seenOpen = null;   // 前に描いたときに開いていたランド (= 新しく晴れたランドの靄を動かす)
let _resizeWired = false;
let _treeDone = false;   // SPEC-165: 3-1 の木を通った (= 「ステージへ ▶」のあと)

function _$(id) { return document.getElementById(id); }

export function installStoryMap({ onBack } = {}) {
  _onBack = onBack ?? null;
  if (_wired) return;
  _wired = true;
  _$("storyMapBack")?.addEventListener("click", () => { hideStoryMap(); _onBack?.(); });
  onLangChange(() => { if (!_$("storyMapScreen")?.classList.contains("hidden")) renderStoryMap(); });
  if (!_resizeWired) { _resizeWired = true; window.addEventListener("resize", () => { if (!_$("storyMapScreen")?.classList.contains("hidden")) _drawPaths(); }); }
}

export function showStoryMap() {
  naviHide();   // モード選択の帯 (= 「まずは EASY から」) を消す
  _$("gameModeSelectScreen")?.classList.add("hidden");
  _$("titleScreen")?.classList.add("hidden");
  renderStoryMap();
  _$("storyMapScreen")?.classList.remove("hidden");
}
export function hideStoryMap() {
  _$("storyMapScreen")?.classList.add("hidden");
}

/**
 * 描く (= 進みを読み直す)。 ワールドマップ: 四方にランド (北=玄武 オーシャン / 西=白虎 タンジェリン / 東=青龍 ライム / 南=朱雀 ストロベリー)、
 * 中央に W1〜W4 を越えるとそびえる 天候操作装置ゼウス (頂上にファオ)。 開いていないランドは黒い靄 (= 晴れると道がつながる)。
 * ランドの中は道でつないだ札 (= ランドセクタのアイコンを飾りに。 大型ボス Legendary / 中ボス Rare / それ以外 Common)。
 */
export function renderStoryMap() {
  const root = _$("storyMapLands");
  if (!root) return;
  const p = loadStory();
  const cur = currentStoryId(p);
  const ti = _$("storyMapTitle"); if (ti) ti.textContent = t("story.map.title", "ストーリー");
  const sb = _$("storyMapSub"); if (sb) sb.textContent = tpl(t("story.map.sub", "クリア {n} / {total}"), { n: String(p.cleared.length), total: String(Object.values(STORY_PLAN).reduce((a, v) => a + v, 0)) });
  const bk = _$("storyMapBack"); if (bk) bk.textContent = t("story.map.back", "◀ モード選択へ");
  const openLands = new Set(LANDS.filter((l) => storyUnlocked(`${l.w}-1`, p)).map((l) => l.id));
  const landCleared = (l) => p.cleared.includes(`${l.w}-${STORY_PLAN[l.w]}`);
  const towerUp = LANDS.filter((l) => l.w <= 4).every(landCleared);   // W1〜W4 を越えると中央の塔が立つ
  const fresh = _seenOpen !== null;   // 2 回目からの描き直し (= 新しく晴れたランドだけ靄を動かす)
  root.innerHTML = "";
  for (const land of LANDS) {
    const open = openLands.has(land.id);
    const done = landCleared(land);
    const row = document.createElement("section");
    row.className = `story-land story-land--${land.dir}` + (open ? " is-open" : " is-sealed") + (done ? " is-done" : "") + (land.w === 5 ? (towerUp ? " has-tower" : " no-tower") : "");
    row.dataset.land = land.id;
    row.style.setProperty("--land", land.color);
    // 背景: ランドの絵の上に黒い板 (= α は css の --story-panel-alpha)
    const bg = document.createElement("div"); bg.className = "story-land__bg"; bg.style.backgroundImage = `url("${img(land.bg)}")`; row.appendChild(bg);
    const head = document.createElement("h3");
    head.className = "story-land__name";
    const cry = document.createElement("img"); cry.className = "story-land__cryptid"; cry.src = img(land.cryptid); cry.alt = ""; cry.draggable = false; cry.onerror = () => cry.remove();
    head.appendChild(cry);
    const txt = document.createElement("span"); txt.className = "story-land__txt";
    txt.innerHTML = `<small>${land.dir === "w" || land.dir === "e" ? escapeHtml(t(`story.guardian.${land.guardian}`, "")) : `WORLD ${land.w} ・ ${escapeHtml(t(`story.guardian.${land.guardian}`, ""))}`}</small>`;
    const nm = document.createElement("b"); nm.textContent = t(`story.land.${land.id}`, land.id); txt.appendChild(nm);
    head.appendChild(txt);
    row.appendChild(head);
    if (land.w === 5) { head.classList.add("story-land__name--c"); row.appendChild(_tower(towerUp)); }
    const dots = document.createElement("div");
    dots.className = "story-land__stages";
    for (let i = 1; i <= (STORY_PLAN[land.w] ?? 0); i++) {
      const id = `${land.w}-${i}`;
      const r = STORY_MAP[id];
      const has = !!r;
      const cleared = p.cleared.includes(id);
      const openStage = has && storyUnlocked(id, p);
      const role = stageRole(r);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `story-stage story-stage--${role}` + (cleared ? " is-cleared" : "") + (id === cur ? " is-current" : "") + (!openStage ? " is-locked" : "") + (!has ? " is-todo" : "");
      btn.dataset.story = id;
      btn.disabled = !openStage;
      const label = !has ? t("story.map.todo", "準備中") : (cleared ? t("story.map.cleared", "クリア") : (openStage ? t("story.map.play", "挑む") : "🔒"));
      btn.innerHTML = `<span class="story-stage__art" style="background-image:url('${img(land.sector + SECTOR_RARITY[role] + ".png")}')"></span><b class="num">${id}</b><span class="story-stage__lbl">${label}</span>`;
      if (has) btn.title = t(`story.${id}.name`, id);
      if (openStage) btn.addEventListener("click", () => startStoryStage(id));
      dots.appendChild(btn);
    }
    row.appendChild(dots);
    // 靄 (= 開いていないランドにかかる。 晴れた瞬間だけ動かす)
    const mist = document.createElement("div"); mist.className = "story-mist"; mist.setAttribute("aria-hidden", "true");
    mist.innerHTML = '<i class="story-mist__a"></i><i class="story-mist__b"></i><i class="story-mist__c"></i>';
    if (open && fresh && !_seenOpen.has(land.id)) mist.classList.add("story-mist--lift");
    row.appendChild(mist);
    root.appendChild(row);
  }
  _seenOpen = openLands;
  _drawPaths();
  requestAnimationFrame(_drawPaths);   // 絵の読み込みで位置が動いたあとにもう一度
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/** 中央の塔 (= ゼウスの上にファオ。 黒い霧が漂う。 立つ前は封印の円) */
function _tower(up) {
  const el = document.createElement("div");
  el.className = "story-tower" + (up ? " is-up" : " is-sealed");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = up
    ? `<i class="story-tower__fog"></i><i class="story-tower__fog story-tower__fog--2"></i><img class="story-tower__fao" src="${img(TOWER.fao)}" alt="" draggable="false" onerror="this.remove()" /><img class="story-tower__zeus" src="${img(TOWER.zeus)}" alt="" draggable="false" onerror="this.remove()" /><span class="story-tower__name">${escapeHtml(t("story.map.tower", "天候操作装置ゼウス"))}</span>`
    : `<i class="story-tower__fog"></i><span class="story-tower__seal">？</span><span class="story-tower__name">${escapeHtml(t("story.map.sealed", "四方を越えると現れる"))}</span>`;
  return el;
}

/** 道 (= SVG。 ランドの中の札どうしと、 ランドからランドへ。 越えた道は光り、 いまの道は点滅、 先は薄い) */
function _drawPaths() {
  const svg = _$("storyMapPaths"), back = _$("storyMapPathsBack"), board = _$("storyMapBoard");
  if (!svg || !back || !board) return;
  const p = loadStory();
  const bb = board.getBoundingClientRect();
  if (bb.width === 0) return;
  for (const el of [svg, back]) { el.setAttribute("viewBox", `0 0 ${bb.width} ${bb.height}`); el.setAttribute("width", bb.width); el.setAttribute("height", bb.height); }
  const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - bb.left + r.width / 2, y: r.top - bb.top + r.height / 2 }; };
  const node = (id) => board.querySelector(`.story-stage[data-story="${id}"]`);
  const segs = [];
  const ids = LANDS.flatMap((l) => Array.from({ length: STORY_PLAN[l.w] ?? 0 }, (_, i) => `${l.w}-${i + 1}`));
  for (let i = 0; i + 1 < ids.length; i++) {
    const a = node(ids[i]), b = node(ids[i + 1]);
    if (!a || !b) continue;
    const st = p.cleared.includes(ids[i + 1]) ? "done" : (storyUnlocked(ids[i + 1], p) ? "now" : "far");
    const cross = ids[i].split("-")[0] !== ids[i + 1].split("-")[0];
    segs.push({ a: c(a), b: c(b), st, cross });
  }
  // ランド間の道は板の裏を通る (= 板の隙間にだけ見える。 表に出すと中央で交差して散らかる)
  const draw = (s) => {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
    const d = s.cross ? `M${s.a.x},${s.a.y} C${s.a.x + dx * 0.15},${s.a.y + dy * 0.55} ${s.b.x - dx * 0.15},${s.b.y - dy * 0.55} ${s.b.x},${s.b.y}` : `M${s.a.x},${s.a.y} L${s.b.x},${s.b.y}`;
    return `<path class="story-path story-path--${s.st}${s.cross ? " story-path--cross" : ""}" d="${d}" />`;
  };
  svg.innerHTML = segs.filter((s) => !s.cross).map(draw).join("");
  back.innerHTML = segs.filter((s) => s.cross).map(draw).join("");
}

/** そのステージを始める (= レシピのヒーローで。 ヒーロー選択は開かない) */
export async function startStoryStage(id) {
  const r = STORY_MAP[id];
  if (!r) return;
  // SPEC-165 3-1: 木を先に (= 根を取るまでほかを押せない。 「ステージへ ▶」で始める)
  if (r.treeFirst && !owns(getMeta(), ROOT_ID) && !_treeDone) {
    const T = await import("./skill-tree.js");
    hideStoryMap();
    T.openSkillTree({ go: () => { _treeDone = true; startStoryStage(id); } });
    return;
  }
  _treeDone = false;
  // ヒーロー: "select" = ヒーロー選択を開く (= 3-2 から) / "keep" = 前に選んだ人 / 数字 = 固定
  const hero = r.hero === "select" ? null : getHero(r.hero === "keep" ? (state.ownedHero?.heroId ?? 10001) : r.hero);
  if (r.hero !== "select" && !hero) return;
  state.regulation = REGULATION_NORMAL;
  state.rtaMode = false;
  state.easyMode = false;
  state.storyId = id;
  state.absolute = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  if (!hero) {
    // ヒーロー選択 (= 選んだら main.js の applyHeroPick が startBattle を呼ぶ。 storyId は残る)
    const M = await import("./main.js");
    startMenuBgm();
    playWipe(() => { hideStoryMap(); document.getElementById("app")?.classList.remove("hidden"); M.openHeroSelectModal(); }, { label: `STORY // ${id}` });
    return;
  }
  state.ownedHero = { ...hero };
  state.currentStageIdx = 0;
  state.run.stages.length = 0;
  state.run.totalKills = 0;
  state.run.totalElapsedMs = 0;
  state.run.stats = newRunStats();
  startMenuBgm();
  const m = await import("./battle/index.js");
  playWipe(() => {
    hideStoryMap();
    naviHide();
    document.getElementById("app")?.classList.remove("hidden");   // 戦闘の画面 (= ヒーロー選択を通らないので、 ここで出す)
    m.startBattle(state.ownedHero);
  }, { label: `STORY // ${id}` });
}

/** ストーリーをやめる (= 結果の画面の「マップへ」。 戦闘を止めてマップへ戻る) */
export function backToStoryMap() {
  state.storyId = null;
  showStoryMap();
}
