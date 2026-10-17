// SPEC-056: ナビのアインの場面ごとのセリフ (= js/navi.js の naviLines。 純関数)
// 実行: node --test tests/navi.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { naviLines, NAVI_FRAMES, NAVI_POSES, NAVI_COMM_PLACES, naviFrameUrl } from "../js/navi.js";

const UI = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
const SCENES = ["title", "titleTap", "mode", "hero", "heroPick", "stage", "boss"];

test("どの場面のセリフも、 日本語と英語の文言とポーズがある", () => {
  for (const scene of SCENES) {
    for (let n = 0; n < 6; n++) {
      const lines = naviLines(scene, { n, stageIdx: n % 3, stageCount: 3, rta: true, heroName: "X", weaponName: "Y", stageName: "Z" });
      assert.ok(lines.length > 0, scene);
      for (const l of lines) {
        assert.ok(UI[l.key]?.ja && UI[l.key]?.en, `${scene}: ${l.key}`);
        if (l.pose) assert.ok(NAVI_POSES[l.pose], `${scene}: pose ${l.pose}`);
      }
    }
  }
  assert.deepEqual(naviLines("nope"), []);
});

test("ステージの始まり: 最初・途中・最後で言うことが変わり、 RTA の最初だけ懐中時計の話をする", () => {
  const k = (i, rta = false) => naviLines("stage", { stageIdx: i, stageCount: 3, rta, stageName: "node" }).map((l) => l.key);
  assert.deepEqual(k(0), ["navi.stage.first"]);
  assert.deepEqual(k(1), ["navi.stage.next"]);
  assert.deepEqual(k(2), ["navi.stage.last"]);
  assert.deepEqual(k(0, true), ["navi.stage.first", "navi.stage.rta"]);
  assert.deepEqual(k(1, true), ["navi.stage.next"]);
  assert.equal(naviLines("stage", { stageIdx: 0, stageCount: 3, stageName: "node : アバカス" })[0].vars.stage, "node : アバカス");
});

test("ヒーローを選んだときは、 名前と最初の武器を言う (= 選ぶたびにポーズが変わる)", () => {
  const a = naviLines("heroPick", { heroName: "コナン・ドイル", weaponName: "リボルバー", n: 1 })[0];
  assert.deepEqual(a.vars, { name: "コナン・ドイル", weapon: "リボルバー" });
  const b = naviLines("heroPick", { heroName: "コナン・ドイル", weaponName: "リボルバー", n: 2 })[0];
  assert.notEqual(a.pose, b.pose);
  assert.ok(UI["navi.hero.pick"].ja.includes("{name}") && UI["navi.hero.pick"].ja.includes("{weapon}"));
});

test("タイトルでアインを押すと、 押すたびに違う反応をする", () => {
  const keys = new Set([0, 1, 2, 3].map((n) => naviLines("titleTap", { n })[0].key));
  assert.equal(keys.size, 4);
  assert.equal(naviLines("title")[0].mood, "greet", "最初はあいさつの動き");
});

test("コマとポーズの絵は mycryptoheroes の Image/Characters/navi_ain_*.png", () => {
  const all = [...Object.values(NAVI_FRAMES).flat(), ...Object.values(NAVI_POSES)];
  assert.ok(all.length >= 20);
  for (const f of all) assert.match(naviFrameUrl(f), /\/Image\/Characters\/navi_ain_[a-z0-9_]+\.png$/);
  assert.deepEqual(NAVI_COMM_PLACES, ["hero", "battle"], "ボタンや戦場を隠さない場所は通信窓");
});
