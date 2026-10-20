// ============================================================
// battle/shop.js — ショップ (= SPEC-109。 レベルアップの置き換え)
// ============================================================
//
// 一定時間ごとに店が開き、 拾った CE で品を買う。 店番は商人のシャドーヒーロー (= 1 人 1 つの癖)。
// 取り置き (= 次の店にも残す)・お断り (= その系列を挑戦のあいだ出さない)・リロール (= CE を払う)。
// 作りかけのあいだは ?shop=1 (= か localStorage の mcs.shop = "1") のときだけ効く。 SPEC-111 でフラグを外す。
//
// pauseFlags 不変条件: openShop で pauseTime + 1、 closeShop で resumeTime + 1。
// 閉じたあとの 3 秒は SPEC-104 (= resume-countdown.js) が数える。

import { state, pauseTime, resumeTime } from "../state.js";
import {
  img, SFX, SHOP_PER_STAGE, SHOP_OFFERS, SHOP_BANS, SHOP_FREE_REROLLS, SHOP_HEADSTART_CE,
} from "../constants.js";
import { getExt, extTierImg, getSeriesName } from "../extensions.js";
import { samplePicks, offerFor, grantPick, buildPickCard, renderOwnedStrip } from "./levelup.js";
import { perk } from "../perks.js";
import { t, tpl, getLang, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";
import { sigOnLevelUp } from "./signature.js";
import { hitEnemy } from "./damage.js";

import {
  MERCHANTS, OPENING_MERCHANT, isShopMode, shopTimesMs, shopPrice, giftable, pickMerchant, rerollCost, canBan,
} from "./shop-logic.js";
export { isShopMode, shopTimesMs, shopProgress } from "./shop-logic.js";

// ============================================================
// 挑戦・ステージの始まり (= battle/index.js の startBattle)
// ============================================================

function _fresh() {
  return {
    ce: 0, gifts: 0, bans: [], bansLeft: SHOP_BANS,
    locked: [], nextIdx: 0, prevMerchant: null, purchases: 0,
    freeRerolls: 0, enteredIdx: -1, snapshot: null,
  };
}

/**
 * ステージの始まり。 ステージ 1 なら空から。 同じステージのやり直し (= メニュー) なら、 入ったときの財布に戻す
 * @returns {object} state.shop
 */
export function resetShopForStage(stageIdx) {
  const idx = stageIdx | 0;
  if (idx === 0 || !state.shop) state.shop = _fresh();
  const s = state.shop;
  if (s.enteredIdx === idx && s.snapshot) {
    Object.assign(s, structuredClone(s.snapshot));
  } else {
    s.enteredIdx = idx;
    s.snapshot = { ce: s.ce, gifts: s.gifts, bans: [...s.bans], bansLeft: s.bansLeft, purchases: s.purchases };
  }
  s.locked = [];       // 装備がステージごとなので、 取り置きもステージで外れる
  s.nextIdx = 0;
  s.freeRerolls = SHOP_FREE_REROLLS + perk("reroll");
  s.ce += SHOP_HEADSTART_CE * perk("startLevels");   // SPEC-090c の「先手」「天才」は CE に読み替え
  state.level = 1 + s.purchases;                      // スコアと固有スキルの伸び (= 買った品の数)
  return s;
}

/** 拾った CE を財布へ (= gems.js) */
export function addShopCe(n) {
  if (!state.shop || n <= 0) return;
  state.shop.ce += n;
}

/** マジックカード → ギフト券 (= magic-cards.js) */
export function addShopGift(n = 1) {
  if (!state.shop || n <= 0) return;
  state.shop.gifts += n;
}

/** 毎フレーム (= battle/index.js の _step)。 時刻になったら店を開く */
export function tickShop() {
  const s = state.shop;
  const b = state.battle;
  if (!s || _open || !b.active || b.gameOver || b.bossSpawned) return;
  const times = shopTimesMs(state.currentStageIdx ?? 0);
  if (s.nextIdx >= times.length) return;
  if ((b.stageElapsedMs ?? 0) >= times[s.nextIdx]) {
    const opening = s.nextIdx === 0 && (state.currentStageIdx ?? 0) > 0;
    s.nextIdx += 1;
    openShop({ opening });
  }
}

// ============================================================
// 店の画面
// ============================================================

let _open = false;
let _wired = false;
let _merchant = MERCHANTS[0];
let _offers = [];        // [{extId, sale, sold}]
let _paidRerolls = 0;
let _gamaFree = 0;
let _boughtHere = 0;

export function isShopOpen() { return _open; }

export function openShop({ opening = false } = {}) {
  const s = state.shop;
  if (!s || _open) return;
  _open = true;
  _wireOnce();
  _merchant = pickMerchant(s.prevMerchant, Math.random, opening ? OPENING_MERCHANT : null);
  s.prevMerchant = _merchant.id;
  _paidRerolls = 0;
  _boughtHere = 0;
  _gamaFree = _merchant.quirk === "freeReroll" ? 1 : 0;
  // 取り置きは同じ札で残す (= 段が上がりきった・枠がいっぱいなら外れる)
  const banned = new Set(s.bans);
  const kept = s.locked.filter((id) => offerFor(id, banned));
  s.locked = kept;
  _offers = kept.map((id) => ({ extId: id, sale: false, sold: false }));
  _fillOffers();
  pauseTime();
  document.getElementById("shopModal")?.classList.remove("hidden");
  renderShop();
  playSe(SFX.LEVEL_UP, 100, 0.4);
}

/** 品を足りるまで引く (= 取り置きと売り切れはそのまま) */
function _fillOffers() {
  const n = SHOP_OFFERS + (_merchant.quirk === "extraOffer" ? 1 : 0);
  const keep = _offers.filter((o) => o.sold || state.shop.locked.includes(o.extId));
  const exclude = new Set(keep.map((o) => String(o.extId)));
  const bias = _merchant.quirk === "buffBias" ? "buff" : (_merchant.quirk === "newBias" ? "new" : null);
  const fresh = samplePicks(Math.max(0, n - keep.length), {
    exclude, last: new Set(_offers.map((o) => String(o.extId))), banned: new Set(state.shop.bans), bias,
  }).filter((o) => !exclude.has(String(o.extId)));
  _offers = [...keep, ...fresh.map((o) => ({ extId: o.extId, sale: false, sold: false }))];
  // マルコ・ポーロ：まだ売れていない品の 1 つを半額 (= LL は外す)
  if (_merchant.quirk === "sale" && !_offers.some((o) => o.sale)) {
    const cands = _offers.filter((o) => !o.sold && !offerFor(o.extId)?.isLL);
    if (cands.length) cands[Math.floor(Math.random() * cands.length)].sale = true;
  }
}

function _priceOf(o, offer) {
  if (state.shop.gifts > 0 && String(_giftTarget()) === String(o.extId)) return 0;
  return shopPrice(offer, state.currentStageIdx ?? 0, _merchant.quirk, o.sale);
}

/** ギフト券を使う品 (= ただにできる品のうち、 いちばん高いもの。 安い品で券を使い切らない) */
function _giftTarget() {
  const banned = new Set(state.shop.bans);
  let best = null, bestP = -1;
  for (const o of _offers) {
    if (o.sold) continue;
    const offer = offerFor(o.extId, banned);
    if (!giftable(offer)) continue;
    const p = shopPrice(offer, state.currentStageIdx ?? 0, _merchant.quirk, o.sale);
    if (p > bestP) { best = o.extId; bestP = p; }
  }
  return best;
}

export function buyOffer(extId) {
  const s = state.shop;
  const o = _offers.find((x) => String(x.extId) === String(extId) && !x.sold);
  const offer = o && offerFor(extId, new Set(s.bans));
  if (!offer) return false;
  const price = _priceOf(o, offer);
  if (price > s.ce) return false;
  if (price === 0) s.gifts -= 1;
  else s.ce -= price;
  grantPick(extId);
  o.sold = true;
  s.locked = s.locked.filter((id) => String(id) !== String(extId));
  s.purchases += 1;
  _boughtHere += 1;
  state.level = 1 + s.purchases;
  renderShop();
  return true;
}

export function toggleLock(extId) {
  const s = state.shop;
  const id = _offers.find((x) => String(x.extId) === String(extId) && !x.sold)?.extId;
  if (id == null) return;
  if (s.locked.some((x) => String(x) === String(id))) s.locked = s.locked.filter((x) => String(x) !== String(id));
  else s.locked.push(id);
  renderShop();
}

export function banOffer(extId) {
  const s = state.shop;
  const i = _offers.findIndex((x) => String(x.extId) === String(extId) && !x.sold);
  if (i < 0) return;
  if (!canBan(offerFor(extId), state.battle?.starterExtId, s.bansLeft)) return;
  s.bans.push(_offers[i].extId);
  s.bansLeft -= 1;
  s.locked = s.locked.filter((x) => String(x) !== String(extId));
  _offers.splice(i, 1);
  renderShop();
}

/** いまのリロールの値段 (= ただなら 0) */
export function currentRerollCost() {
  return (_gamaFree > 0 || state.shop.freeRerolls > 0) ? 0 : rerollCost(_paidRerolls);
}

export function rerollShop() {
  const s = state.shop;
  const cost = currentRerollCost();
  if (cost > s.ce) return;
  if (_gamaFree > 0) _gamaFree -= 1;
  else if (s.freeRerolls > 0) s.freeRerolls -= 1;
  else { s.ce -= cost; _paidRerolls += 1; }
  _fillOffers();   // 売れた品と取り置きはそのまま、 ほかを引き直す
  renderShop();
  playSe(SFX.LEVEL_UP, 100, 0.4);
}

export function closeShop() {
  if (!_open) return;
  _open = false;
  document.getElementById("shopModal")?.classList.add("hidden");
  // SPEC-090c の「見送りの礼」: 何も買わずに出ると HP が少し戻る
  if (_boughtHere === 0) {
    const heal = Math.round(state.statsMax.hp * perk("skipHeal"));
    if (heal > 0) {
      state.stats.hp = Math.min(state.statsMax.hp, state.stats.hp + heal);
      playSe(SFX.PICK_HEAL, 100, 0.55);
    }
  }
  sigOnLevelUp(1, hitEnemy);   // SPEC-100 のクリプトスラッシュ: 店を出るたびに周りをなぎ払う
  _offers = [];
  resumeTime();
}

/** タイトルに戻る・ゲームオーバーで、 開いていれば黙って閉じる (= pauseFlags は呼ぶ側がまとめて戻す) */
export function hideShop() {
  _open = false;
  _offers = [];
  document.getElementById("shopModal")?.classList.add("hidden");
}

export function renderShop() {
  const s = state.shop;
  const modal = document.getElementById("shopModal");
  if (!s || !modal) return;
  const lang = getLang();
  const m = _merchant;
  const face = document.getElementById("shopMerchantImg");
  if (face) { face.src = img(`Image/Enemies/${m.enemyId}.png`); face.alt = t(`shop.m.${m.id}.name`, m.id); }
  _text("shopMerchantName", t(`shop.m.${m.id}.name`, m.id));
  _text("shopMerchantLine", t(`shop.m.${m.id}.line`, ""));
  _text("shopCe", String(s.ce));
  const gift = document.getElementById("shopGifts");
  if (gift) {
    gift.classList.toggle("hidden", s.gifts <= 0);
    gift.textContent = tpl(t("shop.gifts", "🎟 ギフト券 ×{n}"), { n: String(s.gifts) });
  }
  const sub = document.getElementById("shopSub");
  if (sub) {
    const left = SHOP_PER_STAGE - s.nextIdx;
    sub.textContent = tpl(t("shop.sub", "あと {n} 回の店でボス"), { n: String(Math.max(0, left)) });
  }

  renderOwnedStrip(document.getElementById("shopOwned"), document.getElementById("shopOwnedRows"), document.getElementById("shopOwnedHead"));

  const grid = document.getElementById("shopGrid");
  if (grid) {
    grid.innerHTML = "";
    grid.style.setProperty("--cols", String(Math.max(4, _offers.length)));
    const banned = new Set(s.bans);
    _offers.forEach((o, i) => {
      const wrap = document.createElement("div");
      wrap.className = "shop-offer";
      const offer = o.sold ? null : offerFor(o.extId, banned);
      if (o.sold || !offer) {
        wrap.classList.add("shop-offer--sold");
        const ext = getExt(o.extId);
        wrap.innerHTML = `<div class="shop-offer__soldcard"><img alt="" /><span></span></div>`;
        const im = wrap.querySelector("img");
        const own = state.ownedExtensions.find((x) => String(x.extId) === String(o.extId));
        if (ext) im.src = extTierImg(ext, own?.level ?? 1);
        wrap.querySelector("span").textContent = o.sold ? t("shop.sold", "お買い上げ") : t("shop.gone", "もう買えない");
        grid.appendChild(wrap);
        return;
      }
      const card = buildPickCard(offer, i);
      const price = _priceOf(o, offer);
      const short = price > s.ce;
      const chip = document.createElement("span");
      chip.className = "shop-price" + (short ? " shop-price--short" : "") + (price === 0 ? " shop-price--gift" : "") + (o.sale ? " shop-price--sale" : "");
      chip.textContent = price === 0 ? t("shop.free", "🎟 ギフト券") : `◆ ${price}`;
      if (o.sale && price > 0) chip.dataset.tag = t("shop.saleTag", "半額");
      card.appendChild(chip);
      card.classList.add("shop-card");
      if (short) card.classList.add("shop-card--short");
      card.setAttribute("aria-disabled", short ? "true" : "false");
      card.addEventListener("click", () => { if (!buyOffer(o.extId)) playSe(SFX.GEM_PICKUP, 100, 0.2); });

      const locked = s.locked.some((x) => String(x) === String(o.extId));
      if (locked) wrap.classList.add("shop-offer--locked");
      const tools = document.createElement("div");
      tools.className = "shop-offer__tools";
      const lock = document.createElement("button");
      lock.type = "button";
      lock.className = "shop-tool shop-tool--lock" + (locked ? " is-on" : "");
      lock.textContent = locked ? t("shop.locked", "🔒 取り置き中") : t("shop.lock", "🔓 取り置き");
      lock.setAttribute("aria-pressed", locked ? "true" : "false");
      lock.addEventListener("click", () => toggleLock(o.extId));
      tools.appendChild(lock);
      if (canBan(offer, state.battle?.starterExtId, s.bansLeft)) {
        const ban = document.createElement("button");
        ban.type = "button";
        ban.className = "shop-tool shop-tool--ban";
        ban.textContent = t("shop.ban", "✕ お断り");
        ban.title = tpl(t("shop.banHint", "{name} をこの挑戦のあいだ出さない"), { name: getSeriesName(offer.ext, lang) });
        ban.addEventListener("click", () => banOffer(o.extId));
        tools.appendChild(ban);
      }
      wrap.append(card, tools);
      grid.appendChild(wrap);
    });
  }

  // お断りした品
  const bans = document.getElementById("shopBans");
  if (bans) {
    bans.innerHTML = "";
    bans.classList.toggle("hidden", s.bans.length === 0);
    const head = document.createElement("span");
    head.className = "shop-bans__head";
    head.textContent = t("shop.bansHead", "お断りした品");
    bans.appendChild(head);
    for (const id of s.bans) {
      const ext = getExt(id);
      if (!ext) continue;
      const im = document.createElement("img");
      im.src = extTierImg(ext, 1);
      im.alt = getSeriesName(ext, lang);
      im.title = im.alt;
      bans.appendChild(im);
    }
  }
  _text("shopBansLeft", tpl(t("shop.bansLeft", "お断り 残り {n}"), { n: String(s.bansLeft) }));

  const rr = document.getElementById("shopReroll");
  if (rr) {
    const cost = currentRerollCost();
    rr.textContent = cost === 0 ? t("shop.rerollFree", "リロール（ただ）") : tpl(t("shop.reroll", "リロール ◆ {n}"), { n: String(cost) });
    rr.disabled = cost > s.ce;
  }
  const leave = document.getElementById("shopLeave");
  if (leave) {
    leave.textContent = _boughtHere === 0 && perk("skipHeal") > 0
      ? t("shop.leaveHeal", "何も買わずに出る（HP 回復）")
      : t("shop.leave", "次のウェーブへ ▶");
  }
}

function _text(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  document.getElementById("shopReroll")?.addEventListener("click", rerollShop);
  document.getElementById("shopLeave")?.addEventListener("click", closeShop);
  onLangChange(() => { if (_open) renderShop(); });
}

/** テスト用 */
export const _test = { get offers() { return _offers; }, set merchant(m) { _merchant = m; } };
