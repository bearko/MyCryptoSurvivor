---
id: SPEC-052
title: Result Screen — Toasts on Top, Back to Title / Portal, Player Name from bearko.games
status: Done
pr: 77
phase: Phase 3
kind: Changed
---

# SPEC-052 — 結果画面：通知を上に・タイトル／ポータルに戻る・名前の既定

- **Status**: Done
- **関連**:
  - SPEC-033（活動レポート）・SPEC-037（ゲームオーバーの 2 択）・SPEC-038（名前の既定 "anonymous"）
  - SPEC-039〜041（共通基盤）
  - bearko/MyCryptoPortfolio の SPEC-001 5 章（SDK 1.5.0 `setToastPosition`。#43）

## 1. 背景（作者の指摘 2026-10-17）

- 全クリアのとき、共通基盤の通知（トロフィー・RTA 記録・自己ベスト）が画面の下に出て、「リトライ」などのボタンに重なり押せない
- 活動レポートには「リトライ」しかなく、タイトルに戻れない。RTA で走ったあと、ポータル（bearko.games）に戻る道もない
- ランキングの名前の既定が "anonymous"。Google アカウントや bearko.games で決めた名前を使いたい

## 2. 仕様

### 2.1 通知を画面の上に

- 起動時の `BearkoGames.init` に `toast: "top"` を渡す（SDK 1.5.0。古い SDK は無視する）
- ステージを始めるたびに `setToastPosition({ position: "top", offset })` を呼ぶ。offset は HUD の下（RTA なら、経過時間の表示のさらに下）
- 結果画面のボタンは画面の下のほうにあるので、通知とは重ならない

### 2.2 戻るボタン

| 画面 | ボタン |
|---|---|
| 活動レポート（全クリア） | 「リトライ」・**「タイトルに戻る」**（新規）・**「bearko.games に戻る」**（新規。RTA のときだけ） |
| ゲームオーバー | 「タイトルに戻る」・「今のレギュレーションで再走」・**「bearko.games に戻る」**（新規。RTA のときだけ） |

- 「タイトルに戻る」は、ゲームオーバーの処理（`returnToTitle`）を共通にして使う
- 「bearko.games に戻る」は `https://bearko.games/` へのリンク（同じタブ）

### 2.3 ランキングの名前の既定

順に見て、最初に見つかったものを入れる（`defaultPlayerName`。純関数）。

1. ログイン中の bearko.games の名前（`BearkoGames.getUser().name`。bearko.games のマイページで決めた表示名）
2. 前にこの端末で送った名前（localStorage）
3. 空（入力欄に「名前を入れる」と薄く出す。空のまま送ろうとすると「名前を入れてください」）

- **"anonymous" は既定にしない**（SPEC-038 を改める）。前に "anonymous" で送った人も、空から始まる
- **Google アカウントの名前は使えない**：共通基盤は Google の名前を保存しない（SPEC-001 4.4。個人情報を減らすため）。名前を入れたいときは、bearko.games のマイページで表示名を決める

## 3. 受け入れ基準

- [x] 全クリアで通知が出ても、「リトライ」「タイトルに戻る」が押せる（通知は画面の上）
- [x] 活動レポートの「タイトルに戻る」でタイトル画面に戻る
- [x] RTA のときだけ「bearko.games に戻る」が出る
- [x] bearko.games で表示名を決めてログインしていると、名前の欄にその名前が入る。していなければ空（"anonymous" ではない）
- [x] SDK が読めないときも、今までどおり遊べる（ボタンは出る。名前は前に送った名前か空）

## 4. テスト

- `node --test tests/platform.test.mjs`：名前の既定の順番と "anonymous" を空にすること、SDK がない・古い・失敗するときに例外を出さないこと
- ローカルの共通基盤（bearko/MyCryptoPortfolio の `tools/e2e/server.mjs`）とブラウザで、活動レポートの通知とボタンの位置、名前、タイトルに戻ることを確かめる
