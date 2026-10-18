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
import { reportStageEnd, reportRtaStageEnd } from "../platform.js";
import { formatElapsed } from "../survival.js";
import { countUp, revealIn } from "../reveal.js";
import { presentResult } from "../result-telop.js";
import { grantBossDust } from "../meta.js";
import { renderRewards } from "../meta-ui.js";
import { perk } from "../perks.js";   // SPEC-090c

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
  // SPEC-090: ボスを倒したらゴールドダスト (= 5:00 まで耐えたときは出ない)。 snapshot に控えて結果の画面に出す
  if (state.battle.bossDefeated) {
    const snap = state.run.stages.find(s => s.idx === (state.currentStageIdx ?? 0));
    if (snap && snap.dust == null) snap.dust = grantBossDust(state.currentStageIdx ?? 0, { bonus: perk("bossDust") });   // SPEC-090c: 金運
  }

  // SPEC-039 / SPEC-096: 共通基盤のアチーブメント (= ステージ 1・2・全クリア・ファオ・ボス 3 体・RTA・ABSOLUTE ×2.0)
  const endIdx = state.currentStageIdx ?? 0;
  reportStageEnd(endIdx, STAGE_TABLE.length, {
    bossDefeated: !!state.battle.bossDefeated,
    bossEnemyId: STAGE_TABLE[endIdx]?.bossEnemyId ?? null,
    stages: state.run.stages,
    rtaMode: !!state.rtaMode,
    regulation: state.regulation,
    absolute: state.absolute,
  });
  // SPEC-040: RTA の区切り (= RTA で始めた run だけ。 IGT は各ステージのゲーム内時間の合計)
  if (state.rtaMode) reportRtaStageEnd(state.currentStageIdx ?? 0, STAGE_TABLE.length, state.run.totalElapsedMs);

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
  const modal = document.getElementById("stageTransitionModal");
  modal?.classList.remove("hidden");
  // SPEC-058: テロップ (= 斜めの帯とヒーロー・マインちゃん) のあと、 SPEC-046: 上から順に出し、 撃破数を数え上げる
  const snap = state.run.stages.find(s => s.idx === (state.currentStageIdx ?? 0));
  presentResult(modal, "clear", {
    heroId: state.ownedHero?.heroId ?? null,
    then: () => {
      revealIn(modal);
      countUp(document.getElementById("stageTransitionKills"), snap?.kills ?? 0, { durMs: 600, delayMs: 250 });
      renderRewards(document.getElementById("stageTransitionRewards"), { dust: snap?.dust ?? 0 }, { delayMs: 500 });   // SPEC-090
    },
  });
}

/** SPEC-046: ⏱ 時間・💀 撃破・Lv のタイル (= ステージクリアとゲームオーバーで同じ形) */
export function resultTilesHtml({ timeText, kills, level, killsId }) {
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return (
    `<div class="result-tile"><span class="result-tile__icon" aria-hidden="true">⏱</span>` +
    `<span class="result-tile__value num">${esc(timeText)}</span>` +
    `<span class="result-tile__label">${esc(t("result.time", "時間"))}</span></div>` +
    `<div class="result-tile"><span class="result-tile__icon" aria-hidden="true">💀</span>` +
    `<span class="result-tile__value num"${killsId ? ` id="${esc(killsId)}"` : ""}>${esc(kills)}</span>` +
    `<span class="result-tile__label">${esc(t("result.kills", "撃破"))}</span></div>` +
    `<div class="result-tile"><span class="result-tile__icon" aria-hidden="true">⬆</span>` +
    `<span class="result-tile__value num">Lv.${esc(level)}</span>` +
    `<span class="result-tile__label">${esc(t("result.level", "レベル"))}</span></div>`
  );
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

  // SPEC-046: 進み具合 (●●○) と、 そのステージの成績
  const pipsEl = document.getElementById("stageTransitionPips");
  if (pipsEl) {
    pipsEl.innerHTML = STAGE_TABLE.map((_, i) =>
      `<span class="stage-pip${i <= idx ? " stage-pip--done" : ""}"></span>`).join("");
  }
  const tilesEl = document.getElementById("stageTransitionTiles");
  const snap = state.run.stages.find(s => s.idx === idx);
  if (tilesEl && snap) {
    tilesEl.innerHTML = resultTilesHtml({
      timeText: formatElapsed(Math.round((snap.elapsedMs ?? 0) / 1000)),
      kills: snap.kills ?? 0,
      level: snap.level ?? 1,
      killsId: "stageTransitionKills",
    });
  }
}
