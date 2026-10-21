// ============================================================
// played.js — 「この端末で 1 回は遊び終えた」 の記録 (= SPEC-088)
// ============================================================
//
// 初プレイは NORMAL だけ (= ABSOLUTE と RTA はロック)。 挑戦を終えた (= クリアかゲームオーバー) ときに
// localStorage の mcs.played に "1" を置き、 次にモード選択を開いたときから ABSOLUTE と RTA が選べる。
// 途中でタイトルに戻っただけでは終えたことにしない。
// storage が無い・壊れている (= プライベートモード等) ときは、 ロックされたまま (= 何も投げない)。

import { LS_PLAYED } from "./constants.js";

/** 初プレイのあいだ選べないモード (= mode-select の data-mode) */
export const LOCKED_UNTIL_PLAYED = Object.freeze(["ABSOLUTE", "RTA"]);

/** 1 回でも遊び終えたか (= 純関数。 storage は getItem を持つもの。 無ければ false) */
export function hasPlayed(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(LS_PLAYED) === "1";
  } catch (_) {
    return false;
  }
}

/** 遊び終えたことを覚える。 書けたら true (= 純関数。 storage は setItem を持つもの) */
export function markPlayed(storage = globalThis.localStorage) {
  try {
    if (!storage) return false;
    storage.setItem(LS_PLAYED, "1");
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * いまロックされているモード (= 純関数)。
 * SPEC-147: NORMAL は EASY をクリアするまで (= 前から NORMAL を遊んでいる人 (= played) は開いている)
 */
export function lockedModes(played, easyCleared = true) {
  const out = played ? [] : [...LOCKED_UNTIL_PLAYED];
  if (!played && !easyCleared) out.unshift("NORMAL");
  return out;
}

/** そのモードがロックされているか (= 純関数) */
export function isModeLocked(mode, played, easyCleared = true) {
  return lockedModes(played, easyCleared).includes(mode);
}
