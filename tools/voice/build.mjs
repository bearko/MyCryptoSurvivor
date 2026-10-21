// マインちゃんのボイス (= SPEC-085) を WAV から MP3 にし、 js/voice-lines.js (= セリフ → ファイルと長さ) を書く
//   node tools/voice/build.mjs <WAV のフォルダ>            … 台本の全部 (= ORDER)
//   node tools/voice/build.mjs <WAV のフォルダ> --added    … 追加の録音 (= 「…_added.wav」。 ADDED) だけ変換して、 いまの一覧に足す
//   node tools/voice/build.mjs <WAV のフォルダ> --lessons  … SPEC-147: EASY のレッスン (= 「番号-…_lesson.wav」。 LESSONS)
//   WAV は「番号-セリフ-….wav」 (= 番号は 00 がタイトルコール、 01 から ORDER の並び。 作者の台本の CSV と同じ)。
//   ffmpeg / ffprobe が要る (= このツールだけ。 ゲームは MP3 を読むだけ)
import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
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
 * 名前は lesson.<番号> (= js/easy.js の LESSON_KEYS と同じ並び)
 */
export const LESSONS = [
  "lesson.s1.move", "lesson.s1.ce", "lesson.s1.shop", "lesson.s1.boss", "lesson.s1.clear",
  "lesson.s2.start", "lesson.s2.rare", "lesson.s2.gift", "lesson.s2.mission", "lesson.s2.reward", "lesson.s2.boss",
  "lesson.s2.lose", "lesson.s2.root", "lesson.s2.thunder", "lesson.s2.clear",
];

const OUT_DIR = "assets/voice/mine";
const src = process.argv[2];
const added2 = process.argv.includes("--added2");   // SPEC-116: 2 回目の追加の録音
const added3 = process.argv.includes("--added3");   // 3 回目の追加の録音
const lessons = process.argv.includes("--lessons");   // SPEC-147: EASY のレッスン
const added = added2 || added3 || lessons || process.argv.includes("--added");   // 追加の録音だけ変換し、 いまの一覧に足す
const BATCH = lessons ? LESSONS : (added3 ? ADDED_3 : (added2 ? ADDED_2 : ADDED));
const SUFFIX_ADDED2 = /-MyCryptoSurvivors_tutorial_skilltree\.wav$/i;
const SUFFIX = lessons ? /_lesson\.wav$/i : (added3 ? /_added3\.wav$/i : (added2 ? SUFFIX_ADDED2 : /_added\.wav$/i));
if (!src) { console.error("usage: node tools/voice/build.mjs <wav dir> [--added | --added2 | --added3 | --lessons]"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });
const wavs = readdirSync(src).filter((f) => /^\d+-.*\.wav$/i.test(f) && (added ? SUFFIX.test(f) : !/_added\d*\.wav$/i.test(f) && !SUFFIX_ADDED2.test(f)));
const lines = added ? { ...(await import("../../js/voice-lines.js")).VOICE_LINES } : {};
for (const f of wavs) {
  const n = Number(f.split("-")[0]);
  const id = (added ? BATCH : ORDER)[n];
  if (!id) throw new Error(`番号 ${n} のボイスの名前がない: ${f}`);
  const out = join(OUT_DIR, `${id}.mp3`);
  // モノラル・44.1kHz・64kbps (= 声だけなので十分。 1 本 20〜40KB)
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(src, f), "-ac", "1", "-ar", "44100", "-b:a", "64k", "-map_metadata", "-1", out]);
  const sec = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
  lines[id] = { file: out, ms: Math.round(sec * 1000) };
}
const ALL = [...new Set([...ORDER, ...ADDED, ...ADDED_2, ...ADDED_3, ...LESSONS])];
const missing = (added ? BATCH : ORDER).filter((id) => !lines[id]);
if (missing.length) throw new Error(`WAV がない: ${missing.join(", ")}`);
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
