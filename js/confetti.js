// ============================================================
// confetti.js — 紙吹雪 (= SPEC-149)。 bearko/mycryptoheroes の Data/Effects/GoldChest/confetti.js を ES Module に写したもの
// ============================================================
//
// 粒子数 120・速さ 2・12 色の固定パレット・15 ms 間隔は、 マイクリのクライアント JS から抜き出した値のまま。
// 線を傾けながら落とす描き方も同じ。 画面の一番上の固定 canvas に描き、 pointer-events: none なのでボタンは押せる。
// 純関数 (= resetParticle / stepParticle) はテストから呼べる。 動きを減らす設定では出さない。

import { prefersReducedMotion } from "./motion.js";

export const CONFETTI = Object.freeze({ maxCount: 120, speed: 2, frameInterval: 15, alpha: 1.0 });
export const CONFETTI_COLORS = Object.freeze([
  "rgba(30,144,255,", "rgba(107,142,35,", "rgba(255,215,0,", "rgba(255,192,203,", "rgba(106,90,205,", "rgba(173,216,230,",
  "rgba(238,130,238,", "rgba(152,251,152,", "rgba(70,130,180,", "rgba(244,164,96,", "rgba(210,105,30,", "rgba(220,20,60,",
]);

/** 1 粒を画面の上のどこかに置き直す (= 純関数。 rnd は 0..1) */
export function resetParticle(p, width, height, rnd = Math.random) {
  p.color = CONFETTI_COLORS[(rnd() * CONFETTI_COLORS.length) | 0] + `${CONFETTI.alpha})`;
  p.x = rnd() * width;
  p.y = rnd() * height - height;
  p.diameter = rnd() * 10 + 5;
  p.tilt = rnd() * 10 - 10;
  p.tiltAngleIncrement = rnd() * 0.07 + 0.05;
  p.tiltAngle = 0;
  return p;
}

/** 1 コマ進める (= 純関数)。 streaming: まだ降らせているか。 戻り値: 画面の外に出たか */
export function stepParticle(p, waveAngle, width, height, streaming) {
  if (!streaming && p.y < -15) p.y = height + 100;
  else {
    p.tiltAngle += p.tiltAngleIncrement;
    p.x += Math.sin(waveAngle);
    p.y += (Math.cos(waveAngle) + p.diameter + CONFETTI.speed) * 0.5;
    p.tilt = Math.sin(p.tiltAngle) * 15;
  }
  return p.x > width + 20 || p.x < -20 || p.y > height;
}

let _canvas = null, _ctx = null, _raf = 0, _last = 0, _streaming = false, _particles = [], _wave = 0, _stopTimer = 0;

function _ensure() {
  if (_canvas) return true;
  if (typeof document === "undefined") return false;
  _canvas = document.createElement("canvas");
  _canvas.id = "confettiCanvas";
  _canvas.className = "confetti";
  _canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext("2d");
  const fit = () => { _canvas.width = window.innerWidth; _canvas.height = window.innerHeight; };
  window.addEventListener("resize", fit, true);
  fit();
  return true;
}

function _frame() {
  _raf = 0;
  if (!_ctx) return;
  const w = _canvas.width, h = _canvas.height;
  if (_particles.length === 0) { _ctx.clearRect(0, 0, w, h); return; }
  const now = Date.now();
  const delta = now - _last;
  if (delta > CONFETTI.frameInterval) {
    _ctx.clearRect(0, 0, w, h);
    _wave += 0.01;
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      if (stepParticle(p, _wave, w, h, _streaming)) {
        if (_streaming && _particles.length <= CONFETTI.maxCount) resetParticle(p, w, h);
        else _particles.splice(i, 1);
      }
    }
    for (const p of _particles) {
      _ctx.beginPath();
      _ctx.lineWidth = p.diameter;
      const x2 = p.x + p.tilt;
      const y2 = p.y + p.tilt + p.diameter / 2;
      _ctx.strokeStyle = p.color;
      _ctx.moveTo(x2 + p.diameter / 2, p.y);
      _ctx.lineTo(x2, y2);
      _ctx.stroke();
    }
    _last = now - (delta % CONFETTI.frameInterval);
  }
  _raf = requestAnimationFrame(_frame);
}

/** 降らせ始める。 durationMs のあいだ降らせ続け、 そのあとは残りが落ちきって消える */
export function startConfetti({ durationMs = 3500 } = {}) {
  if (prefersReducedMotion() || !_ensure()) return false;
  const w = _canvas.width, h = _canvas.height;
  while (_particles.length < CONFETTI.maxCount) _particles.push(resetParticle({}, w, h));
  _streaming = true;
  _canvas.classList.add("confetti--on");
  clearTimeout(_stopTimer);
  if (durationMs > 0) _stopTimer = setTimeout(stopConfetti, durationMs);
  if (!_raf) { _last = Date.now(); _raf = requestAnimationFrame(_frame); }
  return true;
}

/** 新しく降らせるのをやめる (= 落ちている粒はそのまま) */
export function stopConfetti() { _streaming = false; }

/** すぐ消す (= 画面を閉じたとき) */
export function removeConfetti() {
  clearTimeout(_stopTimer);
  _streaming = false;
  _particles = [];
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
  _canvas?.classList.remove("confetti--on");
}

export function isConfettiRunning() { return _streaming; }
