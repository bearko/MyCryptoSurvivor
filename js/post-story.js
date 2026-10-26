// ============================================================
// post-story.js — ストーリーを終えたら「ここからが本番」 (= SPEC-177)
// ============================================================
//
// 初めて 5-5 を終えたとき、 エンディングのシーンのあと (= モード選択の代わりに) 1 回だけ出す。
// NORMAL のボス 3 体・開いたもの・挑む → GUM → スキルツリーの輪を 1 枚で見せ、 ボタン 1 つで NORMAL のヒーロー選択へ。
// 上半分は純関数 (= テストする)。

import { LS_PREFIX, STAGE_TABLE, img } from "./constants.js";
import { t, getLang } from "./i18n.js";
import { getEnemy, enemyImg, localizedEnemyName } from "./enemies.js";
import { naviFrameUrl, poseFrame, naviHide } from "./navi.js";
import { heroImg } from "./heroes.js";
import { STORY_HERO, tutorialStepOf } from "./story.js";
import { reportTutorialStep } from "./platform.js";
import { ICON_GUM } from "./meta-ui.js";

/** 出したかの印 (= この端末で 1 回だけ) */
export const LS_POST_STORY = `${LS_PREFIX}.postStory`;

/** 出すか (= まだ出していない。 storage が無い・壊れているときは出さない (= 毎回出るよりよい)) */
export function shouldShowPostStory(storage = globalThis.localStorage) {
  try { return !!storage && storage.getItem(LS_POST_STORY) !== "1"; } catch (_) { return false; }
}
export function markPostStoryShown(storage = globalThis.localStorage) {
  try { storage?.setItem(LS_POST_STORY, "1"); } catch (_) { /* 書けなくても遊べる */ }
}

/** NORMAL のボス (= 3 つのノードの順) */
export function normalBosses() {
  return STAGE_TABLE.map((s) => ({ stageKey: s.nameKey, enemyId: s.bossEnemyId }));
}

// ---- 下半分: 画面 ----

function _$(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
let _wired = false;

/** 画面を出す。 押したら onGo (= NORMAL のヒーロー選択へ) */
export function showPostStory({ onGo } = {}) {
  const scr = _$("postStoryScreen");
  if (!scr) { onGo?.(); return; }
  markPostStoryShown();
  reportTutorialStep(tutorialStepOf("next"));
  naviHide();
  for (const id of ["titleScreen", "gameModeSelectScreen", "storyMapScreen", "storyWorldScreen", "storySceneScreen"]) _$(id)?.classList.add("hidden");
  _render();
  if (!_wired) {
    _wired = true;
    _$("postStoryGo")?.addEventListener("click", () => _onGo?.());   // 画面はワイプで覆ったところで閉じる (= mode-select の _pick)
  }
  _onGo = onGo;
  scr.classList.remove("hidden");
  scr.scrollTop = 0;
}
let _onGo = null;

function _render() {
  const lang = getLang();
  const bosses = _$("postStoryBosses");
  if (bosses) {
    bosses.innerHTML = normalBosses().map((b, i) => {
      const name = localizedEnemyName(getEnemy(b.enemyId), lang);
      return `<li class="post-story__boss" style="--i:${i}">
        <img class="post-story__boss-img" src="${esc(enemyImg(b.enemyId))}" alt="" draggable="false" onerror="this.style.visibility='hidden'" />
        <span class="post-story__boss-name">${esc(name)}</span>
        <span class="post-story__boss-stage">${esc(t(b.stageKey, b.stageKey))}</span>
      </li>`;
    }).join("");
  }
  const loop = _$("postStoryLoop");
  if (loop) {
    const cells = [
      { cls: "run",  icon: heroImg(STORY_HERO),               key: "postStory.loop.run",  fb: "挑む" },
      { cls: "gum",  icon: img(ICON_GUM),                     key: "postStory.loop.gum",  fb: "GUM を持ち帰る" },
      { cls: "tree", icon: img("Image/Extensions/5033.png"),  key: "postStory.loop.tree", fb: "スキルツリーで強くなる" },
      { cls: "far",  icon: enemyImg(STAGE_TABLE.at(-1).bossEnemyId), key: "postStory.loop.far", fb: "もっと遠くへ" },
    ];
    loop.innerHTML = cells.map((c, i) => `<li class="post-story__step post-story__step--${c.cls}" style="--i:${i}">
        <img src="${esc(c.icon)}" alt="" draggable="false" onerror="this.style.visibility='hidden'" />
        <span>${esc(t(c.key, c.fb))}</span>
      </li>`).join("");
  }
  const face = _$("postStoryFace");
  if (face) face.src = naviFrameUrl(poseFrame("wink"));
}
