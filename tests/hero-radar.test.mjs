// SPEC-099: ヒーローの性能のレーダーチャート (= 段の計算と、 戦闘と同じ式から出ていること)
// 実行: node --test tests/hero-radar.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toSteps, radarTable, radarValues, weaponReach, radarSvg, radarAriaLabel, formatRadarValue, RADAR_AXES } from "../js/hero-radar.js";
import { heroMaxHp, heroSpeed, heroDmgMul, heroCdMul } from "../js/hero-stats.js";
import { HERO_STARTING_WEAPON } from "../js/constants.js";

const HEROES = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8")).heroes;
const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8")).extensions;
const extOf = (heroId) => EXT.find((e) => e.extId === HERO_STARTING_WEAPON[heroId]);

test("値 → 1〜5 の段: 最小が 1・最大が 5・同じ値は同じ段・みな同じなら真ん中", () => {
  assert.deepEqual(toSteps([10, 20, 30, 40, 50]), [1, 2, 3, 4, 5]);
  assert.deepEqual(toSteps([0, 100, 100, 50]), [1, 5, 5, 3]);
  assert.deepEqual(toSteps([7, 7, 7]), [3, 3, 3]);
});

test("軸の値は戦闘と同じ式から出ている (= js/hero-stats.js)", () => {
  const h = HEROES.find((x) => x.heroId === 4052);
  const v = radarValues(h, extOf(4052));
  assert.equal(v.hp, heroMaxHp(h));
  assert.equal(v.speed, heroSpeed(h));
  assert.equal(v.atk, heroDmgMul(h));
  assert.equal(v.rate, 1 / heroCdMul(h));
});

test("射程: 飛ぶ武器は range、 回る・置く武器は半径 (= ブレードがいちばん近い)", () => {
  assert.equal(weaponReach(EXT.find((e) => e.series === "Blade")), 40);   // 2026-10-22: 32 → 40 (= ブレードを大きく)
  assert.equal(weaponReach(EXT.find((e) => e.series === "Snowman")), 60);
  assert.equal(weaponReach(EXT.find((e) => e.series === "LaserGun")), 600);
});

test("10 人の表: どの軸にも 1 と 5 がいる。 ドレークは速さ 5、 アナスタシアは体力 1", () => {
  const table = radarTable(HEROES, extOf);
  assert.equal(table.size, 10);
  for (const axis of RADAR_AXES) {
    const steps = [...table.values()].map((r) => r.steps[axis]);
    assert.ok(steps.includes(1) && steps.includes(5), axis);
  }
  assert.equal(table.get(4052).steps.speed, 5);
  assert.equal(table.get(2016).steps.hp, 1);
  assert.equal(table.get(10001).steps.reach, 1);
});

test("SVG と読み上げの文", () => {
  const table = radarTable(HEROES, extOf);
  const labels = { hp: "体力", atk: "攻撃", rate: "連射", speed: "速さ", reach: "射程" };
  const svg = radarSvg(table.get(4006), { labels, color: "#f0c14b", ghost: table.get(10001) });
  assert.match(svg, /^<svg class="radar"/);
  assert.equal((svg.match(/class="radar__ghost"/g) ?? []).length, 1);
  assert.match(svg, /体力 \d/);
  assert.equal(radarSvg(table.get(4006), { labels, color: "#fff" }).includes("radar__ghost"), false);
  assert.match(radarAriaLabel(table.get(4006), labels), /^体力 \d、攻撃 \d、連射 \d、速さ \d、射程 \d$/);
  assert.equal(formatRadarValue("atk", 1.125), "×1.13");
  assert.equal(formatRadarValue("reach", 600), "600px");
});
