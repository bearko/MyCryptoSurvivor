// SPEC-080: ボスの攻撃の型 (= 突進・叩きつけ・放射・渦。 予告 → 本番 → 立て直し)
// 実行: node --test tests/boss-moves.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOSS_MOVES, CHARGE, SLAM, ENRAGE_AT, ENRAGE_CD_MUL, MOVE_ORDER,
  rayToBounds, pickMove, cooldownMul, distToSegment, tickBossMoves, bossHoldsStill,
} from "../js/battle/boss-moves.js";
import { arenaBoundsAt } from "../js/battle/arena.js";
import { STAGE_TABLE } from "../js/constants.js";
import { state } from "../js/state.js";

const DT = 1 / 60;

function setup(enemyId, boss = {}) {
  const b = state.battle;
  b.gameOver = false;
  b.contactCooldownMs = 0;
  b.player = { x: 0, y: 300, r: 20 };
  b.enemies = [{ id: 1, enemyId, isBoss: true, x: 0, y: 0, r: 40, hp: 1000, hpMax: 1000, dmg: 20, ...boss }];
  b.bossProjectiles = [];
  b.bossRings = [];
  b.damageNumbers = [];
  b.arena = { t: 1e9 };   // 閉じきった枠
  b.fx = { shake: 0, shakeMs: 0, hurt: 0, flash: 0, particles: [], bolts: [], boltMs: 0 };
  state.stats = { hp: 1000 };
  state.statsMax = { hp: 1000 };
  state.buffs = {};
  return b;
}
const run = (ms) => { for (let t = 0; t < ms; t += DT * 1000) tickBossMoves(DT); };

test("どのステージのボスにも型があり、 HP は強くなる", () => {
  for (const s of STAGE_TABLE) {
    const def = BOSS_MOVES[s.bossEnemyId];
    assert.ok(def, `boss ${s.bossEnemyId}`);
    assert.ok(def.hpMul > 1);
    assert.ok(def.moves.charge > 0, "どのボスも突進する");
    assert.ok(Object.keys(def.moves).length >= 2, "型は 2 つ以上");
    for (const k of Object.keys(def.moves)) assert.ok(MOVE_ORDER.includes(k));
  }
});

test("縁までの長さ (= ボスの半径だけ内側で止まる。 頭打ちあり)", () => {
  const bd = arenaBoundsAt(1);   // ±250 × ±375
  assert.equal(rayToBounds(0, 0, 1, 0, bd, 40, 1000), 210);
  assert.equal(rayToBounds(0, 0, 0, -1, bd, 40, 1000), 335);
  assert.equal(rayToBounds(0, 0, 1, 0, bd, 40, 100), 100);
  assert.equal(rayToBounds(240, 0, 1, 0, bd, 40, 1000), 0, "もう縁なら 0");
  const d = Math.SQRT1_2;
  assert.ok(Math.abs(rayToBounds(0, 0, d, d, bd, 40, 1000) - 210 / d) < 1e-9, "斜めは先に当たる縁まで");
});

test("次の型は、 待ち終えたもののうち順番の前のもの", () => {
  assert.equal(pickMove({ charge: 10, slam: 0, burst: -5 }), "slam");
  assert.equal(pickMove({ charge: -1, burst: -5 }), "charge");
  assert.equal(pickMove({ charge: 1, slam: 2 }), null);
});

test("HP が半分を切ると、 次の型までが短くなる", () => {
  assert.equal(cooldownMul(1000, 1000), 1);
  assert.equal(cooldownMul(1000 * ENRAGE_AT, 1000), 1);
  assert.equal(cooldownMul(1000 * ENRAGE_AT - 1, 1000), ENRAGE_CD_MUL);
  assert.ok(ENRAGE_CD_MUL < 1);
});

test("線分と点の距離", () => {
  assert.equal(distToSegment(5, 3, 0, 0, 10, 0), 3);
  assert.equal(distToSegment(-4, 3, 0, 0, 10, 0), 5);
  assert.equal(distToSegment(13, 4, 0, 0, 10, 0), 5);
  assert.equal(distToSegment(1, 1, 0, 0, 0, 0), Math.SQRT2);
});

test("突進: 予告 (= 動かない・帯が伸びる) → 向きを固める → 走る (= 縁で止まる) → 少し動けない", () => {
  const b = setup(171);
  const boss = b.enemies[0];
  const def = BOSS_MOVES[171];
  run(def.first.charge + 20);
  assert.equal(boss.mv.act?.kind, "charge");
  assert.equal(boss.mv.act.phase, "windup");
  assert.equal(bossHoldsStill(boss), true);
  assert.equal(boss.x, 0); assert.equal(boss.y, 0);
  assert.ok(boss.mv.act.len > 0, "通り道の帯が見える");
  assert.ok(boss.mv.act.dy > 0.99, "自分のほうを向く");
  // 固まったあとに自分が横へ逃げても、 向きは変わらない
  run(CHARGE.windupMs * CHARGE.lockAt + 20);
  b.player.x = 200;
  const dx0 = boss.mv.act.dx;
  run(CHARGE.windupMs * (1 - CHARGE.lockAt) - 60);
  assert.equal(boss.mv.act.phase, "windup");
  assert.equal(boss.mv.act.dx, dx0);
  run(60);
  assert.equal(boss.mv.act.phase, "dash");
  assert.ok(boss.dmg > 20, "走っているあいだは当たると痛い");
  run(1500);
  assert.ok(Math.abs(boss.y - (375 - 40)) < 1, `縁で止まる (y=${boss.y})`);
  assert.equal(boss.dmg, 20, "止まったら元の痛さ");
  assert.equal(boss.mv.act, null, "立て直しを終えたら、 また追いかける");
});

test("叩きつけ: 円が満ちたら衝撃。 円の中にいると痛く、 外なら痛くない", () => {
  const b = setup(171);
  const boss = b.enemies[0];
  const def = BOSS_MOVES[171];
  boss.mv = null;
  // 叩きつけだけ先に来るように
  run(1);
  boss.mv.cd = { charge: 1e9, slam: 0, burst: 1e9 };
  b.player = { x: 0, y: def.slam.radius - 10, r: 20 };
  run(20);
  assert.equal(boss.mv.act.kind, "slam");
  run(SLAM.windupMs + 40);
  assert.equal(state.stats.hp, 1000 - def.slam.dmg);
  assert.equal(b.bossRings.length, 1, "衝撃の輪");

  const b2 = setup(171);
  run(1);
  b2.enemies[0].mv.cd = { charge: 1e9, slam: 0, burst: 1e9 };
  b2.player = { x: 0, y: def.slam.radius + 80, r: 20 };
  run(SLAM.windupMs + 60);
  assert.equal(state.stats.hp, 1000, "外にいれば痛くない");
});

test("放射と渦は、 ボスのまわりに弾を出す", () => {
  const b = setup(171);
  run(1);
  b.enemies[0].mv.cd = { charge: 1e9, slam: 1e9, burst: 0 };
  run(20);
  assert.equal(b.bossProjectiles.length, BOSS_MOVES[171].burst.n);

  const b2 = setup(373);
  run(1);
  b2.enemies[0].mv.cd = { charge: 1e9, spiral: 0 };
  const sp = BOSS_MOVES[373].spiral;
  run(sp.durMs + 100);
  const waves = Math.ceil(sp.durMs / sp.everyMs);
  assert.ok(Math.abs(b2.bossProjectiles.length - waves * sp.arms) <= sp.arms, `${b2.bossProjectiles.length}`);
  assert.equal(b2.enemies[0].mv.act, null);
});

test("ゲームオーバーのあとは何もしない", () => {
  const b = setup(171);
  b.gameOver = true;
  run(10000);
  assert.equal(b.enemies[0].mv, undefined);
});
