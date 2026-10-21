// SPEC-098: ヒーローの解放をアチーブメントで (= 最初の 2 人 ＋ 本作で 4 人 ＋ ほかのタイトルで 4 人)
// 実行: node --test tests/hero-unlock.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  STARTER_HEROES, EASY_REWARD_HERO, HERO_UNLOCKS, GAME_TITLES, unlockedHeroes, nextUnlock, unlockOf, heroForTrophy,
  getUnlockedHeroes, noteTrophies, onHeroesUnlocked, refreshHeroUnlocks, LS_HERO_UNLOCKED, _resetHeroUnlocksForTest,
} = await import("../js/hero-unlock.js");
const { HERO_STARTING_WEAPON, SFX } = await import("../js/constants.js");
const HEROES = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8")).heroes;
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

beforeEach(() => {
  store.clear();
  _resetHeroUnlocksForTest();
  delete globalThis.window;
});

test("10 人 = 最初の 1 人 ＋ EASY クリアで 1 人 ＋ 本作で 4 人 ＋ ほかのタイトルで 4 人 (= 4 つの別のタイトル)", () => {
  assert.deepEqual(STARTER_HEROES, [10001], "ブレード。 SPEC-153: リボルバーは EASY クリアの報酬");
  assert.equal(EASY_REWARD_HERO, 4006);
  assert.equal(HERO_STARTING_WEAPON[10001], 10);
  assert.equal(HERO_STARTING_WEAPON[4006], 1);
  const all = [...STARTER_HEROES, EASY_REWARD_HERO, ...HERO_UNLOCKS.map((u) => u.heroId)].sort();
  assert.deepEqual(all, HEROES.map((h) => h.heroId).sort());
  assert.equal(HERO_UNLOCKS.filter((u) => u.game === "survivor").length, 4);
  const others = HERO_UNLOCKS.filter((u) => u.game !== "survivor").map((u) => u.game);
  assert.equal(others.length, 4);
  assert.equal(new Set(others).size, 4);
  for (const u of HERO_UNLOCKS) {
    assert.ok(GAME_TITLES[u.game]?.url.startsWith("https://"), u.game);
    assert.ok(u.trophy.startsWith(`${u.game}.`), u.trophy);
    assert.ok(u.achievement?.ja && u.achievement?.en, u.trophy);
    assert.ok(ui[`hero.unlock.cond.${u.trophy}`]?.ja && ui[`hero.unlock.cond.${u.trophy}`]?.en, u.trophy);
  }
});

test("仲間になったときは専用の音 (= ヒーローを選ぶときの音とは別)", () => {
  assert.match(SFX.HERO_UNLOCK, /^Audio\/SE\/Jingles\/.+\.mp3$/);
  assert.notEqual(SFX.HERO_UNLOCK, SFX.HERO_PICK);
});

test("アチーブメントの一覧 → 使えるヒーロー", () => {
  assert.deepEqual([...unlockedHeroes([])], [10001]);
  assert.deepEqual([...unlockedHeroes([], [], { easyCleared: true })].sort(), [10001, 4006].sort(), "SPEC-153: EASY クリアでビリー");
  const s = unlockedHeroes(["survivor.stage2", "fortress.boss10", "survivor.stage1", "cross.login"]);
  assert.ok(s.has(2016) && s.has(2013));
  assert.equal(s.size, 3, "解放しないアチーブメント (= ステージ 1 など) は数えない");
  assert.ok(unlockedHeroes([], [2003]).has(2003), "この端末が覚えている人");
  assert.ok(!unlockedHeroes([], [9999]).has(9999), "知らない ID は入れない");
  assert.equal(unlockOf(10001), null);
  assert.equal(unlockOf(4052).trophy, "factory.legendary");
  assert.equal(heroForTrophy("survivor.clear"), 4041);
});

test("次の仲間は、 本作の 4 人が先、 そのあとほかのタイトルの近い順。 全員そろえば null", () => {
  assert.equal(nextUnlock(unlockedHeroes([])).trophy, "survivor.awaken");
  assert.equal(nextUnlock(unlockedHeroes(["survivor.awaken"])).trophy, "survivor.stage2");
  const mine = ["survivor.awaken", "survivor.stage2", "survivor.tree5", "survivor.clear"];
  assert.equal(nextUnlock(unlockedHeroes(mine)).trophy, "education.hero1");
  assert.equal(nextUnlock(unlockedHeroes(HERO_UNLOCKS.map((u) => u.trophy))), null);
});

test("新しく解放されたら知らせ、 この端末に覚える (= 2 度目は知らせない)", () => {
  const got = [];
  onHeroesUnlocked((ids) => got.push(ids));
  assert.deepEqual(noteTrophies(["survivor.stage2"]), [2016]);
  assert.deepEqual(noteTrophies(["survivor.stage2", "survivor.stage1"]), []);
  assert.deepEqual(got, [[2016]]);
  assert.deepEqual(JSON.parse(store.get(LS_HERO_UNLOCKED)), [2016]);
  _resetHeroUnlocksForTest();
  assert.ok(getUnlockedHeroes().has(2016), "読み込み直しても覚えている");
});

test("共通基盤から読む: 持っているアチーブメントで解放。 SDK が無い・失敗しても 1 人のまま", async () => {
  assert.deepEqual(await refreshHeroUnlocks(), []);
  globalThis.window = { BearkoGames: { getTrophies: async () => { throw new Error("offline"); } } };
  assert.deepEqual(await refreshHeroUnlocks(), []);
  assert.equal(getUnlockedHeroes().size, 1);
  globalThis.window = { BearkoGames: { getTrophies: async () => ({ ok: true, trophies: [{ id: "education.hero1" }, { id: "workshop.day1" }] }) } };
  assert.deepEqual((await refreshHeroUnlocks()).sort(), [1006, 1007]);
});

test("本作のアチーブメントを送ると、 通信できなくてもこの端末で解放する", async () => {
  const { unlockAchievements, _resetAchievementsForTest } = await import("../js/platform.js");
  _resetAchievementsForTest();
  unlockAchievements(["survivor.tree5"]);
  assert.ok(getUnlockedHeroes().has(2003));
});
