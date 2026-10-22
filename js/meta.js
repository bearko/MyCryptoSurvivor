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

/**
 * SPEC-136: GUM は「遊んだぶん」をそれぞれ値にして足す (= 内訳と計算式を結果の画面に出す)。
 *   生存時間 1 GUM / 秒・撃破 20 体ごとに 1 GUM・ステージクリア 50 GUM × ステージの番号・到達レベル 5 GUM / Lv・
 *   残ったギフト券 30 GUM / 枚。 スキルツリーの「金勘定」「金運」はその合計に掛かる。 ミッションの GUM は別 (= その場で入る)
 */
export const GUM_RATE = Object.freeze({ sec: 1, killsPer: 20, kill: 1, stage: 50, level: 5, gift: 30 });

/**
 * 内訳の行 (= 純関数)。 0 の行は出さない
 *   c: { sec, kills, stageNos: [1, 2], level, gifts }
 *   返す: [{ key, n, rate, gum, stageNos? }]
 */
export function gumRows({ sec = 0, kills = 0, stageNos = [], level = 0, gifts = 0 } = {}) {
  const fl = (v) => Math.floor(v + 1e-9);
  const rows = [];
  const S = Math.max(0, Math.round(Number(sec) || 0)), K = Math.max(0, kills | 0), L = Math.max(0, level | 0), G = Math.max(0, gifts | 0);
  const nos = (stageNos ?? []).map((x) => x | 0).filter((x) => x > 0);
  if (S) rows.push({ key: "sec", n: S, rate: GUM_RATE.sec, gum: fl(S * GUM_RATE.sec) });
  // 撃破は 20 体ごとに 1 GUM (= 端数を出さない。 ステージごとに足しても、 合計の式とずれない)
  if (K) { const u = Math.floor(K / GUM_RATE.killsPer); rows.push({ key: "kills", kills: K, n: u, rate: GUM_RATE.kill, gum: u * GUM_RATE.kill }); }
  if (nos.length) rows.push({ key: "stage", n: nos.reduce((a, x) => a + x, 0), rate: GUM_RATE.stage, gum: GUM_RATE.stage * nos.reduce((a, x) => a + x, 0), stageNos: nos });
  if (L) rows.push({ key: "level", n: L, rate: GUM_RATE.level, gum: L * GUM_RATE.level });
  if (G) rows.push({ key: "gifts", n: G, rate: GUM_RATE.gift, gum: G * GUM_RATE.gift });
  return rows;
}

/** 行をまとめる (= ステージごとの行を、 この挑戦の行に。 純関数) */
export function mergeGumRows(...lists) {
  const order = ["sec", "kills", "stage", "level", "gifts", "bond"];   // SPEC-165: 絆の報酬
  const by = new Map();
  for (const r of lists.flat()) {
    const o = by.get(r.key) ?? { key: r.key, n: 0, rate: r.rate, gum: 0, ...(r.key === "kills" ? { kills: 0 } : {}), ...(r.key === "stage" ? { stageNos: [] } : {}) };
    o.n += r.n; o.gum += r.gum;
    if (r.key === "kills") o.kills += r.kills | 0;
    if (r.key === "stage") o.stageNos.push(...(r.stageNos ?? []));
    by.set(r.key, o);
  }
  return order.filter((k) => by.has(k)).map((k) => by.get(k));
}

/** 行の合計と、 スキルツリーの倍率のぶん (= 純関数) */
export function gumTotal(rows, gumMul = 0) {
  const base = rows.reduce((a, r) => a + r.gum, 0);
  const mul = Math.max(0, Number(gumMul) || 0);
  const bonus = Math.round(base * mul);
  return { base, mul, bonus, total: base + bonus };
}

/** SPEC-131: ミッション達成の確定 GUM (= ★ × ステージの番号。 SPEC-137 で重さから★へ) */
export const MISSION_GUM = { 1: 30, 2: 60, 3: 120 };
export function missionGum(star, stageIdx = 0) {
  return (MISSION_GUM[star] ?? MISSION_GUM[1]) * (Math.max(0, stageIdx | 0) + 1);
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
    heroClears: _heroClears(r.heroClears),   // SPEC-106: ヒーローごとの全クリアの回数
  };
}

function _heroClears(raw) {
  const out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) { const n = Math.max(0, Math.floor(Number(v) || 0)); if (n > 0 && /^\d{1,6}$/.test(k)) out[k] = n; }
  }
  return out;
}

/** そのヒーローで全ステージをクリアしたことがあるか (= SPEC-106。 LL の解放。 純関数) */
export function hasHeroCleared(meta, heroId) {
  return heroId != null && (meta?.heroClears?.[String(heroId)] | 0) > 0;
}

/** 全ステージをクリアした (= 活動レポート)。 初めてなら true (= LL の解放を知らせる) */
export function addHeroClear(heroId) {
  if (heroId == null) return false;
  const m = getMeta();
  const k = String(heroId);
  const first = !(m.heroClears[k] > 0);
  m.heroClears[k] = (m.heroClears[k] | 0) + 1;
  _save();
  return first;
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

/** SPEC-136: ステージクリアの GUM (= そのステージの生存時間・撃破数・ステージクリア)。 足して { gum, rows, ...total } を返す */
export function grantStageGum(stage, { gumMul = 0 } = {}) {
  const rows = gumRows({ sec: (stage?.elapsedMs ?? 0) / 1000, kills: stage?.kills ?? 0, stageNos: [(stage?.idx ?? 0) + 1] });
  const t = gumTotal(rows, gumMul);
  addRewards({ gum: t.total });
  return { gum: t.total, rows, ...t };
}

/**
 * 挑戦が終わったとき (= 全クリア・敗北): まだ GUM にしていないぶん (= いまのステージ・到達レベル・残ったギフト券) を足し、
 * 結果の画面に出す「この挑戦の内訳」 (= ステージクリアとミッションでもらったぶんも合わせて) を返す。
 * 残ったギフト券はここで GUM に換える (= 財布から消す)
 */
export function grantRunRewards(cleared, { gumMul = 0 } = {}) {
  const stages = runStagesForRewards();
  const score = rewardScore(stages, !!cleared);
  const gifts = Math.max(0, state.shop?.gifts | 0);
  const level = Math.max(...stages.map((s) => s.level | 0), state.level | 0, 1);
  // まだ GUM にしていないぶん
  const open = stages.filter((s) => s.gum == null);
  // 撃破の端数は挑戦ぜんぶで持ち越す (= 内訳の「1 GUM × n（20 体ごと）」が、 合計の撃破数どおりになる)
  const paid = stages.filter((s) => s.gum != null);
  const allK = stages.reduce((a, s) => a + (s.kills | 0), 0);
  const paidUnits = paid.reduce((a, s) => a + ((s.gumRows ?? []).find((r) => r.key === "kills")?.n ?? 0), 0);
  const openK = open.reduce((a, s) => a + (s.kills | 0), 0);
  const killUnits = Math.max(0, Math.floor(allK / GUM_RATE.killsPer) - paidUnits);
  const killRow = openK > 0 ? [{ key: "kills", kills: openK, n: killUnits, rate: GUM_RATE.kill, gum: killUnits * GUM_RATE.kill }] : [];
  const nowRows = mergeGumRows(...open.map((s) => gumRows({ sec: (s.elapsedMs ?? 0) / 1000 })), killRow, gumRows({ level, gifts }));
  const now = { rows: nowRows, ...gumTotal(nowRows, gumMul) };
  const m = addRewards({ gum: now.total });
  m.runs += 1;
  _save();
  if (state.shop) state.shop.gifts = 0;   // SPEC-136: 残ったギフト券は GUM に換えた
  // この挑戦の内訳 (= ステージクリアで足した行と、 いま足した行をまとめる。 合計とずれない)
  const rows = mergeGumRows(...stages.filter((s) => s.gum != null).map((s) => s.gumRows ?? []), now.rows);
  const paidStages = stages.filter((s) => s.gum != null).reduce((a, s) => a + (s.gum | 0), 0);
  const missionGum = state.run?.missionGum | 0;
  const missions = state.run?.missionClears | 0;
  const bonus = stages.reduce((a, s) => a + (s.gumBonus | 0), 0) + now.bonus;
  const gum = paidStages + now.total + missionGum;
  return { gum, score, rows, missions, missionGum, bonus, mul: now.mul };
}

/** SPEC-131: ミッション達成の確定 GUM (= その場で足す。 挑戦の途中でやめても失わない) */
export function grantMissionGum(n) {
  const gum = Math.max(0, n | 0);
  if (gum <= 0) return 0;
  addRewards({ gum });
  if (state.run) {
    state.run.missionGum = (state.run.missionGum | 0) + gum;
    state.run.missionClears = (state.run.missionClears | 0) + 1;   // SPEC-136: 内訳の「ミッション達成 n 回」
  }
  return gum;
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
