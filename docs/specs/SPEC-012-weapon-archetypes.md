# SPEC-012 — 10 Weapon Archetype Behaviors

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-011 (= schema v2 + buffs、 stack 上)

## 1. 背景

SPEC-011 で extension schema v2 (= 17 系列 × 5 段階) と強化 7 系列が動いた。 ただし武器 10 系列は
すべて同一の 「最寄り敵ホーミング投射体」 で動作している。 ユーザー提示の系列別挙動を実装する:

| 系列 | archetype | 挙動 |
|---|---|---|
| Revolver | radial | 敵方向に放射状 N 発、 lv up で弾数増 |
| Book | orbit | 自分を周回、 lv up で周回数増、 範囲広め |
| Panjandrum | bigHoming | ゆっくり追尾の大型弾、 lv up で大きさ + 弾数 |
| Moai | dropTarget | ランダム敵の頭上から落下、 lv up で弾数増 |
| Shuriken | stack | 最寄り方向に 3 連 × N 方向、 lv up で方向増 |
| LaserGun | beam | 発射時の最寄り方向に貫通レーザー (= 持続)、 lv up で発数増 |
| Knife | diagonal | 対角 4 方向、 lv up で本数増 |
| Axe | randomRadial | ランダム方向に投擲、 lv up で弾数増 |
| Pierrot | placeBomb | 現在地に置き遅延爆発、 lv up で配置数増 |
| Blade | orbitClose | 近距離高速周回 (= Book より狭く威力高め)、 lv up で本数増 |

## 2. ゴール

- `js/battle/archetypes.js` 新規 (= 全 archetype の spawn / tick 実装をまとめる)
- weapons.js を **dispatcher** に再構成 (= archetype に応じて archetype.js の spawn 関数を呼ぶ)
- 新 entity:
  - `state.battle.orbits[]` (= Book / Blade、 持続周回)
  - `state.battle.beams[]` (= LaserGun、 持続レーザー)
  - `state.battle.bombs[]` (= Pierrot、 置爆弾)
  - `state.battle.projectiles[]` (= 既存) に optional `targetId` を追加 (= bigHoming のホーミング)
- 各 archetype の挙動を **決定論的に reproducible** (= テスト可能、 Math.random は spawn のみ、 tick は決定論)
- buffs.bulletCountBonus を全 archetype の弾数に加算 (= +0/+1/+1/+2/+3 by Oriflamme tier)
- render に: orbits / beams / bombs を描画
- pauseFlags 連動: 全 tick が `state.pauseFlags > 0` で skip される (= 既存 _loop の gate を維持)
- DevTools `__state.battle.orbits / beams / bombs` で確認可能

## 3. 非ゴール

- archetype 個別アニメーション (= 着弾エフェクト / トレイル) は SPEC-013 以降
- ヒーロー固有のスタート武器 (= 全 hero 同じ pick)
- 武器スロット制限
- 衝突判定の高速化 (= spatial hashing 等)
- 物理 (= 慣性 / 反射)
- レアリティ昇格時の per-tier アイコン変化 (= 既存 iconId 共有のまま)

## 4. 各 archetype の挙動詳細

### 4.1 radial (Revolver)
- fire: nearest 敵方向 ± `spreadDeg/2` の範囲に `bullets + bulletCountBonus` 発を等間隔角度で
- 各 projectile は normal 投射体 (= 直線、 寿命まで)
- 敵 0 体時: 何もしない (= 既存挙動踏襲)

### 4.2 orbit (Book) / orbitClose (Blade)
- 持続周回: weapon ごとに **常に `bullets + bulletCountBonus` 個** の orbit が存在
- 各フレーム desired count vs current count を比較し、 不足は spawn / 過剰は除去
- spawn 時の初期 angle は等間隔
- tick: 角速度 = `orbitClose` で速め (= 2.4 rad/s)、 `orbit` で遅め (= 1.2 rad/s)
- world 位置 = player + (cos,sin) × orbitR
- 敵衝突: 同一敵への hit cooldown 250ms (= orbit の hitMap で per-enemy 管理)
- ダメージ: weapon.dmg × dmgMul、 orbit 自身は消滅しない

### 4.3 bigHoming (Panjandrum)
- fire: nearest 敵を `targetId` として記録、 投射体 spawn
- tick (= projectile 側に追加): targetId が生きてる間は毎フレーム再計算で速度ベクタを target 方向に補正、 targetId が死んでたら直進継続
- 描画半径は `params.size` を使う (= 既存 PROJECTILE_RADIUS の代わり)
- ダメージは既存 projectile collision を流用 (= 1 hit splice)

### 4.4 dropTarget (Moai)
- fire: 候補敵から random 選択 × `bullets + bulletCountBonus` 体
- 各 projectile spawn 位置 = (target.x, target.y - fallH)、 速度 = (0, fallSpeed)
- 落下中に衝突した敵 (= 着弾点付近) に dmg、 通常 projectile collision を流用
- target が居なくなっても投射体は落下し続ける

### 4.5 stack (Shuriken)
- fire: nearest 敵方向を `dirs` 等分 (= 1, 2, 3, 4, 8 方向)、 nearest 方向を 0° として配分
- 各方向に 3 連 (= `bullets`) の projectile を spawn
- stack の表現: 同じ方向ベクタで `stackGap` ピクセルずつ後ろにずらして spawn
- 通常 projectile (= 直線、 1 hit splice)

### 4.6 beam (LaserGun)
- fire: nearest 敵方向を 0° として `bullets + bulletCountBonus` 本のレーザーを spawn (= bullets > 1 なら 360/(bullets) ごと)
- beam state: `{ dirX, dirY, len, thick, age, life: durMs, dmgPerSec, color, lastDmgMs, weaponExtId }`
- tick: age += dt*1000、 life 超で除去
- 描画: 毎フレーム (player.x, player.y) → (player.x + dir × len, player.y + dir × len) の太い線 (= 持続中はヒーロー中心に方向は固定)
- ダメージ: 各フレーム、 線分から `thick/2 + enemy.r` 以内の敵に `dmgPerSec × dt` 与える
- 0 HP 敵は除去 + gem ドロップ + killCount

### 4.7 diagonal (Knife)
- fire: 360° を `bullets + bulletCountBonus` 等分 (= bullets=4 で 4 diagonals = 45/135/225/315)
- 各方向に projectile 1 発
- 通常 projectile (= 直線、 1 hit splice)
- 開始角度はオフセット 45° (= 4 のとき diagonal、 8 のとき 22.5° 始まりで diag + cardinal)

### 4.8 randomRadial (Axe)
- fire: ランダム方向に `bullets + bulletCountBonus` 発
- 通常 projectile

### 4.9 placeBomb (Pierrot)
- fire: player 周辺 (= ±20px ランダムオフセット) に `bullets + bulletCountBonus` 個の bomb 配置
- bomb state: `{ x, y, fuseMs, age, radius, dmg, color }`
- tick: age += dt*1000、 age >= fuseMs で AoE damage (= radius 内全敵に dmg)、 除去
- AoE で死んだ敵は gem ドロップ + killCount
- 描画: 円 + 内側に小さい点 (= 中心)。 fuseMs 残り 30% で点滅 (= alpha mod)

### 4.10 orbitClose (Blade): orbit と同形だが
- orbitR が小さい (= 50〜58)
- 角速度 高い (= 2.4 rad/s)
- dmg 高い (= tierParams 反映)
- 視覚: 直線 (= 短い剣) で表現

## 5. state.battle 拡張

```js
state.battle = {
  // 既存 ...
  enemies: [],
  gems: [],
  projectiles: [],   // {id, x, y, vx, vy, r, dmg, color, life, age, targetId?, kind?}
  weapons: [],

  // SPEC-012 新規
  orbits: [],        // {id, weaponExtId, angle, r, dmg, color, hitMap, kind}
  beams: [],         // {id, x, y, dirX, dirY, len, thick, age, life, dmgPerSec, color}
  bombs: [],         // {id, x, y, r, dmg, fuseMs, age, color, radius}
};
```

`hitMap` は plain object `{[enemyId]: nowMs}` で十分 (= 軽量)。

## 6. weapons.js 改修

```js
import * as A from "./archetypes.js";

export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  const cdMul = state.buffs.cdMul ?? 1;
  const dmgMul = state.buffs.dmgMul ?? 1;
  const bulletBonus = state.buffs.bulletCountBonus ?? 0;
  for (const w of b.weapons) {
    // 持続系 (= orbit / orbitClose) は spawn を desired count に合わせる、 cd 不要
    if (w.archetype === "orbit" || w.archetype === "orbitClose") {
      A.ensureOrbits(w, dmgMul, bulletBonus);
      continue;
    }
    const cd = w.cdMs * cdMul;
    if (nowMs - w.lastFireMs < cd) continue;
    w.lastFireMs = nowMs;
    switch (w.archetype) {
      case "radial":       A.fireRadial(w, dmgMul, bulletBonus); break;
      case "bigHoming":    A.fireBigHoming(w, dmgMul, bulletBonus); break;
      case "dropTarget":   A.fireDropTarget(w, dmgMul, bulletBonus); break;
      case "stack":        A.fireStack(w, dmgMul, bulletBonus); break;
      case "beam":         A.fireBeam(w, dmgMul, bulletBonus); break;
      case "diagonal":     A.fireDiagonal(w, dmgMul, bulletBonus); break;
      case "randomRadial": A.fireRandomRadial(w, dmgMul, bulletBonus); break;
      case "placeBomb":    A.firePlaceBomb(w, dmgMul, bulletBonus); break;
      default:             A.fireHoming(w, dmgMul); break;
    }
  }
}
```

## 7. tick 関数の追加

```js
// archetypes.js
export function tickOrbits(dt) { /* angle += w_speed*dt; pos = player+offset; check enemy hits with hitMap throttle */ }
export function tickBeams(dt) { /* age += dt*1000; lifecycle; per-frame damage to enemies on the line segment */ }
export function tickBombs(dt) { /* age += dt*1000; if fused, AoE damage + remove */ }
export function tickHomingProjectiles(dt) { /* projectiles with targetId: redirect velocity each frame */ }
```

`tickHomingProjectiles` は既存 `tickProjectiles` の前に呼ぶ (= homing は弾道補正のみ、 移動 / 衝突は既存 tickProjectiles に任せる)

## 8. render 改修

順序:
1. clear + grid
2. bombs (= 円 + 点滅)
3. beams (= 太い線 fade by age)
4. gems
5. projectiles (= 既存)
6. enemies
7. orbits (= 円 / 短い四角)
8. player

orbit の描画: book (= 紫円), blade (= 細い長方形を angle で回転)。 archetype で分岐。

## 9. 受入基準

- [ ] **Revolver**: pick 後、 nearest 敵方向に 3 (Lv.1) → 8 (Lv.5) 発の弾が放射状に飛ぶ
- [ ] **Book**: pick 後、 自分の周りを紫の球が常に周回 (= 1〜5 個、 lv up で増)、 触れた敵にダメージ (= 0.25 sec ごと)
- [ ] **Panjandrum**: 1 発のゆっくり追尾大型弾が出る、 lv up で同時数 + サイズ + dmg up
- [ ] **Moai**: ランダム敵の頭上から projectile が落下、 lv up で複数
- [ ] **Shuriken**: nearest 方向に 3 連が飛ぶ、 lv up で 2/3/4/8 方向に増える
- [ ] **LaserGun**: 発射時の nearest 方向に持続レーザー (= 0.6 sec)、 通った敵全員に dmg/sec
- [ ] **Knife**: 4 対角線方向に projectile が飛ぶ、 lv up で本数増
- [ ] **Axe**: ランダム方向に projectile が飛ぶ、 lv up で本数増
- [ ] **Pierrot**: player 位置に bomb が置かれ、 1 sec 後に AoE 爆発、 lv up で複数
- [ ] **Blade**: 自分の周りを近距離で速く回る刃、 Lv.1 で 2 本、 lv up で 6 本まで
- [ ] **Oriflamme** (= bulletCountBonus) 取得で全 archetype の弾数 / 同時数が +1 ずつ増える
- [ ] DevTools console エラー無し
- [ ] FPS PC 60、 mobile 30+ で 100 体程度 + 多武器同時発射に耐える

## 10. リスク・懸念

- **計算量**: orbit × N + beam ↔ 全敵 × N + projectile ↔ 全敵 × N で N² 寄り。 100 体 × 10 武器なら 1000 オーダーで OK だが、 bomb 爆発の AoE は瞬時 N 回計算で 1 回だけなので問題なし
- **bigHoming の追従**: targetId が死んでたら直進継続。 死亡判定は projectile 側で `enemies.find(e=>e.id===id)` を毎フレーム計算するので O(N)、 全 homing 弾 × N 敵で重い可能性 → 通常時 homing 弾は数発なので許容
- **beam の thickness 衝突**: 線分と円の距離計算は O(1) だが視覚と一致させる必要 → `thick/2 + enemy.r` で許容
- **placeBomb のオフセット**: 同 frame 複数置きは player 位置にぴったり集まると同時爆発が干渉 → ±20px ランダムオフセットで分散
- **pauseFlags 中の age 加算**: tickXxx は _loop 内 gate 内なので pause 中は止まる、 OK
- **orbit の同時数最大**: Lv.5 で 5 (Book) / 6 (Blade)、 計 11。 通常レベルでは数発なので軽い
- **Lv up 時の orbit 即時反映**: rebuildWeaponsFromOwned が weapon spec を再生成するが orbits 配列はそのまま、 ensureOrbits が次フレームで desired count に合わせ自動増減

## 11. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | state.battle 拡張 / archetypes.js 新規 / weapons.js dispatcher 化 / projectiles.js homing 追従 / index.js _loop に新 tick / render.js に bombs/beams/orbits 描画 |

## 12. 参考

- 既存 `js/battle/weapons.js` (= SPEC-008 / SPEC-011 形)
- 既存 `js/battle/projectiles.js` (= 既存 collision)
- 既存 `js/battle/render.js` (= 描画パイプライン)
- ユーザー提示の 10 系列スキル説明
- VS の代表的武器パターン (= magic wand / book / lightning ring etc)
