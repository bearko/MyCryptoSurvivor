**Added Phase 0 (= HP Bars + Damage Numbers + Hit Freeze spec)**
- `docs/specs/SPEC-016-hp-bars-and-damage-feedback.md` 新規 (= player + enemy アイコン下に HP バー、 満タン非表示、 数値なし、 ダメージ数字 floater、 hit freeze 100ms)

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `DAMAGE_NUMBER_*` / `HIT_FREEZE_MS` / `HP_BAR_*`
- `js/battle/damage.js` 新規 (= `hitEnemy(enemy, dmg)` / `pushDamageNumber` / `tickDamageNumbers`)
- `js/state.js`: `state.battle.damageNumbers` 追加、 enemy entity に `hitFreezeMs`
- 全 damage path (= projectiles.js / archetypes.js orbits/bombs/shockwaves) を `hitEnemy` 経由に
- `js/battle/enemies.js`: `hitFreezeMs > 0` で移動停止、 spawn で 0 初期化、 player 被ダメ時に pushDamageNumber
- `js/battle/index.js` _loop: `tickDamageNumbers` 配線、 startBattle で reset
- `js/battle/render.js`: `_drawHpBar` (= 満タン非表示 + 緑/黄/赤 ratio 色)、 ダメージ数字を fillText + strokeText で描画
