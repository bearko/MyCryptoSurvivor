// ============================================================
// battle/revive-fx.js — 復活の演出 (= SPEC-150)。 ヒーローが粒子になって舞い、 「復活する」で元の姿に集まる
// ============================================================
//
// 絵の元は state.battle.playerSprite.img (= 64×64)。 2×2 を 1 粒にまとめて最大 32×32 = 1,024 粒。
// 散る: ヒーローの描かれていた画面座標から上へ舞い上がり、 そのあとはゆっくり漂い続ける (= 結果の画面の後ろで)。
// 集まる: それぞれの粒が自分の元の画素の位置 (= 再開後のヒーローの位置) へ戻り、 集まりきったら閃光と輪と「REVIVE!」。
// 結果の画面 (= --z-modal-top) の上の固定 canvas に描く (= 半透明の結果の画面に粒が重なって舞う。 マインちゃんの帯とボタンより下)。 純関数はテストから呼べる。

import { prefersReducedMotion } from "../motion.js";

/** 王妃の黄金時計 (= MCH のエクステンション 5111。 「復活する」のボタンの絵) */
export const REVIVE_EXT_ID = 5111;

export const REVIVE = Object.freeze({
  grid: 32,          // 1 辺の粒の数 (= 64×64 の 2×2 をまとめる)
  dissolveMs: 1600,  // 舞い上がる時間
  gatherMs: 1100,    // 集まる時間
  flashMs: 520,      // 閃光と輪
  ringR: 90,         // 輪の半径 (px)
  upMin: 60, upMax: 170,   // 舞い上がる速さ (px/s)
  driftUp: 24,       // 漂うときの上向きの速さ (px/s)
  dimAlpha: 0.5,     // 結果の画面が重なったあとの明るさ (= 文字の邪魔をしない)
  wind: 40,          // 風の横揺れ (px/s)
  alphaMin: 0.55,
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

/**
 * 散っている粒を 1 コマ進める (= 純関数)。 t: 散り始めてからの秒。 h: 画面の高さ
 *   舞い上がる時間のあいだは up の速さで上へ、 そのあとは driftUp でゆっくり。 風で左右に揺れ、 上から出たら下から戻る
 */
export function dissolveStep(p, t, dt, h) {
  const rise = t < REVIVE.dissolveMs / 1000 ? p.up * (1 - easeOutCubic(Math.min(1, t / (REVIVE.dissolveMs / 1000))) * 0.85) : REVIVE.driftUp;
  p.x += Math.sin(t * 1.7 + p.phase) * REVIVE.wind * dt + p.side * dt;
  p.y -= rise * dt;
  if (p.y < -12) p.y = h + 8;
  p.a = REVIVE.alphaMin + (1 - REVIVE.alphaMin) * (0.5 + 0.5 * Math.sin(t * 3 + p.phase * 2));
  return p;
}

/** 集まる途中の位置 (= 純関数)。 k: 0..1 */
export function gatherPos(p, k) {
  const e = easeInCubic(k);
  return { x: p.gx + (p.tx - p.gx) * e, y: p.gy + (p.ty - p.gy) * e };
}

let _canvas = null, _ctx = null, _raf = 0, _parts = [], _mode = null, _t0 = 0, _dot = 3, _gatherDone = null, _flashAt = 0, _target = null, _text = null, _dim = false;

function _ensure() {
  if (_canvas) return true;
  if (typeof document === "undefined") return false;
  _canvas = document.createElement("canvas");
  _canvas.id = "reviveFx";
  _canvas.className = "revive-fx";
  _canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext("2d");
  const fit = () => { _canvas.width = window.innerWidth; _canvas.height = window.innerHeight; };
  window.addEventListener("resize", fit, true);
  fit();
  return true;
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

/**
 * 倒れた: ヒーローの描かれていた場所 (= 画面座標 x,y と絵の大きさ size) から粒が舞い上がる。 出せたら true
 */
export function dissolveHero({ x, y, size, img }) {
  if (prefersReducedMotion() || !img || !_ensure()) return false;
  const base = _readSprite(img);
  if (!base || base.length === 0) return false;
  _dot = Math.max(2.5, (size / REVIVE.grid) * 2.0);   // 1 粒は画面の絵の 2 倍 (= そのままだと 1 px 台で見えない)
  _parts = base.map((p) => ({
    ...p,
    x: x + (p.u - 0.5) * size, y: y + (p.v - 0.5) * size,
    up: REVIVE.upMin + Math.random() * (REVIVE.upMax - REVIVE.upMin),
    side: (Math.random() - 0.5) * 70,
    phase: Math.random() * Math.PI * 2,
    a: 1,
  }));
  _mode = "dissolve";
  _dim = false;
  _t0 = performance.now();
  _canvas.classList.add("revive-fx--on");
  if (!_raf) _raf = requestAnimationFrame(_frame);
  return true;
}

/**
 * 復活: 粒がフィールドの真ん中 (= 画面座標 x,y・絵の大きさ size) へ集まる。 集まりきったら resolve (= そこで戦闘を始める)。
 * 粒が無ければ (= 動きを減らす設定・絵が読めなかった) すぐ resolve
 */
export function gatherHero({ x, y, size }) {
  if (_mode !== "dissolve" || _parts.length === 0) { clearReviveFx(); return Promise.resolve(false); }
  for (const p of _parts) { p.gx = p.x; p.gy = p.y; p.tx = x + (p.u - 0.5) * size; p.ty = y + (p.v - 0.5) * size; }
  _target = { x, y };
  _dim = false;
  _mode = "gather";
  _t0 = performance.now();
  return new Promise((resolve) => { _gatherDone = resolve; });
}

/** 消す (= タイトルへ戻るなど) */
export function clearReviveFx() {
  _parts = []; _mode = null; _target = null;
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
  _canvas?.classList.remove("revive-fx--on");
  _text?.remove(); _text = null;
  if (_gatherDone) { const d = _gatherDone; _gatherDone = null; d(false); }
}

export function isHeroDissolved() { return _mode === "dissolve" || _mode === "gather"; }

/** 結果の画面が重なったら粒を少し暗く (= 文字の邪魔をしない) */
export function dimReviveFx(on = true) { _dim = !!on; }

let _last = 0;
function _frame(now) {
  _raf = 0;
  if (!_ctx || !_mode) return;
  const w = _canvas.width, h = _canvas.height;
  const dt = Math.min(0.05, (now - (_last || now)) / 1000);
  _last = now;
  const t = (now - _t0) / 1000;
  _ctx.clearRect(0, 0, w, h);
  if (_mode === "dissolve") {
    for (const p of _parts) {
      dissolveStep(p, t, dt, h);
      _ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${(p.a * (_dim ? REVIVE.dimAlpha : 1)).toFixed(2)})`;
      _ctx.fillRect(p.x - _dot / 2, p.y - _dot / 2, _dot, _dot);
    }
  } else if (_mode === "gather") {
    const k = Math.min(1, (now - _t0) / REVIVE.gatherMs);
    for (const p of _parts) {
      const q = gatherPos(p, k);
      // 戻る途中で金色が混じる
      const r = Math.round(p.r + (255 - p.r) * k * 0.6), g = Math.round(p.g + (215 - p.g) * k * 0.6), b = Math.round(p.b + (120 - p.b) * k * 0.6);
      _ctx.fillStyle = `rgba(${r},${g},${b},1)`;
      _ctx.fillRect(q.x - _dot / 2, q.y - _dot / 2, _dot, _dot);
    }
    if (k >= 1) {
      _mode = "flash";
      _flashAt = now;
      _showText();
      const d = _gatherDone; _gatherDone = null;
      if (d) d(true);
    }
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
let _textLabel = "REVIVE!";
export function setReviveLabel(s) { _textLabel = String(s || "REVIVE!"); }
