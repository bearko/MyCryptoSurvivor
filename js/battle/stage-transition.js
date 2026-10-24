// ============================================================
// battle/stage-transition.js — ステージ間遷移モーダル (= SPEC-030)
// ============================================================
//
// ボス撃破 / 5 分耐久でステージ終了したとき:
//   - 次ステージあり → ステージ遷移モーダル (= 「次のステージへ」 ボタン)
//   - 次ステージなし (= 全ステージクリア) → 既存 triggerGameOver("clear") に委譲
//
// pauseFlags 不変条件: open で pauseTime + 1、 続行 click で resumeTime + 1。

import { addRewards } from "../meta.js";   // SPEC-165: 絆の報酬ラッシュの GUM
import { state, pauseTime, resumeTime } from "../state.js";
import { STAGE_TABLE, SFX } from "../constants.js";
import { playSe } from "../audio.js";   // SPEC-158: 勝利の SE
import { triggerGameOver } from "./gameover.js";
import { triggerActivityReport } from "./activity-report.js";
import { t, tpl, onLangChange, getLang } from "../i18n.js";
import { reportStageEnd, reportRtaStageEnd, reportStoryAllClear, reportTutorialStep } from "../platform.js";
import { formatElapsed } from "../survival.js";
import { countUp, revealIn } from "../reveal.js";
import { presentResult } from "../result-telop.js";
import { grantBossDust, grantStageGum, getMeta } from "../meta.js";
import { owns } from "../skill-logic.js";   // SPEC-154
import { ROOT_ID } from "../skill-data.js";   // SPEC-154
import { renderRewards, renderGumBreakdown } from "../meta-ui.js";
import { perk } from "../perks.js";   // SPEC-090c
import { heroImg } from "../heroes.js";
import { loadShare, shouldOfferShare, openSharePrompt, closeSharePrompt } from "../share-x.js";   // SPEC-143
import { isEasy, stageCount } from "../easy.js";   // SPEC-147 / SPEC-154
import { stopVoice } from "../voice.js";   // SPEC-149: 説明の途中でボスを倒したら、 ボイスを切ってクリアの SE
import { startConfetti, removeConfetti } from "../confetti.js";   // SPEC-149
import { isStory, storyStage, landOf, markStoryCleared, markStoryLoadout, STORY_HERO, nextStoryId, storyRecipe, storyAllows, nextInSameLand, storyAllCleared, tutorialStepOf } from "../story.js";   // SPEC-165
import { naviSay, naviLines } from "../navi.js";   // SPEC-165

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
      const bg = state.battle.story?.bondGum | 0;   // SPEC-165: 絆の報酬ラッシュの GUM (= 内訳に 1 行)
      if (bg > 0) { addRewards({ gum: bg }); snap.gum += bg; snap.gumRows = [...(snap.gumRows ?? []), { key: "bond", n: 1, rate: bg, gum: bg }]; }
    }
  }

  // SPEC-165: ストーリーは 1 ステージ完結 (= 進みを覚えて、 クリアの画面から次のステージかマップへ)
  if (isStory()) { _storyClear(); return; }

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
  // SPEC-128 → SPEC-162: 残った CE は固有スキルへ振らず、 装備と一緒に次のステージへ持ち越す (= 固有スキルは店で上げる)
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
/** 次のステージへ (= 「次のステージへ」のボタン。 SPEC-161: スキルツリーの「次のノードに挑む」からも。 ステージクリアの画面は隠したまま) */
export async function proceedToNextStage() {
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
const _onProceedClick = () => (isStory() ? proceedStory() : proceedToNextStage());

/** 作者 2026-10-22: この GUM が貯まっていたら、 クリアの画面でスキルツリーを促す */
export const TREE_NUDGE_GUM = 500;

/** SPEC-165: ストーリーのクリア (= 進みを覚え、 クリアの画面。 GUM はいままでどおり足す) */
function _storyClear() {
  const r = storyStage();
  const snap = state.run.stages.find((s) => s.idx === (state.currentStageIdx ?? 0));
  const progress = markStoryCleared(r.id, { sec: Math.round((snap?.elapsedMs ?? state.battle.stageElapsedMs ?? 0) / 1000), kills: snap?.kills ?? state.killCount });
  reportTutorialStep(tutorialStepOf(r.id));   // SPEC-174: チュートリアルの段 (= そのステージをクリア。 5-5 が "done")
  reportStoryAllClear(progress, storyAllCleared);   // SPEC-165: 全クリアで共通基盤のアチーブメント survivor.story (= 25 のときだけ中身がある)
  // 作者 2026-10-22: 持ち物 (= ヒーロー・装備・CE・固有スキルの段) はストーリーのあいだ残る。 タイトルに戻っても、 次のステージはここから
  markStoryLoadout({ hero: state.ownedHero?.heroId ?? STORY_HERO, owned: (state.ownedExtensions ?? []).map((o) => ({ extId: o.extId, level: o.level })), ce: state.shop?.ce ?? 0, sigLevel: state.shop?.sigLevel ?? 1, sigCe: state.shop?.sigCe ?? 0 });
  if (r.unlock === "hero:4006") import("../hero-unlock.js").then((H) => H.unlockEasyReward()).catch(() => {});   // SPEC-165: 3-1 でビリー・ザ・キッドが仲間に
  if (r.unlock === "mode:NORMAL") import("../easy.js").then((E) => E.markEasyCleared()).catch(() => {});   // SPEC-165: 5-5 で NORMAL が開く (= 「チュートリアルを終えた」の印。 mode-select が読む)
  state.battle.gameOver = true;
  if (r.scene) {   // SPEC-165 §3.z: プロローグ (= クリアの画面を出さず、 裂け目 → 暗転 → シーン → マップ)
    pauseTime();
    import("../story-map.js").then((m) => m.playRift(() => leaveStoryToMap()));
    return;
  }
  pauseTime();
  _wireOnce();
  _renderTransitionModal();
  const modal = document.getElementById("stageTransitionModal");
  const treeBtn = document.getElementById("stageTransitionSkillTree");
  treeBtn?.classList.remove("gameover-modal__again--pulse");
  modal?.classList.remove("hidden");
  playSe(SFX.STAGE_CLEAR, 0, 0.7);
  presentResult(modal, "clear", {
    heroId: state.ownedHero?.heroId ?? null,
    then: () => {
      revealIn(modal);
      countUp(document.getElementById("stageTransitionKills"), snap?.kills ?? 0, { durMs: 600, delayMs: 250 });
      // GUM は 1-3 から見せる (= 「貯まるけど何に使うかまだ分からない」)
      const show = !!r.showGum;
      document.getElementById("stageTransitionRewards")?.classList.toggle("hidden", !show);
      document.getElementById("stageTransitionMore")?.classList.toggle("hidden", !show);
      if (show) {
        renderRewards(document.getElementById("stageTransitionRewards"), { gum: snap?.gum ?? 0, dust: 0 }, { delayMs: 500 });
        renderGumBreakdown(document.getElementById("stageTransitionGum"), { rows: snap?.gumRows ?? [], bonus: snap?.gumBonus ?? 0, mul: snap?.gumMul ?? 0 });
      }
      startConfetti();
      // 作者 2026-10-22: GUM が貯まってきたら (= 500)、 クリアの一言のあとにスキルツリーを促し、 ボタンを光らせる
      const nudge = storyAllows("tree") && (getMeta().gum | 0) >= TREE_NUDGE_GUM;
      const lines = [...(r.lines?.clear ? naviLines("story", { key: r.lines.clear, pose: "hooray" }) : []), ...(nudge ? naviLines("story", { key: "story.treeNudge", pose: "pointer", vars: { gum: String(getMeta().gum | 0) } }) : [])];
      if (lines.length) { modal?.classList.add("gameover-modal--navi"); naviSay(lines, { place: "result" }); }
      treeBtn?.classList.toggle("gameover-modal__again--pulse", nudge);
    },
  });
}

/** SPEC-165: 次のステージへ (= 行が無ければマップへ) */
export async function proceedStory() {
  const next = nextStoryId(state.storyId);
  const m = await import("../story-map.js");
  removeConfetti();
  document.getElementById("stageTransitionModal")?.classList.add("hidden");
  resumeTime();
  if (next && storyRecipe(next) && nextInSameLand(state.storyId)) {   // 同じランド: 詳細の画面に戻って、 次の札が開き、 ヒーローが歩いていく (= 押すと飛ばせる)
    const cur = state.storyId;
    while (state.pauseFlags > 0) resumeTime();
    const b = await import("./index.js");
    b.stopBattle?.();
    document.getElementById("app")?.classList.add("hidden");
    m.travelToNext(cur, next);
    return;
  }
  leaveStoryToMap();   // ランドの最後: マップへ (= 靄が晴れて次のランドが現れるのを見る)
}
/** SPEC-165: 戦闘をやめてランドマップへ */
export async function leaveStoryToMap() {
  removeConfetti();
  document.getElementById("stageTransitionModal")?.classList.add("hidden");
  while (state.pauseFlags > 0) resumeTime();
  const b = await import("./index.js");
  b.stopBattle?.();
  document.getElementById("app")?.classList.add("hidden");
  const m = await import("../story-map.js");
  m.backToStoryMap();
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  document.getElementById("stageTransitionProceed")
    ?.addEventListener("click", _onProceedClick);
  document.getElementById("stageTransitionMap")?.addEventListener("click", () => leaveStoryToMap());   // SPEC-165
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
  const story = storyStage();   // SPEC-165
  const lockTree = story ? !storyAllows("tree") : (isEasy() && !owns(getMeta(), ROOT_ID));
  treeBtn?.classList.toggle("hidden", lockTree);
  if (treeLock) { treeLock.classList.toggle("hidden", !lockTree || !!story); treeLock.textContent = t("tree.lockedEasy", "🔒 スキルツリーはステージ 2 で開く"); }
  document.getElementById("stageTransitionMap")?.classList.toggle("hidden", !story);
  if (story) {
    // SPEC-165: 「1-2 オーシャン」・次は 1-3 (= 行が無ければ「つづきは準備中」)
    const nextId = nextStoryId(story.id);
    const land = landOf(story.id);
    if (titleEl) titleEl.textContent = t("story.clear.title", "ステージクリア!");
    const curEl = document.getElementById("stageTransitionCurrent");
    if (curEl) curEl.textContent = `${story.id}  ${t(`story.land.${land.id}`, land.id)} — ${t(`story.${story.id}.name`, "")}`;
    const sameLand = !!(nextId && storyRecipe(nextId)) && nextInSameLand(story.id);
    if (subEl) subEl.textContent = sameLand ? tpl(t("stage.proceedNext", "次は {next}"), { next: nextId }) : (nextId && storyRecipe(nextId) ? t("story.clear.landDone", "ランドを取り戻した！ マップへ戻ろう") : (story.unlock === "mode:NORMAL" ? t("story.clear.allDone", "ストーリー全クリア！ NORMAL が開いた") : t("story.clear.done", "ここまで！ つづきは準備中")));
    if (proceedEl) { proceedEl.textContent = t("story.map.next", "次のステージへ ▶"); proceedEl.classList.toggle("hidden", !sameLand); }   // ランドの最後は「マップへ」だけ
    const mapBtn = document.getElementById("stageTransitionMap"); if (mapBtn) mapBtn.textContent = story.unlock === "mode:NORMAL" ? t("story.clear.toModes", "モード選択へ ▶") : t("story.map.toMap", "マップへ");
    const snapS = state.run.stages.find((s) => s.idx === idx);
    const setS = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setS("stageTransitionElapsed", formatElapsed(Math.round((snapS?.elapsedMs ?? 0) / 1000)));
    setS("stageTransitionKills", String(snapS?.kills ?? 0));
    setS("stageTransitionLevel", `Lv.${snapS?.level ?? 1}`);
    document.getElementById("stageTransitionPips")?.replaceChildren();   // ステージの点は 1 つだけなので出さない
    document.getElementById("stageTransitionMoreBody")?.classList.add("hidden");
    document.getElementById("stageTransitionSig")?.classList.add("hidden");
    return;
  }
  const next      = idx + 1 < stageCount() ? STAGE_TABLE[idx + 1] : null;   // SPEC-154
  const cur       = STAGE_TABLE[idx];
  proceedEl?.classList.remove("hidden");

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
