// SPEC-090: スキルツリーの節 (= データの整合) と純関数 (= 見える・取れる・費用・返金)
// 実行: node --test tests/skill-tree.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const { ROUTES, ROUTE_MAP, NODES, NODE_MAP, TREE_NODES, ROOT_ID, CAPSTONE_NEED, nodePos, routeLabelPos } = await import("../js/skill-data.js");
const {
  nodeRank, owns, nodeMax, nodeCostAt, nodeCost, canAfford, routeCounts, nodeBlockers, nodeState,
  nodeVisible, nodeTeaser, nodeShown, claimableNodes, tryBuy, spentTotal, treeTotal, ownedCount,
} = await import("../js/skill-logic.js");

const meta = (gum = 0, dust = 0, nodes = {}) => ({ gum, dust, nodes: { ...nodes } });
/** テスト用: tryBuy が通れば払って段を上げる (= 画面と同じ手順) */
function buy(m, id) {
  const r = tryBuy(m, id);
  if (!r.ok) return r;
  m.gum -= r.cost.gum; m.dust -= r.cost.dust; m.nodes[id] = r.rank;
  return r;
}

test("節は根 ＋ 36 で、 id が重ならず、 親が同じ道にある", () => {
  assert.equal(NODES.length, 37);
  assert.equal(new Set(NODES.map((n) => n.id)).size, 37);
  assert.equal(NODE_MAP[ROOT_ID].kind, "root");
  for (const n of NODES) {
    if (n.kind === "root") continue;
    assert.ok(ROUTE_MAP[n.route], `${n.id} の道`);
    const p = NODE_MAP[n.parent];
    assert.ok(p, `${n.id} の親 ${n.parent}`);
    assert.ok(p.kind === "root" || p.route === n.route, `${n.id} の親は同じ道`);
    assert.ok(p.kind === "root" ? n.depth === 1 : p.depth < n.depth, `${n.id} の親は浅い`);
    assert.ok(["repeat", "perk", "capstone"].includes(n.kind), `${n.id} の種類`);
    assert.ok(n.name?.ja && n.name?.en && n.desc?.ja && n.desc?.en, `${n.id} の名前と説明 (ja/en)`);
    assert.ok(Number.isInteger(n.icon) && n.icon > 0, `${n.id} の絵`);
    assert.ok((n.cost?.gum | 0) > 0, `${n.id} は GUM が要る`);
    assert.ok(n.fx && Object.keys(n.fx).length > 0, `${n.id} の効果`);
    if (n.kind === "repeat") assert.ok(n.max >= 2, `${n.id} の段数`); else assert.equal(n.max, undefined);
  }
});

test("どの道も 6 節で、 深さ 1 が根の子・深さ 4 が奥義。 奥義とボスの道はゴールドダストが要る", () => {
  assert.equal(ROUTES.length, 6);
  for (const r of ROUTES) {
    const ns = TREE_NODES.filter((n) => n.route === r.id);
    assert.equal(ns.length, 6, r.id);
    const d1 = ns.filter((n) => n.depth === 1);
    assert.equal(d1.length, 1); assert.equal(d1[0].parent, ROOT_ID);
    const caps = ns.filter((n) => n.kind === "capstone");
    assert.equal(caps.length, 1); assert.equal(caps[0].depth, 4);
    assert.ok(caps[0].cost.dust >= 3, `${r.id} の奥義はダスト`);
    assert.deepEqual(ns.map((n) => n.depth).sort(), [1, 2, 2, 3, 3, 4]);
  }
  for (const n of TREE_NODES.filter((n) => n.route === "bos")) assert.ok(n.cost.dust >= 1, `${n.id} はダストで買う`);
  for (const n of TREE_NODES.filter((n) => n.route && n.route !== "bos" && n.kind !== "capstone")) assert.equal(n.cost.dust | 0, 0, `${n.id} はダスト不要`);
});

test("座標: 根は中心、 同じ道は同じ向きに伸び、 隣り合う節が重ならない", () => {
  assert.deepEqual(nodePos(NODE_MAP[ROOT_ID]), { x: 0, y: 0 });
  const pts = TREE_NODES.map((n) => ({ n, p: nodePos(n) }));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i].p.x - pts[j].p.x, pts[i].p.y - pts[j].p.y);
    assert.ok(d >= 1.3, `${pts[i].n.id} と ${pts[j].n.id} が近い (${d.toFixed(2)})`);
  }
  for (const r of ROUTES) {
    const lp = routeLabelPos(r);
    const far = Math.max(...TREE_NODES.filter((n) => n.route === r.id).map((n) => Math.hypot(nodePos(n).x, nodePos(n).y)));
    assert.ok(Math.hypot(lp.x, lp.y) > far, `${r.id} の名前は奥の節より先`);
  }
});

test("費用: 強化は段ごとに × 段数、 常時と奥義は固定。 木ぜんぶで 14,000 GUM 前後・ダスト 32", () => {
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_hp, 1), { gum: 40, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_hp, 3), { gum: 120, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.bos_thunder, 2), { gum: 160, dust: 1 });
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_pancake, 1), { gum: 150, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.cap_bos, 1), { gum: 300, dust: 5 });
  assert.deepEqual(nodeCostAt(NODE_MAP[ROOT_ID], 1), { gum: 0, dust: 0 });
  const total = treeTotal();
  assert.ok(total.gum >= 13000 && total.gum <= 15000, `GUM ${total.gum}`);
  assert.equal(total.dust, 32, "奥義 21 ＋ ボスの道 11");
});

test("見え方: 最初は根だけ。 根を取ると 1 段目が見え、 2 段目は「？」", () => {
  const m = meta();
  assert.deepEqual(TREE_NODES.filter((n) => nodeShown(m, n.id)).map((n) => n.id), [ROOT_ID]);
  assert.equal(nodeState(m, ROOT_ID), "available");
  assert.equal(claimableNodes(m).map((n) => n.id).join(), ROOT_ID, "0 GUM でも根は取れる");
  assert.equal(buy(m, ROOT_ID).ok, true);
  const vis = TREE_NODES.filter((n) => nodeVisible(m, n.id)).map((n) => n.id);
  assert.deepEqual(vis.sort(), [ROOT_ID, "atk_dmg", "bos_thunder", "grw_xp", "mov_speed", "trs_gum", "vit_hp"].sort());
  const teas = TREE_NODES.filter((n) => nodeTeaser(m, n.id));
  assert.equal(teas.length, 18, "2 段目の 12 節と、 6 つの奥義が「？」(= 道の終わりが最初から見える)");
  assert.ok(teas.every((n) => n.depth === 2 || n.kind === "capstone"));
  assert.equal(nodeShown(m, "vit_pancake"), false, "3 段目はまだ出ない");
});

test("買う: 見えない・足りない・条件が合わないは通らない。 段を上げると費用が上がる", () => {
  const m = meta(100, 0);
  assert.equal(tryBuy(m, "vit_hp").reason, "hidden");
  buy(m, ROOT_ID);
  assert.equal(tryBuy(m, "vit_armor").reason, "hidden", "親を取るまで見えない");
  const r1 = buy(m, "vit_hp");
  assert.deepEqual([r1.ok, r1.rank, r1.cost.gum, m.gum], [true, 1, 40, 60]);
  assert.equal(nodeState(m, "vit_hp"), "available", "まだ上限ではない");
  assert.equal(nodeCost(m, "vit_hp").gum, 80, "2 段目は 80");
  const r2 = tryBuy(m, "vit_hp");
  assert.deepEqual([r2.ok, r2.reason, r2.short.gum], [false, "short", 20]);
  assert.equal(nodeVisible(m, "vit_armor"), true, "親を取ったので見える");
  assert.equal(nodeShown(m, "vit_pancake"), true, "その先は「？」");
  assert.equal(tryBuy(m, "vit_pancake").reason, "hidden");
  assert.equal(nodeState(m, "cap_vit"), "locked");
  assert.deepEqual(nodeBlockers(m, "cap_vit"), [{ key: "route", need: CAPSTONE_NEED, n: 1 }]);
  assert.equal(tryBuy(m, "cap_vit").reason, "locked");
});

test("奥義: その道の節を 4 つ取ると買える (= 段は数えない)。 ダストも要る", () => {
  const m = meta(10000, 2);
  buy(m, ROOT_ID);
  for (let i = 0; i < 5; i++) buy(m, "vit_hp");
  assert.equal(nodeState(m, "vit_hp"), "owned");
  assert.equal(routeCounts(m).vit, 1, "5 段でも 1 節");
  buy(m, "vit_armor"); buy(m, "vit_regen");
  assert.equal(nodeState(m, "cap_vit"), "locked", "3 節では足りない");
  buy(m, "vit_pancake");
  assert.equal(routeCounts(m).vit, 4);
  assert.equal(nodeState(m, "cap_vit"), "available");
  assert.equal(tryBuy(m, "cap_vit").reason, "short", "ダスト 3 に対して 2");
  m.dust = 3;
  assert.equal(buy(m, "cap_vit").ok, true);
  assert.deepEqual([m.dust, nodeState(m, "cap_vit"), ownedCount(m)], [0, "owned", 5]);
});

test("ボスの道は、 ダストが無いと 1 段目も買えない", () => {
  const m = meta(1000, 0);
  buy(m, ROOT_ID);
  assert.equal(tryBuy(m, "bos_thunder").reason, "short");
  assert.equal(claimableNodes(m).some((n) => n.id === "bos_thunder"), false);
  m.dust = 1;
  assert.equal(buy(m, "bos_thunder").ok, true);
  assert.deepEqual([m.gum, m.dust], [920, 0]);
});

test("作り直し: 払った合計がそのまま戻る", () => {
  const m = meta(2000, 10);
  buy(m, ROOT_ID);
  buy(m, "atk_dmg"); buy(m, "atk_dmg"); buy(m, "atk_cd"); buy(m, "bos_thunder"); buy(m, "bos_chest");
  const paid = { gum: 2000 - m.gum, dust: 10 - m.dust };
  assert.deepEqual(spentTotal(m), paid);
  assert.deepEqual(paid, { gum: 40 + 80 + 60 + 80 + 150, dust: 2 });
  assert.equal(nodeRank(m, "atk_dmg"), 2);
  assert.equal(owns(m, "nope"), false);
  assert.equal(nodeMax(NODE_MAP.atk_dmg), 5);
  assert.equal(canAfford({ gum: 1, dust: 0 }, { gum: 1, dust: 0 }), true);
});
