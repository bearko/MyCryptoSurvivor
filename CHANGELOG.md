# Changelog — MyCryptoSurvivor

[Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

### Added — SPEC-019 Phase 0 (= 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon spec)
- `docs/specs/SPEC-019-new-buffs-revolver-blade-gem.md` 新規 (= 液浸標本 attackRangeUp + ギョク pickupRangeUp の 2 buff 追加 / Revolver の projectileIconId=null + Lv.1 弾数 1 / Blade orbit を Book の半分以下に / 経験値 gem アイコンを Image/Icons/ce.png に差し替え)
- `docs/specs/SPEC-INDEX.md`: SPEC-017 を Done (= #19 merged)、 SPEC-018 を `#21 (open)`、 SPEC-019 を Implementing 登録

### Planned — SPEC-019 Phase 1 (= 実装)
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

### Added — SPEC-017 Phase 0 (= Sound Effects + BGM Wiring spec)
- `docs/specs/SPEC-017-audio-and-bgm.md` 新規 (= タイトル click → tooldev、 戦闘 BGM pvp loop、 被弾 1_single_damage、 gem 拾得 crash、 LV up open_treasure、 武器 pick insp、 buff (回復以外) 4_buff、 回復 (Armor/Ramen) 3_heal_resurrection、 lose / win)
- `docs/specs/SPEC-INDEX.md`: SPEC-013〜SPEC-016 を Done (= マージ済 #15-#18) に flip、 SPEC-017 を Implementing 登録

### Planned — SPEC-017 Phase 1 (= 実装)
- `js/constants.js`: `SFX.*` 9 パス + `BGM_BATTLE` 追加
- `js/audio.js`: `unlockAudio()` を新規 export (= 初回 user gesture で autoplay policy 解除)
- `js/main.js`: dismissTitle で `unlockAudio()`、 applyHeroPick で `tooldev.mp3`
- `js/battle/index.js`: startBattle 末尾で `pvp.mp3` BGM
- `js/battle/enemies.js`: 被弾時 `1_single_damage.mp3` (= 200ms throttle)
- `js/battle/gems.js`: 拾得時 `crash.mp3` (= 80ms throttle)
- `js/battle/levelup.js`: open 時 `open_treasure.mp3`、 applyPick で weapon=insp / heal=3_heal / その他 buff=4_buff
- `js/battle/gameover.js`: triggerGameOver(reason) で BGM 停止 + lose / win 分岐

### Added — SPEC-016 Phase 0 (= HP Bars + Damage Numbers + Hit Freeze spec)
- `docs/specs/SPEC-016-hp-bars-and-damage-feedback.md` 新規 (= player + enemy アイコン下に HP バー、 満タン非表示、 数値なし、 ダメージ数字 floater、 hit freeze 100ms)

### Planned — SPEC-016 Phase 1 (= 実装)
- `js/constants.js`: `DAMAGE_NUMBER_*` / `HIT_FREEZE_MS` / `HP_BAR_*`
- `js/battle/damage.js` 新規 (= `hitEnemy(enemy, dmg)` / `pushDamageNumber` / `tickDamageNumbers`)
- `js/state.js`: `state.battle.damageNumbers` 追加、 enemy entity に `hitFreezeMs`
- 全 damage path (= projectiles.js / archetypes.js orbits/bombs/shockwaves) を `hitEnemy` 経由に
- `js/battle/enemies.js`: `hitFreezeMs > 0` で移動停止、 spawn で 0 初期化、 player 被ダメ時に pushDamageNumber
- `js/battle/index.js` _loop: `tickDamageNumbers` 配線、 startBattle で reset
- `js/battle/render.js`: `_drawHpBar` (= 満タン非表示 + 緑/黄/赤 ratio 色)、 ダメージ数字を fillText + strokeText で描画

### Added — SPEC-015 Phase 0 (= Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave spec)
- `docs/specs/SPEC-015-ext-visuals-balance-moai.md` 新規 (= 投射体/周回/爆弾を icon 描画 + Knife 45° offset + 武器威力底上げ + Moai 追従 + 着弾衝撃波)

### Planned — SPEC-015 Phase 1 (= 実装)
- `js/battle/sprites.js` 拡張: `getExtSprite(extOrId)` + `drawSpriteRotated(ctx, entry, cx, cy, size, angle)`
- `js/battle/extensions-as-weapons.js`: weapon spec に iconId を含める
- `js/battle/archetypes.js`: 各 fireXxx で iconId / iconRotOffset を渡す、 Knife は π/4、 Moai に moaiTargetId / moaiAoeR / moaiAoeDmg
- `js/battle/projectiles.js`: kind="moaiDrop" の x 追従 + 着弾時 shockwave spawn
- `js/state.js`: `state.battle.shockwaves` 追加
- `js/battle/index.js` _loop: tickShockwaves 配線
- `js/battle/render.js`: projectiles / orbits / bombs を icon 描画化、 shockwave ring 描画
- `data/extensions.json`: 全武器の Lv.1 dmg 底上げ (= Knife/Revolver/Axe 30、 Moai/Pierrot 25-35、 Panjandrum 60、 等)

### Added — SPEC-014 Phase 0 (= Hero Selection Detail Panel + Per-Hero HP/Speed spec)
- `docs/specs/SPEC-014-hero-detail-panel.md` 新規 (= ヒーロー選択モーダル上部に詳細パネル / hero.stats から HP 上限・移動速度を派生 / 担当 extension のアイコン+効果説明を表示)
- `docs/specs/SPEC-INDEX.md`: SPEC-013 を `#15 (open)`、 SPEC-014 を Implementing 登録

### Planned — SPEC-014 Phase 1 (= 実装)
- `js/constants.js`: `HERO_HP_BASE` / `HERO_HP_PER_STAT` / `HERO_SPEED_BASE` / `HERO_SPEED_PER_AGI`
- `js/battle/index.js` `startBattle`: hero.stats から maxHp / speed を派生
- `index.html`: `<div id="heroDetail">` を hero modal 内 grid 直前に追加
- `js/main.js`: `renderHeroDetail(heroId)` を pickHero / openHeroSelectModal / onLangChange から呼出
- `data/i18n/ui.json`: `hero.detail.placeholder` / `hp` / `speed` / `starterWeapon`
- `css/components.css`: `.hero-detail*` 一式

### Added — SPEC-013 Phase 0 (= Hero Starter Weapon + Picker Rules spec)
- `docs/specs/SPEC-013-hero-starter-weapon-and-picker-rules.md` 新規 (= 各ヒーローに固定の starter 武器を Lv.1 で装備 / starter pick モーダル撤去 / Level up picker で同系列重複禁止 / Level up picker に最低 1 weapon 枠を保証)
- `docs/specs/SPEC-INDEX.md`: SPEC-012 を `#13 (open, also bundled in re-stack PR #14)` に、 SPEC-013 を Implementing 登録
- 10 ヒーロー × 10 武器の 1:1 mapping を確定 (= キャラクター性に寄せた配置)

### Planned — SPEC-013 Phase 1 (= 実装)
- `js/constants.js` に `HERO_STARTING_WEAPON` (= heroId → weapon extId) と `HERO_STARTING_WEAPON_DEFAULT = 1` 追加
- `js/battle/index.js` `startBattle`: `triggerStarterPick()` 呼出を削除、 代わりに hero の starter weapon を `state.ownedExtensions` に push + `rebuildWeaponsFromOwned()`
- `js/battle/levelup.js` `_samplePicks`: 重複防止 (= Set で usedIds 管理)、 最低 1 weapon (= weaponPool が空でない限り 1 つ確実に含める)、 結果を最終 shuffle で表示順ランダム化

### Added — SPEC-012 Phase 0 (= 10 Weapon Archetype Behaviors spec)
- `docs/specs/SPEC-012-weapon-archetypes.md` 新規 (= 武器 10 系列の固有挙動を archetype.js で実装、 新 entity orbits/beams/bombs を追加、 Oriflamme bulletCountBonus を全 archetype に反映)
- `docs/specs/SPEC-INDEX.md`: SPEC-011 を `#12 (open)`、 SPEC-012 を Implementing 登録

### Planned — SPEC-012 Phase 1 (= 実装)
- `js/state.js`: `state.battle.orbits` / `beams` / `bombs` を追加、 startBattle で reset
- `js/battle/archetypes.js` 新規 (= fireRadial / fireBigHoming / fireDropTarget / fireStack / fireBeam / fireDiagonal / fireRandomRadial / firePlaceBomb / fireHoming + ensureOrbits + tickOrbits + tickBeams + tickBombs + tickHomingProjectiles)
- `js/battle/weapons.js`: archetype dispatcher 化
- `js/battle/projectiles.js`: targetId フィールド対応 (= bigHoming の追従)
- `js/battle/index.js` _loop: tickHomingProjectiles → tickProjectiles → tickOrbits → tickBeams → tickBombs の順で配線
- `js/battle/render.js`: orbits / beams / bombs の描画追加

### Added — SPEC-011 Phase 0 (= Extension Schema Overhaul 17×5 + Buff Archetype spec)
- `docs/specs/SPEC-011-extension-tiers-and-buffs.md` 新規 (= 武器 10 系列 + 強化 7 系列 × 5 段階レアリティ。 ピックで tier 昇格 = 名前/スキル名/効果説明が変化。 Buff 7 種が即時効果。 武器固有挙動は SPEC-012 で扱う)
- `docs/specs/SPEC-INDEX.md`: SPEC-010 を `#11 (open)`、 SPEC-011 を Implementing 登録

### Planned — SPEC-011 Phase 1 (= 実装)
- `data/extensions.json` v2: 17 系列 × tierNames[5] / skillName / skillDescTpl / tierParams[5] / archetype / category
- `js/extensions.js`: ローダ更新、 `getTierName(ext, level, lang)` / `getSkillDesc(ext, level, lang)` / `getCategory(ext)` 追加
- `js/state.js`: `state.buffs = {hpMaxBonus, regenPerSec, speedMul, cdMul, dmgTakenMul, dmgMul, bulletCountBonus}`、 startBattle で reset
- `js/battle/buffs.js` 新規 (= applyBuff(extId, level) / tickRegen(dt))
- `js/battle/extensions-as-weapons.js`: weaponFromExt を tier params 駆動に
- `js/battle/levelup.js`: applyPick で weapon vs buff 分岐、 カード DOM に tier name / skill name / skill desc / icon を表示
- `js/battle/index.js`: RAF ループに tickRegen 追加、 startBattle で state.buffs reset
- `js/battle/player.js`: speedMul 適用
- `js/battle/weapons.js`: cdMul / dmgMul 適用
- `js/battle/enemies.js`: dmgTakenMul 適用

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
