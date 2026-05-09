// ============================================================
// main.js — エントリポイント
// ============================================================

import { state, pauseTime, resumeTime } from "./state.js";
import { initI18n, setLang, getLang, t, tpl, onLangChange } from "./i18n.js";
import {
  TICK_INTERVAL_MS,
  SECONDS_PER_WEEK,
  WEEKS_PER_MONTH,
  MONTHS_PER_YEAR,
} from "./constants.js";
import {
  HERO_ROSTER,
  loadHeroes,
  getHero,
  heroImg,
  elementEmoji,
  localizedHeroName,
  localizedHeroBlurb,
} from "./heroes.js";

// ============================================================
// DOM helpers
// ============================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// Init
// ============================================================
async function init() {
  pauseTime();   // ← 起動 splash 中は時間停止

  await Promise.all([
    initI18n(),
    loadHeroes().catch((e) => console.error("loadHeroes failed", e)),
  ]);

  // ロード完了 → splash dismiss
  $("#splash")?.classList.add("hidden");
  $("#titleScreen")?.classList.remove("hidden");

  resumeTime();   // ← splash 終了

  setupTitleScreen();
  setupHelpOverlay();
  setupLangToggle();
  setupHeroSelectModal();

  // タイトル画面表示中は時間が進むが、 onTick は state.activeXxx が無いので何も起きない
  startTimeLoop();
}

// ============================================================
// Title screen
// ============================================================
function setupTitleScreen() {
  $("#btnPressStart")?.addEventListener("click", dismissTitle);
}

function dismissTitle() {
  $("#titleScreen")?.classList.add("hidden");
  $("#app")?.classList.remove("hidden");
  // BGM 開始は audio.js の startBgm をここで呼ぶ
  // import("./audio.js").then(({ startBgm }) => startBgm("Audio/bgm_home.mp3"));

  // Day 1: ヒーロー選択モーダルを開く (= SPEC-001 Phase 1 mock)
  openHeroSelectModal();
}

// ============================================================
// Lang toggle
// ============================================================
function setupLangToggle() {
  // タイトル画面の lang toggle
  $("#langToggle")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-lang]");
    if (!btn) return;
    setLang(btn.getAttribute("data-lang"));
    refreshLangButtonState();
  });
  refreshLangButtonState();

  // ヘッダーボタン (= 1 クリックで toggle)
  $("#btnLangToggle")?.addEventListener("click", () => {
    setLang(getLang() === "en" ? "ja" : "en");
    refreshLangButtonState();
  });
}

function refreshLangButtonState() {
  $$(".lang-btn").forEach((b) => {
    b.classList.toggle(
      "lang-btn--active",
      b.getAttribute("data-lang") === getLang()
    );
  });
}

// ============================================================
// Help overlay
// ============================================================
function setupHelpOverlay() {
  const overlay = $("#helpOverlay");
  if (!overlay) return;

  $("#btnHelpOpen")?.addEventListener("click", openHelp);
  $("#btnHelpClose")?.addEventListener("click", closeHelp);
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "helpOverlay") closeHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
      closeHelp();
    }
  });
}

function openHelp() {
  pauseTime();
  $("#helpOverlay")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeHelp() {
  $("#helpOverlay")?.classList.add("hidden");
  document.body.style.overflow = "";
  resumeTime();
}

// ============================================================
// Hero select modal (= SPEC-001 Phase 1 mock)
// ============================================================
function setupHeroSelectModal() {
  const modal = $("#heroSelectModal");
  if (!modal) return;

  $("#heroSelectClose")?.addEventListener("click", closeHeroSelectModal);
  $("#heroSelectCta")?.addEventListener("click", applyHeroPick);

  // 背景クリックで閉じる
  modal.addEventListener("click", (e) => {
    if (e.target.id === "heroSelectModal") closeHeroSelectModal();
  });

  // Esc で閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeHeroSelectModal();
    }
  });

  // 言語切替時、 開いているならタイル / hint を再レンダし、 ヘッダー badge も追従
  onLangChange(() => {
    if (!modal.classList.contains("hidden")) renderHeroSelectModal();
    renderOwnedHeroBadge();
  });
}

function openHeroSelectModal() {
  const modal = $("#heroSelectModal");
  if (!modal) return;
  pauseTime();
  state.pendingHeroPick = null;
  renderHeroSelectModal();
  modal.classList.remove("hidden");
}

function closeHeroSelectModal() {
  const modal = $("#heroSelectModal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  state.pendingHeroPick = null;
  resumeTime();
}

function renderHeroSelectModal() {
  const grid = $("#heroSelectGrid");
  if (!grid) return;

  const lang = getLang();
  const altTpl = t("hero.select.imgAlt", "Portrait of {name}");

  grid.innerHTML = "";
  if (HERO_ROSTER.length === 0) {
    // データロード失敗時のフォールバック (= 空 grid + hint)
    refreshHeroSelectCta();
    return;
  }

  for (const hero of HERO_ROSTER) {
    const isSelected = state.pendingHeroPick === hero.heroId;
    const name = localizedHeroName(hero, lang);
    const rarityLabel = t(`hero.rarity.${hero.rarity}`, hero.rarity);
    const elementLabel = t(`hero.element.${hero.element}`, hero.element);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "hero-tile";
    tile.dataset.heroId = String(hero.heroId);
    tile.dataset.element = hero.element;
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", isSelected ? "true" : "false");
    tile.title = `${name} — ${elementLabel} / ${rarityLabel}`;
    tile.innerHTML = `
      <img class="hero-tile__portrait"
           src="${heroImg(hero.heroId)}"
           alt="${escapeAttr(tpl(altTpl, { name }))}"
           onerror="this.classList.add('hero-tile__portrait--missing'); this.removeAttribute('src');" />
      <div class="hero-tile__meta">
        <span class="hero-tile__name">${escapeText(name)}</span>
        <span class="hero-tile__sub">
          <span class="hero-tile__element" aria-label="${escapeAttr(elementLabel)}">${elementEmoji(hero.element)}</span>
          <span class="hero-tile__rarity" data-rarity="${escapeAttr(hero.rarity)}">${escapeText(rarityLabel)}</span>
        </span>
      </div>
    `;
    tile.addEventListener("click", () => pickHero(hero.heroId));
    grid.appendChild(tile);
  }

  refreshHeroSelectCta();
}

function pickHero(heroId) {
  if (!getHero(heroId)) return;
  state.pendingHeroPick = heroId;
  renderHeroSelectModal();
}

function refreshHeroSelectCta() {
  const cta = $("#heroSelectCta");
  const hintText = $("#heroSelectHintText");
  if (!cta) return;
  const hero = getHero(state.pendingHeroPick);
  cta.disabled = !hero;

  if (hintText) {
    if (hero) {
      hintText.textContent = localizedHeroBlurb(hero, getLang());
      hintText.removeAttribute("data-i18n");
    } else {
      hintText.setAttribute("data-i18n", "hero.select.empty");
      hintText.textContent = t("hero.select.empty", "Select a hero to continue");
    }
  }
}

function applyHeroPick() {
  const hero = getHero(state.pendingHeroPick);
  if (!hero) return;
  state.ownedHero = { ...hero };
  renderOwnedHeroBadge();
  closeHeroSelectModal();
}

function renderOwnedHeroBadge() {
  const badge = $("#ownedHeroBadge");
  if (!badge) return;
  const hero = state.ownedHero;
  if (!hero) {
    badge.classList.add("hidden");
    badge.textContent = "";
    return;
  }
  const name = localizedHeroName(hero, getLang());
  badge.classList.remove("hidden");
  badge.dataset.element = hero.element;
  badge.textContent = `${elementEmoji(hero.element)} ${name}`;
}

function escapeText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

// ============================================================
// Time loop
// ============================================================
let _tickHandle = null;

function startTimeLoop() {
  if (_tickHandle) return;
  _tickHandle = setInterval(onTick, currentTickInterval());
}

function stopTimeLoop() {
  if (_tickHandle) {
    clearInterval(_tickHandle);
    _tickHandle = null;
  }
}

function currentTickInterval() {
  if (state.timeSpeed20x) return Math.round(TICK_INTERVAL_MS / 20);
  if (state.timeSpeed2x) return Math.round(TICK_INTERVAL_MS / 2);
  return TICK_INTERVAL_MS;
}

function onTick() {
  if (state.pauseFlags > 0) return;
  state.tickCount++;
  state.weekProgress++;
  if (state.weekProgress >= SECONDS_PER_WEEK) advanceWeek();

  // ... 各 feature の tick はここから呼ぶ ...
  // tickActiveCraft();
  // tickActiveQuest();

  renderHeader();
}

function advanceWeek() {
  state.weekProgress = 0;
  state.week++;
  if (state.week > WEEKS_PER_MONTH) {
    state.week = 1;
    state.month++;
    if (state.month > MONTHS_PER_YEAR) {
      state.month = 1;
      state.year++;
    }
  }
  // checkMonthlyEvents() をここから呼ぶ
}

function renderHeader() {
  const el = $("#dateLabel");
  if (el) el.textContent = `${state.year} 年 ${state.month} 月 ${state.week} 週`;
}

// ============================================================
// Boot
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => console.error("init failed", e));
});

// ============================================================
// Global で覗くため (= デバッグ用)
// ============================================================
if (typeof window !== "undefined") {
  window.__state = state;
  window.__pauseTime = pauseTime;
  window.__resumeTime = resumeTime;
}
