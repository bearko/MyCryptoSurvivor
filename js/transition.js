// ============================================================
// transition.js — 画面の切り替えのワイプ (= SPEC-055)
// ============================================================
//
// 斜めの筐体が横切って画面を覆い、 覆いきったところで onCovered() を呼んで画面を差し替え、 抜けていく。
// 動きを減らす設定 (= OS か「演出を減らす」) のときは、 すぐ onCovered() を呼ぶだけ。
// pauseTime には触らない (= 呼び出し側の画面の開閉がいつもどおり受け持つ)。

import { prefersReducedMotion } from "./motion.js";

export const WIPE_MS = 640;          // css/node.css の --dur-page と同じ
export const WIPE_COVER_MS = 320;    // 覆いきっている真ん中 (= 40%〜60% のあいだ)

let _el = null;
let _label = null;
let _busy = false;

function _ensure() {
  if (_el) return _el;
  _el = document.createElement("div");
  _el.className = "node-wipe";
  _el.setAttribute("aria-hidden", "true");
  _el.innerHTML = '<div class="node-wipe__panel"></div><div class="node-wipe__lead"></div><div class="node-wipe__label"></div>';
  _label = _el.querySelector(".node-wipe__label");
  document.body.appendChild(_el);
  return _el;
}

/**
 * ワイプを流し、 覆ったところで onCovered を呼ぶ。 終わると解決する Promise を返す。
 * 流れている途中にもう一度呼ばれたら、 何もしない (= ボタンの二度押しで画面を二重に開かない)。
 */
export function playWipe(onCovered, { label = "" } = {}) {
  const run = () => { try { onCovered?.(); } catch (e) { console.error("[wipe]", e); } };
  if (_busy) return Promise.resolve();
  if (typeof document === "undefined" || prefersReducedMotion()) {
    run();
    return Promise.resolve();
  }
  _busy = true;
  const el = _ensure();
  _label.textContent = label;
  el.classList.remove("node-wipe--run");
  void el.offsetWidth;   // アニメーションを最初から
  el.classList.add("node-wipe--run");
  return new Promise((resolve) => {
    setTimeout(run, WIPE_COVER_MS);
    setTimeout(() => {
      el.classList.remove("node-wipe--run");
      _busy = false;
      resolve();
    }, WIPE_MS + 40);
  });
}
