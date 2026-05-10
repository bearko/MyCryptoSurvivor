// ============================================================
// battle/stage-transition.js — ステージ間遷移モーダル (= SPEC-030)
// ============================================================
//
// ボス撃破 / 5 分耐久でステージ終了したとき:
//   - 次ステージあり → ステージ遷移モーダル (= 「次のステージへ」 ボタン)
//   - 次ステージなし (= 全ステージクリア) → 既存 triggerGameOver("clear") に委譲
//
// pauseFlags 不変条件: open で pauseTime + 1、 続行 click で resumeTime + 1。

import { state, pauseTime, resumeTime } from "../state.js";
import { STAGE_TABLE } from "../constants.js";
import { triggerGameOver } from "./gameover.js";
import { triggerActivityReport } from "./activity-report.js";
import { t, tpl, onLangChange } from "../i18n.js";

let _wired = false;

/**
 * SPEC-033: 現ステージの snapshot を state.run.stages に push、
 * state.run.totalKills / totalElapsedMs を更新する。
 */
function _captureStageSnapshot() {
  const idx = state.currentStageIdx ?? 0;
  // 既に同 idx の snapshot がある場合は重複 push 防止 (= 同 frame で複数 trigger される事故対策)
  if (state.run.stages.some(s => s.idx === idx)) return;
  const snapshot = {
    idx,
    nameKey:  STAGE_TABLE[idx]?.nameKey ?? "",
    elapsedMs: state.battle.stageElapsedMs ?? 0,
    kills:    state.killCount ?? 0,
    level:    state.level     ?? 1,
    ownedExtensions: (state.ownedExtensions ?? []).map(o => ({ extId: o.extId, level: o.level })),
  };
  state.run.stages.push(snapshot);
  state.run.totalKills    += snapshot.kills;
  state.run.totalElapsedMs += snapshot.elapsedMs;
}

/**
 * ステージ終了 (= ボス撃破 or 5 分経過) の trigger。
 * 次ステージがあれば transition modal、 無ければ全ステージクリアで activity report。
 * 死亡 (= state.stats.hp <= 0) はこの関数を経由しない (= triggerGameOver(undefined))。
 */
export function triggerStageEndOrTransition() {
  if (state.battle.gameOver) return;

  // SPEC-033: 終了直前にステージ snapshot を保存 (= activity report 用)
  _captureStageSnapshot();

  const isLast = (state.currentStageIdx ?? 0) >= STAGE_TABLE.length - 1;
  if (isLast) {
    // SPEC-033: 全ステージクリア → activity report (= 既存 gameover modal を置換)
    state.battle.gameOver = true;
    triggerActivityReport();
    return;
  }

  state.battle.gameOver = true;   // ループ tick の重複 trigger 防止 (= 既存規約)
  pauseTime();
  _wireOnce();
  _renderTransitionModal();
  document.getElementById("stageTransitionModal")?.classList.remove("hidden");
}

/**
 * 「次のステージへ」 click → state.currentStageIdx++ → startBattle 再呼出
 */
async function _onProceedClick() {
  document.getElementById("stageTransitionModal")?.classList.add("hidden");
  state.currentStageIdx = (state.currentStageIdx ?? 0) + 1;
  resumeTime();
  // startBattle 内で state.battle.gameOver=false にリセットされる
  const m = await import("./index.js");
  m.startBattle(state.ownedHero);
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  document.getElementById("stageTransitionProceed")
    ?.addEventListener("click", _onProceedClick);
  onLangChange(() => {
    if (!document.getElementById("stageTransitionModal")?.classList.contains("hidden")) {
      _renderTransitionModal();
    }
  });
}

function _renderTransitionModal() {
  const titleEl   = document.getElementById("stageTransitionTitle");
  const subEl     = document.getElementById("stageTransitionSub");
  const proceedEl = document.getElementById("stageTransitionProceed");
  const idx       = state.currentStageIdx ?? 0;
  const next      = STAGE_TABLE[idx + 1];
  const cur       = STAGE_TABLE[idx];

  if (titleEl) titleEl.textContent = t("stage.clearTitle", "Stage Clear!");
  if (subEl) {
    const tpl1 = t("stage.proceedNext", "Next: {next}");
    subEl.textContent = next
      ? tpl(tpl1, { next: t(next.nameKey, next.nameKey) })
      : t("gameover.titleClear", "Clear!");
  }
  if (proceedEl) proceedEl.textContent = t("stage.proceed", "次のステージへ");

  // 現ステージ名 (= 達成感の reinforce 用、 副題上に小さく表示)
  const curEl = document.getElementById("stageTransitionCurrent");
  if (curEl && cur) {
    curEl.textContent = t(cur.nameKey, cur.nameKey);
  }
}
