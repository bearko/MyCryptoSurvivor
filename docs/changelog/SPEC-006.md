**Added Phase 0 (= Battle Stage Scaffold spec)**
- `docs/specs/SPEC-006-battle-scaffold.md` 新規 (= canvas + プレイヤー移動 WASD/矢印/仮想ジョイスティック + カメラ追従 + 背景グリッド + DPR 対応 + RAF ループ + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を Implementing 登録 (= SPEC-005 にスタック)

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `BATTLE_GRID_SIZE` / `PLAYER_RADIUS` / `PLAYER_SPEED_PX_S` / `JOYSTICK_RADIUS` / `JOYSTICK_DEADZONE` 追加
- `js/state.js`: `state.battle = { active, player, camera, viewport }` 追加
- `js/battle/index.js` 新規 (= startBattle / stopBattle / RAF ループ / resize)
- `js/battle/input.js` 新規 (= keyboard + 仮想ジョイスティック → unit vector)
- `js/battle/player.js` 新規 (= tickPlayer)
- `js/battle/render.js` 新規 (= clear / グリッド / プレイヤー描画)
- `index.html`: `<canvas id="battleCanvas">` + `<div id="joystick">` を `.stage` 内に追加、 `stage.placeholder` 撤去
- `data/i18n/ui.json`: `stage.placeholder` 削除
- `css/layout.css`: `.stage` flex 配置 + canvas full-fill
- `css/components.css`: `.battle-canvas` / `.joystick` / `.joystick__base` / `.joystick__stick`
- `js/main.js`: `applyHeroPick` 末尾で `startBattle(state.ownedHero)`
