**Added Phase 0 (= Enemies + Hardcoded Weapon + XP Gems + Level Trigger spec)**
- `docs/specs/SPEC-007-enemies-and-xp.md` 新規 (= 敵スポーン waves + 追跡 AI + 接触ダメージ + 仮 hardcoded shockwave 武器 + 撃破時 XP gem ドロップ + 拾う + level up trigger、 VS core loop の完成形)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を `#7 (open)` に、 SPEC-007 を Implementing 登録
- 武器を Extension に置き換える次段は SPEC-008 (= level up モーダル + extension picker)、 Game Over は SPEC-009

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `ENEMY_*` / `CONTACT_COOLDOWN_MS` / `GEM_*` / `SHOCKWAVE_VISUAL_*` / `XP_TO_NEXT_GROWTH` / `MAX_ENEMIES` 追加
- `js/state.js`: `state.battle` に `enemies` / `gems` / `shockwaveAnims` / `weapons` / `nextEntityId` / `lastEnemySpawnMs` / `contactCooldownMs` 追加
- `js/battle/enemies.js` 新規 (= tickEnemies + spawnEnemyAtRing + 接触ダメージ throttle)
- `js/battle/weapons.js` 新規 (= shockwave 自動発射 + 範囲ダメージ + アニメ tick)
- `js/battle/gems.js` 新規 (= spawnGem + tickGems + level up loop)
- `js/battle/index.js` 改修 (= startBattle で各 entity reset + RAF ループに新規 tick 追加)
- `js/battle/render.js` 改修 (= shockwave / gem / enemy 描画追加、 viewport カリング)
