// ============================================================
// battle/field.js — 建物・壺・宝箱・お助けアイテム (= SPEC-053)
// ============================================================
//
// - 建物: ステージごとに決まった場所の四角。 自分・敵・弾を止める (= 当たりの計算は field-geom.js)
// - 壺・宝箱: state.battle.enemies に isProp で入れる (= どの武器でも壊せる)。 動かず、 ぶつかっても痛くない。
//   撃破数・経験値には数えず、 壊すとお助けアイテムか CE を落とす
// - お助けアイテム: state.battle.items。 拾うとすぐ効く (= 棒磁石・パンケーキ・懐中時計 (RTA だけ。 SPEC-054))
// 時刻はステージのゲーム内時間 (= stageElapsedMs) で数える。 一時停止中は進まない。

import { state } from "../state.js";
import {
  OBSTACLE_HITBOX_RATIO, WORLD_W, WORLD_H,
  POT_RADIUS, POT_HP, POT_INITIAL, POT_MAX_ON_FIELD, POT_RESPAWN_MS, POT_CE_GEMS, POT_DROPS,
  CHEST_RADIUS, CHEST_HP, CHEST_TIMES_MS, CHEST_CE_GEMS, CHEST_DROPS, CHEST_DROPS_RTA, WATCH_DURATION_MS,
  ITEM_RADIUS, ITEM_PICKUP_RADIUS, HEAL_RATIO, THUNDER_BOSS_RATIO,
  STAGE_TABLE, SFX, BOSS_CHEST, BOSS_CHEST_DROPS, BGM_ROBOT,
} from "../constants.js";
// SPEC-090c: スキルツリーで変わる定数は、 定数の代わりにここを呼ぶ
import { sigHealMul } from "./signature.js";   // SPEC-100
import { canHeal } from "./missions.js";   // SPEC-112
import { chestTimesMs, bossChestCfg, bossChestDrops, potMaxOnField, potDrops, itemPickupMul, healRatio, thunderBossRatio, chestDropsFor, robotSec } from "../perks.js";
import { startBgm, currentBgmPath } from "../audio.js";
import { ARENA } from "./arena.js";
import { spawnMagicCard } from "./magic-cards.js";
import { obstacleRect, rollTable, pickSpawnPoint, inView } from "./field-geom.js";
import { spawnGem } from "./gems.js";
import { naviTipOnce } from "../navi-tips.js";
import { pushDamageNumber, hitEnemy } from "./damage.js";
import { fxBurst, fxThunder } from "./fx.js";
import { playSe } from "../audio.js";
import { reportChestOpened } from "../platform.js";   // SPEC-096

function _stage() {
  return STAGE_TABLE[state.currentStageIdx ?? 0] ?? STAGE_TABLE[0];
}

/** 建物の当たりの四角 (= 毎フレーム使うので startBattle で作っておく) */
export function getObstacleRects() {
  return state.battle.obstacleRects ?? [];
}

/** ステージの始まり: 建物を置き、 アイテムを片付け、 壺を最初の数だけ置く */
export function resetField() {
  const b = state.battle;
  const obs = _stage().obstacles ?? [];
  b.obstacles = obs.map((o) => ({ ...o }));
  b.obstacleRects = obs.map((o) => obstacleRect(o, OBSTACLE_HITBOX_RATIO));
  b.items = b.items ?? [];
  b.items.length = 0;
  b.nextChestIdx = 0;
  b.bossChestAtMs = null;   // SPEC-081
  b.robotMs = 0;   // SPEC-140 (= BGM は startBattle が戻す)
  b.robotPrevBgm = null;
  b.nextPotAtMs = POT_RESPAWN_MS;
  for (let i = 0; i < POT_INITIAL; i++) _spawnProp("pot", 200, 600);
}

/** 1 frame: 壺・宝箱を時刻どおりに出し、 アイテムを拾う */
export function tickField(_dt) {
  const b = state.battle;
  const t = b.stageElapsedMs ?? 0;
  // 宝箱 (= 1 ステージ 4 つ、 決まった時刻)
  while ((b.nextChestIdx ?? 0) < chestTimesMs().length && t >= chestTimesMs()[b.nextChestIdx]) {
    b.nextChestIdx += 1;
    _spawnProp("chest", 220, 420);
  }
  // SPEC-081: ボス戦の宝箱 (= 枠の中に、 ボスが出て少ししてから一定の間隔で)
  if (b.bossSpawned && !b.bossDefeated && b.arena) {
    if (b.bossChestAtMs == null) b.bossChestAtMs = t + bossChestCfg().firstMs;
    if (t >= b.bossChestAtMs) {
      b.bossChestAtMs = t + bossChestCfg().everyMs;
      const n = b.enemies.reduce((k, e) => k + (e.bossChest ? 1 : 0), 0);
      if (n < BOSS_CHEST.maxOnField) _spawnBossChest();
    }
  }
  // 壺 (= 一定の間隔で、 場にある数が上限より少なければ 1 つ足す)
  if (t >= (b.nextPotAtMs ?? POT_RESPAWN_MS)) {
    b.nextPotAtMs = t + POT_RESPAWN_MS;
    const pots = b.enemies.reduce((n, e) => n + (e.propKind === "pot" ? 1 : 0), 0);
    if (pots < potMaxOnField()) _spawnProp("pot", 250, 700);
  }
  _pickupItems();
}

/** SPEC-081: ボス戦の宝箱 (= 枠の中、 自分から少し離れ、 ボスに重ならないところ) */
function _spawnBossChest() {
  const b = state.battle;
  const boss = b.enemies.find((e) => e.isBoss);
  for (let i = 0; i < 6; i++) {
    const at = pickSpawnPoint({
      rnd: Math.random, px: b.player.x, py: b.player.y, minD: BOSS_CHEST.minD, maxD: BOSS_CHEST.maxD,
      halfW: ARENA.halfW, halfH: ARENA.halfH, rects: getObstacleRects(), r: CHEST_RADIUS,
    });
    if (!at) continue;
    if (boss && Math.hypot(at.x - boss.x, at.y - boss.y) < boss.r + CHEST_RADIUS + 60) continue;
    _pushProp("chest", at, { bossChest: true });
    naviTipOnce("item.bossChest");   // SPEC-081: 初めてのときだけ、 マインちゃんがひとこと
    return;
  }
}

function _spawnProp(kind, minD, maxD) {
  const b = state.battle;
  const r = kind === "chest" ? CHEST_RADIUS : POT_RADIUS;
  const at = pickSpawnPoint({
    rnd: Math.random, px: b.player.x, py: b.player.y, minD, maxD,
    halfW: WORLD_W / 2, halfH: WORLD_H / 2, rects: getObstacleRects(), r,
  });
  if (!at) return;
  _pushProp(kind, at);
}

function _pushProp(kind, at, extra = {}) {
  const b = state.battle;
  const r = kind === "chest" ? CHEST_RADIUS : POT_RADIUS;
  const hp = kind === "chest" ? Math.round(CHEST_HP * (_stage().enemyHpMul ?? 1)) : POT_HP;
  b.enemies.push({
    id: b.nextEntityId++,
    enemyId: null,
    isProp: true,
    propKind: kind,
    x: at.x, y: at.y, r,
    hp, hpMax: hp,
    dmg: 0, speed: 0,
    color: kind === "chest" ? "#f0c14b" : "#7fb3ff",
    hitFreezeMs: 0,
    isBoss: false, isRare: false,
    xpValue: 0,
    ...extra,
  });
}

/** 壺・宝箱を壊したとき (= damage.js の hitEnemy から)。 何を落とすかは抽選 */
export function dropFromProp(e) {
  // SPEC-057: 開けた・割れた手ごたえ (= 宝箱は金の粒と OPEN!)
  if (e.propKind === "chest") {
    fxBurst(e.x, e.y, "#f0c14b", 22, 220);
    pushDamageNumber(e.x, e.y - e.r - 6, "OPEN!", "#ffe39a", "lg");
    reportChestOpened();   // SPEC-096: 宝箱を初めて開ける (= 共通基盤のアチーブメント。 同じ起動で 1 度だけ送る)
  } else {
    fxBurst(e.x, e.y, "#7fb3ff", 8, 130);
  }
  const xpMul = _stage().xpMul ?? 1;
  const gem = Math.max(1, Math.round(xpMul));
  if (e.propKind === "chest") {
    // SPEC-081: ボス戦の宝箱は、 マジックカード (= その場でレベルアップ) も出る
    const kind = rollTable(e.bossChest ? bossChestDrops() : chestDrops(), Math.random());
    if (kind === "card") spawnMagicCard(e.x, e.y);
    else spawnItem(kind, e.x, e.y);
    _scatterGems(e.x, e.y, CHEST_CE_GEMS, gem);
    return;
  }
  const kind = rollTable(potDrops(), Math.random());
  if (kind === "ce") _scatterGems(e.x, e.y, POT_CE_GEMS, gem);
  else spawnItem(kind, e.x, e.y);
}

/** 宝箱から出るもの (= SPEC-054: RTA のときだけ懐中時計も出る) */
export function chestDrops() {
  return state.rtaMode ? CHEST_DROPS_RTA : (chestDropsFor(false) ?? CHEST_DROPS);   // SPEC-140: 合体ロボ
}

function _scatterGems(x, y, n, value) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    spawnGem(x + Math.cos(a) * 14, y + Math.sin(a) * 14, value);
  }
}

export function spawnItem(kind, x, y) {
  if (!kind) return;
  const b = state.battle;
  b.items.push({ id: b.nextEntityId++, kind, x, y, r: ITEM_RADIUS });
}

function _pickupItems() {
  const b = state.battle;
  if (!b.items || b.items.length === 0) return;
  const pickupR = ITEM_PICKUP_RADIUS * (state.buffs?.pickupMul ?? 1) * itemPickupMul();
  const r2 = pickupR * pickupR;
  for (let i = b.items.length - 1; i >= 0; i--) {
    const it = b.items[i];
    const dx = it.x - b.player.x, dy = it.y - b.player.y;
    if (dx * dx + dy * dy > r2) continue;
    b.items.splice(i, 1);
    applyItem(it.kind);
  }
}

/** HP を最大 HP の ratio だけ戻す (= パンケーキ・SPEC-125 のミッションのごほうび) */
export function healBy(ratio) {
  const b = state.battle;
  if (!canHeal()) {   // SPEC-112: 不老不死の探求 (= 拾っても戻らない)
    pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, "×", "#9a9aa8", "lg");
    return 0;
  }
  const max = state.statsMax.hp;
  const before = state.stats.hp;
  state.stats.hp = Math.min(max, before + Math.round(max * ratio));
  const healed = Math.round(state.stats.hp - before);
  if (healed > 0) pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, `+${healed}`, "#7ee08a", "lg");
  fxBurst(b.player.x, b.player.y, "#7ee08a", 12, 120);
  playSe(SFX.PICK_HEAL, 120, 0.5);
  return healed;
}

/** アイテムの効果 */
export function applyItem(kind) {
  const b = state.battle;
  if (kind === "heal") {
    healBy(healRatio() * sigHealMul());   // SPEC-100: 宮廷医女は倍
  } else if (kind === "watch") {
    // SPEC-054: 実時間 10 秒、 ゲーム全体が 2 倍速 (= index.js の _loop が 1 コマで 2 回進める)。 続けて拾うと延びる
    b.fastForwardMs = (b.fastForwardMs ?? 0) + WATCH_DURATION_MS;
    pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, "×2 SPEED!", "#ffe39a", "lg");
    fxBurst(b.player.x, b.player.y, "#ffe39a", 16, 180);
    playSe(SFX.PICK_BUFF, 120, 0.6);
  } else if (kind === "robot") {
    robotOn(robotSec());   // SPEC-140
  } else if (kind === "thunder") {
    thunderStrike();   // SPEC-063
  } else if (kind === "magnet") {
    // 落ちている CE を全部吸い寄せる (= gems.js が毎フレーム近づける)
    for (const g of b.gems) g.magnet = true;
    pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, "MAGNET!", "#9fe3ff", "lg");
    fxBurst(b.player.x, b.player.y, "#56ccf2", 14, 200);
    playSe(SFX.GEM_PICKUP, 80, 0.6);
  }
  naviTipOnce(`item.${kind}`);   // SPEC-068: 初めて拾ったときだけ、 マインちゃんがひとこと
}

/**
 * SPEC-140: 合体ロボ — sec 秒の無敵 (= 被弾のあとの無敵と同じしくみ)。 そのあいだ虹色に光り、 BGM が変わる。
 * 続けて拾うと長いほうに延びる。 時間はステージのゲーム内時間 (= 止まっているあいだは減らない)
 */
export function robotOn(sec) {
  const b = state.battle;
  const ms = Math.max(0, sec) * 1000;
  if (!((b.robotMs ?? 0) > 0)) {
    b.robotPrevBgm = currentBgmPath();
    startBgm(BGM_ROBOT, 0.32);
  }
  b.robotMs = Math.max(b.robotMs ?? 0, ms);
  b.contactCooldownMs = Math.max(b.contactCooldownMs ?? 0, ms);
  pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, "INVINCIBLE!", "#ffd6ff", "lg");
  fxBurst(b.player.x, b.player.y, "#ff9bf5", 18, 220);
  playSe(SFX.PICK_BUFF, 120, 0.6);
}

/** SPEC-140: 毎フレーム (= battle/index.js)。 切れたら BGM を戻す */
export function tickRobot(dt) {
  const b = state.battle;
  if (!((b.robotMs ?? 0) > 0)) return;
  b.robotMs = Math.max(0, b.robotMs - dt * 1000);
  if (b.robotMs > 0) return;
  const prev = b.robotPrevBgm;
  b.robotPrevBgm = null;
  if (prev && b.active && !b.gameOver && currentBgmPath() === BGM_ROBOT) startBgm(prev, 0.32);
}

/**
 * SPEC-063: 雷鼓 — 画面に映っている敵すべてに雷が落ちる。
 * 雑魚は倒れる (= 撃破数・経験値はふつうに倒したときと同じ)。 ボスは最大 HP の 20%。 壺・宝箱は壊さない。
 * 画面の中の敵の弾 (= 撃ってくる敵・ボス) も消える。 戻り値: 雷を落とした数
 */
export function thunderStrike() {
  const b = state.battle;
  const vw = b.viewport.w, vh = b.viewport.h;
  const px = b.player.x, py = b.player.y;
  const bolts = [];
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e = b.enemies[i];
    if (e.isProp || !inView(e.x - px, e.y - py, vw, vh, e.r)) continue;
    bolts.push({ x: e.x, y: e.y, seed: Math.random() });
    hitEnemy(i, e.isBoss ? Math.round(e.hpMax * thunderBossRatio()) : e.hp);
  }
  for (const arr of [b.enemyShots, b.bossProjectiles]) {
    if (!arr) continue;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (inView(arr[i].x - px, arr[i].y - py, vw, vh, 0)) arr.splice(i, 1);
    }
  }
  fxThunder(bolts);
  pushDamageNumber(px, py - b.player.r - 4, "THUNDER!", "#fff3a0", "lg");
  playSe(SFX.THUNDER, 120, 0.7);
  return bolts.length;
}
