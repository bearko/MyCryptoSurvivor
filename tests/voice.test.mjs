// SPEC-085: マインちゃんのボイス (= どのセリフにもボイスがあり、 ファイルがある。 タイトルコールは重ならない)
// 実行: node --test tests/voice.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

const created = [];
class FakeAudio {
  constructor() { this.src = ""; this.volume = 1; this.currentTime = 0; this.paused = true; this.plays = []; created.push(this); }
  play() { this.paused = false; this.plays.push(this.src); return Promise.resolve(); }
  pause() { this.paused = true; }
}
globalThis.Audio = FakeAudio;

const { VOICE_LINES } = await import("../js/voice-lines.js");
const { playVoice, stopVoice, voiceWaitMs, hasVoice } = await import("../js/voice.js");
const { naviLines, RETIRED_VOICES } = await import("../js/navi.js");
const { TIP_KEYS } = await import("../js/navi-tips.js");
const { normalizeSettings, updateSettings, DEFAULT_SETTINGS } = await import("../js/settings.js");
const { STAGE_TABLE } = await import("../js/constants.js");
const { ADVICE_NODES } = await import("../js/battle/run-stats.js");   // SPEC-159
const { TELOP_KINDS } = await import("../js/result-telop.js");
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
const heroesRaw = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8"));
const heroes = Array.isArray(heroesRaw) ? heroesRaw : (heroesRaw.heroes ?? Object.values(heroesRaw));

test("ボイスのファイルがすべてある (= MP3。 長さも分かっている)", () => {
  assert.equal(Object.keys(VOICE_LINES).length, 89 + 103);   // SPEC-165: ＋ ストーリーの台本 103 本 (= 1〜103。 0 番の mission.1 は既存。 104・105 の 1-0 はまだ)   // 台本 35 本 ＋ 追加の録音 8 本 (= 許褚は差し替え。 SPEC-097) ＋ 倒れたとき・スキルツリー 13 本 (= SPEC-116) ＋ 最初の店の説明 1 本 ＋ SPEC-159 の 32 本
  for (const [id, v] of Object.entries(VOICE_LINES)) {
    assert.match(v.file, /^assets\/voice\/mine\/[\w.-]+\.mp3$/, id);   // SPEC-165: story.1-1.intro のようにハイフンも
    assert.ok(existsSync(new URL(`../${v.file}`, import.meta.url)), v.file);
    assert.ok(statSync(new URL(`../${v.file}`, import.meta.url)).size < 100000, `${v.file} は小さい`);   // SPEC-165: 5-3 の始まり (11.9 秒) が 93KB
    assert.ok(v.ms > 500 && v.ms < 12000, `${id}: ${v.ms}`);   // SPEC-159: 「敵の弾に削られてるね…」が 9.1 秒。 SPEC-165: 5-3 の始まりが 11.9 秒
  }
  assert.ok(hasVoice("title.call"));
});

test("マインちゃんのどのセリフにもボイスがある", () => {
  const all = [
    ...naviLines("title"), ...naviLines("mode"), ...naviLines("hero"), ...naviLines("boss"),
    ...[0, 1, 2, 3].flatMap((n) => naviLines("titleTap", { n })),
    ...heroes.flatMap((h) => naviLines("heroPick", { heroId: h.heroId, heroName: "x", weaponName: "y" })),
    ...STAGE_TABLE.flatMap((s, i) => naviLines("stage", { stageIdx: i, stageCount: STAGE_TABLE.length, stageName: "n", rta: true })),
    ...TIP_KEYS.flatMap((key) => naviLines("tip", { key })),
    // SPEC-116: 倒れたとき・スキルツリー
    ...naviLines("lose", { guide: true }), ...[0, 1, 2].flatMap((n) => naviLines("lose", { n })),
    ...naviLines("treeHint"), ...["root", "first", "noGum", "done", "claimable", "idle"].flatMap((step) => naviLines("tree", { step })),
    // SPEC-159: 4 回目の録音 (= EASY のすすめ・復活・木から戻った・おすすめ・ボスの予告・EASY のステージ・ミッション・レッスン・テロップ)
    ...naviLines("mode", { first: true }), ...naviLines("revive"), ...naviLines("afterTree", { bought: 1 }), ...naviLines("afterTree", { bought: 0 }),
    ...Object.keys(ADVICE_NODES).map((key) => naviLines("advice", { key, vars: { a: "a", b: "b" } })[0]),
    ...naviLines("bossWarn"),
    { key: "navi.mission.1", voice: "mission.1" }, { key: "navi.mission.2", voice: "mission.2" },   // js/battle/missions.js
    ...Object.values(TELOP_KINDS).map((k) => ({ key: k.line, voice: k.voice })),   // js/result-telop.js
  ];
  for (const l of all) {
    // SPEC-097: ボイスをまだ録っていないヒーローの紹介だけは、 文だけ
    if (l.key.startsWith("navi.hero.pick.") && !l.voice) assert.ok(!VOICE_LINES[`hero.${l.key.split(".").pop()}`] || RETIRED_VOICES.has(`hero.${l.key.split(".").pop()}`), l.key);
    else assert.ok(l.voice && VOICE_LINES[l.voice], `${l.key} のボイス (${l.voice})`);
    assert.ok(ui[l.key]?.ja && ui[l.key]?.en, `${l.key} の文`);
  }
  // 使っていないボイスはない (= タイトルコールは main.js が鳴らす。 SPEC-097 で外したものを除く)
  const used = new Set(all.map((l) => l.voice).concat("title.call", "shop.intro", ...RETIRED_VOICES));   // shop.intro は shop.js が鳴らす
  // SPEC-165: ストーリーの台本 (= 名前は文の key そのもの。 naviLines("story", { key }) とシーン・地図のひとことが鳴らす)
  const storyKeys = new Set(readFileSync(new URL("../docs/voice/script-story-keys.txt", import.meta.url), "utf8").trim().split("\n").map((l) => l.split("\t")[0]));
  for (const id of Object.keys(VOICE_LINES)) if (storyKeys.has(id)) { used.add(id); assert.ok(ui[id]?.ja && ui[id]?.en, `${id} の文`); }
  for (const id of Object.keys(VOICE_LINES)) assert.ok(used.has(id), `${id} を使っていない`);
});

test("ヒーローを選んだときは、 ヒーローごとの紹介 (= ボイスのないヒーローは、 いままでのひな形)", () => {
  const l = naviLines("heroPick", { heroId: 1006, heroName: "x", weaponName: "y" })[0];
  assert.equal(l.key, "navi.hero.pick.1006");
  assert.equal(l.voice, "hero.1006");
  assert.equal(ui[l.key].ja, "ピタゴラス！ 「ノービスブック」が周囲を守るよ！");
  // SPEC-097: 新しい 10 人はみなボイスつき (= 許褚は武器が変わって録り直した)
  for (const h of heroes) {
    const line = naviLines("heroPick", { heroId: h.heroId, heroName: "x", weaponName: "y" })[0];
    assert.equal(line.key, `navi.hero.pick.${h.heroId}`);
    assert.equal(line.voice, `hero.${h.heroId}`, h.name.ja);
  }
  assert.match(ui["navi.hero.pick.2013"].ja, /マレット/);
  const other = naviLines("heroPick", { heroId: 9999, heroName: "x", weaponName: "y" })[0];
  assert.equal(other.key, "navi.hero.pick");
  assert.deepEqual(other.vars, { name: "x", weapon: "y" });
  assert.equal(ui["navi.tip.item.magnet"].ja, "棒磁石！ 落ちているCEをぜんぶ吸い寄せたよ。");
});

test("設定の「ボイス」 (= 前の版の設定は 100%。 0〜1)", () => {
  assert.equal(DEFAULT_SETTINGS.voice, 1);
  assert.equal(normalizeSettings({ v: 1, bgm: 0.5, se: 0.5 }).voice, 1);
  assert.equal(normalizeSettings({ voice: 0.3 }).voice, 0.3);
  assert.equal(normalizeSettings({ voice: 7 }).voice, 1);
  assert.equal(normalizeSettings({ voice: "x" }).voice, 1);
});

test("タイトルコールは鳴り終わるまで次のボイスを待たせる。 ふつうのボイスは前を止めて鳴らす", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  updateSettings({ voice: 1 });
  playVoice("title.call", { hold: true });
  const el = created[created.length - 1];
  assert.match(el.src, /title\.call\.mp3$/);
  playVoice("title.1");
  assert.match(el.src, /title\.call\.mp3$/, "まだ替えない");
  t.mock.timers.tick(VOICE_LINES["title.call"].ms + 1);
  assert.match(el.src, /title\.1\.mp3$/, "鳴り終わってから");
  playVoice("title.2");
  assert.match(el.src, /title\.2\.mp3$/, "ふつうのボイスはすぐ替わる");
  assert.equal(created.length, 1, "要素は 1 つを使い回す");
  stopVoice();
  assert.equal(el.paused, true);
  // 音量 0 なら鳴らさない
  const n = el.plays.length;
  updateSettings({ voice: 0 });
  playVoice("tap.2");
  assert.equal(el.plays.length, n);
  updateSettings({ voice: 1 });
  assert.equal(playVoice("no.such.voice"), false);
  assert.equal(voiceWaitMs(1000, 400), 600);
  assert.equal(voiceWaitMs(1000, 1400), 0);
});
