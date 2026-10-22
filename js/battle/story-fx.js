// ============================================================
// battle/story-fx.js — ストーリーの演出 (= SPEC-165)。 ランクアップ (1-5: ブレード → エリートブレード)
// ============================================================
//
// 画面の真ん中に元の絵 → 光と震え → 次の段の絵が大きく出て名前。 body に置く (= render() で消えない)。 押すと飛ばせる。

import { getExt, extTierImg, getTierName } from "../extensions.js";
import { t, getLang } from "../i18n.js";
import { playSe } from "../audio.js";
import { SFX } from "../constants.js";

const DUR_MS = 3400;
let _timer = 0;

/** ランクアップの演出。 終わったら onDone (= 1 回だけ) */
export function playRankup(extId, lvBefore, lvAfter, onDone) {
  document.querySelector(".story-rankup")?.remove();
  const ext = getExt(extId);
  const lang = getLang();
  const from = getTierName(ext, Math.max(1, lvBefore), lang), to = getTierName(ext, Math.max(1, lvAfter), lang);
  const el = document.createElement("div");
  el.className = "story-rankup";
  el.setAttribute("role", "dialog");
  el.innerHTML = `
    <i class="story-rankup__rays"></i><i class="story-rankup__rays story-rankup__rays--2"></i>
    <div class="story-rankup__stage">
      <img class="story-rankup__from" src="${extTierImg(ext, Math.max(1, lvBefore))}" alt="" draggable="false" />
      <img class="story-rankup__to" src="${extTierImg(ext, Math.max(1, lvAfter))}" alt="" draggable="false" />
      <i class="story-rankup__flash"></i>
    </div>
    <div class="story-rankup__txt"><small>${t("story.rankup.kicker", "RANK UP")}</small><b>${esc(from)} <span>→</span> ${esc(to)}</b></div>
    <span class="story-rankup__skip">${t("story.rankup.skip", "タップで飛ばす")}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-run"));
  try { playSe(SFX.PICK_BUFF, 0, 0.7); setTimeout(() => playSe(SFX.LEVEL_UP, 0, 0.8), 900); } catch {}
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    clearTimeout(_timer);
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 350);
    onDone?.();
  };
  el.addEventListener("click", finish);
  const reduce = document.documentElement.hasAttribute("data-reduce-fx") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  _timer = setTimeout(finish, reduce ? 900 : DUR_MS);
  return finish;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
