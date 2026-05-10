---
id: SPEC-006
title: Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従)
status: Implementing
pr: 7
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-006 — Battle Stage Scaffold (= canvas + プレイヤー移動 + カメラ)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-005 (= HUD slim、 stack 上)

## 1. 背景 / 課題

ヴァンパイアサバイバーライクの最初の柱は **「自分のキャラを動かす」** こと。 SPEC-005 で HUD は VS 仕様になったが、 ステージは依然として `<p>` プレースホルダのまま。 本 SPEC では:

- `<canvas>` で 2D ステージを描画
- プレイヤーを WASD / 矢印キー / モバイル仮想ジョイスティック で操作
- カメラがプレイヤー追従
- 背景にグリッドを描いて移動の手応えを可視化
- ヒーロー選択完了後に battle 開始
- 既存 pauseFlags 不変条件は維持 (= モーダル開時は移動も停止)

を最小実装する。 敵 / 武器 / XP gem は **本 SPEC のスコープ外** (= SPEC-007 以降)。

## 2. ゴール

- `index.html` の `.stage` に `<canvas id="battleCanvas">` を新設、 viewport - (header + HUD) のサイズで描画
- DPR 対応 (= `devicePixelRatio` を考慮した internal pixel size)
- `requestAnimationFrame` ベースのレンダーループ (= 1 frame = 1 更新 + 1 描画)
- `state.battle = { active, player: {x,y,r,speed,color}, camera: {x,y} }` 追加
- 入力ベクタ統合 (= keyboard W/A/S/D + 矢印キー + 仮想ジョイスティック → 単一 unit vector)
- 仮想ジョイスティック (= touchstart で発生、 drag 方向、 release で消失、 pointerdown/move/up を pointer events で実装)
- カメラ即時追従 (= `camera = player - viewport/2`)
- 背景グリッド (= 64px 四方、 viewport 内のセルだけループ描画)
- プレイヤー描画 (= 半径 14px の塗り円、 色 = hero faction color)
- `pauseFlags > 0` のあいだは update を skip し描画のみ (= 静止画として見える)
- ヒーロー confirm 後 (= `applyHeroPick` 終了時) に `startBattle()` を呼び、 player を world (0,0) にスポーン
- 言語切替 / モーダル開閉とは独立に動く
- DevTools `__battle` 経由でデバッグ可能 (= 既存 `__state` パターン同形)

## 3. 非ゴール

- 敵スポーン / AI / 接触ダメージ (= SPEC-007)
- XP gem ドロップ / 拾う処理 (= SPEC-007)
- 武器 / 投射体 (= SPEC-009)
- Level up モーダル (= SPEC-008)
- Game Over (= SPEC-010)
- ヒーロー portrait をプレイヤーに反映 (= 円 + faction 色まで、 portrait は後続)
- 物理 (= 慣性 / 摩擦 / 衝突) — 入力 → 速度直結のシンプル model
- マップの境界 (= 無限平面、 移動制限なし)
- ranking 送信、 save/load
- 設定 (= 入力デバイス切替 etc)

## 4. ユーザー体験

1. タイトル → Press to Start → hero modal → 1 体選んで 「冒険を始める」 押下
2. モーダル閉じる → **canvas が見える状態に**、 中心に hero faction 色のキャラがいる
3. PC: WASD or 矢印キー → 8 方向に移動、 速度は約 180 px/sec
4. モバイル: canvas タップ → そこに virtual stick が出現、 ドラッグ方向に移動、 離すと消える
5. カメラはプレイヤーを viewport 中央に保つので、 キャラは動かず背景グリッドが流れる
6. 言語切替ボタン / ヘルプボタンを押すと canvas 上のキャラ静止 (= pauseFlags)、 閉じれば再開
7. 「あれ、 敵が出ない」 → SPEC-007 でやる旨を README/CHANGELOG に明記

## 5. 技術設計

### 5.1 state 拡張 (= state.js)

```js
// state.js (= 追記)
import { PLAYER_INIT } from "./constants.js";

state.battle = {
  active: false,        // RAF ループ実行中か (= startBattle で true)
  player: {
    x: 0, y: 0,         // world coords (px)
    r: 14,              // 半径
    speed: 180,         // 移動速度 (px/sec)
    color: "#c4a35a",   // hero faction 色 (= startBattle で上書き)
  },
  camera: { x: 0, y: 0 },  // 左上 corner の world coord
  viewport: { w: 0, h: 0 },// canvas backing size (px)
  // 後続 SPEC で追加: enemies, projectiles, gems, weapons, etc
};
```

### 5.2 constants 追加

```js
// constants.js
export const BATTLE_GRID_SIZE   = 64;
export const PLAYER_RADIUS      = 14;
export const PLAYER_SPEED_PX_S  = 180;
export const JOYSTICK_RADIUS    = 56;   // 視覚 max
export const JOYSTICK_DEADZONE  = 8;
```

### 5.3 モジュール分割

| ファイル | 役割 | export |
|---|---|---|
| `js/battle/index.js` | エントリ。 RAF ループ、 startBattle / stopBattle、 resize ハンドラ | `startBattle(hero?)` / `stopBattle()` / `getBattle()` |
| `js/battle/input.js` | キーボード + 仮想ジョイスティック → unit vector | `installInput(canvas)` / `getInputVector()` |
| `js/battle/player.js` | プレイヤー update (= 入力ベクタ × speed × dt) | `tickPlayer(dt, input)` |
| `js/battle/render.js` | clear / グリッド / プレイヤー描画 | `renderBattle(ctx)` |

### 5.4 RAF ループ (= index.js)

```js
let _raf = 0;
let _lastMs = 0;

export function startBattle(hero) {
  const b = state.battle;
  b.active = true;
  b.player.x = 0;
  b.player.y = 0;
  b.player.color = factionColor(hero?.faction) ?? "#c4a35a";
  resizeCanvas();
  _lastMs = performance.now();
  _raf = requestAnimationFrame(_loop);
}

export function stopBattle() {
  state.battle.active = false;
  if (_raf) cancelAnimationFrame(_raf);
  _raf = 0;
}

function _loop(now) {
  const dt = Math.min(0.05, (now - _lastMs) / 1000);  // dt クランプ (= タブ復帰時の暴走防止)
  _lastMs = now;

  if (state.pauseFlags === 0 && state.battle.active) {
    const v = getInputVector();
    tickPlayer(dt, v);
    centerCameraOnPlayer();
  }

  renderBattle(_ctx);
  _raf = requestAnimationFrame(_loop);
}
```

`pauseFlags > 0` のあいだは update を skip。 描画は続けるので、 modal 透過の場合に背景 frozen が見える。

### 5.5 入力 (= input.js)

```js
const _keys = new Set();
let _stick = null;  // {anchorX, anchorY, dx, dy, pointerId} or null

export function installInput(canvas) {
  window.addEventListener("keydown", (e) => _keys.add(e.code));
  window.addEventListener("keyup",   (e) => _keys.delete(e.code));
  window.addEventListener("blur", () => _keys.clear());

  canvas.addEventListener("pointerdown", _onDown);
  canvas.addEventListener("pointermove", _onMove);
  canvas.addEventListener("pointerup",   _onUp);
  canvas.addEventListener("pointercancel", _onUp);
}

export function getInputVector() {
  let kx = 0, ky = 0;
  if (_keys.has("KeyW") || _keys.has("ArrowUp"))    ky -= 1;
  if (_keys.has("KeyS") || _keys.has("ArrowDown"))  ky += 1;
  if (_keys.has("KeyA") || _keys.has("ArrowLeft"))  kx -= 1;
  if (_keys.has("KeyD") || _keys.has("ArrowRight")) kx += 1;
  // joystick
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
```

joystick の DOM 同期 (= `#joystickBase` / `#joystickStick`) は input.js 内で `_renderStick()` を呼び、 anchor / 偏倚を CSS transform で反映。

### 5.6 描画 (= render.js)

```js
export function renderBattle(ctx) {
  const { player, camera, viewport } = state.battle;
  const w = viewport.w, h = viewport.h;
  // clear
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  const G = BATTLE_GRID_SIZE;
  const startX = -((camera.x % G + G) % G);
  const startY = -((camera.y % G + G) % G);
  for (let x = startX; x < w; x += G) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = startY; y < h; y += G) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // player (= world → screen)
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(px, py, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

### 5.7 リサイズ + DPR

```js
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = _canvas.getBoundingClientRect();
  _canvas.width  = Math.round(rect.width  * dpr);
  _canvas.height = Math.round(rect.height * dpr);
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.battle.viewport.w = rect.width;
  state.battle.viewport.h = rect.height;
}
window.addEventListener("resize", resizeCanvas);
```

### 5.8 index.html 改修

```html
<section class="stage">
  <canvas id="battleCanvas" class="battle-canvas"
          aria-label="battle stage"></canvas>
  <div id="joystick" class="joystick hidden" aria-hidden="true">
    <div class="joystick__base" id="joystickBase"></div>
    <div class="joystick__stick" id="joystickStick"></div>
  </div>
</section>
```

`<p data-i18n="stage.placeholder">` は撤去。 `stage.placeholder` i18n キーも撤去。

### 5.9 CSS

```css
/* layout.css */
.stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;       /* canvas 全面利用 */
  overflow: hidden;
}
.battle-canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: #0e0c14;
  touch-action: none;     /* スクロール / ズーム抑止 */
  user-select: none;
}

/* components.css */
.joystick {
  position: absolute;
  pointer-events: none;
  z-index: 5;
}
.joystick.hidden { display: none; }
.joystick__base {
  position: absolute;
  width: 112px; height: 112px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 2px solid rgba(255,255,255,0.18);
  transform: translate(-50%, -50%);
}
.joystick__stick {
  position: absolute;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(196,163,90,0.45);
  border: 2px solid var(--accent);
  transform: translate(-50%, -50%);
}
```

`.app` を flex column にして `.stage` が remaining height を取れるよう layout.css 側を確認・修正。

### 5.10 main.js への組み込み

```js
import { startBattle, stopBattle } from "./battle/index.js";

function applyHeroPick() {
  const hero = getHero(state.pendingHeroPick);
  if (!hero) return;
  state.ownedHero = { ...hero };
  renderOwnedHeroBadge();
  closeHeroSelectModal();
  startBattle(state.ownedHero);     // ← new
}
```

window.__battle = state.battle (= デバッグ用) は state.js が __state を window に出していれば不要。

### 5.11 hero faction → color マップ

```js
function factionColor(faction) {
  return ({
    SEIRYU: "#5ecf8a",
    SUZAKU: "#e76060",
    BYAKKO: "#d4d4dc",
    GENBU:  "#56ccf2",
    KOURYU: "#f0c14b",
  }[faction]) || "#c4a35a";
}
```

(`heroes.js` に既存の `factionEmoji` と並列で `factionColor` を export しても良い、 まずは battle/index.js 内 helper で OK)

## 6. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants / state / battle/ 4 ファイル / index.html / css / main.js wire |

## 7. 受入基準

- [ ] hero pick 後、 canvas が表示され中央に faction 色の円
- [ ] WASD or 矢印キー で 8 方向移動 (= 斜め移動も同じ最大速度に正規化されている)
- [ ] 移動中、 背景グリッドが反対方向にスクロール (= camera 追従が機能)
- [ ] モバイル: canvas タップ → ジョイスティック発生、 ドラッグでキャラ移動、 release で停止 + ジョイ消失
- [ ] hero modal / help modal を開くと **キャラ移動停止** (= pauseFlags ガード)、 閉じると再開
- [ ] window resize で canvas サイズが追従 (= 縦横比変わってもズレない)
- [ ] DPR 2 (= Retina) でも描画がボケない (= internal pixel × dpr)
- [ ] pause 中も grid の最終フレームが残ったまま (= 描画は続く)
- [ ] DevTools console エラー無し
- [ ] `__state.battle.player.x = 1000` 直書き → 次フレームで camera が反映、 grid が流れる
- [ ] FPS が PC で 60fps 近辺、 モバイルでも 30fps 以上

## 8. リスク・懸念

- **タッチイベントと Pointer Events** — iOS Safari の挙動で `touch-action: none` を canvas に効かせれば pointercancel は発火しない筈。 もし暴発したら `e.preventDefault()` を pointermove で
- **WASD と既存ヘルプモーダルの衝突** — `?` キーや空白キーは何もしないので問題なし。 入力イベントは window レベルに付けるが、 input フォーム内では発火しない (= focus 上書きされる) ので一旦許容
- **hero pick 前の canvas 描画** — `state.battle.active === false` で renderBattle skip、 もしくは clear のみ
- **pauseFlags は modal 越しに 1 のはず** — `_loop` 内で `state.pauseFlags === 0` ガード、 これが現状の不変条件と整合
- **「動かしている感」** — 1 SPEC で出せるよう grid を入れた。 grid が動くだけだと地味なので、 SPEC-007 の敵を早めに入れる
- **legacy `state.weekProgress / month / year` の onTick 呼出** — battle 専用 RAF とは別系で main.js の setInterval が回る。 これは VS の経過時間 (= state.elapsedTicks) と並列で動くだけ、 副作用ゼロ

## 9. 参考

- VS の操作感 (= 移動だけは player input、 攻撃は automatic、 これに揃える)
- MDN: PointerEvent (= touch + mouse 統合)
- 既存 `js/main.js` `applyHeroPick` (= 介入ポイント)
- 既存 HUD: `#hud` の z-index が canvas より上に来る筈 (= confirm)
