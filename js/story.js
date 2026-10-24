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
/** ストーリーのヒーロー (= MCH ウォーリアー固定。 3-2 だけ選べて、 選んだ人は持ち物に残る。 作者 2026-10-22) */
export const STORY_HERO = 10001;

/** ランド (= ワールド)。 名前・背景・色は MCH のランドそのもの (= Image/Backgrounds の 2x05 系) */
export const LANDS = Object.freeze([
  // dir: ワールドマップの方角 (= 四神。 北=玄武 オーシャン / 南=朱雀 ストロベリー / 西=白虎 タンジェリン / 東=青龍 ライム / 中央=グレープ)
  // cryptid: ランドの守護神「クリプタイド」(128px)
  // ach: ステージの札の飾り = MCH のアチーブメントのアート (Image/Achievements/piece_<id>.png。 194×217。 ランドのクリプタイドの像)
  //      大型ボス = 金 (King 就任 200nn) / 中ボス (シャドー) = 銀 (G5 10 回 10nn2) / それ以外 = 銅 (G5 3 回 10nn1)。 作者の指定 2026-10-22
  { w: 1, id: "ocean",      bg: "Image/Backgrounds/2105.png", color: "#3aa0e8", dir: "n", guardian: "genbu",   cryptid: "Image/Cryptids/01_Ocean.png",      ach: { plain: 10071, shadow: 10072, boss: 20011 } },
  { w: 2, id: "strawberry", bg: "Image/Backgrounds/2205.png", color: "#ef5f8a", dir: "s", guardian: "suzaku",  cryptid: "Image/Cryptids/02_Strawberry.png", ach: { plain: 10081, shadow: 10082, boss: 20012 } },
  { w: 3, id: "tangerine",  bg: "Image/Backgrounds/2301.png", color: "#f59a2a", dir: "w", guardian: "byakko",  cryptid: "Image/Cryptids/03_Tangerine.png",  ach: { plain: 10091, shadow: 10092, boss: 20013 } },
  { w: 4, id: "lime",       bg: "Image/Backgrounds/2405.png", color: "#9ad33a", dir: "e", guardian: "seiryu",  cryptid: "Image/Cryptids/04_Lime.png",       ach: { plain: 10101, shadow: 10102, boss: 20014 } },
  { w: 5, id: "grape",      bg: "Image/Backgrounds/2605.png", color: "#9b5de5", dir: "c", guardian: "zeus",    cryptid: "Image/Cryptids/06_Grape.png",      ach: { plain: 10121, shadow: 10122, boss: 20016 } },
]);
/**
 * 絆の報酬ラッシュ (= 作者の方針 2026-10-22: 報酬は早めに・一気に。 シャドーを越えた瞬間に足もとへ降る)
 *   ce: CE の宝石の総量 / cards: マジックカード (= その場でレベルアップ) / heal: ハート / gum: クリアの GUM に上乗せ
 *   レシピの bond.burst で上書き。 gifts はこれまでどおり bond.gifts (= その場で財布へ)
 */
export const BOND_BURST = Object.freeze({ ce: 120, cards: 2, heal: true, gum: 30 });
export function bondBurst(recipe) {
  return recipe?.bond ? { ...BOND_BURST, ...(recipe.bond.burst ?? {}) } : null;
}
/**
 * ワールドマップ v2 (= SPEC-165 §3.y)。 S-A の領土と札の位置 (= 画面の %)。 北 / 西 / 東 / 南 / 中央
 *   terr: 背景を領土の形に切り抜く箱 / plate: ランドの札の中心
 */
export const MAP_TERRITORY = Object.freeze({
  n: { terr: { l: 2, t: 5, w: 96, h: 31 }, plate: { x: 50, y: 20 } },
  w: { terr: { l: -14, t: 30, w: 62, h: 40 }, plate: { x: 24, y: 50 } },
  e: { terr: { l: 52, t: 30, w: 62, h: 40 }, plate: { x: 76, y: 50 } },
  s: { terr: { l: 2, t: 65, w: 96, h: 31 }, plate: { x: 50, y: 80 } },
  c: { terr: { l: 24, t: 35, w: 52, h: 30 }, plate: { x: 50, y: 50 } },
});
/** S-B (ワールド詳細) のステージの位置 (= 画面の %。 レシピの map で上書き)。 上から下へ蛇行 */
export const MAP_PATH = Object.freeze([{ x: 24, y: 30 }, { x: 64, y: 39 }, { x: 34, y: 52 }, { x: 70, y: 63 }, { x: 42, y: 78 }]);
export function stagePos(recipe, i) {
  return recipe?.map ?? MAP_PATH[Math.min(i, MAP_PATH.length - 1)];
}
/** 札の役 (= 飾りの段)。 大型ボス / 中ボス (シャドー) / それ以外 */
export function stageRole(recipe) {
  return recipe?.boss ? "boss" : (recipe?.shadow ? "shadow" : "plain");
}
/** 札の飾りの絵 (= アチーブメントのアート。 純関数) */
export function stageArt(land, role) {
  return `Image/Achievements/piece_${land.ach[role] ?? land.ach.plain}.png`;
}
/** 中央にそびえる 天候操作装置ゼウス (= 傘シリーズのレジェンダリー) と 頂上の ラスボス COVID-19 (= 681。 作者 2026-10-22) */
export const FINAL_BOSS_ID = 681;
export const TOWER = Object.freeze({ zeus: "Image/Extensions/5190.png", top: `Image/Enemies/${FINAL_BOSS_ID}.png` });
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
 *   variants              : { giant, runner } 型のついた雑魚の混じる割合 (= 4-1。 無ければ段階の表)
 *   gimmick               : "beads" | "punch" | "trojan" 土地の仕掛け (= features.gimmick のとき)
 *   mission               : { id, atMs, star, durS, must } 決まった時刻に持ちかける (= must なら断れない)
 *   chestDrop             : 宝箱の中身 (= 1 つなら文字列、 列なら n 個目の宝箱の中身)
 *   shop.must             : 店で「するまで出られない」こと (= ["ban"] 3-2 / ["reroll"] 5-1 / ["sig"] 5-2)
 *   strike                : 始まりにシャドーの一撃で HP を減らす (= 1-4: { id, giver, atMs, hpRatio }。 パンケーキのありがたみ)
 *   pickup.heal           : "full" ならそのパンケーキは満タンまで (= 1-4)
 *   shop.atMs: null / spawn: null / chestTimesMs: null : 本番と同じ (= NORMAL のステージ 1 の表。 W5)
 *   mission: null         : features.mission のまま、 ふつうの持ちかけ (= 本番)
 *   bondOn                : この出来事で絆を結ぶ (= "missionClear"。 シャドーの無い絆)
 *   bond.burst            : 越えた瞬間の報酬ラッシュの上書き (= 既定は BOND_BURST。 { ce, cards, heal, gum })
 *   map                   : { x, y } ワールド詳細 (S-B) での札の位置 (= 画面の %。 無ければ MAP_PATH)
 *   spawn.from            : "sides" = 左右と下からだけ湧く (= 1-0。 上のゴールの側からは来ない)
 *   pickup                : { kind, x, y } 始まりに置くアイテム (= 1-4 のパンケーキ。 取るまで光る道筋)
 *   require               : "item:<kind>" クリアに要る拾い物 (= 1-4)
 *   pre                   : { points } クリアの前の移動の練習 (= 1-5。 全部めぐると shadow.trigger "afterPre" が出る)
 *   shadow.mode "spar"    : 小手調べ (= 削れるが HP が大きい)。 spar.hits 回当てたら店が開き、 ランクアップのあと HP が spar.hpAfter に
 *   shop.rankupFx         : 買った瞬間にランクアップの演出 (= 1-5)。 shop.priceMul: 値段の倍率 (= 2-2)。 shop.fit: 開いた瞬間の CE で買える割合の上限 (= 2-2 の「全部は買えない」。 CE はステージをまたいで残るため)
 *   bounds                : { x, yMax } 見えない壁 (= 1-0。 |x| ≤ x・y ≤ yMax。 上は自由)
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
    shop: { atMs: [12000], offers: [16], only: true, price: 0, mustBuy: true },   // りんご (= 攻撃力。 作者 2026-10-22: ランクアップは 1-5 で見せる)
    lines: { intro: "story.1-2.intro", mid: [{ on: "shopOpen", key: "story.1-2.mid" }], clear: "story.1-2.clear" },
  },
  {
    id: "1-3", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }, { extId: 16, level: 1 }],
    clear: { kind: "kills", n: 25 }, targetSec: 45,
    spawn: { everyMs: 1100, pool: [101, 124], max: 6 }, enemyMul: { hp: 0.9, dmg: 0.4 },   // ブレード Lv.1 ＋ りんごで 45 秒くらい
    features: { ce: true, shop: true },
    shop: { atMs: [20000], offers: [2], only: true, price: null, mustBuy: true },
    showGum: true,
    lines: { intro: "story.1-3.intro", mid: [{ on: "firstCe", key: "story.1-3.ce" }, { on: "shopOpen", key: "story.1-3.mid" }], clear: "story.1-3.clear" },
  },
  {
    id: "1-4", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }, { extId: 16, level: 1 }, { extId: 2, level: 1 }],
    clear: { kind: "survive", sec: 30 }, targetSec: 30,
    spawn: { everyMs: 1400, pool: [101, 124], max: 6 }, enemyMul: { hp: 1, dmg: 0.4 },   // 一撃で HP 20% になるので、 雑魚は弱く・少なく (= パンケーキまで走れる)
    features: { ce: true, items: ["heal"] },
    strike: { id: "lubu", giver: 481, atMs: 1200, hpRatio: 0.2 },   // 作者 2026-10-22: 始まりに呂布の一撃で HP を 20% に (= パンケーキのありがたみ)
    pickup: { kind: "heal", x: 0, y: -340, heal: "full" },   // パンケーキを確定で置く (= 光る道筋で誘導。 取るまでクリアしない。 満タンまで戻る)
    require: "item:heal",
    showGum: true,
    lines: { intro: "story.1-4.intro", mid: [{ on: "strike", key: "story.1-4.strike" }, { on: "item:heal", key: "story.1-4.mid" }], clear: "story.1-4.clear" },
  },
  {
    id: "1-5", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }, { extId: 16, level: 1 }, { extId: 2, level: 1 }],
    // 移動の練習 (pre) → 真ん中に呂布 (= 小手調べ。 削れるが HP が大きい) → 3 回当てる → マインが促す → 店 (エリートブレードだけ・ただ) →
    // ランクアップの演出 → 呂布の HP が小さくなる → 倒す → クリア (= 作者の依頼 2026-10-22)
    clear: { kind: "shadowDefeat" }, targetSec: 60,
    pre: { points: [{ x: 0, y: 600 }, { x: 380, y: -200 }, { x: -380, y: -700 }] },   // 3 つの地点を順に (= 約 2,400 px の道)
    spawn: { everyMs: 1300, pool: [101, 124], max: 6 }, enemyMul: { hp: 1, dmg: 0.4 }, heroMul: { hp: 2 },
    features: { ce: true, shop: true },
    shop: { atMs: [], offers: [10], only: true, price: 0, mustBuy: true, rankupFx: true },   // 自動では開かない (= 3 回当てたら開く)
    shadow: { id: "lubu", giver: 481, mode: "spar", trigger: "afterPre", at: { x: 0, y: 0 }, hp: 3000, dmg: 8, speed: 55, moves: { charge: 5200 }, first: { charge: 3000 } },
    spar: { hits: 3, hpAfter: 320 },   // 3 回当てたら店。 ランクアップのあとは HP 320 (= エリートブレードで数発)
    showGum: true,
    lines: { intro: "story.1-5.intro", mid: [{ on: "reach", key: "story.1-5.mid" }, { on: "shadow", key: "story.1-5.spar" }, { on: "sparHits", key: "story.1-5.hits" }, { on: "rankup", key: "story.1-5.rankup" }], clear: "story.1-5.clear" },
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
    shop: { atMs: [20000], offers: [10, 16, 14, 2], only: true, price: null, mustBuy: true, priceMul: 1.6, fit: 0.65 },   // ランクアップ / 攻撃力 (りんご) / クールダウン (馬) / 棍棒: 4 品・値段 ×1.6、 開いた瞬間の CE で 65% ぶんまでしか買えない値段に (= 全部は買えない。 作者 2026-10-22)
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
    shadow: { id: "lubu", giver: 481, mode: "survive", atMs: 4000, speed: 70, dmg: 24, moves: { slam: 3200, charge: 4600 }, first: { slam: 1500, charge: 3000 }, aura: { spawnMul: 3 } },   // 作者 2026-10-22: 少しスリルを (dmg 16 → 24・速さ 60 → 70・技の間隔を短く)
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
    features: { ce: true, tree: true, shop: true, ban: true },
    shop: { atMs: [20000], offers: [], only: false, price: null, mustBuy: false },   // 選んだヒーローの店 (= ふつうの品ぞろえ)。 お断りは案内だけで強制しない (= 作者 2026-10-22: 全部買って ✕ が無くなり詰んだ人が出た。 気づいた人だけ使う機能)
    showGum: true,
    lines: { intro: "story.3-2.intro", mid: [{ on: "firstKill", key: "story.3-2.mid" }, { on: "shopOpen", key: "story.3-2.shop" }], clear: "story.3-2.clear" },
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
  // ---- W4 ライム: 型・仕掛け・ミッション・お助け・2 人目の強敵 (= 60〜90 秒) ----
  {
    id: "4-1", world: 4, hero: "keep", startExt: [],
    clear: { kind: "kills", n: 60 }, targetSec: 75,
    spawn: { everyMs: 900, pool: [101, 124, 134], max: 10 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, variants: true },
    variants: { giant: 0.2, runner: 0.2 },
    shop: { atMs: [25000], offers: [], only: false, price: null, mustBuy: false },
    showGum: true,
    lines: { intro: "story.4-1.intro", mid: [{ on: "variant:giant", key: "story.4-1.giant" }, { on: "variant:runner", key: "story.4-1.runner" }], clear: "story.4-1.clear" },
  },
  {
    id: "4-2", world: 4, hero: "keep", startExt: [],
    clear: { kind: "survive", sec: 60 }, targetSec: 60,
    spawn: { everyMs: 1300, pool: [101, 124], max: 8 }, enemyMul: { hp: 1.2, dmg: 0.5 },
    features: { ce: true, tree: true, gimmick: true },
    gimmick: "beads",
    showGum: true,
    lines: { intro: "story.4-2.intro", mid: [{ on: "gimmick", key: "story.4-2.mid" }], clear: "story.4-2.clear" },
  },
  {
    id: "4-3", world: 4, hero: "keep", startExt: [],
    clear: { kind: "kills", n: 50 }, targetSec: 75,
    spawn: { everyMs: 1000, pool: [101, 124, 134], max: 9 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, mission: true },
    shop: { atMs: [40000], offers: [], only: false, price: null, mustBuy: false },
    mission: { id: "alexander", atMs: 8000, star: 1, durS: 30, must: true },   // 試練を越えた相手が依頼してくる。 受けるまで出られない
    showGum: true,
    lines: { intro: "story.4-3.intro", mid: [{ on: "missionOffer", key: "story.4-3.offer" }, { on: "missionClear", key: "story.4-3.cleared" }], clear: "story.4-3.clear" },
  },
  {
    id: "4-4", world: 4, hero: "keep", startExt: [],
    clear: { kind: "survive", sec: 60 }, targetSec: 60,
    spawn: { everyMs: 700, pool: [101, 124, 134], max: 14 }, enemyMul: { hp: 1.2, dmg: 0.5 },
    features: { ce: true, tree: true, chests: true, items: ["watch", "robot"] },
    chestTimesMs: [8000, 30000], chestDrop: ["watch", "robot"],
    showGum: true,
    lines: { intro: "story.4-4.intro", mid: [{ on: "item:watch", key: "story.4-4.watch" }, { on: "item:robot", key: "story.4-4.robot" }], clear: "story.4-4.clear" },
  },
  {
    id: "4-5", world: 4, hero: "keep", startExt: [],
    clear: { kind: "shadowDefeat" }, targetSec: 90,
    spawn: { everyMs: 1200, pool: [101, 124], max: 8 }, enemyMul: { hp: 1.2, dmg: 0.45 }, heroMul: { hp: 1.5 },
    features: { ce: true, tree: true, shop: true, shooters: true, items: ["heal"] },
    shop: { atMs: [20000], offers: [], only: false, price: null, mustBuy: false },
    shooters: { fromMs: 12000, everyMs: 7000, max: 3, ids: [166] },   // 鉄砲隊
    heal: { below: 0.5 },
    shadow: { id: "nobunaga", giver: 450, mode: "defeat", atMs: 10000, hp: 1800, dmg: 12, speed: 60, moves: { burst: 5000, charge: 7000 }, first: { burst: 3000, charge: 5000 }, burst: { n: 8, speed: 170, dmg: 8, iconId: 5055 } },   // 1,800 HP (= W4 の DPS 40〜60 で 30〜45 秒)
    bond: { who: "nobunaga", unlock: ["passive:thunder30"] },   // 雷鼓の対ボス 20% → 30%
    showGum: true,
    lines: { intro: "story.4-5.intro", mid: [{ on: "shadow", key: "story.4-5.mid" }, { on: "shooter", key: "story.4-5.shooter" }], clear: "story.4-5.clear" },
  },
  // ---- W5 グレープ: 本番の形 (= 90〜300 秒) ----
  {
    id: "5-1", world: 5, hero: "keep", startExt: [],
    clear: { kind: "kills", n: 80 }, targetSec: 90,
    spawn: { everyMs: 800, pool: [101, 124, 134], max: 12 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, reroll: true, items: ["heal"] },
    shop: { atMs: [15000, 50000], offers: [], only: false, price: null, mustBuy: false, must: ["reroll"] },   // リロールを 1 回使うまで出られない (= お断りは 3-2 へ。 作者 2026-10-22)
    heal: { below: 0.5 },
    showGum: true,
    lines: { intro: "story.5-1.intro", mid: [{ on: "shopOpen", key: "story.5-1.shop" }, { on: "reroll", key: "story.5-1.reroll" }], clear: "story.5-1.clear" },
  },
  {
    id: "5-2", world: 5, hero: "keep", startExt: [],
    clear: { kind: "kills", n: 100 }, targetSec: 100,
    spawn: { everyMs: 750, pool: [101, 124, 134], max: 12 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, reroll: true, sig: true, chests: true, magicCards: true },
    shop: { atMs: [15000, 55000], offers: [], only: false, price: null, mustBuy: false, must: ["sig"] },   // 固有スキルを 1 段上げるまで出られない (= 足りなければ手持ちの CE で)
    chestTimesMs: [30000], chestDrop: "card",
    showGum: true,
    lines: { intro: "story.5-2.intro", mid: [{ on: "shopOpen", key: "story.5-2.shop" }, { on: "sigUp", key: "story.5-2.sig" }, { on: "card", key: "story.5-2.card" }], clear: "story.5-2.clear" },
  },
  {
    id: "5-3", world: 5, hero: "keep", startExt: [],
    clear: { kind: "survive", sec: 90 }, targetSec: 90,
    spawn: { everyMs: 900, pool: [101, 124, 134], max: 12 }, enemyMul: { hp: 1.3, dmg: 0.5 },
    features: { ce: true, tree: true, shop: true, reroll: true, sig: true, mission: true },
    shop: { atMs: [35000], offers: [], only: false, price: null, mustBuy: false },
    mission: { id: "shingen", atMs: 8000, star: 3, durS: null, must: false },   // 受けても断ってもよい (= ここだけ強制しない)
    bond: { who: "shingen", unlock: ["item:robot"] }, bondOn: "missionClear",
    showGum: true,
    lines: { intro: "story.5-3.intro", mid: [{ on: "missionOffer", key: "story.5-3.offer" }, { on: "bond", key: "story.5-3.bond" }], clear: "story.5-3.clear" },
  },
  {
    id: "5-4", world: 5, hero: "keep", startExt: [],
    clear: { kind: "shadowDefeat" }, targetSec: 150,
    spawn: null, enemyMul: { hp: 0.8, dmg: 0.6 }, heroMul: { hp: 1.5 },   // 本番の湧き (= NORMAL のステージ 1 の表)。 痛さは W4 と同じくらい
    features: { ce: true, tree: true, shop: true, reroll: true, sig: true, items: ["heal"] },
    shop: { atMs: null, offers: [], only: false, price: null, mustBuy: false },
    heal: { below: 0.5 },
    shadow: { id: "xiangyu", giver: 893, mode: "defeat", atMs: 30000, hp: 2800, dmg: 16, speed: 55, moves: { slam: 4000, charge: 7000 }, first: { slam: 2500, charge: 5000 }, slam: { radius: 150, dmg: 18 } },   // 2,800 HP (= 本番の店 2 回ぶんの DPS 80〜120 で 25〜35 秒)
    bond: { who: "xiangyu", gifts: 3, burst: { ce: 200, cards: 3, heal: true, gum: 50 } },   // 本番の湧きの中なので厚め
    showGum: true,
    lines: { intro: "story.5-4.intro", mid: [{ on: "shadow", key: "story.5-4.mid" }], clear: "story.5-4.clear" },
  },
  {
    id: "5-5", world: 5, hero: "keep", startExt: [],
    clear: { kind: "boss" }, targetSec: 180,
    spawn: null, enemyMul: { hp: 1, dmg: 0.9 }, heroMul: { hp: 1.2 },
    features: { ce: true, tree: true, shop: true, reroll: true, sig: true, chests: true, pots: true, magicCards: true, rare: true, shooters: true, gimmick: true, variants: true, mission: true, items: ["heal", "magnet", "thunder", "watch", "robot"], bossChest: true },
    shop: { atMs: null, offers: [], only: false, price: null, mustBuy: false },
    chestTimesMs: null, rareAtMs: 20000, gimmick: "beads", variants: { giant: 0.1, runner: 0.1 }, mission: null,
    boss: { id: 681, atMs: 120000, warnMs: 10000, hpMul: 0.25, dmgMul: 0.6, thunder: false },   // COVID-19 15,000 HP (= 1 ステージぶんの装備の DPS 400〜600 で 25〜40 秒)。 作者 2026-10-22: ラスボスはファオではなく COVID
    unlock: "mode:NORMAL",
    sceneBefore: "final",   // 始める前に COVID のシーン
    sceneAfter: "ending",   // クリアの画面のあとにエンディングのシーン → マップ
    showGum: true,
    lines: { intro: "story.5-5.intro", mid: [{ on: "bossWarn", key: "story.5-5.mid" }], clear: "story.5-5.clear" },
  },
]);

/**
 * プロローグ (= SPEC-165 §3.z)。 ストーリーに入ると説明なしでいきなり始まり、 上のゴールへ走るだけ。 敵は出ない。
 * ゴールに着くとクリアの画面ではなく、 次元の裂け目 (= rift) → 暗転 → マインちゃんのシーン (= scene) → ワールドマップ。
 * id は "1-0" (= Ocean の背景を使う。 25 行には数えない。 allStoryIds には入れない)
 */
export const PROLOGUE = Object.freeze({
  id: "1-0", world: 1, hero: 10001, startExt: [{ extId: 10, level: 1 }],
  clear: { kind: "reach", points: [{ x: 0, y: -640 }], radius: 260 }, targetSec: 20,   // radius: 壁ぎわを走っても素通りしない (= 横いっぱい)
  // 敵は左右と下から数体だけ (= 追われてゴールへ走る感じ。 立ち止まっても死なない痛さ)
  spawn: { everyMs: 2600, pool: [101], max: 3, from: "sides" }, enemyMul: { hp: 0.6, dmg: 0.2 },
  bounds: { x: 240, yMax: 260 },   // 見えない壁 (= 左右 ±240・下は 260 まで。 上はゴールまで)
  features: {},
  showGum: false,
  scene: "prologue",   // ゴールに着いたら裂け目 → このシーン → ワールドマップ
  lines: { intro: "story.1-0.intro", mid: [{ on: "reach", key: "story.1-0.reach" }], clear: null },
});
export const STORY_MAP = Object.freeze({ ...Object.fromEntries(STORY_STAGES.map((s) => [s.id, s])), [PROLOGUE.id]: PROLOGUE });
/** プロローグを通ったか (= 進みの cleared に "1-0") */
export function prologueDone(progress) { return progress.cleared.includes(PROLOGUE.id); }

/** 全 25 の id (= 行が無いものも並ぶ。 ランドマップの丸) */
export function allStoryIds() {
  const out = [];
  for (const land of LANDS) for (let i = 1; i <= (STORY_PLAN[land.w] ?? 0); i++) out.push(`${land.w}-${i}`);
  return out;
}
/**
 * SPEC-174: チュートリアル (= ストーリー) の段 (= 共通基盤の tutorialStep。 管理画面の「チュートリアル」タブで離脱を見る)。
 * 0 = 始めた (= どれかのステージを初めて始めた)、 1 = プロローグ (1-0) をクリア、 2〜26 = 1-1〜5-5 をクリア (= 最後は id "done")
 * @returns {{ step: number, id: string } | null}
 */
export function tutorialStepOf(storyId) {
  if (storyId === "start") return { step: 0, id: "start" };
  if (storyId === PROLOGUE.id) return { step: 1, id: "s1-0" };
  const ids = allStoryIds(), i = ids.indexOf(String(storyId));
  if (i < 0) return null;
  return { step: i + 2, id: i === ids.length - 1 ? "done" : `s${ids[i]}` };
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
  if (feature === "ban") return !!(f.ban || f.reroll);   // お断りは 3-2 で教え、 リロールのある店 (= W5) でも使える
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
    shopTimesMs: f.shop && recipe.shop ? (recipe.shop.atMs === null ? null : [...recipe.shop.atMs]) : [],   // null = 本番の表
    spawnIntervalMs: recipe.spawn === null ? null : (recipe.spawn?.everyMs ?? 1200),   // null = 本番の式
    spawnFrom: recipe.spawn?.from ?? null,
    bounds: recipe.bounds ?? null,
    enemyHpMul: recipe.enemyMul?.hp ?? 1,
    enemyDmgMul: recipe.enemyMul?.dmg ?? 1,
    bossHpMul: boss?.hpMul ?? 1,
    bossDmgMul: boss?.dmgMul ?? 1,
    chestTimesMs: f.chests ? (recipe.chestTimesMs === null ? null : (recipe.chestTimesMs ?? [15000])) : [],   // null = 本番の表
    rareAtMs: f.rare ? (recipe.rareAtMs ?? 5000) : null,
    missionAtMs: f.mission ? (recipe.mission?.atMs ?? null) : null,
    missionFree: !!f.mission && recipe.mission === null,   // 本番の持ちかけ (= 5-5)
    missionId: recipe.mission?.id ?? null, missionStar: recipe.mission?.star ?? 1, missionDurS: recipe.mission?.durS ?? null, missionMust: !!recipe.mission?.must,
    variants: f.variants ? (recipe.variants ?? null) : null,
    gimmick: f.gimmick ? (recipe.gimmick ?? null) : null,
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

/** 持ち物を整える (= 壊れていたら null。 純関数) */
export function normalizeLoadout(o) {
  if (!o || typeof o !== "object") return null;
  const owned = Array.isArray(o.owned) ? o.owned.filter((x) => x && Number.isFinite(Number(x.extId))).map((x) => ({ extId: Number(x.extId), level: Math.max(1, Number(x.level) | 0) })) : [];
  return {
    hero: Number.isFinite(Number(o.hero)) ? Number(o.hero) : STORY_HERO,
    owned,
    ce: Math.max(0, Number(o.ce) || 0),
    sigLevel: Math.max(1, Number(o.sigLevel) | 0 || 1),
    sigCe: Math.max(0, Number(o.sigCe) || 0),
  };
}

/** 進みを読む (= 壊れていたら空。 純関数: storage を渡せる) */
export function loadStory(storage = _storage()) {
  try {
    const o = JSON.parse(storage?.getItem(LS_STORY) ?? "{}") ?? {};
    return {
      cleared: Array.isArray(o.cleared) ? o.cleared.filter((x) => typeof x === "string") : [],
      best: o.best && typeof o.best === "object" ? o.best : {},
      bonds: Array.isArray(o.bonds) ? o.bonds.filter((x) => typeof x === "string") : [],
      loadout: normalizeLoadout(o.loadout),   // 作者 2026-10-22: 装備と CE はストーリーのあいだ残る (= タイトルに戻っても)
    };
  } catch { return { cleared: [], best: {}, bonds: [], loadout: null }; }
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
/** 次のステージが同じランドか (= 違えば結果の画面は「マップへ」だけ。 純関数) */
export function nextInSameLand(id) {
  const n = nextStoryId(id);
  return !!n && n.split("-")[0] === String(id).split("-")[0];
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
/** 持ち物を覚える (= クリアした瞬間の装備・CE・固有スキルの段。 純関数) */
export function withLoadout(progress, loadout) {
  return { ...progress, loadout: normalizeLoadout(loadout) };
}
/**
 * ステージの開始装備 (= 覚えている持ち物に、 レシピの開始装備を重ねる。 同じ品は高い段のほう。 純関数)
 *   W1〜W2 のレシピは「このステージはこれを持って始める」の底 (= 店で買った人はそのまま、 買わずに来た人にも渡す)
 */
export function mergeStartExt(saved = [], startExt = []) {
  const out = [];
  const put = (o) => {
    const id = Number(o.extId), lv = Math.max(1, Number(o.level) | 0);
    const hit = out.find((x) => x.extId === id);
    if (hit) hit.level = Math.max(hit.level, lv); else out.push({ extId: id, level: lv });
  };
  for (const o of startExt ?? []) put(o);
  for (const o of saved ?? []) put(o);
  return out;
}

/** クリアを保存する (= battle 側から。 返す: 新しい進み) */
export function markStoryCleared(id, best = {}) {
  const p = withCleared(loadStory(), id, best);
  saveStory(p);
  return p;
}
/** 持ち物を保存する (= クリアの瞬間に battle 側から) */
export function markStoryLoadout(loadout) {
  const p = withLoadout(loadStory(), loadout);
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
export function reachedPoint(pt, px, py, radius = REACH_RADIUS) {
  return !!pt && Math.hypot((px ?? 0) - pt.x, (py ?? 0) - pt.y) <= radius;
}

/**
 * クリアしたか。 ctx: { kills, elapsedMs, px, py, ce, bossDefeated, reachIdx }
 */
export function storyCleared(recipe, ctx) {
  const c = recipe?.clear;
  if (!c) return false;
  if (recipe.require && !(ctx.picked?.has?.(recipe.require.replace(/^item:/, "")))) return false;   // 1-4: パンケーキを取るまで
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
