// ============================================================
// battle/missions.js — ミッション (= SPEC-112)
// ============================================================
//
// ウェーブの途中に、 シャドーヒーローがミッションを持ちかける。 時間を止めて「受ける / 断る」を選ぶ
// (= 閉じたら SPEC-104 の 3 秒を数える)。 受けたら一定時間、 そのヒーローらしい厳しい条件がかかる。
// 最後まで生き残れば (= 追加の条件があればそれも) 達成。 失敗しても罰は無い。
// SPEC-125: 達成したら、 出し手がひとこと言い、 ごほうびを 3 つから 1 つ選ぶ (= ギフト券・力添え・HP 回復)。
// SPEC-137: 受けるときに難易度 (= ★1〜3) を選ぶ。 ★で条件が厳しくなり、 ごほうびも豪華に (= ギフト券は ★2 から。 ★1 は CE)。
//   帯の色も★で変わる (= いまの難易度が目に入るように)。 選んだ★は端末に覚えておく。
// ショップで遊ぶときだけ (= 報酬がショップに効く)。 SPEC-111 で RTA でも出る。
//
// 効き目は missionMods() が返す倍率だけで、 戦闘の各所 (= 湧き・速さ・攻撃・大きさ・霧・弾・回復) が読む。
// ミッションが無いときは、 どれも効かない値 (= 1 / null / false)。
// pauseFlags 不変条件: 持ちかけ・ごほうびで pauseTime + 1、 選んだら resumeTime + 1。

import { state, pauseTime, resumeTime } from "../state.js";
import { img, SFX, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } from "../constants.js";
import { shopTimesMs } from "./shop-logic.js";
import { shopAtStart } from "../perks.js";   // SPEC-152
import { t, tpl, onLangChange } from "../i18n.js";
import { playSe, setMissionSilence } from "../audio.js";
import { applyItem, healBy } from "./field.js";
import { SHOP_STAGE_MUL } from "../constants.js";
import { grantMissionGum, missionGum } from "../meta.js";   // SPEC-131: 達成の確定 GUM
import { ICON_GUM } from "../meta-ui.js";   // SPEC-125: 力添え (= お助けアイテム)・HP 回復
import { roundTo5 } from "./shop-logic.js";
import { naviTipModal } from "../navi-tips.js";   // SPEC-137: 初めてのミッションでマインちゃんが説明
import { naviHide } from "../navi.js";
import { setRichText } from "../rich-text.js";   // SPEC-144
import { easyStage, isEasy } from "../easy.js";   // SPEC-147
import { showLesson } from "../lesson.js";   // SPEC-147

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
 * boon: 達成したときの「力添え」 (= そのヒーローらしい一時的な強化かお助けアイテム。 SPEC-125)
 * SPEC-137: tiers は ★1・★2・★3 の中身 (= durS: 秒・mods: 効き目・goal: 追加の条件・n: 説明の数)
 */
const T = (durS, mods, extra = {}) => ({ durS, mods, ...extra });
export const MISSIONS = [
  { id: "lubu",        giver: 481, boon: "power",   tiers: [T(25, { spawnMul: 4 }, { n: 4 }), T(25, { spawnMul: 7 }, { n: 7 }), T(25, { spawnMul: 10 }, { n: 10 })] },
  { id: "ripper",      giver: 767, boon: "swift",   heroId: 2003,
    tiers: [T(30, { fogR: 240, fogA: 0.82 }), T(30, { fogR: 150, fogA: 0.92 }), T(30, { fogR: 70, fogA: 0.985 })] },
  { id: "nobunaga",    giver: 450, boon: "thunder", tiers: [T(30, { shooterOnly: true, shotMul: 2 }, { n: 2 }), T(30, { shooterOnly: true, shotMul: 3 }, { n: 3 }), T(30, { shooterOnly: true, shotMul: 5 }, { n: 5 })] },
  { id: "cleopatra",   giver: 433, boon: "magnet",  tiers: [T(20, { hiddenShots: true, shooterOnly: true }), T(30, { hiddenShots: true, shooterOnly: true }), T(40, { hiddenShots: true, shooterOnly: true, shotMul: 2 })] },
  { id: "shihuangdi",  giver: 468, boon: "guard",   tiers: [T(20, { noHeal: true }), T(35, { noHeal: true }), T(50, { noHeal: true })] },
  { id: "alexander",   giver: 463, boon: "swift",   tiers: [T(30, { speedMul: 1.3 }, { n: 1.3 }), T(30, { speedMul: 1.6 }, { n: 1.6 }), T(30, { speedMul: 2 }, { n: 2 })] },
  { id: "xiangyu",     giver: 893, boon: "power",   tiers: [T(20, { dmgMul: 3 }, { n: 3 }), T(20, { dmgMul: 6 }, { n: 6 }), T(20, { dmgMul: 10 }, { n: 10 })] },
  { id: "nightingale", giver: 495, boon: "guard",   tiers: [T(10, {}, { goal: { noHit: true } }), T(20, {}, { goal: { noHit: true } }), T(30, {}, { goal: { noHit: true } })] },
  { id: "napoleon",    giver: 445, boon: "thunder", tiers: [T(30, {}, { goal: { kills: 100 }, n: 100 }), T(30, {}, { goal: { kills: 200 }, n: 200 }), T(30, {}, { goal: { kills: 350 }, n: 350 })] },
  // SPEC-138: 風林火山 (= 風: 敵の足が速い・林: 音が消える・火: 敵が増える・山: 動けない)。 ★で対象が広がり、 すべて同時に効く
  { id: "shingen",     giver: 519, boon: "guard",
    tiers: [T(30, { speedMul: 1.4, silent: true }), T(30, { speedMul: 1.4, silent: true, spawnMul: 3 }), T(20, { speedMul: 1.4, silent: true, spawnMul: 3, noMove: true })] },
  { id: "caocao",      giver: 467, boon: "magnet",  tiers: [T(30, { sizeMul: 0.8, speedMul: 1.1 }), T(30, { sizeMul: 0.6, speedMul: 1.2 }), T(30, { sizeMul: 0.45, speedMul: 1.4 })] },
];
export const MISSION_MAP = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** SPEC-137: 難易度 (= ★の数) */
export const STARS = [1, 2, 3];
export const STAR_KEY = "mcs.missionStar";
export function clampStar(star) {
  const n = Math.round(Number(star));
  return n >= 1 && n <= 3 ? n : 1;
}
/** その★の中身 (= 秒・効き目・条件) */
export function tierOf(mission, star = 1) {
  return mission?.tiers?.[clampStar(star) - 1] ?? { durS: 30, mods: {} };
}
/** いちばん長い秒 (= 持ちかける時刻を決めるとき。 どの★を選んでもボスの予告に重ならない) */
export function maxDurS(mission) {
  return Math.max(...(mission?.tiers ?? [{ durS: 30 }]).map((x) => x.durS));
}
/** 前に選んだ★ (= 初めては ★1) */
export function loadStar(storage = globalThis.localStorage) {
  try { return clampStar(storage?.getItem(STAR_KEY) ?? 1); } catch { return 1; }
}
export function saveStar(star, storage = globalThis.localStorage) {
  try { storage?.setItem(STAR_KEY, String(clampStar(star))); } catch { /* 覚えられなくても、 この挑戦では効く */ }
}

/** 効かない値 (= ミッションが無いとき) */
export const NO_MODS = Object.freeze({ spawnMul: 1, speedMul: 1, dmgMul: 1, sizeMul: 1, fogR: null, fogA: null, shooterOnly: false, shotMul: 1, hiddenShots: false, noHeal: false, silent: false, noMove: false });

/** そのミッションの効き目 (= 足りない項目は効かない値) */
export function modsOf(mission, star = 1) {
  return { ...NO_MODS, ...(mission ? tierOf(mission, star).mods : {}) };
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
  const times = shopTimesMs(stageIdx, { atStart: shopAtStart() });   // SPEC-152
  const from = times[waveIdx - 1];
  const at = Math.round(from + MISSION_WINDOW_MS[0] + rolls[1] * (MISSION_WINDOW_MS[1] - MISSION_WINDOW_MS[0]));
  const next = times[waveIdx];   // 無ければ (= 最後の店のあと) ボスまで
  if (next != null && at > next - MISSION_SHOP_GAP_MS) return null;
  if (at + durS * 1000 > BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS) return null;
  return at;
}

/**
 * SPEC-125: ごほうびの大きさ。 SPEC-137: ★で変わる (= ギフト券は ★2 から。 ★1 は CE で、 ステージの値段の倍率が掛かる)
 *   gifts: ギフト券の枚数・ce: CE (= ステージ 1 の量)・healRatio: 最大 HP の割合・boostS: 一時的な強化の秒数
 */
export const REWARD_SIZE = {
  1: { gifts: 0, ce: 300, healRatio: 0.3, boostS: 15 },
  2: { gifts: 1, ce: 0,   healRatio: 0.5, boostS: 20 },
  3: { gifts: 2, ce: 0,   healRatio: 1,   boostS: 30 },
};

/** SPEC-125: 力添えの中身。 timed: 一時的な強化 (= ステージの経過時間で数える)・item: お助けアイテムをその場で使う */
export const BOONS = {
  power:   { timed: true, dmgMul: 1.5 },          // 与えるダメージ ×1.5
  swift:   { timed: true, speedMul: 1.3 },        // 移動速度 ×1.3
  guard:   { timed: true, guard: true, secMul: 1 / 3 },   // 無敵 (= 長さは強化の 1/3)
  thunder: { item: "thunder" },                   // 雷鼓 (= 画面の敵に雷)
  magnet:  { item: "magnet" },                    // 棒磁石 (= 落ちている CE をすべて吸い寄せる)
};

/** SPEC-125: 選べるごほうび 3 つ (= ギフト券・力添え・HP 回復)。 SPEC-137: ★1 はギフト券の代わりに CE */
export function rewardChoices(mission, star = 1, stageIdx = 0) {
  const size = REWARD_SIZE[clampStar(star)];
  const boon = BOONS[mission?.boon] ? mission.boon : "power";
  const def = BOONS[boon];
  const sec = def.timed ? Math.round(size.boostS * (def.secMul ?? 1)) : 0;
  const mul = SHOP_STAGE_MUL[Math.min(SHOP_STAGE_MUL.length - 1, Math.max(0, stageIdx | 0))];
  return [
    size.gifts > 0 ? { kind: "gift", n: size.gifts } : { kind: "ce", n: roundTo5(size.ce * mul) },
    { kind: "boon", boon, sec },
    { kind: "heal", ratio: size.healRatio },
  ];
}

/** 達成したか (= 時間が来た・倒した数) */
export function missionResult({ mission, star = 1, remainMs, kills = 0, hit = false }) {
  const g = tierOf(mission, star).goal ?? {};
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
  return a ? modsOf(MISSION_MAP[a.id], a.star) : NO_MODS;
}

/** SPEC-138: 動けるか (= 信玄の「山」のあいだは動けない。 player.js が読む) */
export function canMove() {
  return !missionMods().noMove;
}

/** SPEC-138: 信玄の「林」のあいだは BGM と効果音を消す (= 終われば戻す) */
function _syncSilence() {
  setMissionSilence(!!missionMods().silent);
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
  hideMissionUi();   // SPEC-138: 音も戻す
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

  _syncSilence();
  if (m.active) {
    const a = m.active;
    const mission = MISSION_MAP[a.id];
    const res = b.bossSpawned ? "clear" : missionResult({ mission, star: a.star, remainMs: a.untilMs - now, kills: state.killCount - a.startKills, hit: a.hit });
    if (res) _finish(res);
    else _renderBar();
    return;
  }

  // SPEC-147: EASY は決まった時刻に 1 回だけ (= ステージ 2。 ★1・短め)。 ほかのステージでは出さない
  const ez = easyStage();
  if (ez && !ez.missionFree) {   // SPEC-165: missionFree なら本番と同じ持ちかけ
    if (ez.missionAtMs != null && !m.easyDone && now >= ez.missionAtMs && !b.bossSpawned) {
      m.easyDone = true;
      _openOffer(MISSION_MAP[ez.missionId ?? "alexander"] ?? MISSION_MAP.alexander, { star: ez.missionStar ?? 1, durS: ez.missionDurS ?? 20, must: !!ez.missionMust });   // SPEC-165: ストーリーは相手も★も決め打ち
      state.battle?.story?.events?.push("missionOffer");
    }
    return;
  }
  // 新しいウェーブ (= 店を出た) になったら、 このウェーブで持ちかけるかを決める
  if (m.wave !== s.nextIdx) {
    m.wave = s.nextIdx;
    const pick = pickMission({ prevId: m.prevId, heroId: state.ownedHero?.heroId });
    m.planId = pick?.id ?? null;
    m.planAt = pick ? planOffer({ stageIdx, waveIdx: s.nextIdx, durS: maxDurS(pick), count: m.count }) : null;
  }
  if (m.planAt != null && now >= m.planAt && !b.bossSpawned) {
    const id = m.planId;
    m.planAt = null;
    _openOffer(MISSION_MAP[id]);
  }
}

let _star = 1;   // SPEC-137: 持ちかけで選んでいる★

let _forced = null;   // SPEC-147: EASY は ★と秒を決め打ち (= { star, durS })

function _openOffer(mission, forced = null) {
  if (!mission || _offer) return;
  _offer = mission;
  _forced = forced;
  _star = forced?.star ?? loadStar();
  _wireOnce();
  pauseTime();
  _renderOffer();
  document.getElementById("missionOffer")?.classList.remove("hidden");
  playSe(SFX.GIMMICK_WARN, 100, 0.5);
  // SPEC-137: 初めてのミッションだけ、 マインちゃんが受け方と★を説明する (= 画面の下の通信の帯)
  _naviShown = isEasy() ? false : naviTipModal("mission.offer", [
    { key: "navi.mission.1", pose: "pointer", voice: "mission.1" },   // SPEC-159: ボイス
    { key: "navi.mission.2", pose: "wink", voice: "mission.2" },
  ]);
  if (isEasy()) showLesson("s2.mission");   // SPEC-147: 説明はレッスンで (= 上に重なる)
}
let _naviShown = false;

/** SPEC-137: ★を選ぶ (= 1・2・3 のキーでも)。 覚えておく */
export function pickStar(star) {
  if (!_offer || _forced) return;
  _star = clampStar(star);
  saveStar(_star);
  _renderOffer();
  playSe(SFX.UI_CLICK, 100, 0.3);
}

/** 受ける (= Y) */
export function acceptMission() {
  const mission = _offer;
  if (!mission) return;
  const m = state.mission;
  m.count += 1;
  m.prevId = mission.id;
  const tier = { ...tierOf(mission, _star), ...(_forced?.durS ? { durS: _forced.durS } : {}) };
  m.active = { id: mission.id, star: _star, untilMs: (state.battle.stageElapsedMs ?? 0) + tier.durS * 1000, durS: tier.durS, startKills: state.killCount, hit: false };
  _closeOffer();
  _renderBar();
  playSe(SFX.LEVEL_UP, 100, 0.45);
  _syncSilence();
}

/** 断る (= N)。 何も起きない */
export function declineMission() {
  if (!_offer || _forced?.must) return;   // SPEC-165: 4-3 は断れない
  state.mission.prevId = _offer.id;
  _closeOffer();
}

function _closeOffer() {
  _offer = null;
  document.getElementById("missionOffer")?.classList.add("hidden");
  if (_naviShown) { _naviShown = false; naviHide(); }
  resumeTime();   // SPEC-104: 閉じたら Ready → Go! で
}

function _finish(res) {
  if (res === "clear") state.battle?.story?.events?.push("missionClear");   // SPEC-165
  const m = state.mission;
  const a = m.active;
  m.active = null;
  _syncSilence();   // SPEC-138: 達成の音が聞こえるように、 先に戻す
  const mission = MISSION_MAP[a.id];
  _renderBar();
  if (res === "clear") {
    playSe(SFX.GAME_OVER_CLEAR, 100, 0.45);
    _rewardGum = grantMissionGum(missionGum(a.star, state.currentStageIdx ?? 0));   // SPEC-131: 3 つとは別の確定報酬 (= SPEC-137: ★で)
    _openReward(mission, a.star);   // SPEC-125: 出し手のひとこと → ごほうびを選ぶ
  } else {
    _showResult(mission, res);
  }
}

let _reward = null;   // ごほうびを選んでいるミッション
let _rewardStar = 1;   // SPEC-137: そのミッションの★
let _rewardGum = 0;   // SPEC-131: そのミッションの確定 GUM (= 画面に出す)

function _openReward(mission, star = 1) {
  if (!mission || _reward) return;
  _reward = mission;
  _rewardStar = clampStar(star);
  if (isEasy()) showLesson("s2.reward");   // SPEC-147
  _wireOnce();
  pauseTime();
  _renderReward();
  document.getElementById("missionReward")?.classList.remove("hidden");
}

/** SPEC-125: ごほうびを選ぶ (= 0: ギフト券 / 1: 力添え / 2: HP 回復) */
export function pickReward(idx) {
  const mission = _reward;
  if (!mission) return;
  const choice = rewardChoices(mission, _rewardStar, state.currentStageIdx ?? 0)[idx];
  if (!choice) return;
  _reward = null;
  document.getElementById("missionReward")?.classList.add("hidden");
  resumeTime();   // SPEC-104: 閉じたら Ready → Go! で
  applyReward(choice, mission);
  playSe(SFX.LEVEL_UP, 100, 0.45);
}

/** ごほうびを渡す (= 時間が動き出してから。 アイテムの演出が見えるように) */
export function applyReward(choice, mission) {
  const s = state.shop;
  if (!choice) return;
  if (choice.kind === "gift") { if (s) s.gifts += choice.n; return; }
  if (choice.kind === "ce") { if (s) s.ce += choice.n; return; }   // SPEC-137: ★1
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
    detail: t("mission.reward.giftDetail", "ショップの品と引き換え（Rare 2 枚・Epic 3 枚・Legendary 5 枚）"),
  };
  if (c.kind === "ce") return {
    name: tpl(t("mission.reward.ce", "CE ×{n}"), { n: c.n.toLocaleString() }),
    detail: t("mission.reward.ceDetail", "ショップで使える。残れば固有スキルへ"),
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

/** 持ちかけの「報酬」の欄 (= 確定の GUM と、 3 つから選ぶ) */
export function rewardSummary(mission, star = 1, stageIdx = 0) {
  const [g, b, h] = rewardChoices(mission, star, stageIdx).map((c) => choiceText(c).name);
  return tpl(t("mission.reward.pickGum", "GUM ＋{g} と、 {a}・{b}・{c} から 1 つ"), { g: String(missionGum(star, stageIdx)), a: g, b, c: h });
}

/** SPEC-137: 説明の文 (= ★で数が変わる。 {n}: その★の数・{s}: 秒・{x}: ★ごとの言い回し) */
export function missionDesc(mission, star = 1) {
  const tier = tierOf(mission, star);
  return tpl(t(`mission.${mission.id}.desc`, ""), {
    n: String(tier.n ?? ""), s: String(tier.durS), x: t(`mission.${mission.id}.x${clampStar(star)}`, ""),
  });
}

// ============================================================
// 画面
// ============================================================

function _face(mission) {
  return img(`Image/Enemies/${mission.giver}.png`);
}

function _goalText(tier) {
  return tier.goal?.kills
    ? tpl(t("mission.goal.kills", "{n} 体倒す"), { n: String(tier.goal.kills) })
    : (tier.goal?.noHit ? t("mission.goal.noHit", "1 回も当たらない") : t("mission.goal.survive", "生き残る"));
}

function _renderOffer() {
  const mission = _offer;
  if (!mission) return;
  const star = _star;
  const tier = tierOf(mission, star);
  const stageIdx = state.currentStageIdx ?? 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const face = document.getElementById("missionOfferFace");
  if (face && face.dataset.id !== mission.id) { face.dataset.id = mission.id; face.src = _face(mission); }
  set("missionOfferGiver", t(`mission.${mission.id}.giver`, mission.id));
  set("missionOfferTitle", t(`mission.${mission.id}.title`, mission.id));
  setRichText(document.getElementById("missionOfferDesc"), missionDesc(mission, star));   // SPEC-144: 数字と用語に色
  set("missionOfferTime", tpl(t("mission.time", "{n} 秒"), { n: String(tier.durS) }));
  set("missionOfferGoal", _goalText(tier));
  set("missionOfferReward", rewardSummary(mission, star, stageIdx));
  document.getElementById("missionDecline")?.classList.toggle("hidden", !!_forced?.must);   // SPEC-165: 断れないときは隠す
  document.getElementById("missionOfferStars")?.classList.toggle("hidden", !!_forced);   // ★が決め打ちのときは選べない (= 見せない)
  const w = document.getElementById("missionOffer");
  if (w) w.dataset.star = String(star);
  set("missionOfferWeight", "★".repeat(star));
  for (const btn of document.querySelectorAll("#missionOfferStars [data-star]")) {
    btn.disabled = !!_forced;   // SPEC-147: EASY は★を選ばせない
    const on = Number(btn.dataset.star) === star;
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.classList.toggle("is-on", on);
  }
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
  const tier = { ...tierOf(mission, a.star), durS: a.durS ?? tierOf(mission, a.star).durS };
  const key = `${a.id}|${a.star}|${sec}|${tier.goal?.kills ? kills : ""}|${a.hit}|${Math.round((remain / (tier.durS * 1000)) * 100)}`;
  if (key === _barKey) return;
  _barKey = key;
  bar.classList.remove("hidden");
  bar.dataset.star = String(a.star);   // SPEC-137: 帯の色も★で
  const face = document.getElementById("missionBarFace");
  if (face && face.dataset.id !== a.id) { face.dataset.id = a.id; face.src = _face(mission); }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("missionBarTitle", t(`mission.${a.id}.title`, a.id));
  set("missionBarGoal", tier.goal?.kills
    ? tpl(t("mission.bar.kills", "撃破 {n} / {goal}"), { n: String(Math.min(kills, tier.goal.kills)), goal: String(tier.goal.kills) })
    : _goalText(tier));
  set("missionBarSec", tpl(t("mission.time", "{n} 秒"), { n: String(sec) }));
  const fill = bar.querySelector(".mission-bar__fill");
  if (fill) fill.style.width = ((remain / (tier.durS * 1000)) * 100).toFixed(1) + "%";
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
  // SPEC-131: 確定報酬の GUM (= 3 つから選ぶものとは別に、 もう入っている)
  const gumEl = document.getElementById("missionRewardGum");
  if (gumEl) {
    gumEl.classList.toggle("hidden", _rewardGum <= 0);
    gumEl.innerHTML = "";
    const ic = document.createElement("img");
    ic.src = img(ICON_GUM); ic.alt = "";
    const tx = document.createElement("span");
    tx.textContent = tpl(t("mission.rewardGum", "確定報酬 GUM ＋{n}"), { n: String(_rewardGum) });
    gumEl.append(ic, tx);
  }
  const w = document.getElementById("missionReward");
  if (w) w.dataset.star = String(_rewardStar);
  const box = document.getElementById("missionRewardChoices");
  if (!box) return;
  box.innerHTML = "";
  const icons = { gift: "🎟", ce: "◆", heal: "♥", power: "⚔", swift: "👟", guard: "🛡", thunder: "⚡", magnet: "🧲" };
  rewardChoices(mission, _rewardStar, state.currentStageIdx ?? 0).forEach((c, i) => {
    const { name, detail } = choiceText(c);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mission-reward__choice mission-reward__choice--${c.kind}`;
    btn.innerHTML = `<span class="mission-reward__icon"></span><span class="mission-reward__name"></span><span class="mission-reward__detail"></span><span class="mission-reward__key"></span>`;
    btn.querySelector(".mission-reward__icon").textContent = icons[c.kind === "boon" ? c.boon : c.kind] ?? "★";
    btn.querySelector(".mission-reward__name").textContent = name;
    setRichText(btn.querySelector(".mission-reward__detail"), detail);   // SPEC-144
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
  setMissionSilence(false);   // SPEC-138
  if (_naviShown) { _naviShown = false; naviHide(); }
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
  for (const btn of document.querySelectorAll("#missionOfferStars [data-star]")) btn.addEventListener("click", () => pickStar(Number(btn.dataset.star)));
  document.addEventListener("keydown", (e) => {
    if (_reward && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); pickReward(Number(e.key) - 1); return; }
    if (!_offer) return;
    if (["1", "2", "3"].includes(e.key)) { e.preventDefault(); pickStar(Number(e.key)); return; }   // SPEC-137
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
export function debugClearMission(id, star = 2) {
  const m = MISSION_MAP[id] ?? MISSIONS[0];
  _rewardGum = grantMissionGum(missionGum(star, state.currentStageIdx ?? 0));
  _openReward(m, star);
}
