// ============================================================
// main.js — エントリポイント
// ============================================================

import { state, pauseTime, resumeTime } from "./state.js";
import { initI18n, setLang, getLang, t, tpl, onLangChange } from "./i18n.js";
import { installMenu, openMenu } from "./menu.js";
import { installSettingsUI } from "./settings-ui.js";
import { installRankingUI } from "./ranking-ui.js";
import { installModeSelect, showModeSelect } from "./mode-select.js";
import {
  TICK_INTERVAL_MS,
  SECONDS_PER_WEEK,
  WEEKS_PER_MONTH,
  MONTHS_PER_YEAR,
  HERO_HP_BASE, HERO_HP_PER_STAT,
  HERO_SPEED_BASE, HERO_SPEED_PER_AGI,
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT,
} from "./constants.js";
import {
  getExt, extImg, extTierImg,
  getTierName, getSkillName, getSkillDesc,
} from "./extensions.js";
import {
  HERO_ROSTER,
  loadHeroes,
  getHero,
  heroImg,
  factionEmoji,
  localizedHeroName,
  heroAttributesLine,
} from "./heroes.js";
import { loadExtensions } from "./extensions.js";
import { loadEnemies } from "./enemies.js";
import { tickStatsDecay, renderHud } from "./survival.js";
import { startBattle } from "./battle/index.js";
import { playSe, unlockAudio, suspendBgm, resumeBgm } from "./audio.js";
import { SFX } from "./constants.js";
import { APP_VERSION } from "./constants.js";
import { initPlatform } from "./platform.js";
import { installModalA11y } from "./modal-a11y.js";
import { img } from "./constants.js";
import { installReduceFxAttr } from "./motion.js";
import { playWipe } from "./transition.js";
import { naviSay, naviHide, naviLines, naviTitle } from "./navi.js";
import { installUiSound, startTitleBgm, startMenuBgm, waitAutoplay } from "./ui-sound.js";
import { startHeroPreview, stopHeroPreview } from "./hero-preview.js";
import { playVoice, stopVoice } from "./voice.js";
import { installSkillTree, renderHeroPerks } from "./skill-tree.js";   // SPEC-090 / SPEC-090c

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
    loadExtensions().catch((e) => console.error("loadExtensions failed", e)),
    loadEnemies().catch((e) => console.error("loadEnemies failed", e)),
  ]);

  resumeTime();   // ← 読み込み終了

  setupTitleScreen();
  setupHelpOverlay();
  setupLangToggle();
  setupHeroSelectModal();
  installMenu();   // SPEC-034: ヘッダー一時停止メニュー
  installRankingUI();   // SPEC-035: タイトル / メニューから開くランキングモーダル
  installModalA11y();   // SPEC-043: 開いたモーダルにフォーカス・メニューとランキングは Esc で閉じる
  installSettingsUI();  // SPEC-044: 音量・演出を減らす・言語
  installSkillTree();   // SPEC-090: スキルツリー (= タイトルと結果の画面の入口)
  installAutoPause();   // SPEC-044: タブを離れたら一時停止
  installUiSound();   // SPEC-060: ボタンの音。 SPEC-069: 止められた BGM を次の操作で鳴らし直す
  installReduceFxAttr(); // SPEC-055: 「演出を減らす」で CSS の常に動く演出も止める
  // SPEC-037: タイトル → モード選択 → ヒーロー選択 の順
  installModeSelect(() => {
    $("#app")?.classList.remove("hidden");
    openHeroSelectModal();
  });   // SPEC-055: mode-select.js がワイプで覆ったところで呼ぶ

  renderHud();   // SPEC-004: 初期描画 (= Day 1 / 100 / 50 / 100)

  // タイトル画面表示中は時間が進むが、 onTick は state.activeXxx が無いので何も起きない
  startTimeLoop();

  // SPEC-069: タイトルの BGM (= craft.mp3)。 ブラウザが止めたら「タップしてはじめる」を挟んで、 その操作で鳴らす
  if (await waitAutoplay(startTitleBgm())) enterTitle();
  else showSplashTap();
}

// ============================================================
// SPEC-069: 読み込みのあと → タイトル (= 鳴らせないときだけ「タップしてはじめる」)
// ============================================================
let _titleEntered = false;
function enterTitle() {
  if (_titleEntered) return;
  _titleEntered = true;
  const splash = $("#splash");
  splash?.classList.add("splash--out");   // 0.3 秒で消える (= css/layout.css)
  setTimeout(() => splash?.classList.add("hidden"), 320);
  $("#titleScreen")?.classList.remove("hidden");
  // SPEC-085: タイトルコール (= ロゴの画面を押したとき。 押さずに進めた環境ではここで)。 鳴り終わるまで、 あいさつのボイスを待たせる
  playVoice("title.call", { hold: true });
  naviTitle();   // SPEC-056: タイトルでマインちゃんがあいさつ
}

function showSplashTap() {
  const splash = $("#splash");
  const tap = $("#splashTap");
  $("#splash .splash__loading")?.classList.add("hidden");
  tap?.classList.remove("hidden");
  splash?.classList.add("splash--tap");   // キーボードは Enter・Space (= 下の onKey。 枠を出さないよう focus はしない)
  const go = (e) => {
    e?.preventDefault?.();
    splash?.removeEventListener("click", go);
    document.removeEventListener("keydown", onKey, true);
    unlockAudio();
    startTitleBgm();   // 操作の中で鳴らす (= 止められていた曲を鳴らし直す)
    enterTitle();
  };
  const onKey = (e) => { if (e.key === "Enter" || e.key === " ") go(e); };
  splash?.addEventListener("click", go);   // 画面のどこを押してもよい
  document.addEventListener("keydown", onKey, true);
}

// ============================================================
// SPEC-044: タブを離れたら一時停止
// ============================================================
// 戦闘中で、 ほかのモーダルで止まっていなければメニューを開く (= 戻ったらメニューから再開)。
// BGM はどの画面でも止め、 戻ったら再開する (= 背景のタブで鳴り続けない)。
function installAutoPause() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state.battle.active && state.pauseFlags === 0) openMenu();
      suspendBgm();
      stopVoice();   // SPEC-085
    } else {
      resumeBgm();
    }
  });
}

// ============================================================
// Title screen
// ============================================================
function setupTitleScreen() {
  $("#btnPressStart")?.addEventListener("click", dismissTitle);
  // SPEC-043: タイトルの背景にステージ 1 の背景を敷く (= 画像は ASSET_BASE 経由)
  const bg = $("#titleBg");
  if (bg) bg.style.backgroundImage = `url("${img("Image/Backgrounds/1001.png")}")`;
}

function dismissTitle() {
  unlockAudio();   // SPEC-017: 初回 user gesture で audio policy 解除
  startMenuBgm();  // SPEC-069: モード選択・ヒーロー選択は land.mp3 (= 押した操作の中で替える。 ワイプのあとだと iOS で止められる)
  // SPEC-037: タイトル → モード選択画面 (= 旧来は直接 hero 選択モーダルだった)
  // SPEC-055: ワイプで切り替える
  playWipe(() => {
    showModeSelect();
    naviSay(naviLines("mode"), { place: "mode" });   // SPEC-059: 画面の下の通信の帯 (= カードと重ならない)
  }, { label: "NODE // CONNECT" });
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
  $("#btnTitleHelp")?.addEventListener("click", openHelp);   // SPEC-042: タイトルからも
  $("#btnHelpClose")?.addEventListener("click", closeHelp);
  $("#btnHelpCloseX")?.addEventListener("click", closeHelp);
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
  if (!$("#helpOverlay")?.classList.contains("hidden")) return;   // 二重に開いて pause が漏れないように
  pauseTime();
  $("#helpOverlay")?.classList.remove("hidden");
  $("#btnHelpClose")?.focus({ preventScroll: true });
  document.body.style.overflow = "hidden";
}

function closeHelp() {
  if ($("#helpOverlay")?.classList.contains("hidden")) return;
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
    if (!modal.classList.contains("hidden")) {
      renderHeroSelectModal();
      renderHeroDetail(state.pendingHeroPick);   // SPEC-014: 詳細パネルも追従
    }
    renderOwnedHeroBadge();
    renderHud();   // SPEC-004: `Day {n}` テンプレ再展開
  });
}

function openHeroSelectModal() {
  const modal = $("#heroSelectModal");
  if (!modal) return;
  pauseTime();
  state.pendingHeroPick = null;
  renderHeroSelectModal();
  renderHeroDetail(null);   // SPEC-014: 詳細パネルを placeholder 状態にリセット
  modal.classList.remove("hidden");
  naviSay(naviLines("hero"), { place: "hero" });   // SPEC-059: 通信の帯 (= ヒーローの大きな絵には重ねない)
}

function closeHeroSelectModal() {
  const modal = $("#heroSelectModal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  state.pendingHeroPick = null;
  stopHeroPreview();   // SPEC-083
  naviHide();   // SPEC-056
  resumeTime();
}

function renderHeroSelectModal() {
  const grid = $("#heroSelectGrid");
  if (!grid) return;
  renderHeroPerks();   // SPEC-090c: いま効いている恒久強化の 1 行

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
    const factionLabel = t(`hero.faction.${hero.faction}`, hero.faction);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "hero-tile";
    tile.dataset.heroId = String(hero.heroId);
    tile.dataset.faction = hero.faction;
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", isSelected ? "true" : "false");
    tile.title = `${name} — ${factionLabel} / ${rarityLabel}`;
    tile.innerHTML = `
      <img class="hero-tile__portrait"
           src="${heroImg(hero.heroId)}"
           alt="${escapeAttr(tpl(altTpl, { name }))}"
           onerror="this.classList.add('hero-tile__portrait--missing'); this.removeAttribute('src');" />
      <div class="hero-tile__meta">
        <span class="hero-tile__name">${escapeText(name)}</span>
        <span class="hero-tile__sub">
          <span class="hero-tile__faction" aria-label="${escapeAttr(factionLabel)}">${factionEmoji(hero.faction)}</span>
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
  const changed = state.pendingHeroPick !== heroId;
  state.pendingHeroPick = heroId;
  renderHeroSelectModal();
  renderHeroDetail(heroId);   // SPEC-014: 詳細パネルに反映
  startHeroPreview(heroId);   // SPEC-083: 1 秒たつと、 最初の武器で戦うところ (= 押し直すと、 はじめから)
  // SPEC-056: マインちゃんが選んだヒーローに反応する (= 同じヒーローを押し直しても喋り直さない)
  const hero = getHero(heroId);
  if (hero && changed) {
    const ext = getExt(HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT);
    _heroPickN += 1;
    naviSay(naviLines("heroPick", {
      heroId: hero.heroId,   // SPEC-085: ヒーローごとの紹介とボイス
      heroName: localizedHeroName(hero, getLang()),
      weaponName: ext ? getTierName(ext, 1, getLang()) : "",
      n: _heroPickN,
    }), { place: "hero" });
  }
}
let _heroPickN = 0;

// ============================================================
// SPEC-014: ヒーロー詳細パネル (= portrait + 名前 + 派閥 + ステータス + 担当 ext)
// ============================================================
/**
 * SPEC-056: 大きなドット絵と、 その裏の名前。 選ぶたびに構図 (= data-shot) が変わる (= 前と同じ構図にはしない)
 */
const HERO_STAGE_SHOTS = 5;
let _heroStageShot = 0;
function renderHeroStage(hero) {
  const stage  = $("#heroStage");
  const sprite = $("#heroStageSprite");
  const nameEl = $("#heroStageName");
  const empty  = $("#heroStageEmpty");
  if (!stage || !sprite || !nameEl) return;
  if (!hero) {
    stopHeroPreview();   // SPEC-083
    sprite.classList.add("hidden");
    sprite.removeAttribute("src");
    nameEl.textContent = "";
    empty?.classList.remove("hidden");
    delete stage.dataset.faction;
    return;
  }
  empty?.classList.add("hidden");
  _heroStageShot = (_heroStageShot + 1 + Math.floor(Math.random() * (HERO_STAGE_SHOTS - 1))) % HERO_STAGE_SHOTS;
  stage.dataset.shot = String(_heroStageShot);
  stage.dataset.faction = hero.faction;
  sprite.src = heroImg(hero.heroId);
  sprite.alt = localizedHeroName(hero, getLang());
  sprite.classList.remove("hidden");
  const bigName = localizedHeroName(hero, "en").toUpperCase();
  nameEl.textContent = bigName;
  nameEl.style.setProperty("--len", String(Math.max(6, bigName.length)));
  stage.classList.remove("hero-stage--in");
  void stage.offsetWidth;   // 選び直すたびに最初から
  stage.classList.add("hero-stage--in");
}

function renderHeroDetail(heroId) {
  const placeholder = $("#heroDetailPlaceholder");
  const content     = $("#heroDetailContent");
  const hero        = getHero(heroId);
  renderHeroStage(hero);   // SPEC-056
  if (!hero) {
    placeholder?.classList.remove("hidden");
    content?.classList.add("hidden");
    return;
  }
  placeholder?.classList.add("hidden");
  content?.classList.remove("hidden");

  const lang        = getLang();
  const name        = localizedHeroName(hero, lang);
  const factionLab  = t(`hero.faction.${hero.faction}`, hero.faction);
  const rarityLab   = t(`hero.rarity.${hero.rarity}`,   hero.rarity);

  const portrait = $("#heroDetailPortrait");
  if (portrait) {
    portrait.classList.remove("hero-detail__portrait--missing");
    portrait.src = heroImg(hero.heroId);
    portrait.alt = name;
  }

  const nameEl = $("#heroDetailName");
  if (nameEl) nameEl.textContent = name;
  const subEl = $("#heroDetailSub");
  if (subEl) subEl.textContent = `${factionEmoji(hero.faction)} ${factionLab} · ${rarityLab}`;

  const heroHpStat  = hero.stats?.hp  ?? 0;
  const heroAgiStat = hero.stats?.agi ?? 0;
  const maxHp = HERO_HP_BASE    + Math.round(heroHpStat  * HERO_HP_PER_STAT);
  const speed = HERO_SPEED_BASE + Math.round(heroAgiStat * HERO_SPEED_PER_AGI);
  const hpEl  = $("#heroDetailHp");
  const spdEl = $("#heroDetailSpeed");
  if (hpEl)  hpEl.textContent  = tpl(t("hero.detail.hp",    "HP {n}"),    { n: String(maxHp) });
  if (spdEl) spdEl.textContent = tpl(t("hero.detail.speed", "Speed {n}"), { n: String(speed) });

  // 担当 starter weapon
  const wId = HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
  const ext = getExt(wId);
  const wIcon  = $("#heroDetailWeaponIcon");
  const wName  = $("#heroDetailWeaponName");
  const wSkill = $("#heroDetailWeaponSkill");
  const wDesc  = $("#heroDetailWeaponDesc");
  if (ext) {
    if (wIcon) {
      wIcon.classList.remove("hero-detail__weapon-icon--missing");
      wIcon.src = extTierImg(ext, 1);   // SPEC-021: 開始時は Lv.1 (Common) icon
      wIcon.alt = getTierName(ext, 1, lang);
    }
    if (wName)  wName.textContent  = getTierName(ext, 1, lang);
    if (wSkill) wSkill.textContent = getSkillName(ext, lang);
    if (wDesc)  wDesc.textContent  = getSkillDesc(ext, 1, lang);
  } else {
    if (wIcon)  wIcon.removeAttribute("src");
    if (wName)  wName.textContent  = "";
    if (wSkill) wSkill.textContent = "";
    if (wDesc)  wDesc.textContent  = "";
  }
}

function refreshHeroSelectCta() {
  const cta = $("#heroSelectCta");
  const hintText = $("#heroSelectHintText");
  if (!cta) return;
  const hero = getHero(state.pendingHeroPick);
  cta.disabled = !hero;

  if (hintText) {
    if (hero) {
      hintText.textContent = heroAttributesLine(hero);
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
  playSe(SFX.HERO_PICK);   // SPEC-017: tooldev.mp3
  state.ownedHero = { ...hero };
  state.currentStageIdx = 0;       // SPEC-030: 新規 hero pick で stage 1 から
  // SPEC-033: 全ステージ通しの履歴をリセット (= activity report 用)
  state.run.stages.length = 0;
  state.run.totalKills    = 0;
  state.run.totalElapsedMs = 0;
  renderOwnedHeroBadge();
  // SPEC-055: ワイプで覆ってから戦闘を始める (= ステージの始まりの帯がワイプの抜けたあとに出る)
  playWipe(() => {
    closeHeroSelectModal();
    naviHide();   // SPEC-056: 戦闘ではステージの始まりにだけ出る
    startBattle(state.ownedHero);   // SPEC-006: 戦闘ステージ開始
  }, { label: "NODE // DEPLOY" });
}

function renderOwnedHeroBadge() {
  const badge = $("#ownedHeroBadge");
  if (!badge) return;
  const hero = state.ownedHero;
  if (!hero) {
    badge.classList.add("hidden");
    badge.textContent = "";
    delete badge.dataset.faction;
    return;
  }
  const name = localizedHeroName(hero, getLang());
  badge.classList.remove("hidden");
  badge.dataset.faction = hero.faction;
  badge.textContent = `${factionEmoji(hero.faction)} ${name}`;
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
  state.elapsedTicks++;   // SPEC-005: ステージ経過 tick (= mm:ss 表示)
  state.weekProgress++;
  if (state.weekProgress >= SECONDS_PER_WEEK) advanceWeek();

  tickStatsDecay();   // SPEC-005: VS は idle decay 無しだが構造は残置

  // ... 各 feature の tick はここから呼ぶ ...
  // tickActiveCraft();
  // tickActiveQuest();

  renderHeader();
  renderHud();        // SPEC-005: Lv / Elapsed / HP / XP の DOM 更新
}

function advanceWeek() {
  // SPEC-005: state.day は撤去。 year/month/week は legacy として残置 (= 副作用ゼロ)。
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
  // SPEC-039: bearko.games 共通基盤（トロフィー）。SDK がなければ何もしない
  initPlatform(APP_VERSION);
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
