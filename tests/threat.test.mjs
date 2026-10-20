// SPEC-107: 敵の段階と新しい型
// 実行: node --test tests/threat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
const { threatTier, rollVariant, applyVariant, crossLine, crossedOut, VARIANTS, VARIANT_SPRITES, THREAT_TIERS } = await import("../js/battle/threat.js");
const { shotAngles } = await import("../js/battle/enemy-shots.js");

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("段階はそのステージの撃破数で T0〜T4", () => {
  assert.deepEqual(THREAT_TIERS, [0, 150, 400, 800, 1500]);
  assert.deepEqual([0, 149, 150, 399, 400, 800, 1499, 1500, 99999].map(threatTier), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
});

test("型の混じり方：T0 は出ない・T1 から巨大と疾走・T4 で精鋭・撃つ敵は T2 から連射", () => {
  assert.equal(rollVariant(0, {}, () => 0), null);
  assert.equal(rollVariant(1, {}, () => 0.01), "giant");
  assert.equal(rollVariant(1, {}, () => 0.10), "runner");
  assert.equal(rollVariant(1, {}, () => 0.5), null);
  assert.equal(rollVariant(4, {}, () => 0.28), "elite");
  assert.equal(rollVariant(1, { shooter: true }, () => 0), null, "T1 の撃つ敵はふつう");
  assert.equal(rollVariant(2, { shooter: true }, () => 0.1), "gatling");
  assert.equal(rollVariant(2, { shooter: true }, () => 0.9), null);
});

test("強い型ほど CE が多い・強さが倍率どおり・連射は 5 方向", () => {
  const base = () => ({ enemyId: 101, hp: 25, hpMax: 25, dmg: 10, r: 20, speed: 80, xpValue: 2 });
  const g = applyVariant(base(), "giant");
  assert.deepEqual([g.hpMax, g.hp, g.dmg, g.r, g.xpValue, g.spriteId], [100, 100, 15, 32, 8, 104]);
  const el = applyVariant(base(), "elite");
  assert.equal(el.xpValue, 20);
  assert.ok(VARIANTS.elite.ceMul > VARIANTS.giant.ceMul && VARIANTS.giant.ceMul > VARIANTS.runner.ceMul);
  const sh = applyVariant({ enemyId: 166, hp: 70, hpMax: 70, dmg: 10, r: 15, speed: 70, xpValue: 4, shot: { pattern: "spread3", everyMs: 2000, dmg: 8 } }, "gatling");
  assert.deepEqual([sh.shot.pattern, sh.shot.everyMs, sh.xpValue], ["spread5", 1200, 16]);
  assert.equal(shotAngles("spread5", 0).length, 5);
});

test("型の絵は資産リポジトリにある id（手元に clone があれば確かめる）", () => {
  const dir = new URL("../../mycryptoheroes/Image/Enemies/", import.meta.url);
  for (const [base, m] of Object.entries(VARIANT_SPRITES)) for (const id of Object.values(m)) {
    assert.ok(Number.isInteger(id), `${base}`);
    if (existsSync(dir)) assert.ok(existsSync(new URL(`${id}.png`, dir)), `${id}.png`);
  }
});

test("横断の列：画面の端から反対の端へ。 走りきったら消える", () => {
  const l = crossLine(0, 0, 0, 400, 800, 30);
  assert.ok(l.x1 < -200 && l.x2 > 200 && l.y1 === 30 && l.y2 === 30);
  const e = { x: l.x1, y: 30, cross: { x2: l.x2, y2: l.y2, ux: 1, uy: 0 } };
  assert.equal(crossedOut(e), false);
  e.x = l.x2 + 1;
  assert.equal(crossedOut(e), true);
});
