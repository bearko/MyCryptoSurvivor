# SPEC-005 — VS HUD slim (= HP のみ + XP + Level、 体温/食料 撤去)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-004 (= 体温/食料 を含む HUD)

## 1. 背景 / 課題

ユーザー指示でゲーム方向性を **ヴァンパイアサバイバーライク** に確定。
スキルは Extension で置き換え、 体温 / 食料の survival sim 系メタは VS の文脈に合わないため撤去する。
最終形の HUD には次が必要:

- **HP** (= 体力)
- **XP バー + Level** (= VS の経験値ゲージ)
- **時間カウンタ** (= VS の経過時間 / 後続 SPEC で `mm:ss` に再フォーマット)
- **kill 数** (= 後続 SPEC、 SPEC-007 で本実装)

本 SPEC では **HP / XP / Level + 経過時間** までを HUD に乗せ、
体温 / 食料を完全撤去する。

## 2. ゴール

- `state.stats` から `temp` / `food` を撤去 (= `state.stats = { hp }` に圧縮)
- `STATS_INITIAL` / `STATS_MAX` / `STATS_DECAY_PER_TICK` から `temp` / `food` を撤去
- `STATS_DECAY_PER_TICK.hp = 0` に変更 (= VS は idle decay しない、 ダメージは戦闘で)
- `state.xp` / `state.xpToNext` / `state.level` を追加 (= 初期 0 / 5 / 1)
- `state.elapsedTicks` を追加 (= 後続 SPEC の battle 用、 Day 計算は廃止)
- `advanceWeek()` の `state.day++` を削除 (= 撤去、 Day 表示も廃止)
- HUD: Day → 経過時間 (`mm:ss`) + Lv. N、 3 bar → HP bar + XP bar
- HP bar = 赤、 XP bar = 黄 (= VS feel)
- ja/en label: `hud.level` / `hud.elapsed` / `hud.stats.hp`
- DOM ID 互換: `#hudHp` は据置 (= 後続 SPEC が ref 済)

## 3. 非ゴール

- 戦闘ステージ canvas / 敵 / 武器 (= SPEC-006 以降)
- XP gem drop / pickup (= SPEC-007)
- Level up モーダル (= SPEC-008)
- 経過時間の表示形式国際化 (= `mm:ss` で固定、 zero-pad)
- save / load (= 別 SPEC)

## 4. 表示仕様

```
┌────────────────────────────────────────────────────────────────┐
│ MyCryptoSurvivor  🐢 コナン・ドイル                            │ ← header
├────────────────────────────────────────────────────────────────┤
│ Lv.1   00:00     HP ▓▓▓▓▓▓▓▓▓▓ 100      XP ░░░░░░░░░░ 0/5    │ ← HUD
├────────────────────────────────────────────────────────────────┤
│ ここにサバイバル本編が描画される                              │ ← stage
└────────────────────────────────────────────────────────────────┘
```

- `Lv.{n}` (= レベル、 i18n `hud.level` テンプレ)
- `mm:ss` (= 経過時間、 0:00 から ttick が回るたびに +1 sec)
- HP bar = 赤、 値は `current/max` 表記 (= "100/100" → 数値部のみ)
- XP bar = 黄 (= `--xp` 新規)、 値は `cur/next`

## 5. 技術設計

### 5.1 state 変更

```js
// state.js (= 既存を置換)
export const state = {
  // ... 既存 ...
  // SPEC-004 から SPEC-005 への置換:
  // OLD: day, stats: {hp, temp, food}, statsMax: {...}
  // NEW:
  stats:    { hp: 100 },
  statsMax: { hp: 100 },
  level: 1,
  xp: 0,
  xpToNext: 5,             // VS の最初の閾値
  elapsedTicks: 0,
};
```

`state.day` は完全に撤去 (= `__state.day` をどこからも参照しない)。

### 5.2 constants 変更

```js
// constants.js
// OLD: STATS_INITIAL = { hp:100, temp:50, food:100 } 等
// NEW:
export const STATS_INITIAL        = { hp: 100 };
export const STATS_MAX            = { hp: 100 };
export const STATS_DECAY_PER_TICK = { hp: 0 };   // VS: idle decay 無し
export const XP_INITIAL           = 0;
export const XP_TO_NEXT_INITIAL   = 5;
export const LEVEL_INITIAL        = 1;
```

### 5.3 survival.js の改修

- `tickStatsDecay()` は `hp` のみ参照、 `clampStats()` も同様
- `STAT_KEYS = ["hp"]` に短縮
- `renderHud()`:
  - `#hudDay` → `#hudLevel` + `#hudElapsed` の 2 セルに分割
  - `#hudTemp` / `#hudFood` 撤去
  - `#hudXp` 追加 (= XP bar、 fill = `xp / xpToNext`、 値 `xp/xpToNext`)
- 経過時間 format: `formatElapsed(ticks)` を export (= `Math.floor(ticks/60):pad(ticks%60)`)
  - 1 tick = 1 sec を継承。 60 tick = 1 min。 `mm:ss`、 m が 99 を超えたら 3 桁 (= 後続 stage で発生する想定は無いが防御的)

### 5.4 main.js の onTick / advanceWeek

- `state.elapsedTicks++` を `onTick()` に追加 (= pauseFlags ガードの内側)
- `advanceWeek()` の `state.day++` を削除 (= 既存呼出は維持、 year/month/week は legacy として残す)
- `state.day` の参照箇所を全削除 (= grep で確認)

### 5.5 index.html HUD 改修

```html
<section class="hud" id="hud" aria-live="polite">
  <span class="hud__level"   id="hudLevel">Lv.1</span>
  <span class="hud__elapsed" id="hudElapsed" aria-label="elapsed time">00:00</span>
  <div class="hud__bar" id="hudHp" data-stat="hp" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
    <span class="hud__bar-label" data-i18n="hud.stats.hp">HP</span>
    <span class="hud__bar-track"><span class="hud__bar-fill"></span></span>
    <span class="hud__bar-value">100</span>
  </div>
  <div class="hud__bar" id="hudXp" data-stat="xp" role="meter" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">
    <span class="hud__bar-label" data-i18n="hud.stats.xp">XP</span>
    <span class="hud__bar-track"><span class="hud__bar-fill"></span></span>
    <span class="hud__bar-value">0/5</span>
  </div>
</section>
```

### 5.6 i18n 変更

| キー | ja | en |
|---|---|---|
| `hud.level`     | "Lv.{n}"      | "Lv.{n}" |
| `hud.stats.hp`  | "HP"          | "HP" (= 据置) |
| `hud.stats.xp`  | "XP"          | "XP" |

撤去: `hud.day` / `hud.stats.temp` / `hud.stats.food`

### 5.7 CSS 変更

`base.css`:
- `--hp` 据置 (= 赤)
- `--xp` 新規 (= 黄、 `#f0c14b`)
- `--temp` / `--food` の color 変数は **データ撤去後に未使用** だが残置 (= 後続 SPEC で別目的に使う可能性)

`components.css`:
- `.hud__day` を `.hud__level` + `.hud__elapsed` に置換
- `.hud__bar[data-stat="xp"] .hud__bar-fill { background: var(--xp); }` 追加
- `.hud__bar[data-stat="temp"|"food"]` 削除
- `.hud__elapsed { font-variant-numeric: tabular-nums; min-width: 48px; }`

`responsive.css`:
- 既存の `.hud { flex-wrap: wrap }` は据置、 `.hud__day` セレクタを `.hud__level, .hud__elapsed` に変更

## 6. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX (= SPEC-004 を Done に) + CHANGELOG |
| **Phase 1** | state / constants / survival.js / main.js / index.html / i18n / css の置換 |

## 7. 受入基準

- [ ] 起動直後 HUD: `Lv.1 / 00:00 / HP 100 / XP 0/5` が表示
- [ ] 1 sec 経過で `00:01`、 60 sec で `01:00`
- [ ] HP bar は decay しない (= 1 分待っても 100/100 のまま)
- [ ] XP bar は変化しない (= XP gem drop は SPEC-007)
- [ ] hero modal / help modal を開くと Elapsed が **止まる** (= pauseFlags 連動)
- [ ] JP/EN 切替で `Lv.1` ↔ `Lv.1` (= 同じ)、 `HP` `XP` ラベルが切替
- [ ] 640px 未満で Level + Elapsed が上段、 HP/XP bar が下段に折り返し
- [ ] grep `state.day` で 0 hit、 grep `temp\|food` で stat 関連 0 hit (= 派閥 i18n は別物)
- [ ] DevTools console エラーなし
- [ ] `__state.xp = 3` を直書きすると次 onTick で renderHud が反映 (= XP bar 60% fill)

## 8. リスク・懸念

- **`state.day` 撤去の波及** — 現状 main.js / survival.js 以外で参照無し (= grep 確認済)
- **week/month/year の legacy 状態** — `advanceWeek()` を残すが Day 表示が無いので副作用ゼロ。 後続 SPEC で完全撤去するか判断
- **HP decay 0 の妥当性** — VS では idle 時 HP 全回復、 戦闘でのみ減るのが basic。 Phase 1 では 0 で正解。 戦闘実装 (= SPEC-007) で接触ダメージを入れる
- **XP_TO_NEXT_INITIAL = 5** の暫定性 — VS では gem 種類 (white/green/red) で量が違う。 SPEC-007 で gem スキーマを定義し直す

## 9. 参考

- VS reference: https://en.wikipedia.org/wiki/Vampire_Survivors (= mechanics 概要)
- 既存 `js/survival.js` (= renderHud / tickStatsDecay)
- `docs/charters/DEVELOPMENT_CHARTER.md`
