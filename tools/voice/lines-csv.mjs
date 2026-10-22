// tools/voice/lines-csv.mjs — マインちゃんの日本語のセリフを 1 列の CSV に (= SPEC-153 / SPEC-155。 作者が録る・直す台本)
// 使い方: node tools/voice/lines-csv.mjs  → docs/voice/script-mine.csv (= 文だけ) と docs/voice/script-mine-keys.txt (= key と文)
// SPEC-155: {stage} や {name} などの変数は、 実際に読む語に展開する (= ステージごと・ヒーローごとに 1 行ずつ。 発声できる文にする)
import { readFileSync, writeFileSync } from "node:fs";
import { STAGE_TABLE, HERO_STARTING_WEAPON } from "../../js/constants.js";
import { NODE_MAP } from "../../js/skill-data.js";
import { ADVICE_NODES } from "../../js/battle/run-stats.js";

const ui = JSON.parse(readFileSync(new URL("../../data/i18n/ui.json", import.meta.url), "utf8"));
const heroes = JSON.parse(readFileSync(new URL("../../data/heroes.json", import.meta.url), "utf8"));
const exts = JSON.parse(readFileSync(new URL("../../data/extensions.json", import.meta.url), "utf8"));
const heroList = heroes.heroes ?? heroes;
const extList = Array.isArray(exts) ? exts : (exts.extensions ?? Object.values(exts));
const ja = (v) => (typeof v === "string" ? v : v?.ja) ?? "";
const stageName = (i) => ja(ui[STAGE_TABLE[i]?.nameKey]);
const weaponName = (extId) => { const e = extList.find((x) => String(x.extId ?? x.id) === String(extId)); return e ? (e.seriesName?.ja ?? e.tierNames?.[0]?.ja ?? "") : ""; };
const nodeName = (id) => NODE_MAP[id]?.name?.ja ?? id;
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** key → [[variant, vars]] (= 変数のある文の展開。 無いものは 1 行) */
function variants(key) {
  if (key === "navi.stage.first") return [["stage1", { stage: stageName(0) }]];
  if (key === "navi.stage.next") return STAGE_TABLE.slice(1, -1).map((s, i) => [`stage${i + 2}`, { stage: stageName(i + 1) }]);
  if (key === "navi.stage.last") return [[`stage${STAGE_TABLE.length}`, { stage: stageName(STAGE_TABLE.length - 1) }]];
  if (key === "navi.hero.pick") return heroList.map((h) => [`hero${h.heroId}`, { name: ja(h.name), weapon: weaponName(HERO_STARTING_WEAPON[h.heroId]) }]);
  if (key.startsWith("advice.")) { const [a, b] = ADVICE_NODES[key] ?? []; return [["", { a: a ? nodeName(a) : "", b: b ? nodeName(b) : "" }]]; }
  return [["", {}]];
}

const PREFIXES = ["navi.", "advice.", "telop.navi."];   // SPEC-165: レッスン (lesson.) は撤去。 ストーリーの台本は tools/voice/story-csv.mjs
const SKIP = new Set();
const rows = [];
for (const [k, v] of Object.entries(ui)) {
  if (!PREFIXES.some((p) => k.startsWith(p)) || SKIP.has(k)) continue;
  const text = ja(v);
  if (!text.trim()) continue;
  for (const [variant, vars] of variants(k)) {
    const line = fill(text, vars).replace(/\n/g, " ");
    rows.push([variant ? `${k}#${variant}` : k, line]);
  }
}
const left = rows.filter(([, l]) => /\{\w+\}/.test(l));
if (left.length) { console.error("変数が残っている:", left.map(([k]) => k).join(", ")); process.exit(1); }
writeFileSync(new URL("../../docs/voice/script-mine.csv", import.meta.url), "\ufeff" + rows.map(([, l]) => `"${l.replace(/"/g, '""')}"`).join("\n") + "\n");
writeFileSync(new URL("../../docs/voice/script-mine-keys.txt", import.meta.url), rows.map(([k, l]) => `${k}\t${l}`).join("\n") + "\n");
console.log(`${rows.length} lines`);
