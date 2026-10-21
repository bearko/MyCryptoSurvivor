// ============================================================
// battle/boss-chest.js — ボスを倒したときの宝箱 (= SPEC-153)。 開けるとゴールドダスト
// ============================================================
//
// ボスが倒れた瞬間に時間を止め、 真ん中に宝箱 (= 財宝ゴールデンモアイ 5106) が落ちてくる。
// 押すか 1.2 秒で開く → 閃光と紙吹雪とゴールドダストの数 → 「つぎへ」か 2.4 秒でステージの終わりへ。
// ゴールドダストはここで足す (= stage-transition は snap.dust にこの値を使う)。 今までは結果の画面で足していて、 いつもらったか分かりにくかった。
// 開けているあいだは state.battle.bossChestOpen (= enemies.js のステージの終わりが待つ)。

import { state, pauseTime, resumeTime } from "../state.js";
import { t, tpl } from "../i18n.js";
import { img, SFX, CHEST_EXT_ID } from "../constants.js";
import { playSe } from "../audio.js";
import { grantBossDust } from "../meta.js";
import { perk } from "../perks.js";
import { ICON_DUST } from "../meta-ui.js";
import { countUp } from "../reveal.js";
import { startConfetti, removeConfetti } from "../confetti.js";
import { resetResumeCountdown } from "./resume-countdown.js";
import { prefersReducedMotion } from "../motion.js";

export const BOSS_CHEST = Object.freeze({ dropMs: 500, autoOpenMs: 1200, autoNextMs: 2400 });

let _el = null, _timer = 0, _phase = null;

function _ensure() {
  if (_el || typeof document === "undefined") return _el;
  _el = document.createElement("div");
  _el.id = "bossChestModal";
  _el.className = "boss-chest hidden";
  _el.setAttribute("role", "dialog");
  _el.setAttribute("aria-modal", "true");
  _el.innerHTML =
    `<div class="boss-chest__card">` +
    `<p class="boss-chest__kicker"></p>` +
    `<button type="button" class="boss-chest__box" aria-label=""><img class="boss-chest__img" alt="" /></button>` +
    `<div class="boss-chest__got hidden"><img class="boss-chest__dust" alt="" /><b class="boss-chest__n num">+0</b><span class="boss-chest__label"></span></div>` +
    `<button type="button" class="btn boss-chest__next hidden"></button>` +
    `</div>`;
  document.body.appendChild(_el);
  _el.querySelector(".boss-chest__img").src = img(`Image/Extensions/${CHEST_EXT_ID}.png`);
  _el.querySelector(".boss-chest__dust").src = img(ICON_DUST);
  _el.querySelector(".boss-chest__box").addEventListener("click", () => { if (_phase === "drop") _open(); });
  _el.querySelector(".boss-chest__next").addEventListener("click", () => { if (_phase === "open") _close(); });
  return _el;
}

/** ボスが倒れた (= damage.js から)。 出せたら true */
export function dropBossChest() {
  const b = state.battle;
  if (!b || _phase || !b.active || !_ensure()) { if (b) b.bossChestOpen = false; return false; }
  if (b.gameOver && !b.bossDefeated) { b.bossChestOpen = false; return false; }   // そのあいだに倒れていたら出さない
  b.bossChestOpen = true;
  b.bossChestDust = null;
  pauseTime();
  _phase = "drop";
  const el = _el;
  el.querySelector(".boss-chest__kicker").textContent = t("chest.boss.title", "ボスの宝箱");
  el.querySelector(".boss-chest__box").setAttribute("aria-label", t("chest.boss.open", "開ける"));
  el.querySelector(".boss-chest__got").classList.add("hidden");
  el.querySelector(".boss-chest__next").classList.add("hidden");
  el.querySelector(".boss-chest__next").textContent = t("chest.boss.next", "つぎへ ▶");
  el.classList.remove("hidden", "boss-chest--open", "boss-chest--in");
  void el.offsetWidth;
  el.classList.add("boss-chest--in");
  playSe(SFX.LEVEL_UP, 0, 0.5);   // open_treasure.mp3 (= 落ちてくる音)
  clearTimeout(_timer);
  _timer = setTimeout(_open, prefersReducedMotion() ? 200 : BOSS_CHEST.autoOpenMs);
  return true;
}

function _open() {
  if (_phase !== "drop") return;
  _phase = "open";
  const b = state.battle;
  const idx = state.currentStageIdx ?? 0;
  const dust = grantBossDust(idx, { bonus: perk("bossDust") });   // SPEC-090c: 金運
  b.bossChestDust = dust;
  const el = _el;
  el.classList.add("boss-chest--open");
  const got = el.querySelector(".boss-chest__got");
  got.classList.remove("hidden");
  el.querySelector(".boss-chest__label").textContent = t("meta.dust", "ゴールドダスト");
  const n = el.querySelector(".boss-chest__n");
  countUp(n, dust, { durMs: 500, delayMs: 200, format: (v) => `+${Math.round(v)}` });
  playSe(SFX.PICK_HEAL, 0, 0.6);
  startConfetti({ durationMs: 1500 });
  el.querySelector(".boss-chest__next").classList.remove("hidden");
  clearTimeout(_timer);
  _timer = setTimeout(_close, BOSS_CHEST.autoNextMs);
}

function _close() {
  if (_phase !== "open") return;
  _phase = null;
  clearTimeout(_timer);
  removeConfetti();
  _el?.classList.add("hidden");
  const b = state.battle;
  b.bossChestOpen = false;
  resumeTime();
  resetResumeCountdown();   // Ready → Go! は出さない (= すぐステージの終わりへ)
}

/** 戦闘をやめたとき (= 出ていれば片づける。 時間は戻す) */
export function clearBossChest() {
  clearTimeout(_timer);
  if (_phase) { _phase = null; _el?.classList.add("hidden"); if (state.battle) state.battle.bossChestOpen = false; resumeTime(); }
}

export function isBossChestOpen() { return !!_phase; }
