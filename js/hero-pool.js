// ============================================================
// hero-pool.js — サブに選べるヒーロー (= SPEC-166 §4.7)
// ============================================================
//
// サブはメインとは別に、 bearko.games のアチーブメントで解放したあらゆる MCH ヒーローから選べる (= 作者 2026-10-23。 JIN の幅を広げるため)。
// 台帳は data/hero-pool.json (= MCH の図鑑の 201 人。 tools/data/build-hero-pool.mjs が作る)。
// 解放した人 = 本作で使えるヒーロー ＋ 共通基盤で持っているヒーローのアチーブメントの絵 (= trophy.avatar の hero:NNNN)。
// テスト用のサイトでは全員。

import { loadJson } from "./data-loader.js";
import { getHero, localizedHeroName } from "./heroes.js";
import { isTestSite } from "./team.js";

export const LS_ACHIEVED_HEROES = "mcs.heroes.achieved";
const POOL = { attrs: {}, heroes: [], byId: new Map() };

export function loadHeroPool() {
  return loadJson("heroPool", "./data/hero-pool.json", (raw) => {
    POOL.attrs = raw?.attrs ?? {};
    POOL.heroes = Array.isArray(raw?.heroes) ? raw.heroes : [];
    POOL.byId = new Map(POOL.heroes.map((h) => [Number(h.id), h]));
    return POOL;
  });
}

export function poolAttrs() { return POOL.attrs; }

/** そのヒーロー (= 台帳に無い本作の人 = MCHウォーリアーは、 アトリビュート無しで本作のデータから) */
export function poolHero(id) {
  const n = Number(id);
  const h = POOL.byId.get(n);
  if (h) return h;
  const r = getHero(n);
  return r ? { id: n, name: r.name, rarity: r.rarity, faction: r.faction, attrs: [], stats: r.stats ?? {} } : null;
}

export function poolHeroName(h, lang) {
  if (!h) return "";
  return localizedHeroName({ name: h.name }, lang);
}

/** アチーブメントの一覧 (= SDK の getTrophies の trophies か、 onTrophy の def) から、 ヒーローの絵を覚える */
export function noteAchievedHeroes(trophies, storage = globalThis.localStorage) {
  const ids = (trophies ?? []).map((t) => /^hero:(\d+)$/.exec(String(t?.avatar ?? ""))?.[1]).filter(Boolean).map(Number);
  if (!ids.length) return;
  const set = new Set([...loadAchievedHeroes(storage), ...ids]);
  try { storage?.setItem(LS_ACHIEVED_HEROES, JSON.stringify([...set])); } catch (_) { /* 保存できなくても遊べる */ }
}

export function loadAchievedHeroes(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(LS_ACHIEVED_HEROES) ?? "[]"); return Array.isArray(v) ? v.map(Number) : []; } catch (_) { return []; }
}

/** サブに選べる人 (= Set<heroId>)。 roster = 本作で使えるヒーロー */
export function subPoolIds(roster) {
  if (isTestSite()) return new Set([...roster, ...POOL.heroes.map((h) => Number(h.id))]);
  return new Set([...roster, ...loadAchievedHeroes()].filter((id) => poolHero(id)));
}
