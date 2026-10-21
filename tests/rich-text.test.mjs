// SPEC-144: 説明の文で数字と用語を色分け・得意武器は確率で
// 実行: node --test tests/rich-text.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { richParts } = await import("../js/rich-text.js");
const { NODE_MAP, MAIN_CHANCE_PER_RANK } = await import("../js/skill-data.js");
const { formatStat } = await import("../js/perks.js");
const show = (s) => richParts(s).map((p) => (p.kind === "text" ? p.s : `[${p.kind}:${p.s}]`)).join("");

test("数字 (= 符号・単位つき) ・用語・「」の中を切り分ける。 文はそのまま", () => {
  assert.equal(show("確率 20%（段ごとに ＋20%。 最大 60%）"), "確率 [num:20%]（段ごとに [num:＋20%]。 最大 [num:60%]）");
  assert.equal(show("受けるダメージ −3%（段ごと）"), "受けるダメージ [num:−3%]（段ごと）");
  assert.equal(show("「先手」を解放"), "[quote:「先手」]を解放");
  assert.equal(show("GUM 300（あと 120）"), "[term:GUM] [num:300]（あと [num:120]）");
  assert.equal(show("ブレードの威力 ＋5%"), "[term:ブレード]の威力 [num:＋5%]");
  assert.equal(show("a spot near the pots"), "a spot near the [term:pots]", "英字の用語は語の切れ目で");
  for (const s of ["", "ふつうの文", "x <b>y</b> 3"]) assert.equal(richParts(s).map((p) => p.s).join(""), s);
});

test("得意武器は確率 (= 段 × 20%) で書く", () => {
  assert.equal(MAIN_CHANCE_PER_RANK, 0.15);   // SPEC-163: 土台 50% に足す
  assert.match(NODE_MAP.wm_main.desc.ja, /確率 50% → 65%（段ごとに ＋15%。 最大 95%）/);   // SPEC-163
  assert.deepEqual([1, 2, 3].map((r) => formatStat("main", r)), ["65%", "80%", "95%"]);
  const lv = readFileSync(new URL("../js/battle/levelup.js", import.meta.url), "utf8");
  assert.match(lv, /\[mainE, \.\.\.pickFromPool\(eligible\.filter\(\(e\) => e !== mainE\), n - 1/);
});

test("つなぎ: スキルツリーの詳しい欄・条件、 ミッションの説明とごほうびに色", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const tree = read("js/skill-tree.js");
  assert.match(tree, /richNode\("p", "dt-desc", L\(n\.desc\)\)/);
  assert.match(tree, /richNode\("span", "", c\.text\)/);
  assert.match(read("js/battle/missions.js"), /setRichText\(document\.getElementById\("missionOfferDesc"\)/);
  assert.match(read("css/components.css"), /\.rt-num \{/);
});
