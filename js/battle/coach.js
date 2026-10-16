// ============================================================
// battle/coach.js — はじめての操作ガイド (= SPEC-042)
// ============================================================
//
// 初回のステージ 1 だけ、戦闘の上に短い帯を出す。 遊びは止めない (= pointer-events: none)。
//   step 0: 「ドラッグで移動／攻撃は自動」 → 動いた合計 COACH_MOVE_MS か COACH_STEP1_MAX_MS で次へ
//   step 1: 「ジェムを拾うと Lv アップ」 → COACH_STEP2_MS で終わり (= mcs.coachSeen を保存)
// 進み方は純関数 nextCoach に閉じ込めてテストする。 一時停止中は _loop が tick を呼ばないので数えない。

import { state } from "../state.js";
import { LS_COACH_SEEN } from "../constants.js";
import { t } from "../i18n.js";

export const COACH_MOVE_MS      = 600;
export const COACH_STEP1_MAX_MS = 8000;
export const COACH_STEP2_MS     = 4000;

/**
 * @param {{step:number, movedMs:number, stepMs:number}|null} coach
 * @param {number} dtMs
 * @param {boolean} moving
 * @returns {{step:number, movedMs:number, stepMs:number}|null} null = 終わり
 */
export function nextCoach(coach, dtMs, moving) {
  if (!coach) return null;
  const c = {
    step: coach.step,
    movedMs: coach.movedMs + (moving ? dtMs : 0),
    stepMs: coach.stepMs + dtMs,
  };
  if (c.step === 0 && (c.movedMs >= COACH_MOVE_MS || c.stepMs >= COACH_STEP1_MAX_MS)) {
    return { step: 1, movedMs: 0, stepMs: 0 };
  }
  if (c.step === 1 && c.stepMs >= COACH_STEP2_MS) return null;
  return c;
}

function _seen() {
  try { return localStorage.getItem(LS_COACH_SEEN) === "1"; } catch (_) { return false; }
}

function _markSeen() {
  try { localStorage.setItem(LS_COACH_SEEN, "1"); } catch (_) {}
}

function _render(coach) {
  const el = document.getElementById("coachHint");
  if (!el) return;
  if (!coach) {
    el.classList.add("hidden");
    return;
  }
  el.dataset.step = String(coach.step);
  const text = el.querySelector(".coach__text");
  if (text) text.textContent = t(coach.step === 0 ? "coach.move" : "coach.gems");
  el.classList.remove("hidden");
}

/** ステージ 1 の開始で呼ぶ。 初回なら帯を出す。 */
export function startCoachIfFirst() {
  const b = state.battle;
  b.coach = null;
  if ((state.currentStageIdx ?? 0) !== 0 || _seen()) {
    _render(null);
    return;
  }
  b.coach = { step: 0, movedMs: 0, stepMs: 0 };
  _render(b.coach);
}

/** RAF ループから (= 一時停止中は呼ばれない)。 */
export function tickCoach(dt, moving) {
  const b = state.battle;
  if (!b.coach) return;
  const prevStep = b.coach.step;
  b.coach = nextCoach(b.coach, dt * 1000, moving);
  if (!b.coach) {
    _markSeen();
    _render(null);
  } else if (b.coach.step !== prevStep) {
    _render(b.coach);
  }
}

/** 戦闘を離れるとき (= タイトルに戻る) に帯を消す。 見終えていなければ次の挑戦でまた出る。 */
export function hideCoach() {
  state.battle.coach = null;
  _render(null);
}
