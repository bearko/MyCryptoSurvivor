// SPEC-093: スキルツリーの使い勝手 (= 詰めた木・いまの効果の欄・初回の案内・画面ごとのセリフ)
// 実行: node --test tests/skill-tree-ux.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { TREE_NODES, ROOT_ID, nodePos } = await import("../js/skill-data.js");
const { treeNudge, treeGuide, guideTarget } = await import("../js/skill-logic.js");
const { computePerks, perkRows, formatStat, STAT_ROWS, NO_PERKS } = await import("../js/perks.js");
const { naviLines } = await import("../js/navi.js");
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

const meta = (nodes = {}, { gum = 0, dust = 0, runs = 1 } = {}) => ({ gum, dust, runs, nodes, earned: { gum: 0, dust: 0 } });

test("木はほぼ半分の大きさ (= 中心からいちばん遠い節が 4.6 マス以内。 前は 7.7)", () => {
  const far = Math.max(...TREE_NODES.map((n) => Math.hypot(nodePos(n).x, nodePos(n).y)));
  assert.ok(far <= 4.6, `いちばん遠い節 ${far.toFixed(2)}`);
  assert.ok(far >= 3.8, `詰めすぎ ${far.toFixed(2)}`);
});

test("入口を目立たせるのは、 遊んだが根を取っていないあいだだけ", () => {
  assert.equal(treeNudge(meta({}, { runs: 0 })), false);
  assert.equal(treeNudge(meta({}, { runs: 1 })), true);
  assert.equal(treeNudge(meta({ [ROOT_ID]: 1 })), false);
});

test("木の中の案内: 根 → 最初の 1 つ (= いちばん安い節) → 終わり", () => {
  assert.equal(treeGuide(meta()), "root");
  assert.equal(guideTarget(meta()), ROOT_ID);
  const r = meta({ [ROOT_ID]: 1 }, { gum: 100 });
  assert.equal(treeGuide(r), "first");
  const id = guideTarget(r);
  assert.ok(id && id !== ROOT_ID);
  assert.equal(TREE_NODES.find((n) => n.id === id).depth, 1, "1 段目の 40 GUM の節");
  assert.equal(guideTarget(meta({ [ROOT_ID]: 1 }, { gum: 0 })), null, "GUM が無ければ指す先は無い");
  assert.equal(treeGuide(meta({ [ROOT_ID]: 1, atk_dmg: 1 })), null);
});

test("いまの効果の欄: 効いている数値だけを道の順に。 選んだ節で変わる行には買ったあとの値", () => {
  const now = computePerks(meta({ [ROOT_ID]: 1, atk_dmg: 3, vit_pancake: 1 }));
  const { rows, flags } = perkRows(now, null, "ja");
  assert.deepEqual(rows.map((r) => [r.label, r.value]), [["攻撃", "＋9%"]]);
  assert.deepEqual(flags, ["大盛り"]);
  const next = computePerks(meta({ [ROOT_ID]: 1, atk_dmg: 4, vit_pancake: 1, atk_cd: 1 }));
  const b = perkRows(now, next, "ja").rows;
  assert.deepEqual(b.map((r) => [r.label, r.value, r.next]), [["攻撃", "＋9%", "＋12%"], ["クールダウン", "—", "−2%"]]);
  assert.equal(perkRows(NO_PERKS, null, "en").rows.length, 0);
  assert.equal(perkRows(computePerks(meta({ atk_dmg: 1 })), null, "en").rows[0].label, "Attack");
});

test("欄の行は perks の表の数値の効果をすべて持ち、 値の書き方が決まっている", () => {
  for (const r of STAT_ROWS) assert.ok(r.key in NO_PERKS, r.key);
  assert.equal(formatStat("pct", -0.06), "−6%");
  assert.equal(formatStat("num", 2), "＋2");
  assert.equal(formatStat("sec", 0.4), "＋0.4 秒");
  assert.equal(formatStat("ps", 0.6, "en"), "0.6/s");
  assert.equal(formatStat("every", 45), "45 秒ごと");
});

test("マインちゃんの案内のセリフには文がある (= JP / EN)", () => {
  const all = [...naviLines("treeHint"), ...["root", "first", "noGum", "done", "claimable", "idle"].flatMap((step) => naviLines("tree", { step }))];
  assert.equal(all.length, 7);
  for (const l of all) assert.ok(ui[l.key]?.ja && ui[l.key]?.en, l.key);
  assert.deepEqual(naviLines("tree", { step: "nope" }), []);
  for (const k of ["tree.stats", "tree.statsNote", "tree.statsNone", "tree.guide", "tree.new"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});
