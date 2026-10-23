// tools/data/build-hero-pool.mjs — サブに選べるヒーローの台帳 (= SPEC-166 §4.7)
// 使い方: node tools/data/build-hero-pool.mjs /path/to/mycryptoheroes   → data/hero-pool.json
// MCH の図鑑に出るヒーロー (= 4 桁の id) の 名前・レアリティ・勢力・アトリビュート・ステータス と、
// アトリビュートごとの「持っている人数」(= 少ないほど JIN が強い)。 絵は raw URL で引く (= ここには入れない)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.argv[2];
if (!repo) { console.error("usage: node tools/data/build-hero-pool.mjs <mycryptoheroes の clone>"); process.exit(1); }
const raw = JSON.parse(readFileSync(join(repo, "Data/Heroes/heroes.json"), "utf8"));
const heroes = raw.filter((h) => h.is_dictionary_visible && String(h.id).length === 4).sort((a, b) => a.id - b.id);
const attrs = {};
for (const h of heroes) for (const a of h.attributes ?? []) {
  attrs[a.id] ??= { ja: a.name.ja, en: a.name.en, n: 0 };
  attrs[a.id].n += 1;
}
const out = {
  version: 1,
  note: "SPEC-166: MCH の図鑑のヒーロー (= bearko/mycryptoheroes Data/Heroes/heroes.json) から tools/data/build-hero-pool.mjs が作る。 手で直さない",
  attrs,
  heroes: heroes.map((h) => ({
    id: h.id,
    name: { ja: h.name.ja, en: h.name.en },
    rarity: h.rarity?.name ?? "",
    faction: h.faction?.name?.en ?? "",
    attrs: (h.attributes ?? []).map((a) => a.id),
    stats: { hp: h.max_level_stats?.hp ?? 0, phy: h.max_level_stats?.phy ?? 0, int: h.max_level_stats?.int ?? 0, agi: h.max_level_stats?.agi ?? 0 },
  })),
};
writeFileSync(new URL("../../data/hero-pool.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`heroes ${out.heroes.length} / attrs ${Object.keys(attrs).length}`);
