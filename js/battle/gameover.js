// ============================================================
// battle/gameover.js — HP 0 → Game Over モーダル + リトライ + ranking 送信
// (= SPEC-009)
// ============================================================
//
// pauseFlags 不変条件: triggerGameOver で pauseTime + 1、 applyRetry で resumeTime + 1。
// startBattle は循環 import 回避のため動的 import。

import { state, pauseTime, resumeTime } from "../state.js";
import { resetResumeCountdown } from "./resume-countdown.js";   // SPEC-104
import { hideShop } from "./shop.js";   // SPEC-109
import { hideMissionUi } from "./missions.js";   // SPEC-112
import { t, tpl, onLangChange } from "../i18n.js";
import {
  getPlayerName, setPlayerName, submitScore, getRankingApiUrl,
} from "../ranking-client.js";
import { APP_VERSION, SFX, computeRegulationMul, REGULATION_ABSOLUTE } from "../constants.js";   // SPEC-146: 再走の文言
import { formatElapsed } from "../survival.js";
import { stopBgm, playSe } from "../audio.js";
import { abortRtaRun, scoreMetrics, reportRunScore, defaultPlayerName, platformUserName, setChatVisible } from "../platform.js";
import { STAGE_TABLE } from "../constants.js";
import { countUp, revealIn } from "../reveal.js";
import { naviTitle, naviHide, naviSay, naviLines } from "../navi.js";
import { treeNudge } from "../skill-logic.js";   // SPEC-116
import { presentResult } from "../result-telop.js";
import { startTitleBgm, startMenuBgmAfterJingle } from "../ui-sound.js";
import { grantRunRewards, runDust, getMeta } from "../meta.js";
import { renderRewards, renderGumBreakdown } from "../meta-ui.js";
import { perk } from "../perks.js";   // SPEC-090c
import { markPlayed } from "../played.js";
import { isEasy, stageCount } from "../easy.js";   // SPEC-147 / SPEC-154
import { showLesson } from "../lesson.js";   // SPEC-147
import { owns } from "../skill-logic.js";   // SPEC-147
import { ROOT_ID } from "../skill-data.js";   // SPEC-147
import { collectAnalysis, renderAnalysis, adviceVars } from "./analysis-ui.js";   // SPEC-148
import { suggest } from "./run-stats.js";   // SPEC-148
import { renderRevivePicks } from "./revive-picks.js";   // SPEC-155
import { hasSeenRevive, markReviveSeen } from "../revive-seen.js";   // SPEC-155
import { dissolveHero, sinkHero, rainHero, clearReviveFx, setReviveLabel, REVIVE, REVIVE_EXT_ID } from "./revive-fx.js";   // SPEC-150 / SPEC-151
import { resetResumeCountdown as _noCountdown } from "./resume-countdown.js";   // SPEC-151: 降りこんだあとの再開に Ready → Go! は出さない
import { NAVI_TYPE_MS } from "../navi.js";   // SPEC-151
import { voiceMs } from "../voice.js";   // SPEC-151
import { removeConfetti } from "../confetti.js";   // SPEC-149
import { hideCoach } from "./coach.js";   // SPEC-151: 渦のあいだ操作ガイドは出さない
import { CHAR_SPRITE_RATIO, img } from "../constants.js";   // SPEC-150

let _wired = false;
let _showTimer = 0;   // SPEC-150: 粒子が舞い上がってから結果の画面を出す
let _loseN = Math.floor(Math.random() * 3);   // SPEC-116: 倒れたときのひとことの順番 (= 続けて同じにしない)
let _introSaid = false;   // SPEC-160: 全身のマインちゃんが「復活させてあげる」をこの回に言った (= 帯で励ましを重ねない)

/**
 * SPEC-009: HP 0 で Game Over。
 * SPEC-017: reason ("lose" | "clear") を取って BGM 停止 + 対応 SE を鳴らす。
 *           reason 省略時は "lose" 扱い (= 既存呼出と互換)。
 */
export function triggerGameOver(reason = "lose") {
  if (state.battle.gameOver) return;
  state.battle.gameOver = true;
  if (!isEasy()) markPlayed();   // SPEC-088: 1 回遊び終えた (= 次から ABSOLUTE・RTA が選べる)。 SPEC-147: EASY では開かない
  // SPEC-040: 倒れたら RTA の計測は中断 (= 再走は startBattle で新しい計測になる)。
  // "clear" は最後の区切りを送ったあとなので触らない
  if (reason !== "clear") abortRtaRun();
  // SPEC-041: 共通基盤の総合スコア (= 倒れるまでに終えたステージの節目の点)
  if (reason !== "clear") state.run.scoreSent = true;
  if (reason !== "clear" && !isEasy()) reportRunScore(scoreMetrics({ run: state.run, cleared: false, regulation: state.regulation, absolute: state.absolute }));   // SPEC-147: EASY は送らない
  state.lastRunStats = {
    elapsed: state.elapsedTicks,
    level:   state.level,
    kills:   state.killCount,
    reason,                  // SPEC-027: "lose" | "clear" でタイトル分岐に使う
    // SPEC-090: 倒れても GUM。 SPEC-136: 遊んだぶん (= 生存時間・撃破数・到達レベル・残ったギフト券) を式で。 ゴールドダストはこの挑戦で倒したボスのぶん
    rewards: reason !== "clear" ? { ...grantRunRewards(false, { gumMul: perk("gumMul") }), dust: runDust() } : null,
    // SPEC-148: 負けた理由の分析 (= 被ダメの内訳・DPS・前回の敗北と自己ベストとの比較)。 記録もここで足す
    analysis: reason !== "clear" ? collectAnalysis({ cleared: false }) : null,
  };
  pauseTime();
  hideMissionUi();   // SPEC-112: 受けていたミッションの帯を消す
  hideCoach();       // SPEC-151
  _wireOnce();
  _renderGameOverModal();
  const modal = document.getElementById("gameOverModal");
  // SPEC-046: 上から順に出し、 撃破数を数え上げる
  const reveal = () => {
    // SPEC-153: 内訳と分析は畳んだ状態から
    document.getElementById("gameOverMoreBody")?.classList.add("hidden");
    document.getElementById("gameOverMore")?.classList.remove("result-more--open");
    document.getElementById("gameOverMore")?.setAttribute("aria-expanded", "false");
    revealIn(modal);
    countUp(document.getElementById("gameOverKills"), state.lastRunStats?.kills ?? 0, { durMs: 600, delayMs: 250 });
    renderRewards(document.getElementById("gameOverRewards"), state.lastRunStats?.rewards ?? {}, { delayMs: 500 });   // SPEC-090
    renderGumBreakdown(document.getElementById("gameOverGum"), state.lastRunStats?.rewards);   // SPEC-136
    // SPEC-148: 分析の表 (= おすすめの節を押すと、 その節を選んだ状態で木が開く。 RTA では木が効かないのでおすすめは出さない)
    renderAnalysis(document.getElementById("gameOverAnalysis"), state.lastRunStats?.analysis, {
      advice: !state.rtaMode,
      onNode: (id) => import("../skill-tree.js").then((m) => m.openSkillTree({ focus: id, returnTo: modal, retry: true })),
    });
    // SPEC-155: おすすめの強化 (= 木へ行かずにここで。 買えたら「復活する」を脈打たせて、 マインちゃんが「強くなったね」)
    if (reason !== "clear" && !state.rtaMode) {
      renderRevivePicks(document.getElementById("gameOverPicks"), {
        adviceNodes: suggest(state.lastRunStats?.analysis?.sum)?.nodes ?? [],
        onBought: () => onBackFromTree({ bought: 1 }),
      });
    } else document.getElementById("gameOverPicks")?.classList.add("hidden");
    sayOnLose(reason, modal);   // SPEC-116
  };
  clearTimeout(_showTimer);
  if (reason === "clear") {
    modal?.classList.remove("hidden", "gameover-modal--revive");
    setChatVisible(true);   // SPEC-091: 結果の画面では全体チャットを出す
    presentResult(modal, "allClear", { heroId: state.ownedHero?.heroId ?? null, then: reveal });   // SPEC-058: テロップのあと
  } else {
    // SPEC-150 / SPEC-151: lose のテロップの代わりに、 ヒーローが粒子になって舞い上がり、 真ん中の渦に入る。
    // 渦に入ったらマインちゃんが全身で「王妃の黄金時計で復活させてあげる」 (= 時計の絵つき)。 言い終えたら引っこみ、 半透明の結果の画面が渦の上に重なる
    const show = () => {
      if (!state.battle.gameOver || !modal) return;   // そのあいだにやめていたら出さない
      _hideWatch();
      modal.classList.remove("hidden");
      setChatVisible(true);   // SPEC-091
      reveal();
    };
    _introSaid = false;
    const dissolved = _startDissolve(() => {
      if (!state.battle.gameOver) return;
      // SPEC-155: 復活のしかたの説明は初回だけ。 2 回目からは渦に入ったらそのまま REVIVE の画面 (= SPEC-160: 励ましは画面の下の帯で)
      if (hasSeenRevive()) { show(); return; }
      markReviveSeen();
      _introSaid = true;
      const lines = naviLines("revive");
      const ms = lines.reduce((a, l) => a + Math.max(t(l.key, l.key).length * NAVI_TYPE_MS, voiceMs(l.voice)), 0) + REVIVE_LINE_HOLD_MS;
      _showWatch();
      naviSay(lines, { place: "revive", autoHideMs: REVIVE_LINE_HOLD_MS, onTapNavi: () => { clearTimeout(_showTimer); naviHide(); show(); } });
      clearTimeout(_showTimer);
      _showTimer = setTimeout(show, ms + 260);
    });
    modal?.classList.toggle("gameover-modal--revive", dissolved);
    if (!dissolved) show();
  }
  // 残っていた Level-up モーダルが有れば閉じる (= 同フレームで LV up と死亡が起きる場合)
  const lv = document.getElementById("levelUpModal");
  if (lv && !lv.classList.contains("hidden")) {
    lv.classList.add("hidden");
    state.pendingPickOptions = [];
    state.pendingPickIsStarter = false;
    resumeTime();   // levelup の pauseTime を解く (= triggerGameOver の +1 と相殺ではなく独立)
  }
  // SPEC-017: BGM 停止 + 結果 SE。 SPEC-151: 倒れたときは lose のジングルを鳴らさず (= 気落ちさせない)、 ダメージの音をゆっくり
  stopBgm();
  if (reason === "clear") playSe(SFX.GAME_OVER_CLEAR, 0, 0.7);
  else playSe(SFX.PLAYER_DAMAGED, 0, 0.8, DEATH_SE_RATE);
  // SPEC-060: ジングルが鳴り終わってから、 メニューの BGM (= まだこの画面にいれば)
  startMenuBgmAfterJingle(reason === "clear" ? "win" : "lose",
    () => !document.getElementById("gameOverModal")?.classList.contains("hidden"));
}

/** SPEC-151: マインちゃんのセリフのあと、 結果の画面を出すまでの間 (= 読み終えてから) */
const REVIVE_LINE_HOLD_MS = 1400;
/** SPEC-151: 倒れたときの SE (= ダメージの音をゆっくり。 lose のジングルは鳴らさない) */
const DEATH_SE_RATE = 0.45;

/**
 * SPEC-150 / SPEC-151: 倒れたヒーローが粒子になって舞い上がる (= 戦闘の絵からは消す)。 出せたら true。 渦に入ったら onVortex
 */
function _startDissolve(onVortex) {
  const b = state.battle;
  const canvas = document.getElementById("battleCanvas");
  const sp = b.playerSprite;
  if (!canvas || !sp?.ready || sp.failed || !b.player) return false;
  const rect = canvas.getBoundingClientRect();
  const r = b.player.r;
  const ok = dissolveHero({
    x: rect.left + (b.player.x - b.camera.x),
    y: rect.top + (b.player.y - b.camera.y) - r * 0.12,   // render.js の絵の位置 (= 足もとの揺れは無視)
    size: r * CHAR_SPRITE_RATIO,
    img: sp.img,
    onVortex,
  });
  b.heroDissolved = ok;
  return ok;
}

/** SPEC-151: 王妃の黄金時計の絵 (= マインちゃんが話すあいだ、 右に大きく) */
let _watch = null;
function _showWatch() {
  _hideWatch();
  _watch = document.createElement("img");
  _watch.className = "revive-watch";
  _watch.alt = "";
  _watch.setAttribute("aria-hidden", "true");
  _watch.src = img(`Image/Extensions/${REVIVE_EXT_ID}.png`);
  document.body.appendChild(_watch);
}
function _hideWatch() {
  if (!_watch) return;
  const el = _watch; _watch = null;
  el.classList.add("revive-watch--out");
  setTimeout(() => el.remove(), 400);
}

/**
 * SPEC-151: 「復活する」: 渦が画面の下へ吸い込まれ (= 結果の画面は消えている)、 戦闘を始めてから、
 * ステージの真ん中に上から粒が降りこんでヒーローの姿になる。 姿になるまで戦闘は止めておく
 */
async function _reviveSink() {
  if (!state.battle.heroDissolved) return false;
  return sinkHero();
}
async function _reviveRain() {
  const b = state.battle;
  const canvas = document.getElementById("battleCanvas");
  if (!canvas || !b.player) { b.heroDissolved = false; return false; }
  const rect = canvas.getBoundingClientRect();
  const r = b.player.r;
  b.heroDissolved = true;
  pauseTime();
  setReviveLabel(t("revive.flash", "REVIVE!"));
  const ok = await rainHero({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 - r * 0.12, size: r * CHAR_SPRITE_RATIO });
  if (ok) playSe(SFX.PICK_HEAL, 0, 0.8);   // 3_heal_resurrection.mp3
  b.heroDissolved = false;
  resumeTime();
  _noCountdown();   // Ready → Go! は出さない (= 降りこんだ瞬間から動ける)
  return ok;
}

/**
 * SPEC-116: 倒れたとき、 マインちゃんが画面の下の帯でスキルツリーへ誘う。
 * SPEC-150: まず「王妃の黄金時計で復活させてあげる」 (= 吹き出しを押すと 2 行目)。
 * 2 行目は、 スキルツリーを始めていなければ (= 根をまだ取っていない) 入口の案内、 始めていれば SPEC-148 のおすすめ (= 無ければ 3 つのひとことを順に)。
 * RTA ではスキルツリーが効かないので 2 行目は無い
 */
function sayOnLose(reason, modal) {
  modal?.classList.remove("gameover-modal--navi");
  if (reason === "clear") return;
  if (isEasy() && showLesson("s2.lose")) return;   // SPEC-147: 初めてはレッスンで。 SPEC-160: 2 回目からは下の励まし
  // SPEC-151: 粒子の演出のときは、 全身のマインちゃんが「復活させてあげる」をもう言っているので、 帯では 2 行目だけ
  // SPEC-155: 説明は初回だけ (= 粒子が出せない端末でも、 2 回目からは帯で言い直さない)
  const lines = state.battle.heroDissolved || hasSeenRevive() ? [] : naviLines("revive");   // SPEC-150
  if (!state.battle.heroDissolved && lines.length) markReviveSeen();
  // SPEC-160: 全身の「復活させてあげる」が無い回 (= 2 回目から) は、 帯のマインちゃん (= アイコンと吹き出し) がまず励ます
  if (!_introSaid && !lines.length) { _loseN += 1; lines.push(...naviLines("lose", { n: _loseN })); }
  if (!state.rtaMode) {
    const guide = treeNudge(getMeta());
    // SPEC-148: 木を始めていれば、 SPEC-116 のひとことの代わりに、 被ダメの内訳からのおすすめを 1 つ
    const sug = guide ? null : suggest(state.lastRunStats?.analysis?.sum);
    if (sug) lines.push(...naviLines("advice", { key: sug.key, vars: adviceVars(sug) }));
    else if (guide) lines.push(...naviLines("lose", { guide }));
    else if (_introSaid) { _loseN += 1; lines.push(...naviLines("lose", { guide, n: _loseN })); }   // SPEC-116: 初回で木を始めていれば、 ひとことを 1 つ
  }
  if (!lines.length) return;
  modal?.classList.add("gameover-modal--navi");
  naviSay(lines, { place: "result" });
}

/** SPEC-146 → SPEC-150: 「復活する」の文言 (= RTA と ABSOLUTE は「今のレギュレーションで復活する」) */
export function retryLabel() {
  return state.rtaMode || state.regulation === REGULATION_ABSOLUTE ? t("gameover.reviveCurrent", "今のレギュレーションで復活する") : t("gameover.revive", "復活する ▶");
}

/** SPEC-146: スキルツリーから戻ったとき (= 強くしたなら、 マインちゃんが「もう一度」を押す) */
export function onBackFromTree({ bought = 0, fromTree = false } = {}) {
  const modal = document.getElementById("gameOverModal");
  if (!modal || modal.classList.contains("hidden") || state.rtaMode) return;
  easyRetryGate();   // SPEC-147: 根を取ったら「もう一度挑む」が出る
  if (fromTree) renderRevivePicks(document.getElementById("gameOverPicks"), { adviceNodes: suggest(state.lastRunStats?.analysis?.sum)?.nodes ?? [], onBought: () => onBackFromTree({ bought: 1 }) });   // SPEC-155
  const btn = document.getElementById("gameOverRetry");
  btn?.classList.remove("gameover-modal__again--pulse"); void btn?.offsetWidth;
  btn?.classList.add("gameover-modal__again--pulse");
  modal.classList.add("gameover-modal--navi");
  naviSay(naviLines("afterTree", { bought }), { place: "result" });
}

let _reviving = false;   // SPEC-150: 集まっている 1.5 秒のあいだに 2 度押されても 1 回
export async function applyRetry() {
  if (_reviving) return;
  _reviving = true;
  try {
    clearTimeout(_showTimer);
    _hideWatch();
    document.getElementById("gameOverModal")?.classList.add("hidden");
    naviHide();   // SPEC-116
    const sunk = await _reviveSink();   // SPEC-151: 渦が下へ吸い込まれてから
    resumeTime();
    state.currentStageIdx = 0;       // SPEC-030: リトライは常にステージ 1 から
    // 循環 import 回避のため動的に startBattle を取得
    const m = await import("./index.js");
    m.startBattle(state.ownedHero);
    if (sunk) await _reviveRain();   // SPEC-151: ステージの真ん中に上から降りこんで姿になる
  } finally { _reviving = false; }
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;

  // SPEC-037: 「今のレギュレーションで再走」 (= 既存 retry の挙動と同じ)。 SPEC-146: NORMAL は「もう一度挑む」。 SPEC-150: 「復活する」 (= 王妃の黄金時計の絵つき)
  const retryBtn = document.getElementById("gameOverRetry");
  retryBtn?.addEventListener("click", applyRetry);
  const clock = retryBtn?.querySelector("img");
  if (clock) clock.src = img(`Image/Extensions/${REVIVE_EXT_ID}.png`);

  // SPEC-037: 「タイトルに戻る」 — 戦闘停止 / state リセットして title 画面へ
  document.getElementById("gameOverToTitle")
    ?.addEventListener("click", returnToTitle);
  // SPEC-153: 「くわしく」で内訳と分析を開く (= ふだんは畳んで、 スクロールせずに「復活する」まで見せる)
  document.getElementById("gameOverMore")?.addEventListener("click", () => {
    const body = document.getElementById("gameOverMoreBody");
    const btn = document.getElementById("gameOverMore");
    const open = body?.classList.toggle("hidden") === false;
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
    btn?.classList.toggle("result-more--open", open);
  });

  document.getElementById("gameOverSubmit")
    ?.addEventListener("click", _onSubmitClick);

  onLangChange(() => {
    if (!document.getElementById("gameOverModal")?.classList.contains("hidden")) {
      _renderGameOverModal();
    }
  });
}

/** ゲームオーバー・活動レポートから「タイトルに戻る」 (= SPEC-037。 SPEC-052 で活動レポートからも呼ぶ) */
/** タイトルへ戻す。 navi: タイトルのセリフを言わせるか (= SPEC-093。 すぐスキルツリーを開くときは false) */
export async function returnToTitle({ navi = true } = {}) {
  startTitleBgm();   // SPEC-069: タイトルの曲 (= craft.mp3)。 押した操作の中で替える (= 下の await のあとだと iOS で止められる)
  clearTimeout(_showTimer);
  _hideWatch();      // SPEC-151
  clearReviveFx();   // SPEC-150
  removeConfetti();  // SPEC-149
  document.getElementById("gameOverModal")?.classList.add("hidden");
  // 全 modal close
  for (const id of ["levelUpModal", "stageTransitionModal", "activityReportModal", "rankingModal"]) {
    document.getElementById(id)?.classList.add("hidden");
  }
  hideShop();   // SPEC-109
  hideMissionUi();   // SPEC-112
  // pauseFlags を 0 にリセット (= タイトル画面では時間停止扱い)
  while (state.pauseFlags > 0) resumeTime();
  resetResumeCountdown();   // SPEC-104: 数えている途中なら消す
  // 戦闘停止 (= BGM は上で タイトルの曲に替えた)
  const m = await import("./index.js");
  m.stopBattle?.();
  // run / hero / regulation を reset
  state.currentStageIdx = 0;
  state.ownedHero       = null;
  state.pendingHeroPick = null;
  state.stats.hp        = state.statsMax.hp;
  state.level           = 1;
  state.xp              = 0;
  state.killCount       = 0;
  state.lastRunStats    = null;
  state.shop            = null;   // SPEC-109
  state.mission         = null;   // SPEC-112
  state.run.stages.length = 0;
  state.run.totalKills    = 0;
  state.run.totalElapsedMs = 0;
  // owned hero badge を消す
  const badge = document.getElementById("ownedHeroBadge");
  if (badge) { badge.classList.add("hidden"); badge.textContent = ""; }
  // app を隠して title 表示 (= regulation は state.regulation のまま、 mode select で再選択)
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("titleScreen")?.classList.remove("hidden");
  setChatVisible(true);   // SPEC-091
  if (navi) naviTitle({ greet: false });   // SPEC-056
  else naviHide();
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

/** SPEC-147: EASY で倒れたら、 根 (= 覚醒) を取るまで「もう一度挑む」を出さず、 スキルツリーへ誘う */
export function easyRetryGate() {
  const again = document.getElementById("gameOverRetry");
  const tree = document.getElementById("gameOverSkillTree");
  const gate = isEasy() && !owns(getMeta(), ROOT_ID);
  again?.classList.toggle("hidden", gate);
  tree?.classList.toggle("gameover-modal__again--pulse", gate);
}

function _renderGameOverModal() {
  const again = document.getElementById("gameOverRetry");
  if (again) { const sp = again.querySelector("span"); if (sp) sp.textContent = retryLabel(); else again.textContent = retryLabel(); }   // SPEC-146 / SPEC-150
  easyRetryGate();   // SPEC-147
  const stats = state.lastRunStats;
  if (!stats) return;
  // SPEC-027: ボス撃破 / 5 分耐久 はクリア表記、 死亡は従来通りゲームオーバー
  const titleEl = document.getElementById("gameOverTitle");
  if (titleEl) {
    titleEl.textContent = (stats.reason === "clear")
      ? t("gameover.titleClear", "Clear!")
      : t("gameover.title", "REVIVE");   // SPEC-150 → 作者の決定 2026-10-21: 「力尽きた」は出さない (= 気落ちさせない)
    // SPEC-058: 英字の小見出しも結果に合わせる
    titleEl.dataset.kicker = (stats.reason === "clear") ? "ALL CLEAR" : "";   // 見出しそのものが REVIVE
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
                     { n: String(n), total: String(stageCount()) });   // SPEC-154
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
