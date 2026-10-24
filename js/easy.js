// ============================================================
// easy.js — チュートリアル (= ストーリー) の上書きの入口。 SPEC-165 (= SPEC-147 の EASY は撤去)
// ============================================================
//
// 名前は EASY のころのまま (= 戦闘の各所が isEasy() / easyStage() で読む。 保存のキー mcs.easyCleared も変えない)。
// 中身はストーリーのレシピ (= storyOverride) だけで、 EASY のステージ・レッスン・根まで弱いヒーローは SPEC-165 で外した。
// isEasy() = チュートリアルか (= 共通基盤に送らない・操作ガイドを出さない・段階は T0 のまま)。

import { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS, LS_PREFIX } from "./constants.js";
import { STAGE_TABLE } from "./constants.js";
import { isStory, storyStage, storyOverride } from "./story.js";   // SPEC-165
import { extraMods } from "./battle/extra-panels.js";   // SPEC-176: 早鐘
import { state } from "./state.js";

/** 「チュートリアルを終えた」の印 (= 5-5 のクリア。 旧 EASY のクリアもこの印で、 NORMAL を開く。 SPEC-165 行 W) */
export const LS_EASY_CLEARED = `${LS_PREFIX}.easyCleared`;

/** ステージの数 (= ストーリーは 1 ステージ完結、 ほかは STAGE_TABLE) */
export function stageCount() {
  return isStory() ? 1 : STAGE_TABLE.length;
}

/** チュートリアルか (= ストーリー。 共通基盤に送らない・操作ガイドを出さない・段階は T0 のまま) */
export function isEasy() {
  return isStory();
}

/** いまのステージの上書き (= ストーリーのレシピを EASY の上書きと同じ形で。 ほかは null) */
export function easyStage() {
  return isStory() ? storyOverride(storyStage()) : null;
}

/** ボスが出る時刻・予告の長さ (= 戦闘の各所が定数の代わりに呼ぶ) */
export function bossSpawnAtMs() {
  // SPEC-176: 早鐘 (= 10 秒ずつ早く。 店で買った直後は予告を出せるだけの間を残す = bossFloorMs)
  const floor = state.battle?.bossFloor;
  return easyStage()?.bossAtMs ?? Math.max(BOSS_SPAWN_AT_MS - extraMods().bossEarlyMs, floor && floor.idx === (state.currentStageIdx ?? 0) ? floor.ms : 0);
}
export function bossWarnLeadMs() {
  return easyStage()?.warnMs ?? BOSS_WARNING_LEAD_MS;
}

/** チュートリアルを終えたか (= 純関数。 storage は getItem を持つもの) */
export function hasClearedEasy(storage = globalThis.localStorage) {
  try { return storage?.getItem(LS_EASY_CLEARED) === "1"; } catch { return false; }
}
export function markEasyCleared(storage = globalThis.localStorage) {
  try { storage?.setItem(LS_EASY_CLEARED, "1"); return true; } catch { return false; }
}
