---
id: SPEC-036
title: GAS Sample Data Seed + Re-apply Default API URL
status: Implementing
pr: feat/spec-036-gas-seed-sample
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-036 — GAS Sample Data Seed + Re-apply Default API URL

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ダミーデータを作成して取得できるかテストしたい。 GAS スクリプトにヘッダーも含めて自動でサンプルデータ作る function も追加願います

加えて、 SPEC-035 の PR #43 マージ時に **2 番目の commit (`_DEFAULT_API_URL_ENC` の埋込)** が漏れていたため、 main の `js/ranking-client.js` は default URL が空のまま。 同じ PR で再適用する。

## 2. ゴール

- GAS スクリプトに **手動実行できる sample seed 関数** を追加 (= ヘッダー込み 12 件のダミーデータ)
- `js/ranking-client.js` の `_DEFAULT_API_URL_ENC` に当該 GAS Web App URL を base64 で埋込み直す
- セットアップ手順書 `RANKING_SETUP.md` に seed 利用手順を追記

## 3. 設計

### 3.1 `tools/gas-ranking.gs` に 3 関数追加

```js
seedSampleData()    // ranking シートを完全リセット → ヘッダー + 12 件投入
appendSampleData()  // 既存行を残して 12 件追記
clearAllRankings()  // ヘッダー残し全データ削除
```

#### サンプル内訳

- player 12 種 (= JA / EN 混成: alice / ボブ / carol / デイブ / Eve / フランク / grace / ハイディ / ivan / ジュリア / kenji / リン)
- hero 10 種 (= コナン・ドイル / 甲斐姫 / シートン / ピタゴラス / ライト兄弟 / スパルタクス / グリム兄弟 / 孫子 / 石田三成 / 許褚) を index で循環
- score: 30000 → 8000 にグラデーション + ±1500 jitter
- level: 30 → 12 ぐらいに減る
- kills: 600 → 200 ぐらい
- elapsedSec: 280 ~ 600 をランダム
- timestamp: 現在時刻から 7 時間ずつ過去 (= 「最近の数日のラン」 風に見える)

`HEADERS.length` で `getRange(N, 1, rows.length, HEADERS.length).setValues(rows)` 一括書込 (= 1 件ずつ appendRow より高速)。

### 3.2 `_DEFAULT_API_URL_ENC` 埋込再適用

`js/ranking-client.js` line 8 の空文字を、 PR #43 で予定していた btoa(URL) に戻す:

```js
const _DEFAULT_API_URL_ENC = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3a1hVRFlqbFk4dFVRSU1ubG44Vm9HejlIRDNTUjRHZEM0Q1hiRWZDdURKMUcxNUROczF3X1dKdTBRcHczc28taHptUS9leGVj";
```

= `https://script.google.com/macros/s/AKfycbwkXUDYjlY8tUQIMnln8VoGz9HD3SR4GdC4CXbEfCuDJ1G15DNs1w_WJu0Qpw3so-hzmQ/exec`

### 3.3 `RANKING_SETUP.md` 8 章 「テスト用サンプルデータ投入」 を新設

- 3 関数の表
- 手順 (= GAS エディタの関数ドロップダウン → 実行)
- サンプルの内訳

旧 「8. 削除 / リセット」 「9. 参考リンク」 は 9 / 10 にずらす。 削除節は `clearAllRankings()` を案内する形に簡素化。

## 4. 受入基準

### Seed 関数
- [ ] GAS エディタで `seedSampleData` を選んで実行 → `ranking` シートにヘッダー 1 行 + 12 件ダミーが入る
- [ ] 既存データがあっても再実行で 12 件にリセットされる
- [ ] `appendSampleData` 実行で 12 件追記される (= 既存は保持)
- [ ] `clearAllRankings` 実行で データが消えてヘッダーだけ残る
- [ ] 投入後に `?limit=10` GET で score 降順 10 件が返る
- [ ] ゲームの 「ランキング」 で 12 件のスコアが上位順に並ぶ

### Default URL
- [ ] localStorage 未設定 + clean キャッシュで `getRankingApiUrl()` が GAS URL を返す
- [ ] ゲーム起動直後にランキングモーダルを開けば自動で fetch (= URL 入力欄は出ない)

### ドキュメント
- [ ] `RANKING_SETUP.md` 8 章にサンプル投入手順 + 関数表
- [ ] 9 章 / 10 章 にずれていることを目視確認

## 5. リスク

- **Sheet をリセットする `seedSampleData` を本番で誤実行** — ヘッダー残し全削除。 「テスト環境のみ」 で実行すること。 doc に注意書き
- **timestamp の単調減少** — 7 時間ずつ過去にずらすので 2 ヶ月分ぐらい延びる。 スコアと無関係 (= 表示は score 順)
- **Default URL embed の commit 漏れ再発** — チェックリストに追加: 「PR マージ時、 branch 上の最新 commit が main に入っているか確認」

## 6. 参考

- 既存 `tools/gas-ranking.gs` (= SPEC-035)
- `RANKING_SETUP.md` (= SPEC-035)
- 漏れた commit `00efbd9 chore(spec-035): set default ranking API URL`
- ユーザー指示: 「GAS スクリプトにヘッダーも含めて自動でサンプルデータ作る function も追加」
