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
export const PLAYER_RADIUS      = 14;       // プレイヤー描画半径 px (= SPEC-077 で CHAR_SCALE 倍して使う)
// SPEC-077: キャラを大きく (= 作者の依頼。 視界はそのままで、 自分と敵の絵と当たりを大きく)
export const CHAR_SCALE         = 1.4;      // 自分・雑魚・レア・撃ってくる敵
export const BOSS_CHAR_SCALE    = 1.2;      // ボス (= もともと大きい)
export const CHAR_SPRITE_RATIO  = 2.3;      // 絵の大きさ = 当たりの半径 × これ (= 絵は円で切り抜かない。 絵の縁は透明)
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

export const XP_TO_NEXT_GROWTH = 1.2;   // SPEC-065: 1.3 → 1.2 (= Lv15 までの経験値 710 → 約 310。 作者の決定「約 2 倍速く」)

// ============================================================
// Extensions as weapons + Level-up pick (= SPEC-008)
// ============================================================
// SPEC-162: 15 段階 (= 3 段ごとにランク。 Lv10 が今までの Lv5 の強さ、 Lv11〜15 はその先。 js/ext-level.js)
export const EXT_MAX_LEVEL          = 15;
export const EXT_RANK_SIZE          = 3;    // 何段ごとにランク (= 絵と名前) が上がるか
export const LL_LEVEL               = 16;   // SPEC-101: ヒーローの初期武器だけ、 Lv.15 のあとに LL がある
export const EXT_START_LEVEL_STEP   = 2;    // SPEC-139 の仕込み 1 段 = 何段ぶんか (= 15 段になったので 1 段では薄い)
export const PROJECTILE_LIFE_MS     = 1500;
// SPEC-073: パンジャンドラムが転がる速さ (= 1 秒に約 1.6 回転。 進む左右の向きで回る向きが変わる)
export const PANJANDRUM_SPIN_RAD_S = 10;
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
export const LS_COACH_SEEN = `${LS_PREFIX}.coachSeen`;   // SPEC-042: はじめての操作ガイドを見終えた
export const LS_SETTINGS = `${LS_PREFIX}.settings`;     // SPEC-044: 音量・演出を減らす
export const LS_NAVI_TIPS = `${LS_PREFIX}.naviTips`;    // SPEC-068: マインちゃんが補足したもの (= 次からは黙る)
export const LS_META = `${LS_PREFIX}.meta.v1`;         // SPEC-090: GUM・ゴールドダスト・スキルツリーで取った節
export const LS_REVIVE_SEEN = `${LS_PREFIX}.reviveSeen`;   // SPEC-155: 「王妃の黄金時計で復活させてあげる」を 1 度聞いた (= 2 回目からは REVIVE の画面へ直行)。 値は "1"
export const LS_PLAYED = `${LS_PREFIX}.played`;        // SPEC-088: 1 回でも遊び終えた (= ABSOLUTE・RTA が選べる)。 値は "1"

// ============================================================
// バージョン (= ranking version filter に使う)
// ============================================================
export const APP_VERSION = "1.0.0";   // SPEC-047: v1.0

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
  // SPEC-097: 武器ごとに「この人がこれを使う」と言えるヒーロー (= 作者の決定 2026-10-19)
  10001: 10,   // MCHウォーリアー     → Blade      (= MCH の顔。 5 段目が MCHブレード)
  4006:   1,   // ビリー・ザ・キッド   → Revolver   (= 西部の早撃ち)
  2043:   5,   // 霧隠才蔵             → Shuriken   (= 忍び)
  2016:   9,   // アナスタシア         → Snowman    (= ロシアの皇女と氷の王族)
  2003:   7,   // ジャックザリッパー   → Knife      (= 系列のスキル名が「リッパー」)
  4041:   6,   // ニコラ・テスラ       → LaserGun   (= 光線兵器の構想)
  1006:   2,   // ピタゴラス           → Book       (= 書を携える哲学者)
  1007:   3,   // 大長今               → Broomstick (= 宮廷の医女とホーキ)
  2013:   8,   // 許褚                 → Mallet     (= 怪力の豪傑が槌を振るう)
  4052:   4,   // フランシス・ドレーク → Parrot     (= 海賊の肩にオウム)
};
export const HERO_STARTING_WEAPON_DEFAULT = 1;   // 不明 hero は Revolver fallback

// ============================================================
// SPEC-014: Hero stats → battle ステータス派生
// ============================================================
export const HERO_HP_BASE        = 80;     // 基礎 HP (= 全 hero 共通)
export const HERO_HP_PER_STAT    = 0.20;   // hero.stats.hp の何 % を加算するか
export const HERO_SPEED_BASE     = 140;    // 基礎移動速度 (px/sec)
export const HERO_SPEED_PER_AGI  = 0.6;    // hero.stats.agi に乗じる係数
// SPEC-097: PHY は武器のダメージに、 INT は武器の間隔に効く (= ±1 割ほど。 違いを決めるのは武器と固有スキル)
export const HERO_PHY_BASE       = 80;     // この値で ×1
export const HERO_PHY_DIV        = 400;    // ダメージ × (1 + (phy − 80) / 400)
export const HERO_INT_BASE       = 70;     // この値で ×1
export const HERO_INT_DIV        = 500;    // 間隔   × (1 − (int − 70) / 500)

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
  STAGE_CLEAR:     "Audio/SE/Jingles/win.mp3",   // SPEC-158: ステージクリア (= NODE CLEAR の帯が出る瞬間)
  UI_CLICK:        "Audio/SE/Actions/crash.mp3",   // SPEC-060: ボタンを押したとき
  THUNDER:         "Audio/SE/Battle/2_area_damage.mp3",   // SPEC-063: 雷鼓
  GIMMICK_WARN:    "Audio/SE/Battle/5_debuff_status_effect.mp3",   // SPEC-064: 仕掛けの予告 (= 珠の列・木馬)
  PUNCH:           "Audio/SE/Battle/1_single_damage.mp3",          // SPEC-064: パンチカード
  TROJAN_OPEN:     "Audio/SE/Battle/2_area_damage.mp3",            // SPEC-064: 木馬が開く
  HERO_UNLOCK:     "Audio/SE/Jingles/knight.mp3",                   // SPEC-098: ヒーローが仲間になった (= 短いファンファーレ。 ほかでは使わない)
};
export const BGM_BATTLE = "Audio/BGM/pvp.mp3";
export const BGM_MENU   = "Audio/BGM/land.mp3";   // SPEC-060: モード選択・ヒーロー選択・結果の画面
// SPEC-069: タイトル (= 作者の指定)。 素材では SE の置き場にあるが、 1 分 48 秒の曲 (= ループで流す)
export const BGM_TITLE  = "Audio/SE/Actions/craft.mp3";

// ============================================================
// SPEC-019: XP gem アイコン (= MCH 公式 CE icon)
// ============================================================
export const GEM_ICON_PATH = "Image/Icons/ce.png";

// ============================================================
// SPEC-022: ステージ進行 + wave + ボス
// ============================================================
export const STAGE_DURATION_MS  = 300000;   // 5 分間
export const BOSS_SPAWN_AT_MS   = 240000;   // 4 分経過時にボススポーン
export const BOSS_WARNING_LEAD_MS = 10000;  // SPEC-045: ボスの前に予告。 SPEC-071: 30 秒前 → 10 秒前 (= 作者の決定。 30 秒は長い)
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
// SPEC-033: レアエネミー 4 種 (= フラペチーノ ドッピオ系)、 hp 2× 相当 + isRare フラグ
export const ENEMY_SPECS = {
  101:  { hp:   25, dmg: 10, speed: 80, radius: 12, xpValue:   1 },
  124:  { hp:   55, dmg: 14, speed: 75, radius: 14, xpValue:   2 },
  134:  { hp:   95, dmg: 18, speed: 70, radius: 16, xpValue:   4 },
  164:  { hp:  160, dmg: 22, speed: 65, radius: 19, xpValue:   7 },
  // SPEC-163: ボスの HP は、 そのステージのボスの時刻に育っている装備の DPS で 20〜30 秒 (= 3000 / 4500 / 6000 → 5000 / 11000 / 20000)
  171:  { hp: 5000, dmg: 30, speed: 45, radius: 48, xpValue:  60 },
  373:  { hp: 11000, dmg: 30, speed: 50, radius: 52, xpValue: 100 },   // 覚醒魔王ファオ
  1189: { hp: 20000, dmg: 30, speed: 55, radius: 50, xpValue: 150 },   // yamap
  // SPEC-033: rare enemies (= ~2× normal hp、 +20-30 xp)
  // SPEC-034: radius × 1.5 (= 視認性向上、 当たり判定もそのまま大きく)
  147:  { hp:  160, dmg: 16, speed: 78, radius: 21, xpValue:  20, isRare: true },   // クリーパー フラペチーノ ドッピオ (= 14 → 21)
  170:  { hp:  400, dmg: 24, speed: 65, radius: 32, xpValue:  35, isRare: true },   // バイトバンディット フラペチーノ ドッピオ (= 21 → 32)
  396:  { hp:  220, dmg: 18, speed: 95, radius: 20, xpValue:  25, isRare: true },   // ラビット フラペチーノ ドッピオ (= 13 → 20)
  407:  { hp:  280, dmg: 20, speed: 70, radius: 24, xpValue:  30, isRare: true },   // ラブレター フラペチーノ ドッピオ (= 16 → 24)
  // SPEC-062: 離れたところから撃ってくる敵 (= js/battle/enemy-shots.js)。 shot.dmg はステージ・ABSOLUTE の攻撃力の倍率がかかる
  166:  { hp:   70, dmg: 10, speed: 70, radius: 15, xpValue:   4, behavior: "shooter",
          shot: { pattern: "aimed",   speed: 170, everyMs: 2600, dmg: 12 } },   // バイトバンディット フラペチーノ (= 狙って 1 発)
  136:  { hp:   90, dmg: 10, speed: 60, radius: 16, xpValue:   5, behavior: "shooter",
          shot: { pattern: "spread3", speed: 140, everyMs: 3200, dmg: 10 } },   // メリッサ フラペチーノ (= 3 方向)
};

// SPEC-033: レアエネミー定数
export const RARE_ENEMY_IDS = [147, 170, 396, 407];
export const RARE_SPAWN_INTERVAL_MS = 60000;   // 1 分に 1 回ペース

// SPEC-033: マジックカード (= 取得で即時レベルアップ)、 アイコンは MCH ext 5178 (= マジックカード:光輝)
export const MAGIC_CARD_EXT_ID       = 5178;
export const MAGIC_CARD_RADIUS       = 12;
export const MAGIC_CARD_PICKUP_RADIUS = 32;
export const MAGIC_CARD_ICON_SIZE    = 32;

// ============================================================
// SPEC-053: ステージの建物・壺・宝箱・お助けアイテム
// ============================================================
// 建物 (= 自分・敵・弾を止める四角)。 ステージごとの置き場所は STAGE_TABLE[].obstacles (= 絵は 3182 持ち運びハウス・5182 お城)
export const OBSTACLE_HITBOX_RATIO = 0.8;     // 絵の大きさに対する当たりの四角の割合 (= 絵の縁の透明ぶん)
// 壺 (= 1 発で割れる)。 ステージの始めに置き、 ゲーム内の時間で少しずつ足す
export const POT_EXT_ID         = 4600;       // ぴっぴ教 一攫千金壺
export const POT_RADIUS         = 14;
export const POT_HP             = 1;
export const POT_INITIAL        = 4;
export const POT_MAX_ON_FIELD   = 6;
export const POT_RESPAWN_MS     = 20000;
// 宝箱 (= 何発か当てて開ける)。 1 ステージ 4 つ、 決まった時刻に出る (= 共通基盤の RTA の最短時間の根拠。 SPEC-054)
// 形は mycryptoheroes の Data/Effects/GoldChest/treasure-chest.svg (= CC0)。 塗りが currentColor (= 黒) なので、 同じ形を canvas で金色に塗る
export const CHEST_SHAPE_PATHS  = [
  "M8 24c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v4H8v-4zm0 8h20v6h8v-6h20v20c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V32zm22 4v4h4v-4h-4z",
  "M16 16V12c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v4h-4v-4H20v4h-4z",
];
// SPEC-074: 宝箱の絵はマイクリのエクステンション (= 作者の依頼。 宝箱でなくてよい)
// SPEC-076: 5106 財宝ゴールデンモアイ (= 作者の指定)。 モアイの武器の 5 段目の弾も同じ絵だが、 宝箱は止まっていて光の円と HP の帯がある
//   上の形 (= CHEST_SHAPE_PATHS) は、 絵を読み込むまでの代わり
export const CHEST_EXT_ID       = 5106;       // 財宝ゴールデンモアイ
export const CHEST_RADIUS       = 18;
export const CHEST_HP           = 60;         // × ステージの enemyHpMul
export const CHEST_TIMES_MS     = [30000, 90000, 150000, 210000];
export const CHEST_CE_GEMS      = 6;          // 宝箱はお助けアイテムと一緒に CE も少し出す
// SPEC-081: ボス戦の宝箱 (= 枠の中に出る。 ボスが出て firstMs 後から everyMs ごと、 場に maxOnField まで)。
//   中身にマジックカード (= その場でレベルアップ) がある (= 宝箱からカードが出るのはボス戦だけ)。
//   RTA でも懐中時計は出さない (= 共通基盤の RTA の最短時間を変えない)
export const BOSS_CHEST = { firstMs: 6000, everyMs: 14000, maxOnField: 2, minD: 140, maxD: 380 };
export const BOSS_CHEST_DROPS = [{ kind: "card", w: 40 }, { kind: "heal", w: 30 }, { kind: "thunder", w: 20 }, { kind: "magnet", w: 10 }];
// お助けアイテム
export const ITEM_RADIUS        = 12;
export const ITEM_PICKUP_RADIUS = 30;
export const ITEM_ICON_SIZE     = 30;
export const MAGNET_EXT_ID      = 1156;       // 棒磁石: 落ちている CE を全部吸い寄せる
export const MAGNET_SPEED_PX_S  = 900;
export const HEAL_EXT_ID        = 1129;       // パンケーキ: HP を回復
export const HEAL_RATIO         = 0.3;        // 最大 HP の 30%
export const POT_CE_GEMS        = 5;          // 壺の「CE の小山」
// 壊したときに出るもの (= 重み)。 ce は CE の小山
// SPEC-063: 雷鼓 (= thunder。 画面の敵に雷) を足した
export const POT_DROPS   = [{ kind: "ce", w: 50 }, { kind: "heal", w: 27 }, { kind: "magnet", w: 13 }, { kind: "thunder", w: 10 }];
export const CHEST_DROPS = [{ kind: "heal", w: 40 }, { kind: "magnet", w: 35 }, { kind: "thunder", w: 25 }];
// SPEC-063: 雷鼓 — 画面に映っている敵すべてに雷が落ちる。 雑魚は倒れ (= 経験値も落ちる)、 ボスは最大 HP の 20%。 敵の弾も消える
export const THUNDER_EXT_ID       = 5071;    // 雷鼓
export const THUNDER_BOSS_RATIO   = 0.2;
export const THUNDER_FX_MS        = 420;     // 稲妻の線が見えている長さ
// SPEC-054: RTA のときだけ、 宝箱から懐中時計 (= 実時間 10 秒、 ゲーム全体が 2 倍速。 続けて拾うと 10 秒ずつ延びる)
//   宝箱は 1 ステージ 4 つなので、 1 ステージで縮むのは実時間 40 秒まで (= 共通基盤の RTA の最短時間の根拠。 SPEC-001 6.15)
export const WATCH_EXT_ID      = 1111;        // 懐中時計
export const WATCH_DURATION_MS = 10000;       // 実時間
export const WATCH_SPEED       = 2;
// SPEC-140: 合体ロボ (= 拾うと無敵。 スキルツリーで解放すると壺・宝箱から出る。 段で絵のレアリティと秒が上がる)
//   絵は合体ロボシリーズの Common → Legendary。 無敵のあいだは虹色に光り、 BGM が変わる
export const ROBOT_EXT_IDS = [1123, 2123, 3123, 4123, 5123];
export const ROBOT_SEC     = [3, 4, 5, 6, 8];
export const ROBOT_DROP_W  = { pot: 6, chest: 15, boss: 10 };
export const BGM_ROBOT     = "Audio/BGM/raid.mp3";
export const CHEST_DROPS_RTA = [{ kind: "watch", w: 50 }, { kind: "heal", w: 20 }, { kind: "magnet", w: 15 }, { kind: "thunder", w: 15 }];

// ============================================================
// SPEC-023: ピッカーストック上限 + リロール
// ============================================================
export const STOCK_LIMIT_WEAPON = 5;   // 武器系列の最大装備数
export const STOCK_LIMIT_BUFF   = 5;   // 強化系列の最大装備数
export const REROLL_PER_BATTLE  = 3;   // SPEC-034: 1 戦闘あたりリロール可能回数 (= 2 → 3)

// ============================================================
// SPEC-109: ショップ (= レベルアップの置き換え。 作りかけのあいだは ?shop=1 のときだけ)
// ============================================================
export const SHOP_FIRST_MS      = [10000, 0, 0];   // ステージ 1 は 0:10、 ステージ 2・3 は開始の前 (= SPEC-103 Q2)
export const SHOP_EVERY_MS      = 40000;           // そのあと 40 秒ごと
export const SHOP_PER_STAGE     = 6;               // 1 ステージの店の数 (= ボスの前に終わる)
export const SHOP_OFFERS        = 4;               // 品の枚数 (= マゼランは +1)
// SPEC-162: 行き先の段 Lv.1〜15 の値段 (= ステージ 1)。 装備と CE がステージをまたいで残るので、 1 回の挑戦で 15 段を登る前提。
//   Lv10 (= 今までの最大) まで合計 3,555、 Lv15 まで合計 24,555。 ステージ 2・3 は SHOP_STAGE_MUL
export const SHOP_PRICE         = [15, 25, 40, 80, 150, 260, 420, 650, 950, 1400, 2000, 2800, 3900, 5300, 7000];
export const SHOP_PRICE_LL      = 20000;           // LL ランクアップ (= Lv.5 の 2 倍。 SPEC-122)
export const SHOP_STAGE_MUL     = [1, 1.8, 2.6];   // 雑魚の CE が ×1/×2/×3 なので値段も上げる
export const SHOP_BANS          = 3;               // お断りは 1 挑戦 3 回まで
export const SHOP_REROLL_COST   = 5;               // 払うリロールは 5 → 10 → 15 … (= 店ごとに戻る)
export const SHOP_FREE_REROLLS  = 1;               // 無料のリロールはステージごと 1 回 (+ スキルツリーの引き直し)
export const SHOP_GIFT_COST     = [1, 1, 2, 3, 5];  // SPEC-127: 1 品を無料にするギフト券の枚数 (= 行き先のランク 1〜5。 Common・Uncommon 1 / Rare 2 / Epic 3 / Legendary 5。 LL は不可。 SPEC-162: 段ではなくランク)
export const SHOP_HEADSTART_CE  = 20;              // スキルツリーの「先手」 1 段ぶんの CE

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
    // SPEC-053: 建物 (= 中心の座標と絵の大きさ。 ヒーローは (0, 0) から始まる)
    obstacles: [
      { x: -300, y: -420, size: 96, extId: 3182 },
      { x:  300, y: -180, size: 96, extId: 3182 },
      { x: -300, y:  260, size: 96, extId: 3182 },
      { x:  280, y:  520, size: 96, extId: 3182 },
    ],
    bossAttack: null,
    bossAttackExtId: null,
    enemyHpMul:        1.0,
    enemyDmgMul:       1.0,
    xpMul:             1.0,
    // SPEC-163: 始まりの湧きを DPS の期待値 (= 初期武器 Lv.1 で 15〜25/秒) に合わせる (= 0.8 秒 → 1.1 秒に 1 体)
    spawnIntervalMul:  1.4,
    // SPEC-062: 撃ってくる敵 (= fromMs から everyMs ごとに 1 体。 同時に max 体まで)
    shooters: { fromMs: 90000, everyMs: 10000, max: 3, ids: [166] },
    gimmick: "beads",    // SPEC-064: そろばんの珠
    // SPEC-078 → SPEC-163: 洪水はゆるく (= ×12 → ×5、 pow 2.5 → 1.8)。 2:00 の群れ 16 体で「どばーっ」と来て圧死していたので、
    //   群れは 2:30 から 10 体。 密度の目標も半分 (= 画面の 45%)。 装備が育つ速さ (= CE の収入) と同じ傾きで敵を増やす
    flood: { fromMs: 40000, fullMs: 230000, maxMul: 5, packFromMs: 150000, packEveryMs: 15000, packSize: 10, pow: 1.8 },
    density: { fromMs: 60000, fullMs: 230000, max: 0.45 },
    maxEnemies: 260,
  },
  {
    idx: 1,
    nameKey: "stage.horeris",
    bgPath: "Image/Backgrounds/1038.png",
    bossEnemyId: 373,                 // 覚醒魔王ファオ
    obstacles: [
      { x:    0, y: -440, size: 128, extId: 5182 },
      { x: -320, y:   80, size: 96,  extId: 3182 },
      { x:  320, y:  120, size: 96,  extId: 3182 },
      { x:    0, y:  480, size: 96,  extId: 3182 },
    ],
    bossAttack: "fao",
    bossAttackExtId: 5055,            // とっておきのフルーツパフェ
    // SPEC-163: 装備が引き継がれる (= SPEC-162) ので、 数ではなく HP で強くする (= ×1.5 → ×2.2)。 湧きの始まりはステージ 1 より少し速いだけ
    enemyHpMul:        2.2,
    enemyDmgMul:       1.4,
    xpMul:             2.0,
    spawnIntervalMul:  1.1,
    shooters: { fromMs: 45000, everyMs: 7000, max: 6, ids: [166, 136] },   // SPEC-062
    gimmick: "punch",    // SPEC-064: パンチカード
    // SPEC-078 → SPEC-163: 洪水 ×16 → ×7、 群れは 2:00 から 14 体、 密度は 1.45 → 0.7
    flood: { fromMs: 30000, fullMs: 230000, maxMul: 7, packFromMs: 120000, packEveryMs: 12000, packSize: 14, pow: 1.8 },
    density: { fromMs: 40000, fullMs: 230000, max: 0.7 },
    maxEnemies: 380,
  },
  {
    idx: 2,
    nameKey: "stage.troy",
    bgPath: "Image/Backgrounds/1060.png",
    bossEnemyId: 1189,                // yamap
    obstacles: [
      { x: -300, y: -420, size: 128, extId: 5182 },
      { x:  300, y: -420, size: 128, extId: 5182 },
      { x: -300, y:  420, size: 128, extId: 5182 },
      { x:  300, y:  420, size: 128, extId: 5182 },
    ],
    bossAttack: "yamap",
    bossAttackExtId: 5002,            // グランダルメ
    // SPEC-163: HP ×2.0 → ×3.5 (= 引き継いだ装備が Lv.7〜10 まで育っている前提)。 湧きの始まりはステージ 2 より少し速いだけ
    enemyHpMul:        3.5,
    enemyDmgMul:       1.8,
    xpMul:             3.5,
    spawnIntervalMul:  0.9,
    shooters: { fromMs: 30000, everyMs: 5000, max: 9, ids: [166, 136] },   // SPEC-062
    gimmick: "trojan",   // SPEC-064: トロイの木馬
    // SPEC-065 / SPEC-078 → SPEC-163: 洪水 ×20 → ×9、 群れは 1:40 から 18 体、 密度は 1.65 → 0.95
    flood: { fromMs: 20000, fullMs: 230000, maxMul: 9, packFromMs: 100000, packEveryMs: 10000, packSize: 18, pow: 1.8 },
    density: { fromMs: 30000, fullMs: 230000, max: 0.95 },
    maxEnemies: 480,
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
// scale = 1 + GROWTH × (level - 1)
// SPEC-034: 0.06 → 0.25 (= Lv.5 で 2.0×、 ユーザー指定の 「Lv5 で Lv1 の 2 倍」)
// ============================================================
export const WEAPON_SIZE_GROWTH_PER_LEVEL = 0.25;

// ============================================================
// SPEC-037: ゲームモード + ABSOLUTE レギュレーション (= mycryptotactics 風)
// 4 軸 (= spawn / hp / dmg / speed) を 0.5 〜 5.0 で 0.25 step で調整。
// regulationMul = 4 軸の算術平均。 NORMAL は全 1.0 で mul = 1.0。
// ABSOLUTE は 0.5..5.0 で mul も 0.5..5.0 (= 楽すれば下、 きつくすれば上、 全軸 5× で mul = 5.0)。
// ============================================================
export const REGULATION_NORMAL    = "NORMAL";
export const REGULATION_ABSOLUTE  = "ABSOLUTE";
export const ABSOLUTE_SLIDER_MIN  = 0.5;
export const ABSOLUTE_SLIDER_MAX  = 5.0;
export const ABSOLUTE_SLIDER_STEP = 0.25;
export const ABSOLUTE_SLIDER_DEFAULT = 1.0;
export const ABSOLUTE_AXES = [
  { key: "spawnMul", labelKey: "absolute.axis.spawn" },
  { key: "hpMul",    labelKey: "absolute.axis.hp"    },
  { key: "dmgMul",   labelKey: "absolute.axis.dmg"   },
  { key: "speedMul", labelKey: "absolute.axis.speed" },
];

/**
 * regulation + absolute から score multiplier を計算 (= 4 軸の算術平均)。
 * NORMAL は state.absolute を見ず常に 1.0 を返す。
 */
export function computeRegulationMul(regulation, absolute) {
  if (regulation !== REGULATION_ABSOLUTE) return 1.0;
  const a = absolute || {};
  const sum = (a.spawnMul ?? 1) + (a.hpMul ?? 1) + (a.dmgMul ?? 1) + (a.speedMul ?? 1);
  return Math.round((sum / 4) * 100) / 100;   // 0.5 〜 2.0、 小数 2 桁丸め
}
