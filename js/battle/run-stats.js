// ============================================================
// battle/run-stats.js — 1 回の挑戦の数字 (= SPEC-148: 負けた理由の分析)。 純関数だけ
// ============================================================
//
// 挑戦のあいだ state.run.stats に積む (= 被ダメの出どころ・武器ごとの与ダメ・回復・とどめ)。
// 倒れた画面と全クリアの画面で summarize() して表に出し、 前回 (= 同じヒーロー・同じモード) と自己ベストと比べる。
// 覚えるのは localStorage["mcs.runlog.v1"] (= この端末のもの。 共通基盤には送らない)。
// DOM はここに書かない (= 描くのは analysis-ui.js)。

import { LS_PREFIX } from "../constants.js";

export const LS_RUNLOG = `${LS_PREFIX}.runlog.v1`;

/** 被ダメの出どころ (= 出す順) */
export const TAKEN_KINDS = Object.freeze(["contact", "shot", "boss", "gimmick"]);
/** 回復の出どころ */
export const HEAL_KINDS = Object.freeze(["pancake", "regen", "shop", "skip", "phoenix"]);
/** 武器以外の与ダメの出どころ (= 武器は w:<extId>) */
export const DEALT_OTHER = Object.freeze(["sig", "ll", "thunder", "gimmick", "other"]);

/** 撃破/分 がこれより低ければ「火力が足りない」 (= 初めての人の 1 回目が 200 前後) */
export const LOW_KILLS_PER_MIN = 200;

export function newRunStats() {
  return {
    ms: 0, kills: 0, hits: 0,
    taken: Object.fromEntries(TAKEN_KINDS.map((k) => [k, 0])),
    dealt: {},           // { "w:10": 1234, sig: 56, ... }
    dealtBoss: 0,
    healed: Object.fromEntries(HEAL_KINDS.map((k) => [k, 0])),
    lastHit: null,       // { kind, name }
    killer: null,        // 倒れたときの lastHit
  };
}

export function tickRunStats(s, dt) {
  if (!s) return;
  s.ms += Math.max(0, dt) * 1000;
}

/** 受けた (= kind は TAKEN_KINDS。 name は敵・仕掛けの名前) */
export function recordTaken(s, kind, amt, name = null) {
  if (!s || !(amt > 0)) return;
  const k = TAKEN_KINDS.includes(kind) ? kind : "contact";
  s.taken[k] += amt;
  s.hits += 1;
  s.lastHit = { kind: k, name: name ?? null };
}

/** 倒れた (= とどめは最後に受けたもの) */
export function recordDown(s) {
  if (!s) return;
  s.killer = s.lastHit ? { ...s.lastHit } : null;
}

/** 与えた (= src は w:<extId> か DEALT_OTHER) */
export function recordDealt(s, src, amt, isBoss = false) {
  if (!s || !(amt > 0)) return;
  const k = src == null ? "other" : String(src);
  s.dealt[k] = (s.dealt[k] ?? 0) + amt;
  if (isBoss) s.dealtBoss += amt;
}

export function recordHeal(s, kind, amt) {
  if (!s || !(amt > 0)) return;
  const k = HEAL_KINDS.includes(kind) ? kind : "pancake";
  s.healed[k] += amt;
}

export function recordKill(s) {
  if (s) s.kills += 1;
}

const r1 = (x) => Math.round(x * 10) / 10;
const pct = (a, total) => (total > 0 ? Math.round((a / total) * 100) : 0);

/**
 * 表に出す数字 (= 保存するのもこれ)
 *   sec, kills, dps, killsPerMin, takenTotal, takenPerMin, taken: [{kind, amt, pct}],
 *   dealtTotal, dealtBoss, weapons: [{src, amt, pct}] (= 多い順), healedTotal, healed, killer
 */
export function summarize(s, extra = {}) {
  const st = s ?? newRunStats();
  const sec = Math.max(0, st.ms / 1000);
  const min = sec / 60;
  const takenTotal = TAKEN_KINDS.reduce((a, k) => a + (st.taken[k] | 0), 0);
  const dealtTotal = Object.values(st.dealt).reduce((a, v) => a + (v | 0), 0);
  const healedTotal = HEAL_KINDS.reduce((a, k) => a + Math.round(st.healed[k] ?? 0), 0);
  const weapons = Object.entries(st.dealt).map(([src, amt]) => ({ src, amt: amt | 0, pct: pct(amt, dealtTotal) }))
    .filter((w) => w.amt > 0).sort((a, b) => b.amt - a.amt);
  return {
    at: extra.at ?? Date.now(),
    sec: Math.round(sec), kills: st.kills | 0, hits: st.hits | 0,
    dps: sec > 0 ? r1(dealtTotal / sec) : 0,
    killsPerMin: min > 0 ? Math.round(st.kills / min) : 0,
    takenTotal, takenPerMin: min > 0 ? Math.round(takenTotal / min) : 0,
    taken: TAKEN_KINDS.map((kind) => ({ kind, amt: st.taken[kind] | 0, pct: pct(st.taken[kind] | 0, takenTotal) })),
    dealtTotal, dealtBoss: st.dealtBoss | 0, weapons,
    healedTotal, healed: Object.fromEntries(HEAL_KINDS.map((k) => [k, Math.round(st.healed[k] ?? 0)])),
    killer: st.killer ? { ...st.killer } : null,
    ...(extra.level != null ? { level: extra.level | 0 } : {}),
    ...(extra.stage != null ? { stage: extra.stage | 0 } : {}),
  };
}

/** 比べる行 (= key・大きいほうがよいか) */
export const COMPARE_ROWS = Object.freeze([
  { key: "sec", better: "high" },
  { key: "dps", better: "high" },
  { key: "killsPerMin", better: "high" },
  { key: "takenPerMin", better: "low" },
  { key: "healedTotal", better: null },
]);

/**
 * 今回と前回の差 (= 符号つき)。 better: "high" | "low" | null → up: よくなったか (= null なら矢印なし)
 */
export function compareRow(key, now, prev, better) {
  const a = Number(now?.[key] ?? 0), b = prev ? Number(prev[key] ?? 0) : null;
  if (b == null) return { key, now: a, prev: null, delta: null, up: null };
  const delta = r1(a - b);
  const up = better == null || delta === 0 ? null : (better === "high" ? delta > 0 : delta < 0);
  return { key, now: a, prev: b, delta, up };
}

/** 自己ベスト (= 長く生き残ったほう。 同じなら撃破数) */
export function pickBest(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  if ((a.sec | 0) !== (b.sec | 0)) return a.sec > b.sec ? a : b;
  return (a.kills | 0) >= (b.kills | 0) ? a : b;
}

/** 記録の鍵 (= ヒーロー × モード。 EASY は短いステージなので別に数える) */
export function runLogKey(heroId, { easy = false, regulation = "NORMAL" } = {}) {
  return `${heroId ?? "?"}:${easy ? "EASY" : (regulation || "NORMAL")}`;
}

/**
 * 記録に足して、 比べる相手を返す (= 純関数。 log は { [key]: { lastDefeat, lastClear, best } })
 *   返す: { log, prev (= 倒れたなら前回の敗北、 クリアなら前回のクリア), best (= 今回を入れる前の自己ベスト), newBest }
 */
export function rememberRun(log, key, sum, cleared) {
  const cur = (log && log[key]) || {};
  const prev = cleared ? (cur.lastClear ?? null) : (cur.lastDefeat ?? null);
  const best = cur.best ?? null;
  const nextBest = pickBest(best, sum);
  const entry = { ...cur, best: nextBest, ...(cleared ? { lastClear: sum } : { lastDefeat: sum }) };
  return { log: { ...(log ?? {}), [key]: entry }, prev, best, newBest: nextBest === sum && best !== null };
}

export function loadRunLog(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(LS_RUNLOG) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
export function saveRunLog(log, storage = globalThis.localStorage) {
  try { storage?.setItem(LS_RUNLOG, JSON.stringify(log ?? {})); return true; } catch { return false; }
}

/**
 * マインちゃんのおすすめ (= SPEC-148 §4。 上から順に最初に当たったもの)
 *   返す: { key (= i18n の advice.*), nodes: [節の id] } か null (= 1 度も受けていない)
 */
export function suggest(sum) {
  if (!sum || !(sum.takenTotal > 0)) return null;
  const share = Object.fromEntries(sum.taken.map((x) => [x.kind, x.pct]));
  if (share.shot >= 45) return { key: "advice.shot", nodes: ["vit_armor", "mov_ghost"] };
  if (share.contact >= 60 && sum.killsPerMin < LOW_KILLS_PER_MIN) return { key: "advice.crowdDps", nodes: ["atk_dmg", "atk_bullet"] };
  if (share.contact >= 60) return { key: "advice.crowdMove", nodes: ["mov_speed", "atk_range"] };
  if (share.boss >= 50) return { key: "advice.boss", nodes: ["bos_dmg", "bos_tele"] };
  if (share.gimmick >= 40) return { key: "advice.gimmick", nodes: [] };
  return { key: "advice.hp", nodes: ["vit_hp"] };
}
