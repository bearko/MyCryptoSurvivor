// ============================================================
// revive-seen.js — 復活のしかたの説明を 1 度聞いたか (= SPEC-155)。 この端末だけ。 設定の「もう一度聞く」で忘れる
// ============================================================
import { LS_REVIVE_SEEN } from "./constants.js";

export function hasSeenRevive(storage = globalThis.localStorage) {
  try { return storage?.getItem(LS_REVIVE_SEEN) === "1"; } catch { return false; }
}
export function markReviveSeen(storage = globalThis.localStorage) {
  try { storage?.setItem(LS_REVIVE_SEEN, "1"); } catch { /* 保存できなければ毎回説明する */ }
}
export function resetReviveSeen(storage = globalThis.localStorage) {
  try { storage?.removeItem(LS_REVIVE_SEEN); } catch { /* 無ければそれでよい */ }
}
