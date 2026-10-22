// ============================================================
// battle/boss-moves.js — ボスの攻撃の型 (= SPEC-080)
// ============================================================
//
// どのボスも 1 度に 1 つの型を、 予備動作 (= 予告) → 本番 → 立て直し の順に出す。 予告を必ず先に見せる (= 見てから避けられる)。
//   突進 (charge)  : 自分の方へ赤い帯 (= 通り道) を伸ばし、 少しして向きを固めて走る。 枠の縁で止まり、 そのあと少し動けない (= 反撃の好機)
//   叩きつけ (slam): ボスのまわりに赤い円が満ちていき、 満ちたら衝撃 (= 円の中にいると痛い)
//   放射 (burst)   : まわりに弾をばらまく
//   渦 (spiral)    : 回りながら弾を撃ち続ける
// HP が半分を切ると、 次の型までが短くなる (= 怒り)。 ボスごとの型・間隔・HP の倍率は BOSS_MOVES。
// ファオの放射・yamap の周回 (= boss-attack.js) はそのまま重ねる。 時間はゲームの中の時間。

import { state } from "../state.js";
import { SFX, FAO_PROJ_R, FAO_PROJ_ICON_SIZE, FAO_PROJ_LIFE_MS } from "../constants.js";
import { currentBounds } from "./arena.js";
import { hurtPlayer } from "./hurt.js";   // SPEC-090c
import { windupMs } from "../perks.js";   // SPEC-090c: 見切り (= 予告が長い)
import { playSe } from "../audio.js";
import { fxBurst } from "./fx.js";

/** ボスごとの型 (= moves: 型 → 間隔 ms)。 hpMul: ENEMY_SPECS の HP に掛ける。 SPEC-080 では ×20 / ×15 (= ボスの前にレベルが 40 前後まで上がっていた) だったが、 SPEC-163 で湧きをゆるめて HP の最終値を ENEMY_SPECS に書いたので 1 */
export const BOSS_MOVES = {
  171: {   // ディープ・ヨシュカ (= ステージ 1。 いままでは体当たりだけ)
    hpMul: 1,
    moves: { charge: 6000, slam: 9000, burst: 4500 },
    first: { charge: 2500, slam: 6000, burst: 4000 },
    burst: { n: 8, speed: 180, dmg: 14, iconId: 5055 },
    slam: { radius: 150, dmg: 28 },
  },
  373: {   // 覚醒魔王ファオ (= ステージ 2。 放射はいままでどおり重なる)
    hpMul: 1,
    moves: { charge: 5200, spiral: 8000 },
    first: { charge: 2500, spiral: 5000 },
    spiral: { durMs: 2400, everyMs: 110, arms: 3, turn: 0.32, speed: 210, dmg: 14, iconId: 5055 },
  },
  681: {   // COVID-19 (= SPEC-165: ストーリーのラスボス。 ウイルスをバラまく = 放射が多くて速い)
    hpMul: 1,
    moves: { burst: 3800, charge: 6500, slam: 9000 },
    first: { burst: 2500, charge: 5000, slam: 7000 },
    burst: { n: 14, speed: 190, dmg: 14, iconId: 5055 },
    slam: { radius: 160, dmg: 30 },
  },
  1189: {  // yamap (= ステージ 3。 周回はいままでどおり重なる)
    hpMul: 1,
    moves: { charge: 4600, slam: 8000, burst: 5000 },
    first: { charge: 2200, slam: 5000, burst: 3500 },
    burst: { n: 12, speed: 210, dmg: 16, iconId: 5002 },
    slam: { radius: 170, dmg: 34 },
  },
};
export const CHARGE = { windupMs: 950, lockAt: 0.7, speed: 760, maxLen: 620, dmgMul: 1.7, recoverMs: 650 };
export const SLAM = { windupMs: 1000, recoverMs: 450 };
export const BURST_RECOVER_MS = 300;
/** HP がこの割合を切ると、 次の型までの間隔が ENRAGE_CD_MUL 倍に */
export const ENRAGE_AT = 0.5;
export const ENRAGE_CD_MUL = 0.7;
/** 型を選ぶ順 (= 同時に出せるなら前のもの) */
export const MOVE_ORDER = ["charge", "slam", "spiral", "burst"];

// ---- 純関数 (= tests/boss-moves.test.mjs) ----

/**
 * 点 (x, y) から向き (dx, dy) に進んで、 縁 (= bd を r だけ内側に縮めた四角) に当たるまでの長さ。 maxLen で頭打ち
 */
export function rayToBounds(x, y, dx, dy, bd, r, maxLen) {
  let t = maxLen;
  if (dx > 1e-9) t = Math.min(t, (bd.maxX - r - x) / dx);
  if (dx < -1e-9) t = Math.min(t, (bd.minX + r - x) / dx);
  if (dy > 1e-9) t = Math.min(t, (bd.maxY - r - y) / dy);
  if (dy < -1e-9) t = Math.min(t, (bd.minY + r - y) / dy);
  return Math.max(0, t);
}

/** 次に出す型 (= 間隔を待ち終えたもののうち、 MOVE_ORDER の前のもの。 なければ null) */
export function pickMove(cd) {
  for (const k of MOVE_ORDER) if (cd[k] != null && cd[k] <= 0) return k;
  return null;
}

/** いまの間隔の倍率 (= HP が半分を切ると短く) */
export function cooldownMul(hp, hpMax) {
  return hp / Math.max(1, hpMax) < ENRAGE_AT ? ENRAGE_CD_MUL : 1;
}

/** 線分 (= a から b) と点 p の距離 */
export function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

// ---- 毎コマ ----

/** そのボスの型の状態 (= はじめて見たときに作る) */
function _mv(boss) {
  if (boss.mv) return boss.mv;
  const def = BOSS_MOVES[boss.enemyId];
  if (!def) return null;
  const cd = {};
  for (const k of Object.keys(def.moves)) cd[k] = def.first?.[k] ?? def.moves[k];
  boss.mv = { def, cd, act: null, baseDmg: boss.dmg, shake: 0 };
  return boss.mv;
}

/** ボスが自分で動かないあいだか (= 予備動作・突進・立て直し。 enemies.js の追いかけを止める) */
export function bossHoldsStill(boss) {
  return !!boss.mv?.act;
}

export function tickBossMoves(dt) {
  const b = state.battle;
  if (b.gameOver) return;
  const dms = dt * 1000;
  for (const boss of b.enemies) {
    if (!boss.isBoss && !boss.isShadow) continue;   // SPEC-165: シャドーは mv を持って生まれる
    const mv = _mv(boss);
    if (!mv) continue;
    mv.shake = 0;
    if (mv.act) { _tickAct(boss, mv, dms, dt); continue; }
    const mul = cooldownMul(boss.hp, boss.hpMax);
    for (const k of Object.keys(mv.cd)) mv.cd[k] -= dms / mul;
    const k = pickMove(mv.cd);
    if (!k) continue;
    mv.cd[k] = mv.def.moves[k];
    _start(boss, mv, k);
  }
  _tickRings(dms);
}

function _start(boss, mv, kind) {
  const p = state.battle.player;
  if (kind === "charge") {
    const a = Math.atan2(p.y - boss.y, p.x - boss.x);
    mv.act = { kind, phase: "windup", t: 0, dx: Math.cos(a), dy: Math.sin(a), len: 0, run: 0 };
    playSe(SFX.GIMMICK_WARN, 0, 0.45);
  } else if (kind === "slam") {
    mv.act = { kind, phase: "windup", t: 0, radius: mv.def.slam.radius };
    playSe(SFX.GIMMICK_WARN, 0, 0.45);
  } else if (kind === "spiral") {
    mv.act = { kind, phase: "active", t: 0, angle: Math.random() * Math.PI * 2, next: 0 };
  } else if (kind === "burst") {
    _fireRing(boss, mv.def.burst);
    mv.act = { kind, phase: "recover", t: 0 };
  }
}

function _tickAct(boss, mv, dms, dt) {
  const act = mv.act;
  const b = state.battle;
  act.t += dms;
  if (act.kind === "charge") {
    if (act.phase === "windup") {
      // 向きは途中まで自分を追い、 lockAt を過ぎたら固まる (= 最後の一瞬で横へ逃げられる)
      if (act.t < windupMs(CHARGE.windupMs) * CHARGE.lockAt) {
        const a = Math.atan2(b.player.y - boss.y, b.player.x - boss.x);
        act.dx = Math.cos(a); act.dy = Math.sin(a);
      }
      act.len = rayToBounds(boss.x, boss.y, act.dx, act.dy, currentBounds(), boss.r, CHARGE.maxLen);
      mv.shake = (Math.random() - 0.5) * 4 * Math.min(1, act.t / windupMs(CHARGE.windupMs));
      if (act.t >= windupMs(CHARGE.windupMs)) {
        act.phase = "dash"; act.t = 0; act.run = 0;
        boss.dmg = Math.round(mv.baseDmg * CHARGE.dmgMul);
        playSe(SFX.TROJAN_OPEN, 0, 0.45);
      }
    } else if (act.phase === "dash") {
      const step = Math.min(CHARGE.speed * dt, act.len - act.run);
      boss.x += act.dx * step; boss.y += act.dy * step;
      act.run += step;
      if (act.run >= act.len - 0.5) {
        act.phase = "recover"; act.t = 0;
        boss.dmg = mv.baseDmg;
        fxBurst(boss.x, boss.y, "#ff8a8a", 14, 200);
      }
    } else if (act.t >= CHARGE.recoverMs) {
      mv.act = null;
    }
  } else if (act.kind === "slam") {
    if (act.phase === "windup") {
      mv.shake = (Math.random() - 0.5) * 3 * Math.min(1, act.t / windupMs(SLAM.windupMs));
      if (act.t >= windupMs(SLAM.windupMs)) {
        act.phase = "recover"; act.t = 0;
        const p = b.player;
        if (Math.hypot(p.x - boss.x, p.y - boss.y) <= act.radius + p.r) _hurt(mv.def.slam.dmg);
        (b.bossRings ??= []).push({ x: boss.x, y: boss.y, r: act.radius, age: 0, life: 420 });
        fxBurst(boss.x, boss.y, "#ffb0b0", 18, 260);
        playSe(SFX.PUNCH, 0, 0.5);
      }
    } else if (act.t >= SLAM.recoverMs) {
      mv.act = null;
    }
  } else if (act.kind === "spiral") {
    const sp = mv.def.spiral;
    while (act.next <= act.t && act.t < sp.durMs) {
      act.next += sp.everyMs;
      for (let i = 0; i < sp.arms; i++) _fire(boss, act.angle + (Math.PI * 2 * i) / sp.arms, sp);
      act.angle += sp.turn;
    }
    if (act.t >= sp.durMs) mv.act = null;
  } else if (act.kind === "burst") {
    if (act.t >= BURST_RECOVER_MS) mv.act = null;
  }
}

function _fire(boss, a, def) {
  const b = state.battle;
  b.bossProjectiles.push({
    id: b.nextEntityId++,
    bossId: boss.id,
    x: boss.x, y: boss.y,
    vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
    r: FAO_PROJ_R,
    dmg: def.dmg,
    life: FAO_PROJ_LIFE_MS,
    age: 0,
    iconId: def.iconId,
    iconSize: FAO_PROJ_ICON_SIZE,
  });
}

function _fireRing(boss, def) {
  const off = Math.random() * Math.PI * 2;
  for (let i = 0; i < def.n; i++) _fire(boss, off + (Math.PI * 2 * i) / def.n, def);
}

function _hurt(raw) {
  hurtPlayer(raw, { boss: true });   // SPEC-090c: 被弾は 1 か所 (= hurt.js)
}

function _tickRings(dms) {
  const rings = state.battle.bossRings;
  if (!rings) return;
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dms;
    if (rings[i].age >= rings[i].life) rings.splice(i, 1);
  }
}
