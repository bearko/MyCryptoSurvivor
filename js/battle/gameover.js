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
import { APP_VERSION, SFX } from "../constants.js";
import { formatElapsed } from "../survival.js";
import { stopBgm, playSe } from "../audio.js";

let _wired = false;

/**
 * SPEC-009: HP 0 で Game Over。
 * SPEC-017: reason ("lose" | "clear") を取って BGM 停止 + 対応 SE を鳴らす。
 *           reason 省略時は "lose" 扱い (= 既存呼出と互換)。
 */
export function triggerGameOver(reason = "lose") {
  if (state.battle.gameOver) return;
  state.battle.gameOver = true;
  state.lastRunStats = {
    elapsed: state.elapsedTicks,
    level:   state.level,
    kills:   state.killCount,
    reason,                  // SPEC-027: "lose" | "clear" でタイトル分岐に使う
  };
  pauseTime();
  _wireOnce();
  _renderGameOverModal();
  document.getElementById("gameOverModal")?.classList.remove("hidden");
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
  // 循環 import 回避のため動的に startBattle を取得
  const m = await import("./index.js");
  m.startBattle(state.ownedHero);
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;

  document.getElementById("gameOverRetry")
    ?.addEventListener("click", applyRetry);

  document.getElementById("gameOverSubmit")
    ?.addEventListener("click", _onSubmitClick);

  onLangChange(() => {
    if (!document.getElementById("gameOverModal")?.classList.contains("hidden")) {
      _renderGameOverModal();
    }
  });
}

async function _onSubmitClick() {
  const btn   = document.getElementById("gameOverSubmit");
  const input = document.getElementById("gameOverName");
  const msg   = document.getElementById("gameOverMsg");
  if (!btn || !input || !msg) return;

  const name = (input.value || "").trim().slice(0, 30);
  if (!name) {
    msg.textContent = t("gameover.namelabel", "Player Name");
    return;
  }
  setPlayerName(name);

  btn.disabled = true;
  msg.textContent = t("gameover.submitting", "Submitting…");

  const stats = state.lastRunStats || { elapsed: 0, level: 1, kills: 0 };
  const result = await submitScore({
    playerName: name,
    score:      stats.elapsed,
    level:      stats.level,
    kills:      stats.kills,
    hero:       _heroName(),
    faction:    state.ownedHero?.faction ?? null,
    version:    APP_VERSION,
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
  if (elapsedEl) {
    elapsedEl.textContent = tpl(t("gameover.elapsed", "Time: {time}"),
                                { time: formatElapsed(stats.elapsed) });
  }
  if (levelEl) {
    levelEl.textContent = tpl(t("gameover.level", "Lv.: {n}"),
                              { n: String(stats.level) });
  }
  if (killsEl) {
    killsEl.textContent = tpl(t("gameover.kills", "Kills: {n}"),
                              { n: String(stats.kills) });
  }

  const input = document.getElementById("gameOverName");
  if (input && !input.value) input.value = getPlayerName();

  const submitBtn = document.getElementById("gameOverSubmit");
  const msg       = document.getElementById("gameOverMsg");
  const noApi     = !getRankingApiUrl();
  if (submitBtn) submitBtn.disabled = noApi;
  if (msg) msg.textContent = noApi ? t("gameover.noApi", "Ranking API not configured") : "";
}
