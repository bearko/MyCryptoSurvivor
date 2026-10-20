---
id: SPEC-129
title: Fix Stage 3 Freeze When the Trojan Horse Appears; Keep the Battle Loop Alive Through a Frame Error
status: Done
pr: 164
phase: v1.6 Fix
kind: Fixed
---

# SPEC-129 — ステージ 3 の途中で止まり、やり直すと真っ暗になる不具合

- **Status**: Done

## 1. 作者の報告（2026-10-20）

- ステージ 3 の途中（1:10 ごろ）でフリーズした。UI は反応するが、バトル画面が動かない
- 「ステージを最初からやり直す」を選んだら真っ暗になった

## 2. 原因

1. **トロイの木馬（ステージ 3 の仕掛け）が出る瞬間に例外**。`js/battle/gimmicks.js` が `pushDamageNumber` を import していなかった（v1.4・SPEC-090c で被弾の処理を `hurt.js` へまとめたとき、import ごと消えた）。木馬が出る・開く・壊れるときに「TROJAN!」の文字を出そうとして `ReferenceError` になる。v1.4 からずっと、ステージ 3 は木馬が出たところで止まっていた
2. **例外 1 回で戦闘のループが止まったまま**。`_loop` は最後に次のコマを頼んでいたので、途中で例外が出ると次のコマが来ない。しかも `_raf` に古い番号が残るので、やり直しの `startBattle` は「もう動いている」と思って頼み直さない → 真っ暗

## 3. 直したこと

- `gimmicks.js` に `pushDamageNumber` の import を戻した
- `_loop` は**最初に**次のコマを頼み、中身（`_frame`）を try/catch で包む。1 コマで例外が出ても、次のコマは動く（エラーはコンソールに 5 回まで出す）
- テスト `tests/missing-imports.test.mjs`：`js/` の中で export されている関数を、import も宣言もせずに呼んでいるファイルが無いかを調べる（直す前のコードで、この不具合を見つけられることを確かめた）

## 4. 確かめたこと

- ブラウザで、ステージ 3・霧隠才蔵・固有スキル Lv.15 で 2 分以上通した。木馬が何度出ても止まらない（直す前は 1:00 で `pushDamageNumber is not defined` で止まった）
- わざと 1 コマごとに例外が出る状態を 0.8 秒作って戻すと、戦闘の時計がまた進む（ループが生きている）
- `node --test tests/*.test.mjs`：316 件すべて通る
