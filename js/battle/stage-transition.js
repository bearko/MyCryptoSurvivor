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
import { STAGE_TABLE, SFX } from "../constants.js";
import { playSe } from "../audio.js";   // SPEC-158: 勝利の SE
import { triggerGameOver } from "./gameover.js";
import { triggerActivityReport } from "./activity-report.js";
import { t, tpl, onLangChange, getLang } from "../i18n.js";
import { reportStageEnd, reportRtaStageEnd } from "../platform.js";
import { formatElapsed } from "../survival.js";
import { countUp, revealIn } from "../reveal.js";
import { presentResult } from "../result-telop.js";
import { grantBossDust, grantStageGum, getMeta } from "../meta.js";
import { owns } from "../skill-logic.js";   // SPEC-154
import { ROOT_ID } from "../skill-data.js";   // SPEC-154
import { renderRewards, renderGumBreakdown } from "../meta-ui.js";
import { perk } from "../perks.js";   // SPEC-090c
import { pourShopCeIntoSig } from "./shop.js";   // SPEC-128
import { heroImg } from "../heroes.js";
import { loadShare, shouldOfferShare, openSharePrompt, closeSharePrompt } from "../share-x.js";   // SPEC-143
import { isEasy, stageCount } from "../easy.js";   // SPEC-147 / SPEC-154
import { showLesson } from "../lesson.js";   // SPEC-147
import { stopVoice } from "../voice.js";   // SPEC-149: 説明の途中でボスを倒したら、 ボイスを切ってクリアの SE
import { startConfetti, removeConfetti } from "../confetti.js";   // SPEC-149

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
/** SPEC-143: 結果が出そろうまで待つ */
const SHARE_DELAY_MS = 1600;
let _shareTimer = 0;

export function triggerStageEndOrTransition() {
  if (state.battle.gameOver) return;
  stopVoice();   // SPEC-149: レッスンの読み上げが残っていても、 クリアの演出を優先する

  // SPEC-033: 終了直前にステージ snapshot を保存 (= activity report 用)
  _captureStageSnapshot();
  // SPEC-090: ボスを倒したらゴールドダスト (= 5:00 まで耐えたときは出ない)。 snapshot に控えて結果の画面に出す
  if (state.battle.bossDefeated) {
    const snap = state.run.stages.find(s => s.idx === (state.currentStageIdx ?? 0));
    if (snap && snap.dust == null) snap.dust = state.battle.bossChestDust ?? grantBossDust(state.currentStageIdx ?? 0, { bonus: perk("bossDust") });   // SPEC-090c: 金運。 SPEC-153: 宝箱で足していればその値
  }
  // SPEC-132: ステージクリアの GUM (= 50 × ステージの番号 ＋ 撃破数のぶん)。 結果の画面とスキルツリーへの導線のため、 ここで足す
  {
    const snap = state.run.stages.find(s => s.idx === (state.currentStageIdx ?? 0));
    if (snap && snap.gum == null) {
      // SPEC-136: 内訳 (= 生存時間・撃破数・ステージクリア) を控えて、 結果の画面に式で出す
      const r = grantStageGum(snap, { gumMul: perk("gumMul") });
      Object.assign(snap, { gum: r.gum, gumRows: r.rows, gumBonus: r.bonus, gumMul: r.mul });
    }
  }

  // SPEC-039 / SPEC-096: 共通基盤のアチーブメント (= ステージ 1・2・全クリア・ファオ・ボス 3 体・RTA・ABSOLUTE ×2.0)
  const endIdx = state.currentStageIdx ?? 0;
  if (!isEasy()) reportStageEnd(endIdx, STAGE_TABLE.length, {   // SPEC-147: EASY は共通基盤に送らない
    bossDefeated: !!state.battle.bossDefeated,
    bossEnemyId: STAGE_TABLE[endIdx]?.bossEnemyId ?? null,
    stages: state.run.stages,
    rtaMode: !!state.rtaMode,
    regulation: state.regulation,
    absolute: state.absolute,
  });
  // SPEC-040: RTA の区切り (= RTA で始めた run だけ。 IGT は各ステージのゲーム内時間の合計)
  if (state.rtaMode && !isEasy()) reportRtaStageEnd(state.currentStageIdx ?? 0, STAGE_TABLE.length, state.run.totalElapsedMs);

  const isLast = (state.currentStageIdx ?? 0) >= stageCount() - 1;   // SPEC-154: EASY は 2 ステージ
  if (isLast) {
    // SPEC-033: 全ステージクリア → activity report (= 既存 gameover modal を置換)
    state.battle.gameOver = true;
    triggerActivityReport();
    return;
  }

  state.battle.gameOver = true;   // ループ tick の重複 trigger 防止 (= 既存規約)
  // SPEC-128: 残った CE を固有スキルへ (= 次のステージへは持ち越さない。 ギフト券は持ち越す)
  const endSnap = state.run.stages.find(s => s.idx === endIdx);
  if (state.shop && endSnap && endSnap.sigPour === undefined) endSnap.sigPour = pourShopCeIntoSig();
  pauseTime();
  _wireOnce();
  _renderTransitionModal();
  const modal = document.getElementById("stageTransitionModal");
  modal?.classList.remove("hidden");
  playSe(SFX.STAGE_CLEAR, 0, 0.7);   // SPEC-158: NODE CLEAR の帯が出る瞬間に勝利の SE (= ボスを倒した音のあと)
  // SPEC-058: テロップ (= 斜めの帯とヒーロー・マインちゃん) のあと、 SPEC-046: 上から順に出し、 撃破数を数え上げる
  const snap = state.run.stages.find(s => s.idx === (state.currentStageIdx ?? 0));
  presentResult(modal, "clear", {
    heroId: state.ownedHero?.heroId ?? null,
    then: () => {
      revealIn(modal);
      countUp(document.getElementById("stageTransitionKills"), snap?.kills ?? 0, { durMs: 600, delayMs: 250 });
      renderRewards(document.getElementById("stageTransitionRewards"), { gum: snap?.gum ?? 0, dust: snap?.dust ?? 0 }, { delayMs: 500 });   // SPEC-090 + SPEC-132
      renderGumBreakdown(document.getElementById("stageTransitionGum"), { rows: snap?.gumRows ?? [], bonus: snap?.gumBonus ?? 0, mul: snap?.gumMul ?? 0 });   // SPEC-136
      startConfetti();   // SPEC-149: 紙吹雪 (= マイクリの金宝箱の演出)
      if (isEasy() && endIdx === 0) showLesson("s1.clear");   // SPEC-147
      // SPEC-143: ステージ 1 のクリアで、 マインちゃんが X での投稿をすすめる (= 結果が出そろってから重ねる。 EASY では出さない)
      if (!isEasy() && shouldOfferShare(loadShare(), { stageIdx: endIdx, rta: !!state.rtaMode })) {
        clearTimeout(_shareTimer);
        _shareTimer = setTimeout(() => { if (!modal?.classList.contains("hidden")) openSharePrompt(); }, SHARE_DELAY_MS);
      }
    },
  });
}


/**
 * 「次のステージへ」 click → state.currentStageIdx++ → startBattle 再呼出
 */
async function _onProceedClick() {
  clearTimeout(_shareTimer);   // SPEC-143
  removeConfetti();   // SPEC-149
  closeSharePrompt();
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
  // SPEC-158: 「くわしく」で内訳を開く (= SPEC-153 の REVIVE と同じ。 PC では CSS が左の列に常に出す)
  document.getElementById("stageTransitionMore")?.addEventListener("click", () => {
    const body = document.getElementById("stageTransitionMoreBody");
    const btn = document.getElementById("stageTransitionMore");
    const open = body?.classList.toggle("hidden") === false;
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
    btn?.classList.toggle("result-more--open", open);
  });
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
  // SPEC-147: EASY のステージ 1 ではスキルツリーを開かない (= 倒れて根を取るまで)。 SPEC-154: 根を取ってあれば (= 復活のあと) 開ける
  const treeBtn = document.getElementById("stageTransitionSkillTree");
  const treeLock = document.getElementById("stageTransitionTreeLock");
  const lockTree = isEasy() && !owns(getMeta(), ROOT_ID);
  treeBtn?.classList.toggle("hidden", lockTree);
  if (treeLock) { treeLock.classList.toggle("hidden", !lockTree); treeLock.textContent = t("tree.lockedEasy", "🔒 スキルツリーはステージ 2 で開く"); }
  const next      = idx + 1 < stageCount() ? STAGE_TABLE[idx + 1] : null;   // SPEC-154
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
  const snap = state.run.stages.find(s => s.idx === idx);
  _renderSigPour(snap?.sigPour ?? null);
  // SPEC-158: 1 行の小さな字 (= 撃破数は then で数え上げる)
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("stageTransitionElapsed", formatElapsed(Math.round((snap?.elapsedMs ?? 0) / 1000)));
  set("stageTransitionKills", String(snap?.kills ?? 0));
  set("stageTransitionLevel", `Lv.${snap?.level ?? 1}`);
  // 「くわしく」は毎回畳む
  document.getElementById("stageTransitionMoreBody")?.classList.add("hidden");
  document.getElementById("stageTransitionMore")?.classList.remove("result-more--open");
  document.getElementById("stageTransitionMore")?.setAttribute("aria-expanded", "false");
}

/** SPEC-128: 「残った CE ◆9273 → テスラコイル Lv 5 → 7」 (= ショップで遊んでいないとき・CE が 0 のときは出さない) */
function _renderSigPour(r) {
  const el = document.getElementById("stageTransitionSig");
  if (!el) return;
  const hero = state.ownedHero;
  if (!r || !hero || r.ce <= 0) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  const name = hero.passive?.[getLang()] ?? hero.passive?.ja ?? "";
  const vars = { ce: String(r.ce), name, from: String(r.from), to: String(r.to), rest: String(r.rest ?? 0) };
  const up = r.to > r.from;
  let main, rest = "";
  if (r.from >= r.to && r.max) main = tpl(t("stage.sigPourMax", "{name} は最大（CE は次のステージへ持ち越さない）"), vars);
  else if (up) {
    main = tpl(t("stage.sigPour", "残った CE ◆{ce} → {name} Lv {from} → {to}"), vars);
    if (!r.max) rest = tpl(t("stage.sigPourRest", "次まで あと ◆{rest}"), vars);
  } else main = tpl(t("stage.sigPourSame", "残った CE ◆{ce} → {name} Lv {to}（次まで あと ◆{rest}）"), vars);
  el.classList.remove("hidden");
  el.classList.toggle("result-sigpour--up", up);
  el.innerHTML = "";
  const face = document.createElement("img");
  face.className = "result-sigpour__face";
  face.src = heroImg(hero.heroId);
  face.alt = "";
  const m = document.createElement("span");
  m.className = "result-sigpour__main";
  m.textContent = main;
  el.append(face, m);
  if (rest) {
    const r2 = document.createElement("span");
    r2.className = "result-sigpour__rest";
    r2.textContent = rest;
    el.appendChild(r2);
  }
}
