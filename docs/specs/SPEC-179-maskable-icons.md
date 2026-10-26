---
id: SPEC-179
title: Maskable App Icons — Separate Full-Bleed Icons With the Art Inside the Safe Zone So Round, Rounded-Square and Squircle Home-Screen Masks Never Show a White Frame or Clip the Art
status: Approved
pr: TBD
phase: v2.0 Retention
kind: Fixed
---

# SPEC-179 — ホーム画面のアイコン（丸型・角丸に合わせる）

- **Status**: Approved（作者の依頼 2026-10-26）
- **関連**: SPEC-047（アイコンと manifest）・SPEC-178（ホーム画面に追加の案内）

## 1. 作者の依頼

アプリとして追加したとき、 背景に白枠ができないように、 丸型や四角型に対応したアイコンにする。

## 2. いまの状態と直すところ

- `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` は背景まで塗った不透明な絵（透明なところが無い）。 iOS は角を丸めるだけなので、 白枠は出ない（そのまま）
- Android は端末の形（丸・角丸・スクワークル）で切り抜く。 切り抜き用（`purpose: maskable`）が無いと、 小さく縮めて白い丸の上に置かれる（= 白枠）
- いまは `icon-512.png` を「ふつう」と「切り抜き用」の両方に使っていて、 192 には切り抜き用が無い。 絵の丸は半径 39% で、 切り抜いても残る範囲（安全域、 半径 40%）ぎりぎり。 光の輪は切れる

→ 切り抜き用を別に作る（`icon-maskable-192.png` / `icon-maskable-512.png`）

- 背景は元の絵の外側と同じ紫のグラデーションで、 端まで塗る（= どの形で切っても白が出ない）
- 絵は 0.8 倍にして真ん中へ（絵の丸は半径 31%、 光の輪まで安全域の内側）
- manifest は「ふつう」2 枚と「切り抜き用」2 枚に分ける

## 3. 確かめたこと

丸・角丸・スクワークルで切り抜いた見本を作り、 絵が欠けず、 背景に白が出ないことを見た。
