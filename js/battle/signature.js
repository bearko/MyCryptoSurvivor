// ============================================================
// battle/signature.js — ヒーローの固有スキル (= SPEC-100)
// ============================================================
//
// ヒーローごとに 1 つ、 常に効いているパッシブ。 名前は MCH のパッシブスキル名そのもの。
// ステータスの差 (= SPEC-097) は ±1 割なので、 遊び方を変えるのはこちら。
// 戦闘の各所 (= 敵に当てる・受ける・動く・拾う・レベルアップ) から呼ばれる。 b.sig が無ければ何もしない (= プレビュー)。
// 上半分は純関数 (= テストする)。

import { state } from "../state.js";

/** heroId → 固有スキル */
export const SIGNATURE_OF = {
  10001: "cryptoSlash",   // MCHウォーリアー     クリプトスラッシュ
  4006:  "oneHole",       // ビリー・ザ・キッド   ワンホールショット
  2043:  "poisonMist",    // 霧隠才蔵             忍術・毒霧
  2003:  "langer",        // ジャックザリッパー   ランゲルライン
  4041:  "teslaCoil",     // ニコラ・テスラ       テスラコイル
  1006:  "tetractys",     // ピタゴラス           テトラクテュス
  2013:  "tiger",         // 許褚                 虎痴
  4052:  "queenPirate",   // フランシス・ドレーク 女王直属海賊
  2016:  "phantom",       // アナスタシア         幻の生存者
  1007:  "uinyeo",        // 大長今               李氏朝鮮、宮廷医女
};

// ---- 数値 (= 遊んで確かめて決める。 SPEC-100 2 章) ----
export const SLASH = { radius: 150, base: 30, perLevel: 8 };                         // レベルアップのたび、 周りへ一撃
export const ONE_HOLE = { step: 0.1, max: 2 };                                       // 同じ敵に当てるたび +10%、 最大 ×2
export const MIST = { everyS: 0.2, lifeS: 2.4, r: 28, tickS: 0.4, base: 6, perLevel: 1, cap: 18 };   // 走った跡の毒の霧
export const LANGER = { range: 160, max: 1.8 };                                      // 近いほど深く切れる
export const TESLA = { everyS: 2.2, firstR: 240, hopR: 160, hops: 2, base: 20, perLevel: 4, showS: 0.18 };   // 連鎖する雷
export const TETRACTYS = { every: 4, steps: 2 };                                     // 4 回目ごとに 2 段
export const TIGER = { start: 0.7, full: 0.3, max: 1.5 };                            // HP が減るほど強く速く
export const PIRATE = { boostS: 1.5, speed: 1.25, pickup: 1.5 };                     // 拾うと速く・広く
export const PHANTOM = { iframeMs: 3000 };                                           // 1 ステージに 1 度、 倒れない
export const UINYEO = { regenPerSec: 0.8, healMul: 2 };                              // ゆっくり戻る・回復が倍

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** ワンホールショット: その敵に当てた回数 → 倍率 */
export function oneHoleMul(hits) {
  return Math.min(ONE_HOLE.max, 1 + ONE_HOLE.step * Math.max(0, hits));
}

/** ランゲルライン: 敵までの距離 → 倍率 (= すぐそばで最大、 range より遠いと ×1) */
export function langerMul(dist) {
  return 1 + (LANGER.max - 1) * clamp01(1 - dist / LANGER.range);
}

/** 虎痴: HP の割合 → 倍率 (= 7 割から上がりはじめ、 3 割以下で最大) */
export function tigerMul(hpRatio) {
  return 1 + (TIGER.max - 1) * clamp01((TIGER.start - hpRatio) / (TIGER.start - TIGER.full));
}

/** テトラクテュス: n 回目のピック (1 から) で上がる段 */
export function tetractysSteps(n) {
  return n > 0 && n % TETRACTYS.every === 0 ? TETRACTYS.steps : 1;
}

/** クリプトスラッシュ・テスラコイル・毒霧のダメージ (= レベルで伸びる) */
export const slashDmg = (level) => SLASH.base + SLASH.perLevel * level;
export const teslaDmg = (level) => TESLA.base + TESLA.perLevel * level;
export const mistDmg  = (level) => MIST.base + MIST.perLevel * level;

/**
 * テスラコイルの的: (x, y) にいちばん近い敵 (firstR 以内) から、 hopR 以内のまだ当てていない敵へ hops 回つなぐ。
 * @returns {object[]} 敵の並び
 */
export function chainTargets(enemies, x, y, { firstR = TESLA.firstR, hopR = TESLA.hopR, hops = TESLA.hops } = {}) {
  const out = [];
  let cx = x, cy = y, r = firstR;
  for (let k = 0; k <= hops; k++) {
    let best = null, bestD = r;
    for (const e of enemies) {
      if (e.isProp || out.includes(e)) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d <= bestD) { best = e; bestD = d; }
    }
    if (!best) break;
    out.push(best);
    cx = best.x; cy = best.y; r = hopR;
  }
  return out;
}

// ---- 戦闘の中 ----

/** ステージの始まりに (= startBattle)。 ヒーローの固有スキルを置く */
export function resetSignature(hero) {
  const kind = SIGNATURE_OF[hero?.heroId] ?? null;
  state.battle.sig = kind ? { kind, t: 0, picks: 0, clouds: [], bolts: [], slashes: [], boostS: 0, phantomUsed: false, mistAcc: 0, mistTickAcc: 0 } : null;
}

const sig = () => state.battle?.sig ?? null;
const is = (kind) => sig()?.kind === kind;

/** 敵に当てるときの倍率 (= damage.js の hitEnemy)。 その敵に当てた回数も数える */
export function sigDamageMul(e) {
  const s = sig();
  if (!s || !e) return 1;
  if (s.kind === "oneHole") { const m = oneHoleMul(e.sigHits ?? 0); e.sigHits = (e.sigHits ?? 0) + 1; return m; }
  if (s.kind === "langer") { const p = state.battle.player; return langerMul(Math.hypot(e.x - p.x, e.y - p.y)); }
  if (s.kind === "tiger") return tigerMul(hpRatio());
  return 1;
}

/** 動く速さの倍率 (= player.js) */
export function sigSpeedMul() {
  const s = sig();
  if (!s) return 1;
  if (s.kind === "tiger") return tigerMul(hpRatio());
  if (s.kind === "queenPirate" && s.boostS > 0) return PIRATE.speed;
  return 1;
}

/** CE を拾える範囲の倍率 (= gems.js) */
export function sigPickupMul() {
  const s = sig();
  return s?.kind === "queenPirate" && s.boostS > 0 ? PIRATE.pickup : 1;
}

/** CE が届いたとき (= gems.js) */
export function sigOnGemsPicked(n) {
  const s = sig();
  if (s?.kind === "queenPirate" && n > 0) s.boostS = PIRATE.boostS;
}

/** 毎秒の回復 (= buffs.js の tickRegen に足す) */
export function sigRegenPerSec() {
  return is("uinyeo") ? UINYEO.regenPerSec : 0;
}

/** 回復アイテムの効きの倍率 (= field.js) */
export function sigHealMul() {
  return is("uinyeo") ? UINYEO.healMul : 1;
}

/** 次のピックで上がる段 (= levelup.js。 数えるのは sigOnPicked) */
export function sigNextPickSteps() {
  const s = sig();
  return s?.kind === "tetractys" ? tetractysSteps(s.picks + 1) : 1;
}

/** ピックを確定したとき (= スキップは数えない) */
export function sigOnPicked() {
  const s = sig();
  if (s?.kind === "tetractys") s.picks += 1;
}

/** 倒れる一撃を受けたとき (= hurt.js)。 幻の生存者なら 1 ステージに 1 度だけ耐えて true */
export function sigTryPhantom() {
  const s = sig();
  if (s?.kind !== "phantom" || s.phantomUsed) return false;
  s.phantomUsed = true;
  state.stats.hp = 1;
  state.battle.contactCooldownMs = PHANTOM.iframeMs;
  state.battle.player.phantomMs = PHANTOM.iframeMs;
  return true;
}

/** レベルアップのとき (= gems.js)。 クリプトスラッシュ: 周りの敵へ一撃 */
export function sigOnLevelUp(levels, hitEnemy) {
  const s = sig();
  if (s?.kind !== "cryptoSlash" || levels <= 0) return;
  const p = state.battle.player;
  const enemies = state.battle.enemies;
  const dmg = slashDmg(state.level);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (Math.hypot(e.x - p.x, e.y - p.y) <= SLASH.radius + (e.r ?? 0)) hitEnemy(i, dmg);
  }
  s.slashes.push({ x: p.x, y: p.y, age: 0, life: 0.35 });
}

/** 毎フレーム (= battle/index.js) */
export function tickSignature(dt, hitEnemy) {
  const s = sig();
  if (!s) return;
  const b = state.battle;
  const p = b.player;
  s.t += dt;
  if (s.boostS > 0) s.boostS = Math.max(0, s.boostS - dt);
  if (p.phantomMs > 0) p.phantomMs = Math.max(0, p.phantomMs - dt * 1000);
  for (const list of [s.slashes, s.bolts]) {
    for (let i = list.length - 1; i >= 0; i--) { list[i].age += dt; if (list[i].age >= list[i].life) list.splice(i, 1); }
  }

  if (s.kind === "poisonMist") {
    // 走った跡に霧を置く (= 止まっているあいだは置かない)
    if (p.moving) {
      s.mistAcc += dt;
      if (s.mistAcc >= MIST.everyS) {
        s.mistAcc = 0;
        s.clouds.push({ x: p.x, y: p.y, age: 0 });
        if (s.clouds.length > MIST.cap) s.clouds.shift();
      }
    }
    for (let i = s.clouds.length - 1; i >= 0; i--) { s.clouds[i].age += dt; if (s.clouds[i].age >= MIST.lifeS) s.clouds.splice(i, 1); }
    s.mistTickAcc += dt;
    if (s.mistTickAcc >= MIST.tickS && s.clouds.length) {
      s.mistTickAcc = 0;
      const dmg = mistDmg(state.level);
      // 1 回に 1 体 1 度だけ (= 霧が重なっても重ねて当てない)
      for (let i = b.enemies.length - 1; i >= 0; i--) {
        const e = b.enemies[i];
        if (e.isProp) continue;
        if (s.clouds.some((c) => Math.hypot(e.x - c.x, e.y - c.y) <= MIST.r + (e.r ?? 0))) hitEnemy(i, dmg);
      }
    }
  }

  if (s.kind === "teslaCoil" && s.t >= TESLA.everyS) {
    const targets = chainTargets(b.enemies, p.x, p.y);
    if (targets.length) {
      s.t = 0;
      const pts = [{ x: p.x, y: p.y }, ...targets.map((e) => ({ x: e.x, y: e.y }))];
      s.bolts.push({ pts, age: 0, life: TESLA.showS });
      const dmg = teslaDmg(state.level);
      for (const e of targets) {
        const i = b.enemies.indexOf(e);
        if (i >= 0) hitEnemy(i, dmg);
      }
    }
  }
}

function hpRatio() {
  const max = state.statsMax?.hp || 1;
  return (state.stats?.hp ?? max) / max;
}

/** 戦場に描く (= render.js。 敵の下) */
export function renderSignatureWorld(ctx, camera) {
  const s = sig();
  if (!s) return;
  for (const c of s.clouds) {
    const a = 1 - c.age / MIST.lifeS;
    ctx.globalAlpha = 0.28 * a;
    ctx.fillStyle = "#7be07b";
    ctx.beginPath();
    ctx.arc(c.x - camera.x, c.y - camera.y, MIST.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const sl of s.slashes) {
    const k = sl.age / sl.life;
    ctx.globalAlpha = 0.7 * (1 - k);
    ctx.strokeStyle = "#ffd56a";
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(sl.x - camera.x, sl.y - camera.y, SLASH.radius * (0.5 + 0.5 * k), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const bolt of s.bolts) {
    ctx.globalAlpha = 1 - bolt.age / bolt.life;
    ctx.strokeStyle = "#bfe6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    bolt.pts.forEach((pt, i) => {
      // 稲妻らしく少しぎざぎざに
      const x = pt.x - camera.x + (i && i < bolt.pts.length ? (Math.random() - 0.5) * 6 : 0);
      const y = pt.y - camera.y + (i ? (Math.random() - 0.5) * 6 : 0);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
