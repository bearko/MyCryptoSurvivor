// SPEC-101: 初期武器の LL ランクアップ (= 10 系列すべてが自分の LL 版を持つ)
// 実行: node --test tests/ll-rank-up.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LL_LEVEL, EXT_MAX_LEVEL } from "../js/constants.js";
import { llOption } from "../js/battle/levelup.js";
import { nearestEnemies } from "../js/battle/ll.js";
import { isLLLevel } from "../js/extensions.js";

const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8")).extensions;
const WEAPONS = EXT.filter((e) => e.category === "weapon");
const getExt = (id) => EXT.find((e) => String(e.extId) === String(id));

test("10 系列すべてに LL 版 (= 資産リポジトリの id 5501 以上)。 名前・技の名前・説明・数値がある", () => {
  assert.equal(WEAPONS.length, 10);
  const want = { Blade: 5501, Revolver: 5529, Shuriken: 5624, LaserGun: 5630, Knife: 5548, Book: 5508, Mallet: 5573, Parrot: 5613, Snowman: 5626, Broomstick: 5580 };
  for (const e of WEAPONS) {
    assert.equal(e.ll?.extId, want[e.series], e.series);
    assert.ok(e.ll.extId >= 5501);
    for (const k of ["name", "skillName", "desc"]) assert.ok(e.ll[k]?.ja && e.ll[k]?.en, `${e.series} ${k}`);
  }
});

test("LL は Lv.5 より強い (= ダメージは 1.5 倍以上、 弾の数・大きさ・間隔のどれかも良くなる)", () => {
  for (const e of WEAPONS) {
    const lv5 = e.tierParams[4], ll = e.ll.params;
    assert.ok(ll.dmg >= lv5.dmg * 1.5, `${e.series} dmg`);
    const better = (ll.bullets ?? 0) > (lv5.bullets ?? 0) || (ll.cdMs ?? Infinity) < (lv5.cdMs ?? Infinity) || (ll.pierce ?? 0) > (lv5.pierce ?? 0);
    assert.ok(better, e.series);
  }
});

test("LL の札が出るのは、 初期武器が Lv.5 のときだけ (= ほかの武器・Lv.4・もう LL なら出ない)", () => {
  const blade = WEAPONS.find((e) => e.series === "Blade").extId;
  const book = WEAPONS.find((e) => e.series === "Book").extId;
  const opt = llOption([{ extId: blade, level: EXT_MAX_LEVEL }, { extId: book, level: EXT_MAX_LEVEL }], blade, getExt);
  assert.equal(opt.extId, blade);
  assert.equal(opt.nextLevel, LL_LEVEL);
  assert.equal(opt.isLL, true);
  assert.equal(llOption([{ extId: blade, level: 4 }], blade, getExt), null);
  assert.equal(llOption([{ extId: blade, level: LL_LEVEL }], blade, getExt), null);
  assert.equal(llOption([{ extId: book, level: EXT_MAX_LEVEL }], blade, getExt), null, "初期武器でなければ出ない");
  assert.equal(llOption([], null, getExt), null);
});

test("6 段目は LL の名前・絵・説明 (= 5 段目までは今までどおり)", () => {
  const e = WEAPONS.find((x) => x.series === "Snowman");
  assert.equal(isLLLevel(e, 5), false);
  assert.equal(isLLLevel(e, LL_LEVEL), true);
  assert.equal(isLLLevel({}, LL_LEVEL), false);
});

test("真・ミョルニルの雷は近い順に落ちる (= 壺は狙わない)", () => {
  const es = [{ id: 1, x: 300, y: 0 }, { id: 2, x: 100, y: 0 }, { id: 3, x: 50, y: 0, isProp: true }, { id: 4, x: 900, y: 0 }];
  assert.deepEqual(nearestEnemies(es, 0, 0, 700, 5).map((e) => e.id), [2, 1]);
});
