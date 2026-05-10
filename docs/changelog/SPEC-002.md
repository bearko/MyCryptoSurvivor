**Added Phase 0 (= Hero Roster spec)**
- `docs/specs/SPEC-002-hero-roster.md` 新規作成 (= heroes.json スキーマ / 10 体ロスター / loadHeroes / state.ownedHero / 元素 + レアリティ色帯 + onerror フォールバック)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-001 を Done, SPEC-002 を Implementing として登録)

**Changed Phase 1 (= 実装)**
- `data/heroes.json` (= version 1, 10 体 placeholder) の追加 (= SPEC-003 で v2 に上書き)
- `js/data-loader.js` の `loadJson` 経由で `loadHeroes()` を main.js から呼ぶ
- `js/state.js` に `state.ownedHero` 追加、 `pendingHeroPick` を heroId ベースに
- `index.html` ヘッダーに `#ownedHeroBadge`、 ヒーロー選択モーダルのタイル構造を実データ駆動に
- `data/i18n/ui.json` に `hero.element.*` / `hero.rarity.*` / `hero.select.imgAlt` を追加 (= `hero.element.*` は SPEC-003 で `hero.faction.*` に置換)
- `css/components.css` の `.hero-tile` を画像 + meta に再構成、 element / rarity の色付けを追加
