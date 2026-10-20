// SPEC-109: ショップ (= 店の時刻・値段・店主・リロール・お断り)
// 実行: node --test tests/shop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const {
  MERCHANTS, OPENING_MERCHANT, isShopMode, shopTimesMs, roundTo5, shopPrice, giftable,
  pickMerchant, rerollCost, canBan, shopProgress,
} = await import("../js/battle/shop-logic.js");

const store = (v) => ({ getItem: (k) => (k === "mcs.shop" ? v : null) });

test("ショップは ?shop=1 か mcs.shop のときだけ (= 作りかけのあいだのフラグ)", () => {
  assert.equal(isShopMode("?shop=1", store(null)), true);
  assert.equal(isShopMode("?debug=1&shop=1", store(null)), true);
  assert.equal(isShopMode("", store("1")), true);
  assert.equal(isShopMode("", store(null)), false);
  assert.equal(isShopMode("?shop=0", store(null)), false);
  assert.equal(isShopMode("", { getItem() { throw new Error("blocked"); } }), false);
});

test("店の時刻: ステージ 1 は 0:10 から、 ステージ 2・3 は開始の前から 40 秒ごとに 6 回 (= SPEC-103 Q2)", () => {
  assert.deepEqual(shopTimesMs(0), [10000, 50000, 90000, 130000, 170000, 210000]);
  assert.deepEqual(shopTimesMs(1), [0, 40000, 80000, 120000, 160000, 200000]);
  assert.deepEqual(shopTimesMs(2), shopTimesMs(1));
  // ボスの予告 (= 3:50) より前に終わる
  for (const i of [0, 1, 2]) assert.ok(Math.max(...shopTimesMs(i)) < 230000);
});

test("値段は行き先の段で上がり、 ステージで ×1.8・×2.6 (= 5 の倍数)", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((nextLevel) => shopPrice({ nextLevel })), [15, 25, 40, 60, 90]);
  assert.equal(shopPrice({ nextLevel: 6, isLL: true }), 150);
  assert.equal(shopPrice({ nextLevel: 1 }, 1), 25);   // 15 × 1.8 = 27 → 25
  assert.equal(shopPrice({ nextLevel: 5 }, 2), 235);  // 90 × 2.6 = 234 → 235
  for (const st of [0, 1, 2]) for (const lv of [1, 2, 3, 4, 5]) assert.equal(shopPrice({ nextLevel: lv }, st) % 5, 0);
  // 上の段ほど高い
  for (const st of [0, 1, 2]) for (const lv of [1, 2, 3, 4]) assert.ok(shopPrice({ nextLevel: lv + 1 }, st) > shopPrice({ nextLevel: lv }, st));
  assert.equal(roundTo5(1), 5);
});

test("黒髭はランクアップ 2 割引・新しい品 2 割増し、 マルコ・ポーロのセールは半額", () => {
  assert.equal(shopPrice({ nextLevel: 3, isNew: false }, 0, "pirate"), 30);   // 40 × 0.8 = 32 → 30
  assert.equal(shopPrice({ nextLevel: 1, isNew: true }, 0, "pirate"), 20);    // 15 × 1.2 = 18 → 20
  assert.equal(shopPrice({ nextLevel: 4 }, 0, "sale", true), 30);
  assert.equal(shopPrice({ nextLevel: 4 }, 0, "sale", false), 60);
});

test("ギフト券でただになるのは行き先 Lv.4 まで (= LL はならない)", () => {
  assert.equal(giftable({ nextLevel: 4 }), true);
  assert.equal(giftable({ nextLevel: 5 }), false);
  assert.equal(giftable({ nextLevel: 6, isLL: true }), false);
  assert.equal(giftable(null), false);
});

test("店主は 6 人。 同じ人が続けて来ない。 ステージ 2・3 の開始の前はマルコ・ポーロ", () => {
  assert.equal(MERCHANTS.length, 6);
  assert.deepEqual(MERCHANTS.map((m) => m.enemyId), [480, 821, 553, 815, 1165, 506]);
  assert.equal(new Set(MERCHANTS.map((m) => m.quirk)).size, 6);
  for (const m of MERCHANTS) {
    for (const r of [0, 0.2, 0.5, 0.99]) assert.notEqual(pickMerchant(m.id, () => r).id, m.id);
  }
  assert.equal(pickMerchant("marco", () => 0.5, OPENING_MERCHANT).id, "marco");
});

test("払うリロールは 5 → 10 → 15", () => {
  assert.deepEqual([0, 1, 2, 3].map(rerollCost), [5, 10, 15, 20]);
});

test("お断り: 初期武器と LL は断れない。 回数が尽きたら断れない", () => {
  assert.equal(canBan({ extId: 3, nextLevel: 1 }, 1, 3), true);
  assert.equal(canBan({ extId: 1, nextLevel: 2 }, 1, 3), false);
  assert.equal(canBan({ extId: 1, nextLevel: 6, isLL: true }, 9, 3), false);
  assert.equal(canBan({ extId: 3, nextLevel: 1 }, 1, 0), false);
});

test("HUD の帯: 次の店までの割合", () => {
  assert.equal(shopProgress(0, 0, 0), 0);
  assert.equal(shopProgress(5000, 0, 0), 0.5);
  assert.equal(shopProgress(30000, 0, 1), 0.5);    // 0:10 → 0:50 の半ば
  assert.equal(shopProgress(100, 1, 0), 1);         // ステージ 2 の開始前の店 (= 0 ms)
  assert.equal(shopProgress(999999, 0, 6), 1);      // もう店は無い
});

test("画面とつなぎ: 店の窓・CSS・i18n・店主の名前", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["shopModal", "shopMerchantImg", "shopCe", "shopGrid", "shopReroll", "shopLeave", "shopBans", "shopBansLeft"]) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.ok(html.includes('href="css/shop.css"'));
  assert.ok(existsSync(new URL("../css/shop.css", import.meta.url)));
  const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
  for (const m of MERCHANTS) {
    assert.ok(ui[`shop.m.${m.id}.name`]?.ja && ui[`shop.m.${m.id}.name`]?.en, m.id);
    assert.ok(ui[`shop.m.${m.id}.line`]?.ja && ui[`shop.m.${m.id}.line`]?.en, m.id);
  }
  // 拾った CE はショップでは財布へ、 マジックカードはギフト券へ
  const gems = readFileSync(new URL("../js/battle/gems.js", import.meta.url), "utf8");
  assert.match(gems, /if \(state\.shop\) addShopCe\(whole\)/);
  const cards = readFileSync(new URL("../js/battle/magic-cards.js", import.meta.url), "utf8");
  assert.match(cards, /addShopGift\(picked\)/);
});
