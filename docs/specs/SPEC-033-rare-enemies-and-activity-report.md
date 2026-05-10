---
id: SPEC-033
title: Rare Enemies + Magic Card + Activity Report + Stage 2/3 Boss Clear Fix
status: Implementing
pr: feat/spec-033-rare-enemies-and-activity-report
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-033 — Rare Enemies + Magic Card + Activity Report + Stage 2/3 Boss Clear Fix

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ステージ 2 と 3 でもボスを倒したらその時点でステージクリアとしたい
>
> ステージ 3 クリアしたら以下を活動レポートとして:
> - 選択したヒーロー
> - ステージごとの獲得エクステとレベル
> - ステージごとのクリア時間
> - 総クリア時間
> - 総撃破数
> - 上記をもとに算出したスコアリング
>
> レアエネミー (= クリーパー / ラビット / ラブレター / バイトバンディット の フラペチーノ ドッピオ 4 種) を 1 分間に 1 回のペースで低確率で出現。 HP 2 倍。 倒すと CE と一緒に 「マジックカード:光輝」 をドロップ、 取得で即時レベルアップ (= 既得 CE は持ち越し)。

## 2. ゴール

- **ステージ 2 / 3 のボス撃破でクリア**: damage.js の `BOSS_ENEMY_ID` 固定参照 (= ヨシュカ id 171 のみ) を `e.isBoss` 参照に変更
- **活動レポート**: 全ステージ clear 時に、 hero / 各ステージ snapshot / 総合スコア を表示する専用モーダル
- **レアエネミー**: 4 種を MCH カタログから採用、 1 分に 1 回スポーン、 hp ~2× 相当
- **マジックカード**: レア撃破で同位置にドロップ、 取得で即時 LV up (= state.xp は減らさない)

## 3. データ

### 3.1 新規敵 (= `data/enemies.json` + `js/constants.js` ENEMY_SPECS)

| enemyId | JA | hp | dmg | speed | radius | xpValue | 備考 |
|---|---|---|---|---|---|---|---|
| 147 | クリーパー フラペチーノ ドッピオ | 160 | 16 | 78 | 14 | 20 | rare |
| 170 | バイトバンディット フラペチーノ ドッピオ | 400 | 24 | 65 | 21 | 35 | rare |
| 396 | ラビット フラペチーノ ドッピオ | 220 | 18 | 95 | 13 | 25 | rare |
| 407 | ラブレター フラペチーノ ドッピオ | 280 | 20 | 70 | 16 | 30 | rare |

`isRare: true` フラグ。 雑魚と同様に **stage の `enemyHpMul` / `enemyDmgMul` / `xpMul`** で更にスケールする (= 後ステージほど硬い)。

### 3.2 マジックカード (= `js/constants.js`)

```js
MAGIC_CARD_EXT_ID = 5178;        // MCH ext: マジックカード:光輝
MAGIC_CARD_RADIUS = 12;
MAGIC_CARD_PICKUP_RADIUS = 32;
MAGIC_CARD_ICON_SIZE = 32;
```

### 3.3 レアスポーンタイミング

```js
RARE_ENEMY_IDS = [147, 170, 396, 407];
RARE_SPAWN_INTERVAL_MS = 60000;   // 1 分に 1 回
```

`tickEnemies` で `nowMs - state.battle.lastRareSpawnMs >= RARE_SPAWN_INTERVAL_MS` のときランダム 1 体スポーン。 ステージ開始 1 分後から有効 (= 序盤 1 分は出さない、 安心猶予)。

## 4. 実装

### 4.1 ボス撃破判定の修正 (= `js/battle/damage.js`)

旧: `if (e.enemyId === BOSS_ENEMY_ID) state.battle.bossDefeated = true;`
新: `if (e.isBoss) state.battle.bossDefeated = true;`

→ ステージ 2 (= ファオ id 373) / ステージ 3 (= yamap id 1189) のボス撃破でも即時 `bossDefeated = true` がセットされ、 次 tick で `triggerStageEndOrTransition` が発火。

### 4.2 マジックカード機構

- `js/battle/magic-cards.js` 新規:
  - `spawnMagicCard(x, y)` — `state.battle.magicCards` に push
  - `tickMagicCards(dt)` — プレイヤー周囲 (= `MAGIC_CARD_PICKUP_RADIUS * pickupMul`) で吸収
    - 取得したらまとめて `state.level += picked` + `state.xpToNext` を Picked 段階分進行 (= XP 自体は減らさない、 既得 CE は持ち越し)
    - `triggerLevelUpPick(picked)` で連鎖モーダル
- `js/battle/damage.js`: 撃破処理で `if (e.isRare) spawnMagicCard(e.x, e.y)`
- `js/battle/sprites.js`: `getMagicCardSprite()` (= ext 5178 アイコン)
- `js/battle/render.js`: gem 描画ブロック直後に `magicCards` を描画 (= 光彩オーラ + ext sprite)
- `js/battle/index.js`: ループに `tickMagicCards(dt)`、 `startBattle` で `magicCards.length=0` + `lastRareSpawnMs` リセット
- `js/state.js`: `state.battle.magicCards` / `lastRareSpawnMs` 追加

### 4.3 ステージ snapshot + 活動レポート

#### state

```js
state.run = {
  stages:        [],   // [{idx, nameKey, elapsedMs, kills, level, ownedExtensions}]
  totalKills:    0,
  totalElapsedMs: 0,
};
```

`applyHeroPick` (= `js/main.js`) で初期化、 retry でも同様にクリア。

#### snapshot タイミング

`triggerStageEndOrTransition` (= `js/battle/stage-transition.js`) の冒頭で:

```js
state.run.stages.push({
  idx, nameKey, elapsedMs, kills, level,
  ownedExtensions: state.ownedExtensions.map(o => ({...o})),
});
state.run.totalKills    += kills;
state.run.totalElapsedMs += elapsedMs;
```

(= `startBattle` で各種 reset される **前** に保存)

#### 全ステージ clear → 活動レポート

`triggerStageEndOrTransition` で `isLast` 分岐時、 旧 `triggerGameOver("clear")` を `triggerActivityReport()` に置換。

### 4.4 活動レポートモーダル

- `index.html`: `#activityReportModal` (= `.gameover-modal` クラス再利用 + 専用 `.report-*` クラス)
- `js/battle/activity-report.js` 新規:
  - `triggerActivityReport()` — pauseTime + stopBgm + win SE + render + open
  - `_renderReport()` — ヒーロー名 / per-stage table / 総合スタッツ / score
  - `_onRetryClick()` — `state.currentStageIdx=0` + `state.run` リセット → `startBattle`
  - `_onSubmitClick()` — `submitScore` で score / kills / elapsedSec を送る
- `data/i18n/ui.json`: `report.title` / `report.hero` / `report.totalTime` / `report.totalKills` / `report.score` / `report.col.*` (= 5 列見出し)
- `css/components.css`: `.report-card` / `.report-hero` / `.report-stages` / `.report-totals` (= mobile breakpoint 込)

#### スコア式

```js
score = totalKills * 100
      + bestLevel * 500
      + uniqueExtCount * 300
      + max(0, 60000 - totalSec * 50)
      + 5000 (= 全クリア基本)
```

(= 撃破 / 最高 Lv / 多様な extension / 速度 / 完走基本)

## 5. 受入基準

### ボス撃破
- [ ] ステージ 1 ヨシュカ撃破で 「ステージクリア!」 (= 既存挙動)
- [ ] **ステージ 2 ファオ撃破で 「ステージクリア!」** (= 新)、 5 分耐久ではなく即時
- [ ] **ステージ 3 yamap 撃破で 「活動レポート」** (= 新)、 5 分耐久ではなく即時

### レアエネミー
- [ ] ステージ開始から 1 分後に最初のレアが出現
- [ ] 以降約 60 sec 周期で 1 体ずつ追加スポーン (= 4 種からランダム)
- [ ] レアの hp / dmg は通常雑魚より明らかに硬い / 痛い (= ステージ mul も乗る)
- [ ] レア撃破で **CE gem + マジックカード** が同位置に 2 つドロップ
- [ ] マジックカード取得で **即座に level up モーダル** が開く
- [ ] 取得時に state.xp は減らない (= 既得 CE 持ち越し)

### 活動レポート
- [ ] ステージ 3 yamap 撃破 → 活動レポートが開く (= 既存 Game Over Clear modal は出ない)
- [ ] hero 名 / 各ステージ行 (= ステージ名 / 時間 / 撃破 / Lv / 取得 ext) / 総時間 / 総撃破 / スコア が表示
- [ ] 取得 extension は `Lv.N` 付きで列挙
- [ ] スコア式に整合する数値が出る
- [ ] ranking 送信ボタン + リトライボタンが動作
- [ ] リトライでステージ 1 から、 `state.run` も初期化

### 共通
- [ ] HP 0 のときは従来通り 「ゲームオーバー」 モーダル (= 死亡 path は変更なし)
- [ ] 言語切替で活動レポートも更新
- [ ] DevTools console エラー無し

## 6. リスク

- **Magic Card と通常 LV up が同 frame で重なる** — `triggerLevelUpPick(N)` はキューイングするので連鎖で 2 モーダル開く。 既存実装と互換
- **マジックカードを取らずに死んだ場合** — `magicCards` は startBattle でクリア。 持ち越しは 1 ステージ内のみ (= 仕様通り)
- **レア HP × stage mul で過剰** — Stage 3 で hp 400 × 2.0 = 800 の Byte Bandit Frappuccino。 Lv up 後の DPS で削れる想定、 必要なら後続再 tune
- **活動レポートの ranking 送信フィールド** — 既存 `submitScore` を流用しているが、 score 算出ロジックがレポート専用。 ranking server 側のスキーマは数値のままなので互換

## 7. 参考

- MCH 公式: 147 / 170 / 396 / 407 enemy 画像、 5178 ext 画像 (= 全 200 OK 確認済)
- `js/battle/stage-transition.js` (= SPEC-030)
- `js/battle/gameover.js` (= SPEC-009 死亡 / clear 分岐)
- ユーザー指示: 「ステージ 2 と 3 でもボスを倒したらその時点でステージクリア」 「マジックカード：光輝 をドロップ」 「獲得 CE は持ち越し」
