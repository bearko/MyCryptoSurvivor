// ============================================================
// battle/fx.js — 戦闘の手ごたえ (= SPEC-045)
// ============================================================
//
// 揺れ・被弾の縁の赤・閃光・撃破の粒・ボスの予告。 状態は state.battle.fx に置き、
// 描画は render.js から renderFxWorld (= 世界座標の粒) / renderFxScreen (= 画面の縁) を呼ぶ。
// 「演出を減らす」 / OS の reduced-motion (= prefersReducedMotion) では、 揺れ・粒・閃光・震えを止め、
// 被弾と HP 低下は動かない薄い縁だけ出す (= 情報は残す)。
// 時間は一時停止中に進まない (= _loop が tickFx を呼ばない)。

import { state } from "../state.js";
import { playSe } from "../audio.js";
import { prefersReducedMotion } from "../motion.js";
import { renderHud } from "../survival.js";
import { STAGE_TABLE, THUNDER_FX_MS } from "../constants.js";
import { getEnemy, enemyImg, localizedEnemyName } from "../enemies.js";
import { getLang } from "../i18n.js";
import { naviSay, naviLines } from "../navi.js";

export const MAX_PARTICLES   = 240;
export const HIT_FLASH_MS    = 80;
export const HURT_MS         = 350;
export const FLASH_MS        = 260;
export const PARTICLE_LIFE_MS = 520;
export const LOW_HP_RATIO    = 0.3;

const SE_KILL = "Audio/SE/Battle/2_area_damage.mp3";
const SE_BOSS_WARN = "Audio/SE/Battle/5_debuff_status_effect.mp3";

/** 撃破の粒の数 (= 純関数) */
export function burstCount(kind) {
  if (kind === "boss") return 32;
  if (kind === "rare") return 14;
  return 6;
}

/** 古いもの (= 配列の先頭) から捨てて max 以下にする (= 配列を直接縮める) */
export function capParticles(arr, max = MAX_PARTICLES) {
  const over = arr.length - max;
  if (over > 0) arr.splice(0, over);
  return arr;
}

/** v (0..1) を lifeMs で 0 まで線形に減らす (= 純関数) */
export function decay(v, dtMs, lifeMs) {
  if (!(lifeMs > 0)) return 0;
  return Math.max(0, v - dtMs / lifeMs);
}

function _fx() {
  const b = state.battle;
  if (!b.fx) resetFx();
  return b.fx;
}

export function resetFx() {
  state.battle.fx = { shake: 0, shakeMs: 0, hurt: 0, flash: 0, particles: [], bossWarned: false, countSec: -1, bolts: [], boltMs: 0 };
  _hideBossBanner();
  clearTimeout(_cutinTimer);
  globalThis.document?.getElementById("bossCutin")?.classList.remove("boss-cutin--run");
}

function _shake(mag, ms) {
  const fx = _fx();
  if (mag >= fx.shake || fx.shakeMs <= 0) {
    fx.shake = mag;
    fx.shakeMs = ms;
  }
}

// HUD は 1 秒ごとの tick で描き直すので、 被弾・撃破のときはすぐ描き直す (= HP の帯・撃破数が遅れない)。
let _lastHudMs = 0;
let _hudTimer = 0;
function _refreshHud(force = false) {
  const now = Date.now();
  if (!force && now - _lastHudMs < 100) {
    // 間引いた分は少し後に 1 回まとめて描く (= 最後の撃破が数に入らないままにしない)
    if (!_hudTimer) _hudTimer = setTimeout(() => { _hudTimer = 0; _refreshHud(true); }, 120);
    return;
  }
  _lastHudMs = now;
  try { renderHud(); } catch (_) {}
}

function _vibrate(ms) {
  if (prefersReducedMotion()) return;
  try { globalThis.navigator?.vibrate?.(ms); } catch (_) {}
}

export function fxEnemyHit(e) {
  if (e) e.hitFlashMs = HIT_FLASH_MS;
}

export function fxEnemyKilled(e) {
  if (!e) return;
  const kind = e.isBoss ? "boss" : (e.isRare ? "rare" : "normal");
  playSe(SE_KILL, 90, kind === "normal" ? 0.18 : 0.35);
  _refreshHud();
  if (kind === "boss") {
    _shake(10, 520);
    _fx().flash = prefersReducedMotion() ? 0 : 1;
    _vibrate(60);
  }
  if (prefersReducedMotion()) return;
  const fx = _fx();
  const n = burstCount(kind);
  const color = e.color || "#e6e0f0";
  const speed = kind === "boss" ? 260 : 150;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const v = speed * (0.45 + Math.random() * 0.7);
    fx.particles.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      age: 0, life: PARTICLE_LIFE_MS * (0.7 + Math.random() * 0.6),
      size: kind === "boss" ? 5 + Math.random() * 4 : 3 + Math.random() * 3,
      color: i % 3 === 0 ? "#fff3c4" : color,
    });
  }
  capParticles(fx.particles);
}

/** SPEC-063: 雷鼓 — 雷の線 (= 落ちた場所ごと)・白い閃光・揺れ */
export function fxThunder(bolts) {
  const fx = _fx();
  fx.bolts = bolts ?? [];
  fx.boltMs = THUNDER_FX_MS;
  _shake(9, 380);
  _vibrate(50);
  if (!prefersReducedMotion()) fx.flash = 1;
}

/** 稲妻の折れ線 (= 純関数。 上から落ちて (x, y) に届く。 seed で形が決まる) */
export function boltPoints(x, y, seed, height = 240, segs = 7) {
  const pts = [];
  let s = Math.floor(seed * 233280) || 1;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jitter = i === 0 || i === segs ? 0 : (rnd() - 0.5) * 34;
    pts.push({ x: x + jitter, y: y - height * (1 - t) });
  }
  return pts;
}

export function fxPlayerHurt(isBoss = false) {
  const fx = _fx();
  fx.hurt = 1;
  _refreshHud(true);
  _shake(isBoss ? 7 : 3.5, isBoss ? 260 : 160);
  _vibrate(isBoss ? 40 : 18);
}

export function fxBossIncoming() {
  const fx = _fx();
  if (fx.bossWarned) return;
  fx.bossWarned = true;
  playSe(SE_BOSS_WARN, 0, 0.6);
  _showBossBanner();
}

// ---- SPEC-061: ボスが出るまでのカウントダウン ----
/** 予告の帯が大きく出ている長さ。 そのあと上の小さな帯にたたみ、 残りの秒を数える */
export const BOSS_BANNER_INTRO_MS = 3200;
/** 最後のこの秒数は、 画面の真ん中に大きな数字 */
export const BOSS_COUNTDOWN_BIG_SEC = 5;

/** 残りの時間の表示 (= 純関数)。 0:10 → 0:01。 端数は切り上げ (= 0.2 秒残りは 0:01) */
export function bossCountdownText(remainMs) {
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/**
 * 予告からボスが出るまで、 毎フレーム呼ぶ。 remainMs: 出るまでの残り (= ゲームの中の時間。 一時停止で止まり、 懐中時計で速まる)
 * leadMs: 予告から出るまでの長さ (= 予告が出てからの経過で、 帯をたたむ時を決める)
 */
export function fxBossCountdown(remainMs, leadMs) {
  const fx = _fx();
  const doc = globalThis.document;
  if (!doc) return;
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
  if (fx.countSec === sec) return;   // 表示が変わるときだけ DOM を触る
  fx.countSec = sec;
  const banner = doc.getElementById("bossBanner");
  const count = doc.getElementById("bossBannerCount");
  if (count) count.textContent = bossCountdownText(remainMs);
  if (banner && !banner.classList.contains("boss-banner--compact") && leadMs - remainMs >= BOSS_BANNER_INTRO_MS) {
    banner.classList.remove("boss-banner--in");
    banner.classList.add("boss-banner--compact");
  }
  const big = doc.getElementById("bossCountdown");
  if (big && sec >= 1 && sec <= BOSS_COUNTDOWN_BIG_SEC) {
    big.textContent = String(sec);
    big.classList.remove("hidden", "boss-countdown--tick");
    void big.offsetWidth;   // アニメーションをかけ直す
    big.classList.add("boss-countdown--tick");
  }
}

function _hideBossCountdown() {
  const big = globalThis.document?.getElementById("bossCountdown");
  big?.classList.add("hidden");
  big?.classList.remove("boss-countdown--tick");
}

export function fxBossSpawned() {
  _shake(8, 420);
  _vibrate(50);
  _hideBossBanner();
  _showBossCutin();   // SPEC-057
}

/** SPEC-057: 拾った・開けたときの光の粒 (= 撃破の粒と同じ仕組み)。 動きを減らすときは出さない */
export function fxBurst(x, y, color = "#f6e2a0", n = 12, speed = 170) {
  if (prefersReducedMotion()) return;
  const fx = _fx();
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const v = speed * (0.5 + Math.random() * 0.7);
    fx.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      age: 0, life: PARTICLE_LIFE_MS * (0.8 + Math.random() * 0.5),
      size: 3 + Math.random() * 3,
      color: i % 3 === 0 ? "#ffffff" : color,
    });
  }
  capParticles(fx.particles);
}

export function tickFx(dt) {
  const fx = _fx();
  const dms = dt * 1000;
  if (fx.shakeMs > 0) {
    fx.shakeMs -= dms;
    if (fx.shakeMs <= 0) { fx.shakeMs = 0; fx.shake = 0; }
  }
  fx.hurt = decay(fx.hurt, dms, HURT_MS);
  fx.flash = decay(fx.flash, dms, FLASH_MS);
  if (fx.boltMs > 0) { fx.boltMs = Math.max(0, fx.boltMs - dms); if (fx.boltMs === 0) fx.bolts = []; }
  const ps = fx.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.age += dms;
    if (p.age >= p.life) { ps.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
  for (const e of state.battle.enemies) {
    if ((e.hitFlashMs ?? 0) > 0) e.hitFlashMs = Math.max(0, e.hitFlashMs - dms);
  }
}

/** 描画のずらし量 (= reduced では 0) */
export function shakeOffset() {
  const fx = state.battle.fx;
  if (!fx || fx.shakeMs <= 0 || fx.shake <= 0 || prefersReducedMotion()) return { x: 0, y: 0 };
  // SPEC-152: 止まっているあいだ (= レッスン・店・倒れた) は揺らさない。 tickFx が進まないので揺れが残り、 画面を覆う暗い層がずれたままになっていた
  if (state.pauseFlags > 0 || state.battle.gameOver) return { x: 0, y: 0 };
  const m = fx.shake * Math.min(1, fx.shakeMs / 160);
  return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
}

/** 世界座標の粒 (= render.js が camera を引いて呼ぶ) */
export function renderFxWorld(ctx, camera, w, h) {
  const fx = state.battle.fx;
  if (!fx) return;
  if (fx.boltMs > 0 && fx.bolts?.length) _drawBolts(ctx, camera, fx.bolts, fx.boltMs / THUNDER_FX_MS);
  if (!fx.particles.length) return;
  for (const p of fx.particles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
    const t = p.age / p.life;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = p.color;
    const s = p.size * (1 - t * 0.5);
    ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

/** SPEC-063: 稲妻 (= 太い淡い光の上に、 白い芯) */
function _drawBolts(ctx, camera, bolts, k) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const bo of bolts) {
    const pts = boltPoints(bo.x - camera.x, bo.y - camera.y, bo.seed);
    for (const [width, color, alpha] of [[9, "#fff1a0", 0.35], [3, "#ffffff", 0.95]]) {
      ctx.globalAlpha = alpha * k;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function _edge(ctx, w, h, alpha) {
  if (alpha <= 0) return;
  const r = Math.max(w, h) * 0.75;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, "rgba(231, 60, 60, 0)");
  g.addColorStop(1, `rgba(231, 60, 60, ${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 画面の縁の赤 (= 被弾・HP 低下) と閃光 */
export function renderFxScreen(ctx, w, h, nowMs = 0) {
  const fx = state.battle.fx;
  if (!fx) return;
  const reduced = prefersReducedMotion();
  const hpRatio = state.statsMax.hp > 0 ? state.stats.hp / state.statsMax.hp : 1;
  let edge = 0;
  if (hpRatio > 0 && hpRatio <= LOW_HP_RATIO) {
    edge = reduced ? 0.35 : 0.3 + 0.15 * Math.sin(nowMs / 260);
  }
  if (fx.hurt > 0) edge = Math.max(edge, reduced ? 0.45 : 0.7 * fx.hurt);
  _edge(ctx, w, h, edge);
  if (fx.flash > 0 && !reduced) {
    ctx.globalAlpha = 0.55 * fx.flash;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// ---- ボスの予告の帯 (= DOM。 #bossBanner) ----
function _showBossBanner() {
  const el = globalThis.document?.getElementById("bossBanner");
  if (!el) return;
  // SPEC-071: RTA のときは、 たたんだ帯を右端に (= 上の真ん中の RTA の時計と重ねない)
  el.classList.toggle("boss-banner--rta", !!state.rtaMode);
  el.classList.remove("hidden");
  el.classList.remove("boss-banner--in");
  void el.offsetWidth;   // アニメーションをかけ直す
  el.classList.add("boss-banner--in");
}

function _hideBossBanner() {
  const el = globalThis.document?.getElementById("bossBanner");
  el?.classList.add("hidden");
  el?.classList.remove("boss-banner--in", "boss-banner--compact");
  _hideBossCountdown();   // SPEC-061
}

// ---- SPEC-057: ボスが出た瞬間のカットイン (= DOM。 #bossCutin。 遊びは止めない) ----
let _cutinTimer = 0;
function _showBossCutin() {
  const doc = globalThis.document;
  const el = doc?.getElementById("bossCutin");
  const stage = STAGE_TABLE[state.currentStageIdx ?? 0];
  if (!el || !stage) return;
  const boss = getEnemy(stage.bossEnemyId);
  const sprite = doc.getElementById("bossCutinSprite");
  const name = doc.getElementById("bossCutinName");
  if (sprite) sprite.src = enemyImg(stage.bossEnemyId);
  if (name) name.textContent = localizedEnemyName(boss, getLang()) || "BOSS";
  // マインちゃんが通信窓で知らせる (= 言い終えると引っこむ)
  const hud = doc.getElementById("hud");
  const top = (hud ? Math.round(hud.getBoundingClientRect().bottom) : 0) + (state.rtaMode ? 40 : 8);
  naviSay(naviLines("boss"), { place: "battle", autoHideMs: 1400, top });
  if (prefersReducedMotion()) return;
  el.classList.remove("boss-cutin--run");
  void el.offsetWidth;
  el.classList.add("boss-cutin--run");
  clearTimeout(_cutinTimer);
  _cutinTimer = setTimeout(() => el.classList.remove("boss-cutin--run"), 1950);
}
