// ============================================================
// battle/input.js — keyboard + 仮想ジョイスティック → unit vector
// (= SPEC-006)
// ============================================================
//
// 入力ベクタは getInputVector() で 1 frame ごとに取得する pull モデル。
// キー押下 / pointer event は内部 Set に蓄積し、 RAF ループ側で読む。

import { JOYSTICK_RADIUS, JOYSTICK_DEADZONE } from "../constants.js";

const _keys = new Set();
let _stick = null;     // {anchorX, anchorY, dx, dy, pointerId} | null
let _baseEl = null;
let _stickEl = null;
let _stickRoot = null;

/**
 * keyboard と canvas 上の pointer event を listen する。
 * 起動時に 1 度だけ呼ぶ (= startBattle 内)。
 */
export function installInput(canvas) {
  if (!_baseEl) {
    _stickRoot = document.getElementById("joystick");
    _baseEl    = document.getElementById("joystickBase");
    _stickEl   = document.getElementById("joystickStick");
  }

  // keyboard は window レベル (= canvas に focus が無くても効く)
  window.addEventListener("keydown", _onKeyDown);
  window.addEventListener("keyup",   _onKeyUp);
  window.addEventListener("blur",    () => _keys.clear());

  // canvas の pointer events
  canvas.addEventListener("pointerdown", _onPointerDown);
  canvas.addEventListener("pointermove", _onPointerMove);
  canvas.addEventListener("pointerup",   _onPointerUp);
  canvas.addEventListener("pointercancel", _onPointerUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

function _onKeyDown(e) {
  if (e.repeat) return;
  _keys.add(e.code);
}
function _onKeyUp(e) { _keys.delete(e.code); }

function _onPointerDown(e) {
  if (_stick) return;   // 既にスティック中、 追加 pointer は無視
  e.preventDefault();
  const r = e.currentTarget.getBoundingClientRect();
  const ax = e.clientX - r.left;
  const ay = e.clientY - r.top;
  _stick = { anchorX: ax, anchorY: ay, dx: 0, dy: 0, pointerId: e.pointerId };
  e.currentTarget.setPointerCapture?.(e.pointerId);
  _showStick(ax, ay, 0, 0);
}

function _onPointerMove(e) {
  if (!_stick || e.pointerId !== _stick.pointerId) return;
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  _stick.dx = x - _stick.anchorX;
  _stick.dy = y - _stick.anchorY;
  _renderStickOffset();
}

function _onPointerUp(e) {
  if (!_stick || e.pointerId !== _stick.pointerId) return;
  e.currentTarget.releasePointerCapture?.(e.pointerId);
  _stick = null;
  _hideStick();
}

function _showStick(ax, ay, dx, dy) {
  if (!_stickRoot) return;
  _stickRoot.classList.remove("hidden");
  _baseEl.style.left  = ax + "px";
  _baseEl.style.top   = ay + "px";
  _stickEl.style.left = (ax + dx) + "px";
  _stickEl.style.top  = (ay + dy) + "px";
}

function _renderStickOffset() {
  if (!_stick || !_stickEl) return;
  const len = Math.hypot(_stick.dx, _stick.dy);
  let dx = _stick.dx, dy = _stick.dy;
  if (len > JOYSTICK_RADIUS) {
    dx = (_stick.dx / len) * JOYSTICK_RADIUS;
    dy = (_stick.dy / len) * JOYSTICK_RADIUS;
  }
  _stickEl.style.left = (_stick.anchorX + dx) + "px";
  _stickEl.style.top  = (_stick.anchorY + dy) + "px";
}

function _hideStick() {
  if (_stickRoot) _stickRoot.classList.add("hidden");
}

/**
 * 現フレームの入力 unit vector を返す (= |v| ≤ 1)。
 * keyboard と joystick を加算後、 必要なら正規化。
 */
export function getInputVector() {
  let kx = 0, ky = 0;
  if (_keys.has("KeyW") || _keys.has("ArrowUp"))    ky -= 1;
  if (_keys.has("KeyS") || _keys.has("ArrowDown"))  ky += 1;
  if (_keys.has("KeyA") || _keys.has("ArrowLeft"))  kx -= 1;
  if (_keys.has("KeyD") || _keys.has("ArrowRight")) kx += 1;

  let jx = 0, jy = 0;
  if (_stick) {
    const len = Math.hypot(_stick.dx, _stick.dy);
    if (len > JOYSTICK_DEADZONE) {
      const scale = Math.min(len, JOYSTICK_RADIUS) / JOYSTICK_RADIUS;
      jx = (_stick.dx / len) * scale;
      jy = (_stick.dy / len) * scale;
    }
  }

  let x = kx + jx, y = ky + jy;
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  return { x, y };
}
