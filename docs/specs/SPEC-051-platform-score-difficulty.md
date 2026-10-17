---
id: SPEC-051
title: bearko.games Platform score — send the difficulty name, not the multiplier
status: Done
pr: 76
phase: Phase 3
kind: Changed
---

# SPEC-051 — 総合スコアに送る難易度を「名前と設定」にする

- **Status**: Done
- **関連**: SPEC-041（総合スコア）、SPEC-037（ABSOLUTE）、[bearko/MyCryptoPortfolio#27](https://github.com/bearko/MyCryptoPortfolio/issues/27)、共通基盤の SPEC-002 3.2（計算式 v3）・5.1

## 1. 背景

いまは総合スコアの成績に、ゲームが計算した倍率（`regulationMul`。ABSOLUTE の 4 軸の平均）を入れて送っている。難易度の係数がタイトルごとにばらばら（ゲームが掛ける・共通基盤が掛ける）なので、作者の決定（2026-10-17、#27）で「**ゲームは難易度の名前だけを送り、係数は共通基盤で決める**」にそろえる。共通基盤は計算式 v3 で、名前と 4 軸から係数を計算するようになった（点は同じ）。

## 2. 目標 / 非目標

- **目標**：送る成績を `difficulty`（`normal` / `absolute`）と、ABSOLUTE のときの 4 軸（`absolute`）にする。`regulationMul` は送らない
- **非目標**：ゲーム内の活動レポート・ランキング（GAS）の倍率と点。どちらも今のまま

## 3. 仕様

`js/platform.js` の `scoreMetrics({ run, cleared, reportScore, regulation, absolute })` が作る形：

| 項目 | 中身 |
|---|---|
| `stagesCleared` | クリアしたステージの数（0〜3。今のまま） |
| `cleared` | 全ステージクリアか（今のまま） |
| `reportScore` | 全クリアのときの活動レポートのスコア（倍率の前。今のまま） |
| `difficulty` | `"normal"` か `"absolute"`（`state.regulation` を小文字に） |
| `absolute` | ABSOLUTE のときだけ `{ spawnMul, hpMul, dmgMul, speedMul }`。NORMAL では入れない |

- 係数（NORMAL 1.0、ABSOLUTE は 4 軸の平均・上限 2.0）は共通基盤が決める。ゲームは計算しない
- 呼ぶ場所（全クリア・倒れた・タイトルに戻った）は今のまま。全クリアの呼び出しから `regulationMul` を外す
- npm 依存・localStorage のキーは増えない

## 4. 受け入れ基準

- [ ] NORMAL で送る成績が `{ stagesCleared, cleared, reportScore, difficulty: "normal" }`
- [ ] ABSOLUTE で送る成績に 4 軸が入り、`regulationMul` は入らない
- [ ] 共通基盤での点が今と同じ（NORMAL の全クリア 150,000 → 10,000、ABSOLUTE ×2.0 → 15,000）

## 5. テスト

- `node --test tests/*.test.mjs`：`scoreMetrics` の形（NORMAL・ABSOLUTE）
