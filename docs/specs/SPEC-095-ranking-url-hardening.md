---
id: SPEC-095
title: Ranking API URL Hardening — GAS Web App Only, No Hash Override
status: Done
pr: 125
phase: v1.4 Meta
kind: Security
---

# SPEC-095 — ランキングの送り先を Google Apps Script のウェブアプリだけに

- **Status**: Done
- **関連**: SPEC-035 / SPEC-038（旧ランキング）・SPEC-052

## 1. 背景

作者の依頼（2026-10-18）でセキュリティを見直した。 `#api=<base64>` 付きのリンクを開くと、 確かめずに送り先（localStorage）を書き換えて残していた。
他人が作ったリンクを踏むだけで、 以後のプレイヤー名とスコアが知らないサーバーへ送られ、 偽のランキングも見せられる。

## 2. 仕様

- `#api=` のリンクで送り先を書き換える機能をやめる（既定の送り先はコードに入っているので要らない）
- 送り先として受け付けるのは `https://script.google.com/macros/s/<id>/exec` の形だけ（`isRankingApiUrl`）。 設定の欄で手で入れるときも、 以前に保存されたものを読むときも同じ（合わなければ既定を使う）
- GAS のサンプル（`docs/setup/google-apps-script.md`）：`= + - @` で始まる名前はシートで数式として動くので、 先頭に `'` を付けて保存する。 **デプロイ済みの GAS には作者が手で反映する**

## 3. 非ゴール

- 共通基盤のランキング（bearko.games）は別（共通基盤のセキュリティの見直しで直した）
