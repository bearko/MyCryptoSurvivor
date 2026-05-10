---
id: SPEC-016
title: HP Bars + Damage Numbers + Hit Freeze
status: Done
pr: 18
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-016 — HP Bars + Damage Numbers + Hit Freeze

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-015 (= shockwaves / Moai homing、 stack 上)

## 1. 背景 / 課題

ユーザー指摘:

1. **「味方も敵も HP ゲージをアイコンの下に出して」**
2. **「満タンの時は非表示で、 減ったら始めて表示する」** (= 「いまどのくらい減って、 あと何発で倒せるか」 を把握)
3. **「割合だけ分かればいいので数字は不要」**
4. **「敵にダメージが入ったらダメージ量 (= 数字) をエフェクトとして出す」**
5. **「ダメージを受けた敵の動きを一瞬止めて被弾感を出す」**

## 2. ゴール

### 2.1 HP バー (= player + enemy 共通)

- アイコン下に小さい横バー
- **`hp >= hpMax` のときは描画しない**
- 数値は出さず、 fill ratio (= 割合) だけ
- 色: 緑 (= 多い) → 黄 (= 中) → 赤 (= 少) のグラデーション (= ratio に応じて)
- player と enemy で同じ仕組み

### 2.2 ダメージ数字エフェクト

- 敵に damage が入ったら、 敵の上に **ダメージ量の数字** を short text で浮かせる
- ゆっくり上に流れて (= -30 px/sec)、 透明度 fade out して 800ms で消える
- 全 damage path (= projectile / orbit / beam / bomb / shockwave) でトリガ
- player の被ダメも数字表示 (= 赤色)

### 2.3 Hit freeze

- 敵が damage を受けると `hitFreezeMs` を 100ms 立ち上げる
- `tickEnemies` で `hitFreezeMs > 0` のあいだ移動 skip + decrement
- 接触ダメージは throttle 中で起きないので freeze と整合
- 連続 hit (= per-frame) でも freeze は最大 100ms (= 累積しない、 上書き)

## 3. 非ゴール

- ダメージ数字のフォント / 字体 (= 既存 fillText、 標準フォント)
- ダメージ数字の clustering (= 同位置で複数値が重なるとそのまま重ねる)
- player hit freeze (= 既存 contactCooldownMs で十分)
- enemy HP bar の色 customization (= 全敵共通の閾値)
- HP bar の枠 / シャドウ装飾 (= シンプル fill)
- ボス級 (= HP 大) の bar 表示形式変更

## 4. 技術設計

### 4.1 state 拡張

```js
// state.js
state.battle.damageNumbers = [];   // {id, x, y, value, age, life, color, vy}
// 敵 entity (既存) にフィールド追加: hitFreezeMs (= number)
```

### 4.2 constants

```js
// constants.js
export const DAMAGE_NUMBER_LIFE_MS    = 800;
export const DAMAGE_NUMBER_RISE_PX_S  = 30;
export const DAMAGE_NUMBER_PLAYER_COLOR = "#ff7a59";
export const DAMAGE_NUMBER_ENEMY_COLOR  = "#ffffff";
export const HIT_FREEZE_MS            = 100;
export const HP_BAR_WIDTH             = 28;
export const HP_BAR_HEIGHT            = 4;
export const HP_BAR_OFFSET            = 6;     // アイコンの下端から bar までのギャップ px
export const HP_BAR_BG_COLOR          = "rgba(0, 0, 0, 0.55)";
```

### 4.3 共通 damage helper (= js/battle/damage.js 新規)

```js
import { state } from "../state.js";
import { spawnGem } from "./gems.js";
import { DAMAGE_NUMBER_LIFE_MS, DAMAGE_NUMBER_RISE_PX_S, DAMAGE_NUMBER_ENEMY_COLOR, HIT_FREEZE_MS } from "../constants.js";

/**
 * 敵に damage を与えて死亡判定 + ダメージ数字 + hit freeze。
 * 呼出側が enemies 配列の index を持っているなら、 splice は呼出側で行う (= 死亡時 true 返り値)。
 */
export function hitEnemy(enemy, dmg) {
  enemy.hp -= dmg;
  enemy.hitFreezeMs = HIT_FREEZE_MS;
  pushDamageNumber(enemy.x, enemy.y - enemy.r, dmg, DAMAGE_NUMBER_ENEMY_COLOR);
  return enemy.hp <= 0;
}

export function pushDamageNumber(x, y, value, color = DAMAGE_NUMBER_ENEMY_COLOR) {
  state.battle.damageNumbers.push({
    id: state.battle.nextEntityId++,
    x, y,
    value: Math.max(1, Math.round(value)),
    age: 0, life: DAMAGE_NUMBER_LIFE_MS,
    vy: -DAMAGE_NUMBER_RISE_PX_S,
    color,
  });
}

export function tickDamageNumbers(dt) {
  const dms = dt * 1000;
  const arr = state.battle.damageNumbers;
  for (let i = arr.length - 1; i >= 0; i--) {
    const d = arr[i];
    d.age += dms;
    d.y  += d.vy * dt;
    if (d.age >= d.life) arr.splice(i, 1);
  }
}
```

### 4.4 全 damage path の改修

各箇所で `e.hp -= dmg` を `if (hitEnemy(e, dmg)) { spawnGem; splice; killCount++ }` に置換:

- `js/battle/projectiles.js` (= 単発投射体 hit)
- `js/battle/archetypes.js` `fireShockwaves` (= 既存 shockwave AoE)
- `js/battle/archetypes.js` `tickOrbits` (= orbit hit)
- `js/battle/archetypes.js` `tickBeams` (= beam dmgPerSec、 ただし数字は控えめに or 抑制 = 毎フレーム数字が出ると煩い → beam だけは 1/3 確率で数字 push、 内部 dmg は通常)
- `js/battle/archetypes.js` `tickBombs` (= AoE 爆発)
- `js/battle/archetypes.js` `tickShockwaves` (= Moai 衝撃波 AoE)

beam の数字頻度抑制 - 単純化: beam は数字を出さない (= 連続 dmg なので体感的に数字が氾濫する)。 又は累積が一定値超えたら 1 回 push。 まずは 「beam は数字出さない」 で実装し、 違和感あれば後で調整。

### 4.5 player の被ダメ

`js/battle/enemies.js` の接触ダメージ後:
```js
if (state.stats.hp <= 0 && !b.gameOver) triggerGameOver();
// SPEC-016: ダメージ数字 (= player 上)
pushDamageNumber(b.player.x, b.player.y - b.player.r, taken, DAMAGE_NUMBER_PLAYER_COLOR);
```

### 4.6 hit freeze 反映 (= enemies.js)

```js
for (const e of b.enemies) {
  // SPEC-016: hit freeze 中は移動を停止
  if (e.hitFreezeMs && e.hitFreezeMs > 0) {
    e.hitFreezeMs -= dt * 1000;
    continue;   // 移動と接触判定をすべて skip (= 「ダメージで止まる」 演出)
  }
  // ... 既存 chase + collision
}
```

注意: hitFreezeMs 中も damage は受け得る (= 投射体が当たり続ければさらに freeze 上書き)。 OK。

### 4.7 spawnEnemy で hitFreezeMs 初期化

```js
b.enemies.push({
  ...,
  hitFreezeMs: 0,
});
```

### 4.8 HP バー render

`js/battle/render.js` の player と enemy 描画箇所で、 `hp < hpMax` のときアイコン下にバー描画:

```js
function _drawHpBar(ctx, cx, byBottom, ratio) {
  if (ratio >= 1) return;   // 満タンは非表示
  const w = HP_BAR_WIDTH, h = HP_BAR_HEIGHT;
  const x = cx - w/2, y = byBottom + HP_BAR_OFFSET;
  // 背景
  ctx.fillStyle = HP_BAR_BG_COLOR;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // fill (= 緑→黄→赤 グラデーション)
  let color;
  if      (ratio > 0.6) color = "#5ecf8a";
  else if (ratio > 0.3) color = "#f0c14b";
  else                  color = "#e76060";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, w * ratio), h);
}

// player 描画後:
_drawHpBar(ctx, px, py + player.r, state.stats.hp / state.statsMax.hp);

// enemy 描画後 (= 各 e の loop 内):
const ratio = (e.hp ?? 0) / (e.hpMax ?? 1);
_drawHpBar(ctx, sx, sy + e.r, ratio);
```

### 4.9 ダメージ数字 render

```js
ctx.font = "bold 14px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
for (const d of state.battle.damageNumbers) {
  const sx = d.x - camera.x, sy = d.y - camera.y;
  const t = d.age / d.life;
  ctx.globalAlpha = Math.max(0, 1 - t);
  // 黒 outline でくっきり
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText(String(d.value), sx, sy);
  ctx.fillStyle = d.color;
  ctx.fillText(String(d.value), sx, sy);
}
ctx.globalAlpha = 1;
ctx.textAlign = "start";
ctx.textBaseline = "alphabetic";
```

(= player 上 / enemy 上 / shockwave / bomb の被害は同 path、 値は dmg、 色は player は ifrit / enemy は white)

### 4.10 startBattle で reset

```js
b.damageNumbers.length = 0;
```

各 spawnEnemy も `hitFreezeMs: 0`。

### 4.11 RAF ループ配線

```js
// _loop
tickEnemies(...);
tickWeapons(...);
tickHomingProjectiles(...);
tickProjectiles(...);
tickOrbits(...);
tickBeams(...);
tickBombs(...);
tickShockwaves(...);
tickGems(...);
tickRegen(...);
tickDamageNumbers(dt);   // ← 追加
```

## 5. 受入基準

- [ ] 敵の **HP が満タンのとき** はバー非表示
- [ ] 敵が damage を受けて **HP が減ると** アイコン下に 横バー表示 (= 緑→黄→赤 グラデ)
- [ ] player の HP も同様 (= 満タン非表示、 減ると表示、 数字なし)
- [ ] 敵に damage が入ると **ダメージ量の数字** がアイコン上に浮かび、 上昇 + fade out で消える
- [ ] player の被ダメも数字表示 (= 赤系色)
- [ ] 敵が damage を受けると **約 100ms 動きが止まる**、 連続 hit でずっと止まることもある
- [ ] beam は数字を出さない (= 連続 dmg なので除外)
- [ ] DevTools `__state.battle.damageNumbers` で配列に積まれる
- [ ] DevTools console エラー無し
- [ ] FPS 60 (PC) / 30+ (mobile) を維持 (= 100 体 + 多数の damage 数字でも)

## 6. リスク

- **数字が画面を埋め尽くす可能性** — life 800ms × 多敵 × 多武器で同時 100+ 個。 ctx.fillText は軽い、 ただし 1000 個越えたら重い → 上限 (= 200 個) で古いものから splice
- **beam の数字 0 個** — 違和感あれば後続調整
- **hit freeze 中の HP バー / 数字描画** — そのまま機能 (= 描画は別フレームでも継続)
- **player の hit freeze** — 不要。 既存 contactCooldownMs (= 0.5sec 無敵) で十分
- **大量のダメージ数字テキスト描画** — fillText + strokeText は per-frame、 200 個でも問題なし

## 7. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants / state / damage.js / 全 damage path 改修 / enemies.js hit freeze + spawn 初期化 / battle/index.js _loop / render.js HP bar + 数字 |

## 8. 参考

- ユーザー提示の HP 表示 / ダメージ演出仕様
- 既存 `js/battle/projectiles.js` `js/battle/archetypes.js` (= 各 hit path)
- 既存 `js/battle/render.js` (= entity 描画パイプライン)
