**Added Phase 0 (= Hero Starter Weapon + Picker Rules spec)**
- `docs/specs/SPEC-013-hero-starter-weapon-and-picker-rules.md` 新規 (= 各ヒーローに固定の starter 武器を Lv.1 で装備 / starter pick モーダル撤去 / Level up picker で同系列重複禁止 / Level up picker に最低 1 weapon 枠を保証)
- `docs/specs/SPEC-INDEX.md`: SPEC-012 を `#13 (open, also bundled in re-stack PR #14)` に、 SPEC-013 を Implementing 登録
- 10 ヒーロー × 10 武器の 1:1 mapping を確定 (= キャラクター性に寄せた配置)

**Planned Phase 1 (= 実装)**
- `js/constants.js` に `HERO_STARTING_WEAPON` (= heroId → weapon extId) と `HERO_STARTING_WEAPON_DEFAULT = 1` 追加
- `js/battle/index.js` `startBattle`: `triggerStarterPick()` 呼出を削除、 代わりに hero の starter weapon を `state.ownedExtensions` に push + `rebuildWeaponsFromOwned()`
- `js/battle/levelup.js` `_samplePicks`: 重複防止 (= Set で usedIds 管理)、 最低 1 weapon (= weaponPool が空でない限り 1 つ確実に含める)、 結果を最終 shuffle で表示順ランダム化
