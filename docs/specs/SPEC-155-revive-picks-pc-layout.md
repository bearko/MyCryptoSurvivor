---
id: SPEC-155
title: Recommended Upgrades Bought in One Tap on the Revive Screen, a Two-Column Revive Screen on PC, the Revive Explanation Only Once, the Clock Icon Kept on One Line, Camera Centered Before the First Frame After Reviving, and the Line Script With Variables Expanded Into Real Words
status: Done
pr: 194
phase: v1.7 Onboarding
kind: Changed
---

# SPEC-155 — 復活の画面のおすすめの強化・PC の 2 列・説明は初回だけ・時計の絵・カメラの初期位置・台本の変数

- **Status**: Done
- **関連**: SPEC-148（負けた理由の分析）・SPEC-150 / 151 / 152 / 153（復活）・SPEC-090（スキルツリー）・SPEC-147（EASY）

## 1. 作者の依頼（2026-10-21）と直したこと

| # | 依頼 | 直し |
|---|---|---|
| 1 | 復活する のボタンの時計の絵は、 木のボタンのように**改行せずに出せるなら残す**。 崩れるなら要らない | 木のボタン（`.result-tree-btn`）と同じ並べ方にした。 `inline-flex` ＋ `gap` ＋ `white-space: nowrap`、 絵は 20 px。 絵と文字が 1 行に並び、 幅が狭くても折り返さない |
| 2 | **おすすめの強化を 2〜3 個**、 それぞれの効果とともに木のボタンの上に。 木へ行かずに**ワンクリックで強化** | `#gameOverPicks`（`js/battle/revive-picks.js`）。 根をまだ取っていなければ**根だけ**（0 GUM で覚醒）。 根を取ってあれば、 SPEC-148 の「倒れた理由のおすすめ」のうち**いま買えるもの**を先に、 残りを**いま買える節の安い順**で合わせて 3 つ（得意武器 `wm_main` は出さない）。 行は 絵・名前・段（`Lv 1 → 2 / 5`）・効果の文・費用つきの「強化」ボタン。 押すと木と同じ手順（`tryBuy → spend → setNodeRank`）で買い、 欄を描き直し、 「復活する」が脈打つ（木から戻ったときと同じ `onBackFromTree`）。 欄の右上に手持ちの GUM。 EASY で根を取ると覚醒のレッスン。 RTA とクリアでは出さない |
| 3 | PC では「くわしく」に畳んである各種データを**画面の左側**に | `@media (min-width: 980px)`: 札を 2 列のグリッド（左 1fr・右 420 px）。 左に GUM の内訳と負けた理由の分析（`#gameOverMoreBody` を常に表示）、 右に結果・報酬・おすすめ・ボタン。 「くわしく」のボタンは隠す。 スマホは SPEC-153 のまま（畳む） |
| 4 | 復活のシーン（PC）で、 最初に**ステージの外**が映ってから真ん中へ飛ぶ | `startBattle` が `b.camera = (0, 0)` のまま `_showStageIntro` へ進み、 カメラを自分に合わせるのは `_step` の中だけだった。 復活の降りこみは時間を止めたまま描くので、 最初の数コマが (0, 0)（＝ステージの左上の外）で映っていた。 `startBattle` で `resizeCanvas()` のあと **`centerCameraOnPlayer()`** を呼んで、 最初のコマから自分を真ん中に |
| 5 | 復活のしかたに触れる演出は**初回だけ**。 2 回目からは REVIVE の画面へ直行 | `mcs.reviveSeen`（`hasSeenRevive` / `markReviveSeen`）。 初回は SPEC-151 のまま（渦に入る → マインちゃんの全身「王妃の黄金時計のチカラで復活させてあげる」＋ 時計の絵 → REVIVE の画面）。 2 回目からは**渦に入った瞬間に REVIVE の画面**（粒子の演出そのものは残る。 倒れた → 粒になる → 復活で降りこむ、 の絵のつながりのため）。 粒子が出せない端末で帯に出していた同じ文も、 2 回目からは出さない。 設定の「もう一度聞く」で忘れる |
| 6 | セリフの CSV は、 `{stage}` のような変数のままだと発声できない。 **実際に読む語を入れて**出力 | `tools/voice/lines-csv.mjs` が変数を展開する。 `{stage}` はステージ名（`node : アバカス` / `node : ホレリス` / `node : トロイ`）でステージごとに 1 行、 `{sec}` は EASY のボスまでの秒（15）、 `{name}` `{weapon}` はヒーロー 10 人ぶん（heroes.json ＋ 最初の武器の系統名）、 `{a}` `{b}` は節の名前（`ADVICE_NODES` の表。 `suggest` と同じ表を使う）。 key は `navi.hero.pick#hero4006` のように `#` のあとに何のぶんかを付ける。 変数が残っていたら生成が止まる。 81 行 → **89 行** |

## 2. おすすめの選び方（`pickRecommendations(meta, adviceNodes)`・純関数）

1. 根をまだ取っていない → `[root]`
2. 取ってある → `adviceNodes`（SPEC-148 の `suggest(sum).nodes`）のうち `claimableNodes` にあるものを順に
3. 足りなければ、 残りの `claimableNodes` を GUM の安い順（同じならダストの安い順）で、 `wm_main` を除いて
4. 3 つで切る。 買えるものが無ければ欄ごと隠す

## 3. 作者に見てほしいところ

1. おすすめの 3 つの選び方（倒れた理由 → 安い順）。 「いま買えるもの」だけなので、 GUM が少ないと 1〜2 個になる。
2. PC の 2 列の境目は 980 px。 iPad の横（1024）は 2 列、 縦（768）は 1 列。
3. 2 回目以降の復活は、 渦に入ってすぐ REVIVE の画面。 粒子の演出（約 2.3 秒）は残した。 これも要らなければ別に。
4. 台本の key の `#` のあとの印（`#stage2` / `#hero4006`）。 文だけの CSV には出ない。

## 4. 確かめ方

- `node --test tests/*.test.mjs`（`tests/revive-picks.test.mjs` を追加）。
- `node tools/voice/lines-csv.mjs` → 89 行。 `docs/voice/script-mine.csv` に `{` が無い。
- ブラウザ: 倒れる → 初回はマインちゃんの説明 → REVIVE の画面に「おすすめの強化」（根だけ）→ 強化 → 木の候補 3 つに変わり「復活する」が脈打つ → 復活する → 降りこみの最初のコマから自分が真ん中。 2 回目に倒れると、 渦に入ってすぐ REVIVE の画面。 1280 px では左に内訳と分析、 右に結果とボタン。 390 px では SPEC-153 のまま。
