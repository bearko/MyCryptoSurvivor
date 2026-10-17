// ============================================================
// battle/enemies.js — 敵スポーン + 追跡 AI + 接触ダメージ
// (= SPEC-007 / SPEC-016 / SPEC-022 wave + boss / SPEC-030 stage 連動)
// ============================================================

import { state } from "../state.js";
import {
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPAWN_MARGIN_PX,
  ENEMY_COLOR,
  MAX_ENEMIES,
  STAGE_DURATION_MS,
  BOSS_SPAWN_AT_MS,
  BOSS_WARNING_LEAD_MS,
  WAVE_TABLE,
  ENEMY_SPECS,
  STAGE_TABLE,
  WORLD_W,
  WORLD_H,
  RARE_ENEMY_IDS,
  RARE_SPAWN_INTERVAL_MS,
  CHAR_SCALE,
  BOSS_CHAR_SCALE,
} from "../constants.js";
import { triggerStageEndOrTransition } from "./stage-transition.js";
import { hurtPlayer } from "./hurt.js";   // SPEC-090c
import { rareIntervalMs } from "../perks.js";   // SPEC-090c
import { fxBossIncoming, fxBossSpawned, fxBossCountdown, fxBurst } from "./fx.js";
import { startArena, BOSS_SPAWN_POS } from "./arena.js";
import { BOSS_MOVES, bossHoldsStill } from "./boss-moves.js";
import { getObstacleRects } from "./field.js";
import { resolveCircle, slideAlongWall } from "./field-geom.js";
import { tickShooter, nextFireMs } from "./enemy-shots.js";
import {
  floodMul, packAngles, separateEnemies, stageMaxEnemies, spawnBudget,
  densityTarget, screenDensity, densityShortfall, DENSITY_CHECK_MS, DENSITY_GAIN, DENSITY_MAX_PER_CHECK,
  isLeftBehind, canRecycle, recycleActive, RECYCLE_CHECK_MS, RECYCLE_MAX,
} from "./horde.js";

const DEFAULT_SPEC = { hp: 25, dmg: 10, speed: 80, radius: 12, xpValue: 1 };

function _currentStage() {
  return STAGE_TABLE[state.currentStageIdx] ?? STAGE_TABLE[0];
}

/**
 * SPEC-022: stageElapsedMs から該当 wave の pool を返す (= 配列)
 */
export function currentPool(elapsedMs) {
  let pool = WAVE_TABLE[0].pool;
  for (const w of WAVE_TABLE) {
    if (elapsedMs >= w.fromMs) pool = w.pool;
  }
  return pool;
}

/**
 * 1 frame 分: stage 経過更新 → 必要ならスポーン → ボス trigger →
 * 全敵がプレイヤーに 1 step 接近 → 接触判定 → クリア判定
 */
export function tickEnemies(dt, nowMs) {
  const b = state.battle;
  const dms = dt * 1000;
  b.stageElapsedMs += dms;

  const stage = _currentStage();

  // SPEC-022 / SPEC-030: ボス時刻到達で 1 度だけスポーン (= ボス id はステージ別)
  // SPEC-045: 出る前に予告 (= SPEC-071 で 10 秒前。 1 ステージ 1 回。 fx 側で 2 回目を弾く)
  if (!b.bossSpawned && b.stageElapsedMs >= BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS) {
    fxBossIncoming();
    // SPEC-061: 出るまでの残りを数える (= ゲームの中の時間)
    fxBossCountdown(BOSS_SPAWN_AT_MS - b.stageElapsedMs, BOSS_WARNING_LEAD_MS);
  }
  if (!b.bossSpawned && b.stageElapsedMs >= BOSS_SPAWN_AT_MS) {
    clearForBoss();   // SPEC-079: ほかの敵は消え (= CE は落とさない)、 枠が閉じはじめる
    spawnEnemyAtRing(stage.bossEnemyId);
    b.bossSpawned = true;
    fxBossSpawned();
  }

  // SPEC-022 / SPEC-030: 5 分経過 or ボス撃破で **ステージ終了** (= 次ステージ or 全クリア)
  if (!b.gameOver && (b.bossDefeated || b.stageElapsedMs >= STAGE_DURATION_MS)) {
    triggerStageEndOrTransition();
    return;
  }

  // 通常 spawn (= wave pool からランダム、 ステージごと spawn 間隔 mul)
  // SPEC-037: ABSOLUTE の spawnMul で出現密度をスケール (= mul=2 → 2 倍出る → interval を 1/2 に)
  const absSpawnMul = state.absolute?.spawnMul ?? 1;
  const cap = stageMaxEnemies(stage);   // SPEC-065 / SPEC-078: ステージごと (= 320 / 440 / 600)
  // SPEC-065: 大群のステージは、 中盤から湧きが速まる
  const spawnInterval = ENEMY_SPAWN_INTERVAL_MS * (stage.spawnIntervalMul ?? 1)
    / Math.max(0.1, absSpawnMul) / floodMul(stage.flood, b.stageElapsedMs);
  // SPEC-078: 経った時間ぶん湧かせる (= 1 コマに何体でも。 湧きを大きく速めても上限で止まる)
  // SPEC-079: ボス戦のあいだは湧かない
  const bud = spawnBudget(b.spawnAcc, dms, spawnInterval, b.bossSpawned ? 0 : cap - b.enemies.length);
  b.spawnAcc = bud.acc;
  if (bud.n > 0) {
    const pool = currentPool(b.stageElapsedMs);
    for (let k = 0; k < bud.n; k++) spawnEnemyAtRing(pool[Math.floor(Math.random() * pool.length)]);
    b.lastEnemySpawnMs = nowMs;
  }

  // SPEC-078: 画面の敵の密度を、 時刻ごとの目標まで足す (= 強い武器でどんどん倒しても、 ボスの直前は画面が敵で埋まる)
  const dn = b.bossSpawned ? null : stage.density;   // SPEC-079: ボス戦のあいだは足さない・寄せ直さない
  if (dn && b.enemies.length < cap) {
    b.densityCheckMs = (b.densityCheckMs ?? 0) - dms;
    if (b.densityCheckMs <= 0) {
      b.densityCheckMs = DENSITY_CHECK_MS;
      const vw = b.viewport.w, vh = b.viewport.h;
      const short = densityShortfall(densityTarget(dn, b.stageElapsedMs), screenDensity(b.enemies, b.camera.x, b.camera.y, vw, vh), vw, vh);
      const n = Math.min(Math.ceil(short * DENSITY_GAIN), DENSITY_MAX_PER_CHECK, cap - b.enemies.length);
      if (n > 0) {
        const pool = currentPool(b.stageElapsedMs);
        for (let k = 0; k < n; k++) spawnEnemyAtRing(pool[Math.floor(Math.random() * pool.length)]);
      }
    }
  }

  // SPEC-078: 置いていかれた敵 (= 自分が走り去って、 画面から遠く離れた敵) を、 画面のすぐ外へ寄せ直す。
  //   上限まで湧いた敵の多くが画面の外に残ると、 画面が埋まらないため。 HP はそのまま (= 撃破にも数えない)
  //   SPEC-084: ボスの前 (= 密度の目標が上がりきるころ) だけ。 序盤は逃げ回れば敵を置いていける
  if (recycleActive(dn, b.stageElapsedMs)) {
    b.recycleCheckMs = (b.recycleCheckMs ?? 0) - dms;
    if (b.recycleCheckMs <= 0) {
      b.recycleCheckMs = RECYCLE_CHECK_MS;
      const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
      const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
      let moved = 0;
      for (const e of b.enemies) {
        if (moved >= RECYCLE_MAX) break;
        if (!canRecycle(e) || !isLeftBehind(e.x - b.player.x, e.y - b.player.y, halfW, halfH)) continue;
        const p = _ringPoint(e.r, halfW, halfH);
        e.x = p.x; e.y = p.y;
        moved++;
      }
    }
  }

  // SPEC-065: 群れ (= 1 方向から、 まとまって押し寄せる)
  const fl = stage.flood;
  if (fl && !b.bossSpawned && b.stageElapsedMs >= Math.max(fl.packFromMs, b.nextPackMs ?? 0)) {
    b.nextPackMs = b.stageElapsedMs + fl.packEveryMs;
    const pool = currentPool(b.stageElapsedMs);
    const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
    const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
    const n = Math.round(fl.packSize * absSpawnMul);
    for (const a of packAngles(n, Math.random() * Math.PI * 2)) {
      if (b.enemies.length >= cap) break;
      const out = 1 + Math.random() * 0.25;   // 少し前後にずらして、 塊にする
      spawnEnemyAtRing(pool[Math.floor(Math.random() * pool.length)],
        { x: b.player.x + Math.cos(a) * halfW * out, y: b.player.y + Math.sin(a) * halfH * out });
    }
  }

  // SPEC-033: レアエネミーを 1 分に 1 回スポーン (= 全ステージ共通。 SPEC-079 でボス戦のあいだは出さない)
  if (!b.bossSpawned && b.enemies.length < cap &&
      b.stageElapsedMs >= rareIntervalMs() &&
      nowMs - b.lastRareSpawnMs >= rareIntervalMs()) {
    const rid = RARE_ENEMY_IDS[Math.floor(Math.random() * RARE_ENEMY_IDS.length)];
    spawnEnemyAtRing(rid);
    b.lastRareSpawnMs = nowMs;
  }

  // SPEC-062: 撃ってくる敵 (= ステージごとに、 決まった時刻から一定の間隔で。 同時に出ている数に上限)
  const sh = stage.shooters;
  if (sh && !b.bossSpawned && b.stageElapsedMs >= sh.fromMs && b.enemies.length < cap &&
      nowMs - (b.lastShooterSpawnMs ?? 0) >= sh.everyMs / Math.max(0.1, absSpawnMul)) {
    let alive = 0;
    for (const e of b.enemies) if (e.behavior === "shooter") alive++;
    if (alive < sh.max) spawnEnemyAtRing(sh.ids[Math.floor(Math.random() * sh.ids.length)]);
    b.lastShooterSpawnMs = nowMs;
  }

  const px = b.player.x;
  const py = b.player.y;
  const rects = getObstacleRects();   // SPEC-053: 建物

  for (const e of b.enemies) {
    if (e.isProp || e.behavior === "trojan") continue;   // SPEC-053: 壺・宝箱 / SPEC-064: 木馬は動かず、 ぶつかっても痛くない
    if ((e.hitFreezeMs ?? 0) > 0) {
      e.hitFreezeMs -= dms;
      if (e.hitFreezeMs < 0) e.hitFreezeMs = 0;
    }

    const dx = px - e.x;
    const dy = py - e.y;
    const d  = Math.hypot(dx, dy) || 1;
    if (e.behavior === "shooter") {
      tickShooter(e, dt, px, py);   // SPEC-062: 距離を保って撃つ (= まっすぐ追わない)
    } else if (e.isBoss && bossHoldsStill(e)) {
      // SPEC-080: 型の最中 (= 予備動作・突進・立て直し) は boss-moves.js が動かす
    } else if ((e.hitFreezeMs ?? 0) <= 0) {
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      // SPEC-053: 建物にめりこんだら押し出し、 壁に沿ってプレイヤーへ回りこむ
      if (rects.length) {
        let res = resolveCircle(e.x, e.y, e.r, rects);
        if (res.hit) {
          const s = slideAlongWall(res.nx, res.ny, px - res.x, py - res.y);
          res = resolveCircle(res.x + s.x * e.speed * dt, res.y + s.y * e.speed * dt, e.r, rects);
          e.x = res.x; e.y = res.y;
        }
      }
    }

    if (b.contactCooldownMs <= 0 && d < e.r + b.player.r) {
      hurtPlayer(e.dmg, { boss: !!e.isBoss });   // SPEC-090c: 被弾は 1 か所 (= hurt.js)。 ボスなら大きく揺らす
    }
  }
}

/**
 * SPEC-079: ボスが出るとき、 ほかの敵を消し (= 撃破にも数えず、 CE も落とさない。 落ちている CE は残る)、 枠を閉じはじめる。
 * 壺・宝箱は残す (= 枠の中へ寄る)。 敵の弾も消す。 画面の中の敵は煙のように消える
 */
export function clearForBoss() {
  const b = state.battle;
  const cam = b.camera, vw = b.viewport.w, vh = b.viewport.h;
  let puffs = 0;
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e = b.enemies[i];
    if (e.isProp || e.isBoss) continue;
    const sx = e.x - cam.x, sy = e.y - cam.y;
    if (puffs < 160 && sx > -e.r && sx < vw + e.r && sy > -e.r && sy < vh + e.r) { fxBurst(e.x, e.y, "#cfc8e6", 3, 90); puffs++; }
    b.enemies.splice(i, 1);
  }
  if (b.enemyShots) b.enemyShots.length = 0;
  startArena();
}

/** SPEC-065: 敵どうしを押し分ける (= tickEnemies の最後に呼ぶ) */
export function tickSeparation() {
  separateEnemies(state.battle.enemies);
}

/** SPEC-078: 湧く輪の上のでたらめな 1 点 (= 世界の縁で止める) */
function _ringPoint(r, halfW, halfH) {
  const b = state.battle;
  const a = Math.random() * Math.PI * 2;
  const HW = WORLD_W / 2 - r, HH = WORLD_H / 2 - r;
  return {
    x: Math.max(-HW, Math.min(HW, b.player.x + Math.cos(a) * halfW)),
    y: Math.max(-HH, Math.min(HH, b.player.y + Math.sin(a) * halfH)),
  };
}

/**
 * SPEC-022 / SPEC-030: enemyId 指定でスポーン。 雑魚はステージ mul を hp/dmg/xp に適用、
 * ボス (= 任意 isBoss) は ENEMY_SPECS の絶対値 + ステージ別の bossAttack を持たせる。
 */
export function spawnEnemyAtRing(enemyId = 101, at = null) {
  const b = state.battle;
  const stage = _currentStage();
  const spec = ENEMY_SPECS[enemyId] ?? DEFAULT_SPEC;
  const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
  const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
  const isBoss = enemyId === stage.bossEnemyId;

  let x, y;
  if (at) {
    // SPEC-064: 決まった場所から (= トロイの木馬が開いたとき)
    x = at.x;
    y = at.y;
  } else if (isBoss) {
    // SPEC-079: ステージの真ん中 (= ボス戦の枠の中心。 予告のあいだ赤い丸で示す)
    x = BOSS_SPAWN_POS.x;
    y = BOSS_SPAWN_POS.y;
  } else {
    const angle = Math.random() * Math.PI * 2;
    x = b.player.x + Math.cos(angle) * halfW;
    y = b.player.y + Math.sin(angle) * halfH;
  }
  // SPEC-026: 世界端でクランプ (= 半径分だけ内側に収める)
  // SPEC-077: キャラを大きく (= 絵も当たりも。 ボスはもともと大きいので控えめに)
  const r = Math.round(spec.radius * (isBoss ? BOSS_CHAR_SCALE : CHAR_SCALE));
  const HW = WORLD_W / 2 - r;
  const HH = WORLD_H / 2 - r;
  if (x < -HW) x = -HW;
  if (x >  HW) x =  HW;
  if (y < -HH) y = -HH;
  if (y >  HH) y =  HH;

  // SPEC-030: 雑魚はステージ mul で強化、 ボス は絶対値 (= ENEMY_SPECS そのまま)
  // SPEC-037: ABSOLUTE 倍率 (= 雑魚のみ) を更に乗算。 ボスは規定通り
  const absHp    = isBoss ? 1 : (state.absolute?.hpMul    ?? 1);
  const absDmg   = isBoss ? 1 : (state.absolute?.dmgMul   ?? 1);
  const absSpeed = isBoss ? 1 : (state.absolute?.speedMul ?? 1);
  const hpMul  = isBoss ? 1 : (stage.enemyHpMul  ?? 1) * absHp;
  const dmgMul = isBoss ? 1 : (stage.enemyDmgMul ?? 1) * absDmg;
  const xpMul  = isBoss ? 1 : (stage.xpMul       ?? 1);

  // SPEC-080: ボスは型を増やしたぶん HP も増やす (= BOSS_MOVES の hpMul)
  const hp     = Math.max(1, Math.round(spec.hp  * hpMul * (isBoss ? (BOSS_MOVES[enemyId]?.hpMul ?? 1) : 1)));
  const dmg    = Math.max(1, Math.round(spec.dmg * dmgMul));
  const xpVal  = Math.max(1, Math.round((spec.xpValue ?? 1) * xpMul));
  const speed  = Math.max(10, spec.speed * absSpeed);

  b.enemies.push({
    id: b.nextEntityId++,
    enemyId,
    x, y,
    r,
    hp, hpMax: hp,
    dmg,
    speed,
    color: ENEMY_COLOR,
    hitFreezeMs: 0,
    isBoss,
    isRare: !!spec.isRare,                                          // SPEC-033: drop magic card on death
    xpValue: xpVal,
    bossAttack: isBoss ? (stage.bossAttack ?? null) : null,        // SPEC-030
    bossAttackExtId: isBoss ? (stage.bossAttackExtId ?? null) : null,
    // SPEC-062: 撃ってくる敵 (= 最初の 1 発は少しずらす。 回る向きは 1 体ずつ違う)
    behavior: spec.behavior ?? null,
    shot: spec.shot ?? null,
    shotDmg: spec.shot ? Math.max(1, Math.round(spec.shot.dmg * dmgMul)) : 0,
    fireCdMs: spec.shot ? nextFireMs(spec.shot.everyMs * 0.6) : 0,
    aiming: false,
    aimAngle: 0,
    strafeDir: Math.random() < 0.5 ? -1 : 1,
  });
}
