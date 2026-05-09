// ============================================================
// state.js — グローバル単一 state オブジェクト
// ============================================================

export const state = {
  // 永続化系 (= 必要なら save/load)
  tickCount: 0,
  weekProgress: 0,
  year: 2018,
  month: 1,
  week: 1,
  startYear: 2018,

  // 時間制御
  pauseFlags: 0,
  timeSpeed2x: false,
  timeSpeed20x: false,

  // 言語
  language: "ja",

  // 月次イベント発火履歴 (= dedup)
  monthlyEventsFired: new Set(),

  // 通知タイル
  notifications: [],

  // ヒーロー選択モーダル (= SPEC-001 Phase 1 mock + SPEC-002 で heroId 化)
  pendingHeroPick: null,   // 選択中の heroId / null

  // 選択確定後のヒーロー (= SPEC-002)
  ownedHero: null,         // heroes.json の 1 要素 / null

  // VS HUD (= SPEC-005、 SPEC-004 から temp/food/day を撤去)
  stats:    { hp: 100 },        // 現在値 (= 浮動小数で内部保持)
  statsMax: { hp: 100 },        // 上限値 (= Phase 1 固定、 後続で hero stats 由来に)
  level: 1,                     // VS のレベル
  xp: 0,                        // 現在 XP
  xpToNext: 5,                  // 次レベルまでの閾値 (= 仮 5、 SPEC-008 で曲線化)
  elapsedTicks: 0,              // ステージ経過 tick (= 1 tick = 1 sec、 mm:ss 表示)

  // 戦闘ステージ (= SPEC-006 + SPEC-007、 RAF ループで更新される)
  battle: {
    active:   false,
    player:   { x: 0, y: 0, r: 14, speed: 180, color: "#c4a35a" },
    camera:   { x: 0, y: 0 },
    viewport: { w: 0, h: 0 },

    // SPEC-007: 敵 / gem / 武器 / 視覚アニメ
    enemies:        [],   // {id, x, y, r, hp, hpMax, dmg, speed, color}
    gems:           [],   // {id, x, y, r, value, color}
    shockwaveAnims: [],   // {x, y, r0, r1, age, life, color}
    weapons:        [],   // {kind, radius, dmg, cooldownMs, lastFireMs}  ← startBattle で初期化
    nextEntityId:    1,
    lastEnemySpawnMs: 0,
    contactCooldownMs: 0, // > 0 のあいだ被弾しない
  },

  // ゲーム固有 (= 後続 SPEC で追加)
  // gum: 1000,
  // materials: {},
  // activeCraft: null,
  // pendingSalaryReport: null,
};

// ============================================================
// pause / resume (= pauseFlags counter)
// ============================================================

export function pauseTime() {
  state.pauseFlags++;
  if (DEBUG_PAUSE_FLAG) {
    console.log(`[pause] +1 → ${state.pauseFlags}`,
      new Error().stack.split("\n")[2]);
  }
}

export function resumeTime() {
  state.pauseFlags = Math.max(0, state.pauseFlags - 1);
  if (DEBUG_PAUSE_FLAG) {
    console.log(`[pause] -1 → ${state.pauseFlags}`,
      new Error().stack.split("\n")[2]);
  }
}

// constants.js から import すると循環参照になるのでローカルフラグ
const DEBUG_PAUSE_FLAG = false;
