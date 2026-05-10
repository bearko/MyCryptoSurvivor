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
// 敵 / XP gem / 仮 hardcoded 武器 (= SPEC-007)
// ============================================================
export const ENEMY_SPAWN_INTERVAL_MS = 800;     // 0.8 sec ごとに 1 体
export const ENEMY_SPAWN_MARGIN_PX   = 80;      // viewport 外周にこの分余白を取った位置で湧く
export const ENEMY_SPEED_PX_S        = 80;
export const ENEMY_HP_INITIAL        = 30;
export const ENEMY_DMG               = 10;
export const ENEMY_RADIUS            = 12;
export const ENEMY_COLOR             = "#e76060";
export const MAX_ENEMIES             = 200;

export const CONTACT_COOLDOWN_MS     = 500;     // 被弾 throttle (= 0.5 sec 無敵)

export const GEM_VALUE               = 1;
export const GEM_RADIUS              = 6;
export const GEM_COLOR               = "#f0c14b";
export const GEM_PICKUP_RADIUS       = 28;

export const XP_TO_NEXT_GROWTH       = 1.5;     // 閾値 = ceil(prev * 1.5)

// ============================================================
// Extensions as weapons + Level-up pick (= SPEC-008)
// ============================================================
export const EXT_MAX_LEVEL          = 5;
export const PROJECTILE_LIFE_MS     = 1500;
export const PROJECTILE_RADIUS      = 5;
export const PROJECTILE_DEFAULT_COLOR = "#ffffff";
export const PICK_OPTIONS_COUNT     = 3;

// extension 系列 → 投射体カラー
export const SERIES_COLOR = {
  Blade:  "#d4d4dc",
  Musket: "#56ccf2",
  Quill:  "#bb86fc",
  Armor:  "#aaaaaa",
  Horse:  "#f0c14b",
  Axe:    "#e76060",
  Dragon: "#ff7a59",
  Bull:   "#5ecf8a",
  Monkey: "#fdcb6e",
  Goblet: "#9be7c4",
};
export const SERIES_COLOR_DEFAULT = "#c4a35a";

// 候補 0 のときに付与する fallback 武器
export const FALLBACK_WEAPON = {
  extId: 0, level: 1, dmg: 8, cdMs: 1500, speedPx: 280, range: 320,
  color: SERIES_COLOR_DEFAULT, lastFireMs: 0,
};

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

// ============================================================
// SPEC-013: Hero ↔ Starter Weapon の固定 1:1 mapping
// ============================================================
// heroId (= heroes.json) → weapon extId (= extensions.json category=weapon)
export const HERO_STARTING_WEAPON = {
  1001:  1,   // コナン・ドイル → Revolver (= 探偵 / 銃)
  1002: 10,   // 甲斐姫         → Blade    (= 戦国姫 / 剣)
  1004:  4,   // シートン       → Moai     (= 自然 / 落石)
  1006:  2,   // ピタゴラス     → Book     (= 哲学 / 守護書)
  2001:  6,   // ライト兄弟     → LaserGun (= 発明 / 高速光線)
  2002:  8,   // スパルタクス   → Axe      (= 剣闘士 / 投擲斧)
  2005:  9,   // グリム兄弟     → Pierrot  (= 童話 / トリックスター)
  2011:  5,   // 孫子           → Shuriken (= 兵法 / 暗器)
  2012:  7,   // 石田三成       → Knife    (= 武将 / 短刀)
  2013:  3,   // 許褚           → Panjandrum (= 怪力 / 突進輪)
};
export const HERO_STARTING_WEAPON_DEFAULT = 1;   // 不明 hero は Revolver fallback

// ============================================================
// SPEC-014: Hero stats → battle ステータス派生
// ============================================================
export const HERO_HP_BASE        = 80;     // 基礎 HP (= 全 hero 共通)
export const HERO_HP_PER_STAT    = 0.20;   // hero.stats.hp の何 % を加算するか
export const HERO_SPEED_BASE     = 140;    // 基礎移動速度 (px/sec)
export const HERO_SPEED_PER_AGI  = 0.6;    // hero.stats.agi に乗じる係数

// ============================================================
// SPEC-016: 戦闘フィードバック (= HP バー / ダメージ数字 / hit freeze)
// ============================================================
export const HIT_FREEZE_MS          = 100;     // 被弾敵を 100ms 静止させる
export const DAMAGE_NUMBER_LIFE_MS  = 800;     // ダメージ数字の表示寿命
export const DAMAGE_NUMBER_RISE_PX_S = 36;     // ダメージ数字の上昇速度
export const HP_BAR_WIDTH           = 24;      // HP バー幅 (= 敵)
export const HP_BAR_HEIGHT          = 3;       // HP バー高さ (= 敵)
export const HP_BAR_PLAYER_WIDTH    = 32;      // HP バー幅 (= プレイヤー、 やや大きめ)
export const HP_BAR_PLAYER_HEIGHT   = 4;

// ============================================================
// SPEC-017: Sound effect / BGM パス定数 (= ASSET_BASE/Audio/SE/...)
// ============================================================
export const SFX = {
  HERO_PICK:       "Audio/SE/tooldev.mp3",
  PLAYER_DAMAGED:  "Audio/SE/1_single_damage.mp3",
  GEM_PICKUP:      "Audio/SE/crash.mp3",
  LEVEL_UP:        "Audio/SE/open_treasure.mp3",
  PICK_WEAPON:     "Audio/SE/insp.mp3",
  PICK_BUFF:       "Audio/SE/4_buff.mp3",
  PICK_HEAL:       "Audio/SE/3_heal_resurrection.mp3",
  GAME_OVER_LOSE:  "Audio/SE/lose.mp3",
  GAME_OVER_CLEAR: "Audio/SE/win.mp3",
};
export const BGM_BATTLE = "Audio/SE/pvp.mp3";

// ============================================================
// SPEC-019: XP gem アイコン (= MCH 公式 CE icon)
// ============================================================
export const GEM_ICON_PATH = "Image/Icons/ce.png";

// ============================================================
// SPEC-023: ピッカーストック上限 + リロール
// ============================================================
export const STOCK_LIMIT_WEAPON = 5;   // 武器系列の最大装備数
export const STOCK_LIMIT_BUFF   = 5;   // 強化系列の最大装備数
export const REROLL_PER_BATTLE  = 2;   // 1 戦闘あたりリロール可能回数
