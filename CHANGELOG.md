# Changelog — MyCryptoSurvivor

[Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

### Added — SPEC-010 Phase 0 (= Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect spec)
- `docs/specs/SPEC-010-mobile-viewport-and-sprites.md` 新規 (= モバイル full-screen 化 / プレイヤー & 敵を MCH 画像で円形クリップ描画 / Level up カードに extension アイコン + 効果テキスト追加)
- `docs/specs/SPEC-INDEX.md`: SPEC-009 を `#10 (open)` に、 SPEC-010 を Implementing 登録
- 17 系列 × 5 段階の本格再設計 (= SPEC-011) の前段の **視覚 / レイアウト 改修のみ** に絞る

### Planned — SPEC-010 Phase 1 (= 実装)
- `css/base.css` / `css/layout.css` / `css/components.css`: `html/body { height:100% }`, `.app { height:100dvh; overflow:hidden }`, `.battle-canvas { position:absolute; inset:0 }` で mobile full-screen
- `js/battle/sprites.js` 新規 (= preload 画像キャッシュ + `drawSpriteCircular`)
- `js/state.js`: `state.battle.playerSprite` / `defaultEnemySprite` 追加
- `js/battle/index.js`: startBattle で sprite preload を仕込む
- `js/battle/render.js`: プレイヤー / 敵を sprite 円形クリップで描画、 fallback で従来円
- `js/battle/levelup.js`: カード DOM を icon-wrap + main の 2 列に再構成、 効果テキスト (`DMG / CD / range`) を追加
- `data/i18n/ui.json`: `levelup.weaponEffect` 追加
- `css/components.css`: `.levelup-card` を grid + icon + effect 表示用に再設計

### Added — SPEC-009 Phase 0 (= Game Over + Retry + Ranking Submit spec)
- `docs/specs/SPEC-009-game-over.md` 新規 (= HP 0 で Game Over モーダル + 経過時間 / Lv / 撃破数 表示 + プレイヤー名入力 + 既存 submitScore() 経由でランキング送信 + リトライボタン)
- `docs/specs/SPEC-INDEX.md`: SPEC-008 を `#9 (open)` に、 SPEC-009 を Implementing 登録
- これにより VS-like MVP 完了 (= 「死んだら終わる」 + 「もう 1 回」)

### Planned — SPEC-009 Phase 1 (= 実装)
- `js/state.js`: `state.killCount` / `state.battle.gameOver` / `state.lastRunStats` 追加
- `js/battle/projectiles.js`: 敵撃破時 `state.killCount++`
- `js/battle/enemies.js`: 接触ダメージ後 HP <= 0 で `triggerGameOver()`
- `js/battle/gameover.js` 新規 (= triggerGameOver / applyRetry / モーダル制御 / submit / lang change)
- `js/battle/index.js`: startBattle で killCount / gameOver / lastRunStats を reset
- `index.html`: `#gameOverModal` 追加
- `data/i18n/ui.json`: `gameover.*` 11 キー追加
- `css/components.css`: `.gameover-modal*` / `.gameover-form*` / `.gameover-stat`

### Added — SPEC-008 Phase 0 (= Extensions as Weapons + Level-Up Picker Modal spec)
- `docs/specs/SPEC-008-extensions-as-weapons.md` 新規 (= 仮 shockwave 撤去 + EXT_ROSTER を投射体武器化 + Level up モーダル + 3 択ピック + starter pick + ext.stats 由来の dmg/cd/range/projSpeed)
- `docs/specs/SPEC-INDEX.md`: SPEC-007 を `#8 (open)` に、 SPEC-008 を Implementing 登録

### Planned — SPEC-008 Phase 1 (= 実装)
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

### Added — SPEC-007 Phase 0 (= Enemies + Hardcoded Weapon + XP Gems + Level Trigger spec)
- `docs/specs/SPEC-007-enemies-and-xp.md` 新規 (= 敵スポーン waves + 追跡 AI + 接触ダメージ + 仮 hardcoded shockwave 武器 + 撃破時 XP gem ドロップ + 拾う + level up trigger、 VS core loop の完成形)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を `#7 (open)` に、 SPEC-007 を Implementing 登録
- 武器を Extension に置き換える次段は SPEC-008 (= level up モーダル + extension picker)、 Game Over は SPEC-009

### Planned — SPEC-007 Phase 1 (= 実装)
- `js/constants.js`: `ENEMY_*` / `CONTACT_COOLDOWN_MS` / `GEM_*` / `SHOCKWAVE_VISUAL_*` / `XP_TO_NEXT_GROWTH` / `MAX_ENEMIES` 追加
- `js/state.js`: `state.battle` に `enemies` / `gems` / `shockwaveAnims` / `weapons` / `nextEntityId` / `lastEnemySpawnMs` / `contactCooldownMs` 追加
- `js/battle/enemies.js` 新規 (= tickEnemies + spawnEnemyAtRing + 接触ダメージ throttle)
- `js/battle/weapons.js` 新規 (= shockwave 自動発射 + 範囲ダメージ + アニメ tick)
- `js/battle/gems.js` 新規 (= spawnGem + tickGems + level up loop)
- `js/battle/index.js` 改修 (= startBattle で各 entity reset + RAF ループに新規 tick 追加)
- `js/battle/render.js` 改修 (= shockwave / gem / enemy 描画追加、 viewport カリング)

### Added — SPEC-006 Phase 0 (= Battle Stage Scaffold spec)
- `docs/specs/SPEC-006-battle-scaffold.md` 新規 (= canvas + プレイヤー移動 WASD/矢印/仮想ジョイスティック + カメラ追従 + 背景グリッド + DPR 対応 + RAF ループ + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を Implementing 登録 (= SPEC-005 にスタック)

### Planned — SPEC-006 Phase 1 (= 実装)
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

### Added — SPEC-005 Phase 0 (= VS HUD slim spec)
- `docs/specs/SPEC-005-vs-hud-slim.md` 新規 (= 体温/食料 を撤去し HP のみ + XP バー + Lv 表示 + 経過時間 mm:ss、 ヴァンパイアサバイバーライクへの方向転換 prep)
- `docs/specs/SPEC-INDEX.md`: SPEC-004 を Done (#5) に flip、 SPEC-005 を Implementing として登録

### Planned — SPEC-005 Phase 1 (= 実装)
- `js/state.js` から `state.day` / `state.stats.temp,food` / `state.statsMax.temp,food` を撤去、 `state.level=1` / `state.xp=0` / `state.xpToNext=5` / `state.elapsedTicks=0` を追加
- `js/constants.js`: `STATS_INITIAL` / `STATS_MAX` から temp/food を撤去、 `STATS_DECAY_PER_TICK.hp=0` (= idle decay 廃止)、 `XP_INITIAL` / `XP_TO_NEXT_INITIAL` / `LEVEL_INITIAL` 追加
- `js/survival.js`: `STAT_KEYS=["hp"]`、 `renderHud` を Level/Elapsed/HP/XP 4 セルに改修、 `formatElapsed` export
- `js/main.js`: `onTick` に `state.elapsedTicks++` 追加、 `advanceWeek` から `state.day++` 削除
- `index.html` HUD: `#hudLevel` + `#hudElapsed` + `#hudHp` + `#hudXp` (= temp/food 撤去)
- `data/i18n/ui.json`: `hud.level` / `hud.stats.xp` 追加、 `hud.day` / `hud.stats.temp` / `hud.stats.food` 撤去
- `css/base.css`: `--xp` 黄色変数追加
- `css/components.css`: `.hud__level` / `.hud__elapsed` / `.hud__bar[data-stat="xp"]` 追加、 temp/food 用セレクタ撤去

### Added — SPEC-004 Phase 0 (= Survival HUD spec)
- `docs/specs/SPEC-004-survival-hud.md` 新規作成 (= Day N + HP/体温/食料 の 3 スタッツ + 1 tick = 1 sec の線形 decay + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-002 / SPEC-003 を Done に flip、 PR 番号も #2 / #4 で正、 SPEC-004 を Implementing として登録)

### Planned — SPEC-004 Phase 1 (= 実装)
- `js/state.js` に `state.day` (= 1 開始) と `state.stats` / `state.statsMax` (= `{hp, temp, food}`) を追加
- `js/constants.js` に `STATS_INITIAL` / `STATS_MAX` / `STATS_DECAY_PER_TICK` を追加
- `js/survival.js` 新規 (= `tickStatsDecay` / `clampStats` / `getStatRatio` / `renderHud`)
- `js/main.js` の `onTick` に `tickStatsDecay()` + `renderHud()` 呼出を追加、 `advanceWeek` に `state.day++` を追加
- `index.html` の `<header>` と `<section.stage>` の間に `<section class="hud" id="hud">` を新設 (= Day + 3 bar)
- `data/i18n/ui.json` に `hud.day` / `hud.stats.{hp,temp,food}` を追加
- `css/base.css` に `--hp` / `--temp` / `--food` の 3 色変数追加、 `css/components.css` に `.hud` / `.hud__bar` 系を追加、 `css/responsive.css` で 640px 未満の折り返し対応

### Added — SPEC-003 Phase 0 (= MCH IP Data Sources spec)
- `docs/specs/SPEC-003-mch-data-sources.md` 新規作成 (= ASSET_BASE を bearko/mycryptoheroes に切替、 heroes/extensions/enemies 3 種データ層を先行整備、 MCH 5 派閥 GENBU/SUZAKU/BYAKKO/SEIRYU/KOURYU カラー追加)
- `docs/specs/SPEC-INDEX.md` に SPEC-003 を Implementing として登録 (= SPEC-002 ブランチにスタック)

### Planned — SPEC-003 Phase 1 (= 実装)
- `js/constants.js` の `ASSET_BASE` を `bearko/mycryptoheroes/main/` に切替
- `data/heroes.json` を v2 に更新 (= MCH 公式 ID 1001-2013 から 10 体 curated, faction フィールド導入)
- `data/extensions.json` 新規 (= 10 件 curated, version 1)
- `data/enemies.json` 新規 (= 10 件 curated, version 1)
- `js/heroes.js` を MCH スキーマに改修 (= `factionEmoji` 追加、 `localizedHeroBlurb` 撤去)
- `js/extensions.js` / `js/enemies.js` 新規 (= 同じ loader パターン)
- `js/main.js` の hero modal を MCH 駆動に、 init() で extensions/enemies も並行 fetch
- `data/i18n/ui.json` に `hero.faction.*` 5 派閥追加、 `hero.element.*` 撤去
- `css/base.css` に 5 派閥 CSS 変数追加、 `css/components.css` の hero-tile / header__hero-badge を `data-faction` 駆動に

### Added — SPEC-002 Phase 0 (= Hero Roster spec)
- `docs/specs/SPEC-002-hero-roster.md` 新規作成 (= heroes.json スキーマ / 10 体ロスター / loadHeroes / state.ownedHero / 元素 + レアリティ色帯 + onerror フォールバック)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-001 を Done, SPEC-002 を Implementing として登録)

### Changed — SPEC-002 Phase 1 (= 実装)
- `data/heroes.json` (= version 1, 10 体 placeholder) の追加 (= SPEC-003 で v2 に上書き)
- `js/data-loader.js` の `loadJson` 経由で `loadHeroes()` を main.js から呼ぶ
- `js/state.js` に `state.ownedHero` 追加、 `pendingHeroPick` を heroId ベースに
- `index.html` ヘッダーに `#ownedHeroBadge`、 ヒーロー選択モーダルのタイル構造を実データ駆動に
- `data/i18n/ui.json` に `hero.element.*` / `hero.rarity.*` / `hero.select.imgAlt` を追加 (= `hero.element.*` は SPEC-003 で `hero.faction.*` に置換)
- `css/components.css` の `.hero-tile` を画像 + meta に再構成、 element / rarity の色付けを追加

## [SPEC-001] — 2026-05-09 (PR #1 merged as `b3f5e93`)

### Added — Phase 0 (= Charter / 文書)
- `docs/charters/PROJECT_CHARTER.md` を MyCryptoSurvivor 用に書き換え
- `docs/specs/SPEC-INDEX.md` 新規作成 (= SPEC 一覧表)
- `docs/specs/SPEC-001-phase-1-bootstrap.md` 新規作成 (= Charter / 識別子置換 / Day 1 ヒーロー選択 mock)
- `README.md` を MyCryptoSurvivor 用に書き換え

### Changed — Phase 1 (= 識別子と Day 1 mock)
- `js/constants.js` — `LS_PREFIX` を `"mcs"` に確定、 `ASSET_BASE` を `bearko/MyCryptoSurvivor-assets` に確定
- `index.html` — `<title>` / OGP / splash / title をプロジェクト名に置換、 ヒーロー選択モーダル mock 追加
- `js/main.js` — Press to Start で `openHeroSelectModal()` を呼ぶ、 タイル選択 / 確定の handler
- `js/state.js` — `state.pendingHeroPick` を追加 (= UI 状態のみ)
- `data/i18n/ui.json` — タイトル / ヒーロー選択 関連文字列を追加
- `css/components.css` — ヒーロー選択モーダル / タイル grid のスタイル

## [Bootstrap] — 2026-05-09

`bearko/mycryptotemplate` v0.1.0 を初期コミットとして取り込み。
`docs/lessons-learned/MCT-MCF-KPT.md` などテンプレート時点の文書を全継承。

[Unreleased]: https://github.com/bearko/MyCryptoSurvivor/compare/main...feat/spec-002-hero-roster
