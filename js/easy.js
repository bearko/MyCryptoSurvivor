// ============================================================
// easy.js — EASY (= 初めての人のための短い 3 ステージ。 SPEC-147)。 設定と純関数
// ============================================================
//
// NORMAL の STAGE_TABLE はそのままに、 時間・湧き・ボスの HP だけを上書きする (= EASY_STAGES)。
// ヒーローは根 (= サバイバーの覚醒) を取るまで弱い (= ステージ 3 で負けて、 スキルツリーへ)。
// 共通基盤にはステージ・スコア・RTA を送らない。 ABSOLUTE・RTA のロックも開かない (= NORMAL を 1 回終えてから)。
// 「いま EASY か」は state.easyMode。 ここでは state を読むだけ (= 書くのは mode-select)。

import { state } from "./state.js";
import { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS, LS_PREFIX } from "./constants.js";
import { owns } from "./skill-logic.js";
import { ROOT_ID } from "./skill-data.js";

export const LS_EASY_CLEARED = `${LS_PREFIX}.easyCleared`;
export const LS_LESSONS = `${LS_PREFIX}.lessons`;

/** 根を取るまでのヒーローの弱さ (= HP と攻撃。 EASY だけ) */
export const EASY_HERO_MUL = 0.6;

/**
 * ステージごとの上書き (= ms)。 NORMAL の表に無いものだけ
 *   bossAtMs / warnMs : ボスが出る時刻と、 その前の予告
 *   shopTimesMs       : 店が開く時刻 (= 0 は開始の前)
 *   spawnIntervalMs   : 雑魚の湧きの間隔 (= flood・density・寄せ直しは使わない)
 *   enemyHpMul / enemyDmgMul / bossHpMul / bossDmgMul (= NORMAL のボスは Lv.40 向けなので、 EASY では HP を大きく下げる)
 *   chestTimesMs      : 宝箱
 *   rareAtMs          : レアエネミーを必ず出す時刻 (= null なら出さない)
 *   missionAtMs       : ミッションを必ず持ちかける時刻 (= ★1・durS)
 *   thunderAtBoss     : ボスが出た瞬間に雷鼓を足もとに落とす (= 雑魚に使ってしまわないよう、 予告ではなくボスが出てから)
 */
export const EASY_STAGES = Object.freeze([
  // SPEC-149: 敵の数は 1/3 (= 湧きの間隔 ×3)。 ステージ 1 は動かなくても倒れない、 ステージ 2 は動かないと倒れる
  { bossAtMs: 15000, warnMs: 4000,  shopTimesMs: [10000],            spawnIntervalMs: 960,  enemyHpMul: 0.5, enemyDmgMul: 0.25, bossHpMul: 0.003, bossDmgMul: 0.25, chestTimesMs: [5000],        rareAtMs: null, missionAtMs: null, thunderAtBoss: false },
  { bossAtMs: 30000, warnMs: 5000,  shopTimesMs: [0, 15000],         spawnIntervalMs: 1140, enemyHpMul: 1.0, enemyDmgMul: 1.2, bossHpMul: 0.008, bossDmgMul: 0.4, chestTimesMs: [10000],       rareAtMs: 5000, missionAtMs: 8000, missionDurS: 15, thunderAtBoss: false },
  { bossAtMs: 45000, warnMs: 10000, shopTimesMs: [0, 15000, 30000],  spawnIntervalMs: 1140, enemyHpMul: 1.6, enemyDmgMul: 1.8, bossHpMul: 0.012, bossDmgMul: 0.5, chestTimesMs: [10000, 30000], rareAtMs: null, missionAtMs: null, thunderAtBoss: true },
]);

/** レッスンの番号 (= 出す順。 文は data/i18n/ui.json の lesson.<番号>、 ボイスは lesson.<番号>) */
export const LESSON_KEYS = Object.freeze([
  "s1.move", "s1.ce", "s1.shop", "s1.boss", "s1.clear",
  "s2.start", "s2.rare", "s2.gift", "s2.mission", "s2.reward", "s2.boss",
  "s3.start", "s3.lose", "s3.root", "s3.thunder", "s3.clear",
]);

export function isEasy() {
  return !!state.easyMode;
}

/** いまのステージの上書き (= EASY でなければ null) */
export function easyStage(idx = state.currentStageIdx ?? 0) {
  return isEasy() ? (EASY_STAGES[Math.max(0, Math.min(EASY_STAGES.length - 1, idx | 0))] ?? null) : null;
}

/** ボスが出る時刻・予告の長さ (= 戦闘の各所が定数の代わりに呼ぶ) */
export function bossSpawnAtMs() {
  return easyStage()?.bossAtMs ?? BOSS_SPAWN_AT_MS;
}
export function bossWarnLeadMs() {
  return easyStage()?.warnMs ?? BOSS_WARNING_LEAD_MS;
}

/** ヒーローの倍率 (= EASY で根を取るまで 0.6。 ほかは 1。 純関数) */
export function easyHeroMul(meta, easy = isEasy()) {
  return easy && !owns(meta, ROOT_ID) ? EASY_HERO_MUL : 1;
}

/** EASY をクリアしたか (= 純関数。 storage は getItem を持つもの) */
export function hasClearedEasy(storage = globalThis.localStorage) {
  try { return storage?.getItem(LS_EASY_CLEARED) === "1"; } catch { return false; }
}
export function markEasyCleared(storage = globalThis.localStorage) {
  try { storage?.setItem(LS_EASY_CLEARED, "1"); return true; } catch { return false; }
}

/** 見たレッスン (= 純関数。 壊れていたら空) */
export function loadLessons(storage = globalThis.localStorage) {
  try {
    const arr = JSON.parse(storage?.getItem(LS_LESSONS) ?? "[]");
    return new Set(Array.isArray(arr) ? arr.filter((k) => LESSON_KEYS.includes(k)) : []);
  } catch { return new Set(); }
}
export function saveLessons(seen, storage = globalThis.localStorage) {
  try { storage?.setItem(LS_LESSONS, JSON.stringify([...seen])); } catch { /* 覚えられなくても動く */ }
}
