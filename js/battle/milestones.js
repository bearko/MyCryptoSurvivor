// ============================================================
// milestones.js — 撃破数の節目の演出 (= SPEC-105)
// ============================================================
//
// 通算の撃破数 (= 挑戦の頭から。 ステージをまたいで数える) が節目を越えたら、 画面の上に大きな通知を出す。
// 遊びは止めない (= pauseTime に触らない・操作を奪わない)。 1.6 秒で上へ抜ける。
// 通算 = ステージの始まりの run.totalKills + そのステージの killCount (= ステージの終わりの足し込みで二重に数えない)。

import { state } from "../state.js";
import { t, tpl } from "../i18n.js";
import { playSe } from "../audio.js";
import { SFX } from "../constants.js";
import { prefersReducedMotion } from "../motion.js";

/** 節目 (= その先は 5,000 ごと) */
export const KILL_MILESTONES = Object.freeze([100, 250, 500, 1000, 1500, 2000, 3000, 5000, 7500, 10000]);
export const MILESTONE_STEP_AFTER = 5000;
export const MILESTONE_SHOW_MS = 1600;

/** total より大きい、 次の節目 (= 純関数) */
export function nextMilestone(total) {
  const n = Math.max(0, total | 0);
  for (const m of KILL_MILESTONES) if (m > n) return m;
  const last = KILL_MILESTONES[KILL_MILESTONES.length - 1];
  return last + (Math.floor((n - last) / MILESTONE_STEP_AFTER) + 1) * MILESTONE_STEP_AFTER;
}

/** prev から now のあいだに越えた節目のうち、 いちばん大きいもの (= 無ければ 0。 純関数) */
export function crossedMilestone(prev, now) {
  let m = nextMilestone(prev), hit = 0;
  while (m <= now) { hit = m; m = nextMilestone(m); }
  return hit;
}

let _base = 0;      // このステージの始まりの通算
let _last = 0;      // 前に見た通算
let _timer = 0;

/** ステージの始まり (= startBattle)。 run.totalKills はステージ 1 なら 0 に戻っている */
export function resetMilestones(base = state.run?.totalKills ?? 0) {
  _base = base | 0;
  _last = _base;
  clearTimeout(_timer);
  clearTimeout(_threatTimer);
  globalThis.document?.getElementById("killMilestone")?.classList.add("hidden");
  globalThis.document?.getElementById("threatNotice")?.classList.add("hidden");
}

export function totalKills() {
  return _base + (state.killCount | 0);
}

/** 毎コマ (= 進んでいるとき) */
export function tickMilestones(topPx = null) {
  const now = totalKills();
  if (now <= _last) { _last = now; return; }
  const hit = crossedMilestone(_last, now);
  _last = now;
  if (hit) showMilestone(hit, topPx);
}

/** SPEC-107: 段階ごとの「何が出はじめるか」 */
const THREAT_KEYS = [null, "threat.t1", "threat.t2", "threat.t3", "threat.t4"];
let _threatTimer = 0;

/** SPEC-107: 敵の段階が上がった (= 節目の通知の下に小さく。 遊びは止めない) */
export function showThreatNotice(tier, topPx = null) {
  const el = globalThis.document?.getElementById("threatNotice");
  const key = THREAT_KEYS[tier];
  if (!el || !key) return;
  el.textContent = t(key, key);
  const ms = globalThis.document?.getElementById("killMilestone");
  const top = topPx ?? (ms?.style.top ? parseFloat(ms.style.top) : null);
  if (top != null) el.style.top = `${Math.round(top + 70)}px`;
  el.classList.remove("hidden", "threat-notice--go");
  void el.offsetWidth;
  el.classList.add("threat-notice--go");
  playSe(SFX.GIMMICK_WARN, 0, 0.45);
  clearTimeout(_threatTimer);
  _threatTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

export function showMilestone(n, topPx = null) {
  const el = globalThis.document?.getElementById("killMilestone");
  if (!el) return;
  el.querySelector(".kill-milestone__num").textContent = (n | 0).toLocaleString();
  el.querySelector(".kill-milestone__label").textContent = t("milestone.kills", "体撃破！");
  el.setAttribute("aria-label", tpl(t("milestone.aria", "{n} 体撃破"), { n: (n | 0).toLocaleString() }));
  if (topPx != null) el.style.top = `${Math.round(topPx)}px`;
  el.classList.remove("hidden", "kill-milestone--go");
  void el.offsetWidth;   // アニメーションをかけ直す
  el.classList.add("kill-milestone--go");
  playSe(SFX.LEVEL_UP, 0, 0.5);
  clearTimeout(_timer);
  _timer = setTimeout(() => el.classList.add("hidden"), prefersReducedMotion() ? 1200 : MILESTONE_SHOW_MS);
}
