# SPEC-030 — Three-Stage System (Abacus / Hollerith / Troy)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ステージを 3 ステージに増やしてほしい。 ステージごとに敵の出現数や強さ、 経験値量を比例して強くしていきたい。
> ステージごとに武器のレベルはリセット。 ヒーローは最初に選んだヒーローをそのまま使い続ける。
> - ステージ 1 の名前は **node : アバカス**、 背景はそのまま、 ボスもそのまま
> - ステージ 2 の名前は **node : ホレリス**、 背景は 1038、 ボスは **覚醒魔王ファオ**。 アックスと同じ挙動で 「とっておきのフルーツパフェ」 を使って攻撃
> - ステージ 3 の名前は **node : トロイ**、 背景は 1060、 ボスは **yamap**、 グランダルメをブレードのように周囲に 8 本周回させる

## 2. ゴール

- 3 ステージを順番に踏破する連続フロー
- ステージごとに bg / ボス / 雑魚 mul (= hp/dmg/xp) / 出現頻度 が変わる
- ステージ間でヒーローと現状ステータスは引き継がず、 武器 / レベル / HP は **0 リセット** (= startBattle 既存挙動を流用)
- ボス 2 / 3 はそれぞれ **専用攻撃**:
  - ファオ (= stage 2): Axe 風の周期放射、 アイコン = ext **5055** (とっておきのフルーツパフェ)
  - yamap (= stage 3): Blade 風 8 個常時周回、 アイコン = ext **5002** (グランダルメ)
- ステージ間に遷移モーダル (= 「次のステージへ」 ボタン)、 最終ステージクリアで既存 game-over (= Clear! + ranking) に合流
- 死亡 / リトライは常にステージ 1 から再開

## 3. データ

### 3.1 新規敵 (= `data/enemies.json`)

| enemyId | JA | EN | hp | dmg | radius | 役割 |
|---|---|---|---|---|---|---|
| 373 | 覚醒魔王ファオ | Dark Lord Fao | 4500 | 30 | 52 | Stage 2 boss |
| 1189 | yamap | yamap | 6000 | 30 | 50 | Stage 3 boss |

### 3.2 STAGE_TABLE (= `js/constants.js`)

```js
export const STAGE_TABLE = [
  { idx:0, nameKey:"stage.akabasu", bgPath:"Image/Backgrounds/1001.png",
    bossEnemyId:171, bossAttack:null, bossAttackExtId:null,
    enemyHpMul:1.0, enemyDmgMul:1.0, xpMul:1.0, spawnIntervalMul:1.0 },
  { idx:1, nameKey:"stage.horeris", bgPath:"Image/Backgrounds/1038.png",
    bossEnemyId:373, bossAttack:"fao",   bossAttackExtId:5055,
    enemyHpMul:1.5, enemyDmgMul:1.25, xpMul:2.0, spawnIntervalMul:0.85 },
  { idx:2, nameKey:"stage.troy",    bgPath:"Image/Backgrounds/1060.png",
    bossEnemyId:1189, bossAttack:"yamap", bossAttackExtId:5002,
    enemyHpMul:2.0, enemyDmgMul:1.5,  xpMul:3.0, spawnIntervalMul:0.7 },
];
```

#### バランス意図

- xpMul (1.0 / 2.0 / 3.0) > enemyHpMul (1.0 / 1.5 / 2.0) → **後ステージほどレベル上がりやすい**
- enemyDmgMul は控えめスケール (1.0 / 1.25 / 1.5) で死にやすさを抑制
- spawnIntervalMul で出現頻度も後半 UP (= 1.0 → 0.7 で約 1.43× の出現密度)

### 3.3 ボス攻撃定数 (= `js/constants.js`)

```js
// ファオ
FAO_FIRE_INTERVAL_MS = 2200;
FAO_BULLETS = 6;
FAO_PROJ_SPEED_PX_S = 220;
FAO_PROJ_DMG = 18; FAO_PROJ_R = 14; FAO_PROJ_LIFE_MS = 4500;

// yamap
YAMAP_ORBIT_COUNT = 8;
YAMAP_ORBIT_RADIUS = 110;       // ボス中心からの距離
YAMAP_ORBIT_HIT_R = 14;
YAMAP_ORBIT_DMG = 14;
YAMAP_ORBIT_ANG_SPEED = 1.6;    // rad/sec
YAMAP_ORBIT_HIT_COOLDOWN_MS = 600;   // 同 orbit から再 dmg まで
```

## 4. 状態

### 4.1 `js/state.js`

```js
state.currentStageIdx = 0;
state.battle.bossProjectiles = [];   // {id, bossId, x,y, vx,vy, r, dmg, life,age, iconId, iconSize}
state.battle.bossOrbits      = [];   // {id, bossId, angle, r, dmg, hitR, lastHitMs, iconId, iconSize, x,y}
state.battle.bossLastFireMs  = 0;    // (実装は boss._lastFaoFireMs に分散、 reserved)
```

### 4.2 reset 規約

- `applyHeroPick` → `state.currentStageIdx = 0`
- `applyRetry` (= 死亡からのリトライ) → `state.currentStageIdx = 0`
- ステージ遷移 「次のステージへ」 → `state.currentStageIdx += 1`、 同 hero で `startBattle` 再呼出
- `startBattle` 内で `bossProjectiles.length = 0` / `bossOrbits.length = 0` を含めて全リセット
  (= 武器 / レベル / HP / XP / 撃破数も 0 に戻る)

## 5. 実装

### 5.1 `js/battle/enemies.js`

- `tickEnemies` で stage 経由で boss id / spawnIntervalMul を取得
- `spawnEnemyAtRing(enemyId)`: 雑魚は `enemyHpMul / enemyDmgMul / xpMul` を適用、 ボスは絶対値、 isBoss なら `bossAttack` / `bossAttackExtId` を entity に持たせる
- 5 分経過 / `bossDefeated` で `triggerStageEndOrTransition()` (= 既存 `triggerGameOver("clear")` を置換)

### 5.2 `js/battle/boss-attack.js` (新規)

`tickBossAttack(dt, nowMs)`:
1. `enemies.filter(e => e.isBoss)` を取得
2. 各ボスの `bossAttack` で分岐:
   - "fao": `nowMs - boss._lastFaoFireMs >= FAO_FIRE_INTERVAL_MS` で `FAO_BULLETS` 発を等間隔放射 (+ ±0.2rad のジッター)、 `state.battle.bossProjectiles` に push
   - "yamap": `state.battle.bossOrbits` がそのボスに対して `< YAMAP_ORBIT_COUNT` の場合は補充して等間隔再配置、 各 orbit の angle / x / y を毎 frame 更新
3. bossProjectiles の x/y/age 更新、 寿命切れで splice
4. プレイヤー衝突判定 (= `contactCooldownMs` throttle 共有)、 `pushDamageNumber` + `playSe(SFX.PLAYER_DAMAGED)`、 HP 0 で `triggerGameOver()`
5. 死亡したボスに紐づく entity を `_purgeOrphanedEntities` で掃除

### 5.3 `js/battle/render.js`

- `bossProjectiles` を `getExtSprite(iconId)` + `drawSpriteRotated` で描画 (= 進行方向 atan2)
- `bossOrbits` を同様、 angle + π/2 で接線方向に rotate

### 5.4 `js/battle/sprites.js`

- `getBackgroundSprite()` を `STAGE_TABLE[currentStageIdx].bgPath` 由来に変更 (= fallback で旧 `BG_IMAGE_PATH`)

### 5.5 `js/battle/stage-transition.js` (新規)

- `triggerStageEndOrTransition()`: 最終ステージなら `triggerGameOver("clear")` に委譲、 そうでなければ `pauseTime()` + `state.battle.gameOver=true` (= 重複 trigger 防止) + `#stageTransitionModal` を開く
- 「次のステージへ」 click → `state.currentStageIdx++` → `resumeTime()` → `startBattle(state.ownedHero)`
- 言語切替で再レンダ (= 既存 onLangChange と同パターン)

### 5.6 `index.html` + `css/components.css`

- `#stageTransitionModal` を Game Over modal の直前に追加 (= 既存 `.gameover-modal` クラス流用、 余分な CSS 不要)

### 5.7 `data/i18n/ui.json`

```json
"stage.clearTitle": { "ja": "ステージクリア!", "en": "Stage Clear!" },
"stage.proceed":    { "ja": "次のステージへ", "en": "Next Stage" },
"stage.proceedNext":{ "ja": "次は {next}",     "en": "Next: {next}" },
"stage.akabasu":    { "ja": "node : アバカス", "en": "node : Abacus" },
"stage.horeris":    { "ja": "node : ホレリス", "en": "node : Hollerith" },
"stage.troy":       { "ja": "node : トロイ",   "en": "node : Troy" }
```

### 5.8 `js/main.js`

- `applyHeroPick` で `state.currentStageIdx = 0`

### 5.9 `js/battle/gameover.js`

- `applyRetry` で `state.currentStageIdx = 0`

## 6. 受入基準

### ステージ 1 (= アバカス)
- [ ] 開戦時、 背景は `Image/Backgrounds/1001.png` (= 既存) のまま
- [ ] 4 分でディープ・ヨシュカが上から登場
- [ ] ボス撃破 → ステージ遷移モーダル 「ステージクリア!」 + 「次は node : ホレリス」 + 「次のステージへ」 ボタン

### ステージ 2 (= ホレリス)
- [ ] 「次のステージへ」 click → 武器 / Lv / HP / 撃破数が 0 リセット、 hero / 派閥は維持
- [ ] 背景が **1038** に切替
- [ ] 雑魚の hp / dmg が 1.5× / 1.25× 程度、 撃破時の XP が 2×
- [ ] スポーン頻度が 0.85× (= 1.18× の密度)
- [ ] 4 分で **覚醒魔王ファオ** (= id 373) が登場
- [ ] ファオが 2.2 sec ごとに **6 発のフルーツパフェ** (= ext 5055 アイコン) を放射、 接触で 18 dmg
- [ ] 撃破 → 遷移モーダル 「次は node : トロイ」

### ステージ 3 (= トロイ)
- [ ] 背景が **1060** に切替
- [ ] 雑魚の hp / dmg が 2× / 1.5×、 撃破時の XP が 3×
- [ ] 4 分で **yamap** (= id 1189) が登場
- [ ] yamap の周囲に **グランダルメ** (= ext 5002) が **8 本** 等間隔 (= 45°) で常時周回
- [ ] 周回が時計回りで角度が更新され続ける、 接触で 14 dmg (= 同 orbit から 600ms 再ヒット throttle)
- [ ] 撃破 → 既存 Game Over モーダル (= 「クリア!」 タイトル + 経過時間 / Lv / 撃破数 + 名前入力 + ranking 送信)

### 共通
- [ ] HP 0 でいつでも 「ゲームオーバー」 → リトライでステージ 1 から
- [ ] DevTools console エラー無し
- [ ] 言語切替で stage 名 / 遷移モーダルが正しく更新

## 7. リスク

- **ボス未遭遇のまま 5 分耐久** — 既存 STAGE_DURATION_MS で時間切れも `triggerStageEndOrTransition` 経由でクリア扱い (= 仕様通り)
- **boss orbit / projectile が boss 死亡時に残る** — `_purgeOrphanedEntities` で掃除、 stage 切替時は `startBattle` で配列クリア
- **大きな viewport ですべて world 端から spawn** — SPEC-026 既知問題、 mobile 主体なので保留
- **ステージ 3 yamap の 8 本周回 + 雑魚スポーン** — DPS 過多になりやすい。 ヒーロー HP / Lv up 頻度 (= xpMul 3×) で相殺見込み、 必要なら後続で再 tune

## 8. 参考

- `js/battle/archetypes.js` (= 武器 archetype、 yamap orbit のロジック参考)
- MCH catalog: `Image/Enemies/{373,1189}.png`, `Image/Extensions/{5055,5002}.png`, `Image/Backgrounds/{1038,1060}.png` を確認 (= 全 200 OK)
- ユーザー指示: 「アックスと同じ挙動で『とっておきのフルーツパフェ』を使って」 「グランダルメをブレードのように周囲に八本周回」
