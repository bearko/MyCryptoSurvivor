// ============================================================
// battle/missions.js — ミッション (= SPEC-112)
// ============================================================
//
// ウェーブの途中に、 シャドーヒーローがミッションを持ちかける。 時間を止めて「受ける / 断る」を選ぶ
// (= 閉じたら SPEC-104 の 3 秒を数える)。 受けたら一定時間、 そのヒーローらしい厳しい条件がかかる。
// 最後まで生き残れば (= 追加の条件があればそれも) 達成。 失敗しても罰は無い。
// SPEC-125: 達成したら、 出し手がひとこと言い、 ごほうびを 3 つから 1 つ選ぶ (= ギフト券・力添え・HP 回復)。
// ショップで遊ぶときだけ (= 報酬がショップに効く)。 SPEC-111 で RTA でも出る。
//
// 効き目は missionMods() が返す倍率だけで、 戦闘の各所 (= 湧き・速さ・攻撃・大きさ・霧・弾・回復) が読む。
// ミッションが無いときは、 どれも効かない値 (= 1 / null / false)。
// pauseFlags 不変条件: 持ちかけ・ごほうびで pauseTime + 1、 選んだら resumeTime + 1。

import { state, pauseTime, resumeTime } from "../state.js";
import { img, SFX, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } from "../constants.js";
import { shopTimesMs } from "./shop-logic.js";
import { t, tpl, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";
import { applyItem, healBy } from "./field.js";   // SPEC-125: 力添え (= お助けアイテム)・HP 回復

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
 * weight: 軽 / 中 / 重 (= ごほうびの大きさ)。 boon: 達成したときの「力添え」 (= そのヒーローらしい一時的な強化かお助けアイテム。 SPEC-125)
 */
export const MISSIONS = [
  { id: "lubu",        giver: 481, durS: 25, weight: "heavy",  boon: "power",   mods: { spawnMul: 10 } },
  { id: "ripper",      giver: 767, durS: 30, weight: "medium", boon: "swift",   mods: { fogR: 180 }, heroId: 2003 },
  { id: "nobunaga",    giver: 450, durS: 30, weight: "medium", boon: "thunder", mods: { shooterOnly: true, shotMul: 3 } },
  { id: "cleopatra",   giver: 433, durS: 30, weight: "medium", boon: "magnet",  mods: { hiddenShots: true, shooterOnly: true } },
  { id: "shihuangdi",  giver: 468, durS: 40, weight: "medium", boon: "guard",   mods: { noHeal: true } },
  { id: "alexander",   giver: 463, durS: 30, weight: "medium", boon: "swift",   mods: { speedMul: 1.6 } },
  { id: "xiangyu",     giver: 893, durS: 20, weight: "heavy",  boon: "power",   mods: { dmgMul: 10 } },
  { id: "nightingale", giver: 495, durS: 20, weight: "light",  boon: "guard",   mods: {}, goal: { noHit: true } },
  { id: "napoleon",    giver: 445, durS: 30, weight: "light",  boon: "thunder", mods: {}, goal: { kills: 200 } },
  { id: "caocao",      giver: 467, durS: 30, weight: "light",  boon: "magnet",  mods: { sizeMul: 0.6, speedMul: 1.2 } },
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

/** SPEC-125: ごほうびの大きさ (= 重さで変わる)。 gifts: ギフト券の枚数・healRatio: 最大 HP の割合・boostS: 一時的な強化の秒数 */
export const REWARD_SIZE = {
  light:  { gifts: 1, healRatio: 0.3, boostS: 15 },
  medium: { gifts: 1, healRatio: 0.5, boostS: 20 },
  heavy:  { gifts: 2, healRatio: 1,   boostS: 30 },
};

/** SPEC-125: 力添えの中身。 timed: 一時的な強化 (= ステージの経過時間で数える)・item: お助けアイテムをその場で使う */
export const BOONS = {
  power:   { timed: true, dmgMul: 1.5 },          // 与えるダメージ ×1.5
  swift:   { timed: true, speedMul: 1.3 },        // 移動速度 ×1.3
  guard:   { timed: true, guard: true, secMul: 1 / 3 },   // 無敵 (= 長さは強化の 1/3)
  thunder: { item: "thunder" },                   // 雷鼓 (= 画面の敵に雷)
  magnet:  { item: "magnet" },                    // 棒磁石 (= 落ちている CE をすべて吸い寄せる)
};

/** SPEC-125: 選べるごほうび 3 つ (= ギフト券・力添え・HP 回復) */
export function rewardChoices(mission) {
  const size = REWARD_SIZE[mission?.weight] ?? REWARD_SIZE.medium;
  const boon = BOONS[mission?.boon] ? mission.boon : "power";
  const def = BOONS[boon];
  const sec = def.timed ? Math.round(size.boostS * (def.secMul ?? 1)) : 0;
  return [
    { kind: "gift", n: size.gifts },
    { kind: "boon", boon, sec },
    { kind: "heal", ratio: size.healRatio },
  ];
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

/** SPEC-125: いま効いている一時的な強化 (= 時間が過ぎていれば null) */
export function activeBoost() {
  const bo = state.mission?.boost;
  if (!bo || !state.battle) return null;
  return (state.battle.stageElapsedMs ?? 0) < bo.untilMs ? bo : null;
}

/** SPEC-125: 力添えの倍率 (= damage.js・player.js が読む) */
export function boostDmgMul() {
  const bo = activeBoost();
  return bo ? (BOONS[bo.boon]?.dmgMul ?? 1) : 1;
}
export function boostSpeedMul() {
  const bo = activeBoost();
  return bo ? (BOONS[bo.boon]?.speedMul ?? 1) : 1;
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

  if (m.boost && !activeBoost()) { m.boost = null; _renderBar(); }
  else if (m.boost && !m.active) _renderBar();

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
  _renderBar();
  if (res === "clear") {
    playSe(SFX.GAME_OVER_CLEAR, 100, 0.45);
    _openReward(mission);   // SPEC-125: 出し手のひとこと → ごほうびを選ぶ
  } else {
    _showResult(mission, res);
  }
}

let _reward = null;   // ごほうびを選んでいるミッション

function _openReward(mission) {
  if (!mission || _reward) return;
  _reward = mission;
  _wireOnce();
  pauseTime();
  _renderReward();
  document.getElementById("missionReward")?.classList.remove("hidden");
}

/** SPEC-125: ごほうびを選ぶ (= 0: ギフト券 / 1: 力添え / 2: HP 回復) */
export function pickReward(idx) {
  const mission = _reward;
  if (!mission) return;
  const choice = rewardChoices(mission)[idx];
  if (!choice) return;
  _reward = null;
  document.getElementById("missionReward")?.classList.add("hidden");
  resumeTime();   // SPEC-104: 閉じたら 3 秒数えてから
  applyReward(choice, mission);
  playSe(SFX.LEVEL_UP, 100, 0.45);
}

/** ごほうびを渡す (= 時間が動き出してから。 アイテムの演出が見えるように) */
export function applyReward(choice, mission) {
  const s = state.shop;
  if (!choice) return;
  if (choice.kind === "gift") { if (s) s.gifts += choice.n; return; }
  if (choice.kind === "heal") { healBy(choice.ratio); return; }
  if (choice.kind === "boon") {
    const def = BOONS[choice.boon];
    if (def?.item) { applyItem(def.item); return; }
    if (!def?.timed || !state.mission) return;
    const now = state.battle?.stageElapsedMs ?? 0;
    state.mission.boost = { boon: choice.boon, giver: mission?.giver, sec: choice.sec, untilMs: now + choice.sec * 1000 };
    if (def.guard && state.battle) state.battle.contactCooldownMs = Math.max(state.battle.contactCooldownMs ?? 0, choice.sec * 1000);   // 無敵は被弾のあとの無敵と同じしくみ (= 点滅も同じ)
    _renderBar();
  }
}

/** ごほうびの名前と中身 */
export function choiceText(c) {
  if (!c) return { name: "", detail: "" };
  if (c.kind === "gift") return {
    name: tpl(t("mission.reward.gift", "ギフト券 ×{n}"), { n: String(c.n) }),
    detail: t("mission.reward.giftDetail", "1 枚でショップの品が 1 つただ（Lv.4 まで）"),
  };
  if (c.kind === "heal") return {
    name: t("mission.reward.heal", "HP 回復"),
    detail: tpl(t("mission.reward.healDetail", "最大 HP の {n}% 回復"), { n: String(Math.round(c.ratio * 100)) }),
  };
  return {
    name: t(`mission.boon.${c.boon}`, c.boon),
    detail: tpl(t(`mission.boon.${c.boon}.detail`, ""), { n: String(c.sec) }),
  };
}

/** 持ちかけの「報酬」の欄 (= 3 つから選ぶ) */
export function rewardSummary(mission) {
  const [g, b, h] = rewardChoices(mission).map((c) => choiceText(c).name);
  return tpl(t("mission.reward.pick", "{a}・{b}・{c} から 1 つ"), { a: g, b, c: h });
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
  set("missionOfferReward", rewardSummary(mission));
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
  const bo = a ? null : activeBoost();   // SPEC-125: ミッションが無いあいだは力添えの残りを出す
  hud?.classList.toggle("hud--mission", !!(a || bo));
  if (!bar) return;
  bar.classList.toggle("mission-bar--boost", !!bo);
  if (bo) { _renderBoostBar(bar, bo); return; }
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

/** SPEC-125: 力添えの残り (= 帯は同じ。 顔は出し手、 名前は力添え) */
function _renderBoostBar(bar, bo) {
  const remain = Math.max(0, bo.untilMs - (state.battle.stageElapsedMs ?? 0));
  const total = Math.max(1, bo.sec * 1000);
  const sec = Math.ceil(remain / 1000);
  const key = `boost|${bo.boon}|${sec}|${Math.round((remain / total) * 100)}`;
  if (key === _barKey) return;
  _barKey = key;
  bar.classList.remove("hidden");
  const face = document.getElementById("missionBarFace");
  const fid = `boost${bo.giver}`;
  if (face && face.dataset.id !== fid) { face.dataset.id = fid; face.src = img(`Image/Enemies/${bo.giver}.png`); }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("missionBarTitle", t(`mission.boon.${bo.boon}`, bo.boon));
  set("missionBarGoal", t("mission.bar.boost", "力添え"));
  set("missionBarSec", tpl(t("mission.time", "{n} 秒"), { n: String(sec) }));
  const fill = bar.querySelector(".mission-bar__fill");
  if (fill) fill.style.width = ((remain / total) * 100).toFixed(1) + "%";
  bar.classList.remove("mission-bar--soon");
}

function _renderReward() {
  const mission = _reward;
  if (!mission) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const face = document.getElementById("missionRewardFace");
  if (face) face.src = _face(mission);
  set("missionRewardGiver", t(`mission.${mission.id}.giver`, mission.id));
  set("missionRewardMission", tpl(t("mission.rewardDone", "「{title}」達成"), { title: t(`mission.${mission.id}.title`, mission.id) }));
  set("missionRewardLine", t(`mission.${mission.id}.thanks`, ""));
  const w = document.getElementById("missionReward");
  if (w) w.dataset.weight = mission.weight;
  const box = document.getElementById("missionRewardChoices");
  if (!box) return;
  box.innerHTML = "";
  const icons = { gift: "🎟", heal: "♥", power: "⚔", swift: "👟", guard: "🛡", thunder: "⚡", magnet: "🧲" };
  rewardChoices(mission).forEach((c, i) => {
    const { name, detail } = choiceText(c);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mission-reward__choice mission-reward__choice--${c.kind}`;
    btn.innerHTML = `<span class="mission-reward__icon"></span><span class="mission-reward__name"></span><span class="mission-reward__detail"></span><span class="mission-reward__key"></span>`;
    btn.querySelector(".mission-reward__icon").textContent = icons[c.kind === "boon" ? c.boon : c.kind] ?? "★";
    btn.querySelector(".mission-reward__name").textContent = name;
    btn.querySelector(".mission-reward__detail").textContent = detail;
    btn.querySelector(".mission-reward__key").textContent = String(i + 1);
    btn.addEventListener("click", () => pickReward(i));
    box.appendChild(btn);
  });
}

let _resultTimer = 0;
function _showResult(mission, res) {
  const el = document.getElementById("missionResult");
  if (!el) return;
  clearTimeout(_resultTimer);
  el.dataset.res = res;
  const set = (sel, v) => { const n = el.querySelector(sel); if (n) n.textContent = v; };
  set(".mission-result__head", t("mission.fail", "ミッション失敗……"));
  set(".mission-result__sub", t("mission.failSub", "罰はないよ。次のチャンスに！"));
  el.classList.remove("hidden", "mission-result--in");
  void el.offsetWidth;
  el.classList.add("mission-result--in");
  _resultTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

/** タイトルに戻る・ゲームオーバー・ステージの始まり (= 画面を消す。 pauseFlags は呼ぶ側がまとめて戻す) */
export function hideMissionUi() {
  _offer = null;
  _reward = null;
  _barKey = "";
  if (typeof document === "undefined") return;
  document.getElementById("missionOffer")?.classList.add("hidden");
  document.getElementById("missionReward")?.classList.add("hidden");
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
    if (_reward && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); pickReward(Number(e.key) - 1); return; }
    if (!_offer) return;
    if (e.key === "y" || e.key === "Y") { e.preventDefault(); acceptMission(); }
    else if (e.key === "n" || e.key === "N") { e.preventDefault(); declineMission(); }
  });
  onLangChange(() => { if (_offer) _renderOffer(); if (_reward) _renderReward(); _barKey = ""; _renderBar(); });
}

/** テスト・確かめ用 (= ?debug=1 の window から呼ぶ) */
export function debugOfferMission(id) {
  _openOffer(MISSION_MAP[id] ?? MISSIONS[0]);
}

/** SPEC-125: ごほうびの画面を確かめる (= window.__missionClear("lubu")) */
export function debugClearMission(id) {
  _openReward(MISSION_MAP[id] ?? MISSIONS[0]);
}
