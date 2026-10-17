---
id: SPEC-087
title: Level-up Screen — Equipped Strip and "Rank Up" Highlight on Owned Candidates
status: Done
pr: TBD
phase: v1.3 Battle
kind: Added
---

# SPEC-087 — 強化画面：装備中の一覧と、 ランクアップの候補を目立たせる

- **Status**: Done
- **関連**: SPEC-008（レベルアップの 3 択）・SPEC-021（段ごとのアイコン）・SPEC-023（上限と リロール）・SPEC-057（配る・選ぶの演出）

## 1. 背景

作者の依頼（2026-10-17）：

- 自分が今装備しているアイテムを強化画面で表示できるようにしたい
- アイテム強化画面で、 装備しているアイテムがランクアップする選択肢は目立たせて 「ランクアップ」 できることを明示してほしい

いままでは、 3 枚の札だけが並んでいた。 持っているものが上がる札は 「Lv.2 → Lv.3」 の小さな字でしか分からず、 いま何を何段まで持っているか（武器 5 枠・強化 5 枠のどこまで埋まったか）は、 ゲームオーバーの活動レポートまで見る場所が無かった。

## 2. 仕様（`js/battle/levelup.js`・`index.html`・`css/components.css`・`css/battle-ui.css`）

### 2.1 装備中の帯（`#levelUpOwned`）

- 「強化を 1 つ選ぼう」 と 3 枚の札のあいだに、 **装備中** の帯を置く
- **武器の行 → 強化の行** の順。 行の見出しは 「武器 4/5」「強化 1/5」（= 持っている数 / 上限 `STOCK_LIMIT_WEAPON` / `STOCK_LIMIT_BUFF`）
- 持っているものは、 **その段のアイコン**（`extTierImg`）と **Lv.n**。 Lv.5（`EXT_MAX_LEVEL`）は金で **MAX**
- 上限までの空き枠は、 **点線の薄い枠** で置く（= 「あと 1 つ武器が入る」 が見える）
- 持っているものは、 持った順（`state.ownedExtensions` の順）
- 何も持っていなければ帯ごと隠す（= 最初の武器を選ぶとき）
- スマホ（390px）では絵を 30px にして、 3 枚の札を 844px の中に収める（600px 以上では 34px）
- 言語を切り替えると描き直す（`renderLevelUpModal` の中で描く）

### 2.2 ランクアップの札

- 持っているものの札（`opt.isNew === false`）に、 **アイコンの上に金の帯「ランクアップ」** を置き、 札の縁を **金**（`var(--accent)`）にして、 内側を金の光でゆっくり明滅させる
- 次で Lv.5 に届く札は **「ランクアップ MAX」**
- いままでの **「Lv.2 → Lv.3」 は残す**。 新しいものの札（NEW）は変えない
- 配る演出（`levelup-modal--deal`）と、 選んだときの 光る・沈む（`levelup-modal--picking` / `levelup-card--picked`）の中でも印は残る（= 縁の色は `battle-ui.css` の `--edge` を通す。 `--edge` の既定は種類の色 `--cat`）
- 「演出を減らす」（`data-reduce-fx`）と OS の reduce-motion では明滅しない

### 2.3 文言（`data/i18n/ui.json`）

| key | ja | en |
|---|---|---|
| `levelup.rankUp` | ランクアップ | RANK UP |
| `levelup.rankUpMax` | ランクアップ MAX | RANK UP MAX |
| `levelup.owned` | 装備中 | Equipped |
| `levelup.owned.weapon` | 武器 | Weapon |
| `levelup.owned.buff` | 強化 | Buff |
| `levelup.owned.lv` | Lv.{n} | Lv.{n} |
| `levelup.owned.max` | MAX | MAX |

## 3. 非ゴール

- 候補の選び方（武器 1 つ優先・重ならない・リロールで続けて出さない。 SPEC-013 / SPEC-067）は変えない
- 装備中の帯から何かを押せるようにはしない（= 見るだけ）
- 活動レポートの装備の表示（SPEC-033）は変えない

## 4. 受け入れ基準

- [x] 強化画面に、 持っている武器と強化が、 絵と Lv で並ぶ。 上限までの空き枠が点線で見える
- [x] 持っているものが上がる札には 「ランクアップ」 の金の帯と金の縁。 次で Lv.5 なら 「ランクアップ MAX」
- [x] 新しいものの札（NEW）はいままでどおり
- [x] 390×844 で、 3 枚の札とリロールのボタンが画面に収まる
- [x] 最初の武器を選ぶとき（何も持っていない）は帯が出ない

## 5. テスト

- `node --test tests/levelup-owned.test.mjs`：武器 → 強化の順と空き枠の数・MAX の判定・ランクアップの印（null / rankUp / rankUpMax）・帯が札より上にあること・文言が ja / en にあること・縁の変数（`--edge`）
- `node --test tests/*.test.mjs` → 167 pass
- ヘッドレス Chromium（390×844 の ja / en、 1280×800 の ja）：武器 4 つ（Lv.1 / 3 / 5 / 4）と強化 1 つ（Lv.2）を持った状態で、 NEW・ランクアップ（Lv.3 → 4）・ランクアップ MAX（Lv.4 → 5）の 3 枚を撮った。 帯は 98px、 札の下端は 609px、 リロールの下端は 658px（< 844）。 札を選んだ途中（光る・沈む）でも金の帯と縁が残る。 ページのエラーなし
