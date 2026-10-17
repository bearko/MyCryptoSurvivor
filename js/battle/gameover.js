// ============================================================
// battle/gameover.js — HP 0 → Game Over モーダル + リトライ + ranking 送信
// (= SPEC-009)
// ============================================================
//
// pauseFlags 不変条件: triggerGameOver で pauseTime + 1、 applyRetry で resumeTime + 1。
// startBattle は循環 import 回避のため動的 import。

import { state, pauseTime, resumeTime } from "../state.js";
import { t, tpl, onLangChange } from "../i18n.js";
import {
  getPlayerName, setPlayerName, submitScore, getRankingApiUrl,
} from "../ranking-client.js";
import { APP_VERSION, SFX, computeRegulationMul } from "../constants.js";
import { formatElapsed } from "../survival.js";
import { stopBgm, playSe } from "../audio.js";
import { abortRtaRun, scoreMetrics, reportRunScore, defaultPlayerName, platformUserName } from "../platform.js";
import { STAGE_TABLE } from "../constants.js";
import { countUp, revealIn } from "../reveal.js";
import { naviTitle } from "../navi.js";

let _wired = false;

/**
 * SPEC-009: HP 0 で Game Over。
 * SPEC-017: reason ("lose" | "clear") を取って BGM 停止 + 対応 SE を鳴らす。
 *           reason 省略時は "lose" 扱い (= 既存呼出と互換)。
 */
export function triggerGameOver(reason = "lose") {
  if (state.battle.gameOver) return;
  state.battle.gameOver = true;
  // SPEC-040: 倒れたら RTA の計測は中断 (= 再走は startBattle で新しい計測になる)。
  // "clear" は最後の区切りを送ったあとなので触らない
  if (reason !== "clear") abortRtaRun();
  // SPEC-041: 共通基盤の総合スコア (= 倒れるまでに終えたステージの節目の点)
  if (reason !== "clear") state.run.scoreSent = true;
  if (reason !== "clear") reportRunScore(scoreMetrics({ run: state.run, cleared: false, regulation: state.regulation, absolute: state.absolute }));
  state.lastRunStats = {
    elapsed: state.elapsedTicks,
    level:   state.level,
    kills:   state.killCount,
    reason,                  // SPEC-027: "lose" | "clear" でタイトル分岐に使う
  };
  pauseTime();
  _wireOnce();
  _renderGameOverModal();
  const modal = document.getElementById("gameOverModal");
  modal?.classList.remove("hidden");
  // SPEC-046: 上から順に出し、 撃破数を数え上げる
  revealIn(modal);
  countUp(document.getElementById("gameOverKills"), state.lastRunStats.kills ?? 0, { durMs: 600, delayMs: 250 });
  // 残っていた Level-up モーダルが有れば閉じる (= 同フレームで LV up と死亡が起きる場合)
  const lv = document.getElementById("levelUpModal");
  if (lv && !lv.classList.contains("hidden")) {
    lv.classList.add("hidden");
    state.pendingPickOptions = [];
    state.pendingPickIsStarter = false;
    resumeTime();   // levelup の pauseTime を解く (= triggerGameOver の +1 と相殺ではなく独立)
  }
  // SPEC-017: BGM 停止 + 結果 SE
  stopBgm();
  const sfx = (reason === "clear") ? SFX.GAME_OVER_CLEAR : SFX.GAME_OVER_LOSE;
  playSe(sfx, 0, 0.7);
}

export async function applyRetry() {
  document.getElementById("gameOverModal")?.classList.add("hidden");
  resumeTime();
  state.currentStageIdx = 0;       // SPEC-030: リトライは常にステージ 1 から
  // 循環 import 回避のため動的に startBattle を取得
  const m = await import("./index.js");
  m.startBattle(state.ownedHero);
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;

  // SPEC-037: 「今のレギュレーションで再走」 (= 既存 retry の挙動と同じ)
  document.getElementById("gameOverRetry")
    ?.addEventListener("click", applyRetry);

  // SPEC-037: 「タイトルに戻る」 — 戦闘停止 / state リセットして title 画面へ
  document.getElementById("gameOverToTitle")
    ?.addEventListener("click", returnToTitle);

  document.getElementById("gameOverSubmit")
    ?.addEventListener("click", _onSubmitClick);

  onLangChange(() => {
    if (!document.getElementById("gameOverModal")?.classList.contains("hidden")) {
      _renderGameOverModal();
    }
  });
}

/** ゲームオーバー・活動レポートから「タイトルに戻る」 (= SPEC-037。 SPEC-052 で活動レポートからも呼ぶ) */
export async function returnToTitle() {
  document.getElementById("gameOverModal")?.classList.add("hidden");
  // 全 modal close
  for (const id of ["levelUpModal", "stageTransitionModal", "activityReportModal", "rankingModal"]) {
    document.getElementById(id)?.classList.add("hidden");
  }
  // pauseFlags を 0 にリセット (= タイトル画面では時間停止扱い)
  while (state.pauseFlags > 0) resumeTime();
  // 戦闘停止 + BGM 停止
  const m = await import("./index.js");
  m.stopBattle?.();
  stopBgm();
  // run / hero / regulation を reset
  state.currentStageIdx = 0;
  state.ownedHero       = null;
  state.pendingHeroPick = null;
  state.stats.hp        = state.statsMax.hp;
  state.level           = 1;
  state.xp              = 0;
  state.killCount       = 0;
  state.lastRunStats    = null;
  state.run.stages.length = 0;
  state.run.totalKills    = 0;
  state.run.totalElapsedMs = 0;
  // owned hero badge を消す
  const badge = document.getElementById("ownedHeroBadge");
  if (badge) { badge.classList.add("hidden"); badge.textContent = ""; }
  // app を隠して title 表示 (= regulation は state.regulation のまま、 mode select で再選択)
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("titleScreen")?.classList.remove("hidden");
  naviTitle({ greet: false });   // SPEC-056
}

async function _onSubmitClick() {
  const btn   = document.getElementById("gameOverSubmit");
  const input = document.getElementById("gameOverName");
  const msg   = document.getElementById("gameOverMsg");
  if (!btn || !input || !msg) return;

  const name = (input.value || "").trim().slice(0, 30);
  if (!name) {
    msg.textContent = t("gameover.nameRequired", "名前を入れてください");
    input.focus();
    return;
  }
  setPlayerName(name);

  btn.disabled = true;
  msg.textContent = t("gameover.submitting", "Submitting…");

  const stats = state.lastRunStats || { elapsed: 0, level: 1, kills: 0 };
  const regMul = computeRegulationMul(state.regulation, state.absolute);
  const result = await submitScore({
    playerName: name,
    score:      Math.round(stats.elapsed * regMul),
    level:      stats.level,
    kills:      stats.kills,
    hero:       _heroName(),
    faction:    state.ownedHero?.faction ?? null,
    version:    APP_VERSION,
    elapsedSec: stats.elapsed,
    regulation:    state.regulation ?? "NORMAL",
    regulationMul: regMul,
  });

  if (result.ok) {
    msg.textContent = t("gameover.submitOk", "Submitted!");
  } else {
    btn.disabled = false;
    const errTpl = t("gameover.submitFail", "Submit failed: {err}");
    msg.textContent = tpl(errTpl, { err: result.error || "?" });
  }
}

function _heroName() {
  const h = state.ownedHero;
  if (!h) return null;
  const n = h.name;
  if (typeof n === "string") return n;
  return n?.ja ?? n?.en ?? null;
}

function _renderGameOverModal() {
  const stats = state.lastRunStats;
  if (!stats) return;
  // SPEC-027: ボス撃破 / 5 分耐久 はクリア表記、 死亡は従来通りゲームオーバー
  const titleEl = document.getElementById("gameOverTitle");
  if (titleEl) {
    titleEl.textContent = (stats.reason === "clear")
      ? t("gameover.titleClear", "Clear!")
      : t("gameover.title", "Game Over");
  }
  const elapsedEl = document.getElementById("gameOverElapsed");
  const levelEl   = document.getElementById("gameOverLevel");
  const killsEl   = document.getElementById("gameOverKills");
  // SPEC-046: 数字だけをタイルに (= ラベルは HTML 側の data-i18n)
  if (elapsedEl) elapsedEl.textContent = formatElapsed(stats.elapsed);
  if (levelEl)   levelEl.textContent   = `Lv.${stats.level}`;
  if (killsEl)   killsEl.textContent   = String(stats.kills);
  const stageEl = document.getElementById("gameOverStage");
  if (stageEl) {
    const n = (state.currentStageIdx ?? 0) + 1;
    const cur = STAGE_TABLE[n - 1];
    const line = tpl(t(stats.reason === "clear" ? "result.stageOf" : "result.fellAt", "Stage {n} / {total}"),
                     { n: String(n), total: String(STAGE_TABLE.length) });
    stageEl.textContent = cur ? `${line} — ${t(cur.nameKey, cur.nameKey)}` : line;
  }

  // SPEC-052: 名前の既定はログイン中の bearko.games の名前 → 前に送った名前 → 空
  const input = document.getElementById("gameOverName");
  if (input) {
    if (!input.value) input.value = defaultPlayerName({ accountName: platformUserName(), saved: getPlayerName() });
    input.placeholder = t("gameover.namePlaceholder", "名前を入れる");
  }
  // SPEC-052: RTA のときだけ bearko.games に戻るボタン
  document.getElementById("gameOverPortal")?.classList.toggle("hidden", !state.rtaMode);

  const submitBtn = document.getElementById("gameOverSubmit");
  const msg       = document.getElementById("gameOverMsg");
  const noApi     = !getRankingApiUrl();
  if (submitBtn) submitBtn.disabled = noApi;
  if (msg) msg.textContent = noApi ? t("gameover.noApi", "Ranking API not configured") : "";
}
