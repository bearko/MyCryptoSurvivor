// ============================================================
// result-telop.js — 結果のテロップ (= SPEC-058)
// ============================================================
//
// ステージクリア・全クリア・倒れたとき、 結果の画面の前に 1.6 秒だけ:
//   - 斜めの帯が飛びこむ (= MCH の Style/Cutins/battle_result_cutin.css の jack-in の写し)
//   - 帯の前にヒーローとナビのマインちゃんが重なる。 マインちゃんは結果に反応する (= 喜ぶ / 涙ぐむ)
// 押すと飛ばせる。 終わったら結果の画面を上から順に出す (= then)。
// 動きを減らすときは出さずに、 すぐ then。 pauseTime には触らない (= 結果の画面が止めている)。

import { prefersReducedMotion } from "./motion.js";
import { naviFrameUrl, NAVI_POSES, naviHide } from "./navi.js";
import { heroImg } from "./heroes.js";
import { t } from "./i18n.js";

export const TELOP_MS = 1600;
/** マインちゃんがポーズを変えるとき (= 帯が止まったあと) */
export const TELOP_POSE2_MS = 700;

/** 結果ごとの表示 (= 純関数。 tests/result-telop.test.mjs) */
export const TELOP_KINDS = {
  clear:    { label: "NODE CLEAR",      sub: "telop.clear",    line: "telop.navi.clear",    poses: ["sparkle", "wink"],   tone: "win" },
  allClear: { label: "ALL NODES CLEAR", sub: "telop.allClear", line: "telop.navi.allClear", poses: ["sparkle", "hooray"], tone: "win" },
  lose:     { label: "SIGNAL LOST",     sub: "telop.lose",     line: "telop.navi.lose",     poses: ["teary", "cry"],      tone: "lose" },
};

export function telopSpec(kind) {
  return TELOP_KINDS[kind] ?? TELOP_KINDS.clear;
}

let _el = null, _timers = [], _done = null;

function _ensure() {
  if (_el || typeof document === "undefined") return _el;
  _el = document.createElement("div");
  _el.className = "result-telop hidden";
  _el.id = "resultTelop";
  _el.setAttribute("aria-hidden", "true");
  _el.innerHTML =
    '<div class="result-telop__flash"></div>' +
    '<div class="result-telop__label">' +
    '  <div class="result-telop__band">' +
    '    <span class="result-telop__text"></span>' +
    '    <span class="result-telop__sub"></span>' +
    '  </div>' +
    '</div>' +
    '<img class="result-telop__hero" alt="" draggable="false" />' +
    '<div class="result-telop__navi">' +
    '  <span class="result-telop__bubble"></span>' +
    '  <img class="result-telop__ain" alt="" draggable="false" />' +
    '</div>';
  _el.addEventListener("pointerdown", () => _finish());
  document.body.appendChild(_el);
  return _el;
}

function _clearTimers() {
  for (const id of _timers) clearTimeout(id);
  _timers = [];
}

function _finish() {
  if (!_done) return;
  const cb = _done;
  _done = null;
  _clearTimers();
  _el?.classList.add("hidden");
  _el?.classList.remove("result-telop--run");
  try { cb(); } catch (e) { console.error(e); }
}

/**
 * modal: 結果の画面 (= テロップのあいだは中身を隠す)。 kind: clear / allClear / lose。
 * then: テロップが終わったら (= 飛ばしたときも) 呼ぶ。 結果の画面を順に出す
 */
export function presentResult(modal, kind, { heroId = null, then = () => {} } = {}) {
  // 前のテロップが残っていたら、 先にそちらを終える (= then を取りこぼさない)
  _finish();
  const finishModal = () => {
    modal?.classList.remove("result-hold");
    then();
  };
  if (prefersReducedMotion() || !_ensure()) { finishModal(); return; }

  naviHide();   // 戦闘の通信の窓は引っこめる (= マインちゃんはテロップの前に出る)
  const spec = telopSpec(kind);
  _el.dataset.tone = spec.tone;
  _el.dataset.kind = kind;
  _el.querySelector(".result-telop__text").textContent = spec.label;
  _el.querySelector(".result-telop__sub").textContent = t(spec.sub, "");
  _el.querySelector(".result-telop__bubble").textContent = t(spec.line, "");
  const hero = _el.querySelector(".result-telop__hero");
  if (heroId != null) {
    hero.src = heroImg(heroId);
    hero.hidden = false;
  } else {
    hero.removeAttribute("src");
    hero.hidden = true;
  }
  const ain = _el.querySelector(".result-telop__ain");
  ain.src = naviFrameUrl(NAVI_POSES[spec.poses[0]]);

  modal?.classList.add("result-hold");
  _done = finishModal;
  _el.classList.remove("hidden", "result-telop--run");
  void _el.offsetWidth;   // アニメーションをかけ直す
  _el.classList.add("result-telop--run");
  _timers.push(setTimeout(() => { ain.src = naviFrameUrl(NAVI_POSES[spec.poses[1]]); }, TELOP_POSE2_MS));
  _timers.push(setTimeout(_finish, TELOP_MS));
}
