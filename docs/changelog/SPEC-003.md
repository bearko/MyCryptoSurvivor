**Added Phase 0 (= MCH IP Data Sources spec)**
- `docs/specs/SPEC-003-mch-data-sources.md` 新規作成 (= ASSET_BASE を bearko/mycryptoheroes に切替、 heroes/extensions/enemies 3 種データ層を先行整備、 MCH 5 派閥 GENBU/SUZAKU/BYAKKO/SEIRYU/KOURYU カラー追加)
- `docs/specs/SPEC-INDEX.md` に SPEC-003 を Implementing として登録 (= SPEC-002 ブランチにスタック)

**Planned Phase 1 (= 実装)**
- `js/constants.js` の `ASSET_BASE` を `bearko/mycryptoheroes/main/` に切替
- `data/heroes.json` を v2 に更新 (= MCH 公式 ID 1001-2013 から 10 体 curated, faction フィールド導入)
- `data/extensions.json` 新規 (= 10 件 curated, version 1)
- `data/enemies.json` 新規 (= 10 件 curated, version 1)
- `js/heroes.js` を MCH スキーマに改修 (= `factionEmoji` 追加、 `localizedHeroBlurb` 撤去)
- `js/extensions.js` / `js/enemies.js` 新規 (= 同じ loader パターン)
- `js/main.js` の hero modal を MCH 駆動に、 init() で extensions/enemies も並行 fetch
- `data/i18n/ui.json` に `hero.faction.*` 5 派閥追加、 `hero.element.*` 撤去
- `css/base.css` に 5 派閥 CSS 変数追加、 `css/components.css` の hero-tile / header__hero-badge を `data-faction` 駆動に
