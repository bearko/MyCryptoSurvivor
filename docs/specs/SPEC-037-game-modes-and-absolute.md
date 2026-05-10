---
id: SPEC-037
title: Game Modes — NORMAL / ABSOLUTE Regulation
status: Implementing
pr: feat/spec-037-game-modes-and-absolute
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-037 — Game Modes (NORMAL / ABSOLUTE Regulation)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 現行を 「NORMAL」 として、 「ABSOLUTE」 を追加。
> タイトル → ゲームモード選択 → ヒーロー選択 の順に遷移。
> ABSOLUTE: ユーザーが 4 軸 (= 出現数 / HP / 攻撃力 / スピード) を調整、 スコア倍率がかかる。
> ランキングにレギュレーション + 倍率を追記、 レギュレーションで filter 可。
> ゲームオーバー時は 「タイトルに戻る」 「今のレギュレーションで再走」 の 2 択。

mycryptotactics の ABSOLUTE レギュレーションを参考。

## 2. ゴール

- タイトル → モード選択画面 → ヒーロー選択 の 3 段遷移
- NORMAL = 全 4 軸 1.0× / スコア倍率 1.00
- ABSOLUTE = 4 軸を 0.5〜5.0 (= 0.25 step) で個別調整 / スコア倍率 = 4 軸の算術平均
- 雑魚 enemy にのみ ABSOLUTE 倍率を適用 (= ボスは絶対値維持)
- スコア最終値 = base × regulationMul を ranking submit
- ranking 一覧にレギュ列追加 + 「全 / NORMAL / ABSOLUTE」 フィルタ
- Game Over に 「タイトルに戻る」 + 「今のレギュレーションで再走」 2 択

## 3. データ / 状態

### 3.1 `js/constants.js`

```js
REGULATION_NORMAL    = "NORMAL"
REGULATION_ABSOLUTE  = "ABSOLUTE"
ABSOLUTE_SLIDER_MIN  = 0.5
ABSOLUTE_SLIDER_MAX  = 2.0
ABSOLUTE_SLIDER_STEP = 0.25
ABSOLUTE_SLIDER_DEFAULT = 1.0
ABSOLUTE_AXES = [
  { key: "spawnMul", labelKey: "absolute.axis.spawn" },
  { key: "hpMul",    labelKey: "absolute.axis.hp"    },
  { key: "dmgMul",   labelKey: "absolute.axis.dmg"   },
  { key: "speedMul", labelKey: "absolute.axis.speed" },
];

computeRegulationMul(regulation, absolute)
  // NORMAL → 1.0
  // ABSOLUTE → (spawn + hp + dmg + speed) / 4 を 小数 2 桁で round
```

### 3.2 `js/state.js`

```js
state.regulation = "NORMAL";
state.absolute = { spawnMul: 1.0, hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0 };
```

## 4. 実装

### 4.1 モード選択画面 (`index.html` + `js/mode-select.js`)

- `<section id="gameModeSelectScreen" class="title-screen mode-select hidden">`
- 2 つのカード: NORMAL / ABSOLUTE
- ABSOLUTE カードに 4 つの `<input type="range">` (= 0.5..5.0 step 0.25)
- 各カードに 「これで始める」 ボタン + バックボタン
- スライダー操作で右上の倍率表示が realtime 更新
- `installModeSelect(onPick)` を `init()` から呼出、 onPick は `openHeroSelectModal` をトリガ
- `dismissTitle()` を `showModeSelect()` 呼出に変更

### 4.2 雑魚への適用 (`js/battle/enemies.js`)

- `tickEnemies` 内 spawn 間隔: `ENEMY_SPAWN_INTERVAL_MS * stage.spawnIntervalMul / state.absolute.spawnMul` (= mul=2 で 2× 出現)
- `spawnEnemyAtRing`: 雑魚のみ `state.absolute.{hpMul, dmgMul, speedMul}` を hp / dmg / speed に乗算 (= ボスは絶対値維持)

### 4.3 スコア乗算 (`js/battle/activity-report.js` + `js/battle/gameover.js`)

```js
const baseScore = computeScore(state.run);
const regMul    = computeRegulationMul(state.regulation, state.absolute);
const score     = Math.round(baseScore * regMul);
submitScore({ ..., regulation, regulationMul: regMul });
```

活動レポートの 「スコア」 欄も `score = baseScore × regMul` を表示、 上に 「レギュレーション: ABSOLUTE ×1.50」 行を追加。

### 4.4 ranking UI (`index.html` + `js/ranking-ui.js`)

- toolbar に `#rankingRegFilter` (= 「全 / NORMAL / ABSOLUTE」) を追加
- `fetchRanking({ regulation })` に渡す
- table column 6 列化 (= `# / プレイヤー / スコア / レギュ / 撃破 / 時間`)
- レギュ列の表示は NORMAL / `ABS ×1.50` のような短縮形

### 4.5 GAS バックエンド (`tools/gas-ranking.gs`)

- HEADERS に `regulation` / `regulationMul` を追加
- `doGet` に `?regulation=NORMAL` フィルタ
- `seedSampleData` の dummy data: 偶数 i は NORMAL、 奇数 i は `ABSOLUTE` + ランダム mul (1.0..2.0)

### 4.6 Game Over の 2 ボタン化 (`index.html` + `js/battle/gameover.js`)

- `<button id="gameOverRetry">` ラベルを 「リトライ」 → 「今のレギュレーションで再走」
- 新規 `<button id="gameOverToTitle">` 「タイトルに戻る」 (= state リセット + #app 隠して #titleScreen 表示)

## 5. 受入基準

### モード選択
- [ ] Press to Start で **モード選択画面** (= titleScreen を hide、 gameModeSelectScreen を show)
- [ ] NORMAL カードで 「これで始める」 → ヒーロー選択へ、 倍率表示 ×1.00
- [ ] ABSOLUTE カードでスライダーを動かすと右上の倍率がリアルタイム更新
- [ ] ABSOLUTE で 「これで始める」 → ヒーロー選択へ、 state.regulation = ABSOLUTE / state.absolute = スライダー値
- [ ] 「タイトルに戻る」 でタイトル画面に戻れる

### バトル中の効果
- [ ] ABSOLUTE spawnMul = 2.0 で雑魚出現が約 2× 密度に
- [ ] ABSOLUTE hpMul = 2.0 で雑魚 hp が約 2×
- [ ] ABSOLUTE dmgMul = 2.0 で雑魚 dmg が約 2×
- [ ] ABSOLUTE speedMul = 2.0 で雑魚 speed が約 2×
- [ ] ボスは ABSOLUTE 倍率を **受けない** (= 絶対値維持)

### スコア
- [ ] NORMAL: 活動レポート 「スコア: N」、 ranking 送信値 = N
- [ ] ABSOLUTE 全 1.5×: 活動レポート 「レギュレーション: ABSOLUTE ×1.50」、 「スコア: N×1.5」、 送信値同
- [ ] レポートタイトル下にレギュ表示

### ランキング
- [ ] レギュ列に NORMAL / ABS ×Mul が表示
- [ ] フィルタ 「全 / NORMAL / ABSOLUTE」 で結果が絞込
- [ ] 古いデータ (= regulation 列が無い行) は NORMAL として扱われる

### Game Over
- [ ] HP 0 で 「タイトルに戻る」 と 「今のレギュレーションで再走」 の 2 ボタンが並ぶ
- [ ] 「再走」 で同じ regulation / absolute のままステージ 1 から再開
- [ ] 「タイトルに戻る」 でタイトル画面 → Press to Start で再びモード選択

### 共通
- [ ] DevTools console エラー無し
- [ ] 言語切替で全文言が JP/EN 切替

## 6. リスク

- **regulation データ無しの旧スコア混在** — GAS doGet で `_str(r[idx.regulation]) || "NORMAL"` でデフォルト化、 互換 OK
- **score 上限**: ABSOLUTE 全 2.0 で base score × 2 を許容。 レポートのスコア式 (= 全 1.0 で 5000 + α、 上限 ~80000) なので絶対値が極端に大きくはならない
- **ABSOLUTE で全 0.5 にしてスコア稼ぐ抜け穴** — `regMul = 0.5` で base score も半減するので負け。 妥当な抑止
- **ボス倍率不適用** — 仕様 (= ボス絶対値で固定難易度の 「壁」 を残す)。 後続で 「ボスにも mul」 オプション追加検討可

## 7. 参考

- mycryptotactics ABSOLUTE レギュレーション (= ユーザー参考リンク)
- 既存 SPEC-026 (= stage muls の枠組み)
- 既存 SPEC-035 (= ranking-client + GAS 基盤)
