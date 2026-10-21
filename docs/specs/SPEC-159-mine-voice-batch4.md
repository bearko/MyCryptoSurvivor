---
id: SPEC-159
title: Fourth Batch of Mine's Recordings — 89 WAVs Matched to the Line Script, 32 New Voices Converted to MP3 (Existing Voices Kept for the 57 Duplicates), Wired to the Mission, Revive, Advice, Lessons, Telops, Boss Warning and EASY Stage Line, and the Originals Removed
status: Done
pr: TBD
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-159 — マインちゃんの 4 回目の録音（89 本）の取り込み

- **Status**: Done
- **関連**: SPEC-085（ボイス）・SPEC-097 / 116 / 147（追加の録音）・SPEC-153 / 155（台本の CSV）

## 1. 作者の依頼（2026-10-21）

`assets/` 直下に 89 本の WAV（`番号-女性1-_セリフ-mine_added.wav`）と同じ数の `.txt`、 `mine_added.txt` を置いた。
フォルダの移動・重複しているセリフの削除・MP3 への変換・元データの削除。
**同じセリフにもうボイスがあるなら既存を優先する。**

## 2. やったこと

| # | 中身 |
|---|---|
| 1 | 89 本は `docs/voice/script-mine-keys.txt`（SPEC-155 の台本）と**同じ並び**だった（番号 00〜88 ＝ 行 1〜89。 文を突き合わせて確かめた） |
| 2 | **57 本は既存のボイスと同じセリフ**なので捨てた: タイトル 2・タップ 4・モード 2・ヒーロー選択の入口 1・ヒーローの紹介 10（`hero.<id>`）・ひな形の紹介 10（`navi.hero.pick`。 全員にボイスがあるので使わない）・ステージ 3 ＋ RTA 1・ボス 1・ひとこと 10・倒れたとき 4・木 9 |
| 3 | **32 本を MP3 に変換して登録**（`node tools/voice/build.mjs assets --added4`。 `ADDED_4` の表。 `null` が既存優先）: `mission.1` / `mission.2`・`revive.intro`・`afterTree.bought` / `afterTree.none`・`mode.easy`・`lesson.*`（15）・`advice.*`（6）・`stage.1.easy`・`boss.warn`・`telop.clear` / `telop.allClear` / `telop.lose`。 合計 89 本（モノラル・64 kbps・10〜73 KB） |
| 4 | **つなぎ**: ミッションの持ちかけ（`missions.js`）、 復活の全身（`navi.js` の `revive`）、 木から戻ったとき（`afterTree`）、 EASY のすすめ（`mode` の `first`）、 おすすめ（`advice`。 ボイスの名前は文の key と同じ）、 テロップ（`result-telop.js`。 帯が出た瞬間に「やりました！」）。 レッスン・ボスの予告・EASY のステージは `hasVoice` で前から付くようになっていた |
| 5 | **録音で言い回しが変わった 8 行は字幕を録音に合わせた**: `navi.mission.2`・`navi.afterTree.bought`（「復活」しよう）・`lesson.s1.move`・`lesson.s1.clear`（余った分は自動でパッシブスキルの強化に）・`lesson.s2.root`（覚醒したね）・`advice.shot`・`advice.boss`・`advice.gimmick`。 `navi.tip.gimmick.trojan` も録音は違う言い回しだが、 既存のボイスを優先したので文はそのまま |
| 6 | **元データ（WAV 89・TXT 89・`mine_added.txt`）を消した**。 `assets/` に残るのは `icons/`・`logo.png`・`og-image.png`・`voice/` |

## 3. 作者に見てほしいところ

1. 「ガム」「ノード アバカス」「イージー」と読んでいる行の字幕は `GUM`・`node : アバカス`・`EASY` のまま（読みは同じ。 表記は画面の呼び名に合わせた）。
2. 2 本だけ 8 秒を超える（`revive.intro` 8.2 秒・`advice.shot` 9.1 秒）。 テストの上限を 10 秒に広げた。
3. テロップのボイスは帯が出た瞬間に鳴る（動きを減らす設定では帯が出ないので鳴らない）。

## 4. 確かめ方

- `node --test tests/*.test.mjs`（`tests/voice.test.mjs` が 89 本すべてのファイルと長さ、 どのセリフにもボイスがあること、 使っていないボイスが無いことを見る）。
- `ls assets/voice/mine | wc -l` → 89。 `ls assets` → icons / logo.png / og-image.png / voice。
