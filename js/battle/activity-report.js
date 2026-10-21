// ============================================================
// battle/activity-report.js — 全ステージクリア時の活動レポート (= SPEC-033)
// ============================================================
//
// state.run.stages の snapshot 群 + state.ownedHero から:
//   - ヒーロー (= 名前 / faction)
//   - ステージごと: クリア時間 / 撃破数 / 取得 extension とレベル
//   - 総クリア時間 / 総撃破数
//   - 上記から算出した score
// を組み立てて #activityReportModal に描画。 ranking 送信 + リトライボタン付き。
//
// pauseFlags 不変条件: open で pauseTime + 1、 retry click で resumeTime + 1。

import { state, pauseTime, resumeTime } from "../state.js";
import {
  STAGE_TABLE, APP_VERSION, SFX, HERO_STARTING_WEAPON,
  computeRegulationMul,
} from "../constants.js";
import { t, tpl, onLangChange, getLang } from "../i18n.js";
import { getExt, getTierName, extTierImg } from "../extensions.js";
import { heroImg } from "../heroes.js";
import { formatElapsed } from "../survival.js";
import { stopBgm, playSe } from "../audio.js";
import { scoreMetrics, reportRunScore, defaultPlayerName, platformUserName, setChatVisible } from "../platform.js";
import { returnToTitle } from "./gameover.js";
import { countUp, revealIn } from "../reveal.js";
import { presentResult } from "../result-telop.js";
import { startMenuBgmAfterJingle } from "../ui-sound.js";
import { grantRunRewards, runDust, addHeroClear } from "../meta.js";   // + SPEC-106
import { renderRewards, renderGumBreakdown } from "../meta-ui.js";
import { perk } from "../perks.js";   // SPEC-090c
import {
  getPlayerName, setPlayerName, submitScore, getRankingApiUrl,
} from "../ranking-client.js";
import { markPlayed } from "../played.js";
import { isEasy, markEasyCleared } from "../easy.js";   // SPEC-147
import { unlockEasyReward } from "../hero-unlock.js";   // SPEC-153
import { showLesson } from "../lesson.js";   // SPEC-147
import { collectAnalysis, renderAnalysis } from "./analysis-ui.js";   // SPEC-148
import { stopVoice } from "../voice.js";   // SPEC-149
import { startConfetti, removeConfetti } from "../confetti.js";   // SPEC-149

let _wired = false;

/**
 * 活動レポート modal を開く。 全ステージ clear 時のみ呼ばれる前提。
 * 失敗 (= HP 0) は従来 triggerGameOver() で別 path。
 */
let _rewards = null;

/** SPEC-106: LL が解放された (= レポートの報酬の下に虹色の 1 行) */
function showLLUnlocked(extId) {
  const ext = getExt(extId);
  const box = document.getElementById("activityReportLL");
  if (!ext?.ll || !box) return;
  const lang = getLang();
  box.textContent = tpl(t("report.llUnlocked", "LL 解放！ 次から「{name}」にランクアップできる"), { name: ext.ll.name[lang] ?? ext.ll.name.ja });
  box.classList.remove("hidden");
}   // SPEC-090: この挑戦の GUM とゴールドダスト (= レポートを描くとき)

export function triggerActivityReport() {
  pauseTime();
  stopVoice();   // SPEC-149: レッスンの読み上げが残っていても、 クリアの演出を優先する
  const easy = isEasy();   // SPEC-147: EASY は ABSOLUTE・RTA を開かず、 LL も共通基盤も送らない。 代わりに EASY クリアを覚える
  if (!easy) markPlayed();   // SPEC-088: 1 回遊び終えた (= 次から ABSOLUTE・RTA が選べる)
  if (easy) { markEasyCleared(); unlockEasyReward(); }   // SPEC-153: ビリー・ザ・キッドが仲間に
  // SPEC-106: そのヒーローで全ステージをクリアした (= 初めてなら LL の解放を知らせる)
  const llFirst = !easy && addHeroClear(state.ownedHero?.heroId) && !!getExt(HERO_STARTING_WEAPON[state.ownedHero?.heroId])?.ll;
  _rewards = { ...grantRunRewards(true, { gumMul: perk("gumMul") }), dust: runDust() };   // SPEC-090: 全クリアの GUM (+ SPEC-090c 金勘定)
  const analysis = collectAnalysis({ cleared: true });   // SPEC-148: この挑戦の数字 (= 前回のクリアと自己ベストと比べる)
  // SPEC-041: 共通基盤の総合スコア (= 全クリア)
  state.run.scoreSent = true;
  if (!easy) reportRunScore(scoreMetrics({
    run: state.run, cleared: true, reportScore: computeScore(state.run),
    regulation: state.regulation, absolute: state.absolute,   // SPEC-051: 倍率は共通基盤が計算する
  }));
  _wireOnce();
  // SPEC-017: BGM 停止 + win SE (= 既存 gameover の clear 分岐と同じ感触に)
  stopBgm();
  playSe(SFX.GAME_OVER_CLEAR, 0, 0.7);
  // SPEC-060: ジングルが鳴り終わってから、 メニューの BGM (= まだこの画面にいれば)
  startMenuBgmAfterJingle("win", () => !document.getElementById("activityReportModal")?.classList.contains("hidden"));
  _renderReport();
  const modal = document.getElementById("activityReportModal");
  modal?.classList.remove("hidden");
  setChatVisible(true);   // SPEC-091: 結果の画面では全体チャットを出す
  // SPEC-058: テロップのあと、 SPEC-046: ヒーロー → ステージ → 合計の順に出し、 スコアを 0 から数え上げる
  presentResult(modal, "allClear", {
    heroId: state.ownedHero?.heroId ?? null,
    then: () => {
      revealIn(modal);
      const scoreEl = document.getElementById("activityReportScore");
      if (scoreEl) countUp(scoreEl, Number(scoreEl.dataset.score) || 0, { durMs: 800, delayMs: 450 });
      renderRewards(document.getElementById("activityReportRewards"), _rewards ?? {}, { delayMs: 900 });   // SPEC-090
      renderGumBreakdown(document.getElementById("activityReportGum"), _rewards);   // SPEC-136
      renderAnalysis(document.getElementById("activityReportAnalysis"), analysis);   // SPEC-148
      startConfetti();   // SPEC-149
      if (llFirst) showLLUnlocked(HERO_STARTING_WEAPON[state.ownedHero?.heroId]);   // SPEC-106
      if (easy) showLesson("s3.clear");   // SPEC-147
    },
  });
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  document.getElementById("activityReportRetry")
    ?.addEventListener("click", _onRetryClick);
  // SPEC-147: EASY をクリアしたら NORMAL へ (= タイトルを通さずにモード選択へ)
  document.getElementById("activityReportToNormal")
    ?.addEventListener("click", async () => {
      document.getElementById("activityReportModal")?.classList.add("hidden");
      await returnToTitle({ navi: false });
      const m = await import("../main.js");
      m.openModeSelectFromTitle?.();
    });
  // SPEC-052: タイトルに戻る (= ゲームオーバーと同じ処理)
  document.getElementById("activityReportToTitle")
    ?.addEventListener("click", () => {
      document.getElementById("activityReportModal")?.classList.add("hidden");
      returnToTitle();
    });
  document.getElementById("activityReportSubmit")
    ?.addEventListener("click", _onSubmitClick);
  // SPEC-035: 送信成功後に表示される 「ランキングを見る」 ボタン
  document.getElementById("activityReportViewRanking")
    ?.addEventListener("click", async () => {
      const m = await import("../ranking-ui.js");
      m.openRanking();
    });
  onLangChange(() => {
    if (!document.getElementById("activityReportModal")?.classList.contains("hidden")) {
      _renderReport();
    }
  });
}

async function _onRetryClick() {
  removeConfetti();   // SPEC-149
  document.getElementById("activityReportModal")?.classList.add("hidden");
  state.currentStageIdx = 0;       // ステージ 1 から
  // state.run は applyHeroPick で初期化されるため、 retry でもクリア
  state.run.stages.length = 0;
  state.run.totalKills    = 0;
  state.run.totalElapsedMs = 0;
  resumeTime();
  const m = await import("./index.js");
  m.startBattle(state.ownedHero);
}

async function _onSubmitClick() {
  const btn   = document.getElementById("activityReportSubmit");
  const input = document.getElementById("activityReportName");
  const msg   = document.getElementById("activityReportMsg");
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

  const baseScore = computeScore(state.run);
  const regMul    = computeRegulationMul(state.regulation, state.absolute);
  const score     = Math.round(baseScore * regMul);
  const totalSec  = Math.round(state.run.totalElapsedMs / 1000);
  const result = await submitScore({
    playerName: name,
    score,
    level:      state.level,
    kills:      state.run.totalKills,
    hero:       _heroName(),
    faction:    state.ownedHero?.faction ?? null,
    version:    APP_VERSION,
    elapsedSec: totalSec,
    // SPEC-037: レギュレーション + 倍率
    regulation:    state.regulation ?? "NORMAL",
    regulationMul: regMul,
  });
  if (result.ok) {
    msg.textContent = t("gameover.submitOk", "Submitted!");
    // SPEC-035: 送信成功時に 「ランキングを見る」 ボタンを表示
    document.getElementById("activityReportViewRanking")?.classList.remove("hidden");
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

/**
 * 活動レポートのスコア算出。
 *   score = 撃破数*100 + 最高 Lv*500 + 取得 ext 数*300 + 速度ボーナス + クリア基本 5000
 */
export function computeScore(run) {
  const kills = run.totalKills ?? 0;
  const sec   = (run.totalElapsedMs ?? 0) / 1000;
  // 全ステージで取得した extension の unique 系列数
  const extIds = new Set();
  let bestLevel = 1;
  for (const s of run.stages) {
    if ((s.level ?? 1) > bestLevel) bestLevel = s.level;
    for (const o of (s.ownedExtensions ?? [])) extIds.add(String(o.extId));
  }
  const speedBonus = Math.max(0, 60000 - Math.round(sec * 50));
  return kills * 100 + bestLevel * 500 + extIds.size * 300 + speedBonus + 5000;
}

function _renderReport() {
  const lang = (document.documentElement.getAttribute("lang") === "en") ? "en" : "ja";

  // タイトル
  const titleEl = document.getElementById("activityReportTitle");
  if (titleEl) titleEl.textContent = isEasy() ? t("report.easyTitle", "EASY クリア！") : t("report.title", "活動レポート");
  // SPEC-147: EASY は「NORMAL に挑む」を一番上に。 ランキングは送らない (= 短いステージの点なので)
  const toNormal = document.getElementById("activityReportToNormal");
  if (toNormal) { toNormal.classList.toggle("hidden", !isEasy()); toNormal.textContent = t("report.toNormal", "NORMAL に挑む ▶"); }
  document.querySelector("#activityReportModal .gameover-modal__form")?.classList.toggle("hidden", isEasy());

  // SPEC-038: ヒーローはアイコン + 名前で大きく表示
  const heroEl = document.getElementById("activityReportHero");
  if (heroEl) {
    const h = state.ownedHero;
    if (h && h.heroId != null) {
      const name = _heroName() ?? "—";
      const faction = h.faction ?? "";
      heroEl.innerHTML =
        `<div class="report-hero__inner" data-faction="${escapeAttr(faction)}">` +
        `  <img class="report-hero__portrait" src="${escapeAttr(heroImg(h.heroId))}" alt="${escapeAttr(name)}" loading="lazy" ` +
        `       onerror="this.classList.add('report-hero__portrait--missing'); this.removeAttribute('src');" />` +
        `  <span class="report-hero__name">${escapeHtml(name)}</span>` +
        `</div>`;
    } else {
      heroEl.innerHTML = `<div class="report-hero__inner"><span class="report-hero__name">—</span></div>`;
    }
  }

  // SPEC-038: ステージごとを縦カードで描画 (= テキスト table → アイコンタイル + Lv バッジ)
  const stagesEl = document.getElementById("activityReportStages");
  if (stagesEl) {
    stagesEl.innerHTML = "";
    for (const s of state.run.stages) {
      const card = document.createElement("div");
      card.className = "report-stage";
      card.setAttribute("data-reveal", "");   // SPEC-046
      const stageName = t(s.nameKey, s.nameKey);
      const time = formatElapsed(Math.round(s.elapsedMs / 1000));
      // ext アイコンタイル
      const extTiles = (s.ownedExtensions ?? []).map(o => {
        const ext = getExt(o.extId);
        if (!ext) return "";
        const altName = ext ? getTierName(ext, o.level, lang) : `#${o.extId}`;
        return `<div class="report-ext" title="${escapeAttr(altName)}">` +
               `  <img class="report-ext__icon" src="${escapeAttr(extTierImg(ext, o.level))}" alt="${escapeAttr(altName)}" loading="lazy" ` +
               `       onerror="this.classList.add('report-ext__icon--missing'); this.removeAttribute('src');" />` +
               `  <span class="report-ext__lv">Lv.${o.level | 0}</span>` +
               `</div>`;
      }).join("");
      card.innerHTML =
        `<header class="report-stage__head">` +
        `  <span class="report-stage__name">${escapeHtml(stageName)}</span>` +
        `  <span class="report-stage__stats">⏱ ${escapeHtml(time)} · 💀 ${s.kills | 0} · Lv.${s.level | 0}</span>` +
        `</header>` +
        `<div class="report-stage__exts">${extTiles || `<span class="report-ext--empty">—</span>`}</div>`;
      stagesEl.appendChild(card);
    }
  }

  // 総合スタッツ + 大きなスコア
  const totalsEl = document.getElementById("activityReportTotals");
  if (totalsEl) {
    const totalSec = Math.round(state.run.totalElapsedMs / 1000);
    // SPEC-037: 最終スコアは regulationMul 込み
    const baseScore = computeScore(state.run);
    const regMul    = computeRegulationMul(state.regulation, state.absolute);
    const score     = Math.round(baseScore * regMul);
    const regLabel  = (state.regulation === "ABSOLUTE")
      ? `ABSOLUTE ×${regMul.toFixed(2)}`
      : `NORMAL ×1.00`;
    // SPEC-038: スコアを大きく中央表示、 補助情報をアイコン付き 1 行で
    totalsEl.innerHTML =
      `<div class="report-meta-row">` +
      `  <span class="report-meta">🏷️ ${escapeHtml(regLabel)}</span>` +
      `  <span class="report-meta">⏱ ${escapeHtml(formatElapsed(totalSec))}</span>` +
      `  <span class="report-meta">💀 ${state.run.totalKills | 0}</span>` +
      `</div>` +
      `<div class="report-score-big num" id="activityReportScore" data-score="${score | 0}">${(score | 0).toLocaleString()}</div>` +
      `<div class="report-score-label">${escapeHtml(t("report.scoreLabel", "SCORE"))}</div>`;
  }

  // ranking submit ボタン
  const submitBtn = document.getElementById("activityReportSubmit");
  const msg       = document.getElementById("activityReportMsg");
  const noApi     = !getRankingApiUrl();
  if (submitBtn) submitBtn.disabled = noApi;
  if (msg) msg.textContent = noApi ? t("gameover.noApi", "Ranking API not configured") : "";
  if (submitBtn) submitBtn.textContent = t("gameover.submit", "ランキングに送信");
  const viewBtn = document.getElementById("activityReportViewRanking");
  if (viewBtn) viewBtn.textContent = t("ranking.openTitle", "ランキングを見る");
  const retryBtn = document.getElementById("activityReportRetry");
  if (retryBtn) retryBtn.textContent = t("gameover.retry", "リトライ");
  // SPEC-052: タイトルに戻る・(RTA なら) bearko.games に戻る
  const toTitleBtn = document.getElementById("activityReportToTitle");
  if (toTitleBtn) toTitleBtn.textContent = t("gameover.toTitle", "タイトルに戻る");
  const portal = document.getElementById("activityReportPortal");
  if (portal) {
    portal.textContent = t("result.toPortal", "bearko.games に戻る");
    portal.classList.toggle("hidden", !state.rtaMode);
  }
  const nameLabel = document.getElementById("activityReportNameLabel");
  if (nameLabel) nameLabel.textContent = t("gameover.namelabel", "プレイヤー名");
  // SPEC-052: 名前の既定はログイン中の bearko.games の名前 → 前に送った名前 → 空
  const input = document.getElementById("activityReportName");
  if (input) {
    if (!input.value) input.value = defaultPlayerName({ accountName: platformUserName(), saved: getPlayerName() });
    input.placeholder = t("gameover.namePlaceholder", "名前を入れる");
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }
