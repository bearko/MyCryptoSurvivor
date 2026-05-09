// ============================================================
// survival.js — VS HUD (= Lv / 経過時間 / HP bar / XP bar)  SPEC-005
// ============================================================
//
// 1 tick = 1 sec の前提で `state.stats.hp` を必要に応じて decay し、 HUD を更新する。
// VS は idle decay 無し (= STATS_DECAY_PER_TICK.hp=0)、 HP は戦闘実装 (= 後続 SPEC) で減る。
// pauseFlags のチェックは呼出側 (= main.js の onTick) が行う。

import { state } from "./state.js";
import { STATS_DECAY_PER_TICK, STATS_MAX } from "./constants.js";
import { t, tpl } from "./i18n.js";

const STAT_KEYS = ["hp"];

/**
 * 1 tick 分の decay を `state.stats` に適用し、 範囲内に clamp する。
 * VS では decay 量 0 だが、 後続 SPEC で seed 状態 (= 飢餓 / 毒) が増えても拡張できるよう構造は維持。
 */
export function tickStatsDecay() {
  for (const k of STAT_KEYS) {
    const dec = STATS_DECAY_PER_TICK[k] ?? 0;
    if (dec) state.stats[k] -= dec;
  }
  clampStats();
}

export function clampStats() {
  for (const k of STAT_KEYS) {
    const max = state.statsMax?.[k] ?? STATS_MAX[k];
    if (state.stats[k] < 0)   state.stats[k] = 0;
    if (state.stats[k] > max) state.stats[k] = max;
  }
}

/**
 * 任意のスタッツの ratio (0..1) を返す。
 * @param {"hp"} key
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
 * 経過 tick を mm:ss 文字列に整形 (= 1 tick = 1 sec)。
 * 99:59 を超えたら桁を増やす (= 防御的、 通常は届かない)。
 * @param {number} ticks
 */
export function formatElapsed(ticks) {
  const total = Math.max(0, Math.floor(ticks));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = m < 10 ? "0" + m : String(m);
  const ss = s < 10 ? "0" + s : String(s);
  return mm + ":" + ss;
}

/**
 * #hud 配下を全部更新。
 * - #hudLevel:    "Lv.{n}"
 * - #hudElapsed:  "mm:ss"
 * - #hudHp:       bar fill + value
 * - #hudXp:       bar fill + value (= "{xp}/{xpToNext}")
 */
export function renderHud() {
  const lvEl = document.getElementById("hudLevel");
  if (lvEl) {
    const lvTpl = t("hud.level", "Lv.{n}");
    lvEl.textContent = tpl(lvTpl, { n: String(state.level) });
  }

  const elEl = document.getElementById("hudElapsed");
  if (elEl) elEl.textContent = formatElapsed(state.elapsedTicks);

  // HP bar
  const hpRoot = document.getElementById("hudHp");
  if (hpRoot) {
    const fill = hpRoot.querySelector(".hud__bar-fill");
    const val  = hpRoot.querySelector(".hud__bar-value");
    if (fill) fill.style.width = (getStatRatio("hp") * 100).toFixed(2) + "%";
    if (val)  val.textContent  = String(Math.floor(state.stats.hp));
    hpRoot.setAttribute("aria-valuenow", String(Math.floor(state.stats.hp)));
    hpRoot.setAttribute("aria-valuemax", String(state.statsMax?.hp ?? STATS_MAX.hp));
  }

  // XP bar
  const xpRoot = document.getElementById("hudXp");
  if (xpRoot) {
    const next  = Math.max(1, state.xpToNext);
    const ratio = Math.max(0, Math.min(1, state.xp / next));
    const fill  = xpRoot.querySelector(".hud__bar-fill");
    const val   = xpRoot.querySelector(".hud__bar-value");
    if (fill) fill.style.width = (ratio * 100).toFixed(2) + "%";
    if (val)  val.textContent  = `${Math.floor(state.xp)}/${next}`;
    xpRoot.setAttribute("aria-valuenow", String(Math.floor(state.xp)));
    xpRoot.setAttribute("aria-valuemax", String(next));
  }
}
