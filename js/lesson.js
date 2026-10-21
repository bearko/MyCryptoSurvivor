// ============================================================
// lesson.js — EASY のレッスン (= SPEC-147 → SPEC-154)。 止めずに、 画面の上の通信窓でマインちゃんが話す
// ============================================================
//
// SPEC-154: 以前は真ん中の窓で時間を止めて読み上げていたが、 逐一のカットインはテンポを切るのでやめた。
// 戦闘中は「初めて拾ったアイテム」のひとこと (= navi-tips) と同じ、 画面の上の通信窓 (= 顔のアイコンと吹き出し) で話す。
// 止まっている画面 (= 店・ミッション) のあいだは画面の下の帯、 スキルツリーの中では木の上の窓。 ゲームは止めない。
// 説明している相手 (= CE・店のゲージ・ボスの赤いエリア・レアエネミー) にはカーソルを当てる (= lesson-cursor.js)。
// 1 つのレッスンは 1 回だけ (= mcs.lessons。 設定の「もう一度聞く」で忘れる)。 ボイスは lesson.<番号> (= 録音が入るまでは文だけ)。
// マインちゃんがほかのことを話しているあいだは順番を待つ。 時刻で出すものは、 告げ声が終わってから。

import { state } from "./state.js";
import { t } from "./i18n.js";
import { naviSay, naviLines, naviIsShown, NAVI_TYPE_MS } from "./navi.js";
import { hasVoice, voiceMs, isVoicePlaying } from "./voice.js";
import { isEasy, loadLessons, saveLessons, LESSON_KEYS, LS_LESSONS } from "./easy.js";
import { showCursor, hideCursor } from "./lesson-cursor.js";
import { BOSS_SPAWN_POS } from "./battle/arena.js";

/** 番号ごとのポーズ (= 無ければ pointer) */
const POSE = {
  "s1.ce": "sparkle", "s1.clear": "hooray", "s2.rare": "sparkle", "s2.gift": "wink", "s2.reward": "hooray",
  "s2.lose": "teary", "s2.root": "hooray", "s2.thunder": "sparkle", "s2.clear": "hooray",
};
/** 文だけのときに、 読む時間の目安 (= 1 文字) と最短 */
export const LESSON_READ_MS_PER_CHAR = 90;
export const LESSON_MIN_MS = 2500;
/** 言い終えてから引っこむまで */
export const LESSON_HOLD_MS = 1800;
/** 話せないときに、 もう一度見るまで */
export const LESSON_RETRY_MS = 250;

let _seen = null;
let _queue = [];
let _timer = 0;
let _retry = 0;

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
 * どこで話すか (= 純関数)。 treeOpen: 木を開いている。 paused: 止まっている画面がある
 *   木の中 → "tree" (= 木の上の窓)、 止まっている → "result" (= 画面の下の帯)、 戦闘中 → "battle" (= 画面の上の通信窓)
 */
export function lessonPlace({ treeOpen = false, paused = false } = {}) {
  if (treeOpen) return "tree";
  if (paused) return "result";
  return "battle";
}

/** 説明している相手 (= カーソルを当てる先。 純関数ではない: 画面の要素と戦闘の座標を見る) */
function _cursorTarget(key) {
  const b = state.battle;
  const nearest = (arr, pick = () => true) => {
    const p = b?.player; if (!p || !arr) return null;
    let best = null, bd = Infinity;
    for (const o of arr) { if (!pick(o)) continue; const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
    return best;
  };
  switch (key) {
    case "s1.ce":    return null;   // SPEC-164: CE は小さく動くので、 輪で囲むと何を指しているか分からなかった (= 作者の決定。 カーソルは当てない)
    case "s1.shop":  return { el: "#shopBar" };
    case "s1.boss":
    case "s2.boss":  return { world: () => ({ x: BOSS_SPAWN_POS.x, y: BOSS_SPAWN_POS.y }) };
    case "s2.rare":  return { world: () => { const e = nearest(b?.enemies, (e) => e.isRare); return e ? { x: e.x, y: e.y } : null; } };
    case "s2.gift":  return { el: "#shopGifts" };
    case "s2.mission": return { el: "#missionAccept" };
    default: return null;
  }
}

/**
 * レッスンを出す (= EASY のときだけ。 見たことがあれば何もしない)。 順番に入れたら true
 */
export function showLesson(key) {
  if (!isEasy() || !globalThis.document) return false;
  const seen = _getSeen();
  if (!lessonPending(seen, key)) return false;
  seen.add(key);
  saveLessons(seen, _storage());
  _queue.push(key);
  _pump();
  return true;
}

function _commTop() {
  const hud = globalThis.document?.getElementById("hud");
  const bottom = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
  return bottom + (state.rtaMode ? 40 : 8);
}
function _treeTop() {
  const r = globalThis.document?.querySelector("#skillTreeScreen .tree-viewport")?.getBoundingClientRect();
  return r ? r.top + 8 : 96;
}
function _treeOpen() {
  const el = globalThis.document?.getElementById("skillTreeScreen");
  return !!el && !el.classList.contains("hidden");
}

function _pump() {
  if (_timer || _queue.length === 0) return;
  clearTimeout(_retry); _retry = 0;
  if (naviIsShown()) { _retry = setTimeout(() => { _retry = 0; _pump(); }, LESSON_RETRY_MS); return; }   // 告げ声・ひとことを消さない
  const key = _queue.shift();
  const vid = `lesson.${key}`;
  const text = t(vid, key);
  const place = lessonPlace({ treeOpen: _treeOpen(), paused: state.pauseFlags > 0 });
  const opt = { place, autoHideMs: LESSON_HOLD_MS };
  if (place === "battle") opt.top = _commTop();
  if (place === "tree") opt.top = _treeTop();
  naviSay([{ key: vid, pose: POSE[key] ?? "pointer", voice: hasVoice(vid) ? vid : null }], opt);
  const ms = Math.max(text.length * NAVI_TYPE_MS, voiceMs(hasVoice(vid) ? vid : "")) + LESSON_HOLD_MS;
  const target = place === "battle" ? _cursorTarget(key) : null;   // カーソルは戦闘の画面でだけ (= 止まっている画面の中は指さない)
  if (target) showCursor(target, ms);
  _timer = setTimeout(() => { _timer = 0; hideCursor(); _pump(); }, ms + 300);
}

/** 戦闘をやめたとき (= 待っているものを捨てる) */
export function clearLessons() {
  _queue = [];
  clearTimeout(_timer); _timer = 0;
  clearTimeout(_retry); _retry = 0;
  hideCursor();
}

/** 設定の「もう一度聞く」 (= 見たものを忘れる)。 忘れた数を返す */
export function resetLessons() {
  const n = _getSeen().size;
  _seen = new Set();
  try { _storage()?.removeItem(LS_LESSONS); } catch { /* 無ければそれでよい */ }
  return n;
}
export function seenLessonCount() { return _getSeen().size; }

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
  } else {
    cand.push([elapsedMs >= 0, "s2.start"]);
    cand.push([elapsedMs >= bossWarnAtMs, "s2.boss"]);
  }
  for (const [ok, key] of cand) if (ok && lessonPending(seen, key)) return key;
  return null;
}

export function tickLessons() {
  if (!isEasy()) return;
  const b = state.battle;
  if (!b?.active || b.gameOver || state.pauseFlags > 0) return;
  if (isVoicePlaying()) return;   // SPEC-151: 「ここは node ホレリス」の声が終わってから (= 「新しいステージ！」と重ねない)
  const stageIdx = state.currentStageIdx ?? 0;
  const key = timedLesson({
    stageIdx, elapsedMs: b.stageElapsedMs ?? 0, kills: state.killCount | 0, seen: _getSeen(),
    shopAtMs: state.shop ? (b.easyShopTimes?.[0] ?? null) : null,
    bossWarnAtMs: (b.easyBossAtMs ?? Infinity) - (b.easyWarnMs ?? 0),
  });
  if (key) showLesson(key);
}
