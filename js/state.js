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
