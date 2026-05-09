// ============================================================
// constants.js — 共通定数 / アセット URL ヘルパ
// ============================================================

// MyCryptoSurvivor は MCH 経済圏の fan project として
// `bearko/mycryptoheroes` の curated 図鑑 (= heroes / extensions / enemies / images)
// を直接参照する (= SPEC-003)。
export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/mycryptoheroes/main/";

/**
 * 画像 URL を組み立てる
 * @param {string} relPath - "Image/Heroes/1.png" 等
 * @returns {string}
 */
export function img(relPath) {
  return ASSET_BASE + relPath;
}

/**
 * 音声 URL を組み立てる
 * @param {string} relPath - "Audio/se_click.mp3" 等
 * @returns {string}
 */
export function audioUrl(relPath) {
  return ASSET_BASE + relPath;
}

// ============================================================
// 時間制御
// ============================================================
export const TICK_INTERVAL_MS = 1000;
export const SECONDS_PER_WEEK = 7;
export const WEEKS_PER_MONTH = 4;
export const MONTHS_PER_YEAR = 12;

// ============================================================
// サバイバル HUD スタッツ (= SPEC-004、 Phase 1 暫定値)
// ============================================================
export const STATS_INITIAL        = { hp: 100, temp: 50,  food: 100 };
export const STATS_MAX            = { hp: 100, temp: 100, food: 100 };
// 1 tick = 1 sec。 食料 1000 tick (≈17 min) で 0、 体温 1000 tick で 0、 HP 5000 tick (≈83 min) で 0。
export const STATS_DECAY_PER_TICK = { hp: 0.02, temp: 0.05, food: 0.10 };

// ============================================================
// localStorage キー (= prefix を統一)
// ============================================================
export const LS_PREFIX = "mcs";   // MyCryptoSurvivor
export const LS_LANG = `${LS_PREFIX}.lang`;
export const LS_PLAYER_NAME = `${LS_PREFIX}.playerName`;
export const LS_RANKING_API_URL = `${LS_PREFIX}.rankingApiUrl`;
export const LS_SAVE = `${LS_PREFIX}.save.v1`;

// ============================================================
// バージョン (= ranking version filter に使う)
// ============================================================
export const APP_VERSION = "0.1.0";

// ============================================================
// デバッグフラグ
// ============================================================
export const DEBUG_PAUSE = false;       // pauseTime / resumeTime ログ
export const DEBUG_TICK = false;        // onTick ログ
