---
id: SPEC-029
title: Logo Image + OG Thumbnail (= タイトル/スプラッシュ画像化 + X/OGP サムネ)
status: Done
pr: 36
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-029 — Logo Image + OG Thumbnail

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 添付一枚目のロゴをタイトルに差し込んで欲しい
> 添付二枚目のサムネイルを X などで URL を投稿した際にプレビューサムネイルとして表示されるようにしてほしい

## 2. ゴール

- リポジトリ同梱の logo 画像をタイトル / スプラッシュに表示
- リポジトリ同梱の OG image を Twitter / X / OGP プレビューに使う

## 3. 設計

### 3.1 アセット (= リポジトリ同梱)

- `assets/logo.png` (= 2200 × 640、 PNG RGBA、 ヘッダーバナー風)
- `assets/og-image.png` (= 1280 × 720、 PNG RGBA、 「逃げて、 倒して、 強化しろ！」)

`CLAUDE.md` の 「外部素材は CDN URL 参照」 は **MCH IP 由来の external 素材** に対する縛り。 本プロジェクト固有のロゴ / OG はリポジトリに同梱して同一オリジンで提供する (= OGP は安定 URL が必要)。

### 3.2 `index.html`

#### OGP / Twitter
```html
<meta property="og:image"        content="assets/og-image.png" />
<meta property="og:image:width"  content="1280" />
<meta property="og:image:height" content="720" />
<meta name="twitter:card"  content="summary_large_image" />
<meta name="twitter:image" content="assets/og-image.png" />
```

#### Splash
```html
<div id="splash" class="splash">
  <img class="splash__logo" src="assets/logo.png" alt="MyCryptoSurvivors" />
  <div class="splash__loading" data-i18n="splash.loading">読み込み中…</div>
</div>
```

#### Title screen
```html
<h1 class="title-screen__title">
  <img class="title-screen__logo" src="assets/logo.png" alt="MyCryptoSurvivors" />
</h1>
```

### 3.3 `css/layout.css`

```css
.splash__logo {
  width: min(80vw, 480px);
  height: auto;
  filter: drop-shadow(0 0 12px rgba(86, 204, 242, 0.35));
}
.title-screen__title {
  margin: 0;
  display: flex;
  justify-content: center;
  width: 100%;
}
.title-screen__logo {
  width: min(86vw, 600px);
  height: auto;
  filter: drop-shadow(0 0 16px rgba(86, 204, 242, 0.45));
}
```

## 4. 受入基準

- [ ] スプラッシュで `assets/logo.png` が表示
- [ ] タイトル画面で同じロゴが大きめサイズで中央配置 + ドロップシャドウ
- [ ] 言語切替で表示崩れなし
- [ ] X / Twitter / Discord で URL を貼ると `og-image.png` がプレビューに出る (= `summary_large_image` カード)
- [ ] mobile (= 横幅 < 480px) でロゴが画面に収まる
- [ ] DevTools console エラー無し

## 5. リスク

- **リポジトリにバイナリ追加** — `CLAUDE.md` の MCH-IP ガイドラインは適用外 (= プロジェクト固有資産)、 OGP は同一オリジン要求のため止むを得ない
- **画像サイズ** — 合計 ~1.1MB。 splash 段階の表示に lazy load は不要 (= eager で OK)

## 6. 参考

- 添付ロゴ: 2200 × 640 PNG
- 添付 OG 画像: 1280 × 720 PNG
- ユーザー指示: 「添付一枚目のロゴをタイトルに」 / 「添付二枚目のサムネイルを X などで」
