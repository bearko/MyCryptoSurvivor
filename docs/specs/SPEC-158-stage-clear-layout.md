---
id: SPEC-158
title: Stage-Clear Screen Rebuilt Like REVIVE (Small Stats Line, Big GUM and Gold Dust, Breakdown Under "Details" or in the Left Column on PC), a Victory Jingle When the NODE CLEAR Band Appears, Two Columns Decided by the Card's Available Width So the Open Chat Dock Makes Three Clean Columns, and #ポチゲー in the X Post Body
status: Done
pr: TBD
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-158 — ステージクリアの画面を REVIVE と同じ組み立てに・勝利の SE・ドックと 3 列・X の #ポチゲー

- **Status**: Done
- **関連**: SPEC-153 / 155（REVIVE の画面）・SPEC-156（チャットのドック）・SPEC-046 / 058（ステージクリアの画面）・SPEC-143（X の投稿）

## 1. 作者の依頼（2026-10-21）と直したこと

| # | 依頼 | 直し |
|---|---|---|
| 1 | ステージクリアの画面も、 時間・撃破数・レベルは目立たせず、 **GUM とゴールドダストを強調** | 3 つの大きな札（`.result-tiles`）をやめ、 REVIVE と同じ **1 行の小さな字**（`.result-mini`。 撃破数は数え上げる）。 GUM とゴールドダストは **`.result-rewards--hero` で大きく** |
| 2 | GUM の内訳や各種データを、 REVIVE と同じく**左側**に | 内訳（GUM の式）と残った CE の振り先を **「くわしく ▼」**（`#stageTransitionMore` / `#stageTransitionMoreBody`。 毎回畳む）に入れ、 PC では**左の列に常に出す**。 右は 進み具合・題・1 行・報酬・木・NEXT・次のステージへ |
| 3 | チャットを開いているとき REVIVE の内容が一部隠れる。 畳んでいれば 2 列で全面、 開いていれば **データ・REVIVE・チャットの 3 列**に | 2 列にする判定を**窓の幅**（`@media (min-width: 980px)`）から**札の置き場の幅**（`.gameover-modal` を `container-type: inline-size` にして `@container (min-width: 940px)`）に変えた。 置き場は SPEC-156 でドックのぶん狭まっているので、 ドックが開いていれば残り幅の真ん中に 2 列の札（＝ 3 列に並ぶ）、 畳めば窓いっぱいの真ん中に 2 列。 REVIVE とステージクリアの両方（`.result-split`） |
| 4 | ステージクリアのとき、 **NODE CLEAR の帯が出るタイミングで勝利の SE** | `playSe(SFX.STAGE_CLEAR, 0, 0.7)` を `presentResult(modal, "clear")`（帯）の直前に。 `SFX.STAGE_CLEAR` は `Audio/SE/Jingles/win.mp3`（全クリアと同じ勝利のジングル。 ボスを倒した音のあとに重なる） |
| 5 | マインちゃんが X の投稿をすすめるとき、 本文に **#ポチゲー** を入れる（ポータルが拾う条件） | `shareUrl` が本文の末尾に `#ポチゲー` を足す（`SHARE_BODY_TAG`。 もう入っていれば足さない）。 `hashtags=MyCryptoGames` と URL はそのまま |

## 2. 作者に見てほしいところ

1. 勝利の SE は win.mp3（全クリアのジングルと同じ）。 別の音にしたければ `SFX.STAGE_CLEAR` を差し替えるだけ。
2. 2 列の境目は置き場の幅 940 px。 ドックが開いた 1280 px の窓（置き場 960）は 2 列、 1250 px 以下は 1 列（「くわしく」）。
3. 残った CE の振り先（SPEC-128）も「くわしく」の中へ移した（PC では左の列の内訳の下）。

## 3. 確かめ方

- `node --test tests/*.test.mjs`（`tests/stage-clear.test.mjs` を追加。 `tests/share-x.test.mjs` を更新）。
- ブラウザ（EASY のステージ 1 を立ったままクリア）: 1280 px は 2 列（左に内訳と CE、 右に 1 行・GUM +66・ゴールドダスト +1・NEXT）、 390 px は 1 列で「くわしく ▼」、 1600 px ＋ ドック 320 は札が 320〜1280 の真ん中（＝ データ・結果・チャットの 3 列）。
