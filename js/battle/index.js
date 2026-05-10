// ============================================================
// battle/index.js — 戦闘ステージ entry (= startBattle / RAF / resize)
// (= SPEC-006)
// ============================================================
//
// applyHeroPick から startBattle(hero) を呼ぶ。
// RAF ループは pauseFlags を見て update を skip するが、 描画は続ける。

import { state } from "../state.js";
import {
  FACTION_COLOR, FACTION_COLOR_DEFAULT,
  PLAYER_RADIUS, PLAYER_SPEED_PX_S,
  XP_INITIAL, XP_TO_NEXT_INITIAL, LEVEL_INITIAL,
  STATS_INITIAL, STATS_MAX,
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT,
  HERO_HP_BASE, HERO_HP_PER_STAT, HERO_SPEED_BASE, HERO_SPEED_PER_AGI,
  REROLL_PER_BATTLE,
} from "../constants.js";
import { getExt, getCategory } from "../extensions.js";
import { installInput, getInputVector } from "./input.js";
import { tickPlayer, centerCameraOnPlayer } from "./player.js";
import { tickEnemies } from "./enemies.js";
import { tickWeapons } from "./weapons.js";
import { tickProjectiles } from "./projectiles.js";
import { tickGems } from "./gems.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { renderBattle } from "./render.js";
import { getHeroSprite, getDefaultEnemySprite, getBackgroundSprite } from "./sprites.js";
import { tickRegen, resetBuffs } from "./buffs.js";
import {
  tickOrbits, tickBeams, tickBombs, tickHomingProjectiles,
  tickShockwaves,
} from "./archetypes.js";
import { tickDamageNumbers } from "./damage.js";
import { tickBossAttack } from "./boss-attack.js";
import { startBgm } from "../audio.js";
import { BGM_BATTLE } from "../constants.js";

let _canvas = null;
let _ctx = null;
let _raf = 0;
let _lastMs = 0;
let _installed = false;

/**
 * battle 開始。 hero faction で player 色を上書きしてスポーン。
 * 多重呼出は安全 (= idempotent: 既に active なら player 位置だけ reset)。
 */
export function startBattle(hero) {
  _ensureCanvas();
  if (!_canvas) {
    console.warn("[battle] #battleCanvas not found");
    return;
  }
  if (!_installed) {
    installInput(_canvas);
    window.addEventListener("resize", resizeCanvas);
    _installed = true;
  }

  const b = state.battle;
  b.player.x = 0;
  b.player.y = 0;
  b.player.r = PLAYER_RADIUS;
  b.player.speed = PLAYER_SPEED_PX_S;
  b.player.color = FACTION_COLOR[hero?.faction] ?? FACTION_COLOR_DEFAULT;
  b.camera.x = 0;
  b.camera.y = 0;

  // SPEC-010: hero / 敵の sprite preload (= 描画は ready 待ち、 fallback は単色円)
  b.playerSprite       = getHeroSprite(hero);
  b.defaultEnemySprite = getDefaultEnemySprite();
  getBackgroundSprite();   // SPEC-026: 背景画像 preload (= 戻り値は render 側で参照)

  // SPEC-007 / SPEC-008 / SPEC-009 / SPEC-012: 戦闘世界をクリーンに reset
  b.enemies.length     = 0;
  b.gems.length        = 0;
  b.projectiles.length = 0;
  b.orbits.length      = 0;     // SPEC-012
  b.beams.length       = 0;     // SPEC-012
  b.bombs.length       = 0;     // SPEC-012
  b.shockwaves.length  = 0;     // SPEC-015
  b.damageNumbers.length = 0;   // SPEC-016
  b.weapons            = [];                    // SPEC-008: starter pick で最初の武器が入る
  b.nextEntityId       = 1;
  b.lastEnemySpawnMs   = performance.now();
  b.contactCooldownMs  = 0;
  b.gameOver           = false;                 // SPEC-009: 多重 trigger 防止 flag
  b.stageElapsedMs     = 0;                     // SPEC-022: ステージ経過リセット
  b.bossSpawned        = false;                 // SPEC-022: ボス multi-spawn 防止
  b.bossDefeated       = false;                 // SPEC-022: ボス撃破フラグ
  b.rerollsLeft        = REROLL_PER_BATTLE;     // SPEC-023: picker リロール残数
  // SPEC-030: ボス攻撃エンティティを毎戦リセット
  b.bossProjectiles    = b.bossProjectiles ?? [];
  b.bossOrbits         = b.bossOrbits      ?? [];
  b.bossProjectiles.length = 0;
  b.bossOrbits.length      = 0;
  state.ownedExtensions = [];                   // SPEC-008: 装備リセット
  state.killCount       = 0;                    // SPEC-009: 撃破カウンタ
  state.lastRunStats    = null;                 // SPEC-009: snapshot
  resetBuffs();                                 // SPEC-011: 強化系列の効果リセット

  // SPEC-014: hero.stats.hp / agi から HP 上限と移動速度を派生 (= hero ごとに性能差)
  const heroHpStat   = hero?.stats?.hp  ?? 0;
  const heroAgiStat  = hero?.stats?.agi ?? 0;
  const heroMaxHp    = HERO_HP_BASE    + Math.round(heroHpStat  * HERO_HP_PER_STAT);
  const heroSpeed    = HERO_SPEED_BASE + Math.round(heroAgiStat * HERO_SPEED_PER_AGI);
  state.statsMax.hp  = heroMaxHp;
  state.stats.hp     = heroMaxHp;
  b.player.speed     = heroSpeed;
  state.xp           = XP_INITIAL;
  state.xpToNext     = XP_TO_NEXT_INITIAL;
  state.level        = LEVEL_INITIAL;
  state.elapsedTicks = 0;

  // SPEC-013: ヒーローに固定の starter weapon を Lv.1 で装備 (= starter pick モーダルは廃止)
  const starterId  = HERO_STARTING_WEAPON[hero?.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
  const starterExt = getExt(starterId);
  if (starterExt && getCategory(starterExt) === "weapon") {
    state.ownedExtensions.push({ extId: starterId, level: 1 });
    rebuildWeaponsFromOwned();
  } else {
    console.warn("[battle] starter weapon not found for hero",
                 hero?.heroId, "→ extId", starterId);
  }

  b.active = true;
  resizeCanvas();
  _lastMs = performance.now();
  if (!_raf) _raf = requestAnimationFrame(_loop);

  // SPEC-017: 戦闘 BGM (= retry でも startBgm 内 stopBgm が掛かるので 1 トラックに収束)
  startBgm(BGM_BATTLE, 0.32);
}

export function stopBattle() {
  state.battle.active = false;
  if (_raf) {
    cancelAnimationFrame(_raf);
    _raf = 0;
  }
}

export function getBattle() { return state.battle; }

function _ensureCanvas() {
  if (_canvas) return;
  _canvas = document.getElementById("battleCanvas");
  if (_canvas) _ctx = _canvas.getContext("2d");
}

function resizeCanvas() {
  if (!_canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = _canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  _canvas.width  = Math.round(w * dpr);
  _canvas.height = Math.round(h * dpr);
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.battle.viewport.w = w;
  state.battle.viewport.h = h;
}

function _loop(now) {
  const dt = Math.min(0.05, (now - _lastMs) / 1000);  // タブ復帰時の暴走を防ぐ
  _lastMs = now;

  if (state.battle.active && state.pauseFlags === 0) {
    const v = getInputVector();
    tickPlayer(dt, v);
    centerCameraOnPlayer();
    tickEnemies(dt, now);          // SPEC-007: スポーン + 追跡 + 接触ダメージ
    tickWeapons(dt, now);          // SPEC-008/012: archetype dispatcher
    tickHomingProjectiles(dt);     // SPEC-012: bigHoming の弾道補正
    tickProjectiles(dt);           // SPEC-008: 投射体の移動 + 衝突 + 寿命
    tickOrbits(dt, now);           // SPEC-012: Book / Blade の周回 + 衝突
    tickBeams(dt);                 // SPEC-012: LaserGun の持続レーザー
    tickBombs(dt);                 // SPEC-012: Pierrot の遅延爆発
    tickShockwaves(dt);            // SPEC-015: Moai 着弾の AoE 衝撃波
    tickBossAttack(dt, now);       // SPEC-030: ボス攻撃 (= ファオ放射 / yamap 周回) + 衝突
    tickDamageNumbers(dt);         // SPEC-016: ダメージ数字 floater
    tickGems(dt);                  // SPEC-007: 拾う + level up trigger
    tickRegen(dt);                 // SPEC-011: Ramen 系列の HP regen
    if (state.battle.contactCooldownMs > 0) {
      state.battle.contactCooldownMs -= dt * 1000;
    }
  }

  if (_ctx) renderBattle(_ctx);
  _raf = requestAnimationFrame(_loop);
}
