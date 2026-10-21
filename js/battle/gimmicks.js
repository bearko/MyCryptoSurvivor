// ============================================================
// battle/gimmicks.js — ステージごとの仕掛け (= SPEC-064)
// ============================================================
//
// - ステージ 1 アバカス「そろばんの珠」: 予告の線のあと、 大きな珠の列が画面を横切る。 自分に当たると痛いが、 敵もまとめてはじく
//   SPEC-075: 珠は 5042 球状黒鉛 (= グラファイトの Legendary) の絵で、 転がって回る。 列は横だけでなく縦・斜めにも走る
// - ステージ 2 ホレリス「パンチカード」: 床に穴の印が打たれ、 1.2 秒後にパンチ。 自分も敵もダメージ。 1 つは自分の足もとに打たれる
// - ステージ 3 トロイ「トロイの木馬」: 木馬が現れ、 9 秒後に開いて敵の群れを吐き出す。 開く前に壊すと宝箱の中身が出る
// 時間はゲームの中の時間 (= stageElapsedMs と dt)。 一時停止で止まり、 懐中時計で速まる。
// 予告 (= 線・印・残り秒) を必ず先に見せる (= 見てから避けられる)。

import { state } from "../state.js";
import { t } from "../i18n.js";   // SPEC-148: 仕掛けの名前
import { STAGE_TABLE, WORLD_W, WORLD_H, CHEST_DROPS, SFX } from "../constants.js";
import { storyAllows, storyStage } from "../story.js";   // SPEC-165
import { easyStage } from "../easy.js";
import { stageMaxEnemies } from "./horde.js";
import { hitEnemy, pushDamageNumber } from "./damage.js";   // SPEC-129: pushDamageNumber が抜けていて、 木馬が出るとステージ 3 が止まっていた
import { hurtPlayer } from "./hurt.js";   // SPEC-090c
import { fxBurst } from "./fx.js";
import { playSe } from "../audio.js";
import { getObstacleRects, spawnItem } from "./field.js";
import { pickSpawnPoint, rollTable } from "./field-geom.js";
import { spawnEnemyAtRing, currentPool } from "./enemies.js";
import { spawnGem } from "./gems.js";
import { naviTipOnce } from "../navi-tips.js";
import { currentBounds } from "./arena.js";

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
  extId: 5042,           // SPEC-075: 珠の絵 (= 球状黒鉛。 グラファイトの Legendary)
  diagFromMs: 90000,     // SPEC-075: この時刻からは斜めの列も
  margin: 120,           // 列が画面の外から入って、 外へ抜けるまでの余り
};
/** SPEC-075: 列の向き (= 単位ベクトル)。 横 2・縦 2・斜め 4 */
export const BEAD_DIRS = {
  h: [[1, 0], [-1, 0]],
  v: [[0, 1], [0, -1]],
  d: [[Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]],
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

// SPEC-075: 列は 出発点 (x0, y0)・向き (ux, uy)・長さ len で持つ (= 横・縦・斜めを同じ計算で)

/** 列の先頭が出発点から進んだ道のり (= 予告のあいだは 0) */
export function beadLead(row, tMs) {
  const run = Math.max(0, tMs - BEADS.warnMs);
  return (run / 1000) * BEADS.speed;
}

/** 列の i 番目の珠の位置 (= 先頭は lead。 後ろへ gap ずつ) */
export function beadPos(row, lead, i, gap = BEADS.gap) {
  const s = lead - i * gap;
  return { x: row.x0 + row.ux * s, y: row.y0 + row.uy * s, s };
}

/** 列が抜けきったか (= いちばん後ろの珠が終点を越えた) */
export function beadRowDone(row, tMs) {
  return beadLead(row, tMs) - (BEADS.count - 1) * BEADS.gap > row.len + BEADS.r;
}

/** その時刻に出す列の向きの組 (= 最初の列は横。 そのあとは横・縦、 diagFromMs からは斜めも) */
export function beadDirChoices(elapsedMs, first) {
  if (first) return BEAD_DIRS.h;
  return elapsedMs >= BEADS.diagFromMs ? [...BEAD_DIRS.h, ...BEAD_DIRS.v, ...BEAD_DIRS.d] : [...BEAD_DIRS.h, ...BEAD_DIRS.v];
}

/** 画面 (= vw×vh) を、 向き u で横切るのに要る長さ (= 画面の幅を u の向きに測ったもの + 余り) */
export function beadSpan(ux, uy, vw, vh, margin = BEADS.margin) {
  return Math.abs(ux) * vw + Math.abs(uy) * vh + margin * 2;
}

/**
 * 線分 (= 出発点 x0,y0 から向き u に長さ len) を、 世界 (= ±halfW, ±halfH) の中に切りつめる。
 * 戻り値は切りつめた { x0, y0, len }。 世界にかからなければ null
 */
export function clipRowToWorld(x0, y0, ux, uy, len, halfW, halfH) {
  let t0 = 0, t1 = len;
  for (const [p, q] of [[-ux, x0 + halfW], [ux, halfW - x0], [-uy, y0 + halfH], [uy, halfH - y0]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  return { x0: x0 + ux * t0, y0: y0 + uy * t0, len: t1 - t0 };
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
  const kind = storyAllows(`gimmick`) ? (storyStage()?.gimmick ?? _stage().gimmick ?? null) : null;   // SPEC-165: ストーリーはレシピが許すときだけ (= 種類もレシピ)
  state.battle.gimmick = {
    kind,
    nextMs: kind === "beads" ? BEADS.firstMs : (kind === "punch" ? PUNCH.firstMs : 0),
    trojanIdx: 0,
    rows: [],      // 珠の列 {x0, y0, ux, uy, len, t, hitPlayer, hitIds} (= SPEC-075)
    beadRows: 0,   // SPEC-075: 出した列の数 (= 最初の列だけ横)
    punches: [],   // パンチ {holes:[{x,y}], t, done}
  };
}

function _dmgMul() {
  return (easyStage()?.enemyDmgMul ?? _stage().enemyDmgMul ?? 1) * (state.absolute?.dmgMul ?? 1);   // SPEC-165: ストーリーの痛さもレシピ
}

/** 仕掛けが自分に当たった (= 被弾の間隔は体当たりと共通) */
function _hurtPlayer(raw, name = null) {
  hurtPlayer(raw * _dmgMul(), { boss: false, shake: false, kind: "gimmick", name });   // SPEC-090c: 被弾は 1 か所 (= hurt.js)。 SPEC-148: 仕掛け
}

// SPEC-079: ボス戦の枠があれば、 その中に収める
const _clampX = (x, pad = 0) => { const bd = currentBounds(); return Math.max(bd.minX + pad, Math.min(bd.maxX - pad, x)); };
const _clampY = (y, pad = 0) => { const bd = currentBounds(); return Math.max(bd.minY + pad, Math.min(bd.maxY - pad, y)); };

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
/**
 * 列を 1 本作る。 自分の近く (= 列に直角に off ずらした線) を、 画面の外から外へ横切る (= SPEC-075 で向きは自由)
 */
function _spawnRow(ux, uy, off) {
  const b = state.battle;
  const nx = -uy, ny = ux;   // 列に直角な向き
  const cx = _clampX(b.player.x + nx * off, BEADS.r), cy = _clampY(b.player.y + ny * off, BEADS.r);
  const span = beadSpan(ux, uy, b.viewport.w, b.viewport.h);
  const bd = currentBounds();   // SPEC-079: ボス戦の枠があれば、 その中に切りつめる (= 枠は真ん中にある)
  const clip = clipRowToWorld(cx - ux * span / 2, cy - uy * span / 2, ux, uy, span, bd.maxX, bd.maxY);
  if (!clip || clip.len < BEADS.gap * 2) return null;
  return {
    x0: clip.x0, y0: clip.y0, ux, uy, len: clip.len,
    t: 0,
    hitPlayer: false,
    hitIds: new Set(),
  };
}

function _tickBeads(g, dms, el) {
  const b = state.battle;
  if (el >= g.nextMs) {
    g.nextMs = el + BEADS.everyMs;
    const choices = beadDirChoices(el, (g.beadRows ?? 0) === 0);
    const [ux, uy] = choices[Math.floor(Math.random() * choices.length)];
    const off = (Math.random() * 2 - 1) * 140;
    const first = _spawnRow(ux, uy, off);
    if (first) { g.rows.push(first); g.beadRows = (g.beadRows ?? 0) + 1; }
    if (el >= BEADS.doubleFromMs) {
      // 2 列目は 1 列目から離して、 逆向きに
      const off2 = off + (Math.random() < 0.5 ? -1 : 1) * (170 + Math.random() * 90);
      const second = _spawnRow(-ux, -uy, -off2);
      if (second) g.rows.push(second);
    }
    playSe(SFX.GIMMICK_WARN, 0, 0.3);
    naviTipOnce("gimmick.beads");   // SPEC-068: 初めての列だけ
    state.battle.story?.events?.push(`gimmick`);   // SPEC-165: 初めての列の一言
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
        const q = beadPos(row, lead, i);
        if (q.s < 0 || q.s > row.len) continue;
        const dx = q.x - p.x, dy = q.y - p.y, rr = BEADS.r + p.r;
        if (dx * dx + dy * dy <= rr * rr) { row.hitPlayer = true; _hurtPlayer(BEADS.playerDmg, t("analysis.src.beads", "そろばんの珠")); break; }
      }
    }
    // 敵 (= 1 列で 1 体 1 回。 列から離れる向きにはじく)
    const nx = -row.uy, ny = row.ux;
    for (let j = b.enemies.length - 1; j >= 0; j--) {
      const e = b.enemies[j];
      if (e.isProp || row.hitIds.has(e.id)) continue;
      for (let i = 0; i < BEADS.count; i++) {
        const q = beadPos(row, lead, i);
        if (q.s < 0 || q.s > row.len) continue;
        const dx = q.x - e.x, dy = q.y - e.y, rr = BEADS.r + e.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        row.hitIds.add(e.id);
        const killed = hitEnemy(j, BEADS.enemyDmg, "gimmick");   // SPEC-148
        if (!killed && !e.isBoss && e.behavior !== "trojan") {
          const side = ((e.x - row.x0) * nx + (e.y - row.y0) * ny) >= 0 ? 1 : -1;
          e.x = _clampX(e.x + nx * side * BEADS.knockPx, e.r);
          e.y = _clampY(e.y + ny * side * BEADS.knockPx, e.r);
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
    naviTipOnce("gimmick.punch");   // SPEC-068: 初めての印だけ
  }
  for (let k = g.punches.length - 1; k >= 0; k--) {
    const pu = g.punches[k];
    pu.t += dms;
    if (!pu.done && pu.t >= PUNCH.warnMs) {
      pu.done = true;
      const p = b.player;
      if (pu.holes.some((h) => inHole(h.x, h.y, p.x, p.y, p.r))) _hurtPlayer(PUNCH.playerDmg, t("analysis.src.punch", "パンチカード"));
      for (let j = b.enemies.length - 1; j >= 0; j--) {
        const e = b.enemies[j];
        if (e.isProp) continue;
        if (pu.holes.some((h) => inHole(h.x, h.y, e.x, e.y, e.r))) hitEnemy(j, PUNCH.enemyDmg, "gimmick");   // SPEC-148
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
  naviTipOnce("gimmick.trojan");   // SPEC-068: 初めての木馬だけ
}

/** 開く: 敵の群れを吐き出す (= 木馬のまわりから、 出現の上限まで) */
function _openTrojan(e) {
  const b = state.battle;
  const pool = currentPool(b.stageElapsedMs);
  const base = TROJAN.swarm[Math.min(e.wave ?? 0, TROJAN.swarm.length - 1)];
  const n = Math.round(base * (state.absolute?.spawnMul ?? 1));
  const cap = stageMaxEnemies(_stage());   // SPEC-065: トロイは 320
  for (let i = 0; i < n && b.enemies.length < cap; i++) {
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
