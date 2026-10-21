---
id: SPEC-143
title: Mine Suggests Posting on X After Clearing Stage 1 — Post Button Opens X With #MyCryptoGames and the Game URL, 100 GUM Once
status: Done
pr: TBD
phase: v1.6 Growth
kind: Added
---

# SPEC-143 — ステージ 1 のクリアで、 マインちゃんが X での投稿をすすめる

- **Status**: Done
- **関連**: SPEC-132（ステージクリアの画面）・SPEC-090（GUM）

## 1. 作者の依頼（2026-10-21）

ステージ 1 をクリアした時点で、 X の投稿を促すマインちゃんの画面を出す。
「ナイスクリア！面白かったらXでもこのゲームを宣伝してくれると嬉しいな！」→「投稿ボタン」を押したら 100 GUM を付与。
タグは `#MyCryptoGames`、 ゲームの URL も既定で投稿に含める。

## 2. 中身（`js/share-x.js`）

- ステージ 1 のクリアの画面が出そろったあと（1.6 秒）、 その上にマインちゃんの画面を重ねる。
- **𝕏 で投稿する**：X の投稿画面（`https://x.com/intent/tweet`）を新しいタブで開く。 文・`#MyCryptoGames`・`https://survivor.bearko.games/` が入った状態。 押した時点で **100 GUM**（投稿したかは確かめられないため）。 お礼のひとことに変わり「とじる」で閉じる。
- **あとで**：閉じる。 次にステージ 1 をクリアしたときにまた出す（3 回まで）。
- GUM は 1 回だけ。 もらったら二度と出さない（端末に `mcs.shareX` で覚える）。
- RTA では出さない（走りを止めない）。 時間には触らない（ステージクリアの画面がもう止めている）。
- 投稿の文（日本語）：「MyCryptoSurvivor でステージ 1 をクリア！ マイクリのヒーローで生き残るサバイバーゲーム」。 英語の設定では英語。

## 3. 確かめたこと

- `node --test tests/*.test.mjs`：342 件すべて通過（`tests/share-x.test.mjs`）。
- ブラウザ（390×844）：ステージ 1 のクリアで画面が出る、 投稿で新しいタブが開き GUM が 360 → 460、 とじるでステージクリアの画面に戻る。 エラーなし。
