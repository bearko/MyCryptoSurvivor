---
id: SPEC-048
title: bearko.games Platform RTA — ABSOLUTE ×2.0
status: Done
pr: 66
phase: Phase 3
kind: Added
---

# SPEC-048 — bearko.games 共通基盤の RTA：ABSOLUTE ×2.0（全 3 ステージ）

- **Status**: Done
- **関連**: SPEC-040（RTA。NORMAL のレギュレーション `survivor-normal`）、SPEC-037（ABSOLUTE）、SPEC-041（総合スコア）、[bearko/mycryptoportfolio の SPEC-001 6.12](https://github.com/bearko/mycryptoportfolio/blob/claude/game-portfolio-page-4afqbc/docs/specs/SPEC-001-bearko-games-platform.md)（レギュレーション `survivor-absolute-2x`）・SPEC-002 3.2（総合スコア v2）

## 1. 背景

SPEC-040 の RTA は NORMAL だけで、ABSOLUTE は非目標にしていた。ABSOLUTE は 4 軸を 0.5〜5.0 で自由に決められるので、そのままでは同じ条件で比べられない。そこで、**4 軸すべてを ×2.0 に固定したレギュレーションを 1 本**足す（作者の決定 2026-10-17：まず 1 本。走る人が増えたら段階を足す）。

×2.0 にした理由：敵の速さは ×2.0 で 160、×3.0 で 240 になる。ヒーローの移動の速さは 165〜223 なので、×3.0 ではどのヒーローも逃げきれない（自動プレイでは ×3.0 で 4 秒で倒れた）。×2.0 は、まだ逃げきれる上限。

## 2. 目標 / 非目標

- **目標**：モード選択の RTA の card から「ABSOLUTE ×2.0 で RTA」で始め、全 3 ステージクリアまでの時間を `survivor-absolute-2x` で計る
- **非目標**：×2.0 以外の段階（×1.5・×3.0 など）、スライダーで決めた ABSOLUTE での計測、ボスの出方の変更（SPEC-049 で提案）

## 3. 仕様

### 3.1 始め方

- RTA の card（SPEC-040）に 2 本目のボタン「ABSOLUTE ×2.0 で RTA」と、そのランキングへのリンク（`https://bearko.games/rta/?regulation=survivor-absolute-2x`）を足す。card の右上は「NORMAL ・ ABS ×2.0」
- 押すと `state.regulation = "ABSOLUTE"`、`state.absolute` は 4 軸すべて 2.0、`state.rtaMode = true`。ABSOLUTE の card のスライダーの値は使わない（変えもしない）
- ゲームオーバーからの「今のレギュレーションで再走」は、同じルールのまま計測をやり直す（SPEC-040 と同じ）

### 3.2 計測

- レギュレーションは今のルールから決める：`rtaRegulationFor(regulation, absolute)`（`js/platform.js`。純関数）
  - NORMAL → `survivor-normal`
  - ABSOLUTE で 4 軸すべて 2.0 → `survivor-absolute-2x`
  - それ以外 → `null`（計測しない）
- `startBattle`（ステージ 1）で `startRtaRun(regulation)` を呼ぶ。区切り（`stage1` / `stage2` / `clear`）・IGT・中断は SPEC-040 と同じ
- 最短時間は `survivor-normal` と同じ（ABSOLUTE の倍率はボスに効かず、ボスはゲーム内の 4 分で出るため）

### 3.3 総合スコア

送る成績は変わらない（`regulationMul` は 2.0）。共通基盤の計算式 v2 で、総合スコアに効く倍率の上限が 2.0 になった（SPEC-002 3.2。ABSOLUTE は最大 ×5.0 で、出現数の軸で撃破数も増えるため）。

### 3.4 依存

- npm 依存・ビルドステップは増えない。localStorage は使わない
- 共通基盤（bearko/mycryptoportfolio #35）を先にマージする（レギュレーションを API が知らないと 400 になる）

## 4. 受け入れ基準

- [x] RTA の card に「ABSOLUTE ×2.0 で RTA」とランキングへのリンクが出る（SDK が読めないときは card ごと出ない）
- [x] 押してヒーローを選ぶと、`survivor-absolute-2x` で計測が始まる（ローカルの共通基盤で確認）
- [ ] 全 3 ステージクリアで公式タイムの通知が出て、`https://bearko.games/rta/?regulation=survivor-absolute-2x` に載る（本番で作者が確認）
- [x] NORMAL の RTA・NORMAL・ABSOLUTE（スライダー）は今までどおり

## 5. テスト

- `node --test tests/platform.test.mjs`：ルール → レギュレーション ID（NORMAL・ABSOLUTE ×2.0・それ以外は null）、`startRtaRun` が渡したレギュレーションで始めること
