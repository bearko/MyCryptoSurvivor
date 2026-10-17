---
id: SPEC-092
title: Shared Player Avatar — Entry in Settings (Platform SPEC-005)
status: Done
pr: TBD
phase: v1.4 Meta
kind: Added
---

# SPEC-092 — bearko.games 共通のアイコンへの入口（設定の行）

- **Status**: Done
- **関連**: 共通基盤 SPEC-005（チャット 2.0。アイコンの選ぶ窓は SDK 1.7.0）・SPEC-091（全体チャットの置き場所）・SPEC-058（設定）

## 1. 背景

bearko.games のプレイヤーアイコン（チャットに出る絵）は全タイトルで共通になった（共通基盤 SPEC-005 5.3）。
作者の依頼（2026-10-17）：ポータルでも各タイトルのマイページでも変えられるようにし、 ほかのゲームにも効くことを伝える。
選ぶ窓そのものは SDK が持つ（`BearkoGames.openAvatarPicker()`。 窓の中に「bearko.games 全体のアイコンが変わります」と出る）。

## 2. 仕様

- 設定（SPEC-058）に行「🙂 アイコン」を足す。 注記「bearko.games 全体（すべてのゲームとチャット）で同じ絵になる」、 ボタン「変える」→ SDK の窓
- SDK が読めていない・古い（`openAvatarPicker` が無い）ときは行ごと出さない（`platform.canPickAvatar`）。 例外も出さない（SPEC-039 の作法）
- 絵の一覧・保存は SDK と共通基盤が持つ。 このゲームは何も持たない（セーブにも入れない）
- 文言は `data/i18n/ui.json`（JP / EN）

## 3. 非ゴール

- ゲーム内の絵（ヒーロー選択など）をこのアイコンに合わせることはしない

## 4. テスト

- `node --test tests/*.test.mjs`：`canPickAvatar` / `openAvatarPicker` が SDK の有無・新旧で例外を出さない
- 手で：設定を開いて「変える」→ 窓が出て、 選ぶとチャットの発言に絵が付く
