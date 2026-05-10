// ============================================================
// mode-select.js — ゲームモード選択画面 (= SPEC-037)
// ============================================================
//
// タイトル → Press to Start → modeSelectScreen → hero select の順で遷移。
// NORMAL: 全 4 軸 1.0×、 スコア倍率 1.00。
// ABSOLUTE: 4 軸を 0.5〜2.0 で 0.25 step で調整。 平均がスコア倍率。

import { state } from "./state.js";
import {
  ABSOLUTE_AXES, ABSOLUTE_SLIDER_MIN, ABSOLUTE_SLIDER_MAX,
  ABSOLUTE_SLIDER_STEP, ABSOLUTE_SLIDER_DEFAULT,
  REGULATION_NORMAL, REGULATION_ABSOLUTE,
  computeRegulationMul,
} from "./constants.js";
import { onLangChange, t } from "./i18n.js";

let _wired   = false;
let _onPick  = null;   // (regulation) => void、 hero select に進む callback

function _$(id) { return document.getElementById(id); }

export function installModeSelect(onPickHandler) {
  _onPick = onPickHandler;
  _renderSliders();
  _wireOnce();
  _renderLabels();
  _renderMul();
}

export function showModeSelect() {
  _$("titleScreen")?.classList.add("hidden");
  _$("gameModeSelectScreen")?.classList.remove("hidden");
  _renderLabels();
  _renderMul();
}

export function hideModeSelect() {
  _$("gameModeSelectScreen")?.classList.add("hidden");
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;

  _$("btnModeNormal")?.addEventListener("click", () => _pick(REGULATION_NORMAL));
  _$("btnModeAbsolute")?.addEventListener("click", () => _pick(REGULATION_ABSOLUTE));
  _$("btnModeBack")?.addEventListener("click", () => {
    hideModeSelect();
    _$("titleScreen")?.classList.remove("hidden");
  });
  onLangChange(() => {
    _renderLabels();
    _renderMul();
  });
}

function _pick(regulation) {
  state.regulation = regulation;
  if (regulation === REGULATION_NORMAL) {
    state.absolute = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  } else {
    // sliders から state に取り込み (= 既存値が入っているはず)
    state.absolute = _readSliders();
  }
  hideModeSelect();
  if (typeof _onPick === "function") _onPick(regulation);
}

function _renderSliders() {
  const wrap = _$("absoluteSliders");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const axis of ABSOLUTE_AXES) {
    const row = document.createElement("label");
    row.className = "abs-slider";
    row.innerHTML =
      `<span class="abs-slider__label" data-axis="${axis.key}">${axis.key}</span>` +
      `<input type="range" class="abs-slider__range" data-axis="${axis.key}" ` +
      `min="${ABSOLUTE_SLIDER_MIN}" max="${ABSOLUTE_SLIDER_MAX}" step="${ABSOLUTE_SLIDER_STEP}" ` +
      `value="${state.absolute?.[axis.key] ?? ABSOLUTE_SLIDER_DEFAULT}" />` +
      `<span class="abs-slider__value" data-axis="${axis.key}">×${(state.absolute?.[axis.key] ?? ABSOLUTE_SLIDER_DEFAULT).toFixed(2)}</span>`;
    wrap.appendChild(row);
  }
  // change → state 反映 + mul 再計算 + label 更新
  wrap.querySelectorAll('input[type="range"]').forEach(inp => {
    inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      const ax = inp.dataset.axis;
      if (!state.absolute) state.absolute = {};
      state.absolute[ax] = v;
      const valEl = wrap.querySelector(`.abs-slider__value[data-axis="${ax}"]`);
      if (valEl) valEl.textContent = `×${v.toFixed(2)}`;
      _renderMul();
    });
  });
}

function _readSliders() {
  const out = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  document.querySelectorAll('#absoluteSliders input[type="range"]').forEach(inp => {
    const v = parseFloat(inp.value);
    out[inp.dataset.axis] = isNaN(v) ? 1 : v;
  });
  return out;
}

function _renderLabels() {
  const ti = _$("modeSelectTitle"); if (ti) ti.textContent = t("mode.title", "ゲームモード");
  const sb = _$("modeSelectSub");   if (sb) sb.textContent = t("mode.sub",   "難易度を選んで進む");
  const nd = _$("modeCardNormalDesc"); if (nd) nd.textContent = t("mode.normalDesc", "通常のバランス。 全 4 軸が 1.0×。 スコア倍率 1.00。");
  const ad = _$("modeCardAbsoluteDesc"); if (ad) ad.textContent = t("mode.absoluteDesc", "難易度を 4 軸で自分でチューニング。 きつくするほどスコア倍率 UP、 楽にすると DOWN。");
  const bN = _$("btnModeNormal");    if (bN) bN.textContent = t("mode.startNormal", "これで始める");
  const bA = _$("btnModeAbsolute");  if (bA) bA.textContent = t("mode.startAbsolute", "これで始める");
  const bb = _$("btnModeBack");      if (bb) bb.textContent = t("mode.back", "タイトルに戻る");
  // slider のラベル
  document.querySelectorAll('#absoluteSliders .abs-slider__label').forEach(el => {
    const ax = el.dataset.axis;
    const k = ABSOLUTE_AXES.find(a => a.key === ax)?.labelKey;
    if (k) el.textContent = t(k, ax);
  });
}

function _renderMul() {
  const a = _readSliders();
  const absMul = computeRegulationMul(REGULATION_ABSOLUTE, a);
  const cardN = _$("modeCardNormalMul");   if (cardN) cardN.textContent = "×1.00";
  const cardA = _$("modeCardAbsoluteMul"); if (cardA) cardA.textContent = `×${absMul.toFixed(2)}`;
}
