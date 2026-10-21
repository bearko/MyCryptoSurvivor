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

test("節は根 ＋ 36 ＋ エクステ別 21 ＋ 仕込み 21 ＋ 武器の目利き 10 ＋ 得意武器 ＋ 合体ロボ で、 id が重ならず、 requires の先が実在する (= SPEC-133 / 139 / 140)", () => {
  assert.equal(NODES.length, 91);
  assert.equal(new Set(NODES.map((n) => n.id)).size, 91);
  assert.equal(NODE_MAP[ROOT_ID].kind, "root");
  assert.deepEqual(NODE_MAP[ROOT_ID].requires, []);
  for (const n of NODES) {
    if (n.kind === "root") continue;
    assert.ok(ROUTE_MAP[n.route], `${n.id} の道`);
    assert.ok(Array.isArray(n.requires) && n.requires.length > 0, `${n.id} の requires`);
    for (const r of n.requires) assert.ok(NODE_MAP[r], `${n.id} の親 ${r} がある`);
    assert.ok(Number.isInteger(n.x) && Number.isInteger(n.y), `${n.id} はマス目の上`);
    assert.ok(["repeat", "perk", "capstone"].includes(n.kind), `${n.id} の種類`);
    assert.ok(n.name?.ja && n.name?.en && n.desc?.ja && n.desc?.en, `${n.id} の名前と説明 (ja/en)`);
    assert.ok(Number.isInteger(n.icon) && n.icon > 0, `${n.id} の絵`);
    assert.ok((n.cost?.gum | 0) > 0, `${n.id} は GUM が要る`);
    assert.ok(n.fx && Object.keys(n.fx).length > 0, `${n.id} の効果`);
    if (n.kind === "repeat") assert.ok(n.max >= 2, `${n.id} の段数`); else assert.equal(n.max, undefined);
  }
});

test("配置 (= SPEC-133): 2 つの節が同じマスに無い・離れ小島が無い (= 8 方向で隣り合うものをたどると、 根からすべてに届く)", () => {
  const cells = new Map();
  for (const n of TREE_NODES) {
    const k = `${n.x},${n.y}`;
    assert.ok(!cells.has(k), `${n.id} と ${cells.get(k)} が ${k} で重なる`);
    cells.set(k, n.id);
  }
  const seen = new Set([ROOT_ID]);
  const queue = [NODE_MAP[ROOT_ID]];
  while (queue.length) {
    const a = queue.pop();
    for (const b of TREE_NODES) {
      if (seen.has(b.id) || Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) continue;
      seen.add(b.id);
      queue.push(b);
    }
  }
  assert.deepEqual(TREE_NODES.filter((n) => !seen.has(n.id)).map((n) => `${n.id}@${n.x},${n.y}`), []);
});

test("どの道も 6 節で、 1 段目が根の子・奥義は 3 段目から。 道は軸に沿って伸びる。 奥義とボスの道はゴールドダストが要る", () => {
  const main = ROUTES.filter((r) => !r.minor);
  assert.equal(main.length, 6);
  for (const r of main) {
    const ns = TREE_NODES.filter((n) => n.route === r.id);
    assert.equal(ns.length, 6, r.id);
    const d1 = ns.filter((n) => n.depth === 1);
    assert.equal(d1.length, 1); assert.deepEqual(d1[0].requires, [ROOT_ID]);
    assert.deepEqual([d1[0].x, d1[0].y], r.d1, `${r.id} の 1 段目`);
    const caps = ns.filter((n) => n.kind === "capstone");
    assert.equal(caps.length, 1);
    assert.deepEqual(caps[0].requires.map((id) => NODE_MAP[id].depth), [3, 3], `${r.id} の奥義は 3 段目から`);
    assert.deepEqual([caps[0].x, caps[0].y], [r.d1[0] + r.axis[0] * 3, r.d1[1] + r.axis[1] * 3], `${r.id} の奥義は軸の 3 つ先`);
    assert.ok(caps[0].cost.dust >= 3, `${r.id} の奥義はダスト`);
  }
  for (const n of TREE_NODES.filter((n) => n.route === "bos")) assert.ok(n.cost.dust >= 1, `${n.id} はダストで買う`);
  for (const n of TREE_NODES.filter((n) => n.route && n.route !== "bos" && n.kind !== "capstone")) assert.equal(n.cost.dust | 0, 0, `${n.id} はダスト不要`);
});

test("座標: 根は中心、 同じ道は同じ向きに伸び、 隣り合う節が重ならない", () => {
  assert.deepEqual(nodePos(NODE_MAP[ROOT_ID]), { x: 0, y: 0 });
  const pts = TREE_NODES.map((n) => ({ n, p: nodePos(n) }));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i].p.x - pts[j].p.x, pts[i].p.y - pts[j].p.y);
    assert.ok(d >= 0.9, `${pts[i].n.id} と ${pts[j].n.id} が近い (${d.toFixed(2)})`);
  }
  for (const r of ROUTES) {
    const lp = routeLabelPos(r);
    const far = Math.max(...TREE_NODES.filter((n) => n.route === r.id).map((n) => Math.hypot(nodePos(n).x, nodePos(n).y)));
    assert.ok(Math.hypot(lp.x, lp.y) > far, `${r.id} の名前は奥の節より先`);
  }
});

test("費用: 強化は段ごとに × 段数、 常時と奥義は固定。 武器の極意の 1 段目は無料 (= SPEC-133)。 ダスト 32", () => {
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_hp, 1), { gum: 40, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_hp, 3), { gum: 120, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.bos_thunder, 2), { gum: 160, dust: 1 });
  assert.deepEqual(nodeCostAt(NODE_MAP.vit_pancake, 1), { gum: 150, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.cap_bos, 1), { gum: 300, dust: 5 });
  assert.deepEqual(nodeCostAt(NODE_MAP[ROOT_ID], 1), { gum: 0, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.wm_5, 1), { gum: 0, dust: 0 }, "ヒーローを仲間にしたら 1 段目は無料");
  assert.deepEqual(nodeCostAt(NODE_MAP.wm_5, 2), { gum: 80, dust: 0 });
  assert.deepEqual(nodeCostAt(NODE_MAP.bm_19, 1), { gum: 40, dust: 0 }, "強化の目利きは持ち主がいないので 40 から");
  const total = treeTotal();
  // SPEC-139: 仕込み 21 × (150 ＋ 300)・武器の目利き 10 × 600・得意武器 100 ＋ 200 ＋ 300
  assert.equal(total.gum, 13610 + 21 * 600 - 10 * 40 + 21 * 450 + 10 * 600 + 600 + 120 * 15, `GUM ${total.gum}`);   // SPEC-140: 合体ロボ 120 × (1 … 5)
  assert.equal(total.dust, 32, "奥義 21 ＋ ボスの道 11");
});

test("見え方 (= SPEC-133): 最初は根だけ。 根を取ると 1 段目が見え、 2 段目は「？」。 奥義はまだ出ない", () => {
  const m = meta();
  assert.deepEqual(TREE_NODES.filter((n) => nodeShown(m, n.id)).map((n) => n.id), [ROOT_ID]);
  assert.equal(nodeState(m, ROOT_ID), "available");
  assert.equal(claimableNodes(m).map((n) => n.id).join(), ROOT_ID, "0 GUM でも根は取れる");
  assert.equal(buy(m, ROOT_ID).ok, true);
  const vis = TREE_NODES.filter((n) => nodeVisible(m, n.id)).map((n) => n.id);
  assert.deepEqual(vis.sort(), [ROOT_ID, "atk_dmg", "bos_thunder", "grw_xp", "mov_speed", "trs_gum", "vit_hp"].sort());
  const teas = TREE_NODES.filter((n) => nodeTeaser(m, n.id)).map((n) => n.id);
  assert.equal(teas.length, 12 + 3, "2 段目の 12 節と、 武器・強化の入口 (= ブレード・ギョク) と得意武器が「？？？」");
  assert.ok(teas.includes("wm_10") && teas.includes("bm_19") && teas.includes("wm_main"));
  assert.ok(!TREE_NODES.some((n) => n.kind === "capstone" && nodeShown(m, n.id)), "奥義はまだ見せない");
  assert.equal(nodeShown(m, "vit_pancake"), false, "3 段目はまだ出ない");
});

test("武器の極意 (= SPEC-133): ヒーローを仲間にしていれば 1 段目が無料。 本作のヒーローは数珠つなぎ、 ほかのタイトルは分岐", () => {
  const m = { ...meta(1000, 0), heroes: new Set([10001, 4006]) };
  buy(m, ROOT_ID); buy(m, "atk_dmg");
  assert.equal(nodeVisible(m, "wm_10"), true, "ブレード (= 最初から仲間) は攻撃の 1 段目で開く");
  const r = buy(m, "wm_10");
  assert.deepEqual([r.ok, r.cost.gum], [true, 0]);
  assert.equal(buy(m, "wm_1").ok, true, "リボルバーも最初から仲間");
  // 手裏剣は霧隠才蔵がまだ → 見えるが鍵 (= 「？？？」)
  assert.equal(nodeTeaser(m, "wm_5"), true);
  assert.deepEqual(nodeBlockers(m, "wm_5"), [{ key: "hero", heroId: 2043 }]);
  m.heroes.add(2043);
  assert.equal(nodeVisible(m, "wm_5"), true);
  // 雪だるまは手裏剣の先 (= 数珠つなぎ)。 ほかのタイトルのヒーローはブレード・リボルバーから分岐
  assert.deepEqual(NODE_MAP.wm_9.requires, ["wm_5"]);
  for (const id of ["wm_2", "wm_3"]) assert.deepEqual(NODE_MAP[id].requires, ["wm_10"]);
  for (const id of ["wm_8", "wm_4"]) assert.deepEqual(NODE_MAP[id].requires, ["wm_1"]);
  m.heroes.add(1006);
  assert.equal(nodeVisible(m, "wm_2"), true, "ピタゴラスを先に仲間にしても、 ブックはすぐ開ける");
  // 仲間にしていないヒーローの節は、 GUM があっても取れない
  assert.equal(tryBuy(m, "wm_4").reason, "hidden");
  assert.equal(nodeBlockers({ ...m, heroes: undefined }, "wm_10")[0].key, "hero", "使えるヒーローが分からなければ取れない");
});

test("SPEC-139: 仕込みは先手から左上のくし・武器の目利きは強化の目利きの先・得意武器は攻撃の 1 段目の隣", () => {
  const sl = NODES.filter((n) => n.route === "sl");
  assert.equal(sl.length, 21);
  assert.deepEqual(NODE_MAP.sl_10.requires, ["grw_start"], "1 枚目は成長の「先手」から");
  for (const n of sl) {
    assert.deepEqual([n.kind, n.max, n.cost.gum], ["repeat", 2, 150], n.id);
    assert.deepEqual(n.fx, { [`slv_${n.extId}`]: 1 });
    const p = NODE_MAP[n.requires[0]];
    assert.ok(Math.abs(p.x - n.x) <= 1 && Math.abs(p.y - n.y) <= 1, `${n.id} は親の隣`);
    assert.ok(n.x <= -3 && n.y <= -2, `${n.id} は左上`);
  }
  const wc = NODES.filter((n) => n.id.startsWith("wc_"));
  assert.equal(wc.length, 10);
  assert.deepEqual(NODE_MAP.wc_10.requires, ["bm_15"]);
  for (const n of wc) {
    assert.deepEqual(n.fx, { [`cut_${n.extId}`]: 0.06 });
    const p = NODE_MAP[n.requires[0]];
    assert.ok(Math.abs(p.x - n.x) <= 1 && Math.abs(p.y - n.y) <= 1, `${n.id} は親の隣`);
  }
  assert.deepEqual([NODE_MAP.wm_main.x, NODE_MAP.wm_main.y, NODE_MAP.wm_main.max], [1, -1, 3]);
  assert.deepEqual(NODE_MAP.wm_main.requires, ["atk_dmg"]);
});

test("取ってある節は、 条件が変わっても上げられる (= 前の版で根から取った極意)", () => {
  const m = { ...meta(1000, 0, { [ROOT_ID]: 1, wm_7: 1 }), heroes: new Set([10001, 4006]) };
  assert.equal(nodeVisible(m, "wm_7"), true);
  assert.equal(nodeState(m, "wm_7"), "available");
  assert.equal(tryBuy(m, "wm_7").ok, true);
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
  assert.deepEqual(nodeBlockers(m, "cap_vit"), [{ key: "parent", id: "vit_pancake", ids: ["vit_pancake", "vit_phoenix"] }, { key: "route", need: CAPSTONE_NEED, n: 1 }]);
  assert.equal(nodeShown(m, "cap_vit"), false, "奥義は 3 段目に届くまで見せない (= SPEC-133)");
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
