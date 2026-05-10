// ============================================================
// battle/archetypes.js — 10 武器系列の固有挙動 (= SPEC-012)
// ============================================================
//
// weapons.js の dispatcher から呼ばれる:
//   - fireXxx(w, dmgMul, bulletBonus): 単発系 (= cd 経過時に発射)
//   - ensureOrbits(w, dmgMul, bulletBonus): 持続系 (= 周回数を desired count に揃える)
//   - tickOrbits / tickBeams / tickBombs / tickHomingProjectiles: 各 entity 配列の毎フレーム更新
//
// pauseFlags のチェックは呼出側 (= _loop) が行う。 ここでは tick 内で random / 状態変更は許容。

import { state } from "../state.js";
import { hitEnemy } from "./damage.js";
import {
  PROJECTILE_RADIUS, PROJECTILE_LIFE_MS,
  WEAPON_SIZE_GROWTH_PER_LEVEL,
} from "../constants.js";

const ORBIT_HIT_COOLDOWN_MS = 250;   // 同じ敵を 0.25 sec ごとにしか damage しない
const ORBIT_ANGULAR_SPEED   = 1.2;   // rad/sec  (= Book)
const ORBIT_CLOSE_ANG_SPEED = 2.4;   // rad/sec  (= Blade)

// SPEC-028: weapon.level に応じた当たり判定 / アイコンサイズ倍率
function _levelSizeMul(w) {
  const lv = w?.level ?? 1;
  return 1 + WEAPON_SIZE_GROWTH_PER_LEVEL * (lv - 1);
}

// ============================================================
// 共通: 投射体 spawn
// ============================================================

function _spawnProjectile(opts) {
  const id = state.battle.nextEntityId++;
  state.battle.projectiles.push({
    id,
    x: opts.x, y: opts.y,
    vx: opts.vx, vy: opts.vy,
    r: opts.r ?? PROJECTILE_RADIUS,
    dmg: Math.max(1, Math.round(opts.dmg)),
    color: opts.color ?? "#ffffff",
    life: opts.life ?? PROJECTILE_LIFE_MS,
    age: 0,
    targetId: opts.targetId ?? null,
    kind: opts.kind ?? null,
    // SPEC-015: render 用 icon 情報
    iconId:        opts.iconId        ?? null,
    iconRotOffset: opts.iconRotOffset ?? 0,
    iconSize:      opts.iconSize      ?? 18,
    // SPEC-015: Moai 専用フィールド (= 着弾衝撃波)
    moaiTargetId: opts.moaiTargetId ?? null,
    moaiAoeR:     opts.moaiAoeR     ?? 0,
    moaiAoeDmg:   opts.moaiAoeDmg   ?? 0,
  });
}

function _findNearestEnemy(px, py, range) {
  const arr = state.battle.enemies;
  let best = null;
  let bestD2 = (range || Infinity) * (range || Infinity);
  for (const e of arr) {
    const dx = e.x - px, dy = e.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

function _nearestDir(px, py, range) {
  const t = _findNearestEnemy(px, py, range);
  if (!t) return null;
  const dx = t.x - px, dy = t.y - py;
  const d  = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d, target: t };
}

// ============================================================
// fireRadial (Revolver) - 敵方向に放射状 N 発
// ============================================================

export function fireRadial(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const dir = _nearestDir(px, py, w.range * rangeMul);
  if (!dir) return;
  const baseAngle = Math.atan2(dir.y, dir.x);
  const spreadDeg = w.params?.spreadDeg ?? 30;
  const total = (w.bullets ?? 1) + bulletBonus;
  const spreadRad = (spreadDeg * Math.PI) / 180;
  const speed = w.speedPx;
  // SPEC-019: Revolver は projectileIconId=null で円描画 fallback
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const t = total <= 1 ? 0.5 : i / (total - 1);
    const a = baseAngle - spreadRad / 2 + spreadRad * t;
    _spawnProjectile({
      x: px, y: py,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: w.dmg * dmgMul, color: w.color,
      iconId: projIcon, iconSize: 22 * lvMul,
      r: PROJECTILE_RADIUS * lvMul,
    });
  }
}

// ============================================================
// fireBigHoming (Panjandrum) - 大型ホーミング
// ============================================================

export function fireBigHoming(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const total = (w.bullets ?? 1) + bulletBonus;
  const size = w.params?.size ?? 14;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const t = _findNearestEnemy(px, py, w.range * rangeMul);
    let vx, vy, targetId = null;
    if (t) {
      const dx = t.x - px, dy = t.y - py;
      const d  = Math.hypot(dx, dy) || 1;
      vx = (dx / d) * w.speedPx;
      vy = (dy / d) * w.speedPx;
      targetId = t.id;
    } else {
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a) * w.speedPx;
      vy = Math.sin(a) * w.speedPx;
    }
    _spawnProjectile({
      x: px, y: py, vx, vy,
      dmg: w.dmg * dmgMul, color: w.color,
      r: size * lvMul, life: 4000, targetId, kind: "homing",
      iconId: projIcon, iconSize: Math.max(28, size * 1.6) * lvMul,
    });
  }
}

// ============================================================
// fireDropTarget (Moai) - 最初に狙った敵を追従して頭上から落下、 着弾で衝撃波
// ============================================================

export function fireDropTarget(w, dmgMul, bulletBonus) {
  const enemies = state.battle.enemies;
  if (enemies.length === 0) return;
  const total = (w.bullets ?? 1) + bulletBonus;
  const fallH = w.params?.fallH ?? 220;
  const speed = w.speedPx;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const aoeR  = (w.params?.aoeR ?? 60) * rangeMul;
  const aoeDmgRatio = w.params?.aoeDmgRatio ?? 0.7;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const t = enemies[Math.floor(Math.random() * enemies.length)];
    if (!t) continue;
    _spawnProjectile({
      x: t.x, y: t.y - fallH,
      vx: 0, vy: speed,
      dmg: w.dmg * dmgMul, color: w.color,
      r: 10 * lvMul, life: 1500,
      kind: "moaiDrop",
      moaiTargetId: t.id,
      moaiAoeR: aoeR,
      moaiAoeDmg: w.dmg * dmgMul * aoeDmgRatio,
      iconId: projIcon, iconSize: 28 * lvMul,
    });
  }
}

// ============================================================
// fireStack (Shuriken) - nearest 方向 ± dirs 等分、 各方向に 3 連
// ============================================================

export function fireStack(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const dir = _nearestDir(px, py, w.range * rangeMul);
  if (!dir) return;
  const baseAngle = Math.atan2(dir.y, dir.x);
  const dirs = w.params?.dirs ?? 1;
  const stack = (w.bullets ?? 3);
  const stackGap = w.params?.stackGap ?? 18;
  const speed = w.speedPx;
  const totalDirs = dirs + bulletBonus;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let k = 0; k < totalDirs; k++) {
    const a = baseAngle + (Math.PI * 2 * k) / totalDirs;
    const ux = Math.cos(a), uy = Math.sin(a);
    for (let s = 0; s < stack; s++) {
      _spawnProjectile({
        x: px - ux * stackGap * s,
        y: py - uy * stackGap * s,
        vx: ux * speed, vy: uy * speed,
        dmg: w.dmg * dmgMul, color: w.color,
        iconId: projIcon, iconSize: 22 * lvMul,
        r: PROJECTILE_RADIUS * lvMul,
      });
    }
  }
}

// ============================================================
// fireBeam (LaserGun) - 持続貫通レーザー
// ============================================================

export function fireBeam(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const dir = _nearestDir(px, py, w.range * rangeMul);
  if (!dir) return;
  const baseAngle = Math.atan2(dir.y, dir.x);
  const total = (w.bullets ?? 1) + bulletBonus;
  const len   = (w.params?.len   ?? 600) * rangeMul;   // SPEC-019: rangeMul を beam 長に
  const baseThick = w.params?.thick ?? 6;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  const thick = baseThick * lvMul;
  const dur   = w.params?.durMs ?? 600;
  const dmgPerSec = w.dmg * (dmgMul ?? 1);
  for (let i = 0; i < total; i++) {
    const a = baseAngle + (Math.PI * 2 * i) / total;
    state.battle.beams.push({
      id: state.battle.nextEntityId++,
      x: px, y: py,
      dirX: Math.cos(a), dirY: Math.sin(a),
      len, thick,
      age: 0, life: dur,
      dmgPerSec, color: w.color,
      weaponExtId: w.extId,
    });
  }
}

// ============================================================
// fireDiagonal (Knife) - 360 等分 (= 4 / 6 / 8 / 10 / 12)、 開始 45°
// ============================================================

export function fireDiagonal(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const total = (w.bullets ?? 4) + bulletBonus;
  const speed = w.speedPx;
  const offset = Math.PI / 4;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const a = offset + (Math.PI * 2 * i) / total;
    _spawnProjectile({
      x: px, y: py,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: w.dmg * dmgMul, color: w.color,
      iconId: projIcon, iconSize: 24 * lvMul,
      iconRotOffset: Math.PI / 4,
      r: PROJECTILE_RADIUS * lvMul,
    });
  }
}

// ============================================================
// fireRandomRadial (Axe) - ランダム方向に N 発
// ============================================================

export function fireRandomRadial(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const total = (w.bullets ?? 2) + bulletBonus;
  const speed = w.speedPx;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const a = Math.random() * Math.PI * 2;
    _spawnProjectile({
      x: px, y: py,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: w.dmg * dmgMul, color: w.color,
      iconId: projIcon, iconSize: 24 * lvMul,
      r: PROJECTILE_RADIUS * lvMul,
    });
  }
}

// ============================================================
// firePlaceBomb (Pierrot) - player 位置に bomb 配置
// ============================================================

export function firePlaceBomb(w, dmgMul, bulletBonus) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const total  = (w.bullets ?? 1) + bulletBonus;
  const fuseMs = w.params?.fuseMs ?? 1000;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const radius = (w.params?.radius ?? 60) * rangeMul;   // SPEC-019: rangeMul で AoE 拡大
  const lvMul = _levelSizeMul(w);   // SPEC-028
  for (let i = 0; i < total; i++) {
    const off = (i === 0) ? 0 : 20;
    const ox = (Math.random() * 2 - 1) * off;
    const oy = (Math.random() * 2 - 1) * off;
    state.battle.bombs.push({
      id: state.battle.nextEntityId++,
      x: px + ox, y: py + oy,
      fuseMs, age: 0,
      radius, dmg: Math.max(1, Math.round(w.dmg * dmgMul)),
      color: w.color,
      iconId: w.iconId,
      iconSize: 26 * lvMul,
    });
  }
}

// ============================================================
// fireHoming (デフォルト fallback) - SPEC-008 同形
// ============================================================

export function fireHoming(w, dmgMul) {
  const px = state.battle.player.x;
  const py = state.battle.player.y;
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const dir = _nearestDir(px, py, w.range * rangeMul);
  if (!dir) return;
  const projIcon = (w.projectileIconId !== undefined) ? w.projectileIconId : w.iconId;
  const lvMul = _levelSizeMul(w);   // SPEC-028
  _spawnProjectile({
    x: px, y: py,
    vx: dir.x * w.speedPx, vy: dir.y * w.speedPx,
    dmg: w.dmg * dmgMul, color: w.color,
    targetId: dir.target?.id ?? null, kind: "homing",
    iconId: projIcon, iconSize: 22 * lvMul,
    r: PROJECTILE_RADIUS * lvMul,
  });
}

// ============================================================
// ensureOrbits (Book / Blade) - 持続周回。 desired count に毎 frame 揃える
// ============================================================

export function ensureOrbits(w, dmgMul, bulletBonus) {
  const desired = (w.bullets ?? 1) + bulletBonus;
  const orbits  = state.battle.orbits;
  // SPEC-019: rangeMul を毎フレーム再適用 (= 既存 orbit の半径も更新)
  const rangeMul = state.buffs?.rangeMul ?? 1;
  const baseR    = w.params?.orbitR ?? 70;
  const r        = baseR * rangeMul;
  // SPEC-028: 武器レベルで当たり判定 / アイコンを拡大
  const lvMul        = _levelSizeMul(w);
  const baseHitR     = (w.archetype === "orbitClose") ?  9 : 11;
  const baseIconSize = (w.archetype === "orbitClose") ? 22 : 26;
  const hitR         = baseHitR     * lvMul;
  const iconSize     = baseIconSize * lvMul;
  const dmg          = Math.max(1, Math.round(w.dmg * dmgMul));

  // 既存 orbit に半径 / 武器レベル由来パラメータ / 現 tier icon を毎 frame 反映
  // (= レベルアップ即時に icon / 当たり / dmg / radius が切り替わる)
  for (const o of orbits) {
    if (String(o.weaponExtId) !== String(w.extId)) continue;
    o.r        = r;
    o.radius   = hitR;
    o.iconId   = w.iconId;
    o.iconSize = iconSize;
    o.dmg      = dmg;
    o.color    = w.color;
  }

  // 個数調整
  let owned = orbits.filter(o => String(o.weaponExtId) === String(w.extId));
  if (owned.length === desired) return;

  // anchor: 既存先頭の角度を維持して再配置 (= 回転は smooth に継続)
  const baseAng = (owned.length > 0) ? owned[0].angle : 0;

  if (owned.length < desired) {
    for (let i = owned.length; i < desired; i++) {
      orbits.push({
        id: state.battle.nextEntityId++,
        weaponExtId: w.extId,
        angle: 0,            // 後段で redistribute
        r, dmg,
        color: w.color,
        hitMap: {},
        kind: w.archetype,
        radius: hitR,
        iconId: w.iconId,
        iconSize,
      });
    }
  } else {
    // 過剰分 (= lv down シナリオ) を末尾から削除
    let toRemove = owned.length - desired;
    for (let i = orbits.length - 1; i >= 0 && toRemove > 0; i--) {
      if (String(orbits[i].weaponExtId) === String(w.extId)) {
        orbits.splice(i, 1);
        toRemove--;
      }
    }
  }

  // SPEC-028: 既存 + 新規を等間隔に再配置 (= 2→180° / 3→120° / 4→90° / N→360/N°)
  owned = orbits.filter(o => String(o.weaponExtId) === String(w.extId));
  const step = (Math.PI * 2) / Math.max(1, desired);
  for (let i = 0; i < owned.length; i++) {
    owned[i].angle = baseAng + step * i;
  }
}

// ============================================================
// tickOrbits - 角度更新 + 衝突 (= per-enemy hit cooldown)
// ============================================================

export function tickOrbits(dt, nowMs) {
  const orbits  = state.battle.orbits;
  const enemies = state.battle.enemies;
  const player  = state.battle.player;
  for (const o of orbits) {
    const w = (o.kind === "orbitClose") ? ORBIT_CLOSE_ANG_SPEED : ORBIT_ANGULAR_SPEED;
    o.angle += w * dt;
    const ox = player.x + Math.cos(o.angle) * o.r;
    const oy = player.y + Math.sin(o.angle) * o.r;
    o.x = ox; o.y = oy;
    // 衝突 (= SPEC-016: hitEnemy 経由で 数字 + freeze)
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dx = e.x - ox, dy = e.y - oy;
      const sumR = e.r + (o.radius ?? 10);
      if (dx * dx + dy * dy > sumR * sumR) continue;
      const last = o.hitMap[e.id] ?? 0;
      if (nowMs - last < ORBIT_HIT_COOLDOWN_MS) continue;
      o.hitMap[e.id] = nowMs;
      hitEnemy(j, o.dmg);
    }
  }
}

// ============================================================
// tickBeams - 持続レーザー、 player を原点に dir 固定
// ============================================================

export function tickBeams(dt) {
  const beams   = state.battle.beams;
  const enemies = state.battle.enemies;
  const player  = state.battle.player;
  const dms = dt * 1000;
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.age += dms;
    if (b.age >= b.life) { beams.splice(i, 1); continue; }
    // origin は毎フレーム player に置き直す (= ヒーロー中心)
    b.x = player.x; b.y = player.y;
    // 線分 (= origin から len) 上の敵に dmg/sec
    const dmg = b.dmgPerSec * dt;
    const halfThick = b.thick / 2;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const ex = e.x - b.x, ey = e.y - b.y;
      // 線分への投影 (= dot)
      const proj = ex * b.dirX + ey * b.dirY;
      if (proj < 0 || proj > b.len) continue;
      // 投影点と敵の距離
      const px = b.dirX * proj, py = b.dirY * proj;
      const dx = ex - px, dy = ey - py;
      const dist = Math.hypot(dx, dy);
      if (dist > halfThick + e.r) continue;
      hitEnemy(j, dmg);   // SPEC-016
    }
  }
}

// ============================================================
// tickBombs - fuseMs で AoE 爆発
// ============================================================

export function tickBombs(dt) {
  const bombs   = state.battle.bombs;
  const enemies = state.battle.enemies;
  const dms = dt * 1000;
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.age += dms;
    if (b.age < b.fuseMs) continue;
    // 爆発: AoE (= SPEC-016: hitEnemy 経由)
    const r2 = b.radius * b.radius;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy > r2) continue;
      hitEnemy(j, b.dmg);
    }
    bombs.splice(i, 1);
  }
}

// ============================================================
// SPEC-015: tickShockwaves - Moai 着弾の AoE ring (= 拡張円)
// 半径が r0→r1 に成長、 範囲内の敵に 1 回だけ damage、 hitSet で per-enemy 重複防止
// ============================================================

export function tickShockwaves(dt) {
  const dms = dt * 1000;
  const sw  = state.battle.shockwaves;
  const enemies = state.battle.enemies;
  for (let i = sw.length - 1; i >= 0; i--) {
    const s = sw[i];
    s.age += dms;
    if (s.age >= s.life) { sw.splice(i, 1); continue; }
    const t = s.age / s.life;
    const r = s.r0 + (s.r1 - s.r0) * t;
    const r2 = r * r;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (s.hitSet.has(e.id)) continue;
      const dx = e.x - s.x, dy = e.y - s.y;
      if (dx * dx + dy * dy > r2) continue;
      s.hitSet.add(e.id);
      hitEnemy(j, s.dmg);   // SPEC-016
    }
  }
}

// ============================================================
// tickHomingProjectiles - bigHoming 弾の速度ベクタ補正
// ============================================================

export function tickHomingProjectiles(_dt) {
  const projs   = state.battle.projectiles;
  const enemies = state.battle.enemies;
  for (const p of projs) {
    if (p.kind !== "homing" || p.targetId == null) continue;
    const t = enemies.find(e => e.id === p.targetId);
    if (!t) {
      // ターゲット消失 → 直進継続 (= targetId クリア)
      p.targetId = null;
      continue;
    }
    const dx = t.x - p.x, dy = t.y - p.y;
    const d  = Math.hypot(dx, dy) || 1;
    const speed = Math.hypot(p.vx, p.vy);
    p.vx = (dx / d) * speed;
    p.vy = (dy / d) * speed;
  }
}
