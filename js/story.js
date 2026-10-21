// ============================================================
// story.js — ストーリーモード (= SPEC-165)。 5 ランド × 25 ステージの「実践つきチュートリアル」のレシピと進み
// ============================================================
//
// 1 ステージ 1 要素。 レシピ (= STORY_STAGES の 1 行) が「何を出すか・何を押させるか・どう終わるか」を決め、
// レシピに無いものは湧かない・落ちない・売らない (= features)。 クリア条件は 1 つ (= kills / survive / reach / collect / boss)。
// 戦闘の各所は easy.js の easyStage() を通してこのレシピを読む (= EASY の上書きと同じ形。 storyOverride())。
// 進みは localStorage の mcs.story (= cleared / best / bonds)。 EASY や NORMAL の解放 (= mcs.played・mcs.easyCleared) は触らない (= 足すだけ)。
// ここは state を読むだけ (= 書くのは story-map.js と battle 側)。 純関数はテスト (tests/story.test.mjs)。

import { state } from "./state.js";
import { LS_PREFIX } from "./constants.js";

export const LS_STORY = `${LS_PREFIX}.story`;

/** ランド (= ワールド)。 名前・背景・色は MCH のランドそのもの (= Image/Backgrounds の 2x05 系) */
export const LANDS = Object.freeze([
  { w: 1, id: "ocean",      bg: "Image/Backgrounds/2105.png", color: "#3aa0e8" },
  { w: 2, id: "strawberry", bg: "Image/Backgrounds/2205.png", color: "#ef5f8a" },
  { w: 3, id: "tangerine",  bg: "Image/Backgrounds/2301.png", color: "#f59a2a" },
  { w: 4, id: "lime",       bg: "Image/Backgrounds/2405.png", color: "#9ad33a" },
  { w: 5, id: "grape",      bg: "Image/Backgrounds/2605.png", color: "#9b5de5" },
]);
/** ランドごとのステージ数 (= 全 25。 行がまだ無いランドは「準備中」として並ぶ) */
export const STORY_PLAN = Object.freeze({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 });

/** 到達の目印に触れたとみなす距離 */
export const REACH_RADIUS = 46;
/** 1-4: HP がこの割合を切ったらハートを落とす (= 拾うまで湧きを止める) */
export const HEAL_DROP_BELOW = 0.5;

/**
 * レシピ (= 1 ステージ 1 行)
 *   id / world            : "1-2" とランド
 *   hero / startExt       : 固定のヒーローと開始装備 (= W1〜W2 は MCH ウォーリアー。 "select" = ヒーロー選択を開く / "keep" = 前に選んだ人)
 *   treeFirst             : ステージの前にスキルツリーを開く (= 3-1。 根を取るまでほかを押せない)
 *   shooters              : { fromMs, everyMs, max, ids } 撃つ敵 (= features.shooters のとき)
 *   clear                 : { kind: "kills", n } | { kind: "survive", sec } | { kind: "reach", points: [{ x, y }] } | { kind: "collect", n } | { kind: "boss" }
 *                           | { kind: "shadowSurvive", sec } | { kind: "shadowDefeat" } (= シャドーの試練。 §6)
 *   shadow                : { id, giver, mode: "survive" | "defeat", atMs, hp, dmg, speed, moves, aura: { spawnMul, speedMul } } (= battle/shadow.js)
 *   bond                  : { who, gifts, unlock: [] } 試練を越えたときの絆と報酬 (= mcs.story.bonds)
 *   chestDrop             : 宝箱から必ず出るもの (= "magnet" など。 無ければふつうの抽選)
 *   targetSec             : クリアの想定時間 (= 自動プレイで合わせる目安。 W1 は 60 以下)
 *   spawn                 : { everyMs, pool, max } (= 洪水・密度・段階・型は使わない)
 *   enemyMul              : { hp, dmg } 雑魚の倍率
 *   heroMul               : { hp } ヒーローの HP の倍率 (= 試練で「多くてほとんど減らない」に使う)
 *   features              : 出すもの。 無いものは出ない (= ce: CE が落ちる / shop / chests / pots / rare / shooters / gimmick / mission / tree / items: [kind])
 *   shop                  : { atMs: [], offers: [extId], only, price (null = ふつうの値段 / 0 = ただ), mustBuy } (= only: ほかの品・リロール・ギフト・お断りを出さない)
 *   heal                  : { below } HP がその割合を切ったらハートを落とし、 拾うまで湧きを止める
 *   boss                  : { id, atMs, warnMs, hpMul, dmgMul, thunder } (= 3-5 / 5-5 だけ)
 *   showGum               : クリア画面で GUM を見せる (= 1-3 から)
 *   lines                 : { intro, mid: [{ on, key }], clear } (= マインちゃんの文の key。 on: firstKill / shopOpen / healDrop / reach)
 *   cameo                 : { giver } 到達でシャドーヒーローが顔を見せる (= 戦わない)
 *   unlock                : クリアで開くもの (= "hero:4006" / "tree" / "bond:lubu" / "mode:NORMAL")
 */
export const STORY_STAGES = Object.freeze([
  // ---- W1 オーシャン: 戦う・買う・育つ・生き残る・進む (= 15〜60 秒) ----
  {
    id: "1-1", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }],
    clear: { kind: "kills", n: 8 }, targetSec: 15,
    spawn: { everyMs: 1500, pool: [101], max: 3 }, enemyMul: { hp: 1, dmg: 0.3 },
    features: {},
    lines: { intro: "story.1-1.intro", mid: [{ on: "firstKill", key: "story.1-1.mid" }], clear: "story.1-1.clear" },
  },
  {
    id: "1-2", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }],
    clear: { kind: "kills", n: 20 }, targetSec: 40,
    spawn: { everyMs: 1200, pool: [101], max: 6 }, enemyMul: { hp: 1.5, dmg: 0.3 },
    features: { shop: true },
    shop: { atMs: [12000], offers: [10], only: true, price: 0, mustBuy: true },
    lines: { intro: "story.1-2.intro", mid: [{ on: "shopOpen", key: "story.1-2.mid" }], clear: "story.1-2.clear" },
  },
  {
    id: "1-3", world: 1, hero: 10001, startExt: [{ extId: 10, level: 2 }],
    clear: { kind: "kills", n: 25 }, targetSec: 45,
    spawn: { everyMs: 1100, pool: [101, 124], max: 6 }, enemyMul: { hp: 1.2, dmg: 0.4 },
    features: { ce: true, shop: true },
    shop: { atMs: [20000], offers: [2], only: true, price: null, mustBuy: true },
    showGum: true,
    lines: { intro: "story.1-3.intro", mid: [{ on: "shopOpen", key: "story.1-3.mid" }], clear: "story.1-3.clear" },
  },
  {
    id: "1-4", world: 1, hero: 10001, startExt: [{ extId: 10, level: 2 }, { extId: 2, level: 1 }],
    clear: { kind: "survive", sec: 30 }, targetSec: 30,
    spawn: { everyMs: 1000, pool: [101, 124], max: 8 }, enemyMul: { hp: 1, dmg: 0.8 },
    features: { ce: true, items: ["heal"] },
    heal: { below: HEAL_DROP_BELOW },
    showGum: true,
    lines: { intro: "story.1-4.intro", mid: [{ on: "healDrop", key: "story.1-4.mid" }], clear: "story.1-4.clear" },
  },
  {
    id: "1-5", world: 1, hero: 10001, startExt: [{ extId: 10, level: 2 }, { extId: 2, level: 1 }],
    clear: { kind: "reach", points: [{ x: 0, y: 600 }, { x: 380, y: -200 }, { x: -380, y: -700 }] }, targetSec: 45,   // 3 つの地点を順に (= 約 2,400 px の道)
    spawn: { everyMs: 1100, pool: [101, 124], max: 8 }, enemyMul: { hp: 1, dmg: 0.5 },
    features: { ce: true },
    showGum: true,
    cameo: { giver: 481 },   // ゴースト・呂布 (= 「試練はまだ先だ」)
    lines: { intro: "story.1-5.intro", mid: [{ on: "reach", key: "story.1-5.mid" }], clear: "story.1-5.clear" },
  },
  // ---- W2 ストロベリー: 選ぶ・集める・初めての試練 (= 30〜60 秒) ----
  {
    id: "2-1", world: 2, hero: 10001, startExt: [{ extId: 10, level: 2 }, { extId: 2, level: 1 }],
    clear: { kind: "kills", n: 30 }, targetSec: 45,
    spawn: { everyMs: 1000, pool: [101, 124], max: 8 }, enemyMul: { hp: 1.2, dmg: 0.5 },
    features: { ce: true, shop: true },
    shop: { atMs: [15000], offers: [1, 3], only: true, price: null, mustBuy: true },   // リボルバー / ほうき: どちらか
    showGum: true,
    lines: { intro: "story.2-1.intro", mid: [{ on: "shopOpen", key: "story.2-1.mid" }], clear: "story.2-1.clear" },
  },
  {
    id: "2-2", world: 2, hero: 10001, startExt: [{ extId: 10, level: 2 }, { extId: 2, level: 1 }, { extId: 1, level: 1 }],
    clear: { kind: "kills", n: 40 }, targetSec: 50,
    spawn: { everyMs: 900, pool: [101, 124], max: 9 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, shop: true },
    shop: { atMs: [20000], offers: [10, 16, 14], only: true, price: null, mustBuy: true },   // ランクアップ / 攻撃力 (りんご) / クールダウン (馬): 全部は買えない
    showGum: true,
    lines: { intro: "story.2-2.intro", mid: [{ on: "shopOpen", key: "story.2-2.mid" }], clear: "story.2-2.clear" },
  },
  {
    id: "2-3", world: 2, hero: 10001, startExt: [{ extId: 10, level: 3 }, { extId: 2, level: 1 }, { extId: 1, level: 1 }],
    clear: { kind: "collect", n: 40 }, targetSec: 50,
    spawn: { everyMs: 1100, pool: [101, 124], max: 7 }, enemyMul: { hp: 1.2, dmg: 0.5 },
    features: { ce: true, chests: true, pots: true, items: ["magnet"] },
    chestTimesMs: [6000, 22000], chestDrop: "magnet",
    showGum: true,
    lines: { intro: "story.2-3.intro", mid: [{ on: "item:magnet", key: "story.2-3.mid" }], clear: "story.2-3.clear" },
  },
  {
    id: "2-4", world: 2, hero: 10001, startExt: [{ extId: 10, level: 3 }, { extId: 2, level: 2 }, { extId: 1, level: 1 }],
    clear: { kind: "shadowSurvive", sec: 15 }, targetSec: 45,
    spawn: { everyMs: 1600, pool: [101], max: 5 }, enemyMul: { hp: 1, dmg: 0.4 }, heroMul: { hp: 3 },
    features: { ce: true },
    shadow: { id: "alexander", giver: 463, mode: "survive", atMs: 4000, speed: 80, dmg: 12, moves: { charge: 2600 }, first: { charge: 1200 }, aura: { speedMul: 1.3 } },
    bond: { who: "alexander", unlock: ["item:watch"] },
    showGum: true,
    lines: { intro: "story.2-4.intro", mid: [{ on: "shadow", key: "story.2-4.mid" }], clear: "story.2-4.clear" },
  },
  {
    id: "2-5", world: 2, hero: 10001, startExt: [{ extId: 10, level: 3 }, { extId: 2, level: 2 }, { extId: 1, level: 2 }],
    clear: { kind: "shadowSurvive", sec: 20 }, targetSec: 60,
    spawn: { everyMs: 1300, pool: [101, 124], max: 10 }, enemyMul: { hp: 1, dmg: 0.4 }, heroMul: { hp: 3 },
    features: { ce: true },
    shadow: { id: "lubu", giver: 481, mode: "survive", atMs: 4000, speed: 60, dmg: 16, moves: { slam: 3600, charge: 5200 }, first: { slam: 1500, charge: 3000 }, aura: { spawnMul: 3 } },
    bond: { who: "lubu", gifts: 2 },
    showGum: true,
    lines: { intro: "story.2-5.intro", mid: [{ on: "shadow", key: "story.2-5.mid" }], clear: "story.2-5.clear" },
  },
  // ---- W3 タンジェリン: 木・仲間・敵の種類・初の大型ボス (= 45〜90 秒) ----
  {
    id: "3-1", world: 3, hero: 10001, startExt: [{ extId: 10, level: 3 }, { extId: 2, level: 2 }, { extId: 1, level: 2 }],
    treeFirst: true,
    clear: { kind: "kills", n: 30 }, targetSec: 45,
    spawn: { everyMs: 1000, pool: [101, 124], max: 8 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true },
    showGum: true,
    unlock: "hero:4006",   // クリアでビリー・ザ・キッドが仲間に (= 3-2 で選べる)
    lines: { intro: "story.3-1.intro", mid: [{ on: "firstKill", key: "story.3-1.mid" }], clear: "story.3-1.clear" },
  },
  {
    id: "3-2", world: 3, hero: "select", startExt: [],
    clear: { kind: "kills", n: 40 }, targetSec: 60,
    spawn: { everyMs: 950, pool: [101, 124, 134], max: 9 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true },
    shop: { atMs: [20000], offers: [], only: false, price: null, mustBuy: false },   // 選んだヒーローの店 (= ふつうの品ぞろえ)
    showGum: true,
    lines: { intro: "story.3-2.intro", mid: [{ on: "firstKill", key: "story.3-2.mid" }], clear: "story.3-2.clear" },
  },
  {
    id: "3-3", world: 3, hero: "keep", startExt: [],
    clear: { kind: "kills", n: 40 }, targetSec: 60,
    spawn: { everyMs: 1000, pool: [101, 124, 134], max: 9 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, rare: true, magicCards: true },
    rareAtMs: 6000,
    shop: { atMs: [28000], offers: [], only: false, price: null, mustBuy: true },   // ギフト券で 1 品買うまで出られない (= 持っていれば ただ)
    showGum: true,
    lines: { intro: "story.3-3.intro", mid: [{ on: "item:gift", key: "story.3-3.mid" }, { on: "shopOpen", key: "story.3-3.shop" }], clear: "story.3-3.clear" },
  },
  {
    id: "3-4", world: 3, hero: "keep", startExt: [],
    clear: { kind: "survive", sec: 60 }, targetSec: 60,
    spawn: { everyMs: 1200, pool: [101, 124], max: 8 }, enemyMul: { hp: 1.2, dmg: 0.5 },
    features: { ce: true, tree: true, shooters: true },
    shooters: { fromMs: 3000, everyMs: 7000, max: 3, ids: [166] },
    showGum: true,
    lines: { intro: "story.3-4.intro", mid: [{ on: "shooter", key: "story.3-4.mid" }], clear: "story.3-4.clear" },
  },
  {
    id: "3-5", world: 3, hero: "keep", startExt: [],
    clear: { kind: "boss" }, targetSec: 90,
    spawn: { everyMs: 1200, pool: [101, 124, 134], max: 8 }, enemyMul: { hp: 1.3, dmg: 0.5 }, heroMul: { hp: 1.5 },
    features: { ce: true, tree: true, shop: true, items: ["thunder", "heal"], bossChest: true },
    shop: { atMs: [20000], offers: [], only: false, price: null, mustBuy: false },
    heal: { below: 0.5 },
    boss: { id: 171, atMs: 45000, warnMs: 8000, hpMul: 0.1, dmgMul: 0.4, thunder: true, thunderRatio: 0.5 },   // 1,200 HP (= W3 の装備の DPS 30〜60 で 20〜40 秒。 雷鼓で半分)
    showGum: true,
    lines: { intro: "story.3-5.intro", mid: [{ on: "bossWarn", key: "story.3-5.mid" }, { on: "item:thunder", key: "story.3-5.thunder" }], clear: "story.3-5.clear" },
  },
]);

export const STORY_MAP = Object.freeze(Object.fromEntries(STORY_STAGES.map((s) => [s.id, s])));

/** 全 25 の id (= 行が無いものも並ぶ。 ランドマップの丸) */
export function allStoryIds() {
  const out = [];
  for (const land of LANDS) for (let i = 1; i <= (STORY_PLAN[land.w] ?? 0); i++) out.push(`${land.w}-${i}`);
  return out;
}
export function landOf(id) {
  const w = Number(String(id).split("-")[0]);
  return LANDS.find((l) => l.w === w) ?? LANDS[0];
}
export function storyRecipe(id) { return STORY_MAP[id] ?? null; }

// ---- いま遊んでいるステージ (= state.storyId) ----
export function isStory() { return !!state.storyId; }
export function storyStage() { return isStory() ? (STORY_MAP[state.storyId] ?? null) : null; }

/**
 * 出すものか (= レシピに無ければ出ない。 ストーリーの外では何でも出る)。 "items:heal" のように種類も聞ける
 */
export function storyAllows(feature, recipe = storyStage()) {
  if (!recipe) return true;
  const f = recipe.features ?? {};
  if (feature.startsWith("items:")) return (f.items ?? []).includes(feature.slice(6));
  return !!f[feature];
}

/**
 * EASY の上書きと同じ形に直す (= easyStage() がこれを返す。 戦闘の各所は変えずに読める。 純関数)
 */
export function storyOverride(recipe) {
  if (!recipe) return null;
  const boss = recipe.boss ?? null;
  const f = recipe.features ?? {};
  return {
    story: true,
    bossAtMs: boss ? boss.atMs : Infinity,
    warnMs: boss?.warnMs ?? 5000,
    shopTimesMs: f.shop && recipe.shop ? [...recipe.shop.atMs] : [],
    spawnIntervalMs: recipe.spawn?.everyMs ?? 1200,
    enemyHpMul: recipe.enemyMul?.hp ?? 1,
    enemyDmgMul: recipe.enemyMul?.dmg ?? 1,
    bossHpMul: boss?.hpMul ?? 1,
    bossDmgMul: boss?.dmgMul ?? 1,
    chestTimesMs: f.chests ? (recipe.chestTimesMs ?? [15000]) : [],
    rareAtMs: f.rare ? (recipe.rareAtMs ?? 5000) : null,
    missionAtMs: null,
    thunderAtBoss: !!boss?.thunder,
    thunderBossRatio: boss?.thunderRatio ?? undefined,
    pool: recipe.spawn?.pool ?? null,
    maxEnemies: recipe.spawn?.max ?? null,
    bossId: boss?.id ?? null,
    shooters: f.shooters ? (recipe.shooters ?? null) : null,
  };
}

// ---- 進み (= localStorage) ----
function _storage() { try { return globalThis.localStorage ?? null; } catch { return null; } }

/** 進みを読む (= 壊れていたら空。 純関数: storage を渡せる) */
export function loadStory(storage = _storage()) {
  try {
    const o = JSON.parse(storage?.getItem(LS_STORY) ?? "{}") ?? {};
    return {
      cleared: Array.isArray(o.cleared) ? o.cleared.filter((x) => typeof x === "string") : [],
      best: o.best && typeof o.best === "object" ? o.best : {},
      bonds: Array.isArray(o.bonds) ? o.bonds.filter((x) => typeof x === "string") : [],
    };
  } catch { return { cleared: [], best: {}, bonds: [] }; }
}
export function saveStory(p, storage = _storage()) {
  try { storage?.setItem(LS_STORY, JSON.stringify(p)); return true; } catch { return false; }
}

/** 遊べるか (= 最初の 1 つか、 その前をクリア済み。 純関数) */
export function storyUnlocked(id, progress) {
  const ids = allStoryIds();
  const i = ids.indexOf(id);
  if (i < 0) return false;
  if (i === 0) return true;
  return progress.cleared.includes(ids[i - 1]);
}
/** 次の id (= 無ければ null。 純関数) */
export function nextStoryId(id) {
  const ids = allStoryIds();
  const i = ids.indexOf(id);
  return i >= 0 && i + 1 < ids.length ? ids[i + 1] : null;
}
/** いま遊ぶべき 1 つ (= 最初のクリアしていないもの。 純関数) */
export function currentStoryId(progress) {
  return allStoryIds().find((id) => !progress.cleared.includes(id)) ?? null;
}
/** 全 25 をクリアしたか (= 行があるものだけでは判定しない。 純関数) */
export function storyAllCleared(progress) {
  return allStoryIds().every((id) => progress.cleared.includes(id));
}

/** クリアを覚える (= 自己ベストは速いほう。 純関数に近い: 新しい progress を返す) */
export function withCleared(progress, id, { sec = 0, kills = 0 } = {}) {
  const cleared = progress.cleared.includes(id) ? progress.cleared : [...progress.cleared, id];
  const prev = progress.best[id];
  const best = { ...progress.best, [id]: prev && prev.sec <= sec ? prev : { sec, kills } };
  return { ...progress, cleared, best };
}
export function withBond(progress, who) {
  return progress.bonds.includes(who) ? progress : { ...progress, bonds: [...progress.bonds, who] };
}

/** クリアを保存する (= battle 側から。 返す: 新しい進み) */
export function markStoryCleared(id, best = {}) {
  const p = withCleared(loadStory(), id, best);
  saveStory(p);
  return p;
}
/** 絆を保存する (= 試練を越えた) */
export function markStoryBond(who) {
  const p = withBond(loadStory(), who);
  saveStory(p);
  return p;
}
/** 絆の報酬をまとめる (= ギフト券の枚数と解放したもの。 純関数) */
export function bondRewards(progress, stages = STORY_STAGES) {
  const out = { gifts: 0, unlock: [] };
  for (const s of stages) if (s.bond && progress.bonds.includes(s.bond.who)) { out.gifts += s.bond.gifts ?? 0; out.unlock.push(...(s.bond.unlock ?? [])); }
  return out;
}

// ---- 戦闘の中の判定 (= 純関数。 battle/story-battle.js が毎コマ呼ぶ) ----
/** 到達の地点の列 (= 1 つだけなら [{x,y}]。 純関数) */
export function reachPoints(clear) {
  if (!clear || clear.kind !== "reach") return [];
  return Array.isArray(clear.points) ? clear.points : [{ x: clear.x ?? 0, y: clear.y ?? 0 }];
}
/** いまの地点に触れたか (= 純関数) */
export function reachedPoint(pt, px, py) {
  return !!pt && Math.hypot((px ?? 0) - pt.x, (py ?? 0) - pt.y) <= REACH_RADIUS;
}

/**
 * クリアしたか。 ctx: { kills, elapsedMs, px, py, ce, bossDefeated, reachIdx }
 */
export function storyCleared(recipe, ctx) {
  const c = recipe?.clear;
  if (!c) return false;
  switch (c.kind) {
    case "kills":   return (ctx.kills | 0) >= c.n;
    case "survive": return (ctx.elapsedMs ?? 0) >= c.sec * 1000;
    case "reach":   return (ctx.reachIdx | 0) >= reachPoints(c).length;
    case "collect": return (ctx.ce | 0) >= c.n;
    case "boss":    return !!ctx.bossDefeated;
    case "shadowSurvive": return (ctx.shadowMs ?? 0) >= c.sec * 1000;
    case "shadowDefeat":  return !!ctx.shadowDefeated;
    default:        return false;
  }
}
/** 進み具合の文のための数 (= { now, goal, kind }。 純関数) */
export function storyGoal(recipe, ctx) {
  const c = recipe?.clear;
  if (!c) return null;
  switch (c.kind) {
    case "kills":   return { kind: c.kind, now: ctx.kills | 0, goal: c.n };
    case "survive": return { kind: c.kind, now: Math.min(c.sec, Math.floor((ctx.elapsedMs ?? 0) / 1000)), goal: c.sec };
    case "collect": return { kind: c.kind, now: ctx.ce | 0, goal: c.n };
    case "reach":   return { kind: c.kind, now: Math.min(ctx.reachIdx | 0, reachPoints(c).length), goal: reachPoints(c).length };
    case "boss":    return { kind: c.kind, now: ctx.bossDefeated ? 1 : 0, goal: 1 };
    case "shadowSurvive": return { kind: c.kind, now: Math.min(c.sec, Math.floor((ctx.shadowMs ?? 0) / 1000)), goal: c.sec };
    case "shadowDefeat":  return { kind: c.kind, now: ctx.shadowDefeated ? 1 : 0, goal: 1 };
    default:        return null;
  }
}
