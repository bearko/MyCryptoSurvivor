---
id: SPEC-010
title: Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card
status: Implementing
pr: 11
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-010 — Mobile Viewport Fit + Hero/Enemy Sprites + Extension Icon/Effect in Level-up Card

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-009 (= Game Over MVP、 stack 上)

## 1. 背景 / 課題

ユーザーから 3 つの指摘:

1. **「バトルの描画範囲がスマホに対応できていない」**
   現状 `.app { min-height: 100vh; min-height: 100dvh }` + `.stage { flex: 1; height: 100% }` + `.battle-canvas { width: 100%; height: 100% }` だが、 モバイルで HUD が 2 行に折り返すと content height が viewport を超え、 canvas が想定通りに高さを取れない。 `100dvh` だけでは不十分なケースが多い。

2. **「丸アイコンではなく、 ヒーローのアイコン、 エネミーのアイコンに正しく差し替え」**
   現状プレイヤー / 敵が単色の円。 SPEC-002 / SPEC-003 で `heroImg(heroId)` / `enemyImg(enemyId)` の URL ヘルパは整備済。 これを使って実画像を描画する。

3. **「レベルアップ時のエクステンションの選択肢でもエクステンションのアイコンは表示してください。 効果も併せて表示してください」**
   現状 Level up カードは色帯 + 名前 + 系列 + Lv 表示のみ。 アイコンと効果説明 (= ダメージ / クールダウン / 射程) を追加する。

本 SPEC は SPEC-011 (= 17 系列 × 5 段階の本格再設計) の前段の **視覚 / レイアウト 改修のみ** に絞る。 武器挙動の差し替えは SPEC-011 でやる。

## 2. ゴール

### 2.1 viewport
- `.app` を `height: 100dvh` (= viewport 固定) にし、 内部の overflow を制御
- `.stage` 内の canvas を `position: absolute; inset: 0` で確実に親 fill
- HUD 折り返し時も canvas 高さが reliably 取れる
- `<body>` / `<html>` も `height: 100%` で連鎖 fix
- iOS Safari の URL バー表示変動でも canvas が自動追従 (= visualViewport API は使わず CSS のみで対応)

### 2.2 sprites
- **プレイヤー**: 選択ヒーローの `heroImg(heroId)` を `Image()` で preload、 canvas に `drawImage` で円形クリップ描画
- **敵**: ENEMY_ROSTER の最初の 1 体 (= デフォルト enemy) の `enemyImg(enemyId)` を preload、 同じく円形クリップ描画
- **fallback**: 画像が `onerror` した場合は従来の単色円描画 (= 既存挙動を保持)
- 円形クリップは `ctx.save() + ctx.beginPath() + ctx.arc + ctx.clip + ctx.drawImage + ctx.restore()` で実装
- `state.battle.player.color` / `enemy.color` は border 色 / fallback 色として残置

### 2.3 Level-up card
- カード内に extension のアイコン (= `extImg(extId)`) を `<img>` タグで挿入
- 名前の下に **効果テキスト** を新規追加
  - フォーマット: `DMG {dmg} · CD {cd}s · {range}px` (= 短縮表記、 1 行)
  - i18n 経由で `levelup.weaponEffect` テンプレを使う
- 既所持の Lv up 表示 (= 「Lv.1 → Lv.2」) はそのまま、 効果テキストは next 値を表示
- カード min-height を上げて内容が収まるようにする

## 3. 非ゴール

- 17 系列 × 5 段階の Extension スキーマ overhaul (= SPEC-011)
- 武器系列ごとの固有挙動 (= Revolver の spread / Book の orbit 等は SPEC-012 以降)
- 強化 (= buff) extension の効果 (= SPEC-013)
- 敵バリエーション (= 複数種スポーン、 別 SPEC)
- ヒーロー画像のアスペクト比保持 (= 円形クリップで対応、 元画像が長方形でも円に収める)
- 画像のキャッシュ管理 / プリロード戦略の高度化
- WebP / SVG 等の画像形式変更
- アニメーション (= 走るアニメ等)

## 4. ユーザー体験

1. **モバイル**: 起動 → ヒーロー pick → starter 武器 pick → battle 開始時、 canvas が画面いっぱい (= 縦も横も) に広がる
2. **PC / モバイル**: プレイヤーは選択したヒーローの **顔写真** が円形にトリミングされて表示
3. 敵も MCH 由来の **クリーパー (or 同等)** の画像が円形で表示
4. Level up モーダルで extension が表示されるとき、 **左にアイコン**、 **右に名前 + 系列 + 効果 + Lv** がカード内に並ぶ
5. 「DMG 17 · CD 1.3s · 320px」 のように数値が一目で分かる

## 5. 技術設計

### 5.1 viewport CSS

```css
/* base.css の先頭に追加 */
html, body { height: 100%; margin: 0; padding: 0; }
body { overflow: hidden; background: var(--bg); }

/* layout.css */
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  /* fallback for ancient browsers without dvh */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  background: #0e0c14;
}

/* components.css */
.battle-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: #0e0c14;
  touch-action: none;
  user-select: none;
}
```

`.battle-canvas { position: absolute; inset: 0 }` にすることで、 親 `.stage` の resolved size に確実に追従する (= flex の reflow 競合を回避)。

### 5.2 sprite preload (= js/battle/sprites.js 新規)

```js
// js/battle/sprites.js
import { heroImg } from "../heroes.js";
import { enemyImg, ENEMY_ROSTER } from "../enemies.js";

const _imageCache = new Map();   // url → {img, ready}

function _loadImage(url) {
  let entry = _imageCache.get(url);
  if (entry) return entry;
  const img = new Image();
  img.crossOrigin = "anonymous";
  entry = { img, ready: false, failed: false };
  img.onload  = () => { entry.ready = true; };
  img.onerror = () => { entry.failed = true; };
  img.src = url;
  _imageCache.set(url, entry);
  return entry;
}

export function getHeroSprite(hero) {
  if (!hero) return null;
  return _loadImage(heroImg(hero.heroId));
}

export function getDefaultEnemySprite() {
  const e = ENEMY_ROSTER[0];
  if (!e) return null;
  return _loadImage(enemyImg(e.enemyId));
}

/**
 * 円形クリップして画像を描画。 ready で無いか failed なら null を返し、
 * 呼出側に fallback 描画を任せる。
 * @returns {boolean} true if drawn
 */
export function drawSpriteCircular(ctx, entry, cx, cy, r) {
  if (!entry || !entry.ready || entry.failed) return false;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(entry.img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  return true;
}
```

### 5.3 startBattle 改修 (= battle/index.js)

```js
import { getHeroSprite, getDefaultEnemySprite } from "./sprites.js";

// startBattle 内
state.battle.playerSprite = getHeroSprite(hero);
state.battle.defaultEnemySprite = getDefaultEnemySprite();
```

`state.battle.playerSprite` / `defaultEnemySprite` を field として追加 (= state.js)。

### 5.4 render 改修 (= battle/render.js)

```js
import { drawSpriteCircular } from "./sprites.js";

// player 描画
const px = player.x - camera.x, py = player.y - camera.y;
const drewPlayer = drawSpriteCircular(ctx, state.battle.playerSprite, px, py, player.r);
if (!drewPlayer) {
  // fallback: 円
  ctx.fillStyle = player.color;
  ctx.beginPath(); ctx.arc(px, py, player.r, 0, Math.PI * 2); ctx.fill();
}
// 円形ボーダー (= sprite の上にも必ず描く)
ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(px, py, player.r, 0, Math.PI * 2); ctx.stroke();

// 敵描画も同様、 sprite が読めたら drawImage、 ダメなら circle
for (const e of enemies) {
  const sx = e.x - camera.x, sy = e.y - camera.y;
  // viewport カリング (既存)
  const drew = drawSpriteCircular(ctx, state.battle.defaultEnemySprite, sx, sy, e.r);
  if (!drew) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(sx, sy, e.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(sx, sy, e.r, 0, Math.PI * 2); ctx.stroke();
}
```

### 5.5 Level-up card 改修 (= battle/levelup.js + CSS)

カード DOM を再構成:

```js
const card = document.createElement("button");
card.className = "levelup-card";
card.type = "button";

// 左: アイコン
const iconWrap = document.createElement("div");
iconWrap.className = "levelup-card__icon-wrap";
const iconImg = document.createElement("img");
iconImg.className = "levelup-card__icon";
iconImg.alt = name;
iconImg.src = extImg(opt.extId);
iconImg.onerror = () => { iconImg.classList.add("levelup-card__icon--missing"); iconImg.removeAttribute("src"); };
iconWrap.appendChild(iconImg);

// 右: 系列バー + 名前 + 系列 + 効果 + Lv
const main = document.createElement("div");
main.className = "levelup-card__main";

const bar = document.createElement("div");
bar.className = "levelup-card__series";
bar.style.background = seriesColor;

const nameEl = document.createElement("div");
nameEl.className = "levelup-card__name";
nameEl.textContent = name;

const seriesEl = document.createElement("div");
seriesEl.className = "levelup-card__series-label";
seriesEl.textContent = series;

// 効果: 次レベルの weapon spec から計算
const effEl = document.createElement("div");
effEl.className = "levelup-card__effect";
effEl.textContent = _formatWeaponEffect(opt.ext, opt.nextLevel);

const lvEl = document.createElement("div");
lvEl.className = "levelup-card__lv";
lvEl.textContent = lvLabel;

main.append(bar, nameEl, seriesEl, effEl, lvEl);
card.append(iconWrap, main);
```

`_formatWeaponEffect(ext, level)`:

```js
import { weaponFromExt } from "./extensions-as-weapons.js";

function _formatWeaponEffect(ext, level) {
  const w = weaponFromExt(ext.extId, level);
  if (!w) return "";
  const cdSec = (w.cdMs / 1000).toFixed(1);
  return tpl(t("levelup.weaponEffect", "DMG {dmg} · CD {cd}s · {range}px"),
             { dmg: String(w.dmg), cd: cdSec, range: String(w.range) });
}
```

i18n 追加:
```json
"levelup.weaponEffect": { "ja": "DMG {dmg} · CD {cd}s · {range}px",
                          "en": "DMG {dmg} · CD {cd}s · {range}px" }
```

(= 数値主体なので両言語同型)

### 5.6 CSS 改修 (= levelup-card)

```css
.levelup-card {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 0.5rem;
  align-items: stretch;
  padding: 0.55rem;
  min-height: 130px;
}
.levelup-card__icon-wrap {
  width: 56px; height: 56px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.levelup-card__icon {
  width: 100%; height: 100%; object-fit: cover;
}
.levelup-card__icon--missing {
  background: linear-gradient(135deg, var(--panel-2), var(--panel));
}
.levelup-card__main {
  display: flex; flex-direction: column;
  align-items: center; gap: 0.25rem;
  text-align: center;
  min-width: 0;
}
.levelup-card__effect {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .levelup-card {
    grid-template-columns: 40px 1fr;
    padding: 0.4rem;
    min-height: 110px;
  }
  .levelup-card__icon-wrap { width: 40px; height: 40px; }
}
```

## 6. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | base.css/layout.css/components.css の viewport 修正 / battle/sprites.js 新規 / state.battle に sprite フィールド / render.js sprite 描画 / levelup.js カード再構築 / i18n weaponEffect / CSS levelup-card 改修 |

## 7. 受入基準

- [ ] PC / モバイル両方で battle canvas が画面いっぱい (= header + HUD 直下から下端まで)
- [ ] iOS Safari の URL バー表示変動で canvas が追従 (= 100dvh 効く)
- [ ] HUD 折り返し時も canvas 高さが画面残りを取る
- [ ] プレイヤーが選択ヒーローの顔写真 (= 円形クリップ) で描画
- [ ] 敵が MCH 由来 enemy 画像 (= 円形クリップ) で描画
- [ ] 画像 404 / load 失敗時は従来の色付き円が出る (= fallback 動作確認)
- [ ] Level up カードに extension アイコンが表示
- [ ] 名前 / 系列 / 効果 (= DMG / CD / 射程) / Lv 表示が縦並びで出る
- [ ] 既所持の場合、 効果テキストは next レベルの値を表示
- [ ] DevTools console エラー無し
- [ ] JP/EN 切替で全テキスト追従

## 8. リスク・懸念

- **画像読込タイミング** — sprite cache に preload するが ready=true まで描画は fallback 円。 タイトルから battle に至るまで数秒あるので大抵の環境で間に合う
- **CDN 404** — `bearko/mycryptoheroes` リポジトリに当該 PNG が無い場合、 `onerror` で entry.failed=true、 fallback 動作
- **CORS** — `crossOrigin="anonymous"` を付けるが、 raw.githubusercontent.com は CORS OK のはず
- **viewport `height: 100dvh` の対応ブラウザ** — Safari 15.4+, Chrome 108+, Firefox 101+。 fallback `100vh` を併記
- **iOS Safari address bar** — 100dvh で動的、 ただし full-screen にしたら canvas が address bar の影 (= 上下) に食い込む可能性、 safe-area inset を CSS で吸収
- **enemy のバリエーション** — Phase 1 では全敵が同じ画像。 SPEC-011 / SPEC-012 で複数種に拡張可能なよう sprite map 構造に
- **`extImg(extId)` の 404** — 既存の `data/extensions.json` で curated ID を使っているので、 大抵あるはず。 なくても fallback 円を表示

## 9. 参考

- 既存 `js/heroes.js` `heroImg`、 `js/enemies.js` `enemyImg`、 `js/extensions.js` `extImg`
- 既存 `js/battle/render.js` (= 円描画 + viewport カリング)
- 既存 `js/battle/levelup.js` (= カード DOM 構築)
- MDN: dvh / dvw 単位
- canvas circular clip: `ctx.clip()`
