---
id: SPEC-153
title: EASY Stage Line in Seconds, Compact Revive Screen That Emphasizes GUM and Gold Dust, Shake Edge Fix, Mine's Boss Warning, Boss Chest Opening for Gold Dust, No Achievements in EASY, MCH Warrior Only in EASY With Billy the Kid as the Clear Reward, and the One-Column Line Script
status: Done
pr: 192
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-153 — EASY のセリフ・復活の画面の圧縮・揺れの縁・ボスの警告・ボスの宝箱・EASY の実績・ヒーロー・台本

- **Status**: Done
- **関連**: SPEC-147（EASY）・SPEC-151 / 152（復活）・SPEC-098（ヒーローの解放）・SPEC-090（ゴールドダスト）・SPEC-085（ボイス）

## 1. 作者の依頼（2026-10-21）と直したこと

| # | 依頼 | 直し |
|---|---|---|
| 1 | ステージ 1 の「4 分でボスが来るよ」が EASY の実測と合わない | EASY では `navi.stage.first.easy`「{stage} に接続！ **{sec} 秒**でボスが来るよ。」（`bossAtMs` から。 ボイスは `stage.1.easy`） |
| 2 | 復活の画面はスクロールせずに全体を見たい。 何をしたかより**何を得たか**（GUM・ゴールドダスト）を強調 | 時間・撃破・レベルは 1 行の小さな字（`.result-mini`）。 GUM とゴールドダストは大きく（`.result-rewards--hero`）。 GUM の内訳と負けた理由の分析は **「くわしく ▼」** に畳む（押すと開く） |
| 3 | 被弾時に黒い半透明の背景がずれる（動いていなくても） | 原因は揺れ（最大 10 px の `translate`）で、 背景の暗い層を**画面の大きさぴったり**に塗っていたこと。 ずれたぶん画面の縁に暗い層の無い帯が見えていた。 **揺れのぶん（16 px）広く塗る**（`render.js` `_drawBackground`） |
| 4 | ボスが現れそうになったらマインちゃんが警告 | 予告が出た瞬間に「**中央の赤いエリアにボスが来るよ！ 気をつけて！**」（`navi.boss.warn`・ボイス `boss.warn`・戦闘の窓で 1.8 秒）。 EASY のステージ 1 はレッスン「時間が経つとボスが来る！」が代わりに出る（同じことを 2 度言わない） |
| 5 | 冗長なセリフを直したいので、 日本語のセリフを 1 列の CSV で | `node tools/voice/lines-csv.mjs` → `docs/voice/script-mine.csv`（文だけ・81 行）と `docs/voice/script-mine-keys.txt`（key つき）。 `navi.*`・`lesson.*`・`advice.*`・`telop.navi.*` |
| 6 | ボスを倒した達成感（ゴールドダストをいつ得たか分かりにくい） | **ボスの宝箱**（`js/battle/boss-chest.js`）: 倒した 0.5 秒後に時間を止めて、 真ん中に財宝ゴールデンモアイ（5106）が落ちてきて揺れる → 押すか 1.2 秒で**開く**（閃光・紙吹雪・「ゴールドダスト ＋N」の数え上げ・復活の SE）→ 「つぎへ」か 2.4 秒でステージの終わりへ。 **ゴールドダストはここで足す**（結果の画面は宝箱の値を使う）。 開けているあいだステージの終わりは待つ |
| 7 | EASY で木の初回強化すると霧隠才蔵のアチーブメントが獲得可能になり、 共通基盤への案内も出る | **EASY のあいだはアチーブメントを送らない**（`onMetaChange` で `state.easyMode` を見る）。 NORMAL で木を触ったときに届く |
| 8 | EASY で選べるのは MCHウォーリアーだけ。 EASY クリアの報酬をビリー・ザ・キッドに | `STARTER_HEROES = [10001]`、 `EASY_REWARD_HERO = 4006`。 EASY のヒーロー選択は MCHウォーリアー以外ロック（「EASY では MCHウォーリアーで挑む」）。 ビリーは **EASY クリアで仲間に**（活動レポートで「仲間になった！」のトースト・`unlockEasyReward`）。 **EASY ができる前から遊んでいた人（`mcs.played`）はそのまま使える**。 ロックの説明「EASY をクリアすると仲間に」 |

## 2. 作者に見てほしいところ

1. 宝箱の間（落ちて 1.2 秒で自動で開く・2.4 秒で自動で進む。 押せばすぐ）。
2. 「くわしく」は既定で畳む。 開いた状態を覚えない（毎回畳む）。
3. ボスの警告は EASY のステージ 2・3 と NORMAL で出る（ステージ 1 の EASY はレッスン）。
4. ビリー・ザ・キッドのロックの説明の文言。

## 3. 確かめ方

- `node --test tests/*.test.mjs`。
- ブラウザ（EASY）: ヒーロー選択は MCHウォーリアー以外ロック → ステージ 1 の告げ声「15 秒でボスが来るよ」→ ボスを倒すと宝箱 → 開けてゴールドダスト ＋1 → つぎへ → ステージクリアの結果に同じ ＋1。 復活の画面は 390×844 でスクロール無しに「復活する」まで見える（内訳と分析は「くわしく」）。
