**Added Phase 0 (= 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon spec)**
- `docs/specs/SPEC-019-new-buffs-revolver-blade-gem.md` 新規 (= 液浸標本 attackRangeUp + ギョク pickupRangeUp の 2 buff 追加 / Revolver の projectileIconId=null + Lv.1 弾数 1 / Blade orbit を Book の半分以下に / 経験値 gem アイコンを Image/Icons/ce.png に差し替え)
- `docs/specs/SPEC-INDEX.md`: SPEC-018 を `#21 (merged)` に flip、 SPEC-019 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `GEM_ICON_PATH = "Image/Icons/ce.png"`
- `js/state.js`: `state.buffs.rangeMul = 1` / `state.buffs.pickupMul = 1` 追加
- `js/battle/buffs.js`: `attackRangeUp` / `pickupRangeUp` archetype を switch + `resetBuffs` で初期化
- `js/battle/extensions-as-weapons.js`: weapon spec に `projectileIconId` を伝播
- `js/battle/archetypes.js`: 各 fireXxx で range / orbitR / len / radius / aoeR に `rangeMul` を乗算、 投射体 iconId は `w.projectileIconId` を優先参照
- `js/battle/gems.js`: `tickGems` で pickup 半径 = `GEM_PICKUP_RADIUS * pickupMul`
- `js/battle/sprites.js`: `getGemSprite()` 追加
- `js/battle/render.js`: gem 描画を `drawSpriteCircular(getGemSprite(), ...)`、 fallback 既存ダイヤ
- `data/extensions.json`:
  - extId 18 (Specimen / 液浸標本 / attackRangeUp) 追加
  - extId 19 (Gyoku / ギョク / pickupRangeUp) 追加
  - Revolver: `projectileIconId: null` + tierParams.bullets を 1/2/3/4/6 に
  - Blade: tierParams.orbitR を 32/34/36/38/40 に
