---
id: SPEC-156
title: The Skill Tree and the Result Screen Shrink by the Width of the Chat Dock, With a Button in the Tree Header to Collapse or Expand the Chat
status: Done
pr: TBD
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-156 — チャットのドックのぶん、 スキルツリーと結果の画面を狭める

- **Status**: Done
- **関連**: SPEC-091（全体チャット）・共通基盤 SPEC-005（SDK 1.7.0 のドック）・SPEC-094 / 135（木の右の列）・SPEC-155（結果の画面の 2 列）

## 1. 作者の指摘（2026-10-21）

タイトルからスキルツリーに入ると、 右側のチャット（共通基盤の SDK が PC では**右に固定のドック**として描く。 320 px）が
木の右の列（詳しい欄・いまの効果）の上に重なり、 チャットを閉じないと何も読めなかった。
**チャットのぶん木の描画範囲を狭めたい。 畳む・広げるもできるように。**

## 2. 直したこと

| # | 中身 |
|---|---|
| 1 | **`js/chat-dock.js`**: SDK の `chat.layout()` が `'dock'` で `chat.isOpen()`（畳んでいない）のあいだだけ、 `html` に `--chat-dock: 320px` を置く。 それ以外（窓・シート・畳んだ・隠した）は `0px`。 SDK の `chat.onToggle`・窓の `resize`・`setChatVisible` のたびに置き直す |
| 2 | **避ける側**: `.tree-screen`（木）と `.gameover-modal`（結果・REVIVE の画面。 SPEC-155 の 2 列の札がドックの下に隠れないように）に `right: var(--chat-dock, 0px)`。 木の中の「戻る」「復活する」「右の列」は画面の右端から置いているので、 そのまま付いてくる |
| 3 | **木の広い画面の判定**（860 px）は、 窓の幅から**ドックのぶんを引いて**見る（`isWide()`）。 畳む・広げると組み直す（`onChatDockChange(rebuild)`。 見ている場所と選んだ節はそのまま。 幅をまたいだときと同じ道） |
| 4 | **木の頭に 💬 のボタン**（PC のドックのときだけ）: 「チャットをたたむ」/「チャットをひらく」。 SDK の `chat.collapse()` を呼ぶ（SDK 自身の ▸ と同じ。 畳んだかどうかは SDK が端末に覚える）。 1240 px 以下は 💬 だけ |

## 3. 作者に見てほしいところ

1. ドックを畳むと木は窓いっぱいに広がる（SDK の ▸ でも、 木の頭のボタンでも同じ）。
2. ドックを出したまま 1100〜1180 px の窓だと、 木は 780〜860 px で**狭い画面の作り**（下の欄）になる。 畳めば広い作りに戻る。
3. 結果・REVIVE の画面もドックのぶん左に寄る。 タイトルはそのまま（ボタンが真ん中にあり、 ドックと重ならない）。

## 4. 確かめ方

- `node --test tests/*.test.mjs`（`tests/chat-dock.test.mjs` を追加）。
- ブラウザ（1400 px、 偽の SDK でドックを置く）: 木を開く → 画面の右端が 1080（= 1400 − 320）、 右の列もその中 → 頭の「チャットをたたむ」→ 右端 1400・「チャットをひらく」に → SDK の `chat.collapse(true)` からでも同じ。
