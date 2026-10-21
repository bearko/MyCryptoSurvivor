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
import { LANDS, STORY_PLAN, STORY_MAP, loadStory, storyUnlocked, currentStoryId } from "./story.js";
import { owns } from "./skill-logic.js";
import { ROOT_ID } from "./skill-data.js";
import { getMeta } from "./meta.js";
import { newRunStats } from "./battle/run-stats.js";

let _wired = false;
let _onBack = null;
let _treeDone = false;   // SPEC-165: 3-1 の木を通った (= 「ステージへ ▶」のあと)

function _$(id) { return document.getElementById(id); }

export function installStoryMap({ onBack } = {}) {
  _onBack = onBack ?? null;
  if (_wired) return;
  _wired = true;
  _$("storyMapBack")?.addEventListener("click", () => { hideStoryMap(); _onBack?.(); });
  onLangChange(() => { if (!_$("storyMapScreen")?.classList.contains("hidden")) renderStoryMap(); });
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

/** 描く (= 進みを読み直す) */
export function renderStoryMap() {
  const root = _$("storyMapLands");
  if (!root) return;
  const p = loadStory();
  const cur = currentStoryId(p);
  const ti = _$("storyMapTitle"); if (ti) ti.textContent = t("story.map.title", "ストーリー");
  const sb = _$("storyMapSub"); if (sb) sb.textContent = tpl(t("story.map.sub", "クリア {n} / {total}"), { n: String(p.cleared.length), total: String(Object.values(STORY_PLAN).reduce((a, v) => a + v, 0)) });
  const bk = _$("storyMapBack"); if (bk) bk.textContent = t("story.map.back", "◀ モード選択へ");
  root.innerHTML = "";
  for (const land of LANDS) {
    const row = document.createElement("section");
    row.className = "story-land";
    row.style.setProperty("--land", land.color);
    row.style.backgroundImage = `url("${img(land.bg)}")`;
    const head = document.createElement("h3");
    head.className = "story-land__name";
    head.innerHTML = `<small>WORLD ${land.w}</small>`;
    const nm = document.createElement("span"); nm.textContent = t(`story.land.${land.id}`, land.id); head.appendChild(nm);
    row.appendChild(head);
    const dots = document.createElement("div");
    dots.className = "story-land__stages";
    for (let i = 1; i <= (STORY_PLAN[land.w] ?? 0); i++) {
      const id = `${land.w}-${i}`;
      const has = !!STORY_MAP[id];
      const cleared = p.cleared.includes(id);
      const open = has && storyUnlocked(id, p);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "story-stage" + (cleared ? " is-cleared" : "") + (id === cur ? " is-current" : "") + (!open ? " is-locked" : "") + (!has ? " is-todo" : "");
      btn.dataset.story = id;
      btn.disabled = !open;
      const label = !has ? t("story.map.todo", "準備中") : (cleared ? t("story.map.cleared", "クリア") : (open ? t("story.map.play", "挑む") : "🔒"));
      btn.innerHTML = `<b class="num">${id}</b><span>${label}</span>`;
      if (has) btn.title = t(`story.${id}.name`, id);
      if (open) btn.addEventListener("click", () => startStoryStage(id));
      dots.appendChild(btn);
    }
    row.appendChild(dots);
    root.appendChild(row);
  }
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
