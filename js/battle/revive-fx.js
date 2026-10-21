// ============================================================
// battle/revive-fx.js — 復活の演出 (= SPEC-150 → SPEC-151)。 粒子になって舞い、 紡錘の渦で待ち、 吸い込まれ、 上から降って元の姿へ
// ============================================================
//
// 絵の元は state.battle.playerSprite.img (= 64×64)。 2×2 を 1 粒にまとめて最大 32×32 = 1,024 粒。
//   dissolve: ヒーローの描かれていた画面座標から上へ舞い上がる (1.4 秒。 画面はだんだん暗く)
//   flow:     それぞれの粒が、 画面の真ん中の紡錘 (= 上下に細く、 真ん中が太い円柱) の持ち場へ流れこむ (0.9 秒)
//   vortex:   紡錘の中を回りながら上から下へ流れ続ける (= 結果の画面のあいだずっと)
//   sink:     「復活する」: 渦ごと画面の下へ吸い込まれる (0.8 秒) → ここで戦闘を始める
//   rain:     ステージの真ん中に、 上から粒が降りこんで自分の画素の位置に収まり、 ヒーローの姿になる (1.0 秒) → 閃光と「REVIVE!」
// 結果の画面 (= --z-modal-top) のすぐ下の固定 canvas に描く (= 半透明の札の後ろで渦が見える)。 純関数はテストから呼べる。

import { prefersReducedMotion } from "../motion.js";

/** 王妃の黄金時計 (= MCH のエクステンション 5111。 「復活する」のボタンとマインちゃんの横の絵) */
export const REVIVE_EXT_ID = 5111;

export const REVIVE = Object.freeze({
  grid: 32,          // 1 辺の粒の数 (= 64×64 の 2×2 をまとめる)
  dissolveMs: 1400,  // 舞い上がる時間
  flowMs: 900,       // 渦の持ち場へ流れこむ時間
  sinkMs: 800,       // 下へ吸い込まれる時間
  rainMs: 1000,      // 上から降って姿になる時間
  flashMs: 520,      // 閃光と輪
  ringR: 90,         // 輪の半径 (px)
  upMin: 60, upMax: 170,   // 舞い上がる速さ (px/s)
  wind: 40,          // 風の横揺れ (px/s)
  alphaMin: 0.55,
  spindleH: 0.5,     // 紡錘の高さ (= 画面の高さに対して)
  spindleR: 0.22,    // 紡錘の最大半径 (= 画面の短いほうに対して)
  spinMin: 0.8, spinMax: 1.4,   // 回る速さ (rad/s)
  fallMin: 0.10, fallMax: 0.18, // 上から下へ流れる速さ (= 1 秒に紡錘の何割)
  dark: 0.6,         // 渦のあいだの画面の暗さ
});

/**
 * 画素 → 粒 (= 純関数)。 data は RGBA の配列 (= ImageData.data)、 srcW×srcH の絵。 grid×grid にまとめる
 *   返す: [{ u, v, r, g, b }]。 u・v は絵の左上を 0、 右下を 1 とした粒の中心
 */
export function spriteParticles(data, srcW, srcH, grid = REVIVE.grid) {
  const out = [];
  const bw = srcW / grid, bh = srcH / grid;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(gx * bw), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * bw));
      const y0 = Math.floor(gy * bh), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * bh));
      for (let y = y0; y < y1 && y < srcH; y++) {
        for (let x = x0; x < x1 && x < srcW; x++) {
          const i = (y * srcW + x) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]; n++;
        }
      }
      if (!n || a / n < 64) continue;   // 透明なところは粒にしない
      out.push({ u: (gx + 0.5) / grid, v: (gy + 0.5) / grid, r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) });
    }
  }
  return out;
}

export const easeInCubic = (k) => k * k * k;
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * 散っている粒を 1 コマ進める (= 純関数)。 t: 散り始めてからの秒。 h: 画面の高さ
 *   舞い上がる時間のあいだは up の速さで上へ (= だんだん弱まる)。 風で左右に揺れる
 */
export function dissolveStep(p, t, dt, h) {
  const k = Math.min(1, t / (REVIVE.dissolveMs / 1000));
  const rise = p.up * (1 - easeOutCubic(k) * 0.85);
  p.x += Math.sin(t * 1.7 + p.phase) * REVIVE.wind * dt + p.side * dt;
  p.y -= rise * dt;
  if (p.y < -12) p.y = h + 8;
  p.a = REVIVE.alphaMin + (1 - REVIVE.alphaMin) * (0.5 + 0.5 * Math.sin(t * 3 + p.phase * 2));
  return p;
}

/**
 * 紡錘の渦の中の位置 (= 純関数)。 粒の持ち場は theta (= 角度) と s (= 上 0 → 下 1)。
 *   半径は上下で 0、 真ん中で最大 (= sin πs)。 depth (= 手前 1 → 奥 -1) で明るさと大きさを変える
 */
export function vortexPos(p, cx, cy, spindleH, spindleR) {
  const s = p.s - Math.floor(p.s);   // 0..1 (= 下へ抜けたら上から)
  const r = spindleR * Math.pow(Math.sin(Math.PI * s), 0.7) * p.rj;
  const depth = Math.sin(p.theta);
  return { x: cx + Math.cos(p.theta) * r, y: cy - spindleH / 2 + s * spindleH, depth };
}

/** 渦の粒を 1 コマ進める (= 純関数。 回りながら下へ流れる) */
export function vortexStep(p, dt) {
  p.theta += p.spin * dt;
  p.s += p.fall * dt;
  if (p.s >= 1) p.s -= 1;
  return p;
}

/** 途中の位置 (= 純関数)。 e: 0..1 (= ease 済み) */
export const lerpPos = (ax, ay, bx, by, e) => ({ x: ax + (bx - ax) * e, y: ay + (by - ay) * e });

let _canvas = null, _ctx = null, _raf = 0, _parts = [], _mode = null, _t0 = 0, _dot = 3, _done = null, _flashAt = 0, _target = null, _text = null;
let _center = { x: 0, y: 0 }, _spindleH = 0, _spindleR = 0, _last = 0;
let _textLabel = "REVIVE!";

function _ensure() {
  if (_canvas) return true;
  if (typeof document === "undefined") return false;
  _canvas = document.createElement("canvas");
  _canvas.id = "reviveFx";
  _canvas.className = "revive-fx";
  _canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext("2d");
  const fit = () => { _canvas.width = window.innerWidth; _canvas.height = window.innerHeight; _layout(); };
  window.addEventListener("resize", fit, true);
  fit();
  return true;
}

function _layout() {
  if (!_canvas) return;
  _center = { x: _canvas.width / 2, y: _canvas.height / 2 };
  _spindleH = _canvas.height * REVIVE.spindleH;
  _spindleR = Math.min(_canvas.width, _canvas.height) * REVIVE.spindleR;
}

/** 絵から粒を読む (= 読めなければ null。 ほかのドメインの絵で getImageData が拒まれたときも) */
function _readSprite(img) {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 64; c.height = img.naturalHeight || 64;
    const cx = c.getContext("2d");
    cx.drawImage(img, 0, 0, c.width, c.height);
    return spriteParticles(cx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  } catch { return null; }
}

function _finish(v) { const d = _done; _done = null; if (d) d(v); }
function _run() { if (!_raf) { _last = 0; _raf = requestAnimationFrame(_frame); } }

/**
 * 倒れた: ヒーローの描かれていた場所 (= 画面座標 x,y と絵の大きさ size) から粒が舞い上がり、 そのあと真ん中の渦へ。
 * 出せたら true。 渦に入りきったら (= dissolve + flow) onVortex を呼ぶ
 */
export function dissolveHero({ x, y, size, img, onVortex = null }) {
  if (prefersReducedMotion() || !img || !_ensure()) return false;
  const base = _readSprite(img);
  if (!base || base.length === 0) return false;
  _layout();
  _dot = Math.max(2.5, (size / REVIVE.grid) * 2.0);   // 1 粒は画面の絵の 2 倍 (= そのままだと 1 px 台で見えない)
  _parts = base.map((p) => ({
    ...p,
    x: x + (p.u - 0.5) * size, y: y + (p.v - 0.5) * size,
    up: REVIVE.upMin + Math.random() * (REVIVE.upMax - REVIVE.upMin),
    side: (Math.random() - 0.5) * 70,
    phase: Math.random() * Math.PI * 2,
    a: 1,
    // 渦の持ち場
    theta: Math.random() * Math.PI * 2,
    s: Math.random(),
    rj: 0.7 + Math.random() * 0.3,
    spin: REVIVE.spinMin + Math.random() * (REVIVE.spinMax - REVIVE.spinMin),
    fall: REVIVE.fallMin + Math.random() * (REVIVE.fallMax - REVIVE.fallMin),
    vy: 0,
  }));
  _mode = "dissolve";
  _done = onVortex;
  _t0 = performance.now();
  _canvas.classList.add("revive-fx--on");
  _run();
  return true;
}

/** 「復活する」: 渦ごと画面の下へ吸い込まれる。 吸い込まれきったら resolve (= そこで戦闘を始める) */
export function sinkHero() {
  if (!_mode || _parts.length === 0) { clearReviveFx(); return Promise.resolve(false); }
  for (const p of _parts) p.vy = 40 + Math.random() * 120;
  _mode = "sink";
  _t0 = performance.now();
  _run();
  return new Promise((resolve) => { _done = resolve; });
}

/**
 * ステージの真ん中 (= 画面座標 x,y・絵の大きさ size) に、 上から粒が降りこんでヒーローの姿になる。
 * 姿になったら resolve (= 閃光と「REVIVE!」はそのあと勝手に進む)。 粒が無ければすぐ resolve
 */
export function rainHero({ x, y, size }) {
  if (prefersReducedMotion() || !_ensure() || _parts.length === 0) { clearReviveFx(); return Promise.resolve(false); }
  const w = _canvas.width;
  for (const p of _parts) {
    p.tx = x + (p.u - 0.5) * size; p.ty = y + (p.v - 0.5) * size;
    p.gx = p.tx + (Math.random() - 0.5) * w * 0.35;
    p.gy = -20 - Math.random() * 180;
    p.delay = Math.random() * 0.25;   // 少しずつ降る
  }
  _target = { x, y };
  _mode = "rain";
  _t0 = performance.now();
  _canvas.classList.add("revive-fx--on");
  _run();
  return new Promise((resolve) => { _done = resolve; });
}

/** 消す (= タイトルへ戻るなど) */
export function clearReviveFx() {
  _parts = []; _mode = null; _target = null;
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
  _canvas?.classList.remove("revive-fx--on");
  _text?.remove(); _text = null;
  _finish(false);
}

export function reviveMode() { return _mode; }
export function setReviveLabel(s) { _textLabel = String(s || "REVIVE!"); }

/** 1 粒を描く (= tint で金色を混ぜる) */
function _dot4(p, x, y, alpha, scale = 1, tint = 0) {
  const r = Math.round(p.r + (255 - p.r) * tint), g = Math.round(p.g + (215 - p.g) * tint), b = Math.round(p.b + (120 - p.b) * tint);
  _ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
  const d = _dot * scale;
  _ctx.fillRect(x - d / 2, y - d / 2, d, d);
}

function _frame(now) {
  _raf = 0;
  if (!_ctx || !_mode) return;
  const w = _canvas.width, h = _canvas.height;
  const dt = Math.min(0.05, (now - (_last || now)) / 1000);
  _last = now;
  const t = (now - _t0) / 1000;
  _ctx.clearRect(0, 0, w, h);
  if (_mode === "dissolve") {
    const k = Math.min(1, t / (REVIVE.dissolveMs / 1000));
    _ctx.fillStyle = `rgba(0,0,0,${(REVIVE.dark * k).toFixed(2)})`;   // 画面がだんだん暗く
    _ctx.fillRect(0, 0, w, h);
    for (const p of _parts) { dissolveStep(p, t, dt, h); _dot4(p, p.x, p.y, p.a); }
    if (k >= 1) { _mode = "flow"; _t0 = now; for (const p of _parts) { p.gx = p.x; p.gy = p.y; } }
  } else if (_mode === "flow") {
    const k = Math.min(1, t / (REVIVE.flowMs / 1000));
    _ctx.fillStyle = `rgba(0,0,0,${REVIVE.dark})`; _ctx.fillRect(0, 0, w, h);
    const e = easeInOut(k);
    for (const p of _parts) {
      vortexStep(p, dt);
      const v = vortexPos(p, _center.x, _center.y, _spindleH, _spindleR);
      const q = lerpPos(p.gx, p.gy, v.x, v.y, e);
      const front = 0.5 + 0.5 * v.depth;
      _dot4(p, q.x, q.y, 0.5 + 0.5 * front, 0.8 + 0.4 * front);
    }
    if (k >= 1) { _mode = "vortex"; _t0 = now; _finish(true); }
  } else if (_mode === "vortex") {
    _ctx.fillStyle = `rgba(0,0,0,${REVIVE.dark})`; _ctx.fillRect(0, 0, w, h);
    for (const p of _parts) {
      vortexStep(p, dt);
      const v = vortexPos(p, _center.x, _center.y, _spindleH, _spindleR);
      p.x = v.x; p.y = v.y;
      const front = 0.5 + 0.5 * v.depth;
      _dot4(p, v.x, v.y, 0.45 + 0.55 * front, 0.8 + 0.4 * front);
    }
  } else if (_mode === "sink") {
    const k = Math.min(1, t / (REVIVE.sinkMs / 1000));
    _ctx.fillStyle = `rgba(0,0,0,${(REVIVE.dark * (1 - k)).toFixed(2)})`; _ctx.fillRect(0, 0, w, h);
    for (const p of _parts) {
      vortexStep(p, dt * (1 + k * 3));   // 速く回りながら細くなり
      const v = vortexPos(p, _center.x, _center.y, _spindleH * (1 - k * 0.6), _spindleR * (1 - k * 0.7));
      p.vy += 1600 * dt;                 // 下へ落ちていく
      p.y = Math.max(p.y + p.vy * dt, v.y);
      _dot4(p, v.x, p.y, 1 - k * 0.3, 1, k * 0.5);
    }
    if (k >= 1) { _mode = null; _ctx.clearRect(0, 0, w, h); _finish(true); return; }
  } else if (_mode === "rain") {
    const k = Math.min(1, t / (REVIVE.rainMs / 1000));
    for (const p of _parts) {
      const kk = Math.max(0, Math.min(1, (k - p.delay) / (1 - p.delay)));
      const q = lerpPos(p.gx, p.gy, p.tx, p.ty, easeOutCubic(kk));
      _dot4(p, q.x, q.y, 0.6 + 0.4 * kk, 1, 0.6 * (1 - kk));
    }
    if (k >= 1) { _mode = "flash"; _flashAt = now; _showText(); _finish(true); }
  } else if (_mode === "flash") {
    const k = Math.min(1, (now - _flashAt) / REVIVE.flashMs);
    const { x, y } = _target;
    const rr = REVIVE.ringR * easeOutCubic(k);
    const grad = _ctx.createRadialGradient(x, y, 0, x, y, rr + 30);
    grad.addColorStop(0, `rgba(255,255,255,${(0.9 * (1 - k)).toFixed(2)})`);
    grad.addColorStop(0.6, `rgba(255,215,120,${(0.5 * (1 - k)).toFixed(2)})`);
    grad.addColorStop(1, "rgba(255,215,120,0)");
    _ctx.fillStyle = grad;
    _ctx.beginPath(); _ctx.arc(x, y, rr + 30, 0, Math.PI * 2); _ctx.fill();
    _ctx.strokeStyle = `rgba(255,225,140,${(1 - k).toFixed(2)})`;
    _ctx.lineWidth = 3 * (1 - k) + 1;
    _ctx.beginPath(); _ctx.arc(x, y, rr, 0, Math.PI * 2); _ctx.stroke();
    if (k >= 1) { _mode = null; _parts = []; _ctx.clearRect(0, 0, w, h); _canvas.classList.remove("revive-fx--on"); setTimeout(() => { _text?.remove(); _text = null; }, 400); return; }
  }
  _raf = requestAnimationFrame(_frame);
}

/** 「REVIVE!」の文字 (= DOM。 CSS で膨らんで消える) */
function _showText() {
  _text?.remove();
  _text = document.createElement("div");
  _text.className = "revive-text";
  _text.textContent = _textLabel;
  _text.style.left = `${Math.round(_target.x)}px`;
  _text.style.top = `${Math.round(_target.y - 70)}px`;
  document.body.appendChild(_text);
}
