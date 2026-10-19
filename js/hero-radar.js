// ============================================================
// hero-radar.js — ヒーローの性能のレーダーチャート (= SPEC-099)
// ============================================================
//
// 軸は 5 つ。 どれも戦闘で実際に効いているもの (= 戦闘と同じ式。 js/hero-stats.js)。
// 目盛りは 10 人の中での位置 (= いちばん低い人を 1、 いちばん高い人を 5 の 5 段)。
// DOM に触れない純関数だけ (= SVG は文字列で返す)。

import { heroMaxHp, heroSpeed, heroDmgMul, heroCdMul } from "./hero-stats.js";

export const RADAR_AXES = ["hp", "atk", "rate", "speed", "reach"];
export const RADAR_STEPS = 5;

/** 武器の届く距離 (= 飛ぶ武器は range、 回る・置く武器は回る半径・爆発の半径) */
export function weaponReach(ext) {
  const p = ext?.tierParams?.[0] ?? {};
  if ((p.range ?? 0) > 0) return p.range;
  return p.orbitR ?? p.radius ?? 0;
}

/** 1 人ぶんの生の値 */
export function radarValues(hero, ext) {
  return {
    hp: heroMaxHp(hero),
    atk: heroDmgMul(hero),
    rate: 1 / heroCdMul(hero),
    speed: heroSpeed(hero),
    reach: weaponReach(ext),
  };
}

/** 値の並び → 1〜5 の段 (= 最小が 1、 最大が 5、 同じ値は同じ段。 みな同じなら真ん中) */
export function toSteps(values) {
  const min = Math.min(...values), max = Math.max(...values);
  if (!(max > min)) return values.map(() => Math.ceil(RADAR_STEPS / 2));
  return values.map((v) => 1 + Math.round(((v - min) / (max - min)) * (RADAR_STEPS - 1)));
}

/**
 * 全員の段。 heroes と、 heroId → 初期武器の ext を返す関数から
 * @returns {Map<number, {values: object, steps: object}>}
 */
export function radarTable(heroes, extOf) {
  const vals = heroes.map((h) => radarValues(h, extOf(h.heroId)));
  const out = new Map(heroes.map((h, i) => [h.heroId, { values: vals[i], steps: {} }]));
  for (const axis of RADAR_AXES) {
    const steps = toSteps(vals.map((v) => v[axis]));
    heroes.forEach((h, i) => { out.get(h.heroId).steps[axis] = steps[i]; });
  }
  return out;
}

/** 生の値の見せ方 (= 軸の横に小さく) */
export function formatRadarValue(axis, v) {
  if (axis === "atk" || axis === "rate") return `×${v.toFixed(2)}`;
  if (axis === "reach") return `${Math.round(v)}px`;
  return String(Math.round(v));
}

// ---- SVG ----
const SIZE = 200, C = SIZE / 2, R = 62;

function point(i, step) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
  const r = (R * step) / RADAR_STEPS;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function polygon(steps) {
  return RADAR_AXES.map((axis, i) => point(i, steps[axis]).map((n) => n.toFixed(1)).join(",")).join(" ");
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/**
 * @param {object} row       - radarTable の 1 行 ({ values, steps })
 * @param {object} opts
 * @param {object} opts.labels - 軸 → 名前
 * @param {string} opts.color  - 塗りの色 (= 属性の色)
 * @param {object} [opts.ghost] - 比べるために薄く重ねる形 (= いま使っているヒーローの行)
 */
export function radarSvg(row, { labels, color, ghost = null }) {
  const rings = [];
  for (let s = 1; s <= RADAR_STEPS; s++) {
    rings.push(`<polygon class="radar__ring" points="${polygon(Object.fromEntries(RADAR_AXES.map((a) => [a, s])))}"/>`);
  }
  const spokes = RADAR_AXES.map((_, i) => {
    const [x, y] = point(i, RADAR_STEPS);
    return `<line class="radar__spoke" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join("");
  const text = RADAR_AXES.map((axis, i) => {
    const [x, y] = point(i, RADAR_STEPS + 1.55);
    return `<text class="radar__label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">` +
      `<tspan class="radar__name">${esc(labels[axis])} ${row.steps[axis]}</tspan>` +
      `<tspan class="radar__raw" x="${x.toFixed(1)}" dy="1.15em">${esc(formatRadarValue(axis, row.values[axis]))}</tspan></text>`;
  }).join("");
  const ghostShape = ghost ? `<polygon class="radar__ghost" points="${polygon(ghost.steps)}"/>` : "";
  return `<svg class="radar" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">` +
    `<g class="radar__grid">${rings.join("")}${spokes}</g>${ghostShape}` +
    `<polygon class="radar__shape" points="${polygon(row.steps)}" style="fill:${esc(color)};stroke:${esc(color)}"/>` +
    `${text}</svg>`;
}

/** 読み上げ用の文 (= 「体力 4、 攻撃 5、 …」) */
export function radarAriaLabel(row, labels, sep = "、") {
  return RADAR_AXES.map((axis) => `${labels[axis]} ${row.steps[axis]}`).join(sep);
}
