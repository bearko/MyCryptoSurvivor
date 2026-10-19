// ============================================================
// hero-unlock.js — ヒーローの解放をアチーブメントで (= SPEC-098)
// ============================================================
//
// ヒーロー X は、 bearko.games のヒーロー名鑑で X を絵に持つアチーブメントを獲得すると解放される。
// 最初の 2 人 ＋ 本作のアチーブメントで 4 人 ＋ ほかのタイトルで 4 人。
// 解放した人はこの端末にも覚える (= 通信できないときも選べる)。
// 上半分は純関数 (= テストする)。 下半分が SDK と localStorage。

/** 最初から使える 2 人 (= ブレードとリボルバー) */
export const STARTER_HEROES = [10001, 4006];

/**
 * heroId → 解放するアチーブメント。 並びは「次の仲間」で案内する順 (= 本作の 4 人 → ほかのタイトルの近い順)。
 * 名鑑の絵は共通基盤の台帳 (= bearko/mycryptoportfolio platform/trophies.js。 SPEC-008 5.3) と同じ人
 */
export const HERO_UNLOCKS = [
  // achievement: アチーブメントの名前 (= そのヒーローのパッシブスキル名。 資産リポジトリから)
  { heroId: 2043, trophy: "survivor.awaken",   game: "survivor",  achievement: { ja: "忍術・毒霧", en: "Ninjutsu-Dokugiri" } },          // 霧隠才蔵
  { heroId: 2016, trophy: "survivor.stage2",   game: "survivor",  achievement: { ja: "幻の生存者", en: "Phantom Survivor" } },           // アナスタシア
  { heroId: 2003, trophy: "survivor.tree5",    game: "survivor",  achievement: { ja: "ランゲルライン", en: "Langer's Line" } },          // ジャックザリッパー
  { heroId: 4041, trophy: "survivor.clear",    game: "survivor",  achievement: { ja: "テスラコイル", en: "Tesla coil" } },               // ニコラ・テスラ
  { heroId: 1006, trophy: "education.hero1",   game: "education", achievement: { ja: "テトラクテュス", en: "Tetractys" } },              // ピタゴラス
  { heroId: 1007, trophy: "workshop.day1",     game: "workshop",  achievement: { ja: "李氏朝鮮、宮廷医女", en: "Joseon dynasty's Uinyeo" } },   // 大長今
  { heroId: 2013, trophy: "fortress.boss10",   game: "fortress",  achievement: { ja: "虎痴", en: "Sense of Tiger" } },                   // 許褚
  { heroId: 4052, trophy: "factory.legendary", game: "factory",   achievement: { ja: "女王直属海賊", en: "Pirates under the Queen" } },   // フランシス・ドレーク
];

/** ほかのタイトルの名前と場所 (= 共通基盤の GAME_NAMES / GAME_HOSTS) */
export const GAME_TITLES = {
  survivor:  { name: "MyCryptoSurvivor",  url: "https://survivor.bearko.games/" },
  education: { name: "MyCryptoEducation", url: "https://education.bearko.games/" },
  workshop:  { name: "MyCryptoWorkshop",  url: "https://workshop.bearko.games/" },
  fortress:  { name: "MyCryptoFortress",  url: "https://fortress.bearko.games/" },
  factory:   { name: "MyCryptoFactory",   url: "https://factory.bearko.games/" },
};

/** そのヒーローの解放の条件 (= 最初から使える人は null) */
export function unlockOf(heroId) {
  return HERO_UNLOCKS.find((u) => u.heroId === Number(heroId)) ?? null;
}

/** アチーブメントの ID → 解放されるヒーロー (= 無ければ null) */
export function heroForTrophy(trophyId) {
  return HERO_UNLOCKS.find((u) => u.trophy === trophyId)?.heroId ?? null;
}

/**
 * 使えるヒーロー。 持っているアチーブメントの ID と、 この端末が覚えている人から。
 * @param {Iterable<string>} ownedTrophyIds
 * @param {Iterable<number>} remembered
 * @returns {Set<number>}
 */
export function unlockedHeroes(ownedTrophyIds = [], remembered = []) {
  const owned = new Set(ownedTrophyIds);
  const out = new Set(STARTER_HEROES);
  for (const u of HERO_UNLOCKS) if (owned.has(u.trophy)) out.add(u.heroId);
  for (const id of remembered) if (STARTER_HEROES.includes(Number(id)) || unlockOf(id)) out.add(Number(id));
  return out;
}

/** 「次の仲間」: まだ解放していない人のうち、 案内する順でいちばん前 (= 全員そろったら null) */
export function nextUnlock(unlocked) {
  return HERO_UNLOCKS.find((u) => !unlocked.has(u.heroId)) ?? null;
}

// ---- この端末に覚える・共通基盤から読む ----

export const LS_HERO_UNLOCKED = "mcs.heroes.unlocked";

let _unlocked = null;
const _listeners = [];

function _loadRemembered() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_HERO_UNLOCKED) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

function _save() {
  try { localStorage.setItem(LS_HERO_UNLOCKED, JSON.stringify([..._unlocked].filter((id) => !STARTER_HEROES.includes(id)))); } catch (_) { /* 保存できなくても遊べる */ }
}

/** いま使えるヒーロー (= Set<heroId>) */
export function getUnlockedHeroes() {
  if (!_unlocked) _unlocked = unlockedHeroes([], _loadRemembered());
  return _unlocked;
}

export function isHeroUnlocked(heroId) {
  return getUnlockedHeroes().has(Number(heroId));
}

/** 解放されたら呼ばれる (= 新しく解放された heroId の配列) */
export function onHeroesUnlocked(fn) {
  _listeners.push(fn);
}

/** アチーブメントの ID から解放を足す。 新しく解放された heroId を返す */
export function noteTrophies(trophyIds) {
  const before = getUnlockedHeroes();
  const next = unlockedHeroes(trophyIds, before);
  const added = [...next].filter((id) => !before.has(id));
  if (added.length === 0) return [];
  _unlocked = next;
  _save();
  for (const fn of _listeners) { try { fn(added); } catch (e) { console.warn("[hero-unlock]", e); } }
  return added;
}

/** 共通基盤から、 持っているアチーブメントを読み直す (= 起動時・タブに戻ったとき)。 SDK が無ければ何もしない */
export async function refreshHeroUnlocks() {
  const bg = typeof window !== "undefined" ? window.BearkoGames : undefined;
  if (!bg || typeof bg.getTrophies !== "function") return [];
  try {
    const r = await bg.getTrophies();
    if (!r?.ok && !Array.isArray(r?.trophies)) return [];
    return noteTrophies((r.trophies ?? []).map((t) => t.id));
  } catch (_) {
    return [];
  }
}

export function _resetHeroUnlocksForTest() {
  _unlocked = null;
  _listeners.length = 0;
}
