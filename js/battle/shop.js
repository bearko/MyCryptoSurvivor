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
import { recordHeal } from "./run-stats.js";   // SPEC-148
import {
  img, SFX, SHOP_PER_STAGE, SHOP_OFFERS, SHOP_BANS, SHOP_FREE_REROLLS, SHOP_HEADSTART_CE,
} from "../constants.js";
import { getExt, extTierImg, getSeriesName } from "../extensions.js";
import { samplePicks, freshCount, offerFor, grantPick, buildPickCard, renderOwnedStrip } from "./levelup.js";
import { perk, buffPriceCut, shopAtStart } from "../perks.js";
import { t, tpl, getLang, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";
import { sigOnLevelUp, sigParams, sigLevel, SIG_MAX_LEVEL, SIG_UP_PRICE, pourCeIntoSig } from "./signature.js";
import { heroImg } from "../heroes.js";
import { naviFrameUrl, NAVI_POSES } from "../navi.js";
import { playVoice } from "../voice.js";
import { hitEnemy } from "./damage.js";
import { levelUpSub } from "./team-battle.js";   // SPEC-168: サブの武器の段
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { levelParams, rankOf } from "../ext-level.js";
import { EXT_MAX_LEVEL } from "../constants.js";

import {
  MERCHANTS, OPENING_MERCHANT, isShopMode, shopTimesMs, shopPrice, giftable, giftCost, isGiftFirst, setGiftFirst, pickMerchant, rerollCost, canBan, nextShopSec,
  shopProgress, shopHealAmount, SHOP_SOON_SEC,
} from "./shop-logic.js";
import { pushDamageNumber } from "./damage.js";
import { EXT_ROSTER } from "../extensions.js";
import { canHeal } from "./missions.js";   // SPEC-112
import { easyStage } from "../easy.js";   // SPEC-147
import { storyStage, storyAllows, isStory, bondRewards, loadStory } from "../story.js";   // SPEC-165
import { storySay } from "./story-battle.js";   // SPEC-165
export { isShopMode, shopTimesMs, shopProgress } from "./shop-logic.js";

// ============================================================
// 挑戦・ステージの始まり (= battle/index.js の startBattle)
// ============================================================

function _fresh() {
  return {
    ce: 0, gifts: 0, bans: [], bansLeft: SHOP_BANS,
    locked: [], nextIdx: 0, prevMerchant: null, purchases: 0,
    freeRerolls: 0, enteredIdx: -1, snapshot: null,
    sigLevel: 1,   // SPEC-110: 固有スキルの強化段 (= ステージをまたいで残る)
    sigCe: 0,      // SPEC-128: 次の段への積み立て (= ステージの終わりに残った CE を振った端数)
    welcome: false, welcomeGiven: false,   // 最初の店のサービス (= 1 品無料。 使うまで残る)
    nextMerchant: null,   // 次に来る商人 (= ヘッダーの帯を歩いてくる)
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
    s.snapshot = { ce: s.ce, gifts: s.gifts, bans: [...s.bans], bansLeft: s.bansLeft, purchases: s.purchases, sigLevel: s.sigLevel, sigCe: s.sigCe ?? 0 };
  }
  s.locked = [];       // 装備がステージごとなので、 取り置きもステージで外れる
  s.nextIdx = 0;
  if (isStory()) s.gifts = bondRewards(loadStory()).gifts;   // SPEC-165: 絆のギフト券 (= ストーリーの各ステージを、 その枚数を持って始める)
  // ステージ 2・3 は開始の前の店がマルコ・ポーロ。 ステージ 1 は乱数 (= 帯を歩いてくる人を先に決めておく)
  s.nextMerchant = idx > 0 ? OPENING_MERCHANT : pickMerchant(s.prevMerchant).id;
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
  state.battle?.story?.events?.push("item:gift");   // SPEC-165: ギフト券を手に入れた一言
}

/** 毎フレーム (= battle/index.js の _step)。 時刻になったら店を開く */
export function tickShop() {
  const s = state.shop;
  const b = state.battle;
  if (!s || _open || !b.active || b.gameOver) return;
  const times = easyStage()?.shopTimesMs ?? shopTimesMs(state.currentStageIdx ?? 0, { atStart: shopAtStart() });   // SPEC-147: EASY は短い。 SPEC-152: 開幕の店は節で
  if (easyStage()?.story && times.length === 0) { hideShopBar(); return; }   // SPEC-165: 店の無いステージでは帯を出さない
  const done = b.bossSpawned || s.nextIdx >= times.length;
  renderShopBar(done ? null : { sec: nextShopSec(b.stageElapsedMs ?? 0, state.currentStageIdx ?? 0, s.nextIdx, times), ratio: shopProgress(b.stageElapsedMs ?? 0, state.currentStageIdx ?? 0, s.nextIdx, times), merchant: s.nextMerchant });   // SPEC-154: ゲージも同じ表で (= ステージ 2・3 で 0 のままだった)
  if (done) return;
  if ((b.stageElapsedMs ?? 0) >= times[s.nextIdx]) {
    const opening = s.nextIdx === 0 && (state.currentStageIdx ?? 0) > 0;
    s.nextIdx += 1;
    openShop({ opening });
  }
}

// ============================================================
// ヘッダーの「次の店まで」の帯 (= 次に来る商人が左から右へ歩いてくる。 残り 10 秒で目立つ)
// ============================================================
let _barKey = "";

/** info: { sec, ratio, merchant } (= null は「この先に店は無い」)。 秒・商人・位置が変わったときだけ DOM を触る */
export function renderShopBar(info) {
  const doc = globalThis.document;
  const el = doc?.getElementById("shopBar");
  if (!el) return;
  const pos = info ? Math.round(info.ratio * 200) : -1;   // 0.5% 刻みで動かす (= 毎フレーム書かない)
  const key = info ? `${info.sec}|${info.merchant}|${pos}` : "none";
  if (key === _barKey) return;
  _barKey = key;
  el.classList.remove("hidden");
  const m = MERCHANTS.find((x) => x.id === info?.merchant);
  const walker = doc.getElementById("shopBarWalker");
  const fill = el.querySelector(".shop-bar__fill");
  const sec = doc.getElementById("shopBarSec");
  const name = doc.getElementById("shopBarName");
  el.classList.toggle("shop-bar--done", !info);
  el.classList.toggle("shop-bar--soon", !!info && info.sec <= SHOP_SOON_SEC);
  if (!info) {
    if (walker) walker.hidden = true;
    if (fill) fill.style.width = "100%";
    if (sec) sec.textContent = t("shop.bar.done", "店じまい");
    if (name) name.textContent = "";
    return;
  }
  const r = Math.max(0, Math.min(1, info.ratio));
  if (fill) fill.style.width = (r * 100).toFixed(1) + "%";
  if (walker) {
    walker.hidden = !m;
    walker.style.setProperty("--x", r.toFixed(3));
    if (m && walker.dataset.id !== m.id) { walker.dataset.id = m.id; walker.src = img(`Image/Enemies/${m.enemyId}.png`); }
  }
  if (name) name.textContent = m ? t(`shop.m.${m.id}.name`, m.id) : "";
  if (sec) sec.textContent = tpl(t("shop.bar.sec", "{n} 秒"), { n: String(info.sec) });
}

/** タイトルに戻る・ゲームオーバー・レベルアップで遊ぶとき (= 帯を隠す) */
export function hideShopBar() {
  _barKey = "";
  globalThis.document?.getElementById("shopBar")?.classList.add("hidden");
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
let _rerolledHere = 0, _bannedHere = 0, _sigHere = 0;   // SPEC-165: 5-1・5-2 の「するまで出られない」
let _healed = 0;   // この店に来たときに戻った HP (= 店の上に出す)

export function isShopOpen() { return _open; }

export function openShop({ opening = false } = {}) {
  const s = state.shop;
  if (!s || _open) return;
  _open = true;
  _giftFirst = isGiftFirst();   // SPEC-130
  _wireOnce();
  // 帯を歩いてきた商人が店番をする (= 決まっていなければここで選ぶ)
  _merchant = MERCHANTS.find((m) => m.id === s.nextMerchant)
    ?? pickMerchant(s.prevMerchant, Math.random, opening ? OPENING_MERCHANT : null);
  s.prevMerchant = _merchant.id;
  s.nextMerchant = pickMerchant(_merchant.id).id;   // 次に来る人 (= 同じ人は続けて来ない)
  // SPEC-165: ストーリーの店は品を固定 (= only)。 商人はマルコ、 サービスの案内は出さない
  const sr = storyAllows("shop") ? (storyStage()?.shop ?? null) : null;
  if (sr) { _merchant = MERCHANTS.find((m) => m.id === "marco") ?? _merchant; s.nextMerchant = _merchant.id; }
  _paidRerolls = 0;
  _boughtHere = 0;
  _seriesHere = new Set();
  _rerolledHere = 0; _bannedHere = 0; _sigHere = 0;
  // ウェーブの節目のひと息: 来店で HP が少し戻る (= 作者の依頼 2026-10-20)
  _healed = canHeal() ? shopHealAmount(state.stats.hp, state.statsMax.hp) : 0;   // SPEC-112: 不老不死の探求のあいだは戻らない
  if (_healed > 0) {
    recordHeal(state.run?.stats, "shop", Math.min(state.statsMax.hp, state.stats.hp + _healed) - state.stats.hp);   // SPEC-148
    state.stats.hp = Math.min(state.statsMax.hp, state.stats.hp + _healed);
    const p = state.battle.player;
    pushDamageNumber(p.x, p.y - (p.r ?? 12) - 4, _healed, "#7dff9a");
    playSe(SFX.PICK_HEAL, 100, 0.5);
  }
  // 最初の店 (= ステージ 1 の 0:10) はまだ CE が少ないので、 サービスで 1 品無料 (= 作者の決定 2026-10-20)
  if (!sr && !s.welcomeGiven && (state.currentStageIdx ?? 0) === 0) {
    s.welcomeGiven = true;
    s.welcome = true;
    playVoice("shop.intro");   // マインちゃんの説明のボイス (= 説明が出る最初の 1 回だけ)
  }
  _gamaFree = _merchant.quirk === "freeReroll" ? 1 : 0;
  // 取り置きは同じ札で残す (= 段が上がりきった・枠がいっぱいなら外れる)
  const banned = new Set(s.bans);
  const kept = s.locked.filter((id) => offerFor(id, banned));
  s.locked = kept;
  _offers = kept.map((id) => ({ extId: id, sale: false, sold: false }));
  if (sr?.only) { _offers = sr.offers.map((id) => ({ extId: id, sale: false, sold: !offerFor(id, banned) })); s.welcome = false; }
  else _fillOffers();
  // SPEC-165: 2-2 「全部は買えない」 (= 持ち物の CE はステージをまたいで残るので、 開いた瞬間の手持ちに合わせて値段を上げる。 fit = 手持ちで買える割合)
  _fitMul = 1;
  if (sr?.fit > 0 && s.ce > 0) {
    const base = _offers.filter((o) => !o.sold).reduce((a, o) => { const of = offerFor(o.extId, banned); return a + (of ? shopPrice(of, state.currentStageIdx ?? 0, _merchant.quirk, false, buffPriceCut(o.extId)) * (sr.priceMul ?? 1) : 0); }, 0);
    if (base > 0) _fitMul = Math.max(1, s.ce / (sr.fit * base));
  }
  pauseTime();
  if (sr) storySay("shopOpen");
  document.getElementById("shopModal")?.classList.remove("hidden");
  renderShop();
  playSe(SFX.LEVEL_UP, 100, 0.4);
}

/** 品を足りるまで引く (= 取り置きと売り切れはそのまま) */
function _fillOffers(last = new Set(_offers.map((o) => String(o.extId)))) {
  const n = _slotCount();
  const keep = _keptOffers();
  const exclude = _refillExclude(keep);
  const bias = _merchant.quirk === "buffBias" ? "buff" : (_merchant.quirk === "newBias" ? "new" : null);
  const fresh = samplePicks(Math.max(0, n - keep.length), {
    exclude, last, banned: new Set(state.shop.bans), bias,
  }).filter((o) => !exclude.has(String(o.extId)));
  _offers = [...keep, ...fresh.map((o) => ({ extId: o.extId, sale: false, sold: false }))];
  // マルコ・ポーロ：まだ売れていない品の 1 つを半額 (= LL は外す)
  if (_merchant.quirk === "sale" && !_offers.some((o) => o.sale)) {
    const cands = _offers.filter((o) => !o.sold && !offerFor(o.extId)?.isLL);
    if (cands.length) cands[Math.floor(Math.random() * cands.length)].sale = true;
  }
}

/** 店の枠の数 (= 4。 マゼランは 5)。 作者 2026-10-24: 1 回の店で買えるのはこの枠の数まで */
function _slotCount() { return SHOP_OFFERS + (_merchant.quirk === "extraOffer" ? 1 : 0); }
/** 引き直しても残る札 (= 売り切れと取り置き) */
function _keptOffers() { return _offers.filter((o) => o.sold || state.shop.locked.includes(o.extId)); }
/** 引き直しで出さない品 (= 残る札と、 この店でもう並べた系列) */
function _refillExclude(keep = _keptOffers()) {
  const exclude = new Set(keep.map((o) => String(o.extId)));
  // 作者 2026-10-22: この店で買った系列は出さない (= リロールで同じ系列を 4 回買うのを防ぐ)。 見送った品はまた並ぶ (= SPEC-170。 続けては出にくい: last)
  for (const e of EXT_ROSTER) if (_seriesHere.has(seriesOf(e.extId)) && !state.shop.locked.some((x) => String(x) === String(e.extId))) exclude.add(String(e.extId));
  return exclude;
}

/**
 * リロールできるか (= 作者 2026-10-24)。 引き直せる枠 (= 売り切れでも取り置きでもない枠) が 1 つも無いか、
 * 新しく並べられる品が残っていなければできない (= 押しても何も来ない・買えないリロールをさせない)
 */
export function canReroll() {
  if (!state.shop || _storyShop()?.only) return false;
  const keep = _keptOffers();
  if (_slotCount() - keep.length <= 0) return false;
  return freshCount({ exclude: _refillExclude(keep), banned: new Set(state.shop.bans) }) > 0;
}

let _giftFirst = true;   // SPEC-130: 「ギフト券支払いを優先」 (= 店を開くたびに保存から読む)
/** 作者 2026-10-22: お断りは CE を払う (= 不要な品を外す道具。 ただで何度も押させない) */
export const SHOP_BAN_COST = 20;
let _seriesHere = new Set();   // この店で買った系列 (= 作者 2026-10-22「同じ系列は 1 回」。 2026-10-24 SPEC-170: 並べただけの系列は数えない。 終盤は品が少なく、 2〜3 回のリロールで尽きていた)
let _fitMul = 1;         // SPEC-165: 2-2 の「全部は買えない」の倍率 (= 開いた瞬間の CE から。 1 = そのまま)

function _storyShop() { return storyAllows("shop") ? (storyStage()?.shop ?? null) : null; }   // SPEC-165
function _priceOf(o, offer) {
  if (_storyShop()?.price === 0) return 0;   // SPEC-165: 1-2 はただ
  if (state.shop.welcome && !offer.isLL) return 0;   // 最初の店のサービス (= どれでも 1 品)
  // SPEC-130: 優先がオンなら、 持っている券で買える品はどれも券で (= 買うたびに残りの枚数で見直す)。 オフなら CE で払う
  if (_giftFirst && giftable(offer, state.shop.gifts)) return 0;
  let price = shopPrice(offer, state.currentStageIdx ?? 0, _merchant.quirk, o.sale, buffPriceCut(o.extId));   // SPEC-131: 強化の目利き
  if (_storyShop()?.priceMul) price = Math.round(price * _storyShop().priceMul);   // SPEC-165: 2-2 は全部は買えない値段
  if (_fitMul > 1) price = Math.round(price * _fitMul);
  // SPEC-165: 「買うまで閉じられない」店では、 手持ちが足りなければ手持ちの額に (= 拾った CE で買う体験は残し、 詰ませない)。
  // 1 品買ったあとは掛けない (= 残りも手持ちの額になって、 「全部は買えない」が崩れていた)
  const sr = _storyShop();
  if (sr?.mustBuy && _boughtHere === 0 && price > state.shop.ce) return Math.max(1, state.shop.ce);
  return price;
}

/** SPEC-130: 「ギフト券支払いを優先」を切り替える (= 覚えておく) */
export function toggleGiftFirst(on = !_giftFirst) {
  _giftFirst = !!on;
  setGiftFirst(_giftFirst);
  renderShop();
}

export function buyOffer(extId) {
  const s = state.shop;
  const o = _offers.find((x) => String(x.extId) === String(extId) && !x.sold);
  const offer = o && offerFor(extId, new Set(s.bans));
  if (!offer) return false;
  const price = _priceOf(o, offer);
  if (price > s.ce) return false;
  _offers.forEach((x) => { x.banArm = false; });
  const storyFree = _storyShop()?.price === 0;   // SPEC-165: 1-2 はただ (= ギフト券も減らない)
  if (price === 0 && storyFree) { /* ただ */ }
  else if (price === 0 && s.welcome) s.welcome = false;
  else if (price === 0) s.gifts -= giftCost(offer) ?? 1;   // SPEC-127: 段で枚数が変わる
  else s.ce -= price;
  const lvBefore = (state.ownedExtensions ?? []).find((x) => String(x.extId) === String(extId))?.level ?? 0;
  grantPick(extId);
  if (_storyShop()?.rankupFx) {   // SPEC-165: 1-5 のランクアップの演出 (= 終わったら店を閉じる)
    const lvAfter = (state.ownedExtensions ?? []).find((x) => String(x.extId) === String(extId))?.level ?? lvBefore + 1;
    import("./story-fx.js").then((m) => m.playRankup(extId, lvBefore, lvAfter, () => { closeShop(); state.battle?.story?.events?.push("rankup"); }));
  }
  // 作者 2026-10-22: 買った札は消える (= SPEC-163 の「同じ札を続けて買える」はやめた。 CE が切れるまで同じ段を登れて、 一気に強くなりすぎた)
  // 作者 2026-10-24: 買った枠は「売り切れ」のまま、 リロールしても補充しない (= 1 回の店で買えるのは枠の数まで。 SPEC-167)
  o.sale = false;
  o.sold = true;
  _noteSeries(extId);   // SPEC-170: 買った系列だけ、 この店では 2 度並べない
  o.bought = (o.bought | 0) + 1;
  s.locked = s.locked.filter((id) => String(id) !== String(extId));
  s.purchases += 1;
  _boughtHere += 1;
  state.level = 1 + s.purchases;
  renderShop();
  return true;
}

/** SPEC-110: 固有スキルの次の段の値段 (= もう上がらなければ null) */
export function sigUpPrice(lv = sigLevel()) {
  return lv >= SIG_MAX_LEVEL ? null : SIG_UP_PRICE[lv - 1];
}

/** SPEC-128: 次の段まであといくら (= 値段 − 積み立て。 もう上がらなければ null) */
export function sigUpRest(s = state.shop) {
  const price = sigUpPrice(s?.sigLevel ?? 1);
  const rest = price == null ? null : Math.max(0, price - (s?.sigCe ?? 0));
  if (rest != null && _storyShop()?.must?.includes("sig") && _sigHere === 0 && rest > (s?.ce ?? 0)) return Math.max(1, s?.ce ?? 0);   // SPEC-165: 5-2 は手持ちで上げられる
  return rest;
}

/** SPEC-110: 固有スキルを 1 段上げる (= 常設の札) */
export function buySigUp() {
  const s = state.shop;
  const kind = state.battle?.sig?.kind;
  const price = sigUpRest(s);
  if (!s || !kind || price == null || price > s.ce) return false;
  s.ce -= price;
  s.sigCe = 0;
  s.sigLevel += 1;
  _boughtHere += 1;
  _sigHere += 1; state.battle?.story?.events?.push("sigUp");   // SPEC-165
  playSe(SFX.PICK_BUFF, 100, 0.55);
  renderShop();
  return true;
}

/** SPEC-170: サブの武器の段の値段は、 店でそのランクアップを買うときの 2 倍 (= 作者 2026-10-24: 1 倍では上げる効率が良すぎた) */
export const SUB_UP_PRICE_MUL = 2;
/** SPEC-168: サブ i の武器の次の段の値段 (= 店でそのランクアップを買うときの SUB_UP_PRICE_MUL 倍。 黒髭の 2 割引も効く)。 もう上がらなければ null */
export function subUpPrice(i) {
  const sub = state.battle?.subs?.[i];
  if (!sub || sub.level >= EXT_MAX_LEVEL) return null;
  return shopPrice({ nextLevel: sub.level + 1 }, state.currentStageIdx ?? 0, _merchant.quirk) * SUB_UP_PRICE_MUL;
}

/** SPEC-168: サブ i の武器を 1 段上げる (= 店の 3 列。 枠には数えない) */
export function buySubUp(i) {
  const s = state.shop;
  const price = subUpPrice(i);
  if (!s || price == null || price > s.ce) return false;
  if (!levelUpSub(i)) return false;
  s.ce -= price;
  _boughtHere += 1;
  rebuildWeaponsFromOwned();
  playSe(SFX.PICK_WEAPON, 100, 0.55);
  renderShop();
  return true;
}

/**
 * SPEC-128: ステージの終わり (= stage-transition.js)。 残った CE を固有スキルへ振り、 財布を空にする。
 * ギフト券は持ち越す。 結果の画面に出すために、 振る前と後を返す
 */
export function pourShopCeIntoSig() {
  const s = state.shop;
  if (!s) return null;
  const from = s.sigLevel;
  const ce = Math.max(0, Math.floor(s.ce));
  const r = pourCeIntoSig({ ce, level: s.sigLevel, invested: s.sigCe ?? 0 });
  s.sigLevel = r.level;
  s.sigCe = r.invested;
  s.ce = 0;
  return { ce, from, to: r.level, rest: sigUpRest(s), wasted: r.wasted, max: r.level >= SIG_MAX_LEVEL };
}

/** SPEC-110: 段で伸びるもの (= 札に「いま → 次」で出す) */
const SIG_ROWS = {
  cryptoSlash: [["dmgMul", "×"], ["radius", "px"]],
  oneHole:     [["max", "×"]],
  poisonMist:  [["dmgMul", "×"], ["lifeS", "s"]],
  langer:      [["max", "×"], ["range", "px"]],
  teslaCoil:   [["hops", "chain"], ["everyS", "s"]],
  tetractys:   [["every", "nth"], ["steps", "lv"]],
  tiger:       [["max", "×"]],
  queenPirate: [["boostS", "s"], ["pickup", "×"]],
  phantom:     [["uses", "times"], ["iframeMs", "ms"]],
  uinyeo:      [["regenPerSec", "hp"], ["healMul", "×"]],
};

function _fmtSig(v, unit) {
  switch (unit) {
    case "×": return `×${v}`;
    case "px": return `${v}px`;
    case "s": return tpl(t("shop.sig.sec", "{n} 秒"), { n: String(v) });
    case "ms": return tpl(t("shop.sig.sec", "{n} 秒"), { n: String(v / 1000) });
    case "chain": return tpl(t("shop.sig.chain", "{n} 体"), { n: String(v + 1) });
    case "nth": return tpl(t("shop.sig.nth", "{n} 品目ごと"), { n: String(v) });
    case "lv": return tpl(t("shop.sig.lv", "{n} 段"), { n: String(v) });
    case "times": return tpl(t("shop.sig.times", "{n} 回"), { n: String(v) });
    case "hp": return tpl(t("shop.sig.hp", "毎秒 {n}"), { n: String(v) });
    default: return String(v);
  }
}

/** SPEC-110: 常設の札 (= ヒーローの顔・固有スキルの名前・段・次の段で伸びるもの・値段) */
function _renderSig() {
  const el = document.getElementById("shopSig");
  const s = state.shop;
  const kind = state.battle?.sig?.kind;
  const hero = state.ownedHero;
  if (!el) return;
  el.classList.toggle("hidden", !kind || !hero);
  if (!kind || !hero) return;
  const lang = getLang();
  const lv = s.sigLevel;
  const price = sigUpRest(s);   // SPEC-128: 積み立てを引いた残り
  const subs = state.battle?.subs ?? [];
  el.classList.toggle("shop-sig--team", subs.length > 0);   // SPEC-168: メインの固有スキル・サブ 1 の武器・サブ 2 の武器の 3 列
  const now = sigParams(kind, lv);
  const next = price == null ? null : sigParams(kind, lv + 1);
  el.innerHTML = "";
  const head = document.createElement("div");
  head.className = "shop-sig__head";
  const face = document.createElement("img");
  face.className = "shop-sig__face";
  face.src = heroImg(hero.heroId);
  face.alt = "";
  const title = document.createElement("div");
  title.className = "shop-sig__title";
  const kicker = document.createElement("span");
  kicker.className = "shop-sig__kicker";
  kicker.textContent = t("shop.sig.kicker", "固有スキル");
  const name = document.createElement("b");
  name.className = "shop-sig__name";
  name.textContent = hero.passive?.[lang] ?? hero.passive?.ja ?? "";
  const lvEl = document.createElement("span");
  lvEl.className = "shop-sig__lv num";
  lvEl.textContent = `Lv ${lv} / ${SIG_MAX_LEVEL}`;
  title.append(kicker, name, lvEl);
  head.append(face, title);
  const rows = document.createElement("ul");
  rows.className = "shop-sig__rows";
  for (const [key, unit] of SIG_ROWS[kind] ?? []) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = t(`shop.sig.${kind}.${key}`, key);
    const val = document.createElement("span");
    val.className = "num";
    const a = _fmtSig(now[key], unit);
    const changed = next && next[key] !== now[key];
    val.textContent = changed ? `${a} → ${_fmtSig(next[key], unit)}` : a;
    if (changed) li.classList.add("is-up");
    li.append(label, val);
    rows.appendChild(li);
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "shop-sig__buy";
  if (price == null) {
    btn.disabled = true;
    btn.textContent = t("shop.sig.max", "最大まで強化した");
  } else {
    btn.disabled = price > s.ce;
    btn.textContent = (s.sigCe ?? 0) > 0
      ? tpl(t("shop.sig.buyRest", "Lv {n} へ あと ◆ {p}"), { n: String(lv + 1), p: String(price) })
      : tpl(t("shop.sig.buy", "Lv {n} へ ◆ {p}"), { n: String(lv + 1), p: String(price) });
    btn.addEventListener("click", buySigUp);
  }
  const note = document.createElement("p");
  note.className = "shop-sig__note";
  note.textContent = t("shop.sig.note", "ステージをまたいで残る。残った CE はステージの終わりにここへ");
  if (!subs.length) { el.append(head, rows, btn, note); return; }
  // SPEC-168: 3 列 (= 1 列目がメインの固有スキル、 2・3 列目がサブの武器)
  const cell = document.createElement("div");
  cell.className = "shop-sig__cell";
  cell.append(head, rows, btn);
  el.append(cell, ...subs.map((sub, i) => _subCell(sub, i, lang)));
}

/** SPEC-168: サブの武器の札 (= 顔・武器・段・威力の伸び・上げるボタン) */
function _subCell(sub, i, lang) {
  const ext = getExt(sub.extId);
  const cell = document.createElement("div");
  cell.className = "shop-sig__cell shop-sig__cell--sub";
  const head = document.createElement("div");
  head.className = "shop-sig__head";
  const face = document.createElement("span");
  face.className = "shop-sig__subface";
  const hero = document.createElement("img");
  hero.className = "shop-sig__face";
  hero.src = heroImg(sub.heroId);
  hero.alt = "";
  face.appendChild(hero);
  if (ext) {
    const w = document.createElement("img");
    w.className = "shop-sig__weapon";
    w.src = extTierImg(ext, sub.level);
    w.alt = "";
    face.appendChild(w);
  }
  const title = document.createElement("div");
  title.className = "shop-sig__title";
  const kicker = document.createElement("span");
  kicker.className = "shop-sig__kicker";
  kicker.textContent = `SUB ${i + 1}`;
  const name = document.createElement("b");
  name.className = "shop-sig__name";
  name.textContent = ext ? getSeriesName(ext, lang) : "";
  const lvEl = document.createElement("span");
  lvEl.className = "shop-sig__lv num";
  lvEl.textContent = `Lv ${sub.level} / ${EXT_MAX_LEVEL}`;
  title.append(kicker, name, lvEl);
  head.append(face, title);
  const price = subUpPrice(i);
  const rows = document.createElement("ul");
  rows.className = "shop-sig__rows";
  const now = levelParams(ext, sub.level), next = price == null ? null : levelParams(ext, sub.level + 1);
  for (const [key, label] of [["dmg", t("shop.sub.dmg", "威力")], ["bullets", t("shop.sub.bullets", "数")]]) {
    if (now[key] == null || (key === "bullets" && next?.[key] === now[key])) continue;
    const li = document.createElement("li");
    const a = document.createElement("span");
    a.textContent = label;
    const v = document.createElement("span");
    v.className = "num";
    const changed = next && next[key] !== now[key];
    v.textContent = changed ? `${now[key]} → ${next[key]}` : String(now[key]);
    if (changed) li.classList.add("is-up");
    li.append(a, v);
    rows.appendChild(li);
  }
  if (next && rankOf(sub.level + 1) > rankOf(sub.level)) {   // ランクアップ (= 絵が変わる)
    const li = document.createElement("li");
    li.className = "is-up";
    li.textContent = t("shop.sub.rankUp", "ランクアップ");
    rows.appendChild(li);
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "shop-sig__buy";
  if (price == null) {
    btn.disabled = true;
    btn.textContent = t("shop.sig.max", "最大まで強化した");
  } else {
    btn.disabled = price > state.shop.ce;
    btn.textContent = tpl(t("shop.sig.buy", "Lv {n} へ ◆ {p}"), { n: String(sub.level + 1), p: String(price) });
    btn.addEventListener("click", () => buySubUp(i));
  }
  cell.append(head, rows, btn);
  return cell;
}

export function toggleLock(extId) {
  const s = state.shop;
  _offers.forEach((o) => { o.banArm = false; });
  const id = _offers.find((x) => String(x.extId) === String(extId) && !x.sold)?.extId;
  if (id == null) return;
  if (s.locked.some((x) => String(x) === String(id))) s.locked = s.locked.filter((x) => String(x) !== String(id));
  else s.locked.push(id);
  renderShop();
}

/** お断りのアイコン: 1 回目は確かめ (= 「もう一度タップで今後表示しない」)、 2 回目でお断り */
export function armOrBan(extId) {
  const o = _offers.find((x) => String(x.extId) === String(extId) && !x.sold);
  if (!o) return;
  if (o.banArm) { banOffer(extId); return; }
  _offers.forEach((x) => { x.banArm = false; });
  o.banArm = true;
  renderShop();
}

export function banOffer(extId) {
  const s = state.shop;
  const i = _offers.findIndex((x) => String(x.extId) === String(extId) && !x.sold);
  if (i < 0) return;
  if (!canBan(offerFor(extId), state.battle?.starterExtId, s.bansLeft)) return;
  const cost = _banCost();
  if (s.ce < cost) return;   // 作者 2026-10-22: お断りは CE を払う
  s.ce -= cost;
  s.bans.push(_offers[i].extId);
  s.bansLeft -= 1;
  _bannedHere += 1; state.battle?.story?.events?.push("ban");   // SPEC-165
  s.locked = s.locked.filter((x) => String(x) !== String(extId));
  _offers.splice(i, 1);
  renderShop();
}

/** お断りの値段 (= 3-2 の「お断りするまで出られない」で足りなければ手持ちの額。 詰ませない) */
function _banCost() {
  const s = state.shop;
  if (_storyShop()?.must?.includes("ban") && _bannedHere === 0 && (s?.ce ?? 0) < SHOP_BAN_COST) return Math.max(0, Math.floor(s?.ce ?? 0));
  return SHOP_BAN_COST;
}

/** 系列の名前 (= 同じ武器のランクアップは同じ系列。 無ければ extId) */
function seriesOf(extId) { const e = getExt(extId); return e?.series ?? e?.seriesName?.ja ?? String(extId); }
/** 買った品の系列を覚える (= SPEC-170) */
function _noteSeries(extId) { _seriesHere.add(seriesOf(extId)); }

/** いまのリロールの値段 (= 無料なら 0) */
export function currentRerollCost() {
  return (_gamaFree > 0 || state.shop.freeRerolls > 0) ? 0 : rerollCost(_paidRerolls);
}

export function rerollShop() {
  const s = state.shop;
  const cost = currentRerollCost();
  if (cost > s.ce || !canReroll()) return;
  if (_gamaFree > 0) _gamaFree -= 1;
  else if (s.freeRerolls > 0) s.freeRerolls -= 1;
  else { s.ce -= cost; _paidRerolls += 1; }
  // 取り置きと売り切れの枠を残して引き直す (= 作者 2026-10-24。 2026-10-20 の「買った枠も含めて」はやめた)。 前に並んでいた品は続けて出さない
  const last = new Set(_offers.map((o) => String(o.extId)));
  _offers = _keptOffers();
  _offers.forEach((o) => { o.banArm = false; });
  _fillOffers(last);
  _rerolledHere += 1; state.battle?.story?.events?.push("reroll");   // SPEC-165
  renderShop();
  playSe(SFX.LEVEL_UP, 100, 0.4);
}

export function closeShop() {
  if (!_open) return;
  _open = false;
  document.getElementById("shopModal")?.classList.add("hidden");
  // SPEC-090c の「見送りの礼」: 何も買わずに出ると HP が少し戻る
  if (_boughtHere === 0) {
    const heal = canHeal() ? Math.round(Math.min(state.statsMax.hp - state.stats.hp, state.statsMax.hp * perk("skipHeal"))) : 0;
    if (heal > 0) {
      recordHeal(state.run?.stats, "skip", Math.min(state.statsMax.hp, state.stats.hp + heal) - state.stats.hp);   // SPEC-148
      state.stats.hp = Math.min(state.statsMax.hp, state.stats.hp + heal);
      playSe(SFX.PICK_HEAL, 100, 0.55);
    }
  }
  sigOnLevelUp(1, (j, d) => hitEnemy(j, d, "sig"));   // SPEC-148: 出どころ   // SPEC-100 のクリプトスラッシュ: 店を出るたびに周りをなぎ払う
  _offers = [];
  resumeTime();
}

/** タイトルに戻る・ゲームオーバーで、 開いていれば黙って閉じる (= pauseFlags は呼ぶ側がまとめて戻す) */
export function hideShop() {
  hideShopBar();
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
  const sr = _storyShop();   // SPEC-165
  modal.classList.toggle("shop-modal--story", !!sr?.only);
  modal.classList.toggle("shop-modal--story-basic", isStory() && !storyAllows("reroll"));   // SPEC-165: リロールと取り置きは 5-1 で開く
  modal.classList.toggle("shop-modal--story-noban", isStory() && !storyAllows("ban"));   // お断りは 3-2 で開く (= 作者 2026-10-22)
  modal.classList.toggle("shop-modal--nosig", isStory() && !storyAllows("sig"));   // 固有スキルは 5-2 で開く
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
  // SPEC-130: 「ギフト券支払いを優先」 (= 券を持っているときだけ出す)
  const pref = document.getElementById("shopGiftFirstWrap");
  if (pref) pref.classList.toggle("hidden", s.gifts <= 0);
  const box = document.getElementById("shopGiftFirst");
  if (box) box.checked = _giftFirst;
  const sub = document.getElementById("shopSub");
  if (sub) {
    const left = SHOP_PER_STAGE - s.nextIdx;
    sub.textContent = tpl(t("shop.sub", "（あと {n} 回でボス）"), { n: String(Math.max(0, left)) });
  }
  const healed = document.getElementById("shopHealed");
  if (healed) {
    healed.classList.toggle("hidden", !(_healed > 0));
    healed.textContent = tpl(t("shop.healed", "HP +{n}"), { n: String(_healed) });
  }

  _renderSig();   // SPEC-110
  // 最初の店: CE を集めて買うことと、 サービスの 1 品
  const intro = document.getElementById("shopIntro");
  if (intro) {
    intro.classList.toggle("hidden", !s.welcome);
    document.getElementById("shopModal")?.classList.toggle("shop-modal--intro", !!s.welcome);   // スマホは商人のひとことを畳む
    const ain = document.getElementById("shopIntroAin");
    if (ain && !ain.getAttribute("src")) ain.src = naviFrameUrl(NAVI_POSES.smile);
    const msg = document.getElementById("shopIntroText");
    if (msg) msg.textContent = t("shop.intro", "敵が落とす CE を集めると、 ショップで強化ができるよ。 初回はサービスで 1 品無料だよ！");
  }
  renderOwnedStrip(document.getElementById("shopOwned"), document.getElementById("shopOwnedRows"), document.getElementById("shopOwnedHead"));

  const grid = document.getElementById("shopGrid");
  if (grid) {
    grid.innerHTML = "";
    const slots = sr?.only ? _offers.length : Math.max(_offers.length, _slotCount());
    grid.style.setProperty("--cols", String(Math.max(4, slots)));
    grid.dataset.n = String(slots);   // スマホで 5 枚のとき 3 列にする (= css)
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
        wrap.querySelector("span").textContent = o.sold ? t("shop.sold", "売り切れ") : t("shop.gone", "もう買えない");
        grid.appendChild(wrap);
        return;
      }
      const card = buildPickCard(offer, i);
      const price = _priceOf(o, offer);
      const short = price > s.ce;
      const chip = document.createElement("span");
      chip.className = "shop-price" + (short ? " shop-price--short" : "") + (price === 0 ? " shop-price--gift" : "") + (o.sale ? " shop-price--sale" : "");
      chip.textContent = price === 0 ? (sr?.price === 0 ? t("story.shop.free", "🎁 無料") : s.welcome ? t("shop.welcomeFree", "🎁 サービス") : tpl(t("shop.free", "🎟 ギフト券 ×{n}"), { n: String(giftCost(offer) ?? 1) })) : `◆ ${price}`;
      if (o.sale && price > 0) chip.dataset.tag = t("shop.saleTag", "半額");
      card.appendChild(chip);
      card.classList.add("shop-card");
      if (short) card.classList.add("shop-card--short");
      card.setAttribute("aria-disabled", short ? "true" : "false");
      card.addEventListener("click", () => { if (!buyOffer(o.extId)) playSe(SFX.GEM_PICKUP, 100, 0.2); });

      // 右上に取り置き (= 押すと 🔓 → 🔒 と枠の色)、 左上にお断り (= 1 回目で確かめ、 2 回目で今後出さない)
      const locked = s.locked.some((x) => String(x) === String(o.extId));
      if (locked) wrap.classList.add("shop-offer--locked");
      const lock = document.createElement("button");
      lock.type = "button";
      lock.className = "shop-corner shop-corner--lock" + (locked ? " is-on" : "");
      lock.textContent = locked ? "🔒" : "🔓";
      const lockLabel = locked ? t("shop.locked", "取り置き中") : t("shop.lock", "取り置き");
      lock.setAttribute("aria-label", lockLabel);
      lock.title = lockLabel;
      lock.setAttribute("aria-pressed", locked ? "true" : "false");
      lock.addEventListener("click", (e) => { e.stopPropagation(); toggleLock(o.extId); });
      wrap.append(card, lock);
      if (locked) {
        const tag = document.createElement("span");
        tag.className = "shop-offer__lockTag";
        tag.textContent = t("shop.locked", "取り置き中");
        wrap.appendChild(tag);
      }
      if (canBan(offer, state.battle?.starterExtId, s.bansLeft)) {
        const ban = document.createElement("button");
        ban.type = "button";
        ban.className = "shop-corner shop-corner--ban" + (o.banArm ? " is-armed" : "");
        ban.textContent = "✕";
        const banLabel = tpl(t("shop.banHint", "{name} をこの挑戦のあいだ出さない"), { name: getSeriesName(offer.ext, lang) });
        ban.setAttribute("aria-label", (o.banArm ? t("shop.banArm", "もう一度タップで今後表示しない") : banLabel) + ` (◆${_banCost()})`);
        ban.disabled = s.ce < _banCost();   // 作者 2026-10-22: お断りは CE を払う
        ban.title = banLabel;
        ban.addEventListener("click", (e) => { e.stopPropagation(); armOrBan(o.extId); });
        wrap.appendChild(ban);
        if (o.banArm) {
          wrap.classList.add("shop-offer--banArm");
          const hint = document.createElement("span");
          hint.className = "shop-offer__banHint";
          hint.textContent = t("shop.banArm", "もう一度タップで今後表示しない");
          wrap.appendChild(hint);
        }
      }
      grid.appendChild(wrap);
    });
    // 空いた枠 (= お断りした・並べる品が尽きた)。 枠の数を見えるままにする
    if (!sr?.only) {
      const more = canReroll();
      for (let i = _offers.length; i < _slotCount(); i++) {
        const wrap = document.createElement("div");
        wrap.className = "shop-offer shop-offer--sold shop-offer--empty";
        wrap.innerHTML = `<div class="shop-offer__soldcard"><span></span></div>`;
        wrap.querySelector("span").textContent = more ? t("shop.empty", "空き（リロールで入荷）") : t("shop.outOfStock", "品切れ");
        grid.appendChild(wrap);
      }
    }
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
  _text("shopWalletBans", tpl(t("shop.bansLeftShort", "✕ 残り {n}"), { n: String(s.bansLeft) }));   // スマホは手持ちの欄に

  const rr = document.getElementById("shopReroll");
  if (rr) {
    const cost = currentRerollCost();
    rr.textContent = cost === 0 ? t("shop.rerollFree", "リロール（無料）") : tpl(t("shop.reroll", "リロール ◆ {n}"), { n: String(cost) });
    rr.disabled = cost > s.ce || !canReroll();   // 作者 2026-10-24: 引き直せる枠も品も無ければ押せない
  }
  const leave = document.getElementById("shopLeave");
  if (leave) {
    // SPEC-165: ストーリーで「買うまで閉じられない」 (= mustBuy)
    const done = { reroll: _rerolledHere, ban: _bannedHere, sig: _sigHere, buy: _boughtHere };
    // 満たす手段が無くなった関所は開く (= 作者 2026-10-22: 3-2 で全部買って ✕ が無くなり、 閉じられずに詰んだ人が出た)
    const bannable = _offers.some((o) => !o.sold && offerFor(o.extId, new Set(s.bans)) && canBan(offerFor(o.extId, new Set(s.bans)), state.battle?.starterExtId, s.bansLeft) && s.ce >= _banCost());
    const possible = { reroll: currentRerollCost() <= s.ce && canReroll(), ban: bannable, sig: true, buy: true };
    const left = (sr?.must ?? []).filter((k) => !done[k] && possible[k]);   // SPEC-165: 5-1 リロール / 5-2 固有スキル
    const gate = (!!sr?.mustBuy && _boughtHere === 0) || left.length > 0;
    leave.disabled = gate;
    leave.textContent = left.length > 0 ? t(`story.shop.must.${left[0]}`, "やってみよう！") : gate ? t("story.shop.buy", "買おう！")
      : (_boughtHere === 0 && perk("skipHeal") > 0
        ? t("shop.leaveHeal", "何も買わずに出る（HP 回復）")
        : t("shop.leave", "次のウェーブへ ▶"));
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
  document.getElementById("shopGiftFirst")?.addEventListener("change", (e) => toggleGiftFirst(e.target.checked));   // SPEC-130
  onLangChange(() => { if (_open) renderShop(); });
}

/** テスト用 */
export const _test = { get offers() { return _offers; }, set offers(v) { _offers = v; }, set merchant(m) { _merchant = m; }, set series(v) { _seriesHere = new Set(v); } };
