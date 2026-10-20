// SPEC-110: 固有スキルの強化 (= ショップの常設の札。 Lv.1 → Lv.5、 ステージをまたいで残る)
// 実行: node --test tests/sig-upgrade.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIGNATURE_OF, sigParams, sigLevel, SIG_MAX_LEVEL, SIG_UP_PRICE, resetSignature, sigDamageMul, sigTryPhantom,
  sigNextPickSteps, sigOnPicked, sigOnLevelUp, sigRegenPerSec, sigHealMul,
  ONE_HOLE, LANGER, TIGER, PIRATE, PHANTOM, MIST, TESLA, SLASH, TETRACTYS, UINYEO, slashDmg,
} from "../js/battle/signature.js";
import { state } from "../js/state.js";

const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

beforeEach(() => {
  state.shop = null;
  state.battle.player = { x: 0, y: 0, r: 12 };
  state.battle.enemies = [];
  state.stats.hp = 100;
  state.statsMax.hp = 100;
  state.level = 5;
});

test("Lv.1 はいまの数値そのまま (= ショップでなくても同じ遊び)", () => {
  assert.deepEqual(sigParams("cryptoSlash", 1), { dmgMul: 1, radius: SLASH.radius });
  assert.deepEqual(sigParams("oneHole", 1), { max: ONE_HOLE.max });
  assert.deepEqual(sigParams("poisonMist", 1), { dmgMul: 1, lifeS: MIST.lifeS });
  assert.deepEqual(sigParams("langer", 1), { max: LANGER.max, range: LANGER.range });
  assert.deepEqual(sigParams("teslaCoil", 1), { hops: TESLA.hops, everyS: TESLA.everyS });
  assert.deepEqual(sigParams("tetractys", 1), { every: TETRACTYS.every, steps: TETRACTYS.steps });
  assert.deepEqual(sigParams("tiger", 1), { max: TIGER.max });
  assert.deepEqual(sigParams("queenPirate", 1), { boostS: PIRATE.boostS, pickup: PIRATE.pickup });
  assert.deepEqual(sigParams("phantom", 1), { uses: 1, iframeMs: PHANTOM.iframeMs });
  assert.deepEqual(sigParams("uinyeo", 1), { regenPerSec: UINYEO.regenPerSec, healMul: UINYEO.healMul });
  assert.equal(sigLevel(), 1);
});

test("Lv.5 は SPEC-103 5 章の表どおり", () => {
  assert.deepEqual(sigParams("cryptoSlash", 5), { dmgMul: 3, radius: 230 });
  assert.deepEqual(sigParams("oneHole", 5), { max: 3 });
  assert.deepEqual(sigParams("poisonMist", 5), { dmgMul: 3, lifeS: 4 });
  assert.deepEqual(sigParams("langer", 5), { max: 2.6, range: 220 });
  assert.deepEqual(sigParams("teslaCoil", 5), { hops: 6, everyS: 1.4 });   // 連鎖 3 → 7 体
  assert.deepEqual(sigParams("tiger", 5), { max: 2.2 });
  assert.deepEqual(sigParams("queenPirate", 5), { boostS: 3, pickup: 2.2 });
  assert.deepEqual(sigParams("phantom", 5), { uses: 2, iframeMs: 5000 });
  assert.deepEqual(sigParams("uinyeo", 5), { regenPerSec: 2, healMul: 3 });
  // テトラクテュス: Lv.3 から 3 品目ごと、 Lv.5 で 3 段
  assert.deepEqual([1, 2, 3, 4, 5].map((lv) => sigParams("tetractys", lv)),
    [{ every: 4, steps: 2 }, { every: 4, steps: 2 }, { every: 3, steps: 2 }, { every: 3, steps: 2 }, { every: 3, steps: 3 }]);
  // 幻の生存者は Lv.4 から 2 度
  assert.deepEqual([1, 2, 3, 4, 5].map((lv) => sigParams("phantom", lv).uses), [1, 1, 1, 2, 2]);
});

test("段が上がるほど伸びる (= 下がらない)", () => {
  for (const kind of new Set(Object.values(SIGNATURE_OF))) {
    for (let lv = 1; lv < SIG_MAX_LEVEL; lv++) {
      const a = sigParams(kind, lv), b = sigParams(kind, lv + 1);
      for (const k of Object.keys(a)) {
        if (k === "everyS" || k === "every") assert.ok(b[k] <= a[k], `${kind}.${k}`);
        else assert.ok(b[k] >= a[k], `${kind}.${k}`);
      }
    }
  }
});

test("SPEC-123: 10 段。 値段は Lv.2〜10 で後ろほど急に高い", () => {
  assert.equal(SIG_MAX_LEVEL, 10);
  assert.equal(SIG_UP_PRICE.length, SIG_MAX_LEVEL - 1);
  assert.deepEqual(SIG_UP_PRICE, [40, 100, 250, 500, 1000, 2000, 4000, 8000, 16000]);
  for (let i = 1; i < SIG_UP_PRICE.length; i++) assert.ok(SIG_UP_PRICE[i] >= SIG_UP_PRICE[i - 1] * 2, `step ${i}`);   // 1 段ごとに 2 倍以上
});

test("SPEC-123: Lv.10 の数値 (= Lv.5 は SPEC-110 のまま)", () => {
  assert.deepEqual(sigParams("cryptoSlash", 10), { dmgMul: 5, radius: 300 });
  assert.deepEqual(sigParams("oneHole", 10), { max: 4 });
  assert.deepEqual(sigParams("poisonMist", 10), { dmgMul: 5, lifeS: 6 });
  assert.deepEqual(sigParams("langer", 10), { max: 3.4, range: 280 });
  assert.deepEqual(sigParams("teslaCoil", 10), { hops: 10, everyS: 0.9 });
  assert.deepEqual(sigParams("tetractys", 10), { every: 2, steps: 4 });
  assert.deepEqual(sigParams("tiger", 10), { max: 3 });
  assert.deepEqual(sigParams("queenPirate", 10), { boostS: 5, pickup: 3 });
  assert.deepEqual(sigParams("phantom", 10), { uses: 3, iframeMs: 8000 });
  assert.deepEqual(sigParams("uinyeo", 10), { regenPerSec: 4, healMul: 5 });
  assert.deepEqual(sigParams("teslaCoil", 7), { hops: 8, everyS: 1.2 });
});

test("強化段は戦闘の中で効く (= state.shop.sigLevel)", () => {
  state.shop = { sigLevel: 5 };
  resetSignature({ heroId: 2013 });   // 許褚
  state.stats.hp = 10;
  assert.equal(sigDamageMul({ x: 0, y: 0 }), 2.2);
  resetSignature({ heroId: 1007 });   // 大長今
  assert.equal(sigRegenPerSec(), 2);
  assert.equal(sigHealMul(), 3);
  // テトラクテュス Lv.5: 3 品目で 3 段
  resetSignature({ heroId: 1006 });
  assert.deepEqual([1, 2, 3].map(() => { const n = sigNextPickSteps(); sigOnPicked(); return n; }), [1, 1, 3]);
  // クリプトスラッシュ Lv.5: 威力 ×3・半径 230
  resetSignature({ heroId: 10001 });
  state.battle.enemies = [{ x: 200, y: 0, r: 10 }, { x: 400, y: 0, r: 10 }];
  const hits = [];
  sigOnLevelUp(1, (i, d) => hits.push([i, d]));
  assert.deepEqual(hits, [[0, slashDmg(5) * 3]]);
});

test("幻の生存者: Lv.4 からは 1 ステージに 2 度耐える", () => {
  state.shop = { sigLevel: 4 };
  resetSignature({ heroId: 2016 });
  assert.equal(sigTryPhantom(), true);
  assert.equal(sigTryPhantom(), true);
  assert.equal(sigTryPhantom(), false);
  state.shop = null;
  resetSignature({ heroId: 2016 });
  assert.equal(sigTryPhantom(), true);
  assert.equal(sigTryPhantom(), false);
});

test("画面とつなぎ: 常設の札・i18n", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="shopSig"'));
  const shop = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.match(shop, /sigLevel: s\.sigLevel/);   // やり直しでは入ったときの段に戻す
  for (const kind of new Set(Object.values(SIGNATURE_OF))) {
    for (const k of Object.keys(sigParams(kind, 1))) assert.ok(ui[`shop.sig.${kind}.${k}`]?.ja && ui[`shop.sig.${kind}.${k}`]?.en, `${kind}.${k}`);
  }
});
