// ============================================================
// meta.js — 挑戦をまたいで残るもの (= SPEC-090 スキルツリーの通貨と、 取った節)
// ============================================================
//
// - GUM: 挑戦が終わるたび (= 全クリア・敗北)、 活動レポートのスコアから。 GUM = √スコア ÷ 2 (最低 5)
// - ゴールドダスト: ボスを倒したときだけ。 ステージ 1/2/3 のボスで 1/2/3
// - 節 (= スキルツリーで取ったもの): id → 段
// localStorage["mcs.meta.v1"] に置く。 共通基盤には送らない (= この端末のもの)。
// 式は純関数 (= tests/meta.test.mjs)。 state を読むのは grant* だけ。

import { state } from "./state.js";
import { LS_META } from "./constants.js";

export const META_VERSION = 1;
export const GUM_MIN = 5;

/** 1 回の挑戦の GUM (= √スコア ÷ 2。 最低 GUM_MIN)。 純関数 */
export function gumForScore(score) {
  const s = Math.max(0, Number(score) || 0);
  return Math.max(GUM_MIN, Math.round(Math.sqrt(s) / 2));
}

/** ボスを倒したときのゴールドダスト (= ステージの番号。 0 始まりの idx に 1 を足す)。 純関数 */
export function dustForStage(stageIdx) {
  return Math.max(1, (stageIdx | 0) + 1);
}

/**
 * 報酬に使うスコア (= 活動レポートの computeScore と同じ式。 敗北では速さの点を入れない)。 純関数
 *   stages: [{ kills, level, elapsedMs, ownedExtensions: [{extId}] }]
 */
export function rewardScore(stages, cleared) {
  let kills = 0, ms = 0, best = 1;
  const ext = new Set();
  for (const s of stages ?? []) {
    kills += s.kills | 0;
    ms += s.elapsedMs || 0;
    if ((s.level ?? 1) > best) best = s.level;
    for (const o of s.ownedExtensions ?? []) ext.add(String(o.extId));
  }
  const speed = cleared ? Math.max(0, 60000 - Math.round((ms / 1000) * 50)) : 0;
  return kills * 100 + best * 500 + ext.size * 300 + speed + 5000;
}

/** 名前を変えた節 (= 払った GUM を失わないように読み替える) */
export const RENAMED_NODES = Object.freeze({ mov_wall: "mov_dash" });

/** 壊れた保存を既定に直す。 純関数 */
export function normalizeMeta(raw) {
  const r = (raw && typeof raw === "object") ? raw : {};
  const int = (v) => Math.max(0, Math.floor(Number(v) || 0));
  const nodes = {};
  if (r.nodes && typeof r.nodes === "object") {
    for (const [k0, v] of Object.entries(r.nodes)) { const k = RENAMED_NODES[k0] ?? k0; const n = int(v); if (n > 0 && /^[\w.]+$/.test(k)) nodes[k] = Math.max(nodes[k] ?? 0, n); }
  }
  return {
    v: META_VERSION,
    gum: int(r.gum), dust: int(r.dust),
    nodes,
    earned: { gum: int(r.earned?.gum), dust: int(r.earned?.dust) },
    runs: int(r.runs),
  };
}

let _meta = null;
const _listeners = new Set();

function _load() {
  try {
    const s = globalThis.localStorage?.getItem(LS_META);
    return normalizeMeta(s ? JSON.parse(s) : null);
  } catch (_) {
    return normalizeMeta(null);
  }
}

function _save() {
  try { globalThis.localStorage?.setItem(LS_META, JSON.stringify(_meta)); } catch (_) {}
  for (const fn of _listeners) { try { fn(_meta); } catch (e) { console.error("[meta] listener", e); } }
}

export function getMeta() {
  if (!_meta) _meta = _load();
  return _meta;
}

export function onMetaChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** 通貨を足す (= 挑戦の終わり・ボスを倒したとき)。 earned にも積む */
export function addRewards({ gum = 0, dust = 0 } = {}) {
  const m = getMeta();
  const g = Math.max(0, gum | 0), d = Math.max(0, dust | 0);
  m.gum += g; m.dust += d;
  m.earned.gum += g; m.earned.dust += d;
  _save();
  return m;
}

/** 通貨を払う (= 足りなければ何もせず false) */
export function spend({ gum = 0, dust = 0 } = {}) {
  const m = getMeta();
  if (m.gum < gum || m.dust < dust) return false;
  m.gum -= gum | 0; m.dust -= dust | 0;
  _save();
  return true;
}

export function nodeRank(id) {
  return getMeta().nodes[id] ?? 0;
}

export function setNodeRank(id, rank) {
  const m = getMeta();
  if ((rank | 0) <= 0) delete m.nodes[id]; else m.nodes[id] = rank | 0;
  _save();
}

/** 節を空にして、 通貨を refund だけ戻す (= スキルツリーの「作り直す」) */
export function resetNodes({ gum = 0, dust = 0 } = {}) {
  const m = getMeta();
  m.nodes = {};
  m.gum += Math.max(0, gum | 0); m.dust += Math.max(0, dust | 0);
  _save();
}

/** テスト用 (= 保存を読み直す) */
export function _reloadMeta() { _meta = null; return getMeta(); }

// ---- 挑戦から (= state を読む) ----

/** いまの挑戦のステージの成績 (= 終えたステージ + まだ終えていないいまのステージ) */
export function runStagesForRewards() {
  const done = (state.run?.stages ?? []).map((s) => s);
  const idx = state.currentStageIdx ?? 0;
  if (!done.some((s) => s.idx === idx) && state.battle) {
    done.push({
      idx,
      kills: state.killCount ?? 0,
      level: state.level ?? 1,
      elapsedMs: state.battle.stageElapsedMs ?? 0,
      ownedExtensions: (state.ownedExtensions ?? []).map((o) => ({ extId: o.extId })),
    });
  }
  return done;
}

/** 挑戦が終わったとき (= 全クリア・敗北): GUM を足して、 { gum, score } を返す */
export function grantRunRewards(cleared, { gumMul = 0 } = {}) {
  const score = rewardScore(runStagesForRewards(), !!cleared);
  const gum = Math.round(gumForScore(score) * (1 + Math.max(0, Number(gumMul) || 0)));   // SPEC-090c: 金勘定・金運
  const m = addRewards({ gum });
  m.runs += 1;
  _save();
  return { gum, score };
}

/** ボスを倒したとき: ゴールドダストを足して、 その数を返す */
export function grantBossDust(stageIdx, { bonus = 0 } = {}) {
  const dust = dustForStage(stageIdx) + Math.max(0, bonus | 0);   // SPEC-090c: 金運
  addRewards({ dust });
  return dust;
}

/** この挑戦で手に入れたゴールドダストの合計 (= 結果の画面に出す) */
export function runDust() {
  return (state.run?.stages ?? []).reduce((a, s) => a + (s.dust | 0), 0);
}
