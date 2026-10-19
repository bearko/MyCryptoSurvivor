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
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
const heroesRaw = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8"));
const heroes = Array.isArray(heroesRaw) ? heroesRaw : (heroesRaw.heroes ?? Object.values(heroesRaw));

test("ボイスのファイルがすべてある (= MP3。 長さも分かっている)", () => {
  assert.equal(Object.keys(VOICE_LINES).length, 35);
  for (const [id, v] of Object.entries(VOICE_LINES)) {
    assert.match(v.file, /^assets\/voice\/mine\/[\w.]+\.mp3$/, id);
    assert.ok(existsSync(new URL(`../${v.file}`, import.meta.url)), v.file);
    assert.ok(statSync(new URL(`../${v.file}`, import.meta.url)).size < 80000, `${v.file} は小さい`);
    assert.ok(v.ms > 500 && v.ms < 8000, `${id}: ${v.ms}`);
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
  ];
  for (const l of all) {
    // SPEC-097: ボイスをまだ録っていないヒーローの紹介だけは、 文だけ
    if (l.key.startsWith("navi.hero.pick.") && !l.voice) assert.ok(!VOICE_LINES[`hero.${l.key.split(".").pop()}`] || RETIRED_VOICES.has(`hero.${l.key.split(".").pop()}`), l.key);
    else assert.ok(l.voice && VOICE_LINES[l.voice], `${l.key} のボイス (${l.voice})`);
    assert.ok(ui[l.key]?.ja && ui[l.key]?.en, `${l.key} の文`);
  }
  // 使っていないボイスはない (= タイトルコールは main.js が鳴らす。 SPEC-097 で外したものを除く)
  const used = new Set(all.map((l) => l.voice).concat("title.call", ...RETIRED_VOICES));
  for (const id of Object.keys(VOICE_LINES)) assert.ok(used.has(id), `${id} を使っていない`);
});

test("ヒーローを選んだときは、 ヒーローごとの紹介 (= ボイスのないヒーローは、 いままでのひな形)", () => {
  const l = naviLines("heroPick", { heroId: 1006, heroName: "x", weaponName: "y" })[0];
  assert.equal(l.key, "navi.hero.pick.1006");
  assert.equal(l.voice, "hero.1006");
  assert.equal(ui[l.key].ja, "ピタゴラス！ 「ノービスブック」が周囲を守るよ！");
  // SPEC-097: ボイスをまだ録っていない (= 武器が変わった) ヒーローは、 ヒーローごとの文だけ
  const xu = naviLines("heroPick", { heroId: 2013, heroName: "x", weaponName: "y" })[0];
  assert.equal(xu.key, "navi.hero.pick.2013");
  assert.equal(xu.voice, undefined);
  assert.match(ui[xu.key].ja, /マレット/);
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
