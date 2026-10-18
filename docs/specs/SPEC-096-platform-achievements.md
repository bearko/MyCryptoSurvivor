---
id: SPEC-096
title: bearko.games Achievements — 14 IDs for the Hero Book and Extensions (Platform SPEC-008)
status: Implementing
pr: claude/achievement-system-overhaul-zzt7gf
phase: v1.4 Meta
kind: Added
---

# SPEC-096 — bearko.games 共通基盤のアチーブメント（名鑑のヒーロー 11・エクステンション 3）

- **Status**: Implementing
- **関連**: SPEC-039（共通基盤のトロフィー）・SPEC-040（RTA）・SPEC-048（RTA ABSOLUTE ×2.0）・SPEC-090（スキルツリー・GUM・ゴールドダスト）
- **共通基盤**: bearko/mycryptoportfolio の SPEC-008（アチーブメントの名鑑。 5.1「ゲーム側で送るもの」）・`docs/ACHIEVEMENT_CATALOG.md`・`platform/trophies.js`

## 1. 背景

共通基盤は「トロフィー」を「**アチーブメント**」に改め、 ヒーロー名鑑 100 枚とエクステンション 39 個に組み直した（作者の決定 2026-10-18）。
本作の割り当ては名鑑のヒーロー 11 枚（No.023〜033）とエクステンション 4 個（うち `survivor.visit` は SDK が自動で送る）。
いま本作が送っているのは `survivor.stage1` と `survivor.clear` の 2 つだけ（SPEC-039）。 残り 12 個を、 条件を満たしたときに送る。

共通基盤の定義がまだ本番に出ていなくても、 知らない ID は共通基盤が 400 ではじくだけで、 遊びには影響しない。

## 2. 送るもの

| 種類 | No. | ID | 名前（共通基盤） | 条件 | いつ・どこで | 判定 |
|---|---|---|---|---|---|---|
| ヒーロー | 023 | `survivor.stage1` | 狼王ロボ | 最初のステージをクリア（ボス撃破か 5 分耐久） | ステージの終わり（`triggerStageEndOrTransition`） | その場 |
| ヒーロー | 024 | `survivor.awaken` | 荒野の復讐者 | スキルツリーの根「サバイバーの覚醒」を解放 | 起動時・セーブ（`mcs.meta.v1`）が変わったとき | セーブ |
| ヒーロー | 025 | `survivor.stage2` | 幻の生存者 | ステージ 2 をクリア | ステージの終わり | その場 |
| ヒーロー | 026 | `survivor.tree5` | 変身 | スキルツリーの節を 5 つ取る（根は数えない。 段は数えない） | 起動時・セーブが変わったとき | セーブ |
| ヒーロー | 027 | `survivor.stage3` | 不屈のガンマン | ステージ 3 にたどり着く | ステージ 3 の始まり（`startBattle`） | その場 |
| ヒーロー | 028 | `survivor.fao` | フンババとの戦い | 覚醒魔王ファオ（敵 373）を倒す | ステージの終わりで、 そのステージのボスがファオで、 ボスを倒していた | その場 |
| ヒーロー | 029 | `survivor.capstone` | 六韜 | スキルツリーの奥義（`kind: "capstone"`）をひとつ解放 | 起動時・セーブが変わったとき | セーブ |
| ヒーロー | 030 | `survivor.clear` | ロシアの怪僧 | 全 3 ステージをクリア | 最後のステージの終わり | その場 |
| ヒーロー | 031 | `survivor.allboss` | 人中に呂布あり | 3 体のボスをすべて倒して全クリア | 最後のステージの終わりで、 全ステージの snapshot にゴールドダストがある（＝ボス撃破） | その場 |
| ヒーロー | 032 | `survivor.rta` | ワンホールショット | RTA で全ステージを完走 | 最後のステージの終わりで `state.rtaMode`（RTA ABSOLUTE ×2.0 も含む） | その場 |
| ヒーロー | 033 | `survivor.absolute` | 蒼狼 | ABSOLUTE の 4 軸すべて ×2.0 以上で全クリア | 最後のステージの終わりで `regulation === "ABSOLUTE"`、 4 軸すべて ≥ 2.0（RTA ABSOLUTE ×2.0 も含む） | その場 |
| エクステンション | — | `survivor.firstboss` | タイガーシュート | 初めてボスを倒す | 起動時・セーブが変わったとき（`earned.dust > 0`。 ゴールドダストはボスを倒したときだけ入る） | セーブ |
| エクステンション | — | `survivor.chest` | 世界を駆けたドラムライン | 宝箱を初めて開ける | 宝箱を壊した瞬間（`dropFromProp`） | その場 |
| エクステンション | — | `survivor.runs10` | 黄金氷河期 | 挑戦を通算 10 回終える | 起動時・セーブが変わったとき（`runs >= 10`） | セーブ |

- `survivor.visit` は SDK が自動で送るので、 ゲームからは送らない。 `cross.*` も送らない
- どのゲームモード・レギュレーションでも送る（SPEC-039 と同じ。 本作の RTA は使い捨てのセーブを持たないので、 除く場面はない）
- **セーブから判定するもの**は、 起動時（共通基盤の `init` が終わってから）と、 `mcs.meta.v1` が書かれるたび（`onMetaChange`）に「いま満たしているもの」をまとめて送る。 前から遊んでいる人にも付く
  - `firstboss` は SPEC-090 より前にボスを倒した人には、 次にボスを倒すまで付かない（それより前の撃破はセーブに残っていない）
- 新しい保存項目は足さない（`META_VERSION` は変えない）

## 3. 送り方

- `js/platform.js` に送る列を持つ（`unlockAchievements(ids)`）
  - **1 つずつ順に送る**（前の `unlockTrophy` の返事を待ってから次）。 未ログインの最初の書き込みで仮アカウントができるため
  - 共通基盤の `init` が終わるのを待ってから送り始める
  - **同じ起動で同じ ID は 1 度しか送らない**（失敗しても送り直さない。 次の起動で、 セーブから判定するものはまた送られる）
  - SDK がない・失敗するときは何もしない（`console.warn` だけ。 SPEC-039 の作法）
- 条件の判定は純関数（`tests/platform.test.mjs`）
  - `trophyIdsForStageEnd(stageIdx, stageCount, ctx)` — ステージの終わり（stage1・stage2・fao・clear・allboss・rta・absolute）
  - `achievementIdsForStageStart(stageIdx, stageCount)` — ステージの始まり（stage3）
  - `achievementIdsForMeta(meta)` — セーブ（awaken・tree5・capstone・firstboss・runs10）

## 4. 画面の文言

- プレイヤーに見える文言に「トロフィー」は無い（通知は SDK が出す）。 README の説明を「アチーブメント」に改める
- ゲーム内でアチーブメントの名前・絵は出していない

## 5. 非ゴール

- ゲーム内にアチーブメントの一覧を出すこと（図鑑は共通基盤のポータル）
- アチーブメントで報酬（GUM・ゴールドダスト・強さ）を配ること
- 遊びの挙動・バランスを変えること

## 6. テスト

- `node --test tests/*.test.mjs`
  - ステージの終わり・始まり・セーブ → ID の対応（境界：ABSOLUTE の 1 軸だけ 1.9、 ボスを 1 体倒し損ねた全クリア、 5 分耐久のファオのステージ）
  - 送る列：1 つずつ順に送る（前の返事を待つ）、 同じ ID を 2 度送らない、 SDK がない・例外でも止まらない
- 手で：スキルツリーの根を取る → 「荒野の復讐者」の通知（共通基盤の公開後）
