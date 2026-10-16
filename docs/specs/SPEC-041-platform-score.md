---
id: SPEC-041
title: bearko.games Platform Total Score
status: Implementing
pr: feat/spec-041-platform-score
phase: Phase 3
kind: Added
---

# SPEC-041 — bearko.games 共通基盤の総合スコア

- **Status**: Implementing
- **関連**: [bearko/mycryptoportfolio の SPEC-002](https://github.com/bearko/mycryptoportfolio/blob/claude/game-portfolio-page-4afqbc/docs/specs/SPEC-002-total-score.md)（総合スコア。3.2 が本作の計算式）、SPEC-033（活動レポート）、SPEC-037（ゲームモード）

## 1. 背景

bearko.games の総合スコア（各タイトルの自己ベストの合計）に参加する。計算は共通基盤のサーバーが行い、本作は 1 回の挑戦の成績を送るだけ。

## 2. 仕様

### 2.1 送るとき

| とき | 場所 | `stagesCleared` | `cleared` |
|---|---|---|---|
| 全 3 ステージクリア（活動レポート） | `js/battle/activity-report.js` の `triggerActivityReport` | 3 | true |
| 倒れた | `js/battle/gameover.js` の `triggerGameOver`（`"clear"` 以外） | 終えたステージの数 | false |
| メニューの「タイトルに戻る」 | `js/menu.js`（まだ送っていない挑戦だけ） | 終えたステージの数 | false |

- ステージを 1 つも終えていなければ送らない（点が 0 のため）
- 1 回の挑戦で送るのは 1 回だけ（`state.run.scoreSent`。ステージ 1 の開始で false に戻す）
- 通知（自己ベスト更新・総合スコア・未ログインなら「ログインして登録」）は共通基盤の SDK が出す

### 2.2 送る成績（`scoreMetrics`）

`stagesCleared`、`cleared`、`reportScore`（活動レポートのスコア。倍率の前。全クリアのときだけ）、`regulationMul`、`regulation`・`absolute`（将来の難易度ごとのレギュレーション用。今は点に効かない）

点は共通基盤が決める：節目（ステージ 1 ＝ 1,000 ／ 2 ＝ 3,000 ／ 全クリア ＝ 5,000）＋ 全クリアなら `reportScore × regulationMul ÷ 30`。

### 2.3 あわせて直すこと

- ゲームオーバーからの再走（`applyRetry`）で `state.run`（全ステージ通しの記録）が空にならず、前の挑戦のステージが残っていた。ステージ 1 の開始（`startBattle`、stage idx 0）で空にする

## 3. 受け入れ基準

- [ ] 全クリアで「タイトルスコア 自己ベスト」の通知が出て、`https://bearko.games/score/` に載る（ログイン時）
- [ ] ステージ 2 で倒れると 3,000 点が送られる
- [ ] ゲームオーバーから再走しても、活動レポートのステージ一覧が前の挑戦と混ざらない
- [ ] SDK が読めない状態でも今までどおり遊べる

## 4. テスト

- `node --test tests/platform.test.mjs`：送る成績の形、ステージを終えていなければ送らないこと、SDK がなくても例外を出さないこと
