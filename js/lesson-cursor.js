// ============================================================
// lesson-cursor.js — レッスンのカーソル (= SPEC-154)。 説明している相手に輪と指を当てる
// ============================================================
//
// 相手は画面の要素 (= { el: "#shopBar" }) か、 戦闘の座標 (= { world: () => ({ x, y }) | null })。
// 戦闘の座標は毎コマ画面の位置に直す (= カメラが動くので)。 相手が無くなったら隠す。 pointer-events は無い。

import { state } from "./state.js";
import { prefersReducedMotion } from "./motion.js";

let _el = null, _raf = 0, _target = null, _until = 0;

function _ensure() {
  if (_el || typeof document === "undefined") return _el;
  _el = document.createElement("div");
  _el.className = "lesson-cursor hidden";
  _el.setAttribute("aria-hidden", "true");
  _el.innerHTML = `<span class="lesson-cursor__ring"></span><span class="lesson-cursor__hand">👆</span>`;
  document.body.appendChild(_el);
  return _el;
}

/** 画面の位置 (= 純関数に近い: 戦闘の座標 → canvas の矩形とカメラから) */
export function worldToScreen(wx, wy, rect, camera) {
  return { x: rect.left + (wx - camera.x), y: rect.top + (wy - camera.y) };
}

function _pos() {
  if (!_target) return null;
  if (_target.el) {
    const el = document.querySelector(_target.el);
    if (!el || el.classList.contains("hidden")) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }
  const w = _target.world?.();
  const canvas = document.getElementById("battleCanvas");
  const cam = state.battle?.camera;
  if (!w || !canvas || !cam) return null;
  const p = worldToScreen(w.x, w.y, canvas.getBoundingClientRect(), cam);
  return { x: p.x, y: p.y, w: 56, h: 56 };
}

function _frame() {
  _raf = 0;
  if (!_target || !_el) return;
  if (performance.now() > _until) { hideCursor(); return; }
  const p = _pos();
  if (!p) { _el.classList.add("hidden"); }
  else {
    _el.classList.remove("hidden");
    _el.style.left = `${Math.round(p.x)}px`;
    _el.style.top = `${Math.round(p.y)}px`;
    _el.style.setProperty("--w", `${Math.round(Math.max(44, p.w + 16))}px`);
    _el.style.setProperty("--h", `${Math.round(Math.max(44, p.h + 16))}px`);
  }
  _raf = requestAnimationFrame(_frame);
}

/** 当てる (= ms のあいだ)。 動きを減らす設定でも出す (= 輪は光らない) */
export function showCursor(target, ms = 3000) {
  if (!target || !_ensure()) return false;
  _target = target;
  _until = performance.now() + ms;
  _el.classList.toggle("lesson-cursor--still", prefersReducedMotion());
  if (!_raf) _raf = requestAnimationFrame(_frame);
  return true;
}

export function hideCursor() {
  _target = null;
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  _el?.classList.add("hidden");
}

export function isCursorShown() { return !!_target; }
