---
id: SPEC-073
title: Panjandrum Spins While Rolling Toward Enemies
status: Done
pr: TBD
phase: v1.2 Battle
kind: Changed
---

# SPEC-073 — パンジャンドラムは回りながら敵に向かう

- **Status**: Done
- **関連**: SPEC-015（弾の絵）・SPEC-031（パンジャンドラムの貫通）

## 1. 背景

作者の依頼（2026-10-17）：パンジャンドラムは回転しながら敵に向かってほしい。

いまの弾（`bigHoming`）は、ほかの弾と同じく進む向きを向いたまま動くので、輪が滑っているように見える。

## 2. 仕様（`js/battle/archetypes.js`・`js/battle/projectiles.js`・`js/battle/render.js`・`js/constants.js`）

- パンジャンドラムの弾に回る速さ `spin` を持たせる（`PANJANDRUM_SPIN_RAD_S` = 10 rad/s、1 秒に約 1.6 回転）
- 毎コマ、転がるように回す（`spinStep`）：右へ進むときは時計回り、左へ進むときは反時計回り（真上・真下は時計回り）
- 回る弾は、進む向きではなく回った角度で描く。ほかの弾はいままでどおり進む向きを向く
- 当たり・速さ・追尾・貫通は変えない（見た目だけ）

## 3. 非ゴール

- ほかの武器の弾は回さない

## 4. 受け入れ基準

- [x] パンジャンドラムの弾が回りながら敵に向かう
- [x] ほかの弾の向きは変わらない

## 5. テスト

- `node --test tests/panjandrum.test.mjs`
  - 右へは時計回り・左へは反時計回り・回らない弾は角度が変わらない
  - パンジャンドラムの弾は回り、ほかの追尾弾は回らない
- ヘッドレス Chromium（390×844）で、許褚（最初の武器がパンジャンドラム）の弾を 70ms ごとに撮った
  - 弾の角度が 1 コマに約 0.7 rad ずつ変わり、絵が回っている
  - ページのエラーなし
