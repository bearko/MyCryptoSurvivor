---
id: SPEC-169
title: Per-Sub Tactics — Each Sub Takes Its Own Orders, With One Tactic Button per Sub (Face, "SUB n", Current Order) That Opens the Four Choices for That Sub
status: Approved
pr: 245
phase: v2.0 Team
kind: Changed
---

# SPEC-169 — 作戦はサブごとに

- **Status**: Approved（作者の依頼 2026-10-24）
- **関連**: SPEC-166 §4.2.1（サブの作戦 4 つ）・SPEC-168（サブの武器は別の枠）

## 1. 作者の依頼（2026-10-24）

作戦指示はサブヒーローごとに別々に出せるようにしたい。 サブが 2 人いるときは、 作戦のボタンを 2 つ出してほしい。

## 2. 決まり

- 作戦は **サブごと** に持つ（`sub.tactic`）。 動き方（ついてこい！ / 動き回れ！ / ザコを狩れ！ / 強敵を狙え！）は SPEC-166 §4.2.1 のまま
- ゲージの下に、 **サブの数だけ作戦のボタン** を横に並べる（顔・「SUB n」・いまの作戦）。 サブが 1 人なら 1 つ
- ボタンを押すと、 そのサブの 4 つが開く（上に「SUB n への作戦」。 いまの作戦が赤）。 選ぶと閉じる。 もう一度同じボタンを押しても閉じる。 開いているボタンは赤
- 2 人とも「ザコを狩れ！」「強敵を狙え！」なら、 これまでどおり別々の敵を狙う
- **サブの枠（SUB 1 / SUB 2）ごとに覚える**（`mcs.team` の `tactics: [サブ 1, サブ 2]`）。 編成を変えても枠の作戦は残る。 前の形（`tactic` 1 つ）は 2 人ぶんに読み替える

## 3. 実装

- `js/team.js`: `loadTeam` → `{ subs, tactics }`、 `saveTeam({ tactics })` は渡した枠だけ書き換える
- `js/battle/team-battle.js`: `sub.tactic`・`setTeamTactic(tactic, i)`・`_renderTactics`（ボタンをサブの数だけ作る・開いているサブ `_menuSub`）
- `index.html`: `#tsTacticRow`（ボタンの列）・`#tsTacticsHead`。 `css/team.css`

## 4. 確かめたこと

- テスト: 保存（前の形の読み替え・片方だけ変える・編成を変えても残る・知らない作戦は無視）
- ブラウザ（`?test=1`・412×915）: ボタンが 2 つ（SUB 1 / SUB 2）。 SUB 1 を「ザコを狩れ！」、 SUB 2 を「動き回れ！」にすると、 サブ 1 は体力 25 の敵へ寄り（メインから 108px）、 サブ 2 は輪の中を歩く（163px）。 保存は `{"tactics":["weak","roam"]}`
