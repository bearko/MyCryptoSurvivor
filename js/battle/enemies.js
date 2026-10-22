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
import { runThreatTier, rollVariant, applyVariant, crossLine, crossedOut, CROSS, VARIANTS } from "./threat.js";   // SPEC-107
import { enemyNameOf } from "./enemy-name.js";   // SPEC-148
import { showThreatNotice } from "./milestones.js";   // SPEC-107
import { missionMods } from "./missions.js";   // SPEC-112
import { isEasy, easyStage, bossSpawnAtMs, bossWarnLeadMs } from "../easy.js";   // SPEC-147
import { storyAllows } from "../story.js";   // SPEC-165
import { storyHoldsSpawn } from "./story-battle.js";   // SPEC-165
import { shadowMods } from "./shadow.js";   // SPEC-165: シャドーのオーラ
import { showLesson } from "../lesson.js";   // SPEC-147
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
  // SPEC-147: EASY は短い (= bossSpawnAtMs / bossWarnLeadMs が定数の代わり)
  const bossAt = bossSpawnAtMs(), warnLead = bossWarnLeadMs();
  if (!b.bossSpawned && b.stageElapsedMs >= bossAt - warnLead) {
    // SPEC-153: マインちゃんの警告 (= index.js が置く)。 SPEC-154: この if は毎コマ通るので、 新しく予告したときだけ (= 毎コマ呼ぶと吹き出しが空のまま止まっていた)
    if (fxBossIncoming()) _bossIncomingHook?.();
    if (b.fx?.bossWarned && !b._storyWarnSaid) { b._storyWarnSaid = true; b.story?.events?.push("bossWarn"); }   // SPEC-165: 予告の一言 (= 1 度だけ)
    // SPEC-061: 出るまでの残りを数える (= ゲームの中の時間)
    fxBossCountdown(bossAt - b.stageElapsedMs, warnLead);
  }
  if (!b.bossSpawned && b.stageElapsedMs >= bossAt) {
    clearForBoss();   // SPEC-079: ほかの敵は消え (= CE は落とさない)、 枠が閉じはじめる
    spawnEnemyAtRing(easyStage()?.bossId ?? stage.bossEnemyId);   // SPEC-165: ストーリーはレシピのボス
    b.bossSpawned = true;
    fxBossSpawned();
  }

  // SPEC-022 / SPEC-030: 5 分経過 or ボス撃破で **ステージ終了** (= 次ステージ or 全クリア)
  if (!b.gameOver && !b.bossChestOpen && (b.bossDefeated || b.stageElapsedMs >= STAGE_DURATION_MS)) {   // SPEC-153: 宝箱を開けるまで待つ
    triggerStageEndOrTransition();
    return;
  }

  // 通常 spawn (= wave pool からランダム、 ステージごと spawn 間隔 mul)
  // SPEC-037: ABSOLUTE の spawnMul で出現密度をスケール (= mul=2 → 2 倍出る → interval を 1/2 に)
  const absSpawnMul = state.absolute?.spawnMul ?? 1;
  // SPEC-065: 大群のステージは、 中盤から湧きが速まる
  const mods = missionMods();   // SPEC-112: ミッションの効き目 (= 無ければ効かない値)
  const ez = easyStage();
  const cap = ez?.maxEnemies ?? stageMaxEnemies(stage);   // SPEC-065 / SPEC-078: ステージごと (= 320 / 440 / 600)。 SPEC-165: ストーリーはレシピの同時の上限   // SPEC-147: EASY は決まった間隔 (= flood・density・寄せ直し・群れは使わない)
  const sm = shadowMods();   // SPEC-165: シャドーのオーラ (= 湧き ×n)
  const spawnInterval = ez && ez.spawnIntervalMs != null   // SPEC-165: レシピが null なら本番の式 (= W5)
    ? ez.spawnIntervalMs / mods.spawnMul / sm.spawnMul
    : ENEMY_SPAWN_INTERVAL_MS * (stage.spawnIntervalMul ?? 1) / Math.max(0.1, absSpawnMul) / floodMul(stage.flood, b.stageElapsedMs) / mods.spawnMul;
  // SPEC-078: 経った時間ぶん湧かせる (= 1 コマに何体でも。 湧きを大きく速めても上限で止まる)
  // SPEC-079: ボス戦のあいだは湧かない
  const bud = spawnBudget(b.spawnAcc, dms, spawnInterval, (b.bossSpawned || storyHoldsSpawn()) ? 0 : cap - b.enemies.length);   // SPEC-165: ハートを拾うまで湧きを止める
  b.spawnAcc = bud.acc;
  if (bud.n > 0) {
    const pool = mods.shooterOnly ? shooterPool(stage) : (ez?.pool ?? currentPool(b.stageElapsedMs));   // SPEC-112: 三段撃ち・女王の威光。 SPEC-165: レシピの敵
    for (let k = 0; k < bud.n; k++) spawnEnemyAtRing(pool[Math.floor(Math.random() * pool.length)]);
    b.lastEnemySpawnMs = nowMs;
  }

  // SPEC-078: 画面の敵の密度を、 時刻ごとの目標まで足す (= 強い武器でどんどん倒しても、 ボスの直前は画面が敵で埋まる)
  // SPEC-079: ボス戦のあいだは足さない・寄せ直さない。 SPEC-112: 撃つ敵だけのミッションのあいだも足さない (= 弾で画面が埋まらない)
  const dn = (b.bossSpawned || mods.shooterOnly || ez) ? null : stage.density;
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
  if (!ez && recycleActive(dn, b.stageElapsedMs)) {
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
  const fl = ez ? null : stage.flood;
  if (fl && !b.bossSpawned && !mods.shooterOnly && b.stageElapsedMs >= Math.max(fl.packFromMs, b.nextPackMs ?? 0)) {
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

  // SPEC-147: EASY のステージ 2 は決まった時刻にレアエネミーを 1 体 (= ギフト券のレッスン)
  if (ez?.rareAtMs != null && !b.easyRareDone && !b.bossSpawned && b.stageElapsedMs >= ez.rareAtMs) {
    b.easyRareDone = true;
    spawnEnemyAtRing(RARE_ENEMY_IDS[0]);
    b.lastRareSpawnMs = nowMs;
    showLesson("s2.rare");
  }
  // SPEC-033: レアエネミーを 1 分に 1 回スポーン (= 全ステージ共通。 SPEC-079 でボス戦のあいだは出さない)
  if (!ez && !b.bossSpawned && b.enemies.length < cap &&
      b.stageElapsedMs >= rareIntervalMs() &&
      nowMs - b.lastRareSpawnMs >= rareIntervalMs()) {
    const rid = RARE_ENEMY_IDS[Math.floor(Math.random() * RARE_ENEMY_IDS.length)];
    spawnEnemyAtRing(rid);
    b.lastRareSpawnMs = nowMs;
  }

  // SPEC-107: そのステージの撃破数で脅威の段階が上がる (= 上がったら知らせる)
  const tier = runThreatTier(state.killCount, { firstRun: !!state.run?.firstRun, easy: isEasy() });   // SPEC-146 / 147: 初めての挑戦・EASY は T0 のまま
  if (tier > (b.threatTier ?? 0)) { b.threatTier = tier; showThreatNotice(tier); }
  // SPEC-107: 横断の列 (= T3 から。 予告の線を見せてから、 画面の端から反対の端へ一直線に)
  if (!b.bossSpawned) _tickCrossers(tier, cap);

  // SPEC-062: 撃ってくる敵 (= ステージごとに、 決まった時刻から一定の間隔で。 同時に出ている数に上限)
  const sh = ez?.shooters ?? stage.shooters;   // SPEC-165: ストーリーはレシピの表
  if (sh && storyAllows("shooters") && !b.bossSpawned && b.stageElapsedMs >= sh.fromMs && b.enemies.length < cap &&
      nowMs - (b.lastShooterSpawnMs ?? 0) >= sh.everyMs / Math.max(0.1, absSpawnMul)) {
    let alive = 0;
    for (const e of b.enemies) if (e.behavior === "shooter") alive++;
    if (alive < sh.max) { spawnEnemyAtRing(sh.ids[Math.floor(Math.random() * sh.ids.length)]); b.story?.events?.push("shooter"); }   // SPEC-165: 初めての一言
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
    if (e.behavior === "crosser") {
      // SPEC-107: 追わずに一直線。 走りきったら消える (= 撃破に数えず、 CE も落とさない)
      e.x += e.cross.ux * e.speed * dt;
      e.y += e.cross.uy * e.speed * dt;
      if (crossedOut(e)) e.gone = true;
    } else if (e.behavior === "shooter") {
      tickShooter(e, dt, px, py);   // SPEC-062: 距離を保って撃つ (= まっすぐ追わない)
    } else if ((e.isBoss || e.isShadow) && bossHoldsStill(e)) {   // SPEC-165: シャドーも型の最中は boss-moves.js が動かす
      // SPEC-080: 型の最中 (= 予備動作・突進・立て直し) は boss-moves.js が動かす
    } else if ((e.hitFreezeMs ?? 0) <= 0) {
      const sp = (e.isBoss || e.isShadow) ? e.speed : e.speed * mods.speedMul * shadowMods().speedMul;   // SPEC-112: 東方遠征・乱世の奸雄。 SPEC-165: オーラ
      e.x += (dx / d) * sp * dt;
      e.y += (dy / d) * sp * dt;
      // SPEC-053: 建物にめりこんだら押し出し、 壁に沿ってプレイヤーへ回りこむ
      if (rects.length) {
        let res = resolveCircle(e.x, e.y, e.r, rects);
        if (res.hit) {
          const s = slideAlongWall(res.nx, res.ny, px - res.x, py - res.y);
          res = resolveCircle(res.x + s.x * sp * dt, res.y + s.y * sp * dt, e.r, rects);
          e.x = res.x; e.y = res.y;
        }
      }
    }

    // SPEC-112: 乱世の奸雄 (= 敵が小さい) は当たりも小さく
    if (b.contactCooldownMs <= 0 && d < (e.isBoss ? e.r : e.r * mods.sizeMul) + b.player.r) {
      hurtPlayer(e.dmg, { boss: !!e.isBoss, name: enemyNameOf(e) });   // SPEC-090c: 被弾は 1 か所 (= hurt.js)。 ボスなら大きく揺らす。 SPEC-148: 名前
    }
  }
  // SPEC-107: 走りきった横断の敵を片づける
  if (b.enemies.some((e) => e.gone)) b.enemies = b.enemies.filter((e) => !e.gone);
}

/** SPEC-153: ボスの予告が出たときに呼ぶもの (= index.js がマインちゃんの警告を置く。 循環 import を避ける) */
let _bossIncomingHook = null;
export function setBossIncomingHook(fn) { _bossIncomingHook = typeof fn === "function" ? fn : null; }

/** SPEC-112: 撃つ敵だけを湧かせるとき (= ステージの撃つ敵。 決まっていなければ 166) */
export function shooterPool(stage) {
  const ids = stage?.shooters?.ids;
  return ids && ids.length ? ids : [166];
}

/** SPEC-107: 横断の列の予告と出現 */
function _tickCrossers(tier, cap) {
  const b = state.battle;
  const every = CROSS.everyMs[tier] ?? 0;
  b.crossWarns = (b.crossWarns ?? []).filter((w) => {
    if (b.stageElapsedMs < w.atMs) return true;
    _spawnCrossLine(w, cap);
    return false;
  });
  if (!every) return;
  if (b.nextCrossMs == null || b.nextCrossMs === 0) { b.nextCrossMs = b.stageElapsedMs + every * 0.5; return; }
  if (b.stageElapsedMs < b.nextCrossMs) return;
  b.nextCrossMs = b.stageElapsedMs + every;
  const dir = Math.floor(Math.random() * 4);
  const lane = (Math.random() - 0.5) * (dir < 2 ? b.viewport.h : b.viewport.w) * 0.5;
  const line = crossLine(dir, b.player.x, b.player.y, b.viewport.w, b.viewport.h, lane);
  const n = CROSS.minN + Math.floor(Math.random() * (CROSS.maxN - CROSS.minN + 1));
  b.crossWarns.push({ ...line, n, atMs: b.stageElapsedMs + CROSS.warnMs, fromMs: b.stageElapsedMs });
}

function _spawnCrossLine(w, cap) {
  const b = state.battle;
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1;
  const ux = (w.x2 - w.x1) / len, uy = (w.y2 - w.y1) / len;
  const pool = currentPool(b.stageElapsedMs);
  const baseId = pool[Math.floor(Math.random() * pool.length)];
  for (let k = 0; k < w.n && b.enemies.length < cap + w.n; k++) {
    spawnEnemyAtRing(baseId, { x: w.x1 - ux * CROSS.gap * k, y: w.y1 - uy * CROSS.gap * k }, { variant: "crosser" });
    const e = b.enemies[b.enemies.length - 1];
    e.behavior = "crosser";
    e.speed = CROSS.speed;
    e.cross = { x2: w.x2, y2: w.y2, ux, uy };
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
/** SPEC-165: レシピの割合で型を引く (= { giant: 0.2, runner: 0.2 }。 撃つ敵には付けない) */
function _rollStoryVariant(table, shooter) {
  if (shooter) return null;
  let r = Math.random();
  for (const [k, p] of Object.entries(table)) { if (r < p) return k; r -= p; }
  return null;
}

export function spawnEnemyAtRing(enemyId = 101, at = null, { variant = undefined } = {}) {
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
    // SPEC-165: ストーリーの 1-0 は左右と下からだけ (= 追われてゴールへ走る)
    const from = easyStage()?.spawnFrom;
    const angle = from === "sides" ? [Math.PI, 0, Math.PI / 2][Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 0.8 : Math.random() * Math.PI * 2;
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
  // SPEC-147: EASY は雑魚の強さをステージごとに上書きし、 ボスの HP も下げる
  const ezs = easyStage();
  const hpMul  = isBoss ? (ezs?.bossHpMul ?? 1) : (ezs?.enemyHpMul ?? stage.enemyHpMul ?? 1) * absHp;
  const dmgMul = isBoss ? 1 : (ezs?.enemyDmgMul ?? stage.enemyDmgMul ?? 1) * absDmg;
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
  // SPEC-107: 脅威の段階で強い型が混じる (= ボス・レアには付けない。 CE も型の倍率で増える)
  if (!isBoss && !spec.isRare) {
    const sv = easyStage()?.variants;   // SPEC-165: ストーリーはレシピの割合 (= 4-1)
    const v = variant !== undefined ? variant : (sv ? _rollStoryVariant(sv, spec.behavior === "shooter") : rollVariant(runThreatTier(state.killCount, { firstRun: !!state.run?.firstRun, easy: isEasy() }), { shooter: spec.behavior === "shooter" }));
    if (v && VARIANTS[v]) { applyVariant(b.enemies[b.enemies.length - 1], v, enemyId); b.story?.events?.push(`variant:${v}`); }
  }
}
