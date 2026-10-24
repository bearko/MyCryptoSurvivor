---
id: SPEC-174
title: Tutorial Steps — Send Story-Mode Progress (Start, Prologue, Each of the 25 Stages, Done) to the Platform's tutorialStep So the Admin KPI Screen Shows Where New Players Drop Off
status: Approved
pr: 251
phase: v2.0 Analytics
kind: Added
---

# SPEC-174 — チュートリアル（ストーリー）の段を共通基盤へ送る

- **Status**: Approved（作者の依頼 2026-10-24）
- **関連**: 共通基盤 SPEC-010（KPI とチュートリアルの離脱。 SDK 1.12.0 `tutorialStep`・管理画面の「チュートリアル」タブ）・SPEC-165（ストーリーモード）

## 1. 作者の依頼（2026-10-24）

Survivor のチュートリアル（ストーリー）でイベントを計測しているか。 していれば bearko.games/admin の KPI 分析で離脱率を見たい。 していなければ計測から。

→ していなかった（アチーブメントのストーリー全クリアだけ）。 共通基盤には段の記録（`tutorial_steps`）と画面がすでにあるので、 Survivor から `BearkoGames.tutorialStep(step, id)` を呼ぶ。

## 2. 段

| step | id | いつ |
|---|---|---|
| 0 | start | ストーリーのステージを初めて始めたとき（ふつうはプロローグ 1-0） |
| 1 | s1-0 | プロローグ（1-0）をクリア |
| 2〜25 | s1-1 … s5-4 | そのステージをクリア（遊ぶ順） |
| 26 | done | 5-5 をクリア（ストーリーを終えた） |

- 同じ段はサーバーが人ごとに最初の 1 回の時刻だけ残す（やり直し・2 周目は数えない）。 SDK もページの中で同じ段を 2 度送らない
- テスト用のサイトと `?test=1` では送らない（`isTestMode`。 共通基盤のほかの記録と同じ）。 作者・テスターの端末の分は、 共通基盤が読むときに除く
- 「始めた」を、 モード選択で「ストーリーを始める」を押したときではなくステージを始めたときにしたのは、 共通基盤の決まり（操作した人だけ数える）に合わせるため

## 3. 管理画面で見えるもの（共通基盤 SPEC-010 6.2。 変更なし）

「チュートリアル」タブでゲームに MyCryptoSurvivor を選ぶ: 段ごとの到達人数・始めた人に対する割合・前の段からの割合・始めてからの時間の中央値（いちばん落ちた段が赤）、 日ごとの始めた人数と終えた人数、 終えた人と終えなかった人の RR1・RR7。

- 記録は、 この版を出したあとに遊んだ分から（それより前の進みは端末の中だけにあり、 送れない）。 すでにストーリーを進めた人が続きを遊ぶと、 その段から記録が始まる（0 が無い人は漏斗の「始めた」の期間に入らない）

## 4. 実装

- `js/story.js`: `tutorialStepOf(storyId)`（純関数）
- `js/platform.js`: `reportTutorialStep(t)`（`_sdkSend()?.tutorialStep`）
- `js/battle/index.js`: ストーリーのステージを始めたとき 0
- `js/battle/stage-transition.js`: ストーリーのステージをクリアしたとき（`_storyClear`）

## 5. 確かめたこと

- テスト: 段の番号と id（26 段・共通基盤が受け付ける形）・送るところ
- ブラウザ（本番のドメインと共通基盤の SDK を手元のファイルで再現）: ストーリーに入ると `{"game":"survivor","step":0,"id":"start"}`、 プロローグのゴールに着くと `{"step":1,"id":"s1-0"}` が `/api/tutorial/step` へ送られる
