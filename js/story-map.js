// ============================================================
// story-map.js — ストーリーの 3 画面 (= SPEC-165 §3.y)。 S-A ワールドマップ → S-B ワールド詳細 → S-C ステージの説明 → 戦闘
// ============================================================
//
// S-A: 暗い海の上に 4 つのランドの背景を領土の形に切り抜いて置き (北 オーシャン / 西 タンジェリン / 東 ライム / 南 ストロベリー)、
//      中央の島に天候操作装置ゼウス (頂上にファオ)。 ランドには札 1 枚。 開いていないランドは靄。 ランドを押すとその領土へズームして S-B へ
// S-B: そのランドの背景を全面に。 5 つの札を道で結ぶ (= 位置はレシピの map か MAP_PATH)。 中ボスとボスの札の上に影
// S-C: ステージの説明 (クリア条件・エネミー・報酬・ヒーロー・一言・自己ベスト) → 開始
// 一本道の解放の順と、 `.story-stage[data-story]` の状態クラスは変えない (= 自動プレイと検査がそのまま通る)

import { state } from "./state.js";
import { t, tpl, onLangChange, getLang } from "./i18n.js";
import { playWipe } from "./transition.js";
import { naviHide } from "./navi.js";
import { startMenuBgm } from "./ui-sound.js";
import { getHero, localizedHeroName, heroImg } from "./heroes.js";
import { img, REGULATION_NORMAL } from "./constants.js";
import { LANDS, STORY_PLAN, STORY_MAP, STORY_HERO, loadStory, storyUnlocked, currentStoryId, stageArt, stageRole, TOWER, FINAL_BOSS_ID, MAP_TERRITORY, stagePos, landOf, bondBurst, PROLOGUE, prologueDone, allStoryIds, nextInSameLand } from "./story.js";
import { naviFrameUrl, NAVI_POSES } from "./navi.js";
import { playSe } from "./audio.js";
import { setRichTextN } from "./rich-text.js";   // 固有名詞と用語に色
import { SFX } from "./constants.js";
import { owns } from "./skill-logic.js";
import { ROOT_ID } from "./skill-data.js";
import { getMeta } from "./meta.js";
import { newRunStats } from "./battle/run-stats.js";

let _wired = false;
let _onBack = null;
let _treeDone = false;     // SPEC-165: 3-1 の木を通った (= 「ステージへ ▶」のあと)
let _seenOpen = null;      // 前に描いたときに開いていたランド (= 新しく晴れたランドの靄を動かす)
let _seenTower = null;     // 前に描いたときに塔が立っていたか (= 立った瞬間だけせり上がる)
let _worldLand = null;     // S-B で開いているランド
let _infoId = null;        // S-C で開いているステージ

function _$(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
const reduceFx = () => document.documentElement.hasAttribute("data-reduce-fx") || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function installStoryMap({ onBack } = {}) {
  _onBack = onBack ?? null;
  if (_wired) return;
  _wired = true;
  _$("storyMapBack")?.addEventListener("click", () => { hideStoryMap(); _onBack?.(); });
  _$("storyWorldBack")?.addEventListener("click", () => { hideStoryWorld(); showStoryMap(); });
  _$("storyStageDim")?.addEventListener("click", hideStageInfo);
  wireScene();
  onLangChange(() => {
    if (!_$("storyMapScreen")?.classList.contains("hidden")) renderStoryMap();
    if (!_$("storyWorldScreen")?.classList.contains("hidden") && _worldLand) renderStoryWorld(_worldLand);
    if (_infoId) renderStageInfo(_infoId);
  });
}

// ---------------- 入り口 (= プロローグをまだ通っていなければ、 説明なしでいきなり 1-0) ----------------
export function enterStory() {
  if (!prologueDone(loadStory())) { startStoryStage(PROLOGUE.id); return; }   // 自分でワイプを掛ける (= 二重に掛けると内側が捨てられて真っ暗のまま止まる)
  playWipe(() => showStoryMap(), { label: "STORY // MAP" });
}

// ---------------- S-A ワールドマップ ----------------
export function showStoryMap() {
  naviHide();   // モード選択の帯 (= 「まずはストーリーから」) を消す
  _$("gameModeSelectScreen")?.classList.add("hidden");
  _$("titleScreen")?.classList.add("hidden");
  _$("storyWorldScreen")?.classList.add("hidden");
  const board = _$("storyMapBoard"); if (board) { board.classList.remove("is-zoom"); board.style.transformOrigin = ""; }
  renderStoryMap();
  _$("storyMapScreen")?.classList.remove("hidden");
}
export function hideStoryMap() {
  _$("storyMapScreen")?.classList.add("hidden");
}

/** 描く (= 進みを読み直す) */
export function renderStoryMap() {
  const lands = _$("storyMapLands"), plates = _$("storyMapPlates");
  if (!lands || !plates) return;
  const p = loadStory();
  const total = Object.values(STORY_PLAN).reduce((a, v) => a + v, 0);
  const ids = allStoryIds();
  p.cleared = p.cleared.filter((id) => ids.includes(id));   // プロローグ (1-0) は 25 に数えない
  const ti = _$("storyMapTitle"); if (ti) ti.textContent = t("story.map.title", "ワールドマップ");
  const sb = _$("storyMapSub"); if (sb) sb.textContent = tpl(t("story.map.sub", "クリア {n} / {total}"), { n: String(p.cleared.length), total: String(total) });
  const bk = _$("storyMapBack"); if (bk) bk.textContent = t("story.map.back", "◀ モード選択へ");
  const hint = _$("storyMapHint"); if (hint) hint.textContent = t("story.map.hint", "ランドを押すと入る");
  const openLands = new Set(LANDS.filter((l) => storyUnlocked(`${l.w}-1`, p)).map((l) => l.id));
  const landCleared = (l) => p.cleared.includes(`${l.w}-${STORY_PLAN[l.w]}`);
  const towerUp = LANDS.filter((l) => l.w <= 4).every(landCleared);
  const fresh = _seenOpen !== null;
  lands.innerHTML = ""; plates.innerHTML = "";
  for (const land of LANDS) {
    const m = MAP_TERRITORY[land.dir];
    const open = openLands.has(land.id), done = landCleared(land);
    const cnt = Array.from({ length: STORY_PLAN[land.w] }, (_, i) => `${land.w}-${i + 1}`).filter((id) => p.cleared.includes(id)).length;
    // 領土 (= 背景を切り抜く)
    const terr = document.createElement("div");
    terr.className = `story-terr story-terr--${land.dir}` + (open ? " is-open" : " is-sealed") + (done ? " is-done" : "");
    terr.style.cssText = `left:${m.terr.l}%;top:${m.terr.t}%;width:${m.terr.w}%;height:${m.terr.h}%;background-image:url("${img(land.bg)}")`;
    terr.style.setProperty("--land", land.color);
    lands.appendChild(terr);
    if (land.dir !== "c") {
      const mist = document.createElement("div");
      mist.className = "story-mist" + (open && fresh && !_seenOpen.has(land.id) ? " story-mist--lift" : "");
      mist.style.cssText = `left:${m.terr.l - 4}%;top:${m.terr.t - 4}%;width:${m.terr.w + 8}%;height:${m.terr.h + 8}%`;
      mist.innerHTML = '<i class="story-mist__a"></i><i class="story-mist__b"></i><i class="story-mist__c"></i>';
      if (open) mist.classList.add("is-clear");
      lands.appendChild(mist);
    }
    if (land.dir === "c") {
      lands.appendChild(_tower(towerUp, _seenTower !== null && !_seenTower && towerUp));
      continue;
    }
    // 新しく晴れたランド (= 前のランドを取り戻した) の一言
    if (open && fresh && !_seenOpen.has(land.id)) { const prev = LANDS.find((l) => l.w === land.w - 1); if (prev) _say(`story.map.freed.${prev.id}`); }
    // 札 (= 押すと S-B)
    const pl = document.createElement("button");
    pl.type = "button";
    pl.className = "story-plate" + (open ? " is-open" : " is-sealed") + (done ? " is-done" : "") + (open && !done ? " is-current" : "") + (open && fresh && !_seenOpen.has(land.id) ? " is-new" : "");
    pl.dataset.land = land.id;
    pl.disabled = !open;
    pl.style.cssText = `left:${m.plate.x}%;top:${m.plate.y}%`;
    pl.style.setProperty("--land", land.color);
    pl.innerHTML = `<img class="story-plate__cry" src="${img(land.cryptid)}" alt="" draggable="false" onerror="this.remove()" /><span class="story-plate__txt"><small>${esc(t(`story.guardian.${land.guardian}`, ""))}</small><b>${open ? esc(t(`story.land.${land.id}`, land.id)) : "？？？"}</b></span>` + (open ? `<span class="story-plate__pg num">${cnt} / ${STORY_PLAN[land.w]}</span>` : `<span class="story-plate__lock">🔒</span>`);
    if (open) pl.addEventListener("click", () => _zoomTo(pl, () => showStoryWorld(land.id)));
    plates.appendChild(pl);
  }
  // 中央の札 (= グレープ。 塔の下)
  const g = LANDS.find((l) => l.dir === "c");
  if (g) {
    const open = openLands.has(g.id);
    const cnt = Array.from({ length: STORY_PLAN[g.w] }, (_, i) => `${g.w}-${i + 1}`).filter((id) => p.cleared.includes(id)).length;
    const pl = document.createElement("button");
    pl.type = "button";
    pl.className = "story-plate story-plate--c" + (open ? " is-open" : " is-sealed") + (open && !landCleared(g) ? " is-current" : "");
    pl.dataset.land = g.id; pl.disabled = !open;
    pl.style.cssText = `left:50%;top:${MAP_TERRITORY.c.plate.y + 14}%`;
    pl.style.setProperty("--land", g.color);
    pl.innerHTML = `<img class="story-plate__cry" src="${img(g.cryptid)}" alt="" draggable="false" onerror="this.remove()" /><span class="story-plate__txt"><small>${esc(t(`story.guardian.${g.guardian}`, ""))}</small><b>${open ? esc(t(`story.land.${g.id}`, g.id)) : "？？？"}</b></span>` + (open ? `<span class="story-plate__pg num">${cnt} / ${STORY_PLAN[g.w]}</span>` : `<span class="story-plate__lock">🔒</span>`);
    if (open) pl.addEventListener("click", () => _zoomTo(pl, () => showStoryWorld(g.id)));
    plates.appendChild(pl);
  }
  _drawRoads(p, towerUp);
  if (towerUp && _seenTower === false) _say("story.map.towerUp");
  _seenOpen = openLands; _seenTower = towerUp;
}

/** 中央の塔 (= ゼウスの上にファオ。 黒い霧。 立つ前は封印の渦) */
function _tower(up, rise) {
  const el = document.createElement("div");
  el.className = "story-tower" + (up ? " is-up" : " is-sealed") + (rise && !reduceFx() ? " is-rise" : "");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = up
    ? `<i class="story-tower__fog"></i><i class="story-tower__fog story-tower__fog--2"></i><i class="story-tower__bolt"></i><img class="story-tower__fao" src="${img(TOWER.top)}" alt="" draggable="false" onerror="this.remove()" /><img class="story-tower__zeus" src="${img(TOWER.zeus)}" alt="" draggable="false" onerror="this.remove()" />`
    : `<i class="story-tower__fog"></i><span class="story-tower__seal"></span>`;
  return el;
}

/** 道 (= ランドからランドへ。 地図の上の線。 越えた道は光り、 いまの道は点滅、 先は点線) */
function _drawRoads(p, towerUp) {
  const svg = _$("storyMapPaths");
  if (!svg) return;
  const P = (d) => MAP_TERRITORY[d].plate;
  const segs = [
    { from: "ocean", to: "strawberry", d: `M${P("n").x},${P("n").y + 5} C 36,38 36,62 ${P("s").x - 6},${P("s").y - 5}` },
    { from: "strawberry", to: "tangerine", d: `M${P("s").x - 10},${P("s").y} C 18,76 8,62 ${P("w").x},${P("w").y + 6}` },
    { from: "tangerine", to: "lime", d: `M${P("w").x + 6},${P("w").y - 4} C 30,32 70,32 ${P("e").x - 6},${P("e").y - 4}` },
    { from: "lime", to: "grape", d: `M${P("e").x - 8},${P("e").y + 4} C 66,60 60,62 54,60` },
  ];
  const st = (land) => { const l = LANDS.find((x) => x.id === land); const first = `${l.w}-1`, last = `${l.w}-${STORY_PLAN[l.w]}`; return p.cleared.includes(last) ? "done" : (storyUnlocked(first, p) ? "now" : "far"); };
  svg.innerHTML = segs.map((s) => `<path class="story-road story-road--${st(s.to)}" d="${s.d}" vector-effect="non-scaling-stroke" />`).join("");
}

/** 地図の上の一言 (= マインちゃん。 ランドを取り戻したとき・塔が立ったとき。 6 秒で消える) */
let _sayTimer = 0;
function _say(key) {
  const el = _$("storyMapSay"), txt = _$("storyMapSayText");
  if (!el || !txt) return;
  const s = t(key, ""); if (!s || s === key) return;
  txt.textContent = s;
  el.classList.remove("hidden");
  clearTimeout(_sayTimer);
  _sayTimer = setTimeout(() => el.classList.add("hidden"), 6500);
}

/** ランドへズーム (= 0.55 秒) してから次の画面へ */
function _zoomTo(el, then) {
  const board = _$("storyMapBoard");
  if (!board || reduceFx()) { then(); return; }
  const r = el.getBoundingClientRect(), b = board.getBoundingClientRect();
  board.style.transformOrigin = `${r.left - b.left + r.width / 2}px ${r.top - b.top + r.height / 2}px`;
  board.classList.add("is-zoom");
  setTimeout(() => { then(); board.classList.remove("is-zoom"); board.style.transformOrigin = ""; }, 520);
}

// ---------------- S-B ワールド詳細 ----------------
export function showStoryWorld(landId) {
  const land = LANDS.find((l) => l.id === landId);
  if (!land) return;
  naviHide();
  _$("gameModeSelectScreen")?.classList.add("hidden");
  _$("titleScreen")?.classList.add("hidden");
  _$("storyMapScreen")?.classList.add("hidden");
  _worldLand = landId;
  renderStoryWorld(landId);
  const scr = _$("storyWorldScreen");
  scr?.classList.remove("hidden");
  if (scr && !reduceFx()) { scr.classList.add("is-in"); requestAnimationFrame(() => requestAnimationFrame(() => scr.classList.remove("is-in"))); setTimeout(() => scr.classList.remove("is-in"), 80); }
}
export function hideStoryWorld() { _$("storyWorldScreen")?.classList.add("hidden"); }

export function renderStoryWorld(landId) {
  const land = LANDS.find((l) => l.id === landId);
  const head = _$("storyWorldHead"), nodes = _$("storyWorldNodes"), trail = _$("storyWorldTrail"), bg = _$("storyWorldBg");
  if (!land || !head || !nodes || !trail) return;
  const p = loadStory();
  const cur = currentStoryId(p);
  if (bg) bg.style.backgroundImage = `url("${img(land.bg)}")`;
  _$("storyWorldScreen")?.style.setProperty("--land", land.color);
  const cnt = Array.from({ length: STORY_PLAN[land.w] }, (_, i) => `${land.w}-${i + 1}`).filter((id) => p.cleared.includes(id)).length;
  head.innerHTML = `<img class="story-world__cry" src="${img(land.cryptid)}" alt="" draggable="false" onerror="this.remove()" /><span class="story-world__txt"><small>${land.w === 5 ? "CENTER" : `WORLD ${land.w}`} ・ ${esc(t(`story.guardian.${land.guardian}`, ""))}</small><b>${esc(t(`story.land.${land.id}`, land.id))}</b></span><span class="story-world__pg num">${tpl(t("story.map.sub", "クリア {n} / {total}"), { n: String(cnt), total: String(STORY_PLAN[land.w]) })}</span>`;
  const bk = _$("storyWorldBack"); if (bk) bk.textContent = t("story.map.toMap", "◀ マップへ");
  const hint = _$("storyWorldHint"); if (hint) hint.textContent = t(`story.land.${land.id}.hint`, "");
  nodes.innerHTML = "";
  const pts = [];
  for (let i = 1; i <= (STORY_PLAN[land.w] ?? 0); i++) {
    const id = `${land.w}-${i}`;
    const r = STORY_MAP[id];
    const has = !!r;
    const cleared = p.cleared.includes(id);
    const open = has && storyUnlocked(id, p);
    const role = stageRole(r);
    const pos = stagePos(r, i - 1);
    pts.push({ id, pos, cleared, open });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `story-stage story-stage--${role}` + (cleared ? " is-cleared" : "") + (id === cur ? " is-current" : "") + (!open ? " is-locked" : "") + (!has ? " is-todo" : "");
    btn.dataset.story = id;
    btn.disabled = !open;
    btn.style.cssText = `left:${pos.x}%;top:${pos.y}%`;
    const foe = r?.shadow ? `Image/Enemies/${r.shadow.giver}.png` : (r?.boss ? `Image/Enemies/${r.boss.id}.png` : null);
    const label = !has ? t("story.map.todo", "準備中") : (cleared ? t("story.map.cleared", "クリア") : (open ? t("story.map.play", "挑む") : ""));
    btn.innerHTML = (foe ? `<img class="story-stage__foe" src="${img(foe)}" alt="" draggable="false" onerror="this.remove()" />` : "")
      + `<span class="story-stage__art" style="background-image:url('${img(stageArt(land, role))}')"></span><b class="story-stage__id num">${id}</b>` + (label ? `<span class="story-stage__lbl">${esc(label)}</span>` : "");
    if (has) btn.title = t(`story.${id}.name`, id);
    if (open) btn.addEventListener("click", (e) => { if (_travel) return; e.stopPropagation(); showStageInfo(id); });
    nodes.appendChild(btn);
  }
  // 道 (= 札の中心をつなぐ。 札は % で置いているので、 線も % で引ける)
  trail.innerHTML = pts.slice(1).map((b, i) => {
    const a = pts[i];
    const st = b.cleared ? "done" : (b.open ? "now" : "far");
    const mx = (a.pos.x + b.pos.x) / 2;
    return `<path class="story-road story-road--${st}" d="M${a.pos.x},${a.pos.y} C ${mx},${a.pos.y} ${mx},${b.pos.y} ${b.pos.x},${b.pos.y}" vector-effect="non-scaling-stroke" />`;
  }).join("");
}

/**
 * 次のステージへの旅 (= 結果の「次のステージへ」。 詳細の画面に戻り、 次の札が開き、 ヒーローがいまの札から歩いていき、 着いたら暗転して次へ)。
 * 押すと飛ばせる
 */
let _travel = null;
export function travelToNext(fromId, toId) {
  const land = landOf(toId);
  if (!land) { startStoryStage(toId); return; }
  state.storyId = null;
  showStoryWorld(land.id);
  const scr = _$("storyWorldScreen"), nodes = _$("storyWorldNodes");
  const a = nodes?.querySelector(`.story-stage[data-story="${fromId}"]`), b = nodes?.querySelector(`.story-stage[data-story="${toId}"]`);
  if (!scr || !a || !b) { startStoryStage(toId); return; }
  b.classList.add("is-reveal");
  setTimeout(naviHide, 50);   // 結果の画面の吹き出しが残らないように
  const hero = document.createElement("img");
  hero.className = "story-world__hero";
  hero.src = heroImg(state.ownedHero?.heroId ?? 10001); hero.alt = ""; hero.draggable = false;
  hero.style.left = a.style.left; hero.style.top = a.style.top;
  nodes.appendChild(hero);
  let done = false;
  const go = () => { if (done) return; done = true; scr.removeEventListener("click", go); hero.remove(); _travel = null; startStoryStage(toId); };
  _travel = { go };
  scr.addEventListener("click", go);
  const slow = reduceFx();
  setTimeout(() => { hero.classList.add("is-walk"); hero.style.left = b.style.left; hero.style.top = b.style.top; }, slow ? 50 : 700);
  setTimeout(go, slow ? 400 : 3000);
}

// ---------------- S-C ステージの説明 ----------------
export function showStageInfo(id) {
  if (!STORY_MAP[id]) return;
  _infoId = id;
  try { renderStageInfo(id); } catch (e) { console.warn("[story] stage info", e); const c = _$("storyStageCard"); if (c) c.innerHTML = `<div class="ssm-body"><div class="ssm-goal">${esc(t(`story.${id}.name`, id))}</div><div class="ssm-btns"><button type="button" class="btn btn--ghost" id="storyStageClose">${esc(t("story.info.close", "とじる"))}</button><button type="button" class="btn ssm-go" id="storyStageStart">${esc(t("story.info.start", "開始 ▶"))}</button></div></div>`; _$("storyStageClose")?.addEventListener("click", hideStageInfo); _$("storyStageStart")?.addEventListener("click", () => { hideStageInfo(); startStoryStage(id); }); }
  const m = _$("storyStageModal");
  m?.classList.remove("hidden");
  if (m && !reduceFx()) { m.classList.add("is-in"); requestAnimationFrame(() => requestAnimationFrame(() => m.classList.remove("is-in"))); }
}
export function hideStageInfo() { _infoId = null; _$("storyStageModal")?.classList.add("hidden"); }

function _condText(r) {
  const c = r.clear, who = r.shadow ? t(`mission.${r.shadow.id}.giver`, r.shadow.id) : "";
  const n = c.n ?? c.sec ?? (c.kind === "reach" ? (c.points?.length ?? 1) : 1);
  return tpl(t(`story.cond.${c.kind}`, c.kind), { n: String(n), who });
}
function _heroText(r) {
  const lang = getLang();
  const base = r.hero === "select" ? t("story.info.heroSelect", "ヒーローを選ぶ") : (r.hero === "keep" ? t("story.info.heroKeep", "前に選んだヒーロー") : (localizedHeroName(getHero(r.hero) ?? null, lang) || t("hero.mchWarrior", "MCH ウォーリアー")));
  const hp = r.heroMul?.hp ? ` ・ HP ×${r.heroMul.hp}` : "";
  return base + hp;
}
export function renderStageInfo(id) {
  const r = STORY_MAP[id], card = _$("storyStageCard");
  if (!r || !card) return;
  const land = landOf(id);
  const p = loadStory();
  const best = p.best?.[id];
  const role = stageRole(r);
  const foe = r.shadow ? `Image/Enemies/${r.shadow.giver}.png` : (r.boss ? `Image/Enemies/${r.boss.id}.png` : null);
  // エネミー (= 湧く雑魚の絵・撃つ敵・仕掛け・型)
  const pool = r.spawn?.pool ?? [101, 124, 134];
  const en = pool.map((e) => `<img src="${img(`Image/Enemies/${e}.png`)}" alt="" onerror="this.remove()" />`).join("");
  const extra = [];
  if (r.spawn === null) extra.push(t("story.info.flood", "本番の湧き"));
  if (r.features?.shooters) extra.push(t("story.info.shooters", "撃つ敵"));
  if (r.gimmick) extra.push(t(`analysis.src.${r.gimmick}`, r.gimmick));
  if (r.variants) extra.push(t("story.info.variants", "巨人・走る"));
  if (r.shadow?.aura?.spawnMul) extra.push(tpl(t("story.info.auraSpawn", "湧き ×{n} のオーラ"), { n: String(r.shadow.aura.spawnMul) }));
  if (r.shadow?.aura?.speedMul) extra.push(tpl(t("story.info.auraSpeed", "足 ×{n} のオーラ"), { n: String(r.shadow.aura.speedMul) }));
  // 報酬
  const rw = [];
  if (r.showGum) rw.push(`<span>${esc(t("story.info.gum", "GUM（撃破と時間ぶん）"))}</span>`);
  if (r.bond?.gifts) rw.push(`<span class="is-bond">${esc(tpl(t("story.info.gifts", "絆: ギフト券 ×{n}"), { n: String(r.bond.gifts) }))}</span>`);
  for (const u of r.bond?.unlock ?? []) rw.push(`<span class="is-bond">${esc(t(`story.unlock.${u.replace(":", ".")}`, u))}</span>`);
  const bu = bondBurst(r);
  if (bu) rw.push(`<span class="is-bond">${esc(tpl(t("story.info.burst", "絆の報酬ラッシュ: CE {ce}・カード ×{cards}・GUM +{gum}"), { ce: String(bu.ce), cards: String(bu.cards), gum: String(bu.gum) }))}</span>`);
  if (r.unlock) rw.push(`<span class="is-unlock">${esc(t(`story.unlock.${r.unlock.replace(":", ".")}`, r.unlock))}</span>`);
  if (r.treeFirst) rw.push(`<span>${esc(t("story.info.treeFirst", "ステージの前にスキルツリー"))}</span>`);
  const line = r.lines?.intro ? t(r.lines.intro, "") : "";
  card.style.setProperty("--land", land.color);
  card.innerHTML = `
    <div class="ssm-top" style="background-image:url('${img(land.bg)}')">
      <span class="ssm-top__art" style="background-image:url('${img(stageArt(land, role))}')"></span>
      <div class="ssm-top__id"><small>${land.w === 5 ? "CENTER" : `WORLD ${land.w}`} ・ ${esc(t(`story.land.${land.id}`, land.id))} ・ ${id}</small><b>${esc(t(`story.${id}.name`, id))}</b></div>
      ${foe ? `<img class="ssm-top__foe" src="${img(foe)}" alt="" draggable="false" onerror="this.remove()" />` : `<span class="ssm-top__mob">${en}</span>`}
    </div>
    <div class="ssm-body">
      <div class="ssm-row"><span class="ssm-k">${esc(t("story.info.clear", "クリア"))}</span><span class="ssm-goal">${esc(_condText(r))}</span></div>
      <div class="ssm-row"><span class="ssm-k">${esc(t("story.info.enemies", "エネミー"))}</span><span class="ssm-en">${en}${extra.length ? `<span class="ssm-en__txt">${esc(extra.join(" ・ "))}</span>` : ""}</span></div>
      <div class="ssm-row"><span class="ssm-k">${esc(t("story.info.rewards", "報酬"))}</span><span class="ssm-rw">${rw.join("")}</span></div>
      <div class="ssm-row"><span class="ssm-k">${esc(t("story.info.hero", "ヒーロー"))}</span><span>${esc(_heroText(r))}</span></div>
      ${line ? `<div class="ssm-mai"><i style="background-image:url('${img("Image/Characters/navi_ain_00_pointer_up.png")}')"></i><span>${esc(line)}</span></div>` : ""}
      <div class="ssm-best num">${best ? esc(tpl(t("story.info.best", "自己ベスト: {sec} 秒 ・ {kills} 体"), { sec: String(best.sec), kills: String(best.kills) })) : esc(t("story.info.noBest", "自己ベスト: ──"))} ／ ${esc(tpl(t("story.info.target", "目安 {n} 秒"), { n: String(r.targetSec) }))}</div>
      <div class="ssm-btns"><button type="button" class="btn btn--ghost" id="storyStageClose">${esc(t("story.info.close", "とじる"))}</button><button type="button" class="btn ssm-go" id="storyStageStart">${esc(t("story.info.start", "開始 ▶"))}</button></div>
    </div>`;
  _$("storyStageClose")?.addEventListener("click", hideStageInfo);
  _$("storyStageStart")?.addEventListener("click", () => { hideStageInfo(); startStoryStage(id); });
}

// ---------------- 戦闘へ ----------------
/** そのステージを始める (= レシピのヒーローで) */
export async function startStoryStage(id) {
  const r = STORY_MAP[id];
  if (!r) return;
  // 始める前のシーン (= 5-5: COVID の口上。 1 回だけ)
  if (r.sceneBefore && !_sceneShown.has(r.sceneBefore)) { showScene(r.sceneBefore, () => startStoryStage(id)); return; }
  // SPEC-165 3-1: 木を先に (= 根を取るまでほかを押せない。 「ステージへ ▶」で始める)
  if (r.treeFirst && !owns(getMeta(), ROOT_ID) && !_treeDone) {
    const T = await import("./skill-tree.js");
    hideStoryWorld(); hideStoryMap();
    T.openSkillTree({ go: () => { _treeDone = true; startStoryStage(id); } });
    return;
  }
  _treeDone = false;
  // ヒーロー: "select" = ヒーロー選択を開く (= 3-2 から) / "keep" = 前に選んだ人 / 数字 = 固定
  const hero = r.hero === "select" ? null : getHero(r.hero === "keep" ? (loadStory().loadout?.hero ?? state.ownedHero?.heroId ?? STORY_HERO) : r.hero);   // "keep" = 持ち物に残した人 (= タイトルに戻っても同じ人)
  if (r.hero !== "select" && !hero) return;
  state.regulation = REGULATION_NORMAL;
  state.rtaMode = false;
  state.storyId = id;
  state.absolute = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  if (!hero) {
    const M = await import("./main.js");
    startMenuBgm();
    playWipe(() => { hideStoryWorld(); hideStoryMap(); document.getElementById("app")?.classList.remove("hidden"); M.openHeroSelectModal(); }, { label: `STORY // ${id}` });
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
    hideStoryWorld(); hideStoryMap();
    naviHide();
    document.getElementById("app")?.classList.remove("hidden");   // 戦闘の画面 (= ヒーロー選択を通らないので、 ここで出す)
    m.startBattle(state.ownedHero);
  }, { label: `STORY // ${id}` });
}

/** ストーリーをやめる (= 結果の画面の「マップへ」。 いたランドの詳細へ戻る。 プロローグの後は地図へ) */
export function backToStoryMap() {
  const id = state.storyId;
  const r = id ? STORY_MAP[id] : null;
  state.storyId = null;
  // ランドの最後 (= 次が別のランド) は地図へ (= 靄が晴れて次のランドが現れるのを見る)。 途中なら詳細へ
  const land = id && id !== PROLOGUE.id && nextInSameLand(id) ? landOf(id) : null;
  const go = () => { if (land) showStoryWorld(land.id); else showStoryMap(); };
  if (r?.scene && !_sceneShown.has(r.scene)) { showScene(r.scene, go); return; }   // プロローグ (= 裂け目のあと)
  if (r?.sceneAfter && loadStory().cleared.includes(id)) { showScene(r.sceneAfter, go, { once: true }); return; }   // エンディング
  go();
}

// ---------------- シーン (= マインちゃんの台詞を 1 つずつ。 押すと次。 最後は「ワールドマップへ」) ----------------
const _sceneShown = new Set();
let _scene = null;
export function showScene(sceneId, onDone, { once = false } = {}) {
  if (once && _sceneShown.has(sceneId)) { onDone?.(); return; }
  _sceneShown.add(sceneId);
  const lines = [];
  for (let i = 1; i <= 12; i++) { const k = `story.scene.${sceneId}.${i}`; const s = t(k, ""); if (!s || s === k) break; lines.push({ key: k, text: s, pose: SCENE_POSES[sceneId]?.[i - 1] ?? "normal" }); }
  if (!lines.length) { onDone?.(); return; }
  _scene = { id: sceneId, lines, i: 0, onDone };
  _$("gameModeSelectScreen")?.classList.add("hidden"); _$("titleScreen")?.classList.add("hidden");
  _$("storyMapScreen")?.classList.add("hidden"); _$("storyWorldScreen")?.classList.add("hidden");
  const scr = _$("storySceneScreen");
  if (!scr) { onDone?.(); return; }
  scr.classList.remove("hidden");
  _renderScene();
}
const SCENE_POSES = { prologue: ["shy", "smile", "pointer", "cross", "wave"], final: [null, null, "pointer"], ending: [null, "smile", "wave"] };   // NAVI_POSES の名前 (= null は相手が話す)
/** 相手が話す行 (= COVID-19。 顔は Image/Enemies/681.png、 名前は図鑑のまま) */
const SCENE_SPEAKER = { final: ["covid", "covid", "mine"], ending: ["covid", "mine", "mine"] };
function _renderScene() {
  const sc = _scene, scr = _$("storySceneScreen");
  if (!sc || !scr) return;
  const ln = sc.lines[sc.i], last = sc.i >= sc.lines.length - 1;
  const who = SCENE_SPEAKER[sc.id]?.[sc.i] ?? "mine";
  const face = _$("storySceneFace"); if (face) { face.src = who === "covid" ? img(`Image/Enemies/${FINAL_BOSS_ID}.png`) : _poseUrl(ln.pose); face.classList.toggle("is-foe", who === "covid"); }
  const nm = _$("storySceneName"); if (nm) nm.textContent = who === "covid" ? "COVID-19" : "NAVI // MINE";
  scr.classList.toggle("is-foe", who === "covid");
  const txt = _$("storySceneText"); if (txt) { txt.textContent = ""; _typeInto(txt, ln.text); }
  const pg = _$("storySceneNo"); if (pg) pg.textContent = `${sc.i + 1} / ${sc.lines.length}`;
  const next = _$("storySceneNext"); if (next) next.textContent = last ? t("story.scene.toMap", "ワールドマップへ ▶") : t("story.scene.next", "▶");
}
function _poseUrl(pose) {
  // navi の frames: NAVI_POSES の名前 → フレーム名。 無ければそのまま
  const name = NAVI_POSES?.[pose] ?? NAVI_POSES.smile;
  try { return naviFrameUrl(name); } catch { return ""; }
}
let _typeTimer = 0;
function _typeInto(el, text) {
  clearInterval(_typeTimer);
  if (reduceFx()) { setRichTextN(el, text); return; }
  let i = 0;
  _typeTimer = setInterval(() => { i += 1; setRichTextN(el, text, i); if (i >= text.length) clearInterval(_typeTimer); }, 28);
}
function _sceneAdvance() {
  const sc = _scene; if (!sc) return;
  const txt = _$("storySceneText");
  if (txt && txt.textContent.length < sc.lines[sc.i].text.length) { clearInterval(_typeTimer); setRichTextN(txt, sc.lines[sc.i].text); return; }   // 途中なら全部出す
  if (sc.i < sc.lines.length - 1) { sc.i += 1; _renderScene(); return; }
  _scene = null;
  _$("storySceneScreen")?.classList.add("hidden");
  sc.onDone?.();
}
export function wireScene() {
  _$("storySceneNext")?.addEventListener("click", _sceneAdvance);
  _$("storySceneTap")?.addEventListener("click", _sceneAdvance);
}

// ---------------- 次元の裂け目 (= プロローグのゴール。 SE → 画面がゆがんで暗転 → シーン) ----------------
export function playRift(then) {
  const el = document.createElement("div");
  el.className = "story-rift";
  el.innerHTML = '<i class="story-rift__ring"></i><i class="story-rift__ring story-rift__ring--2"></i><i class="story-rift__dark"></i>';
  document.body.appendChild(el);
  document.body.classList.add("is-rift");
  try { playSe(SFX.GIMMICK_WARN, 0, 0.8); setTimeout(() => playSe(SFX.PICK_BUFF, 0, 0.7), 500); } catch {}
  const ms = reduceFx() ? 600 : 2600;
  setTimeout(() => { document.body.classList.remove("is-rift"); then?.(); setTimeout(() => el.remove(), 600); }, ms);
}
