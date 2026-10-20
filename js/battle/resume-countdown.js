// ============================================================
// resume-countdown.js — 遊びを中断する画面を閉じたら、 3 秒数えてから再開する (= SPEC-104)
// ============================================================
//
// レベルアップ・メニュー・設定・ランキング (= あとでショップ・ミッションも) を閉じた瞬間に動き出すと、
// 戦況が分からないまま倒されることがある。 閉じたら真ん中に 3・2・1 を出し、 数え終えてから時間を進める。
// 画面ごとに書かず、 ループで「止まっていた → 動き出す」 を見て、 ここで 1 つだけ止めを足す (= pauseTime を対で使う)。
// 数えているあいだに別の画面が開いたら (= 止めが 2 つ以上)、 閉じてから数え直す。 タブを離れて戻ったときも数え直す。

import { state, pauseTime, resumeTime } from "../state.js";

/** 数える長さ */
export const RESUME_COUNTDOWN_MS = 3000;
/** ステージが始まってすぐ (= 敵がいない) は数えない */
export const RESUME_MIN_ELAPSED_MS = 1000;
/** これより短い止まり方は数えない (= 1 コマだけの止めなど) */
export const RESUME_MIN_PAUSE_MS = 150;
/** 1 コマの間がこれより長い (= タブを離れていた) なら数え直す */
export const RESUME_GAP_MS = 500;

/** 数えるか (= 純関数) */
export function shouldCountdown({ active, elapsedMs, pausedMs }) {
  return !!active && (elapsedMs | 0) >= RESUME_MIN_ELAPSED_MS && pausedMs >= RESUME_MIN_PAUSE_MS;
}

/** 出す数字 (= 3 → 2 → 1。 純関数) */
export function countdownNumber(remainMs) {
  return Math.min(3, Math.max(1, Math.ceil(remainMs / 1000)));
}

let _pausedSince = null;   // 止まり始めた時刻 (= 数えていないとき)
let _endAt = 0;            // 数え終える時刻 (= 0 なら数えていない)
let _lastNow = 0;
let _shown = 0;

export function isResumeCounting() { return _endAt > 0; }

function _el() { return globalThis.document?.getElementById("resumeCountdown"); }

function _show(n) {
  if (_shown === n) return;
  _shown = n;
  const el = _el();
  if (!el) return;
  el.querySelector(".resume-countdown__num").textContent = String(n);
  el.classList.remove("hidden", "resume-countdown--tick");
  void el.offsetWidth;   // アニメーションをかけ直す
  el.classList.add("resume-countdown--tick");
}

function _hide() {
  _shown = 0;
  const el = _el();
  el?.classList.add("hidden");
  el?.classList.remove("resume-countdown--tick");
}

function _start(now) {
  pauseTime();   // ← 数え終えたら resumeTime (= 対)
  _endAt = now + RESUME_COUNTDOWN_MS;
  _show(3);
}

function _finish() {
  _endAt = 0;
  _hide();
  resumeTime();
}

/**
 * 数えるのをやめる。 release: 数えている途中なら、 こちらの止めも外す (= ステージの始まり)。
 * タイトルに戻る・やり直すときは、 呼ぶ側が止めを全部外すので release しない
 */
export function resetResumeCountdown({ release = false } = {}) {
  if (_endAt && release) resumeTime();
  _pausedSince = null;
  _endAt = 0;
  _hide();
}

/** 毎コマ (= 止まっていても) 呼ぶ。 now は requestAnimationFrame の時刻 */
export function tickResumeCountdown(now) {
  const gap = _lastNow ? now - _lastNow : 0;
  _lastNow = now;
  const b = state.battle;
  if (!b?.active) {
    if (_endAt) resetResumeCountdown({ release: true });
    _pausedSince = null;
    return;
  }
  if (_endAt) {
    // 数えているあいだに別の画面が開いた・タブを離れていた → 閉じて戻ってから数え直す
    if (state.pauseFlags > 1 || gap > RESUME_GAP_MS) { _endAt = now + RESUME_COUNTDOWN_MS; _show(3); return; }
    if (now >= _endAt) { _finish(); return; }
    _show(countdownNumber(_endAt - now));
    return;
  }
  if (state.pauseFlags > 0) {
    if (_pausedSince == null) _pausedSince = now;
    return;
  }
  if (_pausedSince != null) {
    const pausedMs = now - _pausedSince;
    _pausedSince = null;
    if (shouldCountdown({ active: b.active, elapsedMs: b.stageElapsedMs, pausedMs })) _start(now);
  }
}
