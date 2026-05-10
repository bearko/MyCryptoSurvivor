---
id: SPEC-035
title: Ranking — GAS Backend + UI
status: Implementing
pr: feat/spec-035-ranking-gas
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-035 — Ranking: GAS Backend + UI

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 最後にランキング機能を実装したい。 GAS 連携手順をまとめて、 必要機能を実装してください。

既存:
- `js/ranking-client.js` (= `submitScore` POST + `fetchRanking` GET) は実装済
- `_DEFAULT_API_URL_ENC` は空 (= デプロイ後にセット)
- 活動レポート (= SPEC-033) と Game Over modal (= SPEC-009) から `submitScore` 呼出済

不足:
- サーバー側 GAS スクリプト
- デプロイ手順書
- ランキング **表示** UI (= 上位 N 件取得 + 一覧)
- API URL 設定 UI (= 開発者コンソールに頼らないセットアップ)

## 2. ゴール

- GAS Web App スクリプト `tools/gas-ranking.gs` を提供 (= POST 追記 + GET top N)
- セットアップ手順書 `docs/process/RANKING_SETUP.md` を提供
- **タイトル画面** + **一時停止メニュー** (= SPEC-034 の ☰) の 2 経路 + 活動レポート送信後ボーナスから開ける **ランキングモーダル** を実装
- API URL は localStorage 設定 / `#api=base64(URL)` ブートストラップ / モーダル内入力欄 / `_DEFAULT_API_URL_ENC` ハードコードの 4 通り対応
- バージョンフィルタ (= `version=APP_VERSION` のみ表示 / 全バージョン) を提供

## 3. 設計

### 3.1 GAS バックエンド

`tools/gas-ranking.gs`:
- `doPost(e)`: JSON body を受けて `ranking` シートに append
- `doGet(e)`: `?limit=N&version=V` で top N (= score 降順) を JSON 返却
- ヘッダー行が無ければ自動生成 (= `[timestamp, playerName, score, level, kills, hero, faction, version, elapsedSec]`)
- `ContentService` で `application/json` レスポンス (= CORS は GAS 側でデフォルト許可)

クライアントは既存 `ranking-client.js` の `Content-Type: text/plain` POST で OPTIONS preflight を回避済。

### 3.2 セットアップ手順書

`docs/process/RANKING_SETUP.md`:
1. Spreadsheet 新規作成
2. 拡張機能 → Apps Script に `tools/gas-ranking.gs` 全文貼り付け
3. デプロイ → ウェブアプリ (= 自分実行 / 全員アクセス) → URL コピー
4. ゲームに URL 投入 (= 3 通り)
5. シートのデータ構造 + 不正対策 hints + 再デプロイ + 削除手順

### 3.3 UI コンポーネント

#### `index.html`
- タイトル画面: `#btnTitleRanking` (`Press to Start` の下、 `.btn--ghost` スタイル)
- 一時停止メニュー: `#pauseMenuRanking` (= SPEC-034 の `#pauseMenuModal` に 4 つめのボタンとして追加)
- ランキングモーダル `#rankingModal`: 既存 `.gameover-modal` クラス再利用 + `.ranking-card`
  - filter `<select>` (= 全バージョン / 現バージョンのみ)
  - 更新ボタン
  - `<table>` (= 5 列: # / プレイヤー / スコア / 撃破 / 時間)
  - `#rankingMsg` (= 状態メッセージ)
  - `#rankingConfig` (= URL 未設定時のみ表示、 入力欄 + 保存ボタン)
  - 閉じるボタン

#### `js/ranking-ui.js` 新規
- `installRankingUI()` を `js/main.js init` から呼ぶ
- `openRanking()` / `closeRanking()` で pause/resume (= named export、 menu.js から動的 import で参照)
- 開いた直後に `fetchRanking({ limit: 20, version: APP_VERSION })`
- フィルタ change で再取得
- URL 未設定 → `#rankingConfig` を表示、 入力で `setRankingApiUrl`
- 言語切替で再描画
- launcher は `#btnTitleRanking` のみ。 メニュー経路は `js/menu.js` の `_onRanking` ハンドラが `import("./ranking-ui.js").openRanking()` を呼ぶ

#### `#api=base64(URL)` ブートストラップ
- 起動時に `location.hash` を見て `#api=...` があれば base64 デコード → `setRankingApiUrl` → hash を消す
- 1 度踏めば以降は localStorage に残る

#### 活動レポート連携
- `js/battle/activity-report.js`: 送信成功時に `#activityReportViewRanking` (= 新規 button) を表示、 click で `openRanking()`

### 3.4 i18n (`data/i18n/ui.json`)

`ranking.title` / `openTitle` / `refresh` / `loading` / `empty` / `loadFail` / `needUrl` / `urlInvalid` / `urlSaved` / `urlPlaceholder` / `configLabel` / `saveUrl` / `filter.all` / `filter.current` / `col.{rank,player,score,kills,time}` (= 17 キー)

### 3.5 CSS (`css/components.css`)

`.ranking-card` (max 520px) / `.ranking-toolbar` / `.ranking-filter` / `.ranking-table-wrap` / `.ranking-table` / `.ranking-msg` / `.ranking-config` / `.ranking-close` + mobile breakpoint。

## 4. 受入基準

### GAS バックエンド
- [ ] `RANKING_SETUP.md` の手順通りで 5 分以内にデプロイ可能
- [ ] `{URL}?limit=5` で `{ "ok": true, "ranking": [] }` が返る
- [ ] 1 件 POST 後に `?limit=5` で 1 件目が返る、 score 降順で並ぶ
- [ ] `?version=0.1.0` で バージョン絞込が効く

### クライアント UI
- [ ] タイトル画面の 「ランキング」 ボタンでモーダルが開く
- [ ] 戦闘中ヘッダー ☰ → 「ランキング」 でメニュー経由でも開く (= 4 番目のボタン)
- [ ] URL 未設定なら入力欄 + メッセージが表示
- [ ] URL 入力して 「API URL を保存」 で localStorage に保存 + 一覧再取得
- [ ] フィルタを 「全バージョン」 に切替で再取得
- [ ] 「更新」 でも再取得
- [ ] エントリ 0 件なら 「まだエントリがありません。 1 番乗りに送信してみよう!」 メッセージ
- [ ] 上位 20 件、 スコア降順で表示
- [ ] mobile (< 480px) で table が overflow-x scroll
- [ ] 言語切替でラベル / 列見出し / メッセージが JP/EN
- [ ] `#api=base64(URL)` 付き URL を踏むと自動保存 + hash 消去

### 活動レポート連携
- [ ] 送信成功時に 「ランキングを見る」 ボタンが現れる
- [ ] click でランキングモーダルが開き、 自分のスコアが上位に表示

### 共通
- [ ] DevTools console エラー無し
- [ ] ranking modal を pause が掛かる (= 戦闘中は時間が止まる)

## 5. リスク

- **GAS の cold start** で初回 GET が遅い (= 3-5 sec) — 仕様。 「読み込み中…」 表示で誤魔化せる
- **匿名 POST 可能** — 個人プロジェクト前提。 不正対策は `RANKING_SETUP.md` 5 章を参照
- **GAS の同時実行制限** (= 30 max) — 同時アクセスが 30 を超えると 500。 個人規模では問題なし
- **`Content-Type: text/plain` で POST** — GAS の CORS preflight 回避。 既存挙動

## 6. 参考

- 既存 `js/ranking-client.js` (= submit/fetch、 SPEC-009 + α)
- GAS Web App docs: <https://developers.google.com/apps-script/guides/web>
- ユーザー指示: 「最後にランキング機能を実装したい。 GAS 連携手順をまとめて」
