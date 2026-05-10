---
id: SPEC-038
title: Activity Report Icon Layout + Anonymous Default Name
status: Implementing
pr: feat/spec-038-report-icons-and-anon
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-038 — Activity Report Icon Layout + Anonymous Default Name

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 活動レポートはテキストではなく極力アイコンで表現してほしい。 MyCryptoTactics を参考に。
> - ヒーローはヒーローアイコン + 名前
> - エクステンションはアイコン + Lv. を表示
>
> ランキングはデフォルト名 anonymous にしてください
> スコアはもっと大きく表示してほしい

## 2. ゴール

- 活動レポートを **アイコン中心** のレイアウトに刷新
  - ヒーロー: ポートレート (= 56px 円形クリップ) + 名前 + 派閥カラーボーダー
  - エクステンション: tier アイコン (= 38px) + 右下 Lv バッジ
  - ステージごとの table → カード式に
- 総合スタッツ: メタ行 (= 1 行に時間 / 撃破 / レギュ) + **巨大スコア** (= clamp 2.6〜4rem)
- ランキング名入力欄のデフォルトを **「anonymous」** に
- ランキング表のスコア列も視覚強調

## 3. 実装

### 3.1 `js/battle/activity-report.js`

`_renderReport()` 全面書き換え:

- ヒーロー: `<img src="${heroImg(h.heroId)}">` + name + `data-faction` で派閥カラーボーダー
- ステージ: tableのthead廃止 → `<div class="report-stage">` カード × N
  - head: `[ステージ名]` + `⏱ {time} · 💀 {kills} · Lv.{level}`
  - exts: `<div class="report-ext">` (= `<img src="${extTierImg(ext, lv)}">` + `<span class="report-ext__lv">Lv.{n}</span>`) を flex-wrap で並べる
- totals: `report-meta-row` + **`report-score-big`** (= 巨大数字 + `toLocaleString()` で 3 桁区切り)
- imports: `extTierImg` (= extensions.js)、 `heroImg` (= heroes.js)

### 3.2 `index.html`

- `<table class="report-stages">...<tbody>` → `<div class="report-stages" id="activityReportStages"></div>`
- thead 廃止 (= 各カードに head が出るので不要)

### 3.3 `js/ranking-client.js`

```js
const DEFAULT_PLAYER_NAME = "anonymous";
export function getPlayerName() {
  try {
    const v = localStorage.getItem(LS_PLAYER_NAME);
    return (v && v.trim()) ? v : DEFAULT_PLAYER_NAME;
  } catch (e) { return DEFAULT_PLAYER_NAME; }
}
```

→ activity-report / gameover の `if (!input.value) input.value = getPlayerName();` で **名前欄が "anonymous" 既定** になる。 ユーザーが空のまま送信しても 「anonymous」 でランキング登録。

### 3.4 `data/i18n/ui.json`

`report.scoreLabel` = "SCORE" (= 巨大数字の下のラベル、 言語非依存だが一応 i18n 化)

### 3.5 `css/components.css`

新規クラス:
- `.report-hero__inner` (= 派閥カラーボーダー)
- `.report-hero__portrait` (= 56px 円形)
- `.report-hero__name`
- `.report-stage` / `.report-stage__head` / `.report-stage__name` / `.report-stage__stats` / `.report-stage__exts`
- `.report-ext` (= 38px タイル) / `.report-ext__icon` / `.report-ext__lv` (= 右下バッジ)
- `.report-meta-row` / `.report-meta`
- **`.report-score-big`** (= clamp 2.6〜4rem、 ドロップシャドウ + tabular-nums)
- `.report-score-label` (= "SCORE" letter-spacing 0.3em)

mobile breakpoint で 48px / 34px / 0.95rem 等に縮小。

ranking 表のスコア列も `.ranking-table .ranking-score { font-size: 1.05rem; font-weight: 900; }` で強調。

## 4. 受入基準

### 活動レポート
- [ ] ヒーローが **ポートレート画像 + 名前 + 派閥カラー** で表示
- [ ] ステージごとに **カード** が縦に並ぶ
- [ ] 各カードの head に ステージ名 + (⏱ 時間 / 💀 撃破 / Lv.N)
- [ ] 取得 ext が **38px アイコン + 右下 Lv バッジ** で並ぶ (= 名前テキストは hover tooltip のみ)
- [ ] 総合は (🏷 レギュ / ⏱ 総時間 / 💀 総撃破) のメタ行 + **巨大スコア** (= 数値、 3 桁区切り) + "SCORE" ラベル
- [ ] EN モードでも同レイアウト

### ランキング
- [ ] 名前欄が空なら "anonymous" がプレースホルダー的に入る
- [ ] そのまま送信できる
- [ ] ランキング表のスコア列が 大文字フォントで目立つ
- [ ] mobile (< 480px) で 48px / 34px に縮小されて崩れない

### 共通
- [ ] DevTools console エラー無し
- [ ] 言語切替で文言が JP/EN 切替

## 5. リスク

- **画像 404 時の表示崩れ** — `onerror` で `--missing` クラス + `removeAttribute('src')` (= 既存 hero-tile と同パターン)。 silhouette 風グラデーションで埋める
- **多 ext 時の高さ膨張** — 1 ステージあたり最大 10 系列 = 10 タイル。 wrap でも 2-3 行で収まる
- **テキスト依存の SR / アクセシビリティ低下** — `<img alt="...">` + `<span title="...">` で名前を保持、 スクリーンリーダーは alt を読む

## 6. 参考

- MyCryptoTactics の活動レポート / ranking スクリーン
- 既存 `js/battle/activity-report.js` (= SPEC-033 のテキスト table)
- `js/extensions.js` `extTierImg` (= tier 連動アイコン、 SPEC-021)
- `js/heroes.js` `heroImg` (= MCH heroId → URL)
