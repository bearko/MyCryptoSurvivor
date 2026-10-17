---
id: SPEC-088
title: First Play Is NORMAL Only — ABSOLUTE and RTA Locked Until One Run Ends
status: Done
pr: 116
phase: v1.3 Menu
kind: Changed
---

# SPEC-088 — 初プレイは NORMAL だけ（ABSOLUTE と RTA をロック）

- **Status**: Done
- **関連**: SPEC-037（モード選択）・SPEC-040（RTA）・SPEC-048（ABSOLUTE ×2.0 の RTA）

## 1. 背景

作者の依頼（2026-10-17）：

- 初プレイのときは ABSOLUTE と RTA はロックして NORMAL しか選べないようにしたい

いままでは、 初めて開いた人にも 3 枚の札（NORMAL・ABSOLUTE・RTA）が同じ重みで並び、 スライダーや RTA の時計を見てから遊び方を決めることになっていた。

## 2. 仕様

### 2.1 「初プレイ」 の定義（`js/played.js`・`js/constants.js`）

- **この端末で、 まだ 1 回も挑戦を終えていない**（= クリアもゲームオーバーもしていない）こと
- 終えたときに `localStorage` の **`mcs.played`**（`LS_PLAYED`）に `"1"` を置く
  - ゲームオーバー（`triggerGameOver`。 `"lose"` も `"clear"` も）
  - 全ステージクリアの活動レポート（`triggerActivityReport`）
- 途中でタイトルに戻っただけでは終えたことにしない
- `localStorage` が無い・投げる（プライベートモード等）ときはロックされたまま（何も投げない）
- 純関数：`hasPlayed(storage)` / `markPlayed(storage)` / `lockedModes(played)` / `isModeLocked(mode, played)`。 ロックするのは `LOCKED_UNTIL_PLAYED = ["ABSOLUTE", "RTA"]`

### 2.2 モード選択（`js/mode-select.js`・`index.html`・`css/components.css`）

- `showModeSelect` を開くたびに見直す（`_applyLocks`）。 1 回遊び終えたあと、 次にこの画面を開いたときから選べる
- ロック中の札（ABSOLUTE・RTA）は **見せたまま**：
  - 中身を薄く（opacity 0.4・grayscale）、 押せなくする（ボタンとスライダーは `disabled`、 ランキングのリンクは `aria-disabled` + `tabindex=-1`、 `pointer-events: none`）。 縁は灰色
  - 見出しの下に **「🔒 NORMAL を 1 回遊ぶと選べるようになる」** の 1 行（`.mode-card__lock`。 これだけは薄くしない）
  - 札に `aria-disabled="true"`
- `_pick` でも止める（= ボタンが `disabled` でも、 念のため）
- NORMAL の札は変えない。 RTA の札が SDK の無いとき隠れるのはいままでどおり（`isRtaAvailable`）
- マインちゃん（ナビ）のセリフは足さない

### 2.3 文言（`data/i18n/ui.json`）

| key | ja | en |
|---|---|---|
| `mode.locked` | 🔒 NORMAL を 1 回遊ぶと選べるようになる | 🔒 Finish one NORMAL run to unlock |

## 3. 非ゴール

- ロックを解く条件を 「クリア」 に限らない（= ゲームオーバーでも開く。 作者の 「1 回遊ぶ」 の読み）
- 設定からロックをかけ直す・外す手段は置かない
- 既に遊んだことのある人（= `mcs.played` が無い端末）も、 次の 1 回は NORMAL だけになる。 1 回で開くので許容する

## 4. 受け入れ基準

- [x] 初めて開いた端末では、 ABSOLUTE と RTA の札が薄く、 ボタン・スライダー・リンクが押せず、 🔒 の 1 行が出る。 NORMAL は選べる
- [x] NORMAL で 1 回遊び終える（ゲームオーバー）と `mcs.played` が `"1"` になり、 次にモード選択を開くと ABSOLUTE と RTA が選べる
- [x] SDK が無いときの RTA の札の隠し方は変わらない
- [x] マインちゃんのセリフは変わらない

## 5. テスト

- `node --test tests/played.test.mjs`：記録と判定（純関数）・storage が無い／投げるときの振る舞い・ロックするモード・ゲームオーバーと活動レポートで記録していること・ロックの行が札の中にあること・文言が ja / en にあること
- `node --test tests/*.test.mjs` → 171 pass
- ヘッドレス Chromium（390×844 の ja / en、 1280×800 の ja。 SDK は代わりの物を置いて RTA の札を出した）：
  - 初回：ABSOLUTE・RTA は `mode-card--locked`、 ボタン 7 つとスライダー 4 つが `disabled`、 リンク 2 つが `aria-disabled`、 🔒 の行が出る。 `btnModeAbsolute` / `btnModeRta` を押しても画面は変わらない
  - NORMAL で始めて倒れる → `mcs.played` が `"1"` → タイトル → Press to Start → ABSOLUTE・RTA が選べ、 🔒 の行は隠れる
  - マインちゃんのセリフは 「難易度を選んで。迷ったら NORMAL で！」 のまま。 ページのエラーなし
