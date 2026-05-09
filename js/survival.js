// ============================================================
// survival.js — Day カウンタ + 3 スタッツ HUD (= SPEC-004)
// ============================================================
//
// 1 tick = 1 sec の前提で `state.stats` を線形 decay し、 HUD DOM を更新する。
// pauseFlags ガードは呼出側 (= main.js の onTick) が責任を持つ。

import { state } from "./state.js";
import { STATS_DECAY_PER_TICK, STATS_MAX } from "./constants.js";
import { t, getLang, tpl } from "./i18n.js";

const STAT_KEYS = ["hp", "temp", "food"];

/**
 * 1 tick 分の decay を `state.stats` に適用し、 範囲内に clamp する。
 * pauseFlags のチェックは呼出側 (= onTick) が行う。
 */
export function tickStatsDecay() {
  for (const k of STAT_KEYS) {
    state.stats[k] -= STATS_DECAY_PER_TICK[k];
  }
  clampStats();
}

/**
 * `state.stats` を [0, statsMax[k]] に矯正。
 */
export function clampStats() {
  for (const k of STAT_KEYS) {
    const max = state.statsMax?.[k] ?? STATS_MAX[k];
    if (state.stats[k] < 0)   state.stats[k] = 0;
    if (state.stats[k] > max) state.stats[k] = max;
  }
}

/**
 * @param {"hp"|"temp"|"food"} key
 * @returns {number} 0..1
 */
export function getStatRatio(key) {
  const max = state.statsMax?.[key] ?? STATS_MAX[key];
  if (max <= 0) return 0;
  const v = state.stats[key] / max;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * #hud 配下を全部更新。
 * - #hudDay の textContent を `Day {n}` / `{n} 日目` に
 * - 各 .hud__bar の fill width を ratio*100% に
 * - 各 .hud__bar-value の textContent を Math.floor(値) に
 *
 * 言語切替時はデバッグ用 textContent も更新するが、
 * `data-i18n` 属性の applyDataI18n は別経路で動くのでここでは day だけ世話する。
 */
export function renderHud() {
  const dayEl = document.getElementById("hudDay");
  if (dayEl) {
    const dayTpl = t("hud.day", "Day {n}");
    dayEl.textContent = tpl(dayTpl, { n: String(state.day) });
  }

  for (const k of STAT_KEYS) {
    const id = "hud" + k.charAt(0).toUpperCase() + k.slice(1);
    const root = document.getElementById(id);
    if (!root) continue;
    const fill = root.querySelector(".hud__bar-fill");
    const val  = root.querySelector(".hud__bar-value");
    if (fill) fill.style.width = (getStatRatio(k) * 100).toFixed(2) + "%";
    if (val)  val.textContent  = String(Math.floor(state.stats[k]));
  }
  // language は applyDataI18n が更新済 (= ラベル text)。 ここでは触らない。
  void getLang();
}
