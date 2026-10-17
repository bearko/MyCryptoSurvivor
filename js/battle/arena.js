// ============================================================
// battle/arena.js — ボス戦の場 (= SPEC-079)
// ============================================================
//
// - ボスが出たら、 ステージの真ん中に 1/4 の広さの枠 (= 幅も高さも半分) が閉じてくる。 自分もボスも枠の外へは出られない
// - 枠は ARENA.closeMs かけて世界の縁から縮む。 外にいたら壁に押されて入る。 落ちている CE・アイテム・壺・宝箱も中へ寄る
// - ほかの敵は消える (= CE は落とさない。 落ちている CE は残る)。 ボス戦のあいだは敵が湧かない (= enemies.js)
// 枠はステージの始まりに外す。 時間はゲームの中の時間 (= 一時停止で止まる)。

import { state } from "../state.js";
import { WORLD_W, WORLD_H } from "../constants.js";

/** ボスの出る場所 (= ステージの真ん中。 ボス戦の枠の中心) */
export const BOSS_SPAWN_POS = { x: 0, y: 0 };

export const ARENA = {
  halfW: WORLD_W / 4,     // 250 (= 幅 500。 ステージの半分)
  halfH: WORLD_H / 4,     // 375 (= 高さ 750)
  closeMs: 1400,          // 枠が閉じきるまで
};

/** 世界の縁から枠へ、 k (= 0〜1) だけ縮んだ縁 (= 純関数)。 ゆっくり止まるように */
export function arenaBoundsAt(k) {
  const t = Math.max(0, Math.min(1, k));
  const e = 1 - (1 - t) * (1 - t) * (1 - t);   // 終わりがゆっくり
  const hw = WORLD_W / 2 + (ARENA.halfW - WORLD_W / 2) * e;
  const hh = WORLD_H / 2 + (ARENA.halfH - WORLD_H / 2) * e;
  return { minX: -hw, maxX: hw, minY: -hh, maxY: hh };
}

/** 円 (= 中心 x,y・半径 r) を縁の中に入れる (= 純関数) */
export function clampToBounds(x, y, r, bd) {
  return {
    x: Math.max(bd.minX + r, Math.min(bd.maxX - r, x)),
    y: Math.max(bd.minY + r, Math.min(bd.maxY - r, y)),
  };
}

/** いまの縁 (= 枠がなければ世界の縁) */
export function currentBounds() {
  const a = state.battle.arena;
  if (!a) return { minX: -WORLD_W / 2, maxX: WORLD_W / 2, minY: -WORLD_H / 2, maxY: WORLD_H / 2 };
  return arenaBoundsAt(a.t / ARENA.closeMs);
}

/** ステージの始まり (= 枠を外す) */
export function resetArena() {
  state.battle.arena = null;
}

/** ボスが出たとき: 枠を閉じはじめる */
export function startArena() {
  state.battle.arena = { t: 0 };
}

/** 1 コマ: 枠を縮め、 中にいなければならないものを中へ入れる */
export function tickArena(dt) {
  const b = state.battle;
  const a = b.arena;
  if (!a) return;
  const closing = a.t < ARENA.closeMs;
  a.t = Math.min(ARENA.closeMs, a.t + dt * 1000);
  const bd = currentBounds();
  const keep = (o, r) => { const c = clampToBounds(o.x, o.y, r, bd); o.x = c.x; o.y = c.y; };
  keep(b.player, b.player.r);
  for (const e of b.enemies) keep(e, e.r);
  if (closing) {
    // 閉じているあいだだけ、 落ちているものを中へ寄せる (= 閉じたあとは外に出ないので見なくてよい)
    for (const g of b.gems) keep(g, g.r ?? 6);
    for (const it of b.items ?? []) keep(it, it.r ?? 12);
    for (const c of b.magicCards ?? []) keep(c, c.r ?? 12);
  }
}
