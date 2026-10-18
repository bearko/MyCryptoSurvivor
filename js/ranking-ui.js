// ============================================================
// ranking-ui.js — ランキングモーダル + URL 入力 + 一覧描画 (= SPEC-035)
// ============================================================
//
// 起動経路: タイトル画面の 「ランキング」 ボタン or 活動レポートの 「ランキングを見る」
// 内部: fetchRanking → top 20 を table 描画。 URL 未設定なら入力欄を出して保存可能。
// (SPEC-095 で #api= のリンクで送り先を書き換える機能はやめた)

import {
  fetchRanking, getRankingApiUrl, setRankingApiUrl, isRankingApiUrl,
} from "./ranking-client.js";
import { APP_VERSION } from "./constants.js";
import { state, pauseTime, resumeTime } from "./state.js";
import { onLangChange, t, tpl } from "./i18n.js";
import { formatElapsed } from "./survival.js";

let _wired = false;
let _opened = false;

function _modal()  { return document.getElementById("rankingModal"); }
function _close()  { return document.getElementById("rankingClose"); }
function _refresh(){ return document.getElementById("rankingRefresh"); }
function _list()   { return document.getElementById("rankingList"); }
function _msg()    { return document.getElementById("rankingMsg"); }
function _config() { return document.getElementById("rankingConfig"); }
function _input()  { return document.getElementById("rankingApiInput"); }
function _save()   { return document.getElementById("rankingApiSave"); }
function _filter() { return document.getElementById("rankingFilter"); }
function _regFilter() { return document.getElementById("rankingRegFilter"); }   // SPEC-037

export function installRankingUI() {
  if (_wired) return;
  _wired = true;

  _close()?.addEventListener("click", closeRanking);
  _refresh()?.addEventListener("click", _onRefresh);
  _save()?.addEventListener("click", _onSaveUrl);
  _filter()?.addEventListener("change", _onRefresh);
  _regFilter()?.addEventListener("change", _onRefresh);   // SPEC-037: regulation filter

  // SPEC-035: タイトル画面 + メニュー (= js/menu.js から openRanking 呼出) の 2 経路
  document.getElementById("btnTitleRanking")?.addEventListener("click", openRanking);

  onLangChange(() => {
    if (_opened) _renderShell();
  });

  // SPEC-095: #api=… のリンクで送り先を書き換える機能はやめた (= 他人が作ったリンクを踏むだけで、
  // 以後の名前とスコアが知らないサーバーへ送られるため)。 送り先は既定のまま、 変えるなら設定から手で
}

export async function openRanking() {
  if (_opened) return;
  _opened = true;
  pauseTime();
  _renderShell();
  _modal()?.classList.remove("hidden");
  await _load();
}

export function closeRanking() {
  if (!_opened) return;
  _opened = false;
  _modal()?.classList.add("hidden");
  resumeTime();
}

function _renderShell() {
  const titleEl = document.getElementById("rankingTitle");
  if (titleEl) titleEl.textContent = t("ranking.title", "ランキング");
  const close = _close();   if (close)   close.textContent   = t("btn.close",          "閉じる");
  const ref   = _refresh(); if (ref)     ref.textContent     = t("ranking.refresh",    "更新");
  const save  = _save();    if (save)    save.textContent    = t("ranking.saveUrl",    "API URL を保存");
  const fopt0 = document.getElementById("rankingFilterAll");      if (fopt0) fopt0.textContent = t("ranking.filter.all", "全バージョン");
  const fopt1 = document.getElementById("rankingFilterCurrent");  if (fopt1) fopt1.textContent = tpl(t("ranking.filter.current", "v{n} のみ"), { n: APP_VERSION });
  // SPEC-037: regulation filter labels
  const ropt0 = document.getElementById("rankingRegFilterAll");      if (ropt0) ropt0.textContent = t("ranking.reg.all",      "全レギュレーション");
  const ropt1 = document.getElementById("rankingRegFilterNormal");   if (ropt1) ropt1.textContent = t("ranking.reg.normal",   "NORMAL のみ");
  const ropt2 = document.getElementById("rankingRegFilterAbsolute"); if (ropt2) ropt2.textContent = t("ranking.reg.absolute", "ABSOLUTE のみ");
  const inp   = _input();   if (inp)     inp.placeholder     = t("ranking.urlPlaceholder", "https://script.google.com/macros/s/.../exec");
  // SPEC-050: bearko.games の総合ランキングへの導線
  const plink = document.getElementById("rankingPlatformLink"); if (plink) plink.textContent = t("ranking.platform",     "bearko.games の総合ランキング ↗");
  const pnote = document.getElementById("rankingPlatformNote"); if (pnote) pnote.textContent = t("ranking.platformNote", "このランキングとは別の、bearko.games のタイトル共通のランキングです");
  const cfgL  = document.getElementById("rankingConfigLabel");
  if (cfgL) cfgL.textContent = t("ranking.configLabel", "ランキング API URL (= GAS Web App)");
  const colTh = document.querySelectorAll("#rankingTable th");
  if (colTh.length === 6) {
    colTh[0].textContent = t("ranking.col.rank",   "#");
    colTh[1].textContent = t("ranking.col.player", "プレイヤー");
    colTh[2].textContent = t("ranking.col.score",  "スコア");
    colTh[3].textContent = t("ranking.col.reg",    "レギュ");
    colTh[4].textContent = t("ranking.col.kills",  "撃破");
    colTh[5].textContent = t("ranking.col.time",   "時間");
  }
}

async function _load() {
  const url = getRankingApiUrl();
  const cfgEl = _config();
  if (!url) {
    if (cfgEl) cfgEl.classList.remove("hidden");
    _renderRows([]);
    if (_msg()) _msg().textContent = t("ranking.needUrl", "API URL が未設定です。 下の入力欄に貼り付けて保存してください。");
    return;
  }
  if (cfgEl) cfgEl.classList.add("hidden");
  if (_msg()) _msg().textContent = t("ranking.loading", "読み込み中…");

  const filterMode = _filter()?.value ?? "all";   // SPEC-047: 既定は全バージョン (= v1.0 でスコアの式は変えていない)
  const regMode    = _regFilter()?.value ?? "all";   // SPEC-037: regulation filter (= all/NORMAL/ABSOLUTE)
  const opts = { limit: 20 };
  if (filterMode === "current") opts.version = APP_VERSION;
  if (regMode === "NORMAL" || regMode === "ABSOLUTE") opts.regulation = regMode;
  const result = await fetchRanking(opts);
  if (!result.ok) {
    if (_msg()) _msg().textContent = tpl(t("ranking.loadFail", "読込失敗: {err}"), { err: result.error || "?" });
    _renderRows([]);
    return;
  }
  if (_msg()) _msg().textContent = (result.ranking.length === 0)
    ? t("ranking.empty", "まだエントリがありません。 1 番乗りに送信してみよう!")
    : "";
  _renderRows(result.ranking || []);
}

function _renderRows(rows) {
  const tbody = _list();
  if (!tbody) return;
  tbody.innerHTML = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tr = document.createElement("tr");
    // SPEC-037: regulation 列を追加 (= 「NORMAL」 / 「ABSOLUTE ×1.50」 等)
    const reg = String(r.regulation || "NORMAL");
    const regMul = Number(r.regulationMul || 1);
    const regCell = (reg === "ABSOLUTE")
      ? `ABS ×${regMul.toFixed(2)}`
      : `NORMAL`;
    tr.innerHTML =
      `<td class="ranking-rank">${i + 1}</td>` +
      `<td class="ranking-player">${_esc(r.playerName || "—")}</td>` +
      `<td class="ranking-score">${r.score | 0}</td>` +
      `<td class="ranking-reg">${_esc(regCell)}</td>` +
      `<td>${r.kills | 0}</td>` +
      `<td>${formatElapsed(r.elapsedSec | 0)}</td>`;
    tbody.appendChild(tr);
  }
}

async function _onRefresh() {
  await _load();
}

function _onSaveUrl() {
  const v = (_input()?.value || "").trim();
  if (!isRankingApiUrl(v)) {   // SPEC-095: Google Apps Script のウェブアプリの URL だけ
    if (_msg()) _msg().textContent = t("ranking.urlInvalid", "URL は https://script.google.com/macros/s/…/exec の形で入れてください");
    return;
  }
  setRankingApiUrl(v);
  if (_msg()) _msg().textContent = t("ranking.urlSaved", "URL を保存しました。 再読込します…");
  _load();
}

function _esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
