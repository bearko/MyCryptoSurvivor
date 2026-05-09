# SPEC-007 — Enemies, Hardcoded Weapon, XP Gems, Level Trigger

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-006 (= battle scaffold、 stack 上)

## 1. 背景 / 課題

SPEC-006 で 「歩ける土台」 はできたが、 敵が居ないので何も起きない。
本 SPEC で **VS ゲームループの最低限** を完成させる:

- 敵が湧く / プレイヤーを追う / ぶつかると HP が減る
- プレイヤーには 1 つの **仮 hardcoded 武器** (= 周囲衝撃波) があり、 自動発射で敵を倒す
- 倒した敵は XP gem を落とし、 プレイヤーが歩いて拾うと XP 増加
- XP が閾値に達すると Level up (= 数字だけ上がる、 モーダルは SPEC-008)

ここまで来ればプレイ感はほぼ VS 相当。 SPEC-008 で武器を Extension に置き換え、
SPEC-009 で Game Over を入れて完成。

## 2. ゴール

- `state.battle` を拡張: `enemies[]` / `gems[]` / `weapons[]` / `shockwaveAnims[]` / `nextEntityId` / `lastEnemySpawnMs` / `contactCooldownMs` (= プレイヤー被弾 throttle)
- 敵スポーン: 一定間隔で viewport 外周ランダム位置、 上限 `MAX_ENEMIES`
- 敵 AI: tick ごとにプレイヤー方向ベクタ × `enemy.speed * dt` で移動
- 接触判定: 敵 vs プレイヤーの距離 < `enemy.r + player.r` で被弾、 throttle あり (= `state.battle.contactCooldownMs > 0` の間は無敵)
- HP 反映: `state.stats.hp -= enemy.dmg`、 0 でクランプ
- 仮武器 = shockwave: 1.0 sec ごとに自動発射、 半径 80px 内の全敵に 10 ダメージ、 短い ring アニメ表示
- 敵死亡: HP 0 → リスト除去 → 同位置に XP gem 1 個ドロップ
- XP gem: 拾える距離 (= player + gem の距離 < pickup radius) で消失、 `state.xp += gem.value`
- Level up: `state.xp >= state.xpToNext` のあいだループで level++、 xp -= xpToNext、 xpToNext = `Math.ceil(xpToNext * 1.5)`
- 描画: 敵 (= 赤円)、 gem (= 黄ダイヤ)、 shockwave (= 白ring 透明 fade)
- pauseFlags 連動: モーダル中は ticks 全 skip、 描画は freeze
- DevTools `__state.battle` で全要素確認可能

## 3. 非ゴール

- Level up モーダル UI / extension 選択 (= SPEC-008)
- HP 0 = Game Over (= SPEC-009)
- 複数武器 / 武器の rank up / passive (= SPEC-008 以降)
- 敵バリエーション (= 1 種類のみ、 後続で複数種)
- 敵の難易度カーブ (= spawn interval は固定、 後続で時間関数化)
- ノックバック / 敵間衝突
- パーティクル / sound effect

## 4. ユーザー体験

1. hero pick → battle 開始 → 周囲に赤い丸が出現し始める
2. 何もしなくても 1 秒に 1 回プレイヤー周囲が白く光って、 触れた敵が消滅
3. 倒れた敵から黄色いダイヤが落ち、 拾うと HUD の XP bar が増える
4. XP が閾値に達すると HUD の Lv が上がり、 XP bar が次の閾値で再スタート
5. 敵に触れていると HUD の HP bar が 0.5 sec ごとに減る
6. 6: HP=0 でも止まらない (= SPEC-009 まで Game Over なし)、 遊び続けられるが HP は 0 のまま
7. モバイル: 触れた瞬間 joystick で逃げられる、 PC: WASD で走る

## 5. 技術設計

### 5.1 state.battle 拡張

```js
state.battle = {
  // 既存
  active, player, camera, viewport,

  // 新規 (= SPEC-007)
  enemies: [],                  // {id, x, y, r, hp, hpMax, dmg, speed, color}
  gems: [],                     // {id, x, y, r, value, color}
  shockwaveAnims: [],           // {x, y, r0, r1, age, life, color}
  weapons: [                    // 仮 hardcoded
    { kind: "shockwave", radius: 80, dmg: 10, cooldownMs: 1000, lastFireMs: 0 },
  ],
  nextEntityId: 1,
  lastEnemySpawnMs: 0,
  contactCooldownMs: 0,         // > 0 なら被弾 throttle 中
};
```

### 5.2 constants 追加

```js
// constants.js (= 追記)
export const ENEMY_SPAWN_INTERVAL_MS    = 800;   // 0.8 sec ごと
export const ENEMY_SPAWN_MARGIN_PX      = 80;    // viewport 外側に湧く距離
export const ENEMY_SPEED_PX_S           = 80;
export const ENEMY_HP_INITIAL           = 30;
export const ENEMY_DMG                  = 10;
export const ENEMY_RADIUS               = 12;
export const ENEMY_COLOR                = "#e76060";
export const MAX_ENEMIES                = 200;

export const CONTACT_COOLDOWN_MS        = 500;   // 被弾 throttle 0.5 sec

export const GEM_VALUE                  = 1;
export const GEM_RADIUS                 = 6;
export const GEM_COLOR                  = "#f0c14b";
export const GEM_PICKUP_RADIUS          = 28;

export const SHOCKWAVE_VISUAL_LIFE_MS   = 220;
export const SHOCKWAVE_VISUAL_COLOR     = "rgba(255,255,255,0.8)";

export const XP_TO_NEXT_GROWTH          = 1.5;   // 閾値 = ceil(prev * 1.5)
```

### 5.3 モジュール

| ファイル | export |
|---|---|
| `js/battle/enemies.js` | `tickEnemies(dt, nowMs)` / `spawnEnemyAtRing(nowMs)` |
| `js/battle/weapons.js` | `tickWeapons(dt, nowMs)` (= shockwave 発射 + 敵処理) |
| `js/battle/gems.js`    | `spawnGem(x,y, value)` / `tickGems(dt)` (= 拾い + level up) |
| `js/battle/index.js`   | RAF ループ拡張、 enemies/weapons/gems の tick を呼ぶ + アニメ tick |
| `js/battle/render.js`  | enemies / gems / shockwaveAnims を描画 |

### 5.4 RAF ループ拡張

```js
// battle/index.js 内 _loop
if (state.battle.active && state.pauseFlags === 0) {
  const v = getInputVector();
  tickPlayer(dt, v);
  centerCameraOnPlayer();
  tickEnemies(dt, now);          // 敵スポーン + 移動 + 接触
  tickWeapons(dt, now);          // shockwave 発射 + 敵 HP 削り + 死亡 → gem
  tickGems(dt);                  // 拾う + level up
  tickShockwaveAnims(dt);        // visual fade
  if (state.battle.contactCooldownMs > 0) {
    state.battle.contactCooldownMs -= dt * 1000;
  }
}
```

### 5.5 敵スポーン

```js
// enemies.js
import { state } from "../state.js";
import { ENEMY_SPAWN_INTERVAL_MS, ENEMY_SPAWN_MARGIN_PX,
         ENEMY_SPEED_PX_S, ENEMY_HP_INITIAL, ENEMY_DMG,
         ENEMY_RADIUS, ENEMY_COLOR, MAX_ENEMIES } from "../constants.js";

export function tickEnemies(dt, nowMs) {
  const b = state.battle;
  // spawn
  if (b.enemies.length < MAX_ENEMIES &&
      nowMs - b.lastEnemySpawnMs >= ENEMY_SPAWN_INTERVAL_MS) {
    spawnEnemyAtRing(nowMs);
    b.lastEnemySpawnMs = nowMs;
  }
  // chase + collide
  const px = b.player.x, py = b.player.y;
  for (const e of b.enemies) {
    const dx = px - e.x, dy = py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
    // contact damage
    if (b.contactCooldownMs <= 0 && d < e.r + b.player.r) {
      state.stats.hp -= e.dmg;
      if (state.stats.hp < 0) state.stats.hp = 0;
      b.contactCooldownMs = CONTACT_COOLDOWN_MS;
    }
  }
}

export function spawnEnemyAtRing(nowMs) {
  const b = state.battle;
  // viewport 外周のランダム位置
  const halfW = b.viewport.w / 2 + ENEMY_SPAWN_MARGIN_PX;
  const halfH = b.viewport.h / 2 + ENEMY_SPAWN_MARGIN_PX;
  const angle = Math.random() * Math.PI * 2;
  // 矩形ではなく ellipse 周上で spawn (= 簡易)
  const x = b.player.x + Math.cos(angle) * halfW;
  const y = b.player.y + Math.sin(angle) * halfH;
  b.enemies.push({
    id: b.nextEntityId++,
    x, y, r: ENEMY_RADIUS,
    hp: ENEMY_HP_INITIAL, hpMax: ENEMY_HP_INITIAL,
    dmg: ENEMY_DMG,
    speed: ENEMY_SPEED_PX_S,
    color: ENEMY_COLOR,
  });
}
```

### 5.6 仮 hardcoded 武器: shockwave

```js
// weapons.js
import { state } from "../state.js";
import { SHOCKWAVE_VISUAL_LIFE_MS, SHOCKWAVE_VISUAL_COLOR } from "../constants.js";
import { spawnGem } from "./gems.js";

export function tickWeapons(dt, nowMs) {
  const b = state.battle;
  for (const w of b.weapons) {
    if (w.kind !== "shockwave") continue;
    if (nowMs - w.lastFireMs < w.cooldownMs) continue;
    w.lastFireMs = nowMs;
    fireShockwave(w);
  }
}

function fireShockwave(w) {
  const b = state.battle;
  const px = b.player.x, py = b.player.y;
  // visual
  b.shockwaveAnims.push({
    x: px, y: py, r0: 0, r1: w.radius, age: 0, life: SHOCKWAVE_VISUAL_LIFE_MS,
    color: SHOCKWAVE_VISUAL_COLOR,
  });
  // damage
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e = b.enemies[i];
    const dx = e.x - px, dy = e.y - py;
    if (dx*dx + dy*dy <= w.radius * w.radius) {
      e.hp -= w.dmg;
      if (e.hp <= 0) {
        spawnGem(e.x, e.y);
        b.enemies.splice(i, 1);
      }
    }
  }
}

export function tickShockwaveAnims(dt) {
  const arr = state.battle.shockwaveAnims;
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].age += dt * 1000;
    if (arr[i].age >= arr[i].life) arr.splice(i, 1);
  }
}
```

### 5.7 XP gem + level up

```js
// gems.js
import { state } from "../state.js";
import { GEM_VALUE, GEM_RADIUS, GEM_COLOR, GEM_PICKUP_RADIUS,
         XP_TO_NEXT_GROWTH } from "../constants.js";

export function spawnGem(x, y, value = GEM_VALUE) {
  const b = state.battle;
  b.gems.push({
    id: b.nextEntityId++,
    x, y, r: GEM_RADIUS, value, color: GEM_COLOR,
  });
}

export function tickGems(dt) {
  const b = state.battle;
  const px = b.player.x, py = b.player.y;
  const r = GEM_PICKUP_RADIUS;
  for (let i = b.gems.length - 1; i >= 0; i--) {
    const g = b.gems[i];
    const dx = g.x - px, dy = g.y - py;
    if (dx*dx + dy*dy <= r*r) {
      state.xp += g.value;
      b.gems.splice(i, 1);
    }
  }
  // level up loop (= 1 frame で複数 LV up しうる)
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
  }
}
```

### 5.8 描画拡張 (= render.js)

プレイヤー描画前に enemies / gems / shockwaveAnims を描く順:

1. clear + grid
2. shockwave anim (= 円の outline、 alpha = 1 - age/life)
3. gems (= 黄色 rotated square)
4. enemies (= 赤 fill + 暗縁)
5. player (= 既存)

カリング: 各 entity の screen 座標が viewport 外なら描画 skip。

### 5.9 startBattle 改修

```js
// battle/index.js startBattle
b.enemies.length = 0;
b.gems.length = 0;
b.shockwaveAnims.length = 0;
b.weapons = [{ kind:"shockwave", radius:80, dmg:10, cooldownMs:1000, lastFireMs: 0 }];
b.nextEntityId = 1;
b.lastEnemySpawnMs = performance.now();
b.contactCooldownMs = 0;
state.stats.hp = state.statsMax.hp;
state.xp = 0;
state.level = 1;
state.xpToNext = 5;
state.elapsedTicks = 0;
```

(= reset on each startBattle、 idempotent)

## 6. 受入基準

- [ ] 起動 1 秒以内に画面外周から赤い丸が湧き始める
- [ ] 赤い丸はプレイヤーに向かって移動 (= 8 方向以上の任意角度)
- [ ] プレイヤー周囲に 1 sec ごとに白いリングが広がり、 接触敵が即消滅
- [ ] 敵消滅地点に黄色ダイヤが残る
- [ ] プレイヤーがダイヤに近づくと拾われ、 HUD の XP bar が増える
- [ ] XP が 5 に達すると Lv が 1 → 2、 XP bar が `0/8` (= ceil(5*1.5)=8) で再スタート
- [ ] 敵に触れたまま 0.5 sec ごとに HP が 10 ずつ減る (= contact throttle)
- [ ] HP 0 で停止せずプレイ続行 (= Game Over は SPEC-009)
- [ ] hero modal / help modal を開くと敵 / shockwave / 全 entity 静止
- [ ] DevTools console エラー無し
- [ ] FPS 60 (PC)、 30+ (mobile) で 100 体程度の敵を捌ける

## 7. リスク・懸念

- **N^2 計算の暴走** — shockwave damage で N 敵 × M 武器の二重ループ。 武器は 1 個なので問題無いが、 SPEC-008 で複数武器化したら spatial hashing 検討
- **HP=0 で停止しない** — UX 的に違和感ありだが、 Game Over は SPEC-009 で別 PR にした方が責務分離が綺麗
- **spawn 位置の偏り** — `Math.random()` の角度均等分布。 player の進行方向に偏らせる adaptive spawn は後続
- **`Math.hypot` の頻繁呼出** — 1 frame N 敵 × 距離計算は重め。 まずは naive 実装、 計測して問題あれば dx*dx+dy*dy 比較に
- **state.contactCooldownMs の単位** — ms にして dt * 1000 で減算。 `dt` は秒で持つ既存規約を維持
- **shockwaveAnims の memory leak** — life ベース splice で確実に GC
- **モバイル touch + 移動同時に shockwave** — joystick の DOM 上で発火しているので canvas pointermove と独立、 衝突なし

## 8. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants / state.battle 拡張 / battle/{enemies,weapons,gems}.js / index.js + render.js 改修 |

## 9. 参考

- VS の設計: 自動武器 + プレイヤーは移動のみ
- 過去 SPEC: SPEC-006 (= battle scaffold)、 SPEC-005 (= xp/level state field)
