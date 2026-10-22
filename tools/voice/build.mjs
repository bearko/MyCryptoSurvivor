// マインちゃんのボイス (= SPEC-085) を WAV から MP3 にし、 js/voice-lines.js (= セリフ → ファイルと長さ) を書く
//   node tools/voice/build.mjs <WAV のフォルダ>            … 台本の全部 (= ORDER)
//   node tools/voice/build.mjs <WAV のフォルダ> --added    … 追加の録音 (= 「…_added.wav」。 ADDED) だけ変換して、 いまの一覧に足す
//   node tools/voice/build.mjs <WAV のフォルダ> --lessons  … SPEC-147: EASY のレッスン (= 「番号-…_lesson.wav」。 LESSONS)
//   node tools/voice/build.mjs <WAV のフォルダ> --added4   … SPEC-159: 4 回目 (= 「番号-…-mine_added.wav」。 ADDED_4。 null は既存を優先して捨てる)
//   node tools/voice/build.mjs <WAV のフォルダ> --story    … SPEC-165: ストーリーの台本 (= 「番号-…-mine_add.wav」。 番号 1 から = docs/voice/script-story-keys.txt の mine の行の並び。 0 は mission.1 で既存)
//   node tools/voice/build.mjs <WAV のフォルダ> --story-add … SPEC-165: ストーリーの追加の録音 (= 「番号-…-mine_add2.wav」。 番号 1 から = docs/voice/script-story-add-keys.txt の並び。 story-csv.mjs が「まだ録音の無い文」から作る)
//   WAV は「番号-セリフ-….wav」 (= 番号は 00 がタイトルコール、 01 から ORDER の並び。 作者の台本の CSV と同じ)。
//   ffmpeg / ffprobe が要る (= このツールだけ。 ゲームは MP3 を読むだけ)
import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** 番号の並び (= 00 から)。 ボイスの名前 = ファイル名 (= assets/voice/mine/<名前>.mp3) */
export const ORDER = [
  "title.call",
  "title.1", "title.2", "tap.1", "tap.2", "tap.3", "tap.4",
  "mode.1", "mode.2",
  "hero.open",
  "hero.1001", "hero.1002", "hero.1004", "hero.1006", "hero.2001", "hero.2002", "hero.2005", "hero.2011", "hero.2012", "hero.2013",
  "stage.1", "stage.2", "stage.3", "stage.rta",
  "tip.item.heal", "tip.item.magnet", "tip.item.watch", "tip.item.thunder", "tip.item.card",
  "tip.gimmick.beads", "tip.gimmick.punch", "tip.gimmick.trojan", "tip.enemy.shooter",
  "boss",
  "tip.item.bossChest",
];

/**
 * SPEC-097: 追加の録音 (= 2026-10-19。 作者の台本の「…_added」。 番号は 0 から)。 ヒーローの顔ぶれを変えたぶん。
 * 許褚 (= hero.2013) は武器が変わったので録り直し (= ORDER の場所はそのまま、 ファイルを差し替える)
 */
export const ADDED = [
  "hero.10001", "hero.4006", "hero.2043", "hero.2016", "hero.2003", "hero.4041", "hero.1007", "hero.2013", "hero.4052",
];

/**
 * SPEC-116: 2 回目の追加の録音 (= 2026-10-20。 番号は 0 から。 台本は docs/voice/script-added2.csv)。
 * 倒れたときのひとことと、 スキルツリーの案内。 作者のファイル名は「番号-セリフ-MyCryptoSurvivors_tutorial_skilltree.wav」
 * (= アンダースコアが使えないのでハイフンで区切る)
 */
export const ADDED_2 = [
  "lose.guide", "lose.1", "lose.2", "lose.3",
  "tree.intro.1", "tree.intro.2", "tree.root", "tree.first", "tree.noGum", "tree.done", "tree.claimable", "tree.idle", "tree.hint",
];

/**
 * 3 回目の追加の録音 (= 2026-10-20。 「…_added3.wav」。 番号は 0 から)。 SPEC-115 の最初の店の説明と、
 * tree.first の録り直し (= 「緑に光っているのが強化できるスキルだよ」。 ADDED_2 の同じ名前を差し替える)
 */
export const ADDED_3 = ["shop.intro", "tree.first"];

/**
 * SPEC-147: EASY のレッスン (= 「…_lesson.wav」。 番号は 0 から。 台本は docs/voice/script-lessons.csv)。
 * 名前は lesson.<番号> (= SPEC-165 で EASY は撤去。 録音は残し、 RETIRED_VOICES で鳴らさない)
 */
export const LESSONS = [
  "lesson.s1.move", "lesson.s1.ce", "lesson.s1.shop", "lesson.s1.boss", "lesson.s1.clear",
  "lesson.s2.start", "lesson.s2.rare", "lesson.s2.gift", "lesson.s2.mission", "lesson.s2.reward", "lesson.s2.boss",
  "lesson.s2.lose", "lesson.s2.root", "lesson.s2.thunder", "lesson.s2.clear",
];

/**
 * SPEC-159: 4 回目の追加の録音 (= 2026-10-21。 「番号-…-mine_added.wav」。 番号は 00 から。 台本は docs/voice/script-mine-keys.txt の並びそのもの)。
 * 89 本のうち、 もう同じセリフのボイスがあるもの (= タイトル・ヒーローの紹介・ステージ・ひとこと…) は null (= 既存を優先して捨てる)。
 * 新しいのは ミッション 2・復活 1・木から戻った 2・EASY のすすめ 1・レッスン 15・おすすめ 6・EASY のステージ 1・ボスの予告 1・テロップ 3 (= 32 本)
 */
export const ADDED_4 = [
  "mission.1", "mission.2", "revive.intro", "afterTree.bought", "afterTree.none", "mode.easy", "lesson.s1.move", "lesson.s1.ce", "lesson.s1.shop", "lesson.s1.boss",
  "lesson.s1.clear", "lesson.s2.start", "lesson.s2.rare", "lesson.s2.gift", "lesson.s2.mission", "lesson.s2.reward", "lesson.s2.boss", "lesson.s2.lose", "lesson.s2.root", "lesson.s2.thunder",
  "lesson.s2.clear", "advice.shot", "advice.crowdDps", "advice.crowdMove", "advice.boss", "advice.gimmick", "advice.hp", null, null, null,
  null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, "stage.1.easy",
  "boss.warn", null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, "telop.clear", "telop.allClear", "telop.lose",
];

/** SPEC-165: ストーリーの台本 (= 2026-10-22〜。 作者が「セリフ集」として何回かに分けて録る。 名前は文の key そのもの。 0 番は mission.1 の録り直しで既存を優先して捨てる) */
export const STORY = [null, ...readFileSync("docs/voice/script-story-keys.txt", "utf8").trim().split("\n").map((l) => l.split("\t")).filter((c) => c[1] === "mine").map((c) => c[0])];
/** SPEC-165: ストーリーの追加の録音 (= 1 回目 (103 本) のあとに足した文。 番号 1 から = docs/voice/script-story-add-keys.txt の並び。 --story の番号とは別) */
export const STORY_ADD = [null, ...readFileSync("docs/voice/script-story-add-keys.txt", "utf8").trim().split("\n").filter(Boolean).map((l) => l.split("\t")[0])];

const OUT_DIR = "assets/voice/mine";
const src = process.argv[2];
const added2 = process.argv.includes("--added2");   // SPEC-116: 2 回目の追加の録音
const added3 = process.argv.includes("--added3");   // 3 回目の追加の録音
const lessons = process.argv.includes("--lessons");   // SPEC-147: EASY のレッスン
const added4 = process.argv.includes("--added4");   // SPEC-159: 4 回目の追加の録音
const storyAdd = process.argv.includes("--story-add");   // SPEC-165: ストーリーの追加の録音
const story = process.argv.includes("--story") || storyAdd;   // SPEC-165: ストーリーの台本
const added = added2 || added3 || added4 || lessons || story || process.argv.includes("--added");   // 追加の録音だけ変換し、 いまの一覧に足す
const BATCH = storyAdd ? STORY_ADD : (story ? STORY : (added4 ? ADDED_4 : (lessons ? LESSONS : (added3 ? ADDED_3 : (added2 ? ADDED_2 : ADDED)))));
const SUFFIX_ADDED2 = /-MyCryptoSurvivors_tutorial_skilltree\.wav$/i;
const SUFFIX_ADDED4 = /-mine_added\.wav$/i;
const SUFFIX_STORY = /-mine_add\.wav$/i;
const SUFFIX_STORY_ADD = /-mine_add2?\.wav$/i;   // 「mine_add2」でも「mine_add」でも (= 別のフォルダで渡される前提)
const SUFFIX = storyAdd ? SUFFIX_STORY_ADD : story ? SUFFIX_STORY : (added4 ? SUFFIX_ADDED4 : (lessons ? /_lesson\.wav$/i : (added3 ? /_added3\.wav$/i : (added2 ? SUFFIX_ADDED2 : /_added\.wav$/i))));
if (!src) { console.error("usage: node tools/voice/build.mjs <wav dir> [--added | --added2 | --added3 | --lessons | --added4 | --story | --story-add]"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });
const wavs = readdirSync(src).filter((f) => /^\d+-.*\.wav$/i.test(f) && (added ? SUFFIX.test(f) : !/_added\d*\.wav$/i.test(f) && !SUFFIX_ADDED2.test(f)));
const lines = added ? { ...(await import("../../js/voice-lines.js")).VOICE_LINES } : {};
for (const f of wavs) {
  const n = Number(f.split("-")[0]);
  if ((added4 || story) && n < BATCH.length && BATCH[n] === null) continue;   // SPEC-159 / SPEC-165: 既存のボイスを優先して捨てる
  const id = (added ? BATCH : ORDER)[n];
  if (!id) throw new Error(`番号 ${n} のボイスの名前がない: ${f}`);
  const out = join(OUT_DIR, `${id}.mp3`);
  // モノラル・44.1kHz・64kbps (= 声だけなので十分。 1 本 20〜40KB)
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(src, f), "-ac", "1", "-ar", "44100", "-b:a", "64k", "-map_metadata", "-1", out]);
  const sec = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
  lines[id] = { file: out, ms: Math.round(sec * 1000) };
}
const ALL = [...new Set([...ORDER, ...ADDED, ...ADDED_2, ...ADDED_3, ...LESSONS, ...ADDED_4.filter(Boolean), ...STORY.filter(Boolean), ...STORY_ADD.filter(Boolean)])];
const missing = (added ? BATCH : ORDER).filter((id) => id && !lines[id]);
if (missing.length && !story) throw new Error(`WAV がない: ${missing.join(", ")}`);   // ストーリーは何回かに分けて録るので、 無いぶんは文だけ
if (story && missing.length) console.log(`まだ無い: ${missing.length} 本 (= 文だけで出る)`);
const body = ALL.filter((id) => lines[id]).map((id) => `  "${id}": ${JSON.stringify(lines[id])},`).join("\n");
writeFileSync("js/voice-lines.js", `// ============================================================
// voice-lines.js — マインちゃんのボイスの一覧 (= SPEC-085)。 tools/voice/build.mjs が書く (= 手で直さない)
// ============================================================
// 名前 → { file: MP3 のパス, ms: 長さ }

export const VOICE_LINES = {
${body}
};
`);
console.log(`${wavs.length} 本を ${OUT_DIR} に書いた`);
