---
id: SPEC-004
title: Survival HUD (= Day N + HP / 体温 / 食料 + tick decay)
status: Done
pr: 5
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-004 — Survival HUD (= Day N + HP / 体温 / 食料 + tick decay)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-001 / SPEC-002 / SPEC-003 (= main にマージ済)

## 1. 背景 / 課題

PR #4 (SPEC-003) で データソース層 (= heroes / extensions / enemies) は揃った。 だが UI は依然として
「ヒーローを選んで Day 1 に入る」 までで終わっており、 **時間が進む / 体力が減る** の手応えが無い。

テンプレート側にはすでに以下のスケルトンがある:

- `setInterval(onTick, TICK_INTERVAL_MS)` (= 1 sec/tick)
- `state.tickCount` / `state.weekProgress` / `state.year` / `state.month` / `state.week`
- `advanceWeek()` (= 7 ticks ごとにカスケード)
- `state.pauseFlags` + `pauseTime()` / `resumeTime()`
- `#dateLabel` (= 現状 `2018 年 1 月 1 週` 表示中)

これらを サバイバル文脈に reframe (= 週 → Day) し、 HUD に **Day N + 3 スタッツ (HP / 体温 / 食料)** を
出すのが本 SPEC のスコープ。

## 2. ゴール

- `state.day` 導入 (= 初期値 1、 7 tick = 1 day で繰り上げ、 既存 `advanceWeek()` に同梱)
- `state.stats` 導入 (= `{ hp, temp, food }` 各 0–100、 初期値 `{100, 50, 100}`)
- 1 tick ごとに `state.stats` を線形 decay (= pauseFlags > 0 のときは凍結)
- HUD section を `<header>` と `<section.stage>` の間に新設し、 Day N + 3 バーを表示
- 3 バーは `data-stat` 属性で色分け (= HP 赤 / 体温 青 / 食料 緑)、 値表示は数値 + バー
- ja / en 両言語でラベル即時切替
- `#dateLabel` (= テンプレ由来) は現状維持で年月週を表示し続ける (= MCT/MCF compat、 削除しない)
- 既存の hero modal / lang 切替 / pauseFlags 不変条件をすべて保持

## 3. 非ゴール

- HP=0 / 食料=0 等の Game Over 処理 (= 別 SPEC)
- スタッツ回復行動 (= 食事 / 焚き火 / 休息) (= 別 SPEC、 SPEC-005 / SPEC-007 を予定)
- スタッツの hero/extension stats による補正 (= 別 SPEC、 hero stats と stats max を結ぶのは後)
- 戦闘 / 遭遇による HP ダメージ反映 (= SPEC-006)
- save / load の `state.stats` 永続化 (= 別 SPEC)
- スタッツのバランス調整数値の最終化 (= Phase 1 では暫定値、 後続でチューニング)

## 4. ユーザー体験

### 4.1 シナリオ

1. Title → Press to Start → ヒーロー選択 → 「冒険を始める」
2. main 画面に **HUD バー** が出現:
   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ MyCryptoSurvivor   🐢 コナン・ドイル          2018 年 1 月 1 週│ ← header (= 既存)
   ├──────────────────────────────────────────────────────────────┤
   │ Day 1   HP ▓▓▓▓▓▓▓▓▓▓ 100   体温 ▓▓▓▓▓ 50   食料 ▓▓▓▓▓▓▓▓ 100│ ← HUD (= new)
   ├──────────────────────────────────────────────────────────────┤
   │   ここにサバイバル本編が描画される                          │ ← stage (= 既存)
   └──────────────────────────────────────────────────────────────┘
   ```
3. 1 秒ごとに各バーが滑らかに減る (= 食料が一番速く、 HP は最遅)
4. 7 秒ごとに `Day` カウンタが 1 増える (= 既存 `advanceWeek()` と同期)
5. ヘルプモーダル等を開くと **HUD の値が止まる** (= pauseFlags 連動)、 閉じると再開
6. JP/EN 切替で 「Day 1」 ↔ 「1 日目」 のような表示が即時切替

### 4.2 表示仕様

| 領域 | コンテンツ | data 属性 | 備考 |
|---|---|---|---|
| `#hudDay` | "Day {n}" / "{n} 日目" | — | i18n キー `hud.day` |
| `#hudHp` | "HP" + bar(0–100) + 数値 | `data-stat="hp"` | 色 `--hp` 赤系 |
| `#hudTemp` | "体温" + bar(0–100) + 数値 | `data-stat="temp"` | 色 `--temp` 青系 |
| `#hudFood` | "食料" + bar(0–100) + 数値 | `data-stat="food"` | 色 `--food` 緑系 |

数値は `Math.floor` で表示 (= 小数点は内部だけ)。

## 5. 技術設計

### 5.1 state 拡張

```js
// state.js
export const state = {
  // ... 既存 ...
  day: 1,                                          // ← 新規
  stats: { hp: 100, temp: 50, food: 100 },         // ← 新規
  statsMax: { hp: 100, temp: 100, food: 100 },     // ← 新規
};
```

### 5.2 constants 追加

```js
// constants.js
export const STATS_INITIAL = { hp: 100, temp: 50, food: 100 };
export const STATS_MAX     = { hp: 100, temp: 100, food: 100 };
// 1 tick = 1 sec、 1 day = 7 tick (= SECONDS_PER_WEEK 流用)
export const STATS_DECAY_PER_TICK = {
  hp:   0.02,
  temp: 0.05,
  food: 0.10,
};
```

decay の根拠 (= Phase 1 暫定値):
- food: 1000 ticks (= 約 17 分) で 100 → 0 (= プレイ初期で「お腹空いた」 がそろそろ来る感)
- temp: 1000 ticks (= 約 17 分) で 50 → 0 (= 同上、 「寒い」 が並走)
- hp:   5000 ticks (= 約 83 分) で 100 → 0 (= 食料 / 体温が起点で本来は 0 にならない設計だが、 Phase 1 では単独 decay)

### 5.3 関数

| モジュール | 関数 | 役割 |
|---|---|---|
| `js/survival.js` (新規) | `tickStatsDecay()` | `state.stats` を `STATS_DECAY_PER_TICK` で減らし `clampStats()` |
| | `clampStats()` | `[0, statsMax[k]]` に矯正 |
| | `getStatRatio(key)` | `state.stats[key] / state.statsMax[key]` (= 0..1) |
| | `renderHud()` | `#hud` 配下を全部更新 (= Day + 3 bar 値 + width%) |
| `js/main.js` (改修) | `onTick` | `tickStatsDecay()` 呼び出し追加、 `renderHud()` 呼び出し追加 |
| | `advanceWeek` | `state.day++` を追加 (= 既存処理と同列) |

### 5.4 HUD DOM (= index.html)

`<header>` の直後、 `<section class="stage">` の手前に挿入:

```html
<section class="hud" id="hud" aria-live="polite">
  <span class="hud__day"  id="hudDay" data-i18n-tpl="hud.day">Day 1</span>
  <div   class="hud__bar" id="hudHp"   data-stat="hp">
    <span class="hud__bar-label" data-i18n="hud.stats.hp">HP</span>
    <span class="hud__bar-track"><span class="hud__bar-fill"></span></span>
    <span class="hud__bar-value">100</span>
  </div>
  <div   class="hud__bar" id="hudTemp" data-stat="temp">
    <span class="hud__bar-label" data-i18n="hud.stats.temp">体温</span>
    <span class="hud__bar-track"><span class="hud__bar-fill"></span></span>
    <span class="hud__bar-value">50</span>
  </div>
  <div   class="hud__bar" id="hudFood" data-stat="food">
    <span class="hud__bar-label" data-i18n="hud.stats.food">食料</span>
    <span class="hud__bar-track"><span class="hud__bar-fill"></span></span>
    <span class="hud__bar-value">100</span>
  </div>
</section>
```

`renderHud()` が `data-i18n-tpl="hud.day"` を見て `Day {n}` テンプレを `tpl()` で展開。 bar fill は
`style.width = ratio*100 + "%"` で更新。

### 5.5 i18n キー

| キー | ja | en |
|---|---|---|
| `hud.day`        | "{n} 日目"     | "Day {n}" |
| `hud.stats.hp`   | "HP"           | "HP" |
| `hud.stats.temp` | "体温"         | "Temp" |
| `hud.stats.food` | "食料"         | "Food" |

### 5.6 CSS

`base.css` に色変数を追加:

```css
:root {
  --hp:    #e76060;   /* 赤 */
  --temp:  #56ccf2;   /* 青 */
  --food:  #5ecf8a;   /* 緑 */
}
```

`components.css` に HUD コンポーネントを追加:

```css
.hud {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 0.85rem;
}
.hud__day { font-weight: 600; min-width: 60px; }
.hud__bar { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.hud__bar-label { width: 32px; opacity: 0.9; }
.hud__bar-track {
  flex: 1; height: 8px; min-width: 40px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px; overflow: hidden;
}
.hud__bar-fill {
  display: block; height: 100%; width: 100%;
  transition: width 0.4s linear;
}
.hud__bar[data-stat="hp"]   .hud__bar-fill { background: var(--hp); }
.hud__bar[data-stat="temp"] .hud__bar-fill { background: var(--temp); }
.hud__bar[data-stat="food"] .hud__bar-fill { background: var(--food); }
.hud__bar-value { width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
```

`responsive.css` で 640px 未満は 2 行レイアウト (= Day + 3 bar を 縦折り):

```css
@media (max-width: 640px) {
  .hud { flex-wrap: wrap; gap: 6px 12px; }
  .hud__day { flex-basis: 100%; }
}
```

### 5.7 onTick への組み込み

```js
// main.js
function onTick() {
  if (state.pauseFlags > 0) return;
  state.tickCount++;
  state.weekProgress++;
  if (state.weekProgress >= SECONDS_PER_WEEK) advanceWeek();

  tickStatsDecay();   // ← new

  renderHeader();
  renderHud();        // ← new
}

function advanceWeek() {
  state.weekProgress = 0;
  state.week++;
  state.day++;        // ← new (= サバイバル Day カウンタ、 週カスケードと同期)
  // ... 既存 month/year カスケード ...
}
```

### 5.8 起動時の HUD 初期化

- `state.day` / `state.stats` は `state.js` の初期値で 1 / 100/50/100
- `init()` の最後 (= splash 解除前後) で 1 度 `renderHud()` を呼んで初期描画
- ヒーロー選択中 (= modal pauseTime) は HUD 自体は表示するが値は凍結 (= renderHud は呼ばれない、 既存 onTick が pauseFlags ガードのため)
- ヒーロー選択モーダル中も HUD バーが見えていてよい (= タイトル裏に既に main 画面が表示中のため)

### 5.9 言語切替の追従

`onLangChange()` 既存ハンドラで `renderHud()` を呼び、 `Day {n}` / `1 日目` の即時切替に追従。
bar の数値は言語非依存 (= そのまま)、 ラベル (= HP/体温/食料) は data-i18n で applyDataI18n が処理。

## 6. 実装フェーズ

| Phase | 内容 | コミット |
|---|---|---|
| **Phase 0** | SPEC-004 / SPEC-INDEX / CHANGELOG 更新 (+ SPEC-002/003 を Done に flip) | 第 1 commit |
| **Phase 1** | state 拡張 / constants / survival.js / index.html / i18n / css / main.js 接続 | 第 2 commit |

## 7. 受入基準 (= テストケース)

- [ ] 起動直後 HUD に `Day 1` / HP 100 / 体温 50 / 食料 100 が表示
- [ ] 1 秒経過で `food` が 99.9 (= 0.1 減) → DOM 上 `99` 表示 (= floor)
- [ ] 7 秒経過で `Day 2` に繰り上がる (= advanceWeek と同期)
- [ ] バー fill の width が `style.width: <ratio*100>%` で 0.4s linear 補間で動く
- [ ] hero modal を再度開く (= help modal でも) と HUD の値が **止まる** (= pauseFlags > 0)
- [ ] modal 閉じると再開
- [ ] JP/EN 切替で `Day 1` ↔ `1 日目` / `HP` `体温` `食料` ↔ `HP` `Temp` `Food` 即時切替
- [ ] 640px 未満で Day がフルワイドに、 3 bar が下段に折り返し
- [ ] DevTools console エラーなし
- [ ] `__state.stats.food` を直接書き換えても次の renderHud で反映
- [ ] `state.pauseFlags` leak なし (= 既存ペアを維持)

## 8. リスク・懸念

- **decay 数値の暫定性** — Phase 1 値は感覚値。 後続 SPEC で食事/暖房行動を入れたとき再チューニング。 SPEC タイトルにも 「暫定」 と明記
- **Day と year/month/week の二重表示** — `#dateLabel` は MCT/MCF compat で残し、 サバイバル文脈の主表示は HUD の Day。 違和感出る場合は別 SPEC で `#dateLabel` を非表示化検討
- **`state.day` と `state.week` の整合** — `advanceWeek` 内で同時に increment するため必ず一致するが、 直接 `state.day` を弄るデバッグ操作で乖離しうる。 これは window.__state 経由のみで `applyDayChange` ヘルパ等は今回作らない
- **renderHud 毎秒呼出のコスト** — DOM 操作は数箇所のみ (= 3 bar fill width + 4 数値 textContent)、 60Hz でない 1Hz なので余裕
- **save/load 未対応** — リロードで stats が初期値に戻る。 これは別 SPEC で永続化する

## 9. 参考

- `js/main.js` 既存 `onTick` / `advanceWeek` / `renderHeader`
- `js/state.js` 既存 `state` / `pauseTime` / `resumeTime`
- `js/constants.js` 既存 `TICK_INTERVAL_MS` / `SECONDS_PER_WEEK`
- `docs/charters/DEVELOPMENT_CHARTER.md` (= 関数命名 / pause-resume 不変条件)
- `docs/patterns/04-time-and-modals.md` (= pauseTime 設計、 modal 連鎖)
- MCT/MCF コードベースの `tickPassiveRestRecovery` (= 同形の状態遷移パターン)
