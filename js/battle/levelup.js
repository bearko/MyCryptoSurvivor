// ============================================================
// battle/levelup.js — Level-up モーダル + extension 3 択ピック (= SPEC-008)
// ============================================================
//
// pauseFlags 不変条件: openNext で pauseTime、 close で resumeTime。
// pending count を持っているので、 1 フレーム複数 LV up でも連鎖して開く。

import { state, pauseTime, resumeTime } from "../state.js";
import {
  EXT_ROSTER, extImg, extTierImg, getExt, getCategory,
  getTierName, getSkillName, getSkillDesc,
} from "../extensions.js";
import {
  EXT_MAX_LEVEL, PICK_OPTIONS_COUNT,
  SERIES_COLOR_DEFAULT, FALLBACK_WEAPON,
  SFX,
  STOCK_LIMIT_WEAPON, STOCK_LIMIT_BUFF,
} from "../constants.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { applyBuff } from "./buffs.js";
import { t, tpl, getLang, onLangChange } from "../i18n.js";
import { playSe } from "../audio.js";

let _pendingCount = 0;
let _isOpen      = false;
let _isStarter   = false;
let _wired       = false;

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
  renderLevelUpModal();
  document.getElementById("levelUpModal")?.classList.remove("hidden");
  playSe(SFX.LEVEL_UP, 200, 0.55);   // SPEC-017: open_treasure.mp3
}

function _samplePicks(n) {
  const ownedById = new Map(state.ownedExtensions.map(o => [String(o.extId), o]));

  // SPEC-023: stock 上限到達後は新規系列を候補から除外 (= 既所持の lv up のみ)
  const ownedWeaponCount = state.ownedExtensions
    .filter(o => getCategory(getExt(o.extId)) === "weapon").length;
  const ownedBuffCount   = state.ownedExtensions
    .filter(o => getCategory(getExt(o.extId)) === "buff").length;
  const weaponStockFull = ownedWeaponCount >= STOCK_LIMIT_WEAPON;
  const buffStockFull   = ownedBuffCount   >= STOCK_LIMIT_BUFF;

  const eligible = EXT_ROSTER.filter(e => {
    const o = ownedById.get(String(e.extId));
    if (o) return o.level < EXT_MAX_LEVEL;   // 既所持は EXT_MAX_LEVEL 未満なら eligible
    // 未所持: stock 上限に達していなければ追加可能
    if (e.category === "weapon") return !weaponStockFull;
    if (e.category === "buff")   return !buffStockFull;
    return true;
  });

  // SPEC-013: 重複防止 (= Set)、 最低 1 weapon (= weapon eligible が 0 件のときは buff のみ)
  const used   = new Set();
  const result = [];

  // 1) weapon を 1 枠優先確保
  const weaponPool = eligible.filter(e => e.category === "weapon");
  if (weaponPool.length > 0 && n > 0) {
    const w = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    result.push(w);
    used.add(String(w.extId));
  }

  // 2) 残り枠を eligible 全体から重複なく fill
  const restPool = eligible.filter(e => !used.has(String(e.extId)));
  for (let i = restPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [restPool[i], restPool[j]] = [restPool[j], restPool[i]];
  }
  for (const e of restPool) {
    if (result.length >= n) break;
    if (used.has(String(e.extId))) continue;   // 防御 (= eligible が同 extId 重複しない前提だが念のため)
    result.push(e);
    used.add(String(e.extId));
  }

  // 3) 表示順をランダム化 (= weapon が常に先頭にならないよう)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.map(e => {
    const o   = ownedById.get(String(e.extId));
    const cur = o?.level ?? 0;
    return {
      extId:        e.extId,
      ext:          e,
      currentLevel: cur,
      nextLevel:    cur + 1,
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
  state.pendingPickOptions = _samplePicks(PICK_OPTIONS_COUNT);
  renderLevelUpModal();
  playSe(SFX.LEVEL_UP, 100, 0.4);   // SPEC-017: 同じ open_treasure を流用
}

export function applyPick(extId) {
  const ext   = getExt(extId);
  const owned = state.ownedExtensions.find(o => String(o.extId) === String(extId));
  const next  = owned ? Math.min(EXT_MAX_LEVEL, owned.level + 1) : 1;
  if (owned) owned.level = next;
  else       state.ownedExtensions.push({ extId, level: next });

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
  _close();
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
      : t("levelup.sub", "Choose one upgrade");
  }

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

    // SPEC-011: 「次に到達する tier」 の名前 / 効果を見せる (= ピック前のプレビュー)
    const tierName  = getTierName(opt.ext, opt.nextLevel, lang);
    const skillName = getSkillName(opt.ext, lang);
    const skillDesc = getSkillDesc(opt.ext, opt.nextLevel, lang);
    const series    = opt.ext.series ?? "";
    const seriesColor = opt.ext.seriesColor ?? SERIES_COLOR_DEFAULT;
    const lvLabel = opt.isNew
      ? newLabel
      : tpl(lvUpTpl, { cur: String(opt.currentLevel), next: String(opt.nextLevel) });

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
    card.addEventListener("click", () => applyPick(opt.extId));
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
}
