---
id: SPEC-142
title: Resume With "Ready → Go!" Instead of a 3-2-1 Countdown (0.8 s Pause, Go! Shown While Playing)
status: Done
pr: 180
phase: v1.6 Battle
kind: Changed
---

# SPEC-142 — 再開は「Ready → Go!」に

- **Status**: Done
- **関連**: SPEC-104（再開の 3 秒カウントダウン）

## 1. 作者の依頼（2026-10-21）

再開はスリーカウントではなく Ready → Go! のツーカウントに。 テンポが遅くなるというユーザーフィードバックが来た。

## 2. 変えたこと（`js/battle/resume-countdown.js`）

- 中断する画面（レベルアップ・ショップ・ミッション・メニューなど）を閉じたら、 真ん中に **Ready** を出して **0.8 秒** だけ止める（3 秒 → 0.8 秒）。
- **Go!** が出た瞬間に時間が動き出し、 Go! は 0.5 秒で弾けて消える（動きながら見せる）。 Go! のあいだにまた止まったら消す。
- 「再開まで」の見出しは外した。 Ready は水色、 Go! は金色。
- 数え直しの決まり（数えているあいだに別の画面が開いた・タブを離れていた）とステージの始まりでは数えない決まりはそのまま。

## 3. 確かめたこと

- `node --test tests/*.test.mjs`：338 件すべて通過。
- ブラウザ（390×844）：止めて戻すと Ready（止まっている）→ 約 0.8 秒で Go!（動いている）→ 消える。 エラーなし。
