// ============================================================
// battle/levelup.js — Level-up モーダル + extension 3 択ピック (= SPEC-008)
// ============================================================
//
// pauseFlags 不変条件: openNext で pauseTime、 close で resumeTime。
// pending count を持っているので、 1 フレーム複数 LV up でも連鎖して開く。

import { state, pauseTime, resumeTime } from "../state.js";
import { EXT_ROSTER } from "../extensions.js";
import {
  EXT_MAX_LEVEL, PICK_OPTIONS_COUNT,
  SERIES_COLOR, SERIES_COLOR_DEFAULT, FALLBACK_WEAPON,
} from "../constants.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { localizedExtName } from "../extensions.js";
import { t, tpl, getLang, onLangChange } from "../i18n.js";

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
}

function _samplePicks(n) {
  const ownedById = new Map(state.ownedExtensions.map(o => [String(o.extId), o]));
  const eligible = EXT_ROSTER.filter(e => {
    const o = ownedById.get(String(e.extId));
    return !o || o.level < EXT_MAX_LEVEL;
  });
  const arr = eligible.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length)).map(e => {
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

export function applyPick(extId) {
  const owned = state.ownedExtensions.find(o => String(o.extId) === String(extId));
  if (owned) owned.level = Math.min(EXT_MAX_LEVEL, owned.level + 1);
  else       state.ownedExtensions.push({ extId, level: 1 });
  rebuildWeaponsFromOwned();
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
    const name   = localizedExtName(opt.ext, lang);
    const series = opt.ext.series ?? "";
    const seriesColor = SERIES_COLOR[series] ?? SERIES_COLOR_DEFAULT;
    const lvLabel = opt.isNew
      ? newLabel
      : tpl(lvUpTpl, { cur: String(opt.currentLevel), next: String(opt.nextLevel) });

    const bar = document.createElement("div");
    bar.className = "levelup-card__series";
    bar.style.background = seriesColor;
    const nameEl = document.createElement("div");
    nameEl.className = "levelup-card__name";
    nameEl.textContent = name;
    const seriesEl = document.createElement("div");
    seriesEl.className = "levelup-card__series-label";
    seriesEl.textContent = series;
    const lvEl = document.createElement("div");
    lvEl.className = "levelup-card__lv";
    lvEl.textContent = lvLabel;

    card.append(bar, nameEl, seriesEl, lvEl);
    card.addEventListener("click", () => applyPick(opt.extId));
    grid.appendChild(card);
  }
}
