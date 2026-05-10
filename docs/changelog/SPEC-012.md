**Added Phase 0 (= 10 Weapon Archetype Behaviors spec)**
- `docs/specs/SPEC-012-weapon-archetypes.md` 新規 (= 武器 10 系列の固有挙動を archetype.js で実装、 新 entity orbits/beams/bombs を追加、 Oriflamme bulletCountBonus を全 archetype に反映)
- `docs/specs/SPEC-INDEX.md`: SPEC-011 を `#12 (open)`、 SPEC-012 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/state.js`: `state.battle.orbits` / `beams` / `bombs` を追加、 startBattle で reset
- `js/battle/archetypes.js` 新規 (= fireRadial / fireBigHoming / fireDropTarget / fireStack / fireBeam / fireDiagonal / fireRandomRadial / firePlaceBomb / fireHoming + ensureOrbits + tickOrbits + tickBeams + tickBombs + tickHomingProjectiles)
- `js/battle/weapons.js`: archetype dispatcher 化
- `js/battle/projectiles.js`: targetId フィールド対応 (= bigHoming の追従)
- `js/battle/index.js` _loop: tickHomingProjectiles → tickProjectiles → tickOrbits → tickBeams → tickBombs の順で配線
- `js/battle/render.js`: orbits / beams / bombs の描画追加
