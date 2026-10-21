// SPEC-116: 倒れたとき、 マインちゃんがスキルツリーへ誘う (= 初回は入口、 2 回目からは 3 つのひとこと)。 木では強化のしかたと引き継ぎ
// 実行: node --test tests/lose-navi.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { naviLines, NAVI_DOCK_PLACES } from "../js/navi.js";

const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

test("スキルツリーを始めていなければ、 入口を教える", () => {
  const [l] = naviLines("lose", { guide: true, n: 5 });
  assert.equal(l.key, "navi.lose.guide");
  assert.equal(l.voice, "lose.guide");
  assert.match(ui[l.key].ja, /スキルツリー/);
});

test("始めていれば、 作者の 3 つのひとことを順に (= 続けて同じにならない)", () => {
  const keys = [0, 1, 2, 3].map((n) => naviLines("lose", { n })[0].key);
  assert.deepEqual(keys, ["navi.lose.1", "navi.lose.2", "navi.lose.3", "navi.lose.1"]);
  assert.equal(ui["navi.lose.1"].ja, "惜しかったね。スキルツリーを強化してリベンジしよう！");
  assert.equal(ui["navi.lose.2"].ja, "頑張ったね！たまった GUM でスキルを強化しよう！");
  assert.equal(ui["navi.lose.3"].ja, "まだまだこれから！少し休んだら、また挑んでみよう。スキルツリーの強化も忘れずにね");
  for (const k of ["navi.lose.guide", "navi.lose.1", "navi.lose.2", "navi.lose.3"]) assert.ok(ui[k]?.en, k);
});

test("はじめて木を開いたときは、 強化のしかた → ずっと引き継がれる → 根を押す", () => {
  const keys = naviLines("tree", { step: "root" }).map((l) => l.key);
  assert.deepEqual(keys, ["navi.tree.intro.1", "navi.tree.intro.2", "navi.tree.root"]);
  assert.match(ui["navi.tree.intro.2"].ja, /引き継がれ/);
  assert.match(ui["navi.tree.intro.2"].ja, /遊べば遊ぶほど強く/);
  // 2 回目からは今までどおり 1 行
  assert.equal(naviLines("tree", { step: "first" }).length, 1);
});

test("結果の画面の下の帯で言う (= RTA では言わない)", () => {
  assert.ok(NAVI_DOCK_PLACES.includes("result"));
  const src = readFileSync(new URL("../js/battle/gameover.js", import.meta.url), "utf8");
  assert.match(src, /if \(reason === "clear"\) return;/);
  // SPEC-150: まず「復活させてあげる」、 RTA でなければ 2 行目に SPEC-116 / SPEC-148
  assert.match(src, /const lines = naviLines\("revive"\);/);
  assert.match(src, /lines\.push\(\.\.\.naviLines\("lose", \{ guide, n: _loseN \}\)\)/);
  assert.match(src, /naviSay\(lines, \{ place: "result" \}\)/);
  const css = readFileSync(new URL("../css/chars.css", import.meta.url), "utf8");
  assert.match(css, /\.navi--dock\[data-place="result"\] \{ z-index: calc\(var\(--z-modal-top\) \+ 5\); \}/);
});

test("ボイスの名前が付いている (= 録ったら js/voice-lines.js に足せば鳴る)", () => {
  const lines = [
    ...naviLines("lose", { guide: true }), ...[0, 1, 2].flatMap((n) => naviLines("lose", { n })),
    ...naviLines("treeHint"), ...["root", "first", "noGum", "done", "claimable", "idle"].flatMap((step) => naviLines("tree", { step })),
  ];
  for (const l of lines) assert.ok(l.voice, l.key);
  assert.equal(new Set(lines.map((l) => l.voice)).size, lines.length);
});
