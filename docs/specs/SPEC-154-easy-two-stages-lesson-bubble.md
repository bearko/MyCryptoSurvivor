---
id: SPEC-154
title: Lessons as the Top Comm Bubble With a Cursor (No Cut-Ins, Game Keeps Running), EASY Cut to Two Stages, Shop Gauge Fixed on Stages 2/3, Skill Tree Reachable From the Stage-Clear Screen Once Awakened, and the Boss Chest Turning Into the Gold Dust Icon
status: Superseded
pr: 193
phase: v1.7 Onboarding
kind: Changed
---

> **Superseded**（2026-10-22）: SPEC-165 が置き換えた。 「負ける設計」は撤去（倒れて学ぶ → やって学ぶ）。

# SPEC-154 — レッスンは画面の上の通信窓で（止めない・カーソル）、 EASY は 2 ステージ、 店のゲージ、 クリア画面の木、 宝箱の絵

- **Status**: Done
- **関連**: SPEC-147（EASY）・SPEC-068（初めてのひとこと）・SPEC-153（ボスの宝箱）・SPEC-152（開幕の店）

## 1. 作者の依頼（2026-10-21）と直したこと

| # | 依頼 | 直し |
|---|---|---|
| 1 | チュートリアルでマインが逐一カットインするのをやめ、 初めてアイテムを使ったときと同じ画面の上の吹き出しとアイコンで（ゲームは止めない）。 CE の説明では CE に、 店の説明では店のカウントダウンに**カーソル**を | `js/lesson.js` を書き直し。 真ん中の窓（`#lessonModal`）は無くし、 `naviSay` の通信窓（戦闘中は画面の上 `place: "battle"`、 店・ミッションなど止まっている画面では下の帯 `"result"`、 木の中では木の上の窓 `"tree"`）で話す。 **`pauseTime` は呼ばない**。 マインちゃんがほかのことを話しているあいだは順番を待つ。 **カーソル**（`js/lesson-cursor.js`。 金色の輪と 👆）: CE → いちばん近い CE、 店 → `#shopBar`、 ボス → 中央の赤いエリア、 レア → レアエネミー、 ギフト → `#shopGifts`、 ミッション → 「受ける」 |
| 2 | スキルツリーのダブルタップで広がる演出が、 マインの説明（カットイン）と被って台無し | 根を取ったときのレッスン「覚醒」も木の上の窓に（カットインは無い） |
| 3 | ステージ 2・3 で店のカウントダウンゲージが 0 のまま | ゲージ（`shopProgress` / `nextShopSec`）が `shopTimesMs(idx)`（= 0 秒の店つき・EASY 無視）で数えていて、 開く判定の表と違っていた。 **同じ表を渡す** |
| 4 | EASY はステージ 2 まで | `EASY_STAGES` は 2 つ。 ステージ 2 が負ける設計（旧ステージ 3 の値: 1/2・攻撃 ×2.2・ボス HP ×0.016・被ダメ ×0.7・ボスが出たら雷鼓）に、 旧ステージ 2 のレア（5 秒）とミッション（8 秒・★1・15 秒）を乗せた。 ボスは 0:15 / 0:30。 `stageCount()`（EASY は 2）をステージの終わり・帯・結果の画面で使う。 レッスンは 15 本（`s3.*` → `s2.*`、 「ここからは本気の敵」は無し。 CSV も更新） |
| 5 | EASY のステージ 1 でも、 根を取ってあればクリア画面から木へ | ロックは `isEasy() && !owns(root)`。 文言「スキルツリーはステージ 2 で開く」 |
| 6 | 宝箱が開いたらモアイの場所にゴールドダストの絵 | 開いて 0.32 秒後にモアイの絵をゴールドダストに差し替え（下の小さな絵は無し） |

## 2. 確かめ方

- `node --test tests/*.test.mjs`。
- 自動プレイ（EASY・逃げる・×0.15）の実測: ステージ 1 クリア（25 秒・HP 58/67）→ ステージ 2 で倒れる（40 秒・GUM 185）→ 根＋4 節 → 復活でステージ 1 クリア（20 秒・HP 113/116。 **クリア画面の木のボタンが出ている**）→ ステージ 2 クリア（2 回目で全クリア）。
- 見つけて直したこと: ボスの予告の警告（SPEC-153）が毎コマ `naviSay` を呼んでいて、 吹き出しが空のまま止まっていた（`fxBossIncoming()` が新しく予告したときだけ呼ぶ）。
- ブラウザ（EASY）: レッスンは画面の上の通信窓で、 `pauseFlags` は 0 のまま。 CE のレッスンでカーソルが CE に、 店のレッスンで `#shopBar` に当たる。 `#lessonModal` は無い。
