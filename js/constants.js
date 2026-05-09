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
// VS HUD スタッツ (= SPEC-005、 SPEC-004 から HP only に圧縮)
// ============================================================
export const STATS_INITIAL        = { hp: 100 };
export const STATS_MAX            = { hp: 100 };
// VS は idle decay 無し。 HP は戦闘ダメージでのみ減らす (= SPEC-007)。
export const STATS_DECAY_PER_TICK = { hp: 0 };

// XP / Level 初期値 (= SPEC-005)
export const XP_INITIAL          = 0;
export const XP_TO_NEXT_INITIAL  = 5;
export const LEVEL_INITIAL       = 1;

// ============================================================
// 戦闘ステージ (= SPEC-006)
// ============================================================
export const BATTLE_GRID_SIZE   = 64;       // 背景グリッドの 1 マス px
export const PLAYER_RADIUS      = 14;       // プレイヤー描画半径 px
export const PLAYER_SPEED_PX_S  = 180;      // 移動速度 px/sec
export const JOYSTICK_RADIUS    = 56;       // 仮想スティック最大偏倚 px
export const JOYSTICK_DEADZONE  = 8;        // 中央デッドゾーン px

// MCH 5 派閥 → CSS 色文字列 (= 戦闘描画用、 css 変数とほぼ同値)
export const FACTION_COLOR = {
  SEIRYU: "#5ecf8a",
  SUZAKU: "#e76060",
  BYAKKO: "#d4d4dc",
  GENBU:  "#56ccf2",
  KOURYU: "#f0c14b",
};
export const FACTION_COLOR_DEFAULT = "#c4a35a";

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
