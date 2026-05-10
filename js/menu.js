// ============================================================
// menu.js — ヘッダー一時停止メニュー (= SPEC-034)
// ============================================================
//
// ヘッダーの ☰ ボタンで開く。 ボタン 3 択:
//   - ステージをはじめからやり直す → 現ステージ idx 維持で startBattle 再呼出
//   - タイトルに戻る               → app 非表示 / titleScreen 表示 / state リセット
//   - 閉じる                       → 単に modal を閉じる
//
// pauseFlags 不変条件: open で pauseTime + 1、 close / 任意の選択で resumeTime + 1。
// ただし 「タイトルに戻る」 は state.battle.active を停止するので resumeTime は不要
// (= タイトル画面では時間が止まっている設計)。

import { state, pauseTime, resumeTime } from "./state.js";
import { stopBgm } from "./audio.js";
import { onLangChange, t } from "./i18n.js";

let _wired = false;
let _opened = false;

function _modal()      { return document.getElementById("pauseMenuModal"); }
function _btnRestart() { return document.getElementById("pauseMenuRestart"); }
function _btnTitle()   { return document.getElementById("pauseMenuToTitle"); }
function _btnClose()   { return document.getElementById("pauseMenuClose"); }
function _btnOpen()    { return document.getElementById("btnMenuOpen"); }

export function installMenu() {
  if (_wired) return;
  _wired = true;
  _btnOpen()?.addEventListener("click", openMenu);
  _btnRestart()?.addEventListener("click", _onRestart);
  _btnTitle()?.addEventListener("click", _onToTitle);
  _btnClose()?.addEventListener("click", closeMenu);
  // 言語切替で再描画 (= 既存挙動と同じ。 data-i18n applyDataI18n も働く)
  onLangChange(_renderLabels);
  _renderLabels();
}

export function openMenu() {
  if (_opened) return;
  _opened = true;
  pauseTime();
  _renderLabels();
  _modal()?.classList.remove("hidden");
}

export function closeMenu() {
  if (!_opened) return;
  _opened = false;
  _modal()?.classList.add("hidden");
  resumeTime();
}

async function _onRestart() {
  // close menu (resumeTime + 1)、 startBattle で各種 reset (= currentStageIdx は維持)
  closeMenu();
  // SPEC-033: state.run.stages にこのステージの過去 snapshot が残っていれば除去
  const idx = state.currentStageIdx ?? 0;
  state.run.stages = state.run.stages.filter(s => s.idx !== idx);
  // totals は再構成 (= 残っている stages から)
  state.run.totalKills    = state.run.stages.reduce((a, s) => a + (s.kills    ?? 0), 0);
  state.run.totalElapsedMs = state.run.stages.reduce((a, s) => a + (s.elapsedMs ?? 0), 0);
  const m = await import("./battle/index.js");
  m.startBattle(state.ownedHero);
}

function _onToTitle() {
  // タイトルに戻る: 全 modal を閉じ、 戦闘を停止し、 #app を隠して #titleScreen を出す
  _opened = false;
  _modal()?.classList.add("hidden");
  // 任意の他モーダルも閉じる (= levelup / gameover / activityReport / stageTransition)
  for (const id of ["levelUpModal", "gameOverModal", "activityReportModal", "stageTransitionModal", "heroSelectModal"]) {
    document.getElementById(id)?.classList.add("hidden");
  }
  // 戦闘停止 + BGM 停止
  import("./battle/index.js").then(m => m.stopBattle?.());
  stopBgm();
  // pauseFlags は 0 に戻す (= titleScreen は 「停止状態」 として扱うが counter は綺麗にしておく)
  while (state.pauseFlags > 0) resumeTime();
  // run / battle 状態をリセット (= 次に hero pick したらフレッシュに始まる)
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
  // app を隠して title 表示
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("titleScreen")?.classList.remove("hidden");
}

function _renderLabels() {
  const tr = _btnRestart(); if (tr) tr.textContent = t("menu.restart", "ステージをはじめからやり直す");
  const tt = _btnTitle();   if (tt) tt.textContent = t("menu.toTitle", "タイトルに戻る");
  const tc = _btnClose();   if (tc) tc.textContent = t("menu.close",   "閉じる");
  const ti = document.getElementById("pauseMenuTitle");
  if (ti) ti.textContent = t("menu.title", "メニュー");
  const bo = _btnOpen();
  if (bo) bo.setAttribute("aria-label", t("menu.title", "メニュー"));
}
