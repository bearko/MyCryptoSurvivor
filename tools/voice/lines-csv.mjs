// tools/voice/lines-csv.mjs — マインちゃんの日本語のセリフを 1 列の CSV に (= SPEC-153。 作者が録る・直す台本)
// 使い方: node tools/voice/lines-csv.mjs  → docs/voice/script-mine.csv (= 文だけ) と docs/voice/script-mine-keys.txt (= key と文)
import { readFileSync, writeFileSync } from "node:fs";
const ui = JSON.parse(readFileSync(new URL("../../data/i18n/ui.json", import.meta.url), "utf8"));
const PREFIXES = ["navi.", "lesson.", "advice.", "telop.navi."];
const SKIP = new Set(["lesson.next"]);
const rows = Object.entries(ui)
  .filter(([k]) => PREFIXES.some((p) => k.startsWith(p)) && !SKIP.has(k))
  .map(([k, v]) => [k, (typeof v === "string" ? v : v?.ja) ?? ""])
  .filter(([, ja]) => ja.trim());
writeFileSync(new URL("../../docs/voice/script-mine.csv", import.meta.url), "\ufeff" + rows.map(([, ja]) => `"${ja.replace(/\n/g, " ").replace(/"/g, '""')}"`).join("\n") + "\n");
writeFileSync(new URL("../../docs/voice/script-mine-keys.txt", import.meta.url), rows.map(([k, ja]) => `${k}\t${ja.replace(/\n/g, " ")}`).join("\n") + "\n");
console.log(`${rows.length} lines`);
