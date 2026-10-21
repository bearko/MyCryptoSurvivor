// ============================================================
// lesson.js — EASY のレッスン (= SPEC-147)。 止めて、 マインちゃんが読み上げ、 「つぎへ」で再開
// ============================================================
//
// 画面の真ん中に小さな窓 (= 顔・文・つぎへ)。 出た瞬間に pauseTime、 閉じたら resumeTime (= 対)。
// 閉じたあとの Ready → Go! は出さない (= resetResumeCountdown で止まっていた時間を忘れる)。
// 1 つのレッスンは 1 回だけ (= mcs.lessons。 設定の「もう一度聞く」で忘れる)。
// ボイスは lesson.<番号> (= 録音が入るまでは文だけ)。 ほかの画面 (= 店・ミッション・結果) の上に重なる。

import { state, pauseTime, resumeTime } from "./state.js";
import { t } from "./i18n.js";
import { naviFrameUrl, NAVI_POSES } from "./navi.js";
import { playVoice, hasVoice, voiceMs } from "./voice.js";
import { playSe } from "./audio.js";
import { SFX } from "./constants.js";
import { isEasy, loadLessons, saveLessons, LESSON_KEYS, LS_LESSONS } from "./easy.js";
import { resetResumeCountdown } from "./battle/resume-countdown.js";

/** 番号ごとのポーズ (= 無ければ pointer) */
const POSE = {
  "s1.ce": "sparkle", "s1.clear": "hooray", "s2.rare": "sparkle", "s2.gift": "wink", "s2.reward": "hooray",
  "s3.start": "cross", "s3.lose": "teary", "s3.root": "hooray", "s3.thunder": "sparkle", "s3.clear": "hooray",
};
/** 文だけのときに、 読む時間の目安 (= 1 文字) と最短 */
export const LESSON_READ_MS_PER_CHAR = 90;
export const LESSON_MIN_MS = 2500;

let _seen = null;
let _open = null;     // いま出している番号
let _queue = [];      // 同時に 2 つ来たとき (= 順に出す)
let _wired = false;

function _storage() { try { return globalThis.localStorage ?? null; } catch { return null; } }
function _getSeen() { if (!_seen) _seen = loadLessons(_storage()); return _seen; }

/** まだ見ていないか (= 純関数) */
export function lessonPending(seen, key) {
  return LESSON_KEYS.includes(key) && !seen.has(key);
}

/** 読み上げの長さ (= ボイスがあればその長さ、 なければ文の長さから。 純関数) */
export function lessonHoldMs(text, voiceLen = 0) {
  return Math.max(LESSON_MIN_MS, voiceLen || String(text ?? "").length * LESSON_READ_MS_PER_CHAR);
}

/**
 * レッスンを出す (= EASY のときだけ。 見たことがあれば何もしない)。 出したら true
 * 止めるのはここ (= pauseTime)。 閉じるのは「つぎへ」か、 読み上げが終わってしばらく
 */
export function showLesson(key) {
  if (!isEasy() || !globalThis.document) return false;
  const seen = _getSeen();
  if (!lessonPending(seen, key)) return false;
  seen.add(key);
  saveLessons(seen, _storage());
  if (_open) { _queue.push(key); return true; }
  _show(key);
  return true;
}

function _show(key) {
  _wire();
  const el = document.getElementById("lessonModal");
  if (!el) return;
  _open = key;
  pauseTime();
  const text = t(`lesson.${key}`, key);
  el.querySelector(".lesson__text").textContent = text;
  el.querySelector(".lesson__face").src = naviFrameUrl(NAVI_POSES[POSE[key] ?? "pointer"]);
  el.querySelector(".lesson__next").textContent = t("lesson.next", "つぎへ ▶");
  el.classList.remove("hidden", "lesson--in");
  void el.offsetWidth;
  el.classList.add("lesson--in");
  const vid = `lesson.${key}`;
  const spoke = hasVoice(vid) && playVoice(vid);
  playSe(SFX.UI_CLICK, 0, 0.25);
  // 読み上げが終わってしばらくしたら、 自分で閉じる (= 押さなくても進む)
  clearTimeout(_autoTimer);
  _autoTimer = setTimeout(() => { if (_open === key) closeLesson(); }, lessonHoldMs(text, spoke ? voiceMs(vid) : 0) + 1500);
}
let _autoTimer = 0;

/** 閉じる (= つぎへ)。 次が待っていればそれを出す */
export function closeLesson() {
  if (!_open) return;
  clearTimeout(_autoTimer);
  _open = null;
  document.getElementById("lessonModal")?.classList.add("hidden");
  resumeTime();
  resetResumeCountdown();   // SPEC-104 の Ready → Go! は出さない (= 止まっていたことを忘れる)
  const next = _queue.shift();
  if (next) _show(next);
}

/** いま出しているか */
export function isLessonOpen() { return !!_open; }

/** 戦闘をやめたとき (= 待っているものを捨てる。 出ているものは閉じる) */
export function clearLessons() {
  _queue = [];
  if (_open) closeLesson();
}

/** 設定の「もう一度聞く」 (= 見たものを忘れる)。 忘れた数を返す */
export function resetLessons() {
  const n = _getSeen().size;
  _seen = new Set();
  try { _storage()?.removeItem(LS_LESSONS); } catch { /* 無ければそれでよい */ }
  return n;
}
export function seenLessonCount() { return _getSeen().size; }

function _wire() {
  if (_wired) return;
  _wired = true;
  document.getElementById("lessonNext")?.addEventListener("click", closeLesson);
  document.addEventListener("keydown", (e) => { if (_open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); closeLesson(); } });
}

// ---- 戦闘の中で時刻を見て出すもの (= battle/index.js の _step から。 ステージごとに 1 回) ----
/**
 * EASY の、 時刻で出すレッスン (= 開始・最初の店の直前・ボスの予告・初めての撃破)
 *   stageIdx: いまのステージ。 elapsedMs: ステージの経過。 shopAtMs: 最初の店の時刻。 bossWarnAtMs: 予告の時刻。 kills: 撃破数
 *   返す: 出す番号 (= 順に 1 つ)。 純関数
 */
export function timedLesson({ stageIdx, elapsedMs, shopAtMs, bossWarnAtMs, kills, seen }) {
  const s = stageIdx | 0;
  const cand = [];
  if (s === 0) {
    cand.push([elapsedMs >= 1200, "s1.move"]);
    cand.push([kills >= 1, "s1.ce"]);
    cand.push([shopAtMs != null && elapsedMs >= shopAtMs - 1500, "s1.shop"]);
    cand.push([elapsedMs >= bossWarnAtMs, "s1.boss"]);
  } else if (s === 1) {
    cand.push([elapsedMs >= 0, "s2.start"]);
    cand.push([elapsedMs >= bossWarnAtMs, "s2.boss"]);
  } else {
    cand.push([elapsedMs >= 0, "s3.start"]);
  }
  for (const [ok, key] of cand) if (ok && lessonPending(seen, key)) return key;
  return null;
}

export function tickLessons() {
  if (!isEasy() || _open) return;
  const b = state.battle;
  if (!b?.active || b.gameOver || state.pauseFlags > 0) return;
  const stageIdx = state.currentStageIdx ?? 0;
  const key = timedLesson({
    stageIdx, elapsedMs: b.stageElapsedMs ?? 0, kills: state.killCount | 0, seen: _getSeen(),
    shopAtMs: state.shop ? (b.easyShopTimes?.[0] ?? null) : null,
    bossWarnAtMs: (b.easyBossAtMs ?? Infinity) - (b.easyWarnMs ?? 0),
  });
  if (key) showLesson(key);
}
