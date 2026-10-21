// ============================================================
// chat-dock.js — 全体チャットのドック (= SDK が右に固定で描く 320px) のぶん、 画面を狭める (= SPEC-156)
// ============================================================
//
// PC (= 1100px 以上) では SDK がチャットを右側のドックとして常に出す。 スキルツリーと結果の画面は
// 画面いっぱいに描くので、 右の列 (= 詳しい欄) がドックの下に隠れていた。
// ここでは「ドックが見えているあいだだけ」 html に --chat-dock: 320px を置き、 画面の側は right: var(--chat-dock) で避ける。
// 畳む・広げる (= SDK の ▸ と、 木の頭のボタン) と、 窓の幅をまたいだときに置き直す。
// 上半分は純関数 (= テストする)。 下半分が DOM。

import { chatLayout, chatShown, onChatToggle } from "./platform.js";

/** SDK のドックの幅 (= sdk/v1.js の .panel.mode-dock の width) */
export const CHAT_DOCK_W = 320;

/**
 * 画面を右から何 px 空けるか (= 純関数)。 layout: 'dock' | 'float' | 'sheet'。 shown: タイムラインが見えているか
 *   ドックで見えているときだけ幅。 窓・シート (= 重なるのが前提の小さいもの) は 0
 */
export function dockInset({ layout, shown, width = CHAT_DOCK_W } = {}) {
  return layout === "dock" && shown ? Math.max(0, width | 0) : 0;
}

/** いまのドックの幅 (= SDK が無ければ 0) */
export function chatDockWidth() {
  return dockInset({ layout: chatLayout(), shown: chatShown() });
}

const _listeners = new Set();
let _last = -1;

/** 置き直す (= 変わっていたら、 聞いている相手に知らせる)。 返す: いまの幅 */
export function applyChatDock() {
  const w = chatDockWidth();
  if (typeof document !== "undefined") document.documentElement.style.setProperty("--chat-dock", `${w}px`);
  if (w !== _last) {
    _last = w;
    for (const fn of _listeners) { try { fn(w); } catch (e) { console.warn("[chat-dock]", e); } }
  }
  return w;
}

/** ドックの幅が変わったら (= 畳む・広げる・隠す・窓の幅)。 解除する関数を返す */
export function onChatDockChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** 起動時に 1 回 (= SDK の畳む・広げる、 窓の幅、 setChatVisible のたびに置き直す) */
export function installChatDock() {
  if (typeof window === "undefined") return;
  onChatToggle(() => applyChatDock());
  window.addEventListener("resize", () => applyChatDock());
  window.addEventListener("mcs:chat", () => applyChatDock());   // platform.setChatVisible が投げる
  // SDK は defer で読まれて init のあとに窓を置くので、 少し待ってからも置き直す
  applyChatDock();
  setTimeout(applyChatDock, 600);
  setTimeout(applyChatDock, 2500);
}
