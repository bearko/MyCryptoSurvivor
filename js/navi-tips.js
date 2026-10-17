// ============================================================
// navi-tips.js — マインちゃんの「初めて」のひとこと (= SPEC-068)
// ============================================================
//
// 初めて拾ったアイテム・初めて動いたステージの仕掛け・初めて狙ってきた撃つ敵で、
// 戦闘の通信窓 (= 画面の上、 HUD の下) でマインちゃんがひとこと補足する。
// 見たものは端末に覚えておき (= localStorage の mcs.naviTips)、 次の挑戦からは黙る (= 作者の決定 2026-10-17)。
// 設定の「もう一度聞く」で忘れる。
// 話すのは、 戦闘中で、 止まっておらず (= レベルアップ・メニューの裏で話さない)、 マインちゃんがほかのことを
// 話していないとき (= ステージの始まり・ボスの知らせを消さない)。 それまでは順番を待つ。
// ゲームの進行・pauseTime には触らない。

import { naviSay, naviLines, naviIsShown, NAVI_TYPE_MS } from "./navi.js";
import { t } from "./i18n.js";
import { LS_NAVI_TIPS } from "./constants.js";
import { state } from "./state.js";

/** ひとことを言う場面 (= navi.tip.<key> がセリフ) */
export const TIP_KEYS = [
  "item.heal", "item.magnet", "item.watch", "item.thunder", "item.card",
  "gimmick.beads", "gimmick.punch", "gimmick.trojan",
  "enemy.shooter",
];
/** 言い終えてから引っこむまで */
export const TIP_HOLD_MS = 2400;
/** 次のひとことまでの間 */
export const TIP_GAP_MS = 400;
/** 話せないときに、 もう一度見るまで */
export const TIP_RETRY_MS = 250;

/** 見たものを読む (= 純関数。 storage は getItem を持つもの。 壊れていたら空) */
export function loadSeen(storage) {
  try {
    const raw = storage?.getItem(LS_NAVI_TIPS);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((k) => TIP_KEYS.includes(k)) : []);
  } catch (_) {
    return new Set();
  }
}

/** 見たものを書く (= 書けない環境では何もしない) */
export function saveSeen(storage, seen) {
  try { storage?.setItem(LS_NAVI_TIPS, JSON.stringify([...seen])); } catch (_) {}
}

/** その場面で話すか (= 純関数。 知らない場面と、 もう見た場面は話さない) */
export function shouldShowTip(seen, key) {
  return TIP_KEYS.includes(key) && !seen.has(key);
}

/** いま話してよいか (= 純関数。 戦闘中・止まっていない・マインちゃんが黙っている) */
export function canSpeakTip({ battleActive, pauseFlags, naviShown }) {
  return !!battleActive && (pauseFlags | 0) === 0 && !naviShown;
}

/** 話している長さ (= 1 文字ずつ出る時間 + 引っこむまで) */
export function tipDurationMs(text) {
  return String(text ?? "").length * NAVI_TYPE_MS + TIP_HOLD_MS;
}

function _storage() {
  try { return globalThis.localStorage ?? null; } catch (_) { return null; }
}

// 見たものは 1 回だけ読む (= 撃つ敵は毎回ここを通るので、 そのたびに localStorage を読まない)
let _seen = null;
function _getSeen() {
  if (!_seen) _seen = loadSeen(_storage());
  return _seen;
}

/** 戦闘の通信窓の位置 (= HUD の下。 RTA なら時計のさらに下。 battle/index.js の _commTop と同じ) */
function _commTop() {
  const hud = globalThis.document?.getElementById("hud");
  const bottom = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
  return bottom + (state.rtaMode ? 40 : 8);
}

let _queue = [];
let _timer = 0;

function _next() {
  if (_timer || _queue.length === 0) return;
  if (!canSpeakTip({ battleActive: state.battle?.active, pauseFlags: state.pauseFlags, naviShown: naviIsShown() })) {
    _timer = setTimeout(() => { _timer = 0; _next(); }, TIP_RETRY_MS);
    return;
  }
  const key = _queue.shift();
  const lines = naviLines("tip", { key });
  naviSay(lines, { place: "battle", autoHideMs: TIP_HOLD_MS, top: _commTop() });
  const text = t(lines[0]?.key ?? "", "");
  _timer = setTimeout(() => { _timer = 0; _next(); }, tipDurationMs(text) + TIP_GAP_MS);
}

/**
 * 初めてならひとこと (= 見たことを覚える)。 話す順番に入れたら true
 */
export function naviTipOnce(key) {
  if (!globalThis.document) return false;
  const seen = _getSeen();
  if (!shouldShowTip(seen, key)) return false;
  seen.add(key);
  saveSeen(_storage(), seen);
  _queue.push(key);
  _next();
  return true;
}

/** 設定の「もう一度聞く」 (= 見たものを忘れる)。 忘れる前に見ていた数を返す */
export function resetNaviTips() {
  const n = _getSeen().size;
  _seen = new Set();
  try { _storage()?.removeItem(LS_NAVI_TIPS); } catch (_) {}
  return n;
}

/** 見たものの数 (= 設定の表示) */
export function seenNaviTipCount() {
  return _getSeen().size;
}

/** 戦闘をやめたとき (= 話す予定を捨てる) */
export function clearNaviTipQueue() {
  _queue = [];
  clearTimeout(_timer);
  _timer = 0;
}
