---
id: SPEC-124
title: Closing Hero Select Without Picking Returns to Mode Select (Was Stuck on an Empty Battle Screen)
status: Done
pr: TBD
phase: v1.6 Fix
kind: Fixed
---

# SPEC-124 — ヒーロー選択を ✕ で閉じると進めなくなる不具合

- **Status**: Done

## 1. 作者の報告（2026-10-20）

ヒーロー選択画面で右上の ✕ を押して閉じると、ヒーローを選ばないままバトル画面に移り、進めなくなる。

## 2. 原因

モード選択からヒーロー選択へ進むとき、後ろの戦闘の画面（`#app`）を先に出している。✕・背景のタップ・Esc はヒーロー選択の窓を閉じるだけだったので、ヒーローなしの戦闘の画面が残っていた。

## 3. 直したこと

- ヒーローを選ばずに閉じたとき（✕・背景・Esc）は、ワイプで覆って戦闘の画面を隠し、**モード選択へ戻す**（`cancelHeroSelect`）
- ヒーローを選んで「出撃」したときは、いままでどおり戦闘へ

## 4. 確かめたこと

- ブラウザで ✕・Esc・背景のタップのそれぞれで、モード選択に戻り、戦闘の画面が隠れる。そこからもう一度ヒーローを選ぶと戦闘が始まる
- `node --test tests/*.test.mjs`：すべて通る
