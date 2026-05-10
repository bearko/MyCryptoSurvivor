**Added Phase 0 (= Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave spec)**
- `docs/specs/SPEC-015-ext-visuals-balance-moai.md` 新規 (= 投射体/周回/爆弾を icon 描画 + Knife 45° offset + 武器威力底上げ + Moai 追従 + 着弾衝撃波)

**Planned Phase 1 (= 実装)**
- `js/battle/sprites.js` 拡張: `getExtSprite(extOrId)` + `drawSpriteRotated(ctx, entry, cx, cy, size, angle)`
- `js/battle/extensions-as-weapons.js`: weapon spec に iconId を含める
- `js/battle/archetypes.js`: 各 fireXxx で iconId / iconRotOffset を渡す、 Knife は π/4、 Moai に moaiTargetId / moaiAoeR / moaiAoeDmg
- `js/battle/projectiles.js`: kind="moaiDrop" の x 追従 + 着弾時 shockwave spawn
- `js/state.js`: `state.battle.shockwaves` 追加
- `js/battle/index.js` _loop: tickShockwaves 配線
- `js/battle/render.js`: projectiles / orbits / bombs を icon 描画化、 shockwave ring 描画
- `data/extensions.json`: 全武器の Lv.1 dmg 底上げ (= Knife/Revolver/Axe 30、 Moai/Pierrot 25-35、 Panjandrum 60、 等)
