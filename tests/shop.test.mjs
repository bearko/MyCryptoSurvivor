// SPEC-109: ショップ (= 店の時刻・値段・店主・リロール・お断り)
// 実行: node --test tests/shop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const {
  MERCHANTS, OPENING_MERCHANT, isShopMode, shopTimesMs, roundTo5, shopPrice, giftable, giftCost, isGiftFirst, setGiftFirst, GIFT_FIRST_KEY,
  pickMerchant, rerollCost, canBan, shopProgress, nextShopSec, shopHealAmount, SHOP_HEAL_RATIO, SHOP_SOON_SEC,
} = await import("../js/battle/shop-logic.js");

const store = (v) => ({ getItem: (k) => (k === "mcs.shop" ? v : null) });

test("ショップは既定で ON (= 2026-10-20 本番に適用)。 ?shop=0 か mcs.shop=0 で今までのレベルアップ", () => {
  assert.equal(isShopMode("", store(null)), true);
  assert.equal(isShopMode("?shop=1", store("0")), true);
  assert.equal(isShopMode("?debug=1&shop=0", store(null)), false);
  assert.equal(isShopMode("", store("0")), false);
  assert.equal(isShopMode("", store("1")), true);
  assert.equal(isShopMode("", { getItem() { throw new Error("blocked"); } }), true);
  // SPEC-111: RTA でもショップ (= rtaMode で外さない)
  const idx = readFileSync(new URL("../js/battle/index.js", import.meta.url), "utf8");
  assert.match(idx, /if \(isShopMode\(\)\) \{/);   // SPEC-147: ステージ 1 からショップ (= SPEC-146 の「初回はショップなし」は外した)
  assert.doesNotMatch(idx, /isShopMode\(\) && !state\.rtaMode/);
});

test("来店で HP が少し戻る (= 最大 HP の 1 割。 満タンを超えない・倒れていたら戻さない)", () => {
  assert.equal(shopHealAmount(50, 200), 20);
  assert.equal(shopHealAmount(195, 200), 5);
  assert.equal(shopHealAmount(200, 200), 0);
  assert.equal(shopHealAmount(0, 200), 0);
  assert.equal(SHOP_HEAL_RATIO, 0.1);
});

test("店の時刻: ステージ 1 は 0:10 から、 ステージ 2・3 は開始の前から 40 秒ごとに 6 回 (= SPEC-103 Q2)", () => {
  assert.deepEqual(shopTimesMs(0), [10000, 50000, 90000, 130000, 170000, 210000]);
  assert.deepEqual(shopTimesMs(1), [0, 40000, 80000, 120000, 160000, 200000]);
  assert.deepEqual(shopTimesMs(2), shopTimesMs(1));
  // SPEC-152: 開幕の店は節「先行オープン」で。 無ければステージ 1 と同じ 0:10 から
  assert.deepEqual(shopTimesMs(1, { atStart: false }), shopTimesMs(0));
  assert.deepEqual(shopTimesMs(0, { atStart: false }), shopTimesMs(0));
  // ボスの予告 (= 3:50) より前に終わる
  for (const i of [0, 1, 2]) assert.ok(Math.max(...shopTimesMs(i)) < 230000);
});

test("値段は行き先の段で上がり、 ステージで ×1.8・×2.6 (= 5 の倍数)", () => {
  // SPEC-162: 15 段 (= Lv10 まで合計 3,555・Lv15 まで 24,555)
  assert.deepEqual([1, 2, 3, 4, 5, 10, 15].map((nextLevel) => shopPrice({ nextLevel })), [15, 20, 30, 50, 90, 800, 3300]);   // SPEC-163
  assert.equal(shopPrice({ nextLevel: 16, isLL: true }), 20000);
  assert.equal(shopPrice({ nextLevel: 1 }, 1), 25);   // 15 × 1.8 = 27 → 25
  assert.equal(shopPrice({ nextLevel: 15 }, 2), 8580);  // 3300 × 2.6
  for (const st of [0, 1, 2]) for (let lv = 1; lv <= 15; lv++) assert.equal(shopPrice({ nextLevel: lv }, st) % 5, 0);
  // 上の段ほど高い
  for (const st of [0, 1, 2]) for (let lv = 1; lv < 15; lv++) assert.ok(shopPrice({ nextLevel: lv + 1 }, st) > shopPrice({ nextLevel: lv }, st));
  assert.equal(roundTo5(1), 5);
});

test("黒髭はランクアップ 2 割引・新しい品 2 割増し、 マルコ・ポーロのセールは半額", () => {
  assert.equal(shopPrice({ nextLevel: 10, isNew: false }, 0, "pirate"), 640);   // 800 × 0.8 (= SPEC-163)
  assert.equal(shopPrice({ nextLevel: 1, isNew: true }, 0, "pirate"), 20);    // 15 × 1.2 = 18 → 20
  assert.equal(shopPrice({ nextLevel: 10 }, 0, "sale", true), 400);
  assert.equal(shopPrice({ nextLevel: 10 }, 0, "sale", false), 800);
});

test("SPEC-127: ギフト券の枚数は段で傾斜 (= LL は券では買えない)", () => {
  // SPEC-127: 枚数は段で傾斜 (= Common・Uncommon 1 / Rare 2 / Epic 3 / Legendary 5)。 LL は券では買えない
  // SPEC-162: 段ではなくランク (= 3 段ごと) で傾斜
  assert.deepEqual([1, 4, 7, 10, 13].map((nextLevel) => giftCost({ nextLevel })), [1, 1, 2, 3, 5]);
  assert.deepEqual([2, 3, 6, 9, 12, 15].map((nextLevel) => giftCost({ nextLevel })), [1, 1, 1, 2, 3, 5]);
  assert.equal(giftCost({ nextLevel: 16, isLL: true }), null);
  assert.equal(giftable({ nextLevel: 13 }), true);
  assert.equal(giftable({ nextLevel: 13 }, 4), false);
  assert.equal(giftable({ nextLevel: 7 }, 2), true);
  assert.equal(giftable({ nextLevel: 7 }, 1), false);
  assert.equal(giftable({ nextLevel: 16, isLL: true }, 99), false);
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

test("次の店までの秒 (= 切り上げ。 もう店が無ければ null)", () => {
  assert.equal(nextShopSec(10000, 0, 1), 40);     // 0:10 の店のあと → 0:50 まで 40 秒
  assert.equal(nextShopSec(49001, 0, 1), 1);
  assert.equal(nextShopSec(50000, 0, 1), 0);
  assert.equal(nextShopSec(5000, 1, 1), 35);      // ステージ 2: 0:40 まで
  assert.equal(nextShopSec(0, 0, 6), null);
});

test("最初の店はサービスで 1 品無料・説明の文がある・ヘッダーに次の店までの帯", () => {
  const shop = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.match(shop, /if \(state\.shop\.welcome && !offer\.isLL\) return 0;/);
  assert.match(shop, /info\.sec <= SHOP_SOON_SEC/);   // 残り 10 秒で目立つ
  assert.equal(SHOP_SOON_SEC, 10);
  // 帯を歩いてきた商人が店番をする
  assert.match(shop, /_merchant = MERCHANTS\.find\(\(m\) => m\.id === s\.nextMerchant\)/);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="shopIntro"') && html.includes('id="shopBar"') && html.includes('id="shopBarWalker"'));
  assert.ok(!html.includes('id="shopNext"'));
  // 帯は HUD の中
  assert.ok(html.indexOf('id="shopBar"') > html.indexOf('id="hud"') && html.indexOf('id="shopBar"') < html.indexOf("</section>", html.indexOf('id="hud"')));
  const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
  for (const k of ["shop.intro", "shop.bar.label", "shop.bar.sec", "shop.bar.done", "shop.healed", "shop.welcomeFree", "coach.ce"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});

test("スマホのショップ: 装備中と手持ちを 1 行 (= 8:2)・ボスまでの回数は商人の名前の横", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const status = html.slice(html.indexOf('class="shop-status"'), html.indexOf('class="shop-body"'));
  assert.ok(status.includes('id="shopOwned"') && status.includes('id="shopCe"'), "装備中と手持ちが同じ段");
  const title = html.slice(html.indexOf('id="shopTitle"'), html.indexOf("</h2>", html.indexOf('id="shopTitle"')));
  assert.ok(title.includes('id="shopSub"'), "ボスまでの回数は名前の横");
  const css = readFileSync(new URL("../css/shop.css", import.meta.url), "utf8");
  assert.match(css, /\.shop-status \{ display: grid; grid-template-columns: minmax\(0, 8fr\) minmax\(0, 2fr\);/);
  assert.match(css, /\.shop-grid\[data-n="5"\] \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
});

test("来店の回復は四捨五入した整数 (= HP が自然回復で小数でも)", () => {
  assert.equal(shopHealAmount(140.214, 147), 7);          // 満タンまで 6.786 → 7
  assert.ok(Number.isInteger(shopHealAmount(100.5, 147)));
  assert.equal(shopHealAmount(146.6, 147), 0);            // 0.4 → 0
});

test("取り置き・お断りは札の角のアイコン。 お断りは 2 回で確定、 リロールは売り切れの枠を残す (= SPEC-167)", () => {
  const shop = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.match(shop, /shop-corner shop-corner--lock/);
  assert.match(shop, /shop-corner shop-corner--ban/);
  assert.match(shop, /if \(o\.banArm\) \{ banOffer\(extId\); return; \}/);
  assert.match(shop, /_offers = _keptOffers\(\);/);
  assert.match(shop, /function _keptOffers\(\) \{ return _offers\.filter\(\(o\) => o\.sold \|\| state\.shop\.locked\.includes\(o\.extId\)\); \}/);
  const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
  assert.equal(ui["shop.banArm"].ja, "もう一度タップで今後表示しない");
});

test("お断りした品は、 番号が数でも二度と並ばない (= 文字で比べる)", () => {
  const src = readFileSync(new URL("../js/battle/levelup.js", import.meta.url), "utf8");
  assert.equal((src.match(/new Set\(\[\.\.\.bannedIn\]\.map\(String\)\)/g) ?? []).length, 2);
});

test("SPEC-130: 「ギフト券支払いを優先」は既定オンで、 切り替えを覚えておく (= 保存できなくてもオンのまま)", () => {
  const mem = new Map();
  const store = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  assert.equal(isGiftFirst(store), true);
  setGiftFirst(false, store);
  assert.equal(mem.get(GIFT_FIRST_KEY), "0");
  assert.equal(isGiftFirst(store), false);
  setGiftFirst(true, store);
  assert.equal(isGiftFirst(store), true);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(isGiftFirst(broken), true);
  assert.doesNotThrow(() => setGiftFirst(false, broken));
  assert.ok(GIFT_FIRST_KEY.startsWith("mcs."));
  const src = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.match(src, /if \(_giftFirst && giftable\(offer, state\.shop\.gifts\)\) return 0;/);
  assert.ok(readFileSync(new URL("../index.html", import.meta.url), "utf8").includes('id="shopGiftFirst"'));
});

// ---- SPEC-167: 店の枠 (= 買った枠は売り切れのまま・引き直せる枠も品も無ければリロールできない) ----
test("SPEC-167: 枠の数まで買える・売り切れは引き直さない・在庫が尽きたらリロールできない", async () => {
  const { EXT_ROSTER, EXT_DEFS } = await import("../js/extensions.js");
  const { state } = await import("../js/state.js");
  const { freshCount } = await import("../js/battle/levelup.js");
  const shop = await import("../js/battle/shop.js");
  const { MERCHANTS } = await import("../js/battle/shop-logic.js");
  const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8")).extensions;
  EXT_ROSTER.length = 0;
  for (const e of EXT) { EXT_ROSTER.push(e); EXT_DEFS[String(e.extId)] = e; }
  state.ownedExtensions = [];
  state.battle = { ...(state.battle ?? {}), starterExtId: 1 };
  state.shop = { ce: 999, bans: [], locked: [], freeRerolls: 0 };
  const all = new Set(EXT_ROSTER.map((e) => String(e.extId)));
  assert.equal(freshCount({ exclude: all }), 0, "全部除けば 0");
  assert.equal(freshCount({ exclude: new Set() }), all.size);

  const magellan = MERCHANTS.find((m) => m.quirk === "extraOffer");
  const marco = MERCHANTS.find((m) => m.quirk === "sale");
  const ids = EXT_ROSTER.slice(0, 5).map((e) => e.extId);
  // マゼランの 5 枠を全部買った → 引き直せる枠が無い
  shop._test.merchant = magellan;
  shop._test.series = [];
  shop._test.offers = ids.map((id) => ({ extId: id, sold: true }));
  assert.equal(shop.canReroll(), false, "5 枠すべて売り切れ");
  // 1 枠でも残っていれば引き直せる (= ほかに並べられる品がある)
  shop._test.offers = ids.map((id, i) => ({ extId: id, sold: i < 4 }));
  assert.equal(shop.canReroll(), true);
  // 並べる品が尽きた (= この店で全系列を並べた) → できない
  shop._test.series = EXT_ROSTER.map((e) => e.series ?? e.seriesName?.ja ?? String(e.extId));
  assert.equal(shop.canReroll(), false, "在庫切れ");
  // 4 枠の店で 4 つ売り切れ → できない (= 4 つまで)、 マゼランは 5 枠なのでもう 1 つ買える
  shop._test.series = [];
  shop._test.merchant = marco;
  shop._test.offers = ids.slice(0, 4).map((id) => ({ extId: id, sold: true }));
  assert.equal(shop.canReroll(), false);
  shop._test.merchant = magellan;
  assert.equal(shop.canReroll(), true, "マゼランは 5 枠");
  // 取り置きも引き直さない
  shop._test.merchant = marco;
  shop._test.offers = ids.slice(0, 4).map((id, i) => ({ extId: id, sold: i < 3 }));
  state.shop.locked = [ids[3]];
  assert.equal(shop.canReroll(), false, "売り切れ 3 + 取り置き 1");
  state.shop.locked = [];
  assert.equal(shop.canReroll(), true);
});

test("SPEC-167: 買える数の上限は枠の数 (= SHOP_MAX_BUYS は無い)。 リロールのボタンは引き直せないとき押せない", () => {
  const src = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /SHOP_MAX_BUYS/);
  assert.match(src, /rr\.disabled = cost > s\.ce \|\| !canReroll\(\);/);
  assert.match(src, /if \(cost > s\.ce \|\| !canReroll\(\)\) return;/);
  assert.match(src, /reroll: currentRerollCost\(\) <= s\.ce && canReroll\(\)/, "5-1 のリロールの関所は、 できなければ開く");
  const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
  assert.equal(ui["shop.sold"].ja, "売り切れ");
});

// ---- SPEC-170: リロールで見送った品はまた並ぶ (= 買った系列だけ出さない)・サブの武器の段は 2 倍の値段 ----
test("SPEC-170: この店で出さないのは買った系列だけ (= 並べただけの系列は数えない)", () => {
  const src = readFileSync(new URL("../js/battle/shop.js", import.meta.url), "utf8");
  assert.match(src, /o\.sold = true;\n  _noteSeries\(extId\);/, "買ったときだけ覚える");
  assert.equal((src.match(/_noteSeries\(/g) ?? []).length, 2, "開いたとき・リロールのあとには覚えない (= 定義と買ったとき)");
});

test("SPEC-170: サブの武器の段は、 店でそのランクアップを買うときの 2 倍", async () => {
  const shop = await import("../js/battle/shop.js");
  const { shopPrice } = await import("../js/battle/shop-logic.js");
  const { state } = await import("../js/state.js");
  assert.equal(shop.SUB_UP_PRICE_MUL, 2);
  shop._test.merchant = { id: "marco", quirk: "sale" };
  state.currentStageIdx = 1;
  state.battle = { ...(state.battle ?? {}), subs: [{ heroId: 1, extId: 7, level: 3 }] };
  assert.equal(shop.subUpPrice(0), shopPrice({ nextLevel: 4 }, 1) * 2);
});
