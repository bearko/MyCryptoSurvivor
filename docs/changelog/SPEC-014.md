**Added Phase 0 (= Hero Selection Detail Panel + Per-Hero HP/Speed spec)**
- `docs/specs/SPEC-014-hero-detail-panel.md` 新規 (= ヒーロー選択モーダル上部に詳細パネル / hero.stats から HP 上限・移動速度を派生 / 担当 extension のアイコン+効果説明を表示)
- `docs/specs/SPEC-INDEX.md`: SPEC-013 を `#15 (open)`、 SPEC-014 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `HERO_HP_BASE` / `HERO_HP_PER_STAT` / `HERO_SPEED_BASE` / `HERO_SPEED_PER_AGI`
- `js/battle/index.js` `startBattle`: hero.stats から maxHp / speed を派生
- `index.html`: `<div id="heroDetail">` を hero modal 内 grid 直前に追加
- `js/main.js`: `renderHeroDetail(heroId)` を pickHero / openHeroSelectModal / onLangChange から呼出
- `data/i18n/ui.json`: `hero.detail.placeholder` / `hp` / `speed` / `starterWeapon`
- `css/components.css`: `.hero-detail*` 一式
