// ============================================================
// main.js — エントリポイント
// ============================================================

import { hasPlayed } from "./played.js";   // SPEC-147
import { hasClearedEasy } from "./easy.js";   // SPEC-147
import { state, pauseTime, resumeTime } from "./state.js";
import { initI18n, setLang, getLang, t, tpl, onLangChange } from "./i18n.js";
import { installMenu, openMenu } from "./menu.js";
import { installSettingsUI } from "./settings-ui.js";
import { installRankingUI } from "./ranking-ui.js";
import { installModeSelect, showModeSelect } from "./mode-select.js";
import { isStory } from "./story.js";   // SPEC-165
import { installStoryMap } from "./story-map.js";   // SPEC-165
import {
  TICK_INTERVAL_MS,
  SECONDS_PER_WEEK,
  WEEKS_PER_MONTH,
  MONTHS_PER_YEAR,
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT,
  FACTION_COLOR, FACTION_COLOR_DEFAULT,
} from "./constants.js";
import {
  getExt, extImg, extTierImg,
  getTierName, getSkillName, getSkillDesc, getSeriesName,
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
import { heroMaxHp, heroSpeed } from "./hero-stats.js";   // SPEC-097
import {
  getUnlockedHeroes, isHeroUnlocked, unlockOf, nextUnlock, onHeroesUnlocked, GAME_TITLES, STARTER_HEROES, EASY_REWARD_HERO,
} from "./hero-unlock.js";   // SPEC-098
import { radarTable, radarSvg, radarAriaLabel, RADAR_AXES } from "./hero-radar.js";   // SPEC-099
import { SIGNATURE_OF } from "./battle/signature.js";   // SPEC-100
import { loadEnemies } from "./enemies.js";
import { tickStatsDecay, renderHud } from "./survival.js";
import { startBattle } from "./battle/index.js";
import { playSe, unlockAudio, suspendBgm, resumeBgm } from "./audio.js";
import { SFX } from "./constants.js";
import { APP_VERSION } from "./constants.js";
import { initPlatform, setChatVisible, reportMetaAchievements } from "./platform.js";
import { installChatDock } from "./chat-dock.js";   // SPEC-156
import { getMeta, onMetaChange, hasHeroCleared } from "./meta.js";
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
  installStoryMap({ onBack: () => showModeSelect() });   // SPEC-165
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
  setChatVisible(true);   // SPEC-091: 全体チャットの 💬 はタイトルから (= 読み込みの画面には出さない)
  // SPEC-085: タイトルコール (= ロゴの画面を押したとき。 押さずに進めた環境ではここで)。 鳴り終わるまで、 あいさつのボイスを待たせる
  playVoice("title.call", { hold: true });
  naviTitle();   // SPEC-056: タイトルでマインちゃんがあいさつ
  renderTitleNextHero();   // SPEC-098
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
    naviSay(naviLines("mode", { first: !hasPlayed() && !hasClearedEasy() }), { place: "mode" });   // SPEC-059: 画面の下の通信の帯。 SPEC-147: 初めては EASY をすすめる
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

  $("#heroSelectClose")?.addEventListener("click", cancelHeroSelect);
  $("#heroSelectCta")?.addEventListener("click", applyHeroPick);

  // 背景クリックで閉じる
  modal.addEventListener("click", (e) => {
    if (e.target.id === "heroSelectModal") cancelHeroSelect();
  });

  // Esc で閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      cancelHeroSelect();
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
    renderTitleNextHero();   // SPEC-098
  });

  // SPEC-098: アチーブメントでヒーローが解放されたら、 知らせて、 開いている画面を描き直す
  onHeroesUnlocked((heroIds) => {
    showHeroUnlockToast(heroIds);
    renderTitleNextHero();
    if (!modal.classList.contains("hidden")) {
      renderHeroSelectModal();
      if (state.pendingHeroPick != null) renderHeroDetail(state.pendingHeroPick);
    }
  });
}

export function openHeroSelectModal() {   // SPEC-165: ストーリーの 3-2 からも
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

/**
 * SPEC-124: ヒーローを選ばずに閉じた (= ✕・背景・Esc) ときは、 モード選択へ戻す。
 * 閉じるだけだと、 後ろの戦闘の画面がヒーローなしで残り、 進めなくなっていた
 */
let _heroCancelling = false;
function cancelHeroSelect() {
  if (_heroCancelling || $("#heroSelectModal")?.classList.contains("hidden")) return;
  _heroCancelling = true;
  playWipe(() => {
    closeHeroSelectModal();
    $("#app")?.classList.add("hidden");
    showModeSelect();
    _heroCancelling = false;
  }, { label: "SELECT // MODE" });
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

  // SPEC-098: 解放した人が先 (= 並びはそのまま)。 札の上に「解放 n / 10」
  const unlocked = getUnlockedHeroes();
  const roster = [...HERO_ROSTER].sort((a, b) => Number(!unlocked.has(a.heroId)) - Number(!unlocked.has(b.heroId)));
  const countEl = $("#heroSelectCount");
  if (countEl) countEl.textContent = tpl(t("hero.select.count", "Unlocked {n} / {total}"), {
    n: String(HERO_ROSTER.filter((h) => unlocked.has(h.heroId)).length), total: String(HERO_ROSTER.length),
  });

  for (const hero of roster) {
    const isSelected = state.pendingHeroPick === hero.heroId;
    const locked = !unlocked.has(hero.heroId);
    const name = localizedHeroName(hero, lang);
    const rarityLabel = t(`hero.rarity.${hero.rarity}`, hero.rarity);
    const factionLabel = t(`hero.faction.${hero.faction}`, hero.faction);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = locked ? "hero-tile hero-tile--locked" : "hero-tile";
    tile.dataset.heroId = String(hero.heroId);
    tile.dataset.faction = hero.faction;
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", isSelected ? "true" : "false");
    tile.title = `${name} — ${factionLabel} / ${rarityLabel}${locked ? ` (${t("hero.lock.label", "Locked")})` : ""}`;
    // SPEC-097: 札の上に初期武器のアイコンと名前 (= 「このヒーロー＝この武器」がひと目で分かる)
    const wExt  = getExt(HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT);
    const wName = wExt ? getTierName(wExt, 1, lang) : "";
    tile.innerHTML = `
      ${wExt ? `<span class="hero-tile__weapon" title="${escapeAttr(wName)}">
        <img class="hero-tile__weapon-icon" src="${extTierImg(wExt, 1)}" alt="" onerror="this.remove()" />
        <span class="hero-tile__weapon-name">${escapeText(getSeriesName(wExt, lang))}</span>
      </span>` : ""}
      ${locked ? `<span class="hero-tile__lock" aria-hidden="true">🔒</span>` : ""}
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

  const maxHp = heroMaxHp(hero);   // SPEC-097: 戦闘と同じ式
  const speed = heroSpeed(hero);
  const hpEl  = $("#heroDetailHp");
  const spdEl = $("#heroDetailSpeed");
  if (hpEl)  hpEl.textContent  = tpl(t("hero.detail.hp",    "HP {n}"),    { n: String(maxHp) });
  if (spdEl) spdEl.textContent = tpl(t("hero.detail.speed", "Speed {n}"), { n: String(speed) });

  renderHeroRadar(hero);   // SPEC-099
  // SPEC-100: 固有スキル
  const sigKind = SIGNATURE_OF[hero.heroId];
  const sigBox = $("#heroDetailSig");
  if (sigBox) {
    sigBox.classList.toggle("hidden", !sigKind);
    $("#heroDetailSigName").textContent = `${t("hero.sig.label", "Signature")}：${hero.passive?.[lang] ?? hero.passive?.ja ?? ""}`;
    $("#heroDetailSigDesc").textContent = sigKind ? t(`hero.sig.${sigKind}`, "") : "";
  }

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
    const wLL = $("#heroDetailWeaponLL");   // SPEC-101
    if (wLL) {
      // SPEC-106: LL はそのヒーローで全ステージをクリアすると解放 (= まだなら条件を出す。 名前は伏せない)
      const open = hasHeroCleared(getMeta(), hero.heroId);
      const llName = ext.ll ? (ext.ll.name[lang] ?? ext.ll.name.ja) : "";
      wLL.textContent = !ext.ll ? "" : open
        ? tpl(t("hero.detail.ll", "LL: {name}"), { name: llName })
        : tpl(t("hero.detail.llLocked", "LL：このヒーローで全ステージをクリアすると解放（{name}）"), { name: llName });
      wLL.classList.toggle("hero-detail__weapon-ll--locked", !!ext.ll && !open);
    }
  } else {
    if (wIcon)  wIcon.removeAttribute("src");
    if (wName)  wName.textContent  = "";
    if (wSkill) wSkill.textContent = "";
    if (wDesc)  wDesc.textContent  = "";
  }
}

// SPEC-099: レーダーチャート (= 段は 10 人の中での位置なので、 全員ぶんを 1 度だけ数える)
let _radarTable = null;
function renderHeroRadar(hero) {
  const el = $("#heroRadar");
  if (!el) return;
  if (!_radarTable) {
    _radarTable = radarTable(HERO_ROSTER, (id) => getExt(HERO_STARTING_WEAPON[id] ?? HERO_STARTING_WEAPON_DEFAULT));
  }
  const row = _radarTable.get(hero.heroId);
  if (!row) { el.innerHTML = ""; return; }
  const labels = Object.fromEntries(RADAR_AXES.map((a) => [a, t(`hero.radar.${a}`, a)]));
  // いま使っているヒーロー (= 前に遊んだヒーロー) の形を薄く重ねて比べる
  const usedId = state.ownedHero?.heroId;
  const ghost = usedId != null && usedId !== hero.heroId ? _radarTable.get(usedId) : null;
  el.innerHTML = radarSvg(row, { labels, color: FACTION_COLOR[hero.faction] ?? FACTION_COLOR_DEFAULT, ghost });
  el.setAttribute("aria-label", tpl(t("hero.radar.aria", "{list}"), { list: radarAriaLabel(row, labels, getLang() === "ja" ? "、" : ", ") }));
  el.classList.remove("hero-radar--in");
  void el.offsetWidth;   // 選び直すたびに形が伸びる
  el.classList.add("hero-radar--in");
}

function refreshHeroSelectCta() {
  const cta = $("#heroSelectCta");
  const hintText = $("#heroSelectHintText");
  if (!cta) return;
  const hero = getHero(state.pendingHeroPick);
  const locked = hero && !isHeroUnlocked(hero.heroId);   // SPEC-098
  cta.disabled = !hero || locked;
  renderHeroLock(locked ? hero : null);

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

// ============================================================
// SPEC-098: 次の仲間 (= タイトル) と、 解放の知らせ
// ============================================================
/** 詳しい欄の「どのタイトルの、 どのアチーブメントで仲間になるか」 (= hero が null なら隠す) */
function renderHeroLock(hero) {
  const box = $("#heroDetailLock");
  const play = $("#heroSelectPlay");
  if (!box) return;
  const u = hero ? unlockOf(hero.heroId) : null;
  play?.classList.add("hidden");
  // SPEC-165: ビリー・ザ・キッドはストーリー 3-1 で
  const easyReward = hero && hero.heroId === EASY_REWARD_HERO && !isHeroUnlocked(hero.heroId);
  box.classList.toggle("hidden", !u && !easyReward);
  if (easyReward && !u) {
    $("#heroDetailLockText").textContent = t("hero.lock.easyReward", "");
    return;
  }
  if (!u) return;
  const lang = getLang();
  const vars = {
    title: GAME_TITLES[u.game]?.name ?? u.game,
    name: u.achievement?.[lang] ?? u.achievement?.ja ?? u.trophy,
    cond: t(`hero.unlock.cond.${u.trophy}`, u.trophy),
  };
  $("#heroDetailLockText").textContent = tpl(t(u.game === "survivor" ? "hero.lock.here" : "hero.lock.other", ""), vars);
  if (play && u.game !== "survivor") {
    play.href = GAME_TITLES[u.game]?.url ?? "https://bearko.games/";
    play.textContent = t("hero.lock.play", "Play this game ↗");
    play.classList.remove("hidden");
  }
}
function renderTitleNextHero() {
  const el = $("#titleNextHero");
  if (!el) return;
  const u = nextUnlock(getUnlockedHeroes());
  const hero = u ? getHero(u.heroId) : null;
  if (!u || !hero) { el.classList.add("hidden"); return; }
  const lang = getLang();
  const vars = {
    title: GAME_TITLES[u.game]?.name ?? u.game,
    name: localizedHeroName(hero, lang),
    cond: t(`hero.unlock.cond.${u.trophy}`, u.trophy),
  };
  const here = u.game === "survivor";
  $("#titleNextHeroText").textContent = tpl(t(here ? "title.next.here" : "title.next.other", ""), vars);
  const icon = $("#titleNextHeroIcon");
  if (icon) icon.src = heroImg(hero.heroId);
  // ほかのタイトルのときだけ、 そのゲームへ (= 本作のときは押しても何も起きない)
  if (here) { el.removeAttribute("href"); el.classList.add("title-screen__next--here"); }
  else { el.href = GAME_TITLES[u.game]?.url ?? "https://bearko.games/"; el.classList.remove("title-screen__next--here"); }
  el.classList.remove("hidden");
}

let _unlockToastTimer = 0;
function showHeroUnlockToast(heroIds) {
  const heroes = heroIds.map((id) => getHero(id)).filter(Boolean);
  if (!heroes.length) return;
  let el = $("#heroUnlockToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "heroUnlockToast";
    el.className = "hero-unlock-toast hidden";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  const lang = getLang();
  el.innerHTML = heroes.map((h) => `
    <div class="hero-unlock-toast__row">
      <img class="hero-unlock-toast__icon" src="${heroImg(h.heroId)}" alt="" />
      <div>
        <div class="hero-unlock-toast__title">${escapeText(tpl(t("hero.unlocked.toast", "{name} joined you!"), { name: localizedHeroName(h, lang) }))}</div>
        <div class="hero-unlock-toast__sub">${escapeText(t("hero.unlocked.sub", ""))}</div>
      </div>
    </div>`).join("");
  el.classList.remove("hidden", "hero-unlock-toast--out");
  void el.offsetWidth;
  el.classList.add("hero-unlock-toast--in");
  playSe(SFX.HERO_UNLOCK, 0, 0.6);   // SPEC-098: 仲間になったファンファーレ (= 選ぶときの音とは別)
  clearTimeout(_unlockToastTimer);
  _unlockToastTimer = setTimeout(() => {
    el.classList.add("hero-unlock-toast--out");
    setTimeout(() => el.classList.add("hidden"), 400);
  }, 4500);
}

function applyHeroPick() {
  const hero = getHero(state.pendingHeroPick);
  if (!hero || !isHeroUnlocked(hero.heroId)) return;   // SPEC-098: ロック中は始められない
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
// 2026-10-22: スマホの長押しのメニューと 2 本指の拡大縮小を止める (= iOS Safari は viewport の user-scalable を見ない)
document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea")) e.preventDefault(); });
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
window.addEventListener("DOMContentLoaded", () => {
  // SPEC-039: bearko.games 共通基盤（アチーブメント）。SDK がなければ何もしない
  initPlatform(APP_VERSION);
  installChatDock();   // SPEC-156: チャットのドックのぶん、 木と結果の画面を狭める
  // SPEC-096: セーブ (= mcs.meta.v1) から判定できるアチーブメントは、 起動時と、 セーブが変わるたび
  // (= スキルツリーの解放・ボスのゴールドダスト・挑戦の終わり) に、 いま満たしているものを送る
  reportMetaAchievements(getMeta());
  onMetaChange((m) => { if (!isStory()) reportMetaAchievements(m); });   // チュートリアル (= ストーリー) では送らない。 NORMAL で木を触ったときに届く
  init().catch((e) => console.error("init failed", e));
});

// ============================================================
// Global で覗くため (= デバッグ用)
// ============================================================
if (typeof window !== "undefined") {
  window.__state = state;
  window.__pauseTime = pauseTime;
  // SPEC-112: ミッションを確かめる (= ?debug=1 でなくても、 開発者ツールから window.__mission("lubu"))
  import("./battle/missions.js").then((m) => { window.__mission = m.debugOfferMission; window.__missionClear = m.debugClearMission; }).catch(() => {});
  window.__resumeTime = resumeTime;
}
