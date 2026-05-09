# Changelog — MyCryptoSurvivor

[Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

### Added — SPEC-005 Phase 0 (= VS HUD slim spec)
- `docs/specs/SPEC-005-vs-hud-slim.md` 新規 (= 体温/食料 を撤去し HP のみ + XP バー + Lv 表示 + 経過時間 mm:ss、 ヴァンパイアサバイバーライクへの方向転換 prep)
- `docs/specs/SPEC-INDEX.md`: SPEC-004 を Done (#5) に flip、 SPEC-005 を Implementing として登録

### Planned — SPEC-005 Phase 1 (= 実装)
- `js/state.js` から `state.day` / `state.stats.temp,food` / `state.statsMax.temp,food` を撤去、 `state.level=1` / `state.xp=0` / `state.xpToNext=5` / `state.elapsedTicks=0` を追加
- `js/constants.js`: `STATS_INITIAL` / `STATS_MAX` から temp/food を撤去、 `STATS_DECAY_PER_TICK.hp=0` (= idle decay 廃止)、 `XP_INITIAL` / `XP_TO_NEXT_INITIAL` / `LEVEL_INITIAL` 追加
- `js/survival.js`: `STAT_KEYS=["hp"]`、 `renderHud` を Level/Elapsed/HP/XP 4 セルに改修、 `formatElapsed` export
- `js/main.js`: `onTick` に `state.elapsedTicks++` 追加、 `advanceWeek` から `state.day++` 削除
- `index.html` HUD: `#hudLevel` + `#hudElapsed` + `#hudHp` + `#hudXp` (= temp/food 撤去)
- `data/i18n/ui.json`: `hud.level` / `hud.stats.xp` 追加、 `hud.day` / `hud.stats.temp` / `hud.stats.food` 撤去
- `css/base.css`: `--xp` 黄色変数追加
- `css/components.css`: `.hud__level` / `.hud__elapsed` / `.hud__bar[data-stat="xp"]` 追加、 temp/food 用セレクタ撤去

### Added — SPEC-004 Phase 0 (= Survival HUD spec)
- `docs/specs/SPEC-004-survival-hud.md` 新規作成 (= Day N + HP/体温/食料 の 3 スタッツ + 1 tick = 1 sec の線形 decay + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-002 / SPEC-003 を Done に flip、 PR 番号も #2 / #4 で正、 SPEC-004 を Implementing として登録)

### Planned — SPEC-004 Phase 1 (= 実装)
- `js/state.js` に `state.day` (= 1 開始) と `state.stats` / `state.statsMax` (= `{hp, temp, food}`) を追加
- `js/constants.js` に `STATS_INITIAL` / `STATS_MAX` / `STATS_DECAY_PER_TICK` を追加
- `js/survival.js` 新規 (= `tickStatsDecay` / `clampStats` / `getStatRatio` / `renderHud`)
- `js/main.js` の `onTick` に `tickStatsDecay()` + `renderHud()` 呼出を追加、 `advanceWeek` に `state.day++` を追加
- `index.html` の `<header>` と `<section.stage>` の間に `<section class="hud" id="hud">` を新設 (= Day + 3 bar)
- `data/i18n/ui.json` に `hud.day` / `hud.stats.{hp,temp,food}` を追加
- `css/base.css` に `--hp` / `--temp` / `--food` の 3 色変数追加、 `css/components.css` に `.hud` / `.hud__bar` 系を追加、 `css/responsive.css` で 640px 未満の折り返し対応

### Added — SPEC-003 Phase 0 (= MCH IP Data Sources spec)
- `docs/specs/SPEC-003-mch-data-sources.md` 新規作成 (= ASSET_BASE を bearko/mycryptoheroes に切替、 heroes/extensions/enemies 3 種データ層を先行整備、 MCH 5 派閥 GENBU/SUZAKU/BYAKKO/SEIRYU/KOURYU カラー追加)
- `docs/specs/SPEC-INDEX.md` に SPEC-003 を Implementing として登録 (= SPEC-002 ブランチにスタック)

### Planned — SPEC-003 Phase 1 (= 実装)
- `js/constants.js` の `ASSET_BASE` を `bearko/mycryptoheroes/main/` に切替
- `data/heroes.json` を v2 に更新 (= MCH 公式 ID 1001-2013 から 10 体 curated, faction フィールド導入)
- `data/extensions.json` 新規 (= 10 件 curated, version 1)
- `data/enemies.json` 新規 (= 10 件 curated, version 1)
- `js/heroes.js` を MCH スキーマに改修 (= `factionEmoji` 追加、 `localizedHeroBlurb` 撤去)
- `js/extensions.js` / `js/enemies.js` 新規 (= 同じ loader パターン)
- `js/main.js` の hero modal を MCH 駆動に、 init() で extensions/enemies も並行 fetch
- `data/i18n/ui.json` に `hero.faction.*` 5 派閥追加、 `hero.element.*` 撤去
- `css/base.css` に 5 派閥 CSS 変数追加、 `css/components.css` の hero-tile / header__hero-badge を `data-faction` 駆動に

### Added — SPEC-002 Phase 0 (= Hero Roster spec)
- `docs/specs/SPEC-002-hero-roster.md` 新規作成 (= heroes.json スキーマ / 10 体ロスター / loadHeroes / state.ownedHero / 元素 + レアリティ色帯 + onerror フォールバック)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-001 を Done, SPEC-002 を Implementing として登録)

### Changed — SPEC-002 Phase 1 (= 実装)
- `data/heroes.json` (= version 1, 10 体 placeholder) の追加 (= SPEC-003 で v2 に上書き)
- `js/data-loader.js` の `loadJson` 経由で `loadHeroes()` を main.js から呼ぶ
- `js/state.js` に `state.ownedHero` 追加、 `pendingHeroPick` を heroId ベースに
- `index.html` ヘッダーに `#ownedHeroBadge`、 ヒーロー選択モーダルのタイル構造を実データ駆動に
- `data/i18n/ui.json` に `hero.element.*` / `hero.rarity.*` / `hero.select.imgAlt` を追加 (= `hero.element.*` は SPEC-003 で `hero.faction.*` に置換)
- `css/components.css` の `.hero-tile` を画像 + meta に再構成、 element / rarity の色付けを追加

## [SPEC-001] — 2026-05-09 (PR #1 merged as `b3f5e93`)

### Added — Phase 0 (= Charter / 文書)
- `docs/charters/PROJECT_CHARTER.md` を MyCryptoSurvivor 用に書き換え
- `docs/specs/SPEC-INDEX.md` 新規作成 (= SPEC 一覧表)
- `docs/specs/SPEC-001-phase-1-bootstrap.md` 新規作成 (= Charter / 識別子置換 / Day 1 ヒーロー選択 mock)
- `README.md` を MyCryptoSurvivor 用に書き換え

### Changed — Phase 1 (= 識別子と Day 1 mock)
- `js/constants.js` — `LS_PREFIX` を `"mcs"` に確定、 `ASSET_BASE` を `bearko/MyCryptoSurvivor-assets` に確定
- `index.html` — `<title>` / OGP / splash / title をプロジェクト名に置換、 ヒーロー選択モーダル mock 追加
- `js/main.js` — Press to Start で `openHeroSelectModal()` を呼ぶ、 タイル選択 / 確定の handler
- `js/state.js` — `state.pendingHeroPick` を追加 (= UI 状態のみ)
- `data/i18n/ui.json` — タイトル / ヒーロー選択 関連文字列を追加
- `css/components.css` — ヒーロー選択モーダル / タイル grid のスタイル

## [Bootstrap] — 2026-05-09

`bearko/mycryptotemplate` v0.1.0 を初期コミットとして取り込み。
`docs/lessons-learned/MCT-MCF-KPT.md` などテンプレート時点の文書を全継承。

[Unreleased]: https://github.com/bearko/MyCryptoSurvivor/compare/main...feat/spec-002-hero-roster
