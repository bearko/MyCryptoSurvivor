---
id: SPEC-114
title: Sound Effects on Web Audio — Fix SEs (Defeat Jingle, Shop Purchases) Going Silent After Long Fights
status: Done
pr: TBD
phase: v1.6 Shop
kind: Fixed
---

# SPEC-114 — SE を Web Audio で鳴らす（長い戦闘のあと SE が鳴らなくなる不具合）

- **Status**: Done
- **関連**: SPEC-017（SE）・SPEC-044（音量）・SPEC-102（音の高さ）

## 1. 不具合（作者の報告 2026-10-20）

- 敗北したときに lose.mp3 が鳴らない
- ショップでランクアップを買ったときに音が鳴らない

## 2. 原因

`playSe` は鳴らすたびに `<audio>` を `cloneNode()` で新しく作っていた。ブラウザは 1 ページで作れるメディア要素の数に上限がある（Chrome：`Blocked attempt to create a WebMediaPlayer as there are too many WebMediaPlayers already in existence`。スマホはさらに少ない）。戦闘では当たりの音・拾う音が何百回も鳴るので、上限に当たったあとは **すべての SE が `NotSupportedError` で鳴らなくなる**。敗北のジングルやショップで買ったときの音は、戦闘の終わりや途中に鳴るので、ちょうどそこで当たっていた。

- 再現：SE を 1,500 回鳴らしたあと lose.mp3 を鳴らすと `NotSupportedError`（ヘッドレスの Chromium）
- 「初回だけ鳴らない」でも「ランクアップだけ鳴らない」でもなく、**戦闘が長くなるほど鳴らなくなる**

## 3. 直し方

- **Web Audio**（`AudioContext`）で鳴らす。最初の操作（スプラッシュ・タイトルを押す）で作り、SE をすべて読み込んでおく（`preloadSe`）。鳴らすたびに `BufferSource` を作るだけなので、メディア要素の上限に当たらない
- 同時に鳴るのは 32 まで。超えたら **いちばん古い音を止めて** 新しい音を鳴らす（ジングルを取りこぼさない）
- まだ読み込めていない SE は、読み込めたら鳴らす（0.6 秒より遅れたら鳴らさない）
- Web Audio が使えないときだけ、パスごとに 4 つまでの `<audio>` を使い回す（要素を増やさない）
- iOS：本体の消音スイッチで Web Audio だけ消えないように `navigator.audioSession.type = "playback"`（Safari 17 から。BGM の `<audio>` と同じ扱い）。電話などで止められた `AudioContext` は次の操作で動かし直す
- BGM・ボイスは今までどおり 1 つの `<audio>` を使い回す（変えない）

## 4. 確かめたこと

- `node --test tests/*.test.mjs`：すべて通る（`tests/audio-se.test.mjs` を足した：`<audio>` が 4 つより増えない・ジングルは別の枠で鳴る）
- ブラウザ：SE を 1,500 回鳴らしたあとでも lose.mp3 が鳴る（Web Audio・`<audio>` の使い回しの両方）。上限の警告は 0 件。ショップで買ったとき・敗北したときに鳴る
