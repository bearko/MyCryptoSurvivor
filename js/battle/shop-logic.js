// ============================================================
// battle/shop-logic.js — ショップの純関数 (= SPEC-109。 DOM に触れない。 tests/shop.test.mjs)
// ============================================================

import {
  SHOP_FIRST_MS, SHOP_EVERY_MS, SHOP_PER_STAGE, SHOP_PRICE, SHOP_PRICE_LL,
  SHOP_STAGE_MUL, SHOP_REROLL_COST, SHOP_GIFT_COST,
} from "../constants.js";

/** 店主 (= 商人のシャドーヒーロー。 絵は資産リポジトリの Image/Enemies/<enemyId>.png) */
export const MERCHANTS = [
  { id: "marco",    enemyId: 480,  quirk: "sale" },        // マルコ・ポーロ：1 品が半額
  { id: "magellan", enemyId: 821,  quirk: "extraOffer" },  // マゼラン：品が 1 枚多い
  { id: "gennai",   enemyId: 553,  quirk: "buffBias" },    // 平賀源内：強化の品が出やすい
  { id: "columbus", enemyId: 815,  quirk: "newBias" },     // コロンブス：まだ持っていない系列が出やすい
  { id: "gama",     enemyId: 1165, quirk: "freeReroll" },  // ヴァスコ・ダ・ガマ：リロールが 1 回無料
  { id: "kurohige", enemyId: 506,  quirk: "pirate" },      // 黒髭：ランクアップ 2 割引・新しい品 2 割増し
];
/** ステージ 2・3 の開始の前の店は決まった人 (= 「次の地へ向かう前に」) */
export const OPENING_MERCHANT = "marco";

/**
 * ショップで遊ぶか。 2026-10-20 から既定で ON (= 作者の決定「一旦本番に適用」)。 RTA でも (= SPEC-111)。
 * ?shop=0 か localStorage の mcs.shop = "0" で、 今までのレベルアップに戻せる (= 比べるため)
 */
export function isShopMode(search = _search(), storage = _storage()) {
  try {
    const q = new URLSearchParams(search ?? "").get("shop");
    if (q != null) return q !== "0";
    return storage?.getItem?.("mcs.shop") !== "0";
  } catch { return true; }
}

/** 来店で戻る HP (= 最大 HP の割合。 ウェーブの節目のひと息) */
export const SHOP_HEAL_RATIO = 0.1;
export function shopHealAmount(hp, maxHp, ratio = SHOP_HEAL_RATIO) {
  if (!(maxHp > 0) || hp <= 0) return 0;
  // HP は自然回復で小数になる (= 満タンまでの残りも小数)。 回復量は四捨五入した整数にする
  return Math.max(0, Math.round(Math.min(maxHp - hp, maxHp * ratio)));
}

/** 次の店までの帯の段階 (= 残り 10 秒で目立たせる。 SHOP_SOON_SEC) */
export const SHOP_SOON_SEC = 10;

/** そのステージの店が開く時刻 (= ステージの経過 ms) */
export function shopTimesMs(stageIdx, { atStart = true } = {}) {
  const idx = Math.min(SHOP_FIRST_MS.length - 1, Math.max(0, stageIdx | 0));
  // SPEC-152: ステージ 2・3 の開幕の店は節「先行オープン」で開く。 無ければステージ 1 と同じ 0:10 から
  const first = idx > 0 && !atStart ? SHOP_FIRST_MS[0] : SHOP_FIRST_MS[idx];
  return Array.from({ length: SHOP_PER_STAGE }, (_, i) => first + i * SHOP_EVERY_MS);
}

/** 5 の倍数に丸める (= 値段の見やすさ) */
export function roundTo5(v) {
  return Math.max(5, Math.round(v / 5) * 5);
}

/**
 * 品の値段。 行き先の段 (= レアリティ) で上がり、 ステージで掛かる。 店主の癖とセールも効く
 * @param {{nextLevel:number,isLL?:boolean,isNew?:boolean}} offer
 */
export function shopPrice(offer, stageIdx = 0, quirk = null, sale = false, cut = 0) {
  const lv = Math.max(1, Math.min(SHOP_PRICE.length, (offer?.priceLevel ?? offer?.nextLevel) | 0));   // SPEC-139: 仕込みのぶんは値段に入れない
  let p = offer?.isLL ? SHOP_PRICE_LL : SHOP_PRICE[lv - 1];
  p *= SHOP_STAGE_MUL[Math.min(SHOP_STAGE_MUL.length - 1, Math.max(0, stageIdx | 0))];
  if (quirk === "pirate") p *= offer?.isNew ? 1.2 : 0.8;
  if (sale) p *= 0.5;
  if (cut > 0) p *= 1 - cut;   // SPEC-131: 強化の目利き (= スキルツリー)
  return roundTo5(p);
}

/** SPEC-127: その品を無料にするギフト券の枚数 (= 行き先の段で傾斜。 LL は券では買えない → null) */
export function giftCost(offer) {
  if (!offer || offer.isLL) return null;
  const lv = Math.max(1, Math.min(SHOP_GIFT_COST.length, (offer.priceLevel ?? offer.nextLevel) | 0));
  return SHOP_GIFT_COST[lv - 1];
}

/** SPEC-130: 「ギフト券支払いを優先」 (= 既定はオン。 次に開いたときも覚えておく) */
export const GIFT_FIRST_KEY = "mcs.shopGiftFirst";
export function isGiftFirst(storage = globalThis.localStorage) {
  try { return storage?.getItem(GIFT_FIRST_KEY) !== "0"; } catch { return true; }
}
export function setGiftFirst(on, storage = globalThis.localStorage) {
  try { storage?.setItem(GIFT_FIRST_KEY, on ? "1" : "0"); } catch { /* 保存できなくても、 この店の中では効く */ }
}

/** ギフト券 (= マジックカード) で無料にできる品か (= gifts: 持っている枚数。 省くと枚数を問わない) */
export function giftable(offer, gifts = Infinity) {
  const n = giftCost(offer);
  return n != null && n <= gifts;
}

/** 店主を選ぶ (= 同じ人が続けて来ない)。 fixed なら決まった人 */
export function pickMerchant(prevId = null, rnd = Math.random, fixed = null) {
  if (fixed) return MERCHANTS.find((m) => m.id === fixed) ?? MERCHANTS[0];
  const pool = MERCHANTS.filter((m) => m.id !== prevId);
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/** 払うリロールの値段 (= この店で払った回数 n。 5 → 10 → 15 …) */
export function rerollCost(paidSoFar = 0) {
  return SHOP_REROLL_COST * (Math.max(0, paidSoFar | 0) + 1);
}

/** お断りできるか (= 初期武器と LL は断れない。 回数が残っているとき) */
export function canBan(offer, starterExtId, bansLeft) {
  if (!offer || offer.isLL || (bansLeft | 0) <= 0) return false;
  return String(offer.extId) !== String(starterExtId);
}

/** 次の店までの割合 (= HUD の帯。 0..1)。 もう店が無ければ 1 */
export function shopProgress(elapsedMs, stageIdx, nextIdx) {
  const times = shopTimesMs(stageIdx);
  if (nextIdx >= times.length) return 1;
  const to = times[nextIdx];
  const from = nextIdx > 0 ? times[nextIdx - 1] : 0;
  if (to <= from) return 1;
  return Math.max(0, Math.min(1, (elapsedMs - from) / (to - from)));
}

/** 次の店までの秒 (= 切り上げ。 HUD の下の札) */
export function nextShopSec(elapsedMs, stageIdx, nextIdx) {
  const times = shopTimesMs(stageIdx);
  if (nextIdx >= times.length) return null;
  return Math.max(0, Math.ceil((times[nextIdx] - elapsedMs) / 1000));
}

function _search() { try { return globalThis.location?.search ?? ""; } catch { return ""; } }
function _storage() { try { return globalThis.localStorage ?? null; } catch { return null; } }

