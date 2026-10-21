// ============================================================
// skill-bulk.js — いま解放できる節を安い順に一括で (= SPEC-157)。 純関数 (= 書かない)
// ============================================================
//
// 木の「解放可能なスキルを一括解放」。 手持ちの GUM (とゴールドダスト) で買えるものを、 安い順に 1 つずつ買ったつもりで進め、
// 買えなくなるまで続ける (= 1 つ買うと見える節・買える段が変わるので、 毎回 claimableNodes を引き直す)。
// ゴールドダストは「使う」にしたときだけ (= 既定は使わない。 道の到達点の素材を一括で食わないため)。
// 返した順に、 画面の側が spend → setNodeRank する。

import { claimableNodes, nodeCost, tryBuy } from "./skill-logic.js";

/** 1 回の一括で買う上限 (= 無限に回らないため。 節は 92 なので足りる) */
export const BULK_MAX = 200;

/** 安い順 (= GUM → ダスト → id) */
export function cheaperFirst(meta) {
  return (a, b) => {
    const ca = nodeCost(meta, a.id), cb = nodeCost(meta, b.id);
    return (ca.gum - cb.gum) || (ca.dust - cb.dust) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  };
}

/**
 * 一括の計画 (= 純関数)。 meta は読むだけ。 useDust: ゴールドダストを使う節も買う
 *   返す: { steps: [{ id, rank, cost }], gum, dust (= 払う合計), left: { gum, dust } (= 残り) }
 */
export function bulkPlan(meta, { useDust = false } = {}) {
  const steps = [];
  let gum = 0, dust = 0;
  if (!meta) return { steps, gum, dust, left: { gum: 0, dust: 0 } };
  const m = { ...meta, gum: meta.gum | 0, dust: meta.dust | 0, nodes: { ...(meta.nodes ?? {}) } };
  for (let i = 0; i < BULK_MAX; i++) {
    const cand = claimableNodes(m).filter((n) => useDust || nodeCost(m, n.id).dust === 0).sort(cheaperFirst(m));
    const n = cand[0];
    if (!n) break;
    const r = tryBuy(m, n.id);
    if (!r.ok) break;
    m.gum -= r.cost.gum; m.dust -= r.cost.dust; m.nodes[n.id] = r.rank;
    gum += r.cost.gum; dust += r.cost.dust;
    steps.push({ id: n.id, rank: r.rank, cost: r.cost });
  }
  return { steps, gum, dust, left: { gum: m.gum, dust: m.dust } };
}
