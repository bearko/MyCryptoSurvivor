---
id: SPEC-026
title: Balance Tuning + Bounded Stage with Background (= XP / Gyoku / 1001.png + dim overlay)
status: Done
pr: 33
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-026 — Balance Tuning + Bounded Stage with Background

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> - レベルアップの閾値をもう少し低くしてほしい (= レベルアップしやすく)
> - つよい敵ほどドロップする経験値を多く (= 後半サクサク)
> - ギョクのレベルアップ効果範囲をより広く (= 今の上がり幅の 2 倍)
> - 暗背景で暗色の敵が見えにくい → `Image/Backgrounds/1001.png` の上に半透明ダーク
> - ステージサイズ = 背景画像サイズ (= 1000 × 1500)、 端まで行ったら越えない

## 2. ゴール

- `XP_TO_NEXT_INITIAL` を `5` → `4`、 `XP_TO_NEXT_GROWTH` を `1.5` → `1.3`
- `ENEMY_SPECS` 各 entry に `xpValue` を追加 (= 雑魚 1, ヴェンティ 2, メリッサ 4, バンディット 7, ボス 60)
- 撃破時の gem.value を `enemy.xpValue` 由来に
- Gyoku tierParams を `1.2 / 1.4 / 1.65 / 1.95 / 2.3` → `1.4 / 1.8 / 2.3 / 2.9 / 3.6` (= 0 起点増分を倍化)
- 世界座標を `1000 × 1500` (= 中心 0,0) で有限化、 player / camera / spawn を端でクランプ
- 背景に `Image/Backgrounds/1001.png` を 1 枚だけ stage 全域に描画、 `rgba(0,0,0,0.45)` のオーバーレイで dim

## 3. 設計

### 3.1 XP 曲線 (= `js/constants.js`)

```js
// SPEC-026
export const XP_TO_NEXT_INITIAL = 4;     // 5 → 4
export const XP_TO_NEXT_GROWTH  = 1.3;   // 1.5 → 1.3
```

| Lv | 旧 (5/1.5) | 新 (4/1.3) | Δ |
|---|---|---|---|
| 1→2 |  5 |  4 | -1 |
| 2→3 |  8 |  6 | -2 |
| 3→4 | 12 |  8 | -4 |
| 4→5 | 18 | 11 | -7 |
| 5→6 | 27 | 15 | -12 |
| 6→7 | 41 | 20 | -21 |
| 7→8 | 62 | 26 | -36 |
| 8→9 | 93 | 34 | -59 |

### 3.2 敵 XP value (= `js/constants.js` + `js/battle/enemies.js` + `js/battle/damage.js`)

```js
export const ENEMY_SPECS = {
  101: { ..., xpValue:  1 },
  124: { ..., xpValue:  2 },
  134: { ..., xpValue:  4 },
  164: { ..., xpValue:  7 },
  171: { ..., xpValue: 60 },
};
```

`spawnEnemyAtRing` で `enemy.xpValue = spec.xpValue ?? 1` を持たせ、 `damage.hitEnemy` 死亡時に
`spawnGem(e.x, e.y, e.xpValue ?? 1)` で渡す (= 既存 `spawnGem(x,y,value=GEM_VALUE)` の第 3 引数を活用)。

### 3.3 Gyoku 倍化 (= `data/extensions.json`)

| Lv | 旧 magnitude | 新 magnitude | 0 起点増分の倍化 |
|---|---|---|---|
| 1 | 1.20 | **1.4** | +0.2 → +0.4 |
| 2 | 1.40 | **1.8** | +0.4 → +0.8 |
| 3 | 1.65 | **2.3** | +0.65 → +1.30 |
| 4 | 1.95 | **2.9** | +0.95 → +1.90 |
| 5 | 2.30 | **3.6** | +1.30 → +2.60 |

### 3.4 有限ステージ (= `js/constants.js` + `js/battle/player.js` + `js/battle/enemies.js`)

```js
export const WORLD_W = 1000;
export const WORLD_H = 1500;
```

- **player clamp**: `tickPlayer` 末尾で `p.x` を `[-W/2 + r, W/2 - r]`、 `p.y` を `[-H/2 + r, H/2 - r]` に
- **camera clamp**: `centerCameraOnPlayer` で
  - viewport ≥ world → `camera = -viewport/2` (= world center を画面 center)
  - viewport < world → `camera ∈ [-W/2, W/2 - viewport]`
- **spawn clamp**: `spawnEnemyAtRing` 末尾で同様に `[-W/2+r, W/2-r]` 範囲に丸める

### 3.5 背景 + オーバーレイ (= `js/battle/sprites.js` + `js/battle/render.js` + `js/battle/index.js`)

```js
// constants.js
export const BG_IMAGE_PATH    = "Image/Backgrounds/1001.png";
export const BG_OVERLAY_COLOR = "rgba(0, 0, 0, 0.45)";

// sprites.js
export function getBackgroundSprite() { return _loadImage(img(BG_IMAGE_PATH)); }

// index.js startBattle
getBackgroundSprite();   // preload

// render.js renderBattle (冒頭)
ctx.fillStyle = "#0e0c14"; ctx.fillRect(0,0,w,h);   // stage 外の枠は黒
_drawBackground(ctx, camera, w, h);                 // bg + 半透明ダーク overlay
_drawGrid(...);                                     // 既存グリッド (= bg の上に薄く)
```

`_drawBackground` は world → screen 変換した矩形を `viewport` と AABB 交差させて
`drawImage` + `fillRect(BG_OVERLAY_COLOR)` を順に重ねる。 画像未読込でも overlay は描画する
(= 暗色面で fallback)。

## 4. 受入基準

### バランス
- [ ] 開戦直後 Lv.1 → Lv.2 に必要な XP が **4** で表示 (= HUD)
- [ ] 後半 (= 4 分経過時点) で同じ撃破ペースでも以前より明らかに level が伸びる
- [ ] バイトバンディット撃破で gem 1 個が +7 XP として加算される (= console / state.xp 確認)
- [ ] Deep Yoshka 撃破で **+60 XP**
- [ ] Gyoku Lv.1 ピックで CE 収集半径が `28 * 1.4 = 39.2px` 相当に
- [ ] Gyoku Lv.5 で `28 * 3.6 = 100.8px` 相当に

### ステージ
- [ ] バトル開始で `Image/Backgrounds/1001.png` が画面に表示
- [ ] 上に半透明ダークが乗り、 暗色の敵 (= シルエット弱) が以前より見やすい
- [ ] WASD / 仮想スティックで端まで移動すると越えなくなる (= 上下左右 4 方向で確認)
- [ ] desktop で viewport が world より大きい場合、 world の外周 (= 上下左右の余白) は黒のまま
- [ ] mobile で viewport が world より小さい場合、 player に追従してスクロール、 world 端で停止
- [ ] 敵スポーンは world 内に収まる (= 端で出現することがあるが viewport 外には飛ばない)
- [ ] Deep Yoshka が world 内 (= 上端付近) にスポーン

## 5. リスク

- **大きな viewport で全敵が world 端からのみ出現** — 現在 spawn ring が viewport 由来なので、 viewport > world では端クランプで疑似的に四隅出現になる。 mobile 主体なので深追いせず後続 SPEC で必要なら緩和
- **背景画像 1.5MB** — preload 中は overlay のみで dim、 ready 後すぐ反映。 初回のみ通信遅延あり
- **WORLD サイズが固定** — 別背景に切替えると整合崩れ。 後続でステージ別 SPEC を作るとき `WORLD_W/H` をデータ駆動化

## 6. 参考

- ユーザー指示: 「ステージの大きさ = 背景画像の大きさ」 「端までいったらそれ以上先にはいけない」
- ユーザー指示: 「ギョクのレベルアップによる効果範囲の幅をより広く (今の上がり幅の 2 倍)」
- 背景: <https://github.com/bearko/mycryptoheroes/blob/main/Image/Backgrounds/1001.png>
