// SPEC-102: CE がヒーローに吸い込まれる (= js/battle/absorb.js の純関数と、 tickGems の流れ)
// 実行: node --test tests/absorb.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startAbsorb, absorbStep, absorbScale, chainPitch,
  ABSORB_SHRINK, CHAIN_MAX, CHAIN_PITCH, CHAIN_WINDOW_MS,
} from "../js/battle/absorb.js";
import { tickGems } from "../js/battle/gems.js";
import { state } from "../js/state.js";
import { GEM_PICKUP_RADIUS } from "../js/constants.js";

const DT = 1 / 60;

function framesToArrive(dist) {
  const g = { x: dist, y: 0 };
  startAbsorb(g);
  for (let f = 1; f <= 600; f++) if (absorbStep(g, 0, 0, DT)) return f;
  return Infinity;
}

test("範囲のふちから 0.1〜0.3 秒ほどで届く (= ギョクで広げた範囲でも)", () => {
  const near = framesToArrive(GEM_PICKUP_RADIUS) * DT;
  const far  = framesToArrive(GEM_PICKUP_RADIUS * 3) * DT;
  assert.ok(near >= 0.1 && near <= 0.2, `28px: ${near.toFixed(3)} 秒`);
  assert.ok(far >= 0.2 && far <= 0.35, `84px: ${far.toFixed(3)} 秒`);
});

test("だんだん速くなる (= あとのフレームほど大きく動く)", () => {
  const g = { x: 200, y: 0 };
  startAbsorb(g);
  const steps = [];
  for (let f = 0; f < 5; f++) { const before = g.x; absorbStep(g, 0, 0, DT); steps.push(before - g.x); }
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1]);
});

test("ヒーローが動いても、 いまの位置へ向け直して届く", () => {
  const g = { x: 40, y: 0 };
  startAbsorb(g);
  let px = 0, arrived = false;
  for (let f = 0; f < 120 && !arrived; f++) { px -= 3; arrived = absorbStep(g, px, 0, DT); }
  assert.ok(arrived);
  assert.equal(g.x, px);
});

test("吸い込み中は少しずつ小さくなる (= 落ちているあいだは 1)", () => {
  const g = { x: 10, y: 0 };
  assert.equal(absorbScale(g), 1);
  startAbsorb(g);
  assert.equal(absorbScale(g), 1);
  g.absorbT = 10;
  assert.equal(absorbScale(g), 1 - ABSORB_SHRINK);
});

test("続けて届くほど音が高くなり、 上限で止まり、 間があくと戻る", () => {
  const chain = { n: 0, ms: 0 };
  assert.equal(chainPitch(chain, 16, 1), 1);
  let p = 1;
  for (let i = 0; i < 20; i++) p = chainPitch(chain, 16, 1);
  assert.equal(p, 1 + CHAIN_PITCH * CHAIN_MAX);
  chainPitch(chain, CHAIN_WINDOW_MS + 1, 0);
  assert.equal(chain.n, 0);
  assert.equal(chainPitch(chain, 16, 1), 1);
});

// ---- tickGems の流れ ----
function setup(gems) {
  globalThis.matchMedia = undefined;   // 動きを減らさない
  state.buffs = { pickupMul: 1 };
  state.xp = 0;
  state.xpToNext = 1e9;
  state.level = 1;
  state.battle.player = { x: 0, y: 0, r: 12 };
  state.battle.gems = gems.map((g, i) => ({ id: i + 1, r: 6, value: 1, color: "#fff", ...g }));
  state.battle.xpAcc = 0;
  state.battle.gemChain = undefined;
}

test("範囲に入った CE はその場では消えず、 届いた瞬間に経験値が入る", () => {
  setup([{ x: 20, y: 0 }]);
  tickGems(DT);
  assert.equal(state.battle.gems.length, 1, "1 フレーム目はまだ飛んでいる");
  assert.equal(state.battle.gems[0].absorbing, true);
  assert.equal(state.xp, 0);
  for (let f = 0; f < 30; f++) tickGems(DT);
  assert.equal(state.battle.gems.length, 0);
  assert.equal(state.xp, 1);
});

test("範囲の外の CE は動かない", () => {
  setup([{ x: 200, y: 0 }]);
  for (let f = 0; f < 30; f++) tickGems(DT);
  assert.equal(state.battle.gems[0].x, 200);
  assert.equal(state.battle.gems[0].absorbing, undefined);
});

test("棒磁石の CE は、 遠くても吸い込み中になって届く (= 入る経験値は同じ)", () => {
  setup([{ x: 1500, y: 0, magnet: true }, { x: -900, y: 400, magnet: true, value: 3 }]);
  tickGems(DT);
  assert.ok(state.battle.gems.every((g) => g.absorbing));
  for (let f = 0; f < 180; f++) tickGems(DT);
  assert.equal(state.battle.gems.length, 0);
  assert.equal(state.xp, 4);
});

test("動きを減らす設定では、 範囲に入った CE をその場で拾う (= いままでどおり)", () => {
  setup([{ x: 20, y: 0 }]);
  globalThis.matchMedia = () => ({ matches: true });
  try {
    tickGems(DT);
    assert.equal(state.battle.gems.length, 0);
    assert.equal(state.xp, 1);
  } finally {
    globalThis.matchMedia = undefined;
  }
});
