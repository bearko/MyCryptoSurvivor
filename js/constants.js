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
// SPEC-026: 初期閾値を 5 → 4、 成長率も 1.5 → 1.3 に下げてレベルアップ頻度 UP
export const XP_INITIAL          = 0;
export const XP_TO_NEXT_INITIAL  = 4;
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

export const XP_TO_NEXT_GROWTH       = 1.3;     // SPEC-026: 1.5 → 1.3 に緩和 (= 後半のレベル間隔を短縮)

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
// SPEC-017: Sound effect / BGM パス定数
// SPEC-025: MCH カタログ実パス (= Audio/SE/{Actions,Battle,Jingles}/* と Audio/BGM/*) に整合
// ============================================================
export const SFX = {
  HERO_PICK:       "Audio/SE/Actions/tooldev.mp3",
  PLAYER_DAMAGED:  "Audio/SE/Battle/1_single_damage.mp3",
  GEM_PICKUP:      "Audio/SE/Actions/crash.mp3",
  LEVEL_UP:        "Audio/SE/Actions/open_treasure.mp3",
  PICK_WEAPON:     "Audio/SE/Actions/insp.mp3",
  PICK_BUFF:       "Audio/SE/Battle/4_buff.mp3",
  PICK_HEAL:       "Audio/SE/Battle/3_heal_resurrection.mp3",
  GAME_OVER_LOSE:  "Audio/SE/Jingles/lose.mp3",
  GAME_OVER_CLEAR: "Audio/SE/Jingles/win.mp3",
};
export const BGM_BATTLE = "Audio/BGM/pvp.mp3";

// ============================================================
// SPEC-019: XP gem アイコン (= MCH 公式 CE icon)
// ============================================================
export const GEM_ICON_PATH = "Image/Icons/ce.png";

// ============================================================
// SPEC-022: ステージ進行 + wave + ボス
// ============================================================
export const STAGE_DURATION_MS  = 300000;   // 5 分間
export const BOSS_SPAWN_AT_MS   = 240000;   // 4 分経過時にボススポーン
export const BOSS_ENEMY_ID      = 171;      // ディープ・ヨシュカ

// 1 分ごとに pool に追加する敵 ID
export const WAVE_TABLE = [
  { fromMs:      0, pool: [101] },
  { fromMs:  60000, pool: [101, 124] },
  { fromMs: 120000, pool: [101, 124, 134] },
  { fromMs: 180000, pool: [101, 124, 134, 164] },
  { fromMs: 240000, pool: [101, 124, 134, 164] },   // 雑魚継続 + ボス別途 spawn
];

// 個別敵スペック (= MCH stats とは別の game balance)
// SPEC-026: xpValue を追加 (= 強い敵ほど多い経験値を落とす、 後半サクサクレベルアップ)
// SPEC-030: 各ステージのボス (373 = ファオ、 1189 = yamap) 追加
export const ENEMY_SPECS = {
  101:  { hp:   25, dmg: 10, speed: 80, radius: 12, xpValue:   1 },
  124:  { hp:   55, dmg: 14, speed: 75, radius: 14, xpValue:   2 },
  134:  { hp:   95, dmg: 18, speed: 70, radius: 16, xpValue:   4 },
  164:  { hp:  160, dmg: 22, speed: 65, radius: 19, xpValue:   7 },
  171:  { hp: 3000, dmg: 30, speed: 45, radius: 48, xpValue:  60 },
  373:  { hp: 4500, dmg: 30, speed: 50, radius: 52, xpValue: 100 },   // 覚醒魔王ファオ
  1189: { hp: 6000, dmg: 30, speed: 55, radius: 50, xpValue: 150 },   // yamap
};

// ============================================================
// SPEC-023: ピッカーストック上限 + リロール
// ============================================================
export const STOCK_LIMIT_WEAPON = 5;   // 武器系列の最大装備数
export const STOCK_LIMIT_BUFF   = 5;   // 強化系列の最大装備数
export const REROLL_PER_BATTLE  = 2;   // 1 戦闘あたりリロール可能回数

// ============================================================
// SPEC-026: 有限ステージ + 背景画像 + 暗色オーバーレイ
// SPEC-030: bgPath / boss / balance はステージごと (= STAGE_TABLE) 固定値は維持
// ============================================================
// 世界座標系: 中心 (0, 0)、 サイズ = 背景画像と一致 (1000 x 1500)
export const WORLD_W            = 1000;
export const WORLD_H            = 1500;
// SPEC-030: 旧定数は STAGE_TABLE[0] への fallback として残す (= 互換)
export const BG_IMAGE_PATH      = "Image/Backgrounds/1001.png";
// 背景の上に乗せる半透明ダーク (= 暗色の敵を視認しやすくする)
export const BG_OVERLAY_COLOR   = "rgba(0, 0, 0, 0.45)";

// ============================================================
// SPEC-030: 3 ステージ制 (= 連続ステージ、 hero 引継ぎ、 武器リセット)
// ============================================================
// stage.bossAttack:
//   null        — 接触のみ (= ヨシュカ)
//   "fao"       — Axe 風: 周期的にランダム放射 N 発、 アイコン = ext 5055 (= とっておきのフルーツパフェ)
//   "yamap"     — Blade 風: ボスを中心に 8 個の周回、 アイコン = ext 5002 (= グランダルメ)
//
// enemyHpMul / enemyDmgMul / xpMul: 雑魚の hp / dmg / xpValue に適用 (= ボス絶対値は ENEMY_SPECS)
// spawnIntervalMul: 通常スポーン間隔の倍率 (= 0.6 で 1.67× の頻度に)
export const STAGE_TABLE = [
  {
    idx: 0,
    nameKey: "stage.akabasu",
    bgPath: "Image/Backgrounds/1001.png",
    bossEnemyId: 171,
    bossAttack: null,
    bossAttackExtId: null,
    enemyHpMul:        1.0,
    enemyDmgMul:       1.0,
    xpMul:             1.0,
    spawnIntervalMul:  1.0,
  },
  {
    idx: 1,
    nameKey: "stage.horeris",
    bgPath: "Image/Backgrounds/1038.png",
    bossEnemyId: 373,                 // 覚醒魔王ファオ
    bossAttack: "fao",
    bossAttackExtId: 5055,            // とっておきのフルーツパフェ
    enemyHpMul:        1.5,
    enemyDmgMul:       1.25,
    xpMul:             2.0,
    spawnIntervalMul:  0.85,
  },
  {
    idx: 2,
    nameKey: "stage.troy",
    bgPath: "Image/Backgrounds/1060.png",
    bossEnemyId: 1189,                // yamap
    bossAttack: "yamap",
    bossAttackExtId: 5002,            // グランダルメ
    enemyHpMul:        2.0,
    enemyDmgMul:       1.5,
    xpMul:             3.0,
    spawnIntervalMul:  0.7,
  },
];

// ボス攻撃 (= fao / yamap) のチューニング定数
export const FAO_FIRE_INTERVAL_MS  = 2200;   // 2.2 sec ごとに次フレームで放射
export const FAO_BULLETS           = 6;      // 1 周期あたりの飛翔体数
export const FAO_PROJ_SPEED_PX_S   = 220;
export const FAO_PROJ_DMG          = 18;
export const FAO_PROJ_LIFE_MS      = 4500;
export const FAO_PROJ_R            = 14;
export const FAO_PROJ_ICON_SIZE    = 32;

export const YAMAP_ORBIT_COUNT     = 8;
export const YAMAP_ORBIT_RADIUS    = 110;    // ボス中心からの距離
export const YAMAP_ORBIT_HIT_R     = 14;
export const YAMAP_ORBIT_DMG       = 14;
export const YAMAP_ORBIT_ANG_SPEED = 1.6;    // rad/sec
export const YAMAP_ORBIT_ICON_SIZE = 28;
export const YAMAP_ORBIT_HIT_COOLDOWN_MS = 600;   // 同 orbit から再 dmg まで

// ============================================================
// SPEC-028: 武器レベルアップに伴う当たり判定 / アイコンサイズ拡大
// scale = 1 + GROWTH × (level - 1) (= Lv.5 で +24%)
// ============================================================
export const WEAPON_SIZE_GROWTH_PER_LEVEL = 0.06;
