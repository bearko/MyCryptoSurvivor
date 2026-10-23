// ============================================================
// battle/team-battle.js — 戦闘のサブ 2 人 (= SPEC-166)
// ============================================================
//
// サブはメインの左後ろ・右後ろについて回り (= 当たり判定なし・倒れない)、 自分の初期武器を自分の位置から撃つ。
// 武器は「持ち主の位置」から出る (= weaponOrigin)。 サブの初期武器は武器の枠に入る。 LL はメインの初期武器だけ。

import { state } from "../state.js";
import { getHero } from "../heroes.js";
import { getHeroSprite, drawSprite } from "./sprites.js";
import { HERO_STARTING_WEAPON, CHAR_SPRITE_RATIO, STOCK_LIMIT_WEAPON, EXT_MAX_LEVEL } from "../constants.js";
import { getExt, getCategory } from "../extensions.js";
import { subTarget, followStep } from "../team.js";

/** ステージの始まりにサブを置く (= メインの初期武器を積んだあと、 武器を組み直す前に呼ぶ) */
export function setupTeamBattle(subIds = []) {
  const b = state.battle;
  const p = b.player;
  b.teamDir = { x: 0, y: -1 };   // 最初は上を向いている (= サブは下の左右)
  b.subs = subIds.map((id, i) => {
    const hero = getHero(id);
    const extId = HERO_STARTING_WEAPON[id] ?? null;
    const t = subTarget(p.x, p.y, b.teamDir, i);
    return { heroId: Number(id), extId, x: t.x, y: t.y, face: 0, walkT: 0, sprite: getHeroSprite(hero) };
  }).filter((s) => s.extId != null);
  // サブの初期武器を武器の枠に (= まだ持っていなければ Lv.1。 枠が埋まっていれば入れない)
  for (const s of b.subs) {
    if (state.ownedExtensions.some((o) => String(o.extId) === String(s.extId))) continue;
    const weapons = state.ownedExtensions.filter((o) => getCategory(getExt(o.extId)) === "weapon").length;
    if (weapons >= STOCK_LIMIT_WEAPON) continue;
    state.ownedExtensions.push({ extId: s.extId, level: Math.min(EXT_MAX_LEVEL, 1) });
  }
}

/** その武器を撃つ位置 (= サブの初期武器ならそのサブ、 ほかはメイン) */
export function weaponOrigin(extId) {
  const b = state.battle;
  const subs = b?.subs;
  if (subs && subs.length) {
    for (const s of subs) if (String(s.extId) === String(extId)) return s;
  }
  return b.player;
}

/** 毎コマ: サブを追いかけさせる */
export function tickTeam(dt, input) {
  const b = state.battle;
  if (!b.subs || !b.subs.length) return;
  if (Math.hypot(input?.x ?? 0, input?.y ?? 0) > 0.2) b.teamDir = { x: input.x, y: input.y };
  const p = b.player;
  b.subs.forEach((s, i) => {
    const t = subTarget(p.x, p.y, b.teamDir, i);
    const before = { x: s.x, y: s.y };
    const n = followStep(s, t, dt);
    s.x = n.x; s.y = n.y;
    const vx = (s.x - before.x) / Math.max(dt, 1e-3);
    s.moving = Math.hypot(vx, s.y - before.y) > 0.5;
    s.face = (s.face ?? 0) + (Math.max(-1, Math.min(1, vx / 120)) - (s.face ?? 0)) * Math.min(1, dt * 10);
    if (s.moving) s.walkT = (s.walkT ?? 0) + dt;
  });
}

/** サブを描く (= メインより下。 少し小さく) */
export function renderTeamWorld(ctx, camera, nowMs) {
  const b = state.battle;
  if (!b.subs || !b.subs.length) return;
  const r = b.player.r * 0.85;
  for (const s of b.subs) {
    const x = s.x - camera.x, y = s.y - camera.y;
    ctx.save();
    ctx.globalAlpha = 0.25;   // 足もとの影
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const hop = s.moving ? Math.abs(Math.sin((s.walkT ?? 0) * 11)) * r * 0.16 : Math.sin(nowMs / 420 + s.heroId) * r * 0.03;
    ctx.save();
    ctx.translate(x, y + r * 0.55);
    ctx.rotate((s.face ?? 0) * 0.14);
    const drew = drawSprite(ctx, s.sprite, 0, -r * 0.55 - r * 0.12 - hop, r * CHAR_SPRITE_RATIO);
    ctx.restore();
    if (!drew) {
      ctx.fillStyle = "rgba(127,224,255,.6)";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
