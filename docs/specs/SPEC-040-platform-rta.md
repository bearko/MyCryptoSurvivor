---
id: SPEC-040
title: bearko.games Platform RTA
status: Done
pr: 49
phase: Phase 3
kind: Added
---

# SPEC-040 — bearko.games 共通基盤の RTA（全 3 ステージ）

- **Status**: Done
- **関連**: [bearko/mycryptoportfolio の SPEC-001](https://github.com/bearko/mycryptoportfolio/blob/claude/game-portfolio-page-4afqbc/docs/specs/SPEC-001-bearko-games-platform.md)（bearko.games 共通基盤。6 章 RTA、6.7 が本作のレギュレーション）、SPEC-037（ゲームモード）、SPEC-039（トロフィー）

## 1. 背景

共通基盤の段階 4（RTA）を、最初に本作の「全 3 ステージ」で始める（作者の決定 2026-10-16：1 回が約 15 分と短く、試しやすい）。RTA は「RTA で始める」を選んだときだけ計測する。

## 2. 目標 / 非目標

- **目標**：モード選択画面の「RTA で始める」から、ステージ 1 の開始から全 3 ステージクリアまでの時間を計る。結果は bearko.games の RTA ランキングに載る（ログインしていなければ、あとでログインしたときに載る）
- **非目標**：本作の GAS ランキング（SPEC-035）の置き換え、複数タイトルをまたぐレギュレーション（共通基盤の次の段階）、ABSOLUTE での RTA

## 3. 仕様

### 3.1 始め方

- モード選択画面（SPEC-037）に 3 枚目の card「RTA」を足す。ボタンは「RTA で始める」。共通基盤の RTA ランキングへのリンクも置く
- 共通基盤の SDK が読めないとき（ローカルで開いたときなど）は、この card を出さない
- 「RTA で始める」は NORMAL のルール（4 軸 1.0×）で進み、`state.rtaMode = true` にする。NORMAL・ABSOLUTE を選んだら `false`

### 3.2 計測（SDK `BearkoGames.rta`）

| とき | 呼ぶもの | 場所 |
|---|---|---|
| ステージ 1 の開始（ヒーロー選択のあと・再走） | `rta.start({ regulation: "survivor-normal" })` | `js/battle/index.js` の `startBattle`（`rtaMode` かつ stage idx 0） |
| ステージを終えた（ボス撃破 or 5 分耐久） | `rta.checkpoint("stage1" / "stage2" / "clear", { igtMs })` | `js/battle/stage-transition.js` の `triggerStageEndOrTransition`（トロフィーの直後） |
| 倒れた・タイトルに戻った | `rta.abort()` | `js/battle/gameover.js`（`"clear"` 以外）、`js/menu.js` の「タイトルに戻る」 |

- 公式タイムは共通基盤のサーバーが決める（受信時刻の差）。ステージの合間の画面・レベルアップの選択の時間も含む（実時間）
- `igtMs` は `state.run.totalElapsedMs`（各ステージのゲーム内時間の合計）
- 計測中の経過時間（目安）・区間タイム・結果の通知・15 分以上操作がないときの参考記録の扱いは、SDK と共通基盤が受け持つ
- `js/platform.js` の関数は、SDK が読めない・通信に失敗しても何もしない（`console.warn` だけ）。ゲームの進行・pauseTime には触らない

### 3.3 依存

- npm 依存・ビルドステップは増えない。localStorage は使わない

## 4. 受け入れ基準

- [ ] モード選択画面に「RTA」の card が出て、「RTA で始める」で NORMAL のルールで始まる
- [ ] ステージ 1 が始まると、画面の上に RTA の経過時間が出る
- [ ] ステージを終えるたびに区間タイムの通知が出て、全 3 ステージクリアで公式タイムの通知が出る
- [ ] 倒れて再走すると、計測が最初からやり直しになる
- [ ] 記録が `https://bearko.games/rta/` のランキング（ログイン時）と `https://bearko.games/me/` に出る
- [ ] SDK が読めない状態では RTA の card が出ず、NORMAL・ABSOLUTE は今までどおり遊べる

## 5. テスト

- `node --test tests/platform.test.mjs`：ステージ → 区切り ID の対応、計測中だけ区切り・中断を送ること、SDK がない・失敗するときに例外を出さないこと
