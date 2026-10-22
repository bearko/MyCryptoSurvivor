// ============================================================
// battle/shadow.js — シャドーヒーローの試練 (= SPEC-165 §6)。 中ボスとして出て、 耐える (survive) か 倒す (defeat)
// ============================================================
//
// 絵は Image/Enemies/<giver>.png (= ミッションの出し手と同じ ゴースト◯◯)。 ボスの型 (= 突進・叩きつけ・放射) を borrow し、
// その人のミッションの効き目を「オーラ」として場に出す (= 雑魚の湧き ×n・足 ×n)。 試練の中身 = NORMAL でその人が出すミッション。
// survive: HP を削れない (= invuln)。 時間が来ると「見事」と言って消える。 defeat: HP を削って倒す。
// 場は縮めない (= ボスと違う。 雑魚も湧き続ける)。 isBoss は付けない (= ボス戦の宝箱・ダスト・場の処理を動かさない)。

import { state } from "../state.js";
import { ENEMY_COLOR } from "../constants.js";
import { fxBurst } from "./fx.js";

/** 型の既定 (= レシピの shadow.moves で上書き) */
export const SHADOW_DEFAULTS = Object.freeze({ r: 30, speed: 70, dmg: 12, hp: 1200, moves: { charge: 4000 }, first: { charge: 2500 } });

/** 場に出ているシャドー (= 1 体だけ) */
export function findShadow() {
  return (state.battle?.enemies ?? []).find((e) => e.isShadow) ?? null;
}

/** オーラ (= 雑魚の湧きと足の倍率。 シャドーがいなければ 1) */
export function shadowMods() {
  const s = findShadow();
  return { spawnMul: s?.aura?.spawnMul ?? 1, speedMul: s?.aura?.speedMul ?? 1 };
}

/**
 * 出す (= 自分から少し離れた位置。 枠の中)。 def: レシピの shadow
 *   { giver, mode: "survive" | "defeat", hp, dmg, speed, r, moves: { charge, slam, burst }, first, aura, slam: { radius, dmg }, burst: { n, speed, dmg } }
 */
export function spawnShadow(def) {
  const b = state.battle;
  const p = b.player;
  const a = Math.random() * Math.PI * 2;
  const r = def.r ?? SHADOW_DEFAULTS.r;
  const x = def.at ? def.at.x : p.x + Math.cos(a) * 260, y = def.at ? def.at.y : p.y + Math.sin(a) * 260;   // at: 決まった場所 (= 1-5 は真ん中)
  const attackable = def.mode === "defeat" || def.mode === "spar";
  const hp = attackable ? (def.hp ?? SHADOW_DEFAULTS.hp) : 1e9;
  const moves = def.moves ?? SHADOW_DEFAULTS.moves;
  const first = def.first ?? Object.fromEntries(Object.keys(moves).map((k) => [k, Math.round(moves[k] * 0.6)]));
  const cd = {}; for (const k of Object.keys(moves)) cd[k] = first[k] ?? moves[k];
  const e = {
    id: b.nextEntityId++,
    enemyId: def.giver,
    x, y, r,
    hp, hpMax: hp,
    dmg: def.dmg ?? SHADOW_DEFAULTS.dmg,
    speed: def.speed ?? SHADOW_DEFAULTS.speed,
    color: ENEMY_COLOR,
    hitFreezeMs: 0,
    isBoss: false,
    isShadow: true,
    shadowId: def.id,
    invuln: !attackable,
    noHpBar: !attackable,
    xpValue: 0,
    aura: def.aura ?? null,
    behavior: null, shot: null, shotDmg: 0, fireCdMs: 0, aiming: false, aimAngle: 0, strafeDir: 1,
    // boss-moves.js がそのまま読む型の状態 (= BOSS_MOVES の 1 行と同じ形)
    mv: { def: { hpMul: 1, moves, first, slam: def.slam ?? { radius: 130, dmg: def.dmg ?? SHADOW_DEFAULTS.dmg }, burst: def.burst ?? { n: 6, speed: 170, dmg: 10, iconId: 5055 } }, cd, act: null, baseDmg: def.dmg ?? SHADOW_DEFAULTS.dmg, shake: 0 },
  };
  b.enemies.push(e);
  fxBurst(x, y, "#bb86fc", 24, 280);
  return e;
}

/** 消す (= 試練を越えた。 倒したのではないので CE も撃破数も無し) */
export function dismissShadow() {
  const b = state.battle;
  const i = b.enemies.findIndex((e) => e.isShadow);
  if (i < 0) return false;
  const e = b.enemies[i];
  fxBurst(e.x, e.y, "#bb86fc", 30, 320);
  b.enemies.splice(i, 1);
  return true;
}
