// ============================================================
// skill-logic.js — スキルツリーの純関数 (= SPEC-090)。 meta = { gum, dust, nodes: { id: 段 } } を読むだけで、 書かない
// ============================================================
//
// 見える / その先 (= 「？」) / 取れる / 足りない / 条件が合わない の判定と、 費用と、 払った合計 (= 作り直しの返金)。
// 買うときは tryBuy で確かめてから、 meta.js の spend と setNodeRank で書く (= 画面の仕事)。

import { NODE_MAP, TREE_NODES, CAPSTONE_NEED, ROOT_ID } from "./skill-data.js";

export function nodeRank(meta, id) {
  return meta?.nodes?.[id] | 0;
}

export function owns(meta, id) {
  return nodeRank(meta, id) > 0;
}

/** その節の段の上限 (= repeat 以外は 1) */
export function nodeMax(n) {
  return n.kind === "repeat" ? (n.max | 0) || 1 : 1;
}

export function isMaxed(meta, id) {
  return nodeRank(meta, id) >= nodeMax(NODE_MAP[id]);
}

/** rank 段目の費用 (= repeat は gum × 段数。 dust は段ごとに同じ)。 純関数 */
export function nodeCostAt(n, rank) {
  if (!n || n.kind === "root") return { gum: 0, dust: 0 };
  const k = n.kind === "repeat" ? Math.max(1, rank | 0) : 1;
  return { gum: (n.cost?.gum | 0) * k, dust: n.cost?.dust | 0 };
}

/** 次に買う段の費用 */
export function nodeCost(meta, id) {
  return nodeCostAt(NODE_MAP[id], nodeRank(meta, id) + 1);
}

export function canAfford(meta, cost) {
  return (meta?.gum | 0) >= (cost.gum | 0) && (meta?.dust | 0) >= (cost.dust | 0);
}

/** 足りないぶん */
export function shortBy(meta, cost) {
  return { gum: Math.max(0, (cost.gum | 0) - (meta?.gum | 0)), dust: Math.max(0, (cost.dust | 0) - (meta?.dust | 0)) };
}

/** 道ごとの、 取った節の数 (= 段は数えない。 1 つの節は 1) */
export function routeCounts(meta) {
  const c = {};
  for (const n of TREE_NODES) if (n.route && owns(meta, n.id)) c[n.route] = (c[n.route] || 0) + 1;
  return c;
}

/** 取れない理由 (= 画面が文に直す)。 空なら取れる */
export function nodeBlockers(meta, id) {
  const n = NODE_MAP[id];
  const out = [];
  if (n.parent && !owns(meta, n.parent)) out.push({ key: "parent", id: n.parent });
  if (n.kind === "capstone") {
    const have = routeCounts(meta)[n.route] || 0;
    if (have < CAPSTONE_NEED) out.push({ key: "route", need: CAPSTONE_NEED, n: have });
  }
  return out;
}

/** "owned" (= 上限まで取った) / "available" / "locked" */
export function nodeState(meta, id) {
  if (isMaxed(meta, id)) return "owned";
  return nodeBlockers(meta, id).length ? "locked" : "available";
}

/** 見える (= 自分か親を取っている。 根はいつも) */
export function nodeVisible(meta, id) {
  const n = NODE_MAP[id];
  if (n.kind === "root") return true;
  return owns(meta, id) || owns(meta, n.parent);
}

/** その先 (= 親が見えているが、 まだ取っていない。 「？」で出す)。 根の子は根を取るまで出さない */
export function nodeTeaser(meta, id) {
  const n = NODE_MAP[id];
  if (n.kind === "root" || nodeVisible(meta, id)) return false;
  const p = NODE_MAP[n.parent];
  return p.kind !== "root" && nodeVisible(meta, p.id);
}

export function nodeShown(meta, id) {
  return nodeVisible(meta, id) || nodeTeaser(meta, id);
}

/** いま買える節 (= 見えていて、 条件が合っていて、 払える) */
export function claimableNodes(meta) {
  return TREE_NODES.filter((n) => nodeVisible(meta, n.id) && nodeState(meta, n.id) === "available" && canAfford(meta, nodeCost(meta, n.id)));
}

/**
 * 買えるか確かめる (= 書かない)。 { ok, reason, cost, short, rank }
 *   reason: "unknown" | "hidden" | "owned" | "locked" | "short"
 */
export function tryBuy(meta, id) {
  const n = NODE_MAP[id];
  if (!n) return { ok: false, reason: "unknown" };
  if (!nodeVisible(meta, id)) return { ok: false, reason: "hidden" };
  const st = nodeState(meta, id);
  if (st === "owned") return { ok: false, reason: "owned" };
  if (st === "locked") return { ok: false, reason: "locked", blockers: nodeBlockers(meta, id) };
  const cost = nodeCost(meta, id);
  if (!canAfford(meta, cost)) return { ok: false, reason: "short", cost, short: shortBy(meta, cost) };
  return { ok: true, cost, rank: nodeRank(meta, id) + 1 };
}

/** 取った節に払った合計 (= 作り直しで全額戻す) */
export function spentTotal(meta) {
  let gum = 0, dust = 0;
  for (const n of TREE_NODES) {
    const r = nodeRank(meta, n.id);
    for (let k = 1; k <= r; k++) { const c = nodeCostAt(n, k); gum += c.gum; dust += c.dust; }
  }
  return { gum, dust };
}

/** 木を全部埋めたときの合計 (= 釣り合いの目安。 テストで見る) */
export function treeTotal() {
  return spentTotal({ nodes: Object.fromEntries(TREE_NODES.map((n) => [n.id, nodeMax(n)])) });
}

/** 取った節の数 (= 根を除く) */
export function ownedCount(meta) {
  return TREE_NODES.filter((n) => n.kind !== "root" && owns(meta, n.id)).length;
}

// ---- SPEC-093: 初回の案内 (= セーブの状態から決める。 新しい印は持たない) ----

/** タイトルと結果の画面で入口を目立たせるか (= 1 回以上遊んだが、 根をまだ取っていない) */
export function treeNudge(meta) {
  return (meta?.runs | 0) > 0 && !owns(meta, ROOT_ID);
}

/** 木の中の案内の段: "root" (= 根を押す) / "first" (= 最初の 1 つ) / null (= 案内しない) */
export function treeGuide(meta) {
  if (!owns(meta, ROOT_ID)) return "root";
  return ownedCount(meta) === 0 ? "first" : null;
}

/** 案内で指し示す節 (= root は根、 first はいま買える節でいちばん安いもの。 無ければ null) */
export function guideTarget(meta) {
  const step = treeGuide(meta);
  if (step === "root") return ROOT_ID;
  if (step !== "first") return null;
  const list = claimableNodes(meta).filter((n) => n.kind !== "root");
  if (!list.length) return null;
  const cost = (n) => nodeCost(meta, n.id);
  return list.reduce((a, b) => (cost(b).dust < cost(a).dust || (cost(b).dust === cost(a).dust && cost(b).gum < cost(a).gum) ? b : a)).id;
}
