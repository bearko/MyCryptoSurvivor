// ============================================================
// settings-ui.js — 設定モーダル (= SPEC-044)
// ============================================================
//
// 入口: タイトルの「設定」、 メニューの「設定」、 戦闘中ヘッダーの ⚙。
// pauseFlags 不変条件: open で pauseTime + 1、 close で resumeTime + 1。

import { pauseTime, resumeTime } from "./state.js";
import { getSettings, updateSettings } from "./settings.js";
import { osPrefersReducedMotion } from "./motion.js";
import { playSe } from "./audio.js";
import { SFX } from "./constants.js";
import { t, getLang, setLang, onLangChange } from "./i18n.js";
import { resetNaviTips, seenNaviTipCount } from "./navi-tips.js";
import { resetLessons, seenLessonCount } from "./lesson.js";   // SPEC-147
import { playVoice } from "./voice.js";
import { canPickAvatar, openAvatarPicker } from "./platform.js";   // SPEC-092

/** SPEC-085: ボイスの音量を確かめるときのセリフ */
const VOICE_SAMPLE = "tap.2";

let _wired = false;
let _opened = false;
let _tipsJustReset = false;   // SPEC-068: 押した直後だけ「また話すね！」と出す

const $ = (id) => document.getElementById(id);

function _pctLabel(v) {
  const pct = Math.round(v * 100);
  return pct === 0 ? t("settings.off", "OFF") : `${pct}%`;
}

function _render() {
  const avatarRow = $("settingsAvatarRow");
  if (avatarRow) avatarRow.hidden = !canPickAvatar();   // SPEC-092
  const s = getSettings();
  const bgm = $("settingsBgm");
  const se = $("settingsSe");
  if (bgm) bgm.value = String(Math.round(s.bgm * 100));
  if (se) se.value = String(Math.round(s.se * 100));
  const voice = $("settingsVoice");   // SPEC-085
  if (voice) voice.value = String(Math.round(s.voice * 100));
  voice?.style.setProperty("--val", `${voice.value}%`);
  const voiceVal = $("settingsVoiceValue"); if (voiceVal) voiceVal.textContent = _pctLabel(s.voice);
  // SPEC-058: つまみの帯を、 いまの値まで金で埋める (= css/result-ui.css の --val)
  bgm?.style.setProperty("--val", `${bgm.value}%`);
  se?.style.setProperty("--val", `${se.value}%`);
  const bgmVal = $("settingsBgmValue"); if (bgmVal) bgmVal.textContent = _pctLabel(s.bgm);
  const seVal = $("settingsSeValue");   if (seVal) seVal.textContent = _pctLabel(s.se);

  const fx = $("settingsReduceFx");
  const fxNote = $("settingsReduceFxNote");
  const os = osPrefersReducedMotion();
  if (fx) {
    fx.checked = os || s.reduceFx;
    fx.disabled = os;
  }
  if (fxNote) fxNote.textContent = os ? t("settings.reduceFxOs", "端末の設定で動きを減らしています") : t("settings.reduceFxNote", "揺れ・粒・画面の光を止める");

  // SPEC-068: マインちゃんの補足をもう一度 (= 見たものがなければ押せない)
  const tips = $("settingsTipsReset");
  if (tips) {
    const none = seenNaviTipCount() + seenLessonCount() === 0;   // SPEC-147: レッスンも
    tips.disabled = none;
    tips.textContent = none && _tipsJustReset ? t("settings.tipsDone", "また話すね！") : t("settings.tipsReset", "もう一度聞く");
  }

  document.querySelectorAll("#settingsModal [data-lang]").forEach((b) => {
    b.classList.toggle("lang-btn--active", b.getAttribute("data-lang") === getLang());
  });
}

export function installSettingsUI() {
  if (_wired) return;
  _wired = true;
  $("btnTitleSettings")?.addEventListener("click", openSettings);
  $("btnSettingsOpen")?.addEventListener("click", openSettings);
  $("pauseMenuSettings")?.addEventListener("click", async () => {
    // メニューを閉じてから開く (= モーダルは 1 つずつ。 DESIGN_CHARTER 1.2)
    const m = await import("./menu.js");
    m.closeMenu();
    openSettings();
  });
  $("settingsClose")?.addEventListener("click", closeSettings);
  $("settingsCloseX")?.addEventListener("click", closeSettings);
  $("settingsModal")?.addEventListener("click", (e) => {
    if (e.target.id === "settingsModal") closeSettings();
  });

  const bgm = $("settingsBgm");
  bgm?.addEventListener("input", () => { updateSettings({ bgm: Number(bgm.value) / 100 }); _render(); });
  const se = $("settingsSe");
  se?.addEventListener("input", () => { updateSettings({ se: Number(se.value) / 100 }); _render(); });
  se?.addEventListener("change", () => playSe(SFX.GEM_PICKUP, 0, 0.5));   // 離したときに 1 回鳴らして確かめる
  // SPEC-085: マインちゃんのボイス (= 離したときに 1 つ言って確かめる)
  const voice = $("settingsVoice");
  voice?.addEventListener("input", () => { updateSettings({ voice: Number(voice.value) / 100 }); _render(); });
  voice?.addEventListener("change", () => playVoice(VOICE_SAMPLE));
  $("settingsReduceFx")?.addEventListener("change", (e) => {
    updateSettings({ reduceFx: !!e.target.checked });
    _render();
  });
  $("settingsTipsReset")?.addEventListener("click", () => {
    resetNaviTips();
    resetLessons();   // SPEC-147
    _tipsJustReset = true;
    _render();
  });
  // SPEC-092: bearko.games 共通のアイコン (= 窓は SDK。 SDK が読めていないときは行ごと出さない)
  $("settingsAvatar")?.addEventListener("click", () => { openAvatarPicker(); });
  $("settingsModal")?.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-lang]");
    if (b) setLang(b.getAttribute("data-lang"));
  });
  onLangChange(_render);
}

export function openSettings() {
  if (_opened) return;
  _opened = true;
  _tipsJustReset = false;
  pauseTime();
  _render();
  $("settingsModal")?.classList.remove("hidden");
}

export function closeSettings() {
  if (!_opened) return;
  _opened = false;
  $("settingsModal")?.classList.add("hidden");
  resumeTime();
}
