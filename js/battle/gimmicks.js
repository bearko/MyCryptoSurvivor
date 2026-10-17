// ============================================================
// battle/gimmicks.js — ステージごとの仕掛け (= SPEC-064)
// ============================================================
//
// - ステージ 1 アバカス「そろばんの珠」: 予告の線のあと、 大きな珠の列が画面を横切る。 自分に当たると痛いが、 敵もまとめてはじく
// - ステージ 2 ホレリス「パンチカード」: 床に穴の印が打たれ、 1.2 秒後にパンチ。 自分も敵もダメージ。 1 つは自分の足もとに打たれる
// - ステージ 3 トロイ「トロイの木馬」: 木馬が現れ、 9 秒後に開いて敵の群れを吐き出す。 開く前に壊すと宝箱の中身が出る
// 時間はゲームの中の時間 (= stageElapsedMs と dt)。 一時停止で止まり、 懐中時計で速まる。
// 予告 (= 線・印・残り秒) を必ず先に見せる (= 見てから避けられる)。

import { state } from "../state.js";
import { STAGE_TABLE, WORLD_W, WORLD_H, CONTACT_COOLDOWN_MS, MAX_ENEMIES, CHEST_DROPS, SFX } from "../constants.js";
import { hitEnemy, pushDamageNumber } from "./damage.js";
import { fxBurst, fxPlayerHurt } from "./fx.js";
import { playSe } from "../audio.js";
import { triggerGameOver } from "./gameover.js";
import { getObstacleRects, spawnItem } from "./field.js";
import { pickSpawnPoint, rollTable } from "./field-geom.js";
import { spawnEnemyAtRing, currentPool } from "./enemies.js";
import { spawnGem } from "./gems.js";

// ---- チューニング ----
export const BEADS = {
  firstMs: 40000,        // 最初の列
  everyMs: 22000,        // 次の列まで
  doubleFromMs: 150000,  // この時刻からは 2 列ずつ
  warnMs: 1400,          // 予告の線
  speed: 720,            // 珠の速さ (px/s)
  count: 5,              // 1 列の珠の数
  gap: 62,               // 珠の間
  r: 22,                 // 珠の当たりの半径
  playerDmg: 20,         // 自分に当たったとき (= ステージの攻撃力の倍率がかかる)
  enemyDmg: 120,         // 敵に当たったとき
  knockPx: 70,           // 敵をはじく距離
};
export const PUNCH = {
  firstMs: 30000,
  everyMs: 9000,
  fastFromMs: 150000,    // この時刻からは間隔が縮む
  fastEveryMs: 6000,
  warnMs: 1200,          // 印からパンチまで
  decalMs: 900,          // パンチのあと、 穴が見えている長さ
  holes: 4,              // 1 回に打つ穴の数 (= 1 つは自分の足もと)
  w: 44,                 // 穴の大きさ (= パンチカードの穴のような縦長)
  h: 64,
  spreadPx: 230,         // 自分の足もと以外の穴を打つ範囲
  playerDmg: 22,
  enemyDmg: 150,
};
export const TROJAN = {
  atMs: [60000, 120000, 180000],   // 木馬が現れる時刻 (= ボスの前に 3 回)
  openMs: 9000,          // 現れてから開くまで
  hp: 500,               // ステージの HP の倍率・ABSOLUTE の HP の軸がかかる
  r: 40,                 // 当たりの半径
  size: 128,             // 絵の大きさ (= 原本 64px の 2 倍)
  swarm: [18, 26, 34],   // 開いたときに出る敵の数 (= 1 頭目・2 頭目・3 頭目。 だんだん増える。 ABSOLUTE の出現数の軸がかかる)
  minD: 260,             // 自分からの距離
  maxD: 380,
  rewardGems: 8,         // 壊したときの CE
};
export const TROJAN_EXT_ID = 5179;   // トロイの木馬

// ---- 純関数 (= tests/gimmicks.test.mjs) ----

/** 珠の列の i 番目の珠の x (= 先頭は lead。 後ろへ gap ずつ) */
export function beadX(lead, dir, i, gap = BEADS.gap) {
  return lead - dir * i * gap;
}

/** 列の先頭の x (= 予告のあいだは出発点のまま) */
export function beadLead(row, tMs) {
  const run = Math.max(0, tMs - BEADS.warnMs);
  return row.x0 + row.dir * (run / 1000) * BEADS.speed;
}

/** 列が画面を抜けきったか */
export function beadRowDone(row, tMs) {
  const tail = beadX(beadLead(row, tMs), row.dir, BEADS.count - 1);
  return row.dir > 0 ? tail > row.x1 + BEADS.r : tail < row.x1 - BEADS.r;
}

/** 円 (= 自分・敵) が穴の四角に入っているか (= 半径の 6 割まではみ出してよい) */
export function inHole(hx, hy, x, y, r, w = PUNCH.w, h = PUNCH.h) {
  return Math.abs(x - hx) <= w / 2 + r * 0.6 && Math.abs(y - hy) <= h / 2 + r * 0.6;
}

/** 次のパンチまで */
export function punchInterval(elapsedMs) {
  return elapsedMs >= PUNCH.fastFromMs ? PUNCH.fastEveryMs : PUNCH.everyMs;
}

/** 木馬の残り秒の表示 (= 切り上げ) */
export function trojanSecLeft(openMs) {
  return Math.max(0, Math.ceil(openMs / 1000));
}

// ---- 状態 ----

function _stage() {
  return STAGE_TABLE[state.currentStageIdx] ?? STAGE_TABLE[0];
}

/** ステージの始まりに呼ぶ */
export function resetGimmicks() {
  const kind = _stage().gimmick ?? null;
  state.battle.gimmick = {
    kind,
    nextMs: kind === "beads" ? BEADS.firstMs : (kind === "punch" ? PUNCH.firstMs : 0),
    trojanIdx: 0,
    rows: [],      // 珠の列 {y, dir, x0, x1, t, hitPlayer, hitIds}
    punches: [],   // パンチ {holes:[{x,y}], t, done}
  };
}

function _dmgMul() {
  return (_stage().enemyDmgMul ?? 1) * (state.absolute?.dmgMul ?? 1);
}

/** 仕掛けが自分に当たった (= 被弾の間隔は体当たりと共通) */
function _hurtPlayer(raw) {
  const b = state.battle;
  if (b.gameOver || b.contactCooldownMs > 0) return;
  const taken = Math.max(1, Math.round(raw * _dmgMul() * (state.buffs?.dmgTakenMul ?? 1)));
  state.stats.hp = Math.max(0, state.stats.hp - taken);
  b.contactCooldownMs = CONTACT_COOLDOWN_MS;
  pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, taken, "#ff7676");
  playSe(SFX.PLAYER_DAMAGED, 200, 0.55);
  fxPlayerHurt(false);
  if (state.stats.hp <= 0 && !b.gameOver) triggerGameOver();
}

const _clampX = (x, pad = 0) => Math.max(-WORLD_W / 2 + pad, Math.min(WORLD_W / 2 - pad, x));
const _clampY = (y, pad = 0) => Math.max(-WORLD_H / 2 + pad, Math.min(WORLD_H / 2 - pad, y));

// ---- 毎フレーム ----

export function tickGimmicks(dt) {
  const b = state.battle;
  const g = b.gimmick;
  if (!g || !g.kind || b.gameOver) return;
  const dms = dt * 1000;
  const el = b.stageElapsedMs;
  if (g.kind === "beads") _tickBeads(g, dms, el);
  else if (g.kind === "punch") _tickPunch(g, dms, el);
  else if (g.kind === "trojan") _tickTrojan(g, dms, el);
}

// ---- 1. そろばんの珠 ----
function _spawnRow(y, dir) {
  const b = state.battle;
  const half = b.viewport.w / 2 + 120;
  const left = _clampX(b.player.x - half), right = _clampX(b.player.x + half);
  return {
    y: _clampY(y, BEADS.r),
    dir,
    x0: dir > 0 ? left : right,
    x1: dir > 0 ? right : left,
    t: 0,
    hitPlayer: false,
    hitIds: new Set(),
  };
}

function _tickBeads(g, dms, el) {
  const b = state.battle;
  if (el >= g.nextMs) {
    g.nextMs = el + BEADS.everyMs;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = b.player.y + (Math.random() * 2 - 1) * 140;
    g.rows.push(_spawnRow(y, dir));
    if (el >= BEADS.doubleFromMs) {
      // 2 列目は 1 列目から離して、 逆向きに
      const off = (Math.random() < 0.5 ? -1 : 1) * (170 + Math.random() * 90);
      g.rows.push(_spawnRow(y + off, -dir));
    }
    playSe(SFX.GIMMICK_WARN, 0, 0.3);
  }
  for (let k = g.rows.length - 1; k >= 0; k--) {
    const row = g.rows[k];
    row.t += dms;
    if (row.t < BEADS.warnMs) continue;
    if (beadRowDone(row, row.t)) { g.rows.splice(k, 1); continue; }
    const lead = beadLead(row, row.t);
    // 自分 (= 1 列で 1 回まで)
    if (!row.hitPlayer) {
      const p = b.player;
      for (let i = 0; i < BEADS.count; i++) {
        const dx = beadX(lead, row.dir, i) - p.x, dy = row.y - p.y, rr = BEADS.r + p.r;
        if (dx * dx + dy * dy <= rr * rr) { row.hitPlayer = true; _hurtPlayer(BEADS.playerDmg); break; }
      }
    }
    // 敵 (= 1 列で 1 体 1 回。 列から離れる向きにはじく)
    for (let j = b.enemies.length - 1; j >= 0; j--) {
      const e = b.enemies[j];
      if (e.isProp || row.hitIds.has(e.id)) continue;
      for (let i = 0; i < BEADS.count; i++) {
        const dx = beadX(lead, row.dir, i) - e.x, dy = row.y - e.y, rr = BEADS.r + e.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        row.hitIds.add(e.id);
        const killed = hitEnemy(j, BEADS.enemyDmg);
        if (!killed && !e.isBoss && e.behavior !== "trojan") {
          e.y = _clampY(e.y + (e.y >= row.y ? 1 : -1) * BEADS.knockPx, e.r);
        }
        break;
      }
    }
  }
}

// ---- 2. パンチカード ----
function _tickPunch(g, dms, el) {
  const b = state.battle;
  if (el >= g.nextMs) {
    g.nextMs = el + punchInterval(el);
    const holes = [{ x: _clampX(b.player.x, PUNCH.w), y: _clampY(b.player.y, PUNCH.h) }];
    for (let tries = 0; holes.length < PUNCH.holes && tries < 40; tries++) {
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * (PUNCH.spreadPx - 70);
      const x = _clampX(b.player.x + Math.cos(a) * d, PUNCH.w), y = _clampY(b.player.y + Math.sin(a) * d, PUNCH.h);
      if (holes.every((h) => Math.abs(h.x - x) > PUNCH.w + 8 || Math.abs(h.y - y) > PUNCH.h + 8)) holes.push({ x, y });
    }
    g.punches.push({ holes, t: 0, done: false });
  }
  for (let k = g.punches.length - 1; k >= 0; k--) {
    const pu = g.punches[k];
    pu.t += dms;
    if (!pu.done && pu.t >= PUNCH.warnMs) {
      pu.done = true;
      const p = b.player;
      if (pu.holes.some((h) => inHole(h.x, h.y, p.x, p.y, p.r))) _hurtPlayer(PUNCH.playerDmg);
      for (let j = b.enemies.length - 1; j >= 0; j--) {
        const e = b.enemies[j];
        if (e.isProp) continue;
        if (pu.holes.some((h) => inHole(h.x, h.y, e.x, e.y, e.r))) hitEnemy(j, PUNCH.enemyDmg);
      }
      for (const h of pu.holes) fxBurst(h.x, h.y, "#f4efe2", 8, 160);   // 紙くず
      playSe(SFX.PUNCH, 60, 0.35);
    }
    if (pu.t >= PUNCH.warnMs + PUNCH.decalMs) g.punches.splice(k, 1);
  }
}

// ---- 3. トロイの木馬 ----
function _tickTrojan(g, dms, el) {
  const b = state.battle;
  if (g.trojanIdx < TROJAN.atMs.length && el >= TROJAN.atMs[g.trojanIdx]) {
    g.trojanIdx += 1;
    _spawnTrojan();
  }
  for (let j = b.enemies.length - 1; j >= 0; j--) {
    const e = b.enemies[j];
    if (e.behavior !== "trojan") continue;
    e.openMs -= dms;
    if (e.openMs > 0) continue;
    b.enemies.splice(j, 1);
    _openTrojan(e);
  }
}

function _spawnTrojan() {
  const b = state.battle;
  const at = pickSpawnPoint({
    rnd: Math.random, px: b.player.x, py: b.player.y, minD: TROJAN.minD, maxD: TROJAN.maxD,
    halfW: WORLD_W / 2, halfH: WORLD_H / 2, rects: getObstacleRects(), r: TROJAN.r,
  });
  if (!at) return;
  const hp = Math.max(1, Math.round(TROJAN.hp * (_stage().enemyHpMul ?? 1) * (state.absolute?.hpMul ?? 1)));
  b.enemies.push({
    id: b.nextEntityId++,
    enemyId: null,
    behavior: "trojan",
    wave: state.battle.gimmick.trojanIdx - 1,   // 何頭目か (= 開いたときの数)
    x: at.x, y: at.y, r: TROJAN.r,
    hp, hpMax: hp, dmg: 0, speed: 0,
    color: "#a0703a",
    hitFreezeMs: 0, isBoss: false, isRare: false, xpValue: 0,
    openMs: TROJAN.openMs,
  });
  pushDamageNumber(at.x, at.y - TROJAN.r - 8, "TROJAN!", "#ffb38a", "lg");
  playSe(SFX.GIMMICK_WARN, 0, 0.4);
}

/** 開く: 敵の群れを吐き出す (= 木馬のまわりから、 出現の上限まで) */
function _openTrojan(e) {
  const b = state.battle;
  const pool = currentPool(b.stageElapsedMs);
  const base = TROJAN.swarm[Math.min(e.wave ?? 0, TROJAN.swarm.length - 1)];
  const n = Math.round(base * (state.absolute?.spawnMul ?? 1));
  for (let i = 0; i < n && b.enemies.length < MAX_ENEMIES; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const d = 10 + Math.random() * 46;
    spawnEnemyAtRing(pool[Math.floor(Math.random() * pool.length)], { x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d });
  }
  fxBurst(e.x, e.y, "#c98b4f", 24, 240);
  pushDamageNumber(e.x, e.y - TROJAN.r - 8, "OPEN!!", "#ff7676", "xl");
  playSe(SFX.TROJAN_OPEN, 0, 0.5);
}

/** 開く前に壊した (= damage.js から)。 宝箱の中身と CE。 RTA でも懐中時計は出さない (= RTA の最短時間を変えない) */
export function breakTrojan(e) {
  const xpMul = _stage().xpMul ?? 1;
  spawnItem(rollTable(CHEST_DROPS, Math.random()), e.x, e.y);
  for (let i = 0; i < TROJAN.rewardGems; i++) {
    const a = (Math.PI * 2 * i) / TROJAN.rewardGems;
    spawnGem(e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, Math.max(1, Math.round(xpMul)));
  }
  fxBurst(e.x, e.y, "#f0c14b", 26, 240);
  pushDamageNumber(e.x, e.y - TROJAN.r - 8, "BREAK!", "#ffe39a", "xl");
}
