# Changelog — MyCryptoSurvivor

[Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

### Added — SPEC-002 Phase 0 (= Hero Roster spec)
- `docs/specs/SPEC-002-hero-roster.md` 新規作成 (= heroes.json スキーマ / 10 体ロスター / loadHeroes / state.ownedHero / 元素 + レアリティ色帯 + onerror フォールバック)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-001 を Done, SPEC-002 を Implementing として登録)

### Planned — SPEC-002 Phase 1 (= 実装)
- `data/heroes.json` (= version 1, 10 体) の追加
- `js/data-loader.js` の `loadJson` 経由で `loadHeroes()` を main.js から呼ぶ
- `js/state.js` に `state.ownedHero` 追加、 `pendingHeroPick` を heroId ベースに
- `index.html` ヘッダーに `#ownedHeroBadge`、 ヒーロー選択モーダルのタイル構造を実データ駆動に
- `data/i18n/ui.json` に `hero.element.*` / `hero.rarity.*` / `hero.select.imgAlt` を追加
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
