// SPEC-157: 一括解放の計画 (= 純関数)、 選んだ節の黄色い枠、 「解放可能なスキル ▶」
// 実行: node --test tests/skill-bulk.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const { bulkPlan, cheaperFirst, BULK_MAX } = await import("../js/skill-bulk.js");
const { NODE_MAP, ROOT_ID, TREE_NODES } = await import("../js/skill-data.js");
const { claimableNodes, nodeCost, nodeCostAt } = await import("../js/skill-logic.js");
const meta = (gum = 0, dust = 0, nodes = {}) => ({ gum, dust, nodes: { ...nodes } });

test("根をまだ取っていなければ、 まず根 (= 0 GUM)。 そのあと安い順に、 買えなくなるまで", () => {
  const m = meta(100);
  const p = bulkPlan(m);
  assert.equal(p.steps[0].id, ROOT_ID);
  assert.equal(p.steps[0].cost.gum, 0);
  assert.ok(p.steps.length >= 2, "根のあとも買う");
  assert.equal(p.gum, 100 - p.left.gum);
  assert.ok(p.left.gum >= 0 && p.left.gum < 40, "40 GUM の節が買えなくなるまで");
  assert.deepEqual(m, meta(100), "meta は書かない");
});

test("安い順 (= 高いものは残る)。 段を上げるたびに費用が上がるので、 同じ節ばかり続かない", () => {
  const p = bulkPlan(meta(300, 0, { [ROOT_ID]: 1 }));
  for (let i = 1; i < p.steps.length; i++) {
    // 買った時点の費用は、 それ以前に買ったものの費用以上 (= 安い順)
    assert.ok(p.steps[i].cost.gum >= p.steps[i - 1].cost.gum, `${p.steps[i - 1].id} → ${p.steps[i].id}`);
  }
  const ids = p.steps.map((s) => s.id);
  assert.ok(new Set(ids).size >= 3, "いくつかの節にまたがる");
  assert.ok(p.steps.every((s) => s.cost.dust === 0), "既定はゴールドダストを使わない");
});

test("ゴールドダストは「使う」にしたときだけ。 使わなければダストの要る節は残り、 ダストは減らない", () => {
  const owned = {};
  for (const n of TREE_NODES) if (n.route === "vit" || n.kind === "root") owned[n.id] = n.kind === "repeat" ? (n.max | 0) || 1 : 1;
  const rich = meta(100000, 5, owned);
  const dustNodes = claimableNodes(rich).filter((n) => nodeCost(rich, n.id).dust > 0);
  if (dustNodes.length) {
    const a = bulkPlan(rich, { useDust: false });
    assert.equal(a.dust, 0);
    assert.equal(a.left.dust, 5);
    const b = bulkPlan(rich, { useDust: true });
    assert.ok(b.dust > 0, "使うなら減る");
    assert.ok(b.steps.length > a.steps.length);
  }
  assert.ok(bulkPlan(rich, { useDust: true }).steps.length <= BULK_MAX);
});

test("何も買えなければ空。 GUM 0 で根だけ持っていれば空", () => {
  assert.deepEqual(bulkPlan(meta(0, 0, { [ROOT_ID]: 1 })).steps, []);
  assert.deepEqual(bulkPlan(null).steps, []);
});

test("cheaperFirst: GUM → ダスト → id の順", () => {
  const m = meta(0, 0, { [ROOT_ID]: 1 });
  const sorted = TREE_NODES.filter((n) => n.kind !== "root").slice().sort(cheaperFirst(m));
  for (let i = 1; i < sorted.length; i++) {
    const a = nodeCostAt(NODE_MAP[sorted[i - 1].id], 1), b = nodeCostAt(NODE_MAP[sorted[i].id], 1);
    assert.ok(a.gum < b.gum || (a.gum === b.gum && (a.dust < b.dust || (a.dust === b.dust && sorted[i - 1].id <= sorted[i].id))));
  }
});

test("画面: 選んだ節は黄色い枠。 「解放可能なスキル ▶」は押すとその節を選ぶ。 一括解放のボタンとゴールドダストの切り替え", () => {
  const css = read("../css/skill-tree.css");
  assert.match(css, /\.tnode\.sel::after \{\n\s+content: ""; position: absolute;[^}]*border: 3px solid #ffd54a;/, "黄色い枠 (= clip-path の外に ::after で)");
  assert.match(css, /\.tnode\.k-root\.sel::after \{[^}]*border-radius: 50%;/, "根は丸");
  assert.match(css, /\.tnode\.sel \.tnode-name \{ color: #ffd54a;/);
  assert.match(css, /\.sheet-bulk \{/);
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  assert.equal(ui["tree.claimable"].ja, "▶ 解放可能なスキル：{name}{more}（タップで選ぶ）");
  assert.match(ui["tree.claimable"].en, /^▶ Available skills: /);
  for (const k of ["tree.bulk", "tree.bulkDust", "tree.bulkDone", "tree.bulkNone"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  const tree = read("../js/skill-tree.js");
  assert.match(tree, /onclick: \(\) => select\(first\.id, true\)/, "解放可能なスキル ▶ で選ぶ");
  assert.match(tree, /function bulkUnlock\(\)/);
  assert.match(tree, /bulkPlan\(m, \{ useDust: _bulkDust \}\)/);
  assert.match(tree, /_bought \+= plan\.steps\.length;/, "SPEC-146 の「強くなったね」に数える");
});
