// ============================================================
// battle/missions.js — ミッション (= SPEC-112)
// ============================================================
//
// ウェーブの途中に、 シャドーヒーローがミッションを持ちかける。 時間を止めて「受ける / 断る」を選ぶ
// (= 閉じたら SPEC-104 の 3 秒を数える)。 受けたら一定時間、 そのヒーローらしい厳しい条件がかかる。
// 最後まで生き残れば (= 追加の条件があればそれも) 達成で報酬。 失敗しても罰は無い。
// ショップで遊ぶときだけ (= 報酬がショップに効く。 RTA では出さない)。
//
// 効き目は missionMods() が返す倍率だけで、 戦闘の各所 (= 湧き・速さ・攻撃・大きさ・霧・弾・回復) が読む。
// ミッションが無いときは、 どれも効かない値 (= 1 / null / false)。
// pauseFlags 不変条件: 持ちかけで pauseTime + 1、 選んだら resumeTime + 1。

import { state, pauseTime, resumeTime } from "../state.js";
import { img, SFX, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS, SHOP_STAGE_MUL } from "../constants.js";
import { shopTimesMs } from "./shop-logic.js";
import { t, tpl, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";
import { SIG_MAX_LEVEL } from "./signature.js";

// ============================================================
// 純関数 (= tests/missions.test.mjs)
// ============================================================

/** 1 ウェーブで持ちかけられる割合・1 ステージの上限・ウェーブの中で出る時刻 (= 店のあとの ms) */
export const MISSION_CHANCE = 0.4;
export const MISSION_PER_STAGE = 3;
export const MISSION_WINDOW_MS = [10000, 30000];
/** 次の店の直前・ボスの予告の前は出さない (= 終わるまでに予告が来ないように) */
export const MISSION_SHOP_GAP_MS = 10000;

/**
 * 出し手と中身 (= SPEC-103 7.4)。 giver: 絵 (= Image/Enemies/<id>.png のシャドーの姿)。 heroId: 同じ人をプレイ中なら出さない
 * weight: 軽 / 中 / 重 (= 報酬の重さ)。 reward: ce (= CE の大袋。 ステージの値段の倍率を掛ける) / gift / sig / ban
 */
export const MISSIONS = [
  { id: "lubu",        giver: 481, durS: 25, weight: "heavy",  reward: { sig: 1, ceIfMax: 150 }, mods: { spawnMul: 10 } },
  { id: "ripper",      giver: 767, durS: 30, weight: "medium", reward: { ce: 80 },  mods: { fogR: 180 }, heroId: 2003 },
  { id: "nobunaga",    giver: 450, durS: 30, weight: "medium", reward: { gift: 1 }, mods: { shooterOnly: true, shotMul: 3 } },
  { id: "cleopatra",   giver: 433, durS: 30, weight: "medium", reward: { ce: 80 },  mods: { hiddenShots: true, shooterOnly: true } },
  { id: "shihuangdi",  giver: 468, durS: 40, weight: "medium", reward: { ce: 80 },  mods: { noHeal: true } },
  { id: "alexander",   giver: 463, durS: 30, weight: "medium", reward: { gift: 1 }, mods: { speedMul: 1.6 } },
  { id: "xiangyu",     giver: 893, durS: 20, weight: "heavy",  reward: { sig: 1, ceIfMax: 150 }, mods: { dmgMul: 10 } },
  { id: "nightingale", giver: 495, durS: 20, weight: "light",  reward: { ce: 40 },  mods: {}, goal: { noHit: true } },
  { id: "napoleon",    giver: 445, durS: 30, weight: "light",  reward: { ce: 40 },  mods: {}, goal: { kills: 200 } },
  { id: "caocao",      giver: 467, durS: 30, weight: "light",  reward: { ban: 1 },  mods: { sizeMul: 0.6, speedMul: 1.2 } },
];
export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** 効かない値 (= ミッションが無いとき) */
export const NO_MODS = Object.freeze({ spawnMul: 1, speedMul: 1, dmgMul: 1, sizeMul: 1, fogR: null, shooterOnly: false, shotMul: 1, hiddenShots: false, noHeal: false });

/** そのミッションの効き目 (= 足りない項目は効かない値) */
export function modsOf(mission) {
  return { ...NO_MODS, ...(mission?.mods ?? {}) };
}

/** 持ちかける人を選ぶ (= 同じ人が続けて来ない・プレイ中のヒーローと同じ人は出さない) */
export function pickMission({ prevId = null, heroId = null, rnd = Math.random } = {}) {
  const pool = MISSIONS.filter((m) => m.id !== prevId && (m.heroId == null || m.heroId !== heroId));
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/**
 * そのウェーブで持ちかける時刻 (= ステージの経過 ms)。 持ちかけないなら null
 * waveIdx: そのステージで店を出た回数 (= 1 なら 1 回目の店のあと)。 rolls: [出すか, いつ]
 */
export function planOffer({ stageIdx, waveIdx, durS, count, rolls = [Math.random(), Math.random()] }) {
  if (waveIdx < 1 || count >= MISSION_PER_STAGE) return null;
  if (rolls[0] >= MISSION_CHANCE) return null;
  const times = shopTimesMs(stageIdx);
  const from = times[waveIdx - 1];
  const at = Math.round(from + MISSION_WINDOW_MS[0] + rolls[1] * (MISSION_WINDOW_MS[1] - MISSION_WINDOW_MS[0]));
  const next = times[waveIdx];   // 無ければ (= 最後の店のあと) ボスまで
  if (next != null && at > next - MISSION_SHOP_GAP_MS) return null;
  if (at + durS * 1000 > BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS) return null;
  return at;
}

/** 報酬の中身 (= CE はステージの値段の倍率を掛けて 5 の倍数に。 固有スキルが上がりきっていれば CE) */
export function rewardOf(mission, { stageIdx = 0, sigLevel = 1 } = {}) {
  const r = mission?.reward ?? {};
  const mul = SHOP_STAGE_MUL[Math.min(SHOP_STAGE_MUL.length - 1, Math.max(0, stageIdx | 0))];
  const ce = (v) => Math.max(5, Math.round((v * mul) / 5) * 5);
  if (r.sig) return sigLevel < SIG_MAX_LEVEL ? { sig: r.sig } : { ce: ce(r.ceIfMax ?? 150) };
  if (r.ce) return { ce: ce(r.ce) };
  if (r.gift) return { gift: r.gift };
  if (r.ban) return { ban: r.ban };
  return {};
}

/** 達成したか (= 時間が来た・倒した数) */
export function missionResult({ mission, remainMs, kills = 0, hit = false }) {
  const g = mission?.goal ?? {};
  if (g.noHit && hit) return "fail";
  if (g.kills && kills >= g.kills) return "clear";
  if (remainMs > 0) return null;
  if (g.kills && kills < g.kills) return "fail";
  return "clear";
}

// ============================================================
// 戦闘の中
// ============================================================

let _offer = null;   // 持ちかけ中のミッション
let _wired = false;

/** いま効いている倍率 (= 戦闘の各所が読む) */
export function missionMods() {
  const a = state.mission?.active;
  return a ? modsOf(MISSION_MAP[a.id]) : NO_MODS;
}

/** 回復してよいか (= 始皇帝の「不老不死の探求」のあいだは回復しない) */
export function canHeal() {
  return !missionMods().noHeal;
}

/** ステージの始まり (= battle/index.js の startBattle)。 ショップで遊ぶときだけ */
export function resetMissionsForStage(enabled) {
  hideMissionUi();
  if (!enabled) { state.mission = null; return; }
  const prev = state.mission?.prevId ?? null;
  state.mission = { prevId: prev, count: 0, wave: -1, planAt: null, planId: null, active: null };
}

/** 被弾したとき (= hurt.js)。 ナイチンゲールの「白衣の誓い」は 1 回でも当たると失敗 */
export function missionOnHurt() {
  const a = state.mission?.active;
  if (a) a.hit = true;
}

/** 毎フレーム (= battle/index.js の _step) */
export function tickMissions() {
  const m = state.mission;
  const b = state.battle;
  const s = state.shop;
  if (!m || !s || !b.active || b.gameOver) return;
  const now = b.stageElapsedMs ?? 0;
  const stageIdx = state.currentStageIdx ?? 0;

  if (m.active) {
    const a = m.active;
    const mission = MISSION_MAP[a.id];
    const res = b.bossSpawned ? "clear" : missionResult({ mission, remainMs: a.untilMs - now, kills: state.killCount - a.startKills, hit: a.hit });
    if (res) _finish(res);
    else _renderBar();
    return;
  }

  // 新しいウェーブ (= 店を出た) になったら、 このウェーブで持ちかけるかを決める
  if (m.wave !== s.nextIdx) {
    m.wave = s.nextIdx;
    const pick = pickMission({ prevId: m.prevId, heroId: state.ownedHero?.heroId });
    m.planId = pick?.id ?? null;
    m.planAt = pick ? planOffer({ stageIdx, waveIdx: s.nextIdx, durS: pick.durS, count: m.count }) : null;
  }
  if (m.planAt != null && now >= m.planAt && !b.bossSpawned) {
    const id = m.planId;
    m.planAt = null;
    _openOffer(MISSION_MAP[id]);
  }
}

function _openOffer(mission) {
  if (!mission || _offer) return;
  _offer = mission;
  _wireOnce();
  pauseTime();
  _renderOffer();
  document.getElementById("missionOffer")?.classList.remove("hidden");
  playSe(SFX.GIMMICK_WARN, 100, 0.5);
}

/** 受ける (= Y) */
export function acceptMission() {
  const mission = _offer;
  if (!mission) return;
  const m = state.mission;
  m.count += 1;
  m.prevId = mission.id;
  m.active = { id: mission.id, untilMs: (state.battle.stageElapsedMs ?? 0) + mission.durS * 1000, startKills: state.killCount, hit: false };
  _closeOffer();
  _renderBar();
  playSe(SFX.LEVEL_UP, 100, 0.45);
}

/** 断る (= N)。 何も起きない */
export function declineMission() {
  if (!_offer) return;
  state.mission.prevId = _offer.id;
  _closeOffer();
}

function _closeOffer() {
  _offer = null;
  document.getElementById("missionOffer")?.classList.add("hidden");
  resumeTime();   // SPEC-104: 閉じたら 3 秒数えてから
}

function _finish(res) {
  const m = state.mission;
  const a = m.active;
  m.active = null;
  const mission = MISSION_MAP[a.id];
  let reward = null;
  if (res === "clear") {
    reward = rewardOf(mission, { stageIdx: state.currentStageIdx ?? 0, sigLevel: state.shop?.sigLevel ?? 1 });
    _grant(reward);
    playSe(SFX.GAME_OVER_CLEAR, 100, 0.45);
  }
  _renderBar();
  _showResult(mission, res, reward);
}

function _grant(r) {
  const s = state.shop;
  if (!s || !r) return;
  if (r.ce) s.ce += r.ce;
  if (r.gift) s.gifts += r.gift;
  if (r.ban) s.bansLeft += r.ban;
  if (r.sig) s.sigLevel = Math.min(SIG_MAX_LEVEL, s.sigLevel + r.sig);
}

/** 報酬の文 */
export function rewardText(r) {
  if (!r) return "";
  if (r.sig) return tpl(t("mission.reward.sig", "固有スキル ＋{n} 段"), { n: String(r.sig) });
  if (r.ce) return tpl(t("mission.reward.ce", "CE ＋{n}"), { n: String(r.ce) });
  if (r.gift) return tpl(t("mission.reward.gift", "ギフト券 ×{n}"), { n: String(r.gift) });
  if (r.ban) return tpl(t("mission.reward.ban", "お断り ＋{n} 回"), { n: String(r.ban) });
  return "";
}

// ============================================================
// 画面
// ============================================================

function _face(mission) {
  return img(`Image/Enemies/${mission.giver}.png`);
}

function _renderOffer() {
  const mission = _offer;
  if (!mission) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const face = document.getElementById("missionOfferFace");
  if (face) face.src = _face(mission);
  set("missionOfferGiver", t(`mission.${mission.id}.giver`, mission.id));
  set("missionOfferTitle", t(`mission.${mission.id}.title`, mission.id));
  set("missionOfferDesc", t(`mission.${mission.id}.desc`, ""));
  set("missionOfferTime", tpl(t("mission.time", "{n} 秒"), { n: String(mission.durS) }));
  set("missionOfferGoal", mission.goal?.kills
    ? tpl(t("mission.goal.kills", "{n} 体倒す"), { n: String(mission.goal.kills) })
    : (mission.goal?.noHit ? t("mission.goal.noHit", "1 回も当たらない") : t("mission.goal.survive", "生き残る")));
  set("missionOfferReward", rewardText(rewardOf(mission, { stageIdx: state.currentStageIdx ?? 0, sigLevel: state.shop?.sigLevel ?? 1 })));
  const w = document.getElementById("missionOffer");
  if (w) w.dataset.weight = mission.weight;
  set("missionOfferWeight", t(`mission.weight.${mission.weight}`, mission.weight));
}

let _barKey = "";
/** HUD の下の段: 受けているミッションの残り時間と条件 */
function _renderBar() {
  const hud = document.getElementById("hud");
  const bar = document.getElementById("missionBar");
  const a = state.mission?.active;
  hud?.classList.toggle("hud--mission", !!a);
  if (!bar) return;
  if (!a) { bar.classList.add("hidden"); _barKey = ""; return; }
  const mission = MISSION_MAP[a.id];
  const remain = Math.max(0, a.untilMs - (state.battle.stageElapsedMs ?? 0));
  const sec = Math.ceil(remain / 1000);
  const kills = state.killCount - a.startKills;
  const key = `${a.id}|${sec}|${mission.goal?.kills ? kills : ""}|${a.hit}|${Math.round((remain / (mission.durS * 1000)) * 100)}`;
  if (key === _barKey) return;
  _barKey = key;
  bar.classList.remove("hidden");
  const face = document.getElementById("missionBarFace");
  if (face && face.dataset.id !== a.id) { face.dataset.id = a.id; face.src = _face(mission); }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("missionBarTitle", t(`mission.${a.id}.title`, a.id));
  set("missionBarGoal", mission.goal?.kills
    ? tpl(t("mission.bar.kills", "撃破 {n} / {goal}"), { n: String(Math.min(kills, mission.goal.kills)), goal: String(mission.goal.kills) })
    : (mission.goal?.noHit ? t("mission.goal.noHit", "1 回も当たらない") : t("mission.goal.survive", "生き残る")));
  set("missionBarSec", tpl(t("mission.time", "{n} 秒"), { n: String(sec) }));
  const fill = bar.querySelector(".mission-bar__fill");
  if (fill) fill.style.width = ((remain / (mission.durS * 1000)) * 100).toFixed(1) + "%";
  bar.classList.toggle("mission-bar--soon", sec <= 5);
}

let _resultTimer = 0;
function _showResult(mission, res, reward) {
  const el = document.getElementById("missionResult");
  if (!el) return;
  clearTimeout(_resultTimer);
  el.dataset.res = res;
  const set = (sel, v) => { const n = el.querySelector(sel); if (n) n.textContent = v; };
  set(".mission-result__head", res === "clear" ? t("mission.clear", "MISSION CLEAR!") : t("mission.fail", "ミッション失敗……"));
  set(".mission-result__sub", res === "clear"
    ? tpl(t("mission.clearSub", "{title} 達成 ・ {reward}"), { title: t(`mission.${mission.id}.title`, mission.id), reward: rewardText(reward) })
    : t("mission.failSub", "罰はないよ。次のチャンスに！"));
  el.classList.remove("hidden", "mission-result--in");
  void el.offsetWidth;
  el.classList.add("mission-result--in");
  _resultTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

/** タイトルに戻る・ゲームオーバー・ステージの始まり (= 画面を消す。 pauseFlags は呼ぶ側がまとめて戻す) */
export function hideMissionUi() {
  _offer = null;
  _barKey = "";
  if (typeof document === "undefined") return;
  document.getElementById("missionOffer")?.classList.add("hidden");
  document.getElementById("missionBar")?.classList.add("hidden");
  document.getElementById("missionResult")?.classList.add("hidden");
  document.getElementById("hud")?.classList.remove("hud--mission");
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  document.getElementById("missionAccept")?.addEventListener("click", acceptMission);
  document.getElementById("missionDecline")?.addEventListener("click", declineMission);
  document.addEventListener("keydown", (e) => {
    if (!_offer) return;
    if (e.key === "y" || e.key === "Y") { e.preventDefault(); acceptMission(); }
    else if (e.key === "n" || e.key === "N") { e.preventDefault(); declineMission(); }
  });
  onLangChange(() => { if (_offer) _renderOffer(); _barKey = ""; _renderBar(); });
}

/** テスト・確かめ用 (= ?debug=1 の window から呼ぶ) */
export function debugOfferMission(id) {
  _openOffer(MISSION_MAP[id] ?? MISSIONS[0]);
}
