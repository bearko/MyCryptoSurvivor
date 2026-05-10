**Added Phase 0 (= Extensions as Weapons + Level-Up Picker Modal spec)**
- `docs/specs/SPEC-008-extensions-as-weapons.md` 新規 (= 仮 shockwave 撤去 + EXT_ROSTER を投射体武器化 + Level up モーダル + 3 択ピック + starter pick + ext.stats 由来の dmg/cd/range/projSpeed)
- `docs/specs/SPEC-INDEX.md`: SPEC-007 を `#8 (open)` に、 SPEC-008 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `EXT_MAX_LEVEL=5` / `PROJECTILE_LIFE_MS=1500` / `PROJECTILE_RADIUS=5` / `PICK_OPTIONS_COUNT=3` / `SERIES_COLOR` map 追加、 `SHOCKWAVE_*` 撤去
- `js/state.js`: `state.ownedExtensions=[]` / `state.pendingPickOptions=[]` / `state.pendingPickIsStarter=false` / `state.battle.projectiles=[]` 追加、 `state.battle.shockwaveAnims` 撤去
- `js/battle/extensions-as-weapons.js` 新規 (= weaponFromExt + rebuildWeaponsFromOwned)
- `js/battle/weapons.js` 全面改修 (= shockwave 撤去、 nearest enemy ホーミング投射体 spawn)
- `js/battle/projectiles.js` 新規 (= tickProjectiles で移動 + 衝突 + 寿命)
- `js/battle/levelup.js` 新規 (= triggerLevelUpPick / triggerStarterPick / sample / applyPick / open/close modal)
- `js/battle/gems.js`: tickGems の level up loop で triggerLevelUpPick(n) 呼出
- `js/battle/index.js`: startBattle 末尾で triggerStarterPick、 RAF ループに tickProjectiles 追加、 tickShockwaveAnims 撤去
- `js/battle/render.js`: projectiles 描画追加、 shockwaveAnims 描画撤去
- `index.html`: `#levelUpModal` + `#levelUpGrid` 追加
- `data/i18n/ui.json`: `levelup.title` / `levelup.sub` / `levelup.starter` / `ext.new` 追加
- `css/components.css`: `.levelup-modal*` / `.levelup-card*` 追加
