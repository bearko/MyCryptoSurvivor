// ============================================================
// resume-countdown.js — 遊びを中断する画面を閉じたら、 Ready → Go! で再開する (= SPEC-104。 SPEC-142 で 3・2・1 から)
// ============================================================
//
// レベルアップ・メニュー・設定・ランキング・ショップ・ミッションを閉じた瞬間に動き出すと、
// 戦況が分からないまま倒されることがある。 閉じたら真ん中に「Ready」を出して少しだけ止め、
// 「Go!」が出た瞬間に時間を進める (= Go! は動きながら消える)。 3・2・1 はテンポが遅いという声があった (= SPEC-142)。
// 画面ごとに書かず、 ループで「止まっていた → 動き出す」 を見て、 ここで 1 つだけ止めを足す (= pauseTime を対で使う)。
// 数えているあいだに別の画面が開いたら (= 止めが 2 つ以上)、 閉じてから数え直す。 タブを離れて戻ったときも数え直す。

import { state, pauseTime, resumeTime } from "../state.js";

/** 止めておく長さ (= 「Ready」のあいだ。 SPEC-142: 3 秒 → 0.8 秒) */
export const RESUME_COUNTDOWN_MS = 800;
/** 「Go!」を出しておく長さ (= もう動いている) */
export const RESUME_GO_MS = 500;
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

/** 出す言葉 (= 止まっているあいだは Ready、 動き出したら Go!。 純関数) */
export function countdownWord(remainMs) {
  return remainMs > 0 ? "Ready" : "Go!";
}

let _pausedSince = null;   // 止まり始めた時刻 (= 数えていないとき)
let _endAt = 0;            // 数え終える時刻 (= 0 なら数えていない)
let _lastNow = 0;
let _shown = "";
let _goTimer = 0;

export function isResumeCounting() { return _endAt > 0; }

function _el() { return globalThis.document?.getElementById("resumeCountdown"); }

function _show(word) {
  if (_shown === word) return;
  _shown = word;
  clearTimeout(_goTimer);
  const el = _el();
  if (!el) return;
  el.querySelector(".resume-countdown__num").textContent = word;
  el.classList.toggle("resume-countdown--go", word === "Go!");
  el.classList.remove("hidden", "resume-countdown--tick");
  void el.offsetWidth;   // アニメーションをかけ直す
  el.classList.add("resume-countdown--tick");
}

function _hide() {
  _shown = "";
  clearTimeout(_goTimer);
  const el = _el();
  el?.classList.add("hidden");
  el?.classList.remove("resume-countdown--tick", "resume-countdown--go");
}

function _start(now) {
  pauseTime();   // ← 数え終えたら resumeTime (= 対)
  _endAt = now + RESUME_COUNTDOWN_MS;
  _show("Ready");
}

function _finish() {
  _endAt = 0;
  resumeTime();
  // SPEC-142: Go! は動きながら見せて消す
  _show("Go!");
  _goTimer = setTimeout(_hide, RESUME_GO_MS);
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
    if (state.pauseFlags > 1 || gap > RESUME_GAP_MS) { _endAt = now + RESUME_COUNTDOWN_MS; _show("Ready"); return; }
    if (now >= _endAt) { _finish(); return; }
    return;
  }
  if (state.pauseFlags > 0) {
    if (_pausedSince == null) _pausedSince = now;
    if (_shown === "Go!") _hide();   // Go! のあいだにまた止まった
    return;
  }
  if (_pausedSince != null) {
    const pausedMs = now - _pausedSince;
    _pausedSince = null;
    if (shouldCountdown({ active: b.active, elapsedMs: b.stageElapsedMs, pausedMs })) _start(now);
  }
}
