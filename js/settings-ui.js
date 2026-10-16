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

let _wired = false;
let _opened = false;

const $ = (id) => document.getElementById(id);

function _pctLabel(v) {
  const pct = Math.round(v * 100);
  return pct === 0 ? t("settings.off", "OFF") : `${pct}%`;
}

function _render() {
  const s = getSettings();
  const bgm = $("settingsBgm");
  const se = $("settingsSe");
  if (bgm) bgm.value = String(Math.round(s.bgm * 100));
  if (se) se.value = String(Math.round(s.se * 100));
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
  $("settingsReduceFx")?.addEventListener("change", (e) => {
    updateSettings({ reduceFx: !!e.target.checked });
    _render();
  });
  $("settingsModal")?.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-lang]");
    if (b) setLang(b.getAttribute("data-lang"));
  });
  onLangChange(_render);
}

export function openSettings() {
  if (_opened) return;
  _opened = true;
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
