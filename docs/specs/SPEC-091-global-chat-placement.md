---
id: SPEC-091
title: Global Chat Placement — Show on Title and Results, Hide During Battle (Platform SPEC-004)
status: Done
pr: TBD
phase: v1.4 Meta
kind: Added
---

# SPEC-091 — 全体チャットの置き場所：タイトルと結果の画面で出し、戦闘中は隠す

- **Status**: Done
- **関連**: 共通基盤 SPEC-004（全体チャット。 部屋・API・SDK 1.6.0 は MyCryptoPortfolio #49）・SPEC-039（共通基盤への窓口）・SPEC-052（通知を上に）・SPEC-059（マインちゃんの帯）

## 1. 背景

作者の依頼（2026-10-17）：ログインユーザー間の全体チャットを全タイトルに。 窓そのものは共通基盤の SDK（`BearkoGames.chat`）が描くので、 ゲーム側で決めるのは **どの画面で出すか** と **どの隅に置くか** だけ。 共通基盤 SPEC-004 6 章の表で Survivor は「タイトル・難易度・ヒーロー選択・結果で出す。 戦闘中は隠す。 右上」。

## 2. 仕様

### 2.1 位置（`js/platform.js` の `initPlatform`）

- `init({ chat: { position: "top-right", offset: { x: 12, y: 12 } } })`。 下はマインちゃんの帯（SPEC-059）と通知（SPEC-052 で上に寄せたが、 結果の画面では下にボタンが並ぶ）が使うので **右上**
- タイトルの右上には何も置いていない（言語の切り替えは画面の真ん中の下）

### 2.2 出す・隠す（`setChatVisible(on)`）

| とき | どこから | 💬 |
|---|---|---|
| 読み込み（スプラッシュ・「タップしてはじめる」） | `initPlatform` の `init` のあと | 隠す |
| タイトルに入った | `main.js` の `enterTitle` | 出す |
| 戦闘が始まった（再走も） | `battle/index.js` の `startBattle` | 隠す |
| ゲームオーバー | `battle/gameover.js` の `triggerGameOver` | 出す |
| 全クリアの活動レポート | `battle/activity-report.js` の `triggerActivityReport` | 出す |
| タイトルに戻った | `gameover.js` の `returnToTitle`・`menu.js` の「タイトルに戻る」 | 出す |

- 難易度・ヒーロー選択はタイトルの続きなので、 そのまま出ている
- ステージの切り替え（`stageTransitionModal`）・レベルアップ・メニューは **戦闘の途中** なので隠れたまま
- `setChatVisible` は SDK がない・古い（`chat` が無い）・失敗したときに何もしない（SPEC-039 の作法。 `console.warn` だけ）

## 3. 非ゴール

- 窓の見た目・発言の決まり（200 文字・連投の上限・締め出し）は共通基盤 SPEC-004
- 戦闘中に読む手段は作らない（アクションの最中に窓が出ると邪魔）

## 4. 受け入れ基準

- [x] タイトル・難易度・ヒーロー選択・結果の画面に右上の 💬 が出る
- [x] 戦闘が始まると消え、 ゲームオーバー・活動レポート・タイトルに戻ると戻る
- [x] SDK が読めない（ローカルで開いた・通信できない）ときも例外が出ない

## 5. テスト

- `node --test tests/platform.test.mjs`：`setChatVisible` が SDK の有無・新旧・失敗で例外を出さないこと、 `init` に `top-right` を渡して読み込み中は隠すこと
- 通しの確認：`window.BearkoGames` を偽物にして、 タイトル → 戦闘 → ゲームオーバー → タイトルで `setVisible` が true / false / true / true の順に呼ばれること
