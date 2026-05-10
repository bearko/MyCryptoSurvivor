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

  // 戦闘ステージ (= SPEC-006 + SPEC-007 + SPEC-010、 RAF ループで更新される)
  battle: {
    active:   false,
    player:   { x: 0, y: 0, r: 14, speed: 180, color: "#c4a35a" },
    camera:   { x: 0, y: 0 },
    viewport: { w: 0, h: 0 },

    // SPEC-010: 画像 sprite preload entry (= {img, ready, failed})
    playerSprite:        null,
    defaultEnemySprite:  null,

    // SPEC-007 / SPEC-008: 敵 / gem / 投射体 / 武器
    enemies:        [],   // {id, x, y, r, hp, hpMax, dmg, speed, color}
    gems:           [],   // {id, x, y, r, value, color}
    projectiles:    [],   // {id, x, y, vx, vy, r, dmg, color, life, age, targetId?, kind?}
    weapons:        [],   // {extId, level, archetype, dmg, cdMs, range, speedPx, bullets, color, params, lastFireMs}

    // SPEC-012 / SPEC-015: 武器 archetype 別の追加 entity
    orbits:         [],   // {id, weaponExtId, angle, r, dmg, color, hitMap, kind, iconId}  - Book / Blade
    beams:          [],   // {id, x, y, dirX, dirY, len, thick, age, life, dmgPerSec, color, weaponExtId} - LaserGun
    bombs:          [],   // {id, x, y, fuseMs, age, radius, dmg, color, iconId}  - Pierrot
    shockwaves:     [],   // {id, x, y, r0, r1, age, life, dmg, color, hitSet}  - Moai 着弾 (SPEC-015)
    damageNumbers:  [],   // {id, x, y, value, age, life, vy, color}  - SPEC-016 ダメージ数字
    nextEntityId:    1,
    lastEnemySpawnMs: 0,
    contactCooldownMs: 0, // > 0 のあいだ被弾しない
    gameOver:       false, // SPEC-009: HP 0 検出後 true、 多重 trigger 防止
    // SPEC-022: ステージ進行 + ボス
    stageElapsedMs: 0,     // ステージ開始からの経過 (= ms、 wave 切替に使う)
    bossSpawned:    false, // ディープ・ヨシュカ multi-spawn 防止
    bossDefeated:   false, // ボス撃破フラグ (= clear trigger)
    rerollsLeft:    2,     // SPEC-023: 1 戦闘あたり picker リロール可能回数
    // SPEC-030: ボス攻撃 (= ファオ / yamap) の固有エンティティ
    bossProjectiles: [],   // {id, x, y, vx, vy, r, dmg, life, age, iconId, iconSize}
    bossOrbits:      [],   // {id, bossEnemyId, angle, r, dmg, iconId, iconSize, hitR, lastHitMs}
    bossLastFireMs:  0,    // ファオ攻撃の throttle
    // SPEC-033: マジックカード (= 取得で即時レベルアップ)、 レアエネミー撃破でドロップ
    magicCards:      [],   // {id, x, y, r}
    lastRareSpawnMs: 0,    // 1 分に 1 回の throttle
  },

  // SPEC-030: 現在のステージ index (= STAGE_TABLE[N])
  // hero pick 時に 0 リセット、 ボス撃破 / 5 分耐久で +1。 3 の手前で Game Clear。
  currentStageIdx: 0,

  // SPEC-033: 全ステージ通しの履歴 (= activity report 用)
  // hero pick で初期化、 各ステージ終了時に snapshot を push、 全クリアで report に渡す。
  run: {
    stages:        [],   // [{idx, elapsedMs, kills, level, ownedExtensions:[{extId,level}]}]
    totalKills:    0,
    totalElapsedMs: 0,
  },

  // SPEC-037: ゲームモード (= 「NORMAL」 / 「ABSOLUTE」 の 2 種)
  // - NORMAL  : 通常プレイ (= ABSOLUTE 倍率 = 全 1.0、 score × 1.0)
  // - ABSOLUTE: ユーザーが 4 軸の倍率を 0.5〜2.0 で調整、 平均がスコア倍率に
  regulation: "NORMAL",
  absolute: {
    spawnMul: 1.0,   // 敵の出現数 (= spawnIntervalMul の逆数として効く)
    hpMul:    1.0,   // 雑魚 hp
    dmgMul:   1.0,   // 雑魚 dmg
    speedMul: 1.0,   // 雑魚 speed
  },

  // SPEC-008: 装備 extension + Level-up pick モーダル状態
  ownedExtensions:       [],   // [{extId, level}]
  pendingPickOptions:    [],   // [{extId, ext, currentLevel, nextLevel, isNew}]
  pendingPickIsStarter:  false,

  // SPEC-009: 撃破数 + リトライ用 last run snapshot
  killCount:    0,
  lastRunStats: null,   // {elapsed, level, kills}

  // SPEC-011: 強化系列の効果スロット (= series ごと現在の絶対値)
  buffs: {
    hpMaxBonus:        0,    // Armor: 最大 HP に加算 (= 累積値ではなく現 tier の絶対加算量)
    regenPerSec:       0,    // Ramen: HP 毎秒回復
    speedMul:          1,    // Boots: 移動速度倍率
    cdMul:             1,    // Horse: 武器 cd 倍率 (< 1 で短縮)
    dmgTakenMul:       1,    // Shield: 被ダメ倍率 (< 1 で軽減)
    dmgMul:            1,    // Apple: 武器 dmg 倍率 (> 1 で強化)
    bulletCountBonus:  0,    // Oriflamme: 弾数ボーナス (= SPEC-012 の archetype が利用)
    rangeMul:          1,    // SPEC-019 Specimen: 攻撃範囲倍率 (= weapon.range / orbitR / beam.len / bomb.radius / Moai aoeR)
    pickupMul:         1,    // SPEC-019 Gyoku: CE 収集範囲倍率 (= GEM_PICKUP_RADIUS に乗算)
    pierceBonus:       0,    // SPEC-031 Gunbai: 投射体の貫通体数を加算 (= 全 projectile 武器に適用)
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
