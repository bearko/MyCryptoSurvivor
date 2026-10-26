---
id: SPEC-178
title: Add-to-Home-Screen Prompt — After the First NORMAL Run, Phones Get One Gentle Sheet (Install Button on Android, Share-Menu Steps on iOS), Shown Once, With Steps 29/30 to Measure It
status: Approved
pr: 255
phase: v2.0 Retention
kind: Added
---

# SPEC-178 — ホーム画面に追加の案内

- **Status**: Approved（作者の依頼 2026-10-26。 推奨案のとおり）
- **関連**: SPEC-047（アイコンと manifest）・SPEC-177（ここからが本番）・SPEC-174（チュートリアルの段）

## 1. 作者の依頼（2026-10-26）

【仮説②】翌日に遊ぶ道筋がない → スマホなら「ホーム画面に追加」を促す。

`manifest.json`（SPEC-047）はもうあり、 ホーム画面に追加すればアプリのように開ける。 足りないのは案内だけ。

## 2. いつ出すか

- **NORMAL の挑戦を 1 回終えたあと、 モード選択に戻ったとき**（`mcs.played` が付いたあと）
  - SPEC-177 の画面と同時に出すと、 伝えることが多すぎて両方弱くなる。 1 回遊んで「また遊びたい」と思ったところで出す
- スマホだけ（iPhone・iPad・Android）。 パソコンには出さない
- すでにホーム画面から開いている人（`display-mode: standalone` / `navigator.standalone`）には出さない
- **1 回だけ**（`mcs.installAsked`）。 「あとで」でも二度と出さない
- RTA・ストーリーの途中には出ない（モード選択に戻ったときだけ）

## 3. 中身（下から出るシート）

- マインちゃん「ホーム画面に置いておくと、 次からワンタップで来られるよ！」
- **Android**（ブラウザが追加の合図 `beforeinstallprompt` をくれたとき）: 「ホーム画面に追加」ボタン → ブラウザの確認
- **Android**（合図が無いとき）: 「ブラウザのメニュー（⋮）→『ホーム画面に追加』」の手順
- **iPhone / iPad**: 「共有ボタン（□↑）→『ホーム画面に追加』」の手順（Safari 以外の iOS 16.4 以降のブラウザも同じ）
- 「あとで」

ブラウザが自分で出す小さな案内（Android の帯）は止めて、 このシートからだけ出す（遊んでいる最中に出ないように）。

## 4. 計測（チュートリアルの段に足す）

| step | id | いつ |
|---|---|---|
| 29 | a2hs | このシートを出した |
| 30 | home | ホーム画面から開いた（起動したとき standalone だった） |

- 「ストーリーを終えた → 本番画面 → NORMAL → 案内 → ホームから来た」が 1 本の漏斗で見える
- Android で追加を選んだかどうかは段にしない（30 で、 実際にそこから来たかを見るほうが確か）

## 5. 実装

- `js/install-prompt.js`（新規）: 端末の判定・出すかの判定（純関数）、 `beforeinstallprompt` の受け取り、 シート
- `js/mode-select.js`: `showModeSelect` で出すか見る
- `js/main.js`: 起動のとき standalone なら段 30
- `js/story.js`: `tutorialStepOf("a2hs" | "home")`
- `index.html` / `css/story.css` / `data/i18n/ui.json`

## 6. 入れないもの

- プッシュ通知（作者と相談のうえ見送り。 知らせることができたら再検討）
- オフラインで遊べるようにする（Service Worker）。 追加の条件ではなくなったので、 今回は要らない
