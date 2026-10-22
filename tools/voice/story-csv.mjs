// tools/voice/story-csv.mjs — ストーリーモード (= SPEC-165) の日本語のセリフを 1 列の CSV に (= 作者が録る台本)
// 使い方: node tools/voice/story-csv.mjs
//   docs/voice/script-story-mine.csv    … マインちゃんのセリフ (= 文だけ。 1 行 1 セリフ。 文の中に改行は入れない)
//   docs/voice/script-story-others.csv  … 相手のセリフ (= シャドーの一言・COVID-19)
//   docs/voice/script-story-keys.txt    … key と話し手と文 (= どの場面かを追うため)
//   docs/voice/script-story-add.csv     … まだ録音の無いマインちゃんの文だけ (= 追加で録る台本。 1 から番号を振って「番号-…-mine_add2.wav」で tools/voice/build.mjs --story-add)
//   docs/voice/script-story-add-keys.txt … その key (= build.mjs --story-add が番号 → key に使う。 並びは add.csv と同じ)
// 順番は遊ぶ順 (= モード選択 → プロローグ → 1-1 … 5-5 → エンディング)。 UI の文 (= 札・条件・報酬の欄) は入れない
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { allStoryIds, STORY_MAP, LANDS } from "../../js/story.js";

const ui = JSON.parse(readFileSync(new URL("../../data/i18n/ui.json", import.meta.url), "utf8"));
const ja = (k) => { const v = ui[k]; return ((typeof v === "string" ? v : v?.ja) ?? "").replace(/\s*\{[^}]+\}\s*/g, "").replace(/\s*\n\s*/g, " ").trim(); };   // {gum} のような差し込みは読めないので抜く (= story.treeNudge)
const SCENE_SPEAKER = { prologue: [], final: ["covid", "covid", "mine"], ending: ["covid", "mine", "mine"] };   // js/story-map.js と同じ
const rows = [];   // [key, who, text]
const seen = new Set();
const push = (k, who = "mine") => { const s = ja(k); if (s && !seen.has(k)) { seen.add(k); rows.push([k, who, s]); } };   // 同じ相手が 2 度出ても (= 呂布 1-5 / 2-5) 1 回
const sceneRows = (id) => { for (let i = 1; i <= 12; i++) { const k = `story.scene.${id}.${i}`; if (!ja(k)) break; push(k, SCENE_SPEAKER[id]?.[i - 1] ?? "mine"); } };

push("navi.mode.story");
sceneRows("prologue");
for (const id of allStoryIds()) {
  const r = STORY_MAP[id];
  if (r?.sceneBefore) sceneRows(r.sceneBefore);
  // そのステージの文 (= name 以外。 intro → 途中 (レシピの並び) → clear)
  const keys = Object.keys(ui).filter((k) => k.startsWith(`story.${id}.`) && !k.endsWith(".name"));
  const order = (k) => (k.endsWith(".intro") ? 0 : k.endsWith(".clear") ? 2 : 1);
  for (const k of keys.sort((a, b) => order(a) - order(b))) push(k);
  if (r?.shadow?.id) for (const s of ["appear", "win", "lose"]) push(`shadow.${r.shadow.id}.${s}`, r.shadow.id);
  const land = LANDS.find((l) => l.w === r?.world);
  const last = allStoryIds().filter((x) => STORY_MAP[x]?.world === r?.world).at(-1) === id;
  if (last && land) push(`story.map.freed.${land.id}`);
  if (r?.sceneAfter) sceneRows(r.sceneAfter);
}
push("story.lose");
// 1 回目の録音 (= 1〜49 本目) のあとに足した分 (= 番号を変えないよう末尾に。 プロローグ 1-0 の 2 本・結果画面の木の促し)
for (const k of ["story.1-0.intro", "story.1-0.reach", "story.treeNudge"]) push(k);

const csv = (list) => "\ufeff" + list.map(([, , l]) => `"${l.replace(/"/g, '""')}"`).join("\n") + "\n";
const mine = rows.filter((r) => r[1] === "mine"), others = rows.filter((r) => r[1] !== "mine");
writeFileSync(new URL("../../docs/voice/script-story-mine.csv", import.meta.url), csv(mine));
writeFileSync(new URL("../../docs/voice/script-story-others.csv", import.meta.url), csv(others));
writeFileSync(new URL("../../docs/voice/script-story-keys.txt", import.meta.url), rows.map(([k, w, l]) => `${k}\t${w}\t${l}`).join("\n") + "\n");
// まだ録音の無いマインちゃんの文 (= 追加で録る台本。 MP3 が assets/voice/mine/<key>.mp3 に無いもの)
const add = mine.filter(([k]) => !existsSync(new URL(`../../assets/voice/mine/${k}.mp3`, import.meta.url)));
writeFileSync(new URL("../../docs/voice/script-story-add.csv", import.meta.url), csv(add));
writeFileSync(new URL("../../docs/voice/script-story-add-keys.txt", import.meta.url), add.map(([k, , l]) => `${k}\t${l}`).join("\n") + "\n");
console.log(`mine ${mine.length} lines / others ${others.length} lines / まだ録音の無い mine ${add.length} lines → script-story-add.csv`);
