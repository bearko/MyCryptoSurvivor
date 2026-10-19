// ============================================================
// battle/levelup.js — Level-up モーダル + extension 3 択ピック (= SPEC-008)
// ============================================================
//
// pauseFlags 不変条件: openNext で pauseTime、 close で resumeTime。
// pending count を持っているので、 1 フレーム複数 LV up でも連鎖して開く。

import { state, pauseTime, resumeTime } from "../state.js";
import { perk, stockLimit } from "../perks.js";   // SPEC-090c
import {
  EXT_ROSTER, extImg, extTierImg, getExt, getCategory,
  getTierName, getSkillName, getSkillDesc,
} from "../extensions.js";
import {
  EXT_MAX_LEVEL, LL_LEVEL, PICK_OPTIONS_COUNT,
  SERIES_COLOR_DEFAULT, FALLBACK_WEAPON,
  SFX,
  STOCK_LIMIT_WEAPON, STOCK_LIMIT_BUFF,
} from "../constants.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { applyBuff } from "./buffs.js";
import { t, tpl, getLang, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";
import { prefersReducedMotion } from "../motion.js";
import { sigNextPickSteps, sigOnPicked } from "./signature.js";   // SPEC-100

let _pendingCount = 0;
let _isOpen      = false;
let _isStarter   = false;
let _wired       = false;
let _shown       = new Set();   // SPEC-067: このレベルアップで出したもの (= リロールで続けて出さない)

/**
 * 通常 Level up trigger。 多重 LV up は count に蓄積して連鎖。
 */
export function triggerLevelUpPick(n = 1) {
  _pendingCount += Math.max(0, n);
  if (!_isOpen) _openNext();
}

/**
 * 戦闘開始直後の starter pick。 1 回のみ。
 */
export function triggerStarterPick() {
  _isStarter   = true;
  _pendingCount += 1;
  if (!_isOpen) _openNext();
}

function _openNext() {
  if (_pendingCount <= 0) { _isStarter = false; return; }
  _pendingCount -= 1;
  _isOpen = true;
  _shown = new Set();

  let opts = _samplePicks(PICK_OPTIONS_COUNT);
  if (opts.length === 0) {
    // 候補ゼロ (= EXT_ROSTER 未ロード等) は fallback weapon を 1 個自動付与し close
    _ensureFallbackWeapon();
    _isOpen = false;
    _isStarter = false;
    if (_pendingCount > 0) _openNext();
    return;
  }
  state.pendingPickOptions   = opts;
  state.pendingPickIsStarter = _isStarter;

  pauseTime();
  _wireOnce();
  _picking = false;
  renderLevelUpModal();
  document.getElementById("levelUpModal")?.classList.remove("hidden");
  _deal();   // SPEC-057: カードを 1 枚ずつめくって配る
  playSe(SFX.LEVEL_UP, 200, 0.55);   // SPEC-017: open_treasure.mp3
}

/**
 * SPEC-067: 候補から n 個を選ぶ (= 純関数。 tests/levelup-picks.test.mjs)。
 *   - 武器を 1 つ優先し、 残りを重ならないように埋める (= SPEC-013)
 *   - exclude (= このレベルアップで出したもの) は避ける。 足りないときだけ、 前に出したものから埋める
 *     (= 直前に出したもの (last) は最後)
 */
export function pickFromPool(eligible, n, { exclude = new Set(), last = new Set(), rnd = Math.random } = {}) {
  const id = (e) => String(e.extId);
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const fresh = eligible.filter((e) => !exclude.has(id(e)));
  const used = new Set();
  const result = [];
  // 1) 武器を 1 枠優先 (= 避けるものの外から)
  const weaponPool = fresh.filter((e) => e.category === "weapon");
  if (weaponPool.length > 0 && n > 0) {
    const w = weaponPool[Math.floor(rnd() * weaponPool.length)];
    result.push(w);
    used.add(id(w));
  }
  // 2) 残りを避けるものの外から、 重ならないように
  for (const e of shuffle(fresh.filter((x) => !used.has(id(x))))) {
    if (result.length >= n) break;
    result.push(e);
    used.add(id(e));
  }
  // 3) 足りないときだけ、 前に出したもの (= 直前のものは最後)
  if (result.length < n) {
    const older = shuffle(eligible.filter((e) => exclude.has(id(e)) && !last.has(id(e)) && !used.has(id(e))));
    const lastOnes = shuffle(eligible.filter((e) => last.has(id(e)) && !used.has(id(e))));
    for (const e of [...older, ...lastOnes]) {
      if (result.length >= n) break;
      result.push(e);
      used.add(id(e));
    }
  }
  // 4) 表示順をばらす (= 武器が常に先頭にならないよう)
  return shuffle(result);
}

/**
 * SPEC-087: 装備中の帯の中身 (= 純関数。 tests/levelup-owned.test.mjs)。
 *   武器 → 強化の順に、 持っているもの (= 持った順) と、 上限までの空き枠の数を返す。
 *   categoryOf が "weapon" / "buff" 以外を返すもの (= 図鑑に無い) は数えない
 * @returns {Array<{category:"weapon"|"buff", limit:number, items:Array<{extId, level:number, isMax:boolean}>, empty:number}>}
 */
export function ownedStripGroups(owned, categoryOf, {
  weaponLimit = STOCK_LIMIT_WEAPON, buffLimit = STOCK_LIMIT_BUFF, maxLevel = EXT_MAX_LEVEL,
} = {}) {
  const groups = [
    { category: "weapon", limit: weaponLimit, items: [], empty: 0 },
    { category: "buff",   limit: buffLimit,   items: [], empty: 0 },
  ];
  for (const o of owned ?? []) {
    const g = groups.find((x) => x.category === categoryOf(o));
    if (!g) continue;
    const level = Math.max(0, o.level | 0);
    g.items.push({ extId: o.extId, level, isMax: level >= maxLevel });
  }
  for (const g of groups) g.empty = Math.max(0, g.limit - g.items.length);
  return groups;
}

/**
 * SPEC-087: 候補の札に付ける印 (= 純関数)。
 *   null = 新しいもの (NEW) / "rankUp" = 持っているものが上がる / "rankUpMax" = 次で上限に届く
 */
export function rankUpKind(opt, maxLevel = EXT_MAX_LEVEL) {
  if (!opt || opt.isNew) return null;
  return (opt.nextLevel >= maxLevel) ? "rankUpMax" : "rankUp";
}

/**
 * SPEC-101: LL ランクアップの札を出すか (= 純関数)。 ヒーローの初期武器が Lv.5 で、 その系列に LL 版があるとき
 * @returns {object|null} 候補 (= 1 枚目に置く)
 */
export function llOption(owned, starterExtId, getExtFn, maxLevel = EXT_MAX_LEVEL) {
  if (starterExtId == null) return null;
  const o = (owned ?? []).find((x) => String(x.extId) === String(starterExtId));
  const ext = getExtFn(starterExtId);
  if (!o || !ext?.ll || o.level !== maxLevel) return null;
  return { extId: starterExtId, ext, currentLevel: maxLevel, nextLevel: LL_LEVEL, isNew: false, isLL: true };
}

function _samplePicks(n, exclude = new Set(), last = new Set(), withLL = true) {
  // SPEC-101: 初期武器が Lv.5 なら、 1 枚目は必ず LL ランクアップ (= 残りの枚数を配る)
  const ll = withLL ? llOption(state.ownedExtensions, state.battle?.starterExtId, getExt) : null;
  if (ll) return n <= 1 ? [ll] : [ll, ..._samplePicks(n - 1, new Set([...exclude, String(ll.extId)]), last, false)];
  const ownedById = new Map(state.ownedExtensions.map(o => [String(o.extId), o]));

  // SPEC-023: stock 上限到達後は新規系列を候補から除外 (= 既所持の lv up のみ)
  const ownedWeaponCount = state.ownedExtensions
    .filter(o => getCategory(getExt(o.extId)) === "weapon").length;
  const ownedBuffCount   = state.ownedExtensions
    .filter(o => getCategory(getExt(o.extId)) === "buff").length;
  const weaponStockFull = ownedWeaponCount >= stockLimit("weapon");   // SPEC-090c: 大きな鞄で +1
  const buffStockFull   = ownedBuffCount   >= stockLimit("buff");

  const eligible = EXT_ROSTER.filter(e => {
    const o = ownedById.get(String(e.extId));
    if (o) return o.level < EXT_MAX_LEVEL;   // 既所持は EXT_MAX_LEVEL 未満なら eligible
    // 未所持: stock 上限に達していなければ追加可能
    if (e.category === "weapon") return !weaponStockFull;
    if (e.category === "buff")   return !buffStockFull;
    return true;
  });

  // SPEC-013: 重複防止、 最低 1 weapon。 SPEC-067: このレベルアップで出したものは避ける
  const result = pickFromPool(eligible, n, { exclude, last });
  for (const e of result) _shown.add(String(e.extId));

  return result.map(e => {
    const o   = ownedById.get(String(e.extId));
    const cur = o?.level ?? 0;
    return {
      extId:        e.extId,
      ext:          e,
      currentLevel: cur,
      nextLevel:    Math.min(EXT_MAX_LEVEL, cur + sigNextPickSteps()),   // SPEC-100: テトラクテュスは 4 回目ごとに 2 段
      isNew:        !o,
    };
  });
}

function _ensureFallbackWeapon() {
  if (state.battle.weapons.length > 0) return;
  state.battle.weapons.push({ ...FALLBACK_WEAPON, lastFireMs: 0 });
}

/**
 * SPEC-023: ピッカーをリロール (= 残回数 1 消費して 3 候補を再抽選)。
 * pendingPickOptions が空 / モーダル閉 / rerollsLeft <= 0 なら no-op。
 */
export function rerollPicks() {
  if (!_isOpen) return;
  if ((state.battle.rerollsLeft ?? 0) <= 0) return;
  state.battle.rerollsLeft -= 1;
  // SPEC-067: リロール前に出ていたもの (= このレベルアップで出したもの全部) は、 足りるかぎり続けて出さない
  const last = new Set((state.pendingPickOptions ?? []).map((o) => String(o.extId)));
  state.pendingPickOptions = _samplePicks(PICK_OPTIONS_COUNT, new Set(_shown), last);
  renderLevelUpModal();
  _deal();   // SPEC-057: 引き直したカードも配り直す
  playSe(SFX.LEVEL_UP, 100, 0.4);   // SPEC-017: 同じ open_treasure を流用
}

/**
 * SPEC-067: スキップ (= どれも取らずに閉じる)。 選んだカードが光っているあいだは押せない。 最初の武器を選ぶときは出さない
 */
export function skipPick() {
  if (!_isOpen || _picking || state.pendingPickIsStarter) return;
  // SPEC-090c: 見送りの礼 (= スキップすると HP が少し戻る)
  const heal = Math.round(state.statsMax.hp * perk("skipHeal"));
  if (heal > 0) {
    state.stats.hp = Math.min(state.statsMax.hp, state.stats.hp + heal);
    playSe(SFX.PICK_HEAL, 100, 0.55);
  }
  _close();
}

export function applyPick(extId) {
  const ext   = getExt(extId);
  const owned = state.ownedExtensions.find(o => String(o.extId) === String(extId));
  // SPEC-100: テトラクテュス (= ピタゴラス) は 4 回目ごとのピックで 2 段上がる
  const steps = sigNextPickSteps();
  // SPEC-101: Lv.5 の初期武器を選んだら LL (= Lv.5 の武器が候補に出るのは LL の札だけ)
  const toLL  = !!llOption(state.ownedExtensions, state.battle?.starterExtId, getExt) && String(extId) === String(state.battle?.starterExtId);
  // 段は下げない (= LL の武器がもう一度選ばれても Lv.5 に戻さない)
  const next  = Math.max(owned?.level ?? 0, toLL ? LL_LEVEL : Math.min(EXT_MAX_LEVEL, (owned?.level ?? 0) + steps));
  if (owned) owned.level = next;
  else       state.ownedExtensions.push({ extId, level: next });
  sigOnPicked();

  // SPEC-011: weapon vs buff で適用先を分岐
  // SPEC-017: ピック確定 SE (= 武器 = insp、 回復 = 3_heal、 その他 buff = 4_buff)
  if (getCategory(ext) === "buff") {
    applyBuff(extId, next);
    const isHeal = ext?.archetype === "hpMaxUp" || ext?.archetype === "regen";
    playSe(isHeal ? SFX.PICK_HEAL : SFX.PICK_BUFF, 100, 0.55);
  } else {
    rebuildWeaponsFromOwned();
    playSe(SFX.PICK_WEAPON, 100, 0.55);
  }
  if (toLL) showLLReveal(ext);   // SPEC-101
  _close();
}

/** SPEC-101: LL の品の絵を大きく出す (= 0.8 秒。 遊びは止めない。 演出を減らす設定では出さない) */
function showLLReveal(ext) {
  if (prefersReducedMotion() || typeof document === "undefined") return;
  const el = document.createElement("div");
  el.className = "ll-reveal";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<img class="ll-reveal__icon" src="${extTierImg(ext, LL_LEVEL)}" alt="" /><div class="ll-reveal__name"></div>`;
  el.querySelector(".ll-reveal__name").textContent = getTierName(ext, LL_LEVEL, getLang());
  document.body.appendChild(el);
  el.addEventListener("click", () => el.remove());
  setTimeout(() => el.remove(), 1200);
}

// ============================================================
// SPEC-057: 配る・選ぶの演出 (= 選んだカードが光ってから閉じる。 ほかは沈む)
// ============================================================
export const PICK_FX_MS = 240;
let _picking = false;

function _deal() {
  const modal = document.getElementById("levelUpModal");
  if (!modal) return;
  modal.classList.remove("levelup-modal--deal", "levelup-modal--picking");
  void modal.offsetWidth;   // かけ直す
  modal.classList.add("levelup-modal--deal");
}

function _pickWithFx(card, extId) {
  if (_picking) return;   // 光っているあいだの二度押しを捨てる
  if (prefersReducedMotion()) { applyPick(extId); return; }
  _picking = true;
  card.classList.add("levelup-card--picked");
  const modal = document.getElementById("levelUpModal");
  // 配る動き (= 最後の形を保つ) を外さないと、 沈む・光るが効かない
  modal?.classList.remove("levelup-modal--deal");
  modal?.classList.add("levelup-modal--picking");
  setTimeout(() => {
    _picking = false;
    document.getElementById("levelUpModal")?.classList.remove("levelup-modal--picking");
    applyPick(extId);
  }, PICK_FX_MS);
}

function _close() {
  document.getElementById("levelUpModal")?.classList.add("hidden");
  state.pendingPickOptions   = [];
  state.pendingPickIsStarter = false;
  _isOpen    = false;
  _isStarter = false;
  resumeTime();
  if (_pendingCount > 0) _openNext();
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;
  // SPEC-023: リロールボタン
  document.getElementById("levelUpReroll")?.addEventListener("click", rerollPicks);
  // SPEC-067: スキップ (= 取得しない)
  document.getElementById("levelUpSkip")?.addEventListener("click", skipPick);
  // 言語切替で再描画
  onLangChange(() => {
    if (!document.getElementById("levelUpModal")?.classList.contains("hidden")) {
      renderLevelUpModal();
    }
  });
}

/**
 * モーダル中身を再描画 (= 言語切替 / 再オープン時)。
 */
export function renderLevelUpModal() {
  const grid = document.getElementById("levelUpGrid");
  if (!grid) return;

  const titleEl = document.getElementById("levelUpTitle");
  const subEl   = document.getElementById("levelUpSub");
  if (titleEl) {
    titleEl.textContent = state.pendingPickIsStarter
      ? t("levelup.title", "Level Up!")
      : t("levelup.title", "Level Up!");
  }
  if (subEl) {
    subEl.textContent = state.pendingPickIsStarter
      ? t("levelup.starter", "Choose your starting weapon")
      : (sigNextPickSteps() > 1
        ? t("levelup.tetractys", "Tetractys: this pick rises 2 levels")   // SPEC-100
        : t("levelup.sub", "Choose one upgrade"));
  }

  _renderOwned();   // SPEC-087: 装備中の帯

  grid.innerHTML = "";
  const lang = getLang();
  const newLabel = t("ext.new", "NEW");
  const lvUpTpl  = t("levelup.delta", "Lv.{cur} → Lv.{next}");

  for (const opt of state.pendingPickOptions) {
    const card = document.createElement("button");
    card.className = "levelup-card";
    card.type = "button";
    card.setAttribute("data-ext-id", String(opt.extId));
    card.setAttribute("data-series", opt.ext.series ?? "");
    card.setAttribute("data-category", opt.ext.category ?? "weapon");
    // SPEC-087: 持っているものの札は「ランクアップ」(= 金の縁と、 アイコンの上の金の帯)
    const rankUp = opt.isLL ? "ll" : rankUpKind(opt);   // SPEC-101
    if (opt.isLL) card.classList.add("levelup-card--ll");
    if (rankUp) {
      card.classList.add("levelup-card--rankup");
      if (rankUp === "rankUpMax") card.classList.add("levelup-card--rankup-max");
    }

    // SPEC-011: 「次に到達する tier」 の名前 / 効果を見せる (= ピック前のプレビュー)
    const tierName  = getTierName(opt.ext, opt.nextLevel, lang);
    const skillName = opt.isLL ? (opt.ext.ll.skillName[lang] ?? opt.ext.ll.skillName.ja) : getSkillName(opt.ext, lang);   // SPEC-101
    const skillDesc = getSkillDesc(opt.ext, opt.nextLevel, lang);
    const series    = opt.ext.series ?? "";
    const seriesColor = opt.ext.seriesColor ?? SERIES_COLOR_DEFAULT;
    const lvLabel = opt.isNew
      ? newLabel
      : (opt.isLL
        ? tpl(lvUpTpl, { cur: String(opt.currentLevel), next: "LL" }).replace("Lv.LL", "LL")   // SPEC-101
        : tpl(lvUpTpl, { cur: String(opt.currentLevel), next: String(opt.nextLevel) }));

    // SPEC-024: カード上端に 「武器エクステ / 強化エクステ」 のカテゴリ見出し
    const catEl = document.createElement("div");
    catEl.className = "levelup-card__cat";
    catEl.textContent = opt.ext.category === "buff"
      ? t("levelup.cat.buff",   "Buff")
      : t("levelup.cat.weapon", "Weapon");

    // 左カラム: アイコン (= iconId 経由)
    const iconWrap = document.createElement("div");
    iconWrap.className = "levelup-card__icon-wrap";
    iconWrap.style.borderColor = seriesColor;
    const iconImg = document.createElement("img");
    iconImg.className = "levelup-card__icon";
    iconImg.alt = tierName;
    iconImg.src = extTierImg(opt.ext, opt.nextLevel);   // SPEC-021: 次 tier の icon を表示
    iconImg.loading = "lazy";
    iconImg.onerror = () => {
      iconImg.classList.add("levelup-card__icon--missing");
      iconImg.removeAttribute("src");
    };
    iconWrap.appendChild(iconImg);
    if (rankUp) {
      const badge = document.createElement("div");
      badge.className = "levelup-card__rankup";
      badge.textContent = rankUp === "ll"
        ? t("levelup.rankUpLL", "LL ランクアップ")   // SPEC-101
        : (rankUp === "rankUpMax")
          ? t("levelup.rankUpMax", "ランクアップ MAX")
          : t("levelup.rankUp", "ランクアップ");
      iconWrap.appendChild(badge);
    }

    // 右カラム: 系列バー + tier 名 + スキル名 + 効果説明 + Lv
    const main = document.createElement("div");
    main.className = "levelup-card__main";

    const bar = document.createElement("div");
    bar.className = "levelup-card__series";
    bar.style.background = seriesColor;

    const nameEl = document.createElement("div");
    nameEl.className = "levelup-card__name";
    nameEl.textContent = tierName;

    const skillEl = document.createElement("div");
    skillEl.className = "levelup-card__skill";
    skillEl.textContent = skillName;

    const descEl = document.createElement("div");
    descEl.className = "levelup-card__effect";
    descEl.textContent = skillDesc;

    const lvEl = document.createElement("div");
    lvEl.className = "levelup-card__lv";
    lvEl.textContent = lvLabel;

    main.append(bar, nameEl, skillEl, descEl, lvEl);

    card.append(catEl, iconWrap, main);
    card.style.setProperty("--i", String(grid.children.length));   // SPEC-057: 配る順
    card.addEventListener("click", () => _pickWithFx(card, opt.extId));
    grid.appendChild(card);
  }

  // SPEC-023: リロールボタンの残数表示 + disabled 状態
  const rerollBtn = document.getElementById("levelUpReroll");
  if (rerollBtn) {
    const left = state.battle?.rerollsLeft ?? 0;
    const lbl  = (left > 0)
      ? tpl(t("levelup.reroll", "リロール (残 {n})"), { n: String(left) })
      : t("levelup.rerollNone", "リロール不可");
    rerollBtn.textContent = lbl;
    rerollBtn.disabled = left <= 0;
  }
  // SPEC-067: スキップ (= 最初の武器を選ぶときは出さない)
  const skipBtn = document.getElementById("levelUpSkip");
  if (skipBtn) {
    skipBtn.textContent = t("levelup.skip", "スキップ（取得しない）");
    skipBtn.classList.toggle("hidden", !!state.pendingPickIsStarter);
  }
}

/**
 * SPEC-087: 装備中の帯 (= 武器の行と強化の行。 それぞれ、 持っているものの絵と Lv、 上限までの空き枠)。
 * 何も持っていなければ (= 最初の武器を選ぶとき) 隠す。 候補の札より上に置く
 */
function _renderOwned() {
  const wrap = document.getElementById("levelUpOwned");
  const rows = document.getElementById("levelUpOwnedRows");
  if (!wrap || !rows) return;
  const owned = state.ownedExtensions ?? [];
  rows.innerHTML = "";
  if (owned.length === 0) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");

  const head = document.getElementById("levelUpOwnedHead");
  if (head) head.textContent = t("levelup.owned", "装備中");
  const lang = getLang();
  const groups = ownedStripGroups(owned, (o) => getCategory(getExt(o.extId)), { weaponLimit: stockLimit("weapon"), buffLimit: stockLimit("buff") });   // SPEC-090c
  for (const g of groups) {
    const row = document.createElement("div");
    row.className = "levelup-owned__row";
    row.setAttribute("data-category", g.category);

    const label = document.createElement("div");
    label.className = "levelup-owned__label";
    const catEl = document.createElement("span");
    catEl.textContent = (g.category === "buff")
      ? t("levelup.owned.buff",   "強化")
      : t("levelup.owned.weapon", "武器");
    const countEl = document.createElement("span");
    countEl.className = "levelup-owned__count num";
    countEl.textContent = `${g.items.length}/${g.limit}`;
    label.append(catEl, countEl);
    const tiles = document.createElement("div");
    tiles.className = "levelup-owned__tiles";
    row.append(label, tiles);

    for (const it of g.items) {
      const ext  = getExt(it.extId);
      const tile = document.createElement("div");
      tile.className = "levelup-owned__tile";
      tile.style.setProperty("--series", ext?.seriesColor ?? SERIES_COLOR_DEFAULT);
      const tierName = getTierName(ext, it.level, lang);
      const lvText = it.level >= LL_LEVEL
        ? "LL"   // SPEC-101
        : it.isMax
        ? t("levelup.owned.max", "MAX")
        : tpl(t("levelup.owned.lv", "Lv.{n}"), { n: String(it.level) });
      tile.title = `${tierName} ${lvText}`;
      const icon = document.createElement("img");
      icon.className = "levelup-owned__icon";
      icon.alt = tierName;
      icon.src = extTierImg(ext, it.level);
      icon.loading = "lazy";
      icon.onerror = () => { icon.classList.add("levelup-owned__icon--missing"); icon.removeAttribute("src"); };
      const lv = document.createElement("span");
      lv.className = "levelup-owned__lv num";
      if (it.isMax) lv.classList.add("levelup-owned__lv--max");
      lv.textContent = lvText;
      tile.append(icon, lv);
      tiles.appendChild(tile);
    }
    for (let i = 0; i < g.empty; i++) {
      const empty = document.createElement("div");
      empty.className = "levelup-owned__tile levelup-owned__tile--empty";
      empty.setAttribute("aria-hidden", "true");
      tiles.appendChild(empty);
    }
    rows.appendChild(row);
  }
}
