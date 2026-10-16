// ============================================================
// reveal.js — 結果画面の見せ方 (= SPEC-046)
// ============================================================
//
// - countUp: 数字を 0 から数え上げる (= ease-out cubic)
// - revealIn: [data-reveal] を順に出す。 root を押すと全部出してカウントアップも終える
// 演出は 0.8 秒以内。 演出を減らす / reduced-motion では最初から最後の状態。

import { prefersReducedMotion } from "./motion.js";

export const REVEAL_STEP_MS = 90;

export function easeOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

/** 0 から to まで、 elapsedMs 時点の整数 (= 純関数) */
export function countValueAt(to, elapsedMs, durMs) {
  if (!(durMs > 0) || elapsedMs >= durMs) return Math.round(to);
  if (elapsedMs <= 0) return 0;
  return Math.round(to * easeOutCubic(elapsedMs / durMs));
}

const _running = new Set();   // 動いているカウントアップ (= 押して飛ばすため)

/**
 * @param {HTMLElement} el
 * @param {number} to
 * @param {{durMs?:number, delayMs?:number, format?:(n:number)=>string}} [opt]
 */
export function countUp(el, to, opt = {}) {
  if (!el) return;
  const durMs = opt.durMs ?? 700;
  const delayMs = opt.delayMs ?? 0;
  const fmt = opt.format ?? ((n) => n.toLocaleString());
  if (prefersReducedMotion() || durMs <= 0) {
    el.textContent = fmt(Math.round(to));
    return;
  }
  const job = { el, to, fmt, done: false, raf: 0 };
  _running.add(job);
  el.textContent = fmt(0);
  const t0 = performance.now() + delayMs;
  const step = (now) => {
    if (job.done) return;
    const v = countValueAt(to, now - t0, durMs);
    el.textContent = fmt(v);
    if (now - t0 >= durMs) { _finish(job); return; }
    job.raf = requestAnimationFrame(step);
  };
  job.raf = requestAnimationFrame(step);
}

function _finish(job) {
  if (job.done) return;
  job.done = true;
  cancelAnimationFrame(job.raf);
  job.el.textContent = job.fmt(Math.round(job.to));
  _running.delete(job);
}

/** 動いているカウントアップを全部最後の値にする */
export function finishCountUps() {
  for (const job of Array.from(_running)) _finish(job);
}

/**
 * root の [data-reveal] を順に出す。 root を押したら全部出す (= ボタンはそのまま押せる)。
 * @param {HTMLElement} root
 */
export function revealIn(root) {
  if (!root) return;
  const items = Array.from(root.querySelectorAll("[data-reveal]"));
  items.forEach((el, i) => el.style.setProperty("--i", String(i)));
  root.classList.remove("reveal--done");
  if (prefersReducedMotion()) {
    root.classList.add("reveal--done");
    return;
  }
  root.classList.remove("reveal--run");
  void root.offsetWidth;   // アニメーションをかけ直す
  root.classList.add("reveal--run");
  if (!root._revealSkipWired) {
    root._revealSkipWired = true;
    root.addEventListener("pointerdown", () => {
      root.classList.add("reveal--done");
      finishCountUps();
    });
  }
}
