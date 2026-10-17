---
id: SPEC-050
title: bearko.games Platform — link to the overall ranking
status: Done
pr: 74
phase: Phase 3
kind: Added
---

# SPEC-050 — bearko.games の総合ランキングへの導線

- **Status**: Done
- **関連**: SPEC-035（ランキング）、SPEC-041（総合スコア）、[bearko/MyCryptoPortfolio#29](https://github.com/bearko/MyCryptoPortfolio/issues/29)、共通基盤の SPEC-001 3 章（既存のランキングは当面残す）

## 1. 背景

本作には前からのランキング（GAS。SPEC-035）があり、bearko.games 共通基盤にも総合スコアのランキングがある。遊ぶ人には 2 つあるように見える（MyCryptoPortfolio#29）。

## 2. 目標 / 非目標

- **目標**：ランキングのモーダルから、bearko.games の総合ランキング（本作のタブ）へ行けるようにし、2 つが別のものだと分かるようにする
- **非目標**：前からのランキング（GAS）をなくす・寄せること（ゆくゆくの課題）

## 3. 仕様

- ランキングのモーダル（`#rankingModal`）のメッセージ（`#rankingMsg`）の下に、リンク「bearko.games の総合ランキング ↗」（`#rankingPlatformLink`）と添え書き「このランキングとは別の、bearko.games のタイトル共通のランキングです」（`#rankingPlatformNote`）を置く
- 行き先は `https://bearko.games/score/?game=survivor`（共通基盤のタイトル別ランキング。総合のタブにも切り替えられる）
- **新しいタブで開く**（`target="_blank" rel="noopener"`）。遊んでいる途中の画面を失わないため
- 文言は `data/i18n/ui.json`（`ranking.platform` / `ranking.platformNote`、ja / en）。言語の切り替えは `_renderShell` で差し替える（モーダルのほかの文言と同じ）
- npm 依存・localStorage のキーは増えない

## 4. 受け入れ基準

- [ ] タイトル・一時停止メニュー・活動レポートから開いたランキングに、リンクと添え書きが出る
- [ ] リンクを押すと、新しいタブで bearko.games の Survivor のランキングが開く
- [ ] 英語表示で英語の文言になる

## 5. テスト

- `node --test tests/*.test.mjs`
- ブラウザ：`#rankingModal` を開き、リンク先・新しいタブ・文言（ja / en）を見る
