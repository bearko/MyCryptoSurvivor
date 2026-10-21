---
id: SPEC-161
title: The Skill Tree Opened From the Stage-Clear Screen Gets a "Next Node" Button in the Same Spot as "Revive", Going Straight to the Next Stage Without Returning to the Stage-Clear Screen
status: Done
pr: TBD
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-161 — ステージクリアから開いた木に「次のノードに挑む」

- **Status**: Done
- **関連**: SPEC-132（ステージクリアから木へ）・SPEC-146（木から「復活する」）・SPEC-154（根を取ってあればステージ 1 のクリアからも）

## 1. 作者の指摘（2026-10-21）

ステージクリアからスキルツリーに入ったとき、 REVIVE から入ったときの「復活する」と**同じ位置に「次のノードに挑む」**を置いてほしい。 逐一元の画面に戻らなくても直接進めるように。

## 2. 直したこと

| # | 中身 |
|---|---|
| 1 | `openSkillTree({ next: true })`（ステージクリアの「スキルツリーへ」から）。 木の右下（広い画面は右の列の手前、 狭い画面は左下のボタンの上 ＝ `.tree-retry` と同じ場所・同じ見た目）に **「次のノードに挑む ▶」**（`.tree-retry.tree-next`） |
| 2 | 押すと `nextFromTree()`: 木を閉じ、 ステージクリアの画面には戻さず（隠れたまま）、 `proceedToNextStage()`（＝「次のステージへ」のボタンと同じ処理: 紙吹雪と X の投稿の窓を片づけ、 ステージを 1 つ進めて `startBattle`） |
| 3 | 「戻る」は従来どおりステージクリアの画面へ（そこから「次のステージへ」も押せる） |
| 4 | `_onProceedClick` を `proceedToNextStage` の export に（1 か所の処理を 2 つの入口から呼ぶ） |

## 3. 作者に見てほしいところ

1. ボタンの文言「次のノードに挑む」（英語 "Next node"）。
2. 全クリアの画面（活動レポート）から開いた木には置いていない（次のステージが無い）。 タイトルからも無し。

## 4. 確かめ方

- `node --test tests/*.test.mjs`。
- ブラウザ（EASY・根あり）: ステージ 1 クリア → 「スキルツリーへ」→ 右下に「次のノードに挑む ▶」→ 押すとステージ 2 の戦闘が始まり、 ステージクリアの画面も木も出ていない。
