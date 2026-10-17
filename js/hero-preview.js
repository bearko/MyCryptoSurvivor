// ============================================================
// hero-preview.js — ヒーロー選択：最初の武器の動きのプレビュー (= SPEC-083)
// ============================================================
//
// ヒーローを選んで 1 秒たつと、 見せ場 (= #heroStage) の大きな絵がプレビューに替わり、 そのヒーローの最初の武器が
// Common → Uncommon → Rare (= 1〜3 段目) の順に 3 秒ずつ、 敵と戦う。 流し終えたら大きな絵に戻り、 3 秒してまた流す。
// 本番の武器のコード (= weapons.js・archetypes.js・projectiles.js・damage.js・render.js) を、 別の小さな戦場で動かす:
//   動かすあいだだけ state.battle と state.buffs をプレビューのものに差し替え、 すぐ戻す。
//   敵はいちばん弱い雑魚 (= 101) を、 2 秒ごとに段の数だけ (= Common 1 体・Uncommon 2 体・Rare 3 体) 出す (= SPEC-086)。
//   撃破数は元に戻し、 CE は捨て、 レベルアップは起きない (= CE を拾わない)。 効果音は鳴らさない。
// ヒーロー選択を閉じたら止める。

import { state } from "./state.js";
import {
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT, PLAYER_RADIUS, CHAR_SCALE, ENEMY_SPECS, ENEMY_COLOR,
} from "./constants.js";
import { getHero } from "./heroes.js";
import { getExt, getTierName } from "./extensions.js";
import { t, getLang, onLangChange } from "./i18n.js";
import { setSeMuted } from "./audio.js";
import { weaponFromExt } from "./battle/extensions-as-weapons.js";
import { tickWeapons } from "./battle/weapons.js";
import { tickProjectiles } from "./battle/projectiles.js";
import { tickOrbits, tickBeams, tickBombs, tickHomingProjectiles, tickShockwaves } from "./battle/archetypes.js";
import { tickDamageNumbers } from "./battle/damage.js";
import { tickFx } from "./battle/fx.js";
import { renderBattle } from "./battle/render.js";
import { getHeroSprite, getDefaultEnemySprite } from "./battle/sprites.js";

/** 流れ (= ms) */
export const PREVIEW_TIMING = { firstShowMs: 1000, tierMs: 3000, showMs: 3000 };
/** 見せる段 (= Common・Uncommon・Rare) */
export const PREVIEW_TIERS = [1, 2, 3];
export const PREVIEW_RARITY = { 1: "Common", 2: "Uncommon", 3: "Rare" };
/** 敵 (= いちばん弱い雑魚)・出す間隔・見える広さ (= SPEC-086) */
export const PREVIEW_ENEMIES = { id: 101, everyMs: 2000, viewW: 380 };

/**
 * いま見せるもの (= 純関数)。 t: そのヒーローを選んでからの ms
 *   { mode: "show" } か { mode: "preview", tier: 1〜3, tierT: その段の経過 ms, idx: 0〜2 }
 */
export function previewPhase(tMs) {
  const { firstShowMs, tierMs, showMs } = PREVIEW_TIMING;
  if (tMs < firstShowMs) return { mode: "show" };
  const cycle = tierMs * PREVIEW_TIERS.length + showMs;
  const c = (tMs - firstShowMs) % cycle;
  if (c >= tierMs * PREVIEW_TIERS.length) return { mode: "show" };
  const idx = Math.floor(c / tierMs);
  return { mode: "preview", tier: PREVIEW_TIERS[idx], idx, tierT: c - idx * tierMs };
}

/** 1 回に出す敵の数 (= 段の数。 Common 1・Uncommon 2・Rare 3)。 純関数 */
export function previewWaveSize(tier) {
  return Math.max(1, Math.min(3, tier | 0));
}

// ------------------------------------------------------------ 状態
let _heroId = null;
let _t0 = 0;
let _raf = 0;
let _last = 0;
let _pb = null;          // プレビューの戦場 (= state.battle と同じ形)
let _pbTier = 0;
let _clock = 0;          // プレビューの時計 (= 武器の間隔・敵を出す間隔に使う)
let _nextWaveMs = 0;
const _buffs = {};       // 強化なし (= ?? 1 の既定値が使われる)

const $ = (id) => globalThis.document?.getElementById(id);

function _vw() {
  const c = $("heroStagePreview");
  const w = c?.clientWidth || 360, h = c?.clientHeight || 160;
  const k = Math.max(0.7, Math.min(1.4, w / PREVIEW_ENEMIES.viewW));
  return { w, h, k, vw: w / k, vh: h / k };
}

/** 見えている縁のあたりから 1 体 (= 自分のほうへ歩いてくる) */
function _spawnEnemy(b) {
  const id = PREVIEW_ENEMIES.id;
  const spec = ENEMY_SPECS[id];
  const a = Math.random() * Math.PI * 2;
  b.enemies.push({
    id: b.nextEntityId++, enemyId: id,
    x: Math.cos(a) * b.viewport.w * 0.45, y: Math.sin(a) * b.viewport.h * 0.45,
    r: Math.round((spec?.radius ?? 12) * CHAR_SCALE),
    hp: spec?.hp ?? 25, hpMax: spec?.hp ?? 25, dmg: 0, speed: spec?.speed ?? 80,
    color: ENEMY_COLOR, hitFreezeMs: 0, isBoss: false, isRare: false, xpValue: 1,
  });
}

function _spawnWave(b, tier) {
  for (let i = 0; i < previewWaveSize(tier); i++) _spawnEnemy(b);
}

function _makeBattle(hero, tier) {
  const extId = HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
  const w = weaponFromExt(extId, tier);
  const v = _vw();
  const b = {
    active: false,
    player: { x: 0, y: 0, r: Math.round(PLAYER_RADIUS * CHAR_SCALE), speed: 0, color: "#ffffff", face: 0, moving: false },
    camera: { x: -v.vw / 2, y: -v.vh / 2 },
    viewport: { w: v.vw, h: v.vh },
    enemies: [], gems: [], projectiles: [], orbits: [], beams: [], bombs: [], shockwaves: [], damageNumbers: [],
    bossProjectiles: [], bossOrbits: [], magicCards: [], enemyShots: [], items: [], obstacles: [], obstacleRects: [],
    weapons: w ? [{ ...w, lastFireMs: -1e9 }] : [],
    nextEntityId: 1,
    fx: { shake: 0, shakeMs: 0, hurt: 0, flash: 0, particles: [], bossWarned: false, countSec: -1, bolts: [], boltMs: 0 },
    playerSprite: getHeroSprite(hero),
    defaultEnemySprite: getDefaultEnemySprite(),
    stageElapsedMs: 0, bossSpawned: false, gimmick: null, arena: null, contactCooldownMs: 0, gameOver: false,
    fastForwardMs: 0,
  };
  _spawnWave(b, tier);   // 段が替わったらすぐ 1 回目
  _nextWaveMs = PREVIEW_ENEMIES.everyMs;
  return b;
}

const _fullHp = { hp: 1 };

/** 本番の state をプレビューのものに差し替えて fn を呼び、 すぐ戻す (= 撃破数も戻す。 効果音は鳴らさない) */
function _withPreview(fn) {
  const saved = { battle: state.battle, buffs: state.buffs, stats: state.stats, statsMax: state.statsMax, kills: state.killCount };
  state.battle = _pb;
  state.buffs = _buffs;
  state.stats = _fullHp;      // HP は満タン (= 自分の HP の帯・画面の縁の赤を出さない)
  state.statsMax = _fullHp;
  setSeMuted(true);
  try {
    fn(_pb);
  } finally {
    setSeMuted(false);
    state.battle = saved.battle;
    state.buffs = saved.buffs;
    state.stats = saved.stats;
    state.statsMax = saved.statsMax;
    state.killCount = saved.kills;
  }
}

/** プレビューの戦場で dt 秒ぶん動かす */
function _step(dt) {
  _withPreview((b) => {
    _clock += dt * 1000;
    // 敵: 自分のまわりまで歩いてくる (= 当たっても痛くない。 少し手前で止まる)
    for (const e of b.enemies) {
      if ((e.hitFreezeMs ?? 0) > 0) { e.hitFreezeMs = Math.max(0, e.hitFreezeMs - dt * 1000); continue; }
      const d = Math.hypot(e.x, e.y) || 1;
      const stop = b.player.r + e.r + 6;
      if (d > stop) { e.x -= (e.x / d) * e.speed * dt; e.y -= (e.y / d) * e.speed * dt; }
    }
    tickWeapons(dt, _clock);
    tickHomingProjectiles(dt);
    tickProjectiles(dt);
    tickOrbits(dt, _clock);
    tickBeams(dt, _clock);
    tickBombs(dt);
    tickShockwaves(dt);
    tickDamageNumbers(dt);
    tickFx(dt);
    b.gems.length = 0;           // CE は拾わない (= レベルアップしない)
    b.magicCards.length = 0;
    if (_clock >= _nextWaveMs) { _nextWaveMs += PREVIEW_ENEMIES.everyMs; _spawnWave(b, _pbTier); }
  });
}

function _render() {
  const c = $("heroStagePreview");
  if (!c || !_pb) return;
  const v = _vw();
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const W = Math.round(v.w * dpr), H = Math.round(v.h * dpr);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  _pb.viewport.w = v.vw; _pb.viewport.h = v.vh;
  _pb.camera.x = -v.vw / 2; _pb.camera.y = -v.vh / 2;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr * v.k, 0, 0, dpr * v.k, 0, 0);
  _withPreview(() => renderBattle(ctx, performance.now()));
}

function _setLabel(tier) {
  const hero = getHero(_heroId);
  const ext = hero ? getExt(HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT) : null;
  const rar = PREVIEW_RARITY[tier];
  const rEl = $("heroStageTierRarity"), nEl = $("heroStageTierName"), box = $("heroStageTier");
  if (rEl) rEl.textContent = t(`hero.rarity.${rar}`, rar);
  if (nEl) nEl.textContent = ext ? getTierName(ext, tier, getLang()) : "";
  if (box) box.dataset.rarity = rar;
}

function _loop() {
  _raf = 0;
  const now = performance.now();   // 選んだ時刻 (= _t0) と同じ時計で測る
  if (_heroId == null) return;
  const stage = $("heroStage");
  const modal = $("heroSelectModal");
  if (!stage || !modal || modal.classList.contains("hidden")) { stopHeroPreview(); return; }
  const dt = Math.min(0.05, Math.max(0, (now - (_last || now)) / 1000));
  _last = now;
  const ph = previewPhase(now - _t0);
  const on = ph.mode === "preview";
  stage.classList.toggle("hero-stage--preview", on);
  if (on) {
    const hero = getHero(_heroId);
    if (hero && (_pbTier !== ph.tier || !_pb)) {
      _pb = _makeBattle(hero, ph.tier);
      _pbTier = ph.tier;
      _clock = 0;
      _setLabel(ph.tier);
    }
    if (_pb) { _step(dt); _render(); }
  } else if (_pbTier) {
    _pb = null;
    _pbTier = 0;
  }
  _raf = requestAnimationFrame(_loop);
}

/** ヒーローを選んだとき (= 1 秒後からプレビュー)。 同じヒーローを押し直しても、 はじめから */
export function startHeroPreview(heroId) {
  if (typeof requestAnimationFrame === "undefined") return;
  _heroId = heroId;
  _t0 = performance.now();
  _last = 0;
  _pb = null;
  _pbTier = 0;
  $("heroStage")?.classList.remove("hero-stage--preview");
  if (!_raf) _raf = requestAnimationFrame(_loop);
}

/** ヒーロー選択を閉じたとき・ヒーローを選んでいないとき */
export function stopHeroPreview() {
  _heroId = null;
  _pb = null;
  _pbTier = 0;
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  $("heroStage")?.classList.remove("hero-stage--preview");
}

onLangChange(() => { if (_pbTier) _setLabel(_pbTier); });
