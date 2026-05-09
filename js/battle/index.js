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
} from "../constants.js";
import { installInput, getInputVector } from "./input.js";
import { tickPlayer, centerCameraOnPlayer } from "./player.js";
import { tickEnemies } from "./enemies.js";
import { tickWeapons, tickShockwaveAnims } from "./weapons.js";
import { tickGems } from "./gems.js";
import { renderBattle } from "./render.js";

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

  // SPEC-007: 戦闘世界をクリーンに reset
  b.enemies.length = 0;
  b.gems.length = 0;
  b.shockwaveAnims.length = 0;
  b.weapons = [
    { kind: "shockwave", radius: 80, dmg: 10, cooldownMs: 1000, lastFireMs: 0 },
  ];
  b.nextEntityId = 1;
  b.lastEnemySpawnMs = performance.now();
  b.contactCooldownMs = 0;

  // SPEC-007: HP / XP / Lv / 経過 tick を初期化 (= リトライ運用も兼ねる)
  state.stats.hp     = STATS_INITIAL.hp;
  state.statsMax.hp  = STATS_MAX.hp;
  state.xp           = XP_INITIAL;
  state.xpToNext     = XP_TO_NEXT_INITIAL;
  state.level        = LEVEL_INITIAL;
  state.elapsedTicks = 0;

  b.active = true;
  resizeCanvas();
  _lastMs = performance.now();
  if (!_raf) _raf = requestAnimationFrame(_loop);
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
    tickWeapons(dt, now);          // SPEC-007: shockwave 発射 + 範囲ダメージ + gem ドロップ
    tickGems(dt);                  // SPEC-007: 拾う + level up
    tickShockwaveAnims(dt);        // SPEC-007: 視覚アニメ寿命管理
    if (state.battle.contactCooldownMs > 0) {
      state.battle.contactCooldownMs -= dt * 1000;
    }
  }

  if (_ctx) renderBattle(_ctx);
  _raf = requestAnimationFrame(_loop);
}
