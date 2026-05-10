// ============================================================
// ranking-ui.js — ランキングモーダル + URL 入力 + 一覧描画 (= SPEC-035)
// ============================================================
//
// 起動経路: タイトル画面の 「ランキング」 ボタン or 活動レポートの 「ランキングを見る」
// 内部: fetchRanking → top 20 を table 描画。 URL 未設定なら入力欄を出して保存可能。
// URL hash bootstrap: ?#api=base64(URL) を踏むと自動で localStorage に保存。

import {
  fetchRanking, getRankingApiUrl, setRankingApiUrl,
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

export function installRankingUI() {
  if (_wired) return;
  _wired = true;

  _close()?.addEventListener("click", closeRanking);
  _refresh()?.addEventListener("click", _onRefresh);
  _save()?.addEventListener("click", _onSaveUrl);
  _filter()?.addEventListener("change", _onRefresh);

  // SPEC-035: タイトル画面 + メニュー (= js/menu.js から openRanking 呼出) の 2 経路
  document.getElementById("btnTitleRanking")?.addEventListener("click", openRanking);

  onLangChange(() => {
    if (_opened) _renderShell();
  });

  // URL hash bootstrap: #api=base64 を踏んだら自動保存
  _consumeHashApiUrl();
}

function _consumeHashApiUrl() {
  try {
    const h = (location.hash || "").replace(/^#/, "");
    const m = h.match(/(?:^|&)api=([^&]+)/);
    if (!m) return;
    const decoded = atob(decodeURIComponent(m[1]));
    if (decoded && /^https?:\/\//.test(decoded)) {
      setRankingApiUrl(decoded);
      // 一度きりで消す (= reload しても再保存されない)
      const next = h.replace(/(?:^|&)api=[^&]+/, "").replace(/^&/, "");
      history.replaceState(null, "", location.pathname + location.search + (next ? "#" + next : ""));
    }
  } catch (_) {}
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
  const inp   = _input();   if (inp)     inp.placeholder     = t("ranking.urlPlaceholder", "https://script.google.com/macros/s/.../exec");
  const cfgL  = document.getElementById("rankingConfigLabel");
  if (cfgL) cfgL.textContent = t("ranking.configLabel", "ランキング API URL (= GAS Web App)");
  const colTh = document.querySelectorAll("#rankingTable th");
  if (colTh.length === 5) {
    colTh[0].textContent = t("ranking.col.rank",   "#");
    colTh[1].textContent = t("ranking.col.player", "プレイヤー");
    colTh[2].textContent = t("ranking.col.score",  "スコア");
    colTh[3].textContent = t("ranking.col.kills",  "撃破");
    colTh[4].textContent = t("ranking.col.time",   "時間");
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

  const filterMode = _filter()?.value ?? "current";
  const opts = { limit: 20 };
  if (filterMode === "current") opts.version = APP_VERSION;
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
    tr.innerHTML =
      `<td class="ranking-rank">${i + 1}</td>` +
      `<td class="ranking-player">${_esc(r.playerName || "—")}</td>` +
      `<td class="ranking-score">${r.score | 0}</td>` +
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
  if (!/^https?:\/\//.test(v)) {
    if (_msg()) _msg().textContent = t("ranking.urlInvalid", "URL は http(s):// で始めてください");
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
