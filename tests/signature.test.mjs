// SPEC-100: ヒーローの固有スキル (= 計算の純関数と、 戦闘の中の効き目)
// 実行: node --test tests/signature.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIGNATURE_OF, oneHoleMul, langerMul, tigerMul, tetractysSteps, chainTargets, slashDmg,
  resetSignature, sigDamageMul, sigSpeedMul, sigPickupMul, sigOnGemsPicked, sigRegenPerSec, sigHealMul,
  sigNextPickSteps, sigOnPicked, sigTryPhantom, sigOnLevelUp, tickSignature,
  ONE_HOLE, LANGER, TIGER, PIRATE, PHANTOM, MIST, TESLA, SLASH,
} from "../js/battle/signature.js";
import { state } from "../js/state.js";

const HEROES = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8")).heroes;
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

beforeEach(() => {
  state.battle.player = { x: 0, y: 0, r: 12 };
  state.battle.enemies = [];
  state.battle.contactCooldownMs = 0;
  state.stats.hp = 100;
  state.statsMax.hp = 100;
  state.level = 5;
});

test("10 人すべてに固有スキルがあり、 名前は MCH のパッシブスキル名・説明の文がある", () => {
  assert.equal(new Set(Object.values(SIGNATURE_OF)).size, 10);
  for (const h of HEROES) {
    const kind = SIGNATURE_OF[h.heroId];
    assert.ok(kind, h.name.ja);
    assert.ok(h.passive?.ja && h.passive?.en, h.name.ja);
    assert.ok(ui[`hero.sig.${kind}`]?.ja && ui[`hero.sig.${kind}`]?.en, kind);
  }
});

test("計算: ワンホールショット・ランゲルライン・虎痴・テトラクテュス", () => {
  assert.equal(oneHoleMul(0), 1);
  assert.equal(oneHoleMul(3), 1 + 3 * ONE_HOLE.step);
  assert.equal(oneHoleMul(99), ONE_HOLE.max);
  assert.equal(langerMul(0), LANGER.max);
  assert.equal(langerMul(LANGER.range), 1);
  assert.equal(langerMul(999), 1);
  assert.equal(tigerMul(1), 1);
  assert.equal(tigerMul(TIGER.start), 1);
  assert.equal(tigerMul(TIGER.full), TIGER.max);
  assert.equal(tigerMul(0.05), TIGER.max);
  assert.deepEqual([1, 2, 3, 4, 5, 8].map(tetractysSteps), [1, 1, 1, 2, 1, 2]);
});

test("テスラコイルの的: いちばん近い敵から、 まだ当てていない近くの敵へ 2 回つなぐ", () => {
  const es = [{ id: 1, x: 100, y: 0 }, { id: 2, x: 200, y: 0 }, { id: 3, x: 300, y: 0 }, { id: 4, x: 400, y: 0 }, { id: 5, x: 50, y: 0, isProp: true }];
  assert.deepEqual(chainTargets(es, 0, 0).map((e) => e.id), [1, 2, 3]);
  assert.deepEqual(chainTargets(es, 0, 0, { firstR: 50 }).map((e) => e.id), [], "壺は狙わない・遠すぎれば撃たない");
  assert.deepEqual(chainTargets([{ id: 1, x: 100, y: 0 }, { id: 2, x: 500, y: 0 }], 0, 0).map((e) => e.id), [1], "次が遠ければそこで止まる");
});

test("固有スキルの無いところ (= プレビュー) では何も変えない", () => {
  state.battle.sig = null;
  assert.equal(sigDamageMul({ x: 0, y: 0 }), 1);
  assert.equal(sigSpeedMul(), 1);
  assert.equal(sigPickupMul(), 1);
  assert.equal(sigRegenPerSec(), 0);
  assert.equal(sigHealMul(), 1);
  assert.equal(sigNextPickSteps(), 1);
  assert.equal(sigTryPhantom(), false);
});

test("ビリー: 同じ敵に当てるほど痛い。 ジャック: 近いほど痛い。 許褚: HP が減ると攻撃も速さも上がる", () => {
  resetSignature({ heroId: 4006 });
  const e = { x: 300, y: 0 };
  assert.deepEqual([sigDamageMul(e), sigDamageMul(e), sigDamageMul(e)], [1, 1 + ONE_HOLE.step, 1 + 2 * ONE_HOLE.step]);
  assert.equal(sigDamageMul({ x: 0, y: 0 }), 1, "ほかの敵は 1 から");
  resetSignature({ heroId: 2003 });
  assert.equal(sigDamageMul({ x: 0, y: 0 }), LANGER.max);
  assert.equal(sigDamageMul({ x: 500, y: 0 }), 1);
  resetSignature({ heroId: 2013 });
  assert.equal(sigSpeedMul(), 1);
  state.stats.hp = 20;
  assert.equal(sigSpeedMul(), TIGER.max);
  assert.equal(sigDamageMul({ x: 0, y: 0 }), TIGER.max);
});

test("ドレーク: CE を拾うと少しのあいだ速く・広く", () => {
  resetSignature({ heroId: 4052 });
  assert.equal(sigSpeedMul(), 1);
  sigOnGemsPicked(1);
  assert.equal(sigSpeedMul(), PIRATE.speed);
  assert.equal(sigPickupMul(), PIRATE.pickup);
  tickSignature(PIRATE.boostS + 0.01, () => {});
  assert.equal(sigSpeedMul(), 1);
});

test("アナスタシア: 倒れる一撃を 1 ステージに 1 度だけ HP 1 で耐える (= 次のステージでまた使える)", () => {
  resetSignature({ heroId: 2016 });
  state.stats.hp = 0;
  assert.equal(sigTryPhantom(), true);
  assert.equal(state.stats.hp, 1);
  assert.equal(state.battle.contactCooldownMs, PHANTOM.iframeMs);
  state.stats.hp = 0;
  assert.equal(sigTryPhantom(), false);
  resetSignature({ heroId: 2016 });
  assert.equal(sigTryPhantom(), true);
});

test("大長今: 毎秒の回復と、 回復アイテムが倍", () => {
  resetSignature({ heroId: 1007 });
  assert.ok(sigRegenPerSec() > 0);
  assert.equal(sigHealMul(), 2);
});

test("ピタゴラス: 4 回目ごとのピックで 2 段 (= スキップは数えない)", () => {
  resetSignature({ heroId: 1006 });
  const seen = [];
  for (let i = 0; i < 8; i++) { seen.push(sigNextPickSteps()); sigOnPicked(); }
  assert.deepEqual(seen, [1, 1, 1, 2, 1, 1, 1, 2]);
});

test("MCHウォーリアー: レベルアップで周りの敵へ一撃 (= 遠い敵には当たらない)", () => {
  resetSignature({ heroId: 10001 });
  state.battle.enemies = [{ x: 50, y: 0, r: 10 }, { x: SLASH.radius + 200, y: 0, r: 10 }];
  const hits = [];
  sigOnLevelUp(1, (i, dmg) => hits.push([i, dmg]));
  assert.deepEqual(hits, [[0, slashDmg(state.level)]]);
});

test("霧隠才蔵: 走ると霧を置き、 霧の中の敵に当たる。 止まっているあいだは置かない", () => {
  resetSignature({ heroId: 2043 });
  state.battle.player.moving = false;
  tickSignature(1, () => {});
  assert.equal(state.battle.sig.clouds.length, 0);
  state.battle.player.moving = true;
  state.battle.enemies = [{ x: 0, y: 0, r: 10 }];
  const hits = [];
  for (let i = 0; i < 30; i++) tickSignature(1 / 30, (j) => hits.push(j));
  assert.ok(state.battle.sig.clouds.length > 0);
  assert.ok(hits.length >= 1);
  assert.ok(state.battle.sig.clouds.length <= MIST.cap);
});

test("テスラ: 間隔ごとに近くの敵へ連鎖する雷", () => {
  resetSignature({ heroId: 4041 });
  state.battle.enemies = [{ x: 100, y: 0, r: 10 }, { x: 200, y: 0, r: 10 }];
  const hits = [];
  tickSignature(TESLA.everyS - 0.1, (i) => hits.push(i));
  assert.equal(hits.length, 0);
  tickSignature(0.2, (i) => hits.push(i));
  assert.equal(hits.length, 2);
  assert.equal(state.battle.sig.bolts.length, 1);
});
