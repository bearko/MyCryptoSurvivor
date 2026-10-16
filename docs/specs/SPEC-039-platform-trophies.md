---
id: SPEC-039
title: bearko.games Platform Trophies
status: Done
pr: 48
phase: Phase 3
kind: Added
---

# SPEC-039 — bearko.games 共通基盤のトロフィー

- **Status**: Done
- **関連**: [bearko/mycryptoportfolio の SPEC-001](https://github.com/bearko/mycryptoportfolio/blob/claude/game-portfolio-page-4afqbc/docs/specs/SPEC-001-bearko-games-platform.md)（bearko.games 共通基盤。9 章トロフィー）

## 1. 背景

bearko.games 配下の全タイトルで、共通 Google ログイン・タイトル横断のトロフィー・総合スコア・RTA を始める（作者の決定 2026-10-15）。共通基盤の段階 2（トロフィー）が公開済みなので、本作も参加する。

## 2. 目標 / 非目標

- **目標**：ステージクリアで共通基盤のトロフィーを獲得できる。ログインしていなくても獲得でき、あとでログインしたときにまとめて登録される（共通基盤の仮アカウント）
- **非目標**：総合スコア・RTA（共通基盤の段階 3・4 で別 SPEC）、既存の GAS ランキング（SPEC-035）の置き換え

## 3. 仕様

### 3.1 送るトロフィー

`js/battle/stage-transition.js` の `triggerStageEndOrTransition()`（ボス撃破 or 5 分耐久でステージ終了。死亡は通らない）で、ステージ snapshot を保存した直後に送る。

| 終えたステージ | 送るトロフィー | 名前 |
|---|---|---|
| 最初のステージ（`currentStageIdx` 0） | `survivor.stage1` | スノーフォール |
| 最後のステージ（全 3 ステージクリア） | `survivor.clear` | 幻の生存者 |

- どのゲームモード・レギュレーションでも同じトロフィーを送る
- 通知（「トロフィー獲得」、未ログインなら「未登録のトロフィー n 個 — ログインして登録」）は共通基盤の SDK が画面下に出す

### 3.2 読み込み

- `index.html` で共通基盤の SDK（`https://bearko.games/sdk/v1.js`）を `defer` で読み込み、`js/main.js` より先に並べる
- `js/platform.js`（新規）：SDK への窓口。**SDK が読めない・通信に失敗しても何もしない**（`console.warn` だけ）。ゲームの進行・pauseTime には触らない

### 3.3 依存

- npm 依存・ビルドステップは増えない（SDK は作者管理の自前スクリプトを CDN 的に参照）
- localStorage は使わない（ログイン状態は共通基盤が持つ）

## 4. 受け入れ基準

- [ ] 最初のステージを終えると「スノーフォール」の通知が出る
- [ ] 全 3 ステージクリアで「幻の生存者」の通知が出る
- [ ] 未ログインで獲得したトロフィーが `https://bearko.games/me/` に「未登録」として出て、ログインすると登録される
- [ ] SDK が読めない状態でも、ステージ遷移・活動レポートまで通しで遊べる

## 5. テスト

- `node --test tests/platform.test.mjs`：ステージ → トロフィー ID の対応、SDK がない・失敗するときに例外を出さないこと
