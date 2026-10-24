---
id: SPEC-173
title: Team Release — Mine's Recorded Lines for the Story Leftovers and the Team Lessons, the Team Gauge Renamed "JIN", and Team Sorties Opened on Production (NORMAL Only)
status: Approved
pr: 250
phase: v2.0 Team
kind: Changed
---

# SPEC-173 — ボイスの取り込み・「JIN ゲージ」・チームを本番へ

- **Status**: Approved（作者の依頼 2026-10-24）
- **関連**: SPEC-165（ストーリー）・SPEC-166〜172（チーム）・SPEC-085（マインちゃんのボイス）

## 1. 作者の依頼（2026-10-24）

1. 録音した 17 本（ストーリーの残り 6 本・チームの説明 11 本）を入れる。 日本語として自然に聞こえるよう直した文に、 元のセリフも合わせる。 JIN・GUM は録音の都合でカタカナにしたが、 文はいまのまま
2. チームの必殺技のゲージを「JIN ゲージ」に。 TEAM と書いてあるところを JIN に
3. ここまでの実装を、 テスト用だけでなく本番にも出す

## 2. ボイス

- `tools/voice/build.mjs --jin`: 「番号-…-mine_add_jin.wav」（番号 00 から = `docs/voice/script-jin-keys.txt` の並び）。 ボイスの名前は文の key（ストーリーは `story.*`、 チームの説明は `navi.team.*`）
- 録音に合わせて直した文（JIN・GUM・CE・✕ の表記はいまのまま）

  | key | 前 | 後 |
  |---|---|---|
  | story.1-3.ce | …店で使えるから… | …**お**店で使えるから… |
  | story.1-4.strike | HP が 2 割まで減った。 パンケーキで戻そう。 光る道の先！ | HP が かなり減っちゃったね。 パンケーキで回復しよう。 光る道を辿って！ |
  | story.3-2.shop | ふつうの品ぞろえの店だよ。 いらない品は、 左上の ✕ で外せるよ。 | 買いたいエクステンションがない時は、 左上の ✕ で除外できるよ。 |
  | story.treeNudge | GUM が {gum} 貯まってる！ スキルツリーで強化しておこう。 | GUM が {gum} 貯まってきたね！ スキルツリーでこまめに強化しておこう。 |

  チームの説明の 11 本は文がそのまま（「JIN（陣）」の（陣）は読みに入れていないが、 文には残す）
- 元の WAV と台本の TXT（`assets/voice/` に置かれていたもの）は MP3 にしたあと外した（公開の場所に置かない。 git の履歴には残る）。 台本は `docs/voice/script-jin.csv`

## 3. 「JIN ゲージ」

- ゲージの見出しを TEAM → **JIN**（JIN がそろっていれば、 いままでどおり「JIN ★★★」）

## 4. 本番へ

- `teamAvailable` からテスト用のホストの条件を外す。 **NORMAL だけ**（ストーリー・RTA・ABSOLUTE はソロ。 作者の説明の文「NORMAL モードはチームで挑戦できるよ！」に合わせた）
- ヒーローを 3 人（解放した 10 人＋アチーブメントで解放したヒーロー）そろえると開くのはそのまま
- テスト用のサイト・`?test=1`（全員とすべてのモード・共通基盤へ送らない）はそのまま残す

## 5. 確かめたこと

- テスト: ボイスの本数（＋17）・チームの説明にボイス・本番でも開く（NORMAL だけ）・ゲージの見出し
- ブラウザ（本番のドメインを手元のファイルで再現・`?test=1` なし）: ヒーロー選択にチームが出る（TEST の印は無い）・サブ 2 人で出撃・ゲージは「JIN」・ボイスが鳴る（ヒーロー選択・サブを選ぶ窓・編成のあと・出撃）
