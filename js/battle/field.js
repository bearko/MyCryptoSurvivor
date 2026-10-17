// ============================================================
// battle/field.js — 建物・壺・宝箱・お助けアイテム (= SPEC-053)
// ============================================================
//
// - 建物: ステージごとに決まった場所の四角。 自分・敵・弾を止める (= 当たりの計算は field-geom.js)
// - 壺・宝箱: state.battle.enemies に isProp で入れる (= どの武器でも壊せる)。 動かず、 ぶつかっても痛くない。
//   撃破数・経験値には数えず、 壊すとお助けアイテムか CE を落とす
// - お助けアイテム: state.battle.items。 拾うとすぐ効く (= 棒磁石・パンケーキ。 懐中時計は SPEC-054)
// 時刻はステージのゲーム内時間 (= stageElapsedMs) で数える。 一時停止中は進まない。

import { state } from "../state.js";
import {
  OBSTACLE_HITBOX_RATIO, WORLD_W, WORLD_H,
  POT_RADIUS, POT_HP, POT_INITIAL, POT_MAX_ON_FIELD, POT_RESPAWN_MS, POT_CE_GEMS, POT_DROPS,
  CHEST_RADIUS, CHEST_HP, CHEST_TIMES_MS, CHEST_CE_GEMS, CHEST_DROPS,
  ITEM_RADIUS, ITEM_PICKUP_RADIUS, HEAL_RATIO,
  STAGE_TABLE, SFX,
} from "../constants.js";
import { obstacleRect, rollTable, pickSpawnPoint } from "./field-geom.js";
import { spawnGem } from "./gems.js";
import { pushDamageNumber } from "./damage.js";
import { playSe } from "../audio.js";

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
  b.nextPotAtMs = POT_RESPAWN_MS;
  for (let i = 0; i < POT_INITIAL; i++) _spawnProp("pot", 200, 600);
}

/** 1 frame: 壺・宝箱を時刻どおりに出し、 アイテムを拾う */
export function tickField(_dt) {
  const b = state.battle;
  const t = b.stageElapsedMs ?? 0;
  // 宝箱 (= 1 ステージ 4 つ、 決まった時刻)
  while ((b.nextChestIdx ?? 0) < CHEST_TIMES_MS.length && t >= CHEST_TIMES_MS[b.nextChestIdx]) {
    b.nextChestIdx += 1;
    _spawnProp("chest", 220, 420);
  }
  // 壺 (= 一定の間隔で、 場にある数が上限より少なければ 1 つ足す)
  if (t >= (b.nextPotAtMs ?? POT_RESPAWN_MS)) {
    b.nextPotAtMs = t + POT_RESPAWN_MS;
    const pots = b.enemies.reduce((n, e) => n + (e.propKind === "pot" ? 1 : 0), 0);
    if (pots < POT_MAX_ON_FIELD) _spawnProp("pot", 250, 700);
  }
  _pickupItems();
}

function _spawnProp(kind, minD, maxD) {
  const b = state.battle;
  const r = kind === "chest" ? CHEST_RADIUS : POT_RADIUS;
  const at = pickSpawnPoint({
    rnd: Math.random, px: b.player.x, py: b.player.y, minD, maxD,
    halfW: WORLD_W / 2, halfH: WORLD_H / 2, rects: getObstacleRects(), r,
  });
  if (!at) return;
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
  });
}

/** 壺・宝箱を壊したとき (= damage.js の hitEnemy から)。 何を落とすかは抽選 */
export function dropFromProp(e) {
  const xpMul = _stage().xpMul ?? 1;
  const gem = Math.max(1, Math.round(xpMul));
  if (e.propKind === "chest") {
    spawnItem(rollTable(chestDrops(), Math.random()), e.x, e.y);
    _scatterGems(e.x, e.y, CHEST_CE_GEMS, gem);
    return;
  }
  const kind = rollTable(POT_DROPS, Math.random());
  if (kind === "ce") _scatterGems(e.x, e.y, POT_CE_GEMS, gem);
  else spawnItem(kind, e.x, e.y);
}

/** 宝箱から出るもの (= SPEC-054 で RTA のときに懐中時計を足す) */
export function chestDrops() {
  return CHEST_DROPS;
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
  const pickupR = ITEM_PICKUP_RADIUS * (state.buffs?.pickupMul ?? 1);
  const r2 = pickupR * pickupR;
  for (let i = b.items.length - 1; i >= 0; i--) {
    const it = b.items[i];
    const dx = it.x - b.player.x, dy = it.y - b.player.y;
    if (dx * dx + dy * dy > r2) continue;
    b.items.splice(i, 1);
    applyItem(it.kind);
  }
}

/** アイテムの効果 */
export function applyItem(kind) {
  const b = state.battle;
  if (kind === "heal") {
    const max = state.statsMax.hp;
    const before = state.stats.hp;
    state.stats.hp = Math.min(max, before + Math.round(max * HEAL_RATIO));
    const healed = Math.round(state.stats.hp - before);
    if (healed > 0) pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, `+${healed}`, "#7ee08a");
    playSe(SFX.PICK_HEAL, 120, 0.5);
  } else if (kind === "magnet") {
    // 落ちている CE を全部吸い寄せる (= gems.js が毎フレーム近づける)
    for (const g of b.gems) g.magnet = true;
    playSe(SFX.GEM_PICKUP, 80, 0.6);
  }
}
