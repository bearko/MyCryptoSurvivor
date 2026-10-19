// SPEC-097: 新しい 10 人と、 武器の 4 系列の差し替え・PHY / INT の効き目
// 実行: node --test tests/hero-roster.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HERO_STARTING_WEAPON, HERO_PHY_BASE, HERO_INT_BASE } from "../js/constants.js";
import { heroMaxHp, heroSpeed, heroDmgMul, heroCdMul } from "../js/hero-stats.js";

const HEROES = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8")).heroes;
const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8")).extensions;
const weapon = (id) => EXT.find((e) => e.extId === id);

test("10 人すべてに初期武器があり、 10 系列が重ならない", () => {
  assert.equal(HEROES.length, 10);
  const ids = HEROES.map((h) => HERO_STARTING_WEAPON[h.heroId]);
  assert.ok(ids.every((id) => weapon(id)?.category === "weapon"));
  assert.equal(new Set(ids).size, 10);
  assert.equal(Object.keys(HERO_STARTING_WEAPON).length, 10);
});

test("作者の指定どおりの組み合わせ (= 武器ごとに「この人がこれを使う」)", () => {
  const pair = Object.fromEntries(HEROES.map((h) => [h.name.ja, weapon(HERO_STARTING_WEAPON[h.heroId]).series]));
  assert.deepEqual(pair, {
    "MCHウォーリアー": "Blade", "ビリー・ザ・キッド": "Revolver", "霧隠才蔵": "Shuriken", "アナスタシア": "Snowman",
    "ジャックザリッパー": "Knife", "ニコラ・テスラ": "LaserGun", "ピタゴラス": "Book", "大長今": "Broomstick",
    "許褚": "Mallet", "フランシス・ドレーク": "Parrot",
  });
});

test("差し替えた 4 系列は、 型・数値・extId がそのままで、 アイコンは資産リポジトリの 5 段", () => {
  const want = {
    8: ["Mallet", "randomRadial", 73], 4: ["Parrot", "dropTarget", 113],
    9: ["Snowman", "placeBomb", 126], 3: ["Broomstick", "bigHoming", 80],
  };
  for (const [id, [series, archetype, sid]] of Object.entries(want)) {
    const e = weapon(Number(id));
    assert.equal(e.series, series);
    assert.equal(e.archetype, archetype);
    assert.deepEqual(e.tierIconIds, [1, 2, 3, 4, 5].map((r) => r * 1000 + sid));
    assert.equal(e.iconId, 1000 + sid);
    assert.equal(e.tierNames.length, 5);
    assert.equal(e.tierParams.length, 5);
  }
  assert.ok(!EXT.some((e) => ["Axe", "Moai", "Pierrot", "Panjandrum"].includes(e.series)));
});

test("武器にはどれも系列の名前がある (= ヒーローの札に出す)", () => {
  for (const e of EXT.filter((x) => x.category === "weapon")) assert.ok(e.seriesName?.ja && e.seriesName?.en, e.series);
});

test("PHY はダメージ、 INT は間隔に効く (= 基準で ×1、 式どおり、 幅は ±1 割ほど)", () => {
  assert.equal(heroDmgMul({ stats: { phy: HERO_PHY_BASE } }), 1);
  assert.equal(heroCdMul({ stats: { int: HERO_INT_BASE } }), 1);
  assert.equal(heroDmgMul({ stats: { phy: 120 } }), 1.1);
  assert.equal(heroCdMul({ stats: { int: 120 } }), 0.9);
  assert.equal(heroDmgMul({}), 1, "ステータスが無ければ ×1");
  assert.equal(heroCdMul(null), 1);
  for (const h of HEROES) {
    assert.ok(heroDmgMul(h) >= 0.87 && heroDmgMul(h) <= 1.14, `${h.name.ja} ${heroDmgMul(h)}`);
    assert.ok(heroCdMul(h) >= 0.89 && heroCdMul(h) <= 1.1, `${h.name.ja} ${heroCdMul(h)}`);
  }
});

test("HP と速さは前と同じ式 (= SPEC-014)", () => {
  assert.equal(heroMaxHp({ stats: { hp: 150 } }), 110);
  assert.equal(heroSpeed({ stats: { agi: 199 } }), 259);
});
