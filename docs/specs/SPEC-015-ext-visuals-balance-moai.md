---
id: SPEC-015
title: Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave
status: Done
pr: 17
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-015 — Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-014 (= per-hero stats)

## 1. 背景 / 課題

ユーザー指摘:

1. **「〇 ではなく、 エクステンションのアイコンを使ってください」** (= 投射体 / 周回 / 爆弾)
2. **「ナイフはデフォルトが右上を向いているので、 右下に放たれるナイフは右に 90 度、 左下には 180 度、 右上には 270 度画像を回転させて放ってください」**
   → Knife 系列は icon の自然向きが 「右上」 。 進行方向に合わせて回転させるが、 **45 度のオフセット** が必要。
3. **「全体的に性能が弱い、 序盤は一発で敵を倒せるくらいの威力に」** (= Knife、 他の弱い武器も)
4. **「モアイは、 移動しながらだと着弾点がずれてしまう。 最初にエイムした敵を追従する形で落ちてほしい」** + **「落ちたときは衝撃波 (= 〇で表現) を出して周辺にいる敵にもダメージを」**

## 2. ゴール

### 2.1 投射体の icon 描画

- 円描画を撤廃し、 entity の **extension アイコン** を描画
- 進行方向に合わせて回転 (= `Math.atan2(vy, vx)`)
- 系列ごとに **iconRotationOffset** で natural orientation 補正
  - Knife: +π/4 (= 45°)
  - 他の系列: 0
- bombs (= Pierrot) も icon 描画
- orbits (= Book / Blade) も icon 描画 (= 角度に応じて回転、 Blade は短刀方向、 Book は表紙)
- beams (= LaserGun) は線のまま (= icon 不適合)

### 2.2 アイコン preload

- `js/battle/sprites.js` を拡張: `getExtSprite(extOrId)` 追加
- 武器の lastFireMs と並列で 1 回だけ load、 cache 共有

### 2.3 Moai の homing + 着弾衝撃波

- Moai 投射体 (= archetype `dropTarget`) を **target enemy 追従型** に
- 投射体に `moaiTargetId` を持たせ、 落下中に target が動けば追従
- target が消滅した場合は最後の地点へ落下継続
- 着弾 (= 任意の敵に当たった or 落下完了) で **shockwave** を spawn
  - `state.battle.shockwaves[]` 新規 entity (= `{x, y, r0, r1, age, life, dmg, color, hitSet}`)
  - 半径が広がるリング、 r > 0 内の敵に 1 回だけ damage、 hitSet で per-enemy 重複防止
  - 描画: 透明度 fade + 線

### 2.4 武器バランス調整

ENEMY_HP_INITIAL = 30 を維持。 各武器 Lv.1 で **1〜2 撃** で雑魚を倒せる威力に:

| series | 旧 Lv.1 dmg | 新 Lv.1 dmg | 備考 |
|---|---|---|---|
| Revolver  |  8 | 30 | 1 発 = 1 撃殺。 弾数 3。 |
| Book      |  6 | 18 | 周回 = 持続接触、 同じ敵に 0.25s クールダウン。 |
| Panjandrum| 30 | 60 | 大型 1 発で 2 体貫通相当。 |
| Moai      | 18 | 25 + AoE 25 | 着弾 + 衝撃波。 |
| Shuriken  |  9 | 15 | 3 連 = 累計 45 = 1.5 体分。 |
| LaserGun  | 16/sec | 35/sec | 0.6 sec で 21 dmg、 持続中複数体貫通。 |
| Knife     |  7 | 30 | 1 発 = 1 撃殺。 |
| Axe       | 12 | 30 | 1 発 = 1 撃殺。 弾数 2。 |
| Pierrot   | 18 | 35 | AoE 半径 60。 |
| Blade     | 12 | 25 | 近距離周回、 同じ敵に 0.25s クールダウン。 |

Lv.5 までスケールも倍率を維持 (= 既存の +20%/lv は据置)。

## 3. 非ゴール

- icon サイズの per-archetype 微調整 (= 一律 18px 程度から開始)
- icon の per-tier 変化 (= 全 tier 同じ iconId、 SPEC-019 候補)
- LaserGun 自体の visual 変更 (= 線描画維持)
- 火 / 氷 などのエフェクト
- ヒーロー固有の bonus weapon

## 4. 技術設計

### 4.1 sprites.js 拡張

```js
// js/battle/sprites.js
import { extImg } from "../extensions.js";

export function getExtSprite(extOrId) {
  const id = (typeof extOrId === "object")
    ? (extOrId.iconId ?? extOrId.extId)
    : extOrId;
  return _loadImage(extImg(id));
}
```

### 4.2 archetypes.js — 投射体に icon 情報を添付

```js
function _spawnProjectile(opts) {
  state.battle.projectiles.push({
    ...opts,
    iconId:           opts.iconId   ?? null,
    iconRotOffset:    opts.iconRotOffset ?? 0,
    iconSize:         opts.iconSize ?? 18,
  });
}
```

各 fireXxx で iconId / iconRotOffset / iconSize を設定。 Knife のみ rotOffset = π/4。

例 (= fireDiagonal):
```js
_spawnProjectile({
  x, y, vx, vy, dmg, color,
  iconId: w.iconId, iconRotOffset: Math.PI / 4, iconSize: 22,
});
```

ただし weapon spec には `iconId` が含まれていないので、 weaponFromExt で payload に追加:
```js
// extensions-as-weapons.js
return { ..., iconId: ext.iconId };
```

### 4.3 Knife 系列の rotation offset

archetypes.js の `fireDiagonal` で `iconRotOffset = Math.PI / 4` を渡す。

ナイフ icon の自然向きが 「右上」 (= atan2 = -π/4) なので、 進行方向 θ で render するときの canvas rotation = θ - (-π/4) = θ + π/4。

他の系列 (= radial / random / stack / homing / dropTarget) は rotOffset = 0 (= icon 自然向き = 右、 atan2=0)。

### 4.4 render.js — 投射体描画を icon 化

```js
import { getExtSprite, drawSpriteRotated } from "./sprites.js";

// projectiles loop
for (const p of projectiles) {
  const sx = p.x - camera.x, sy = p.y - camera.y;
  if (offscreen) continue;
  let drew = false;
  if (p.iconId != null) {
    const sp = getExtSprite(p.iconId);
    const angle = Math.atan2(p.vy, p.vx) + (p.iconRotOffset ?? 0);
    drew = drawSpriteRotated(ctx, sp, sx, sy, p.iconSize, angle);
  }
  if (!drew) {
    // fallback: 既存の円描画
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
  }
}
```

`drawSpriteRotated`:
```js
export function drawSpriteRotated(ctx, entry, cx, cy, size, angle) {
  if (!entry || !entry.ready || entry.failed) return false;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const half = size / 2;
  ctx.drawImage(entry.img, -half, -half, size, size);
  ctx.restore();
  return true;
}
```

### 4.5 orbits の icon 描画

```js
for (const o of orbits) {
  const sx = ..., sy = ...;
  if (o.iconId != null) {
    const sp = getExtSprite(o.iconId);
    // Book: 角度 = 公転接線方向 (= angle + π/2)、 Blade: 同様
    const angle = o.angle + Math.PI / 2 + (o.iconRotOffset ?? 0);
    drawSpriteRotated(ctx, sp, sx, sy, o.size ?? 22, angle);
  } else {
    // 既存の円 / 長方形 fallback
  }
}
```

orbit に `iconId` を持たせる (= ensureOrbits で weapon.iconId を copy)。

### 4.6 bombs の icon 描画

```js
for (const b of bombs) {
  const sx = ..., sy = ...;
  if (b.iconId != null) {
    const sp = getExtSprite(b.iconId);
    drawSpriteRotated(ctx, sp, sx, sy, b.size ?? 26, 0);
  } else { /* 既存 */ }
}
```

`firePlaceBomb` で iconId を持たせる。

### 4.7 Moai の homing + 衝撃波

archetypes.js の `fireDropTarget` を改修:

```js
export function fireDropTarget(w, dmgMul, bulletBonus) {
  const enemies = state.battle.enemies;
  if (enemies.length === 0) return;
  const total = (w.bullets ?? 1) + bulletBonus;
  const fallH = w.params?.fallH ?? 220;
  const speed = w.speedPx;
  for (let i = 0; i < total; i++) {
    const t = enemies[Math.floor(Math.random() * enemies.length)];
    if (!t) continue;
    _spawnProjectile({
      x: t.x, y: t.y - fallH,
      vx: 0, vy: speed,
      dmg: w.dmg * dmgMul, color: w.color,
      r: 10, life: 1500,
      kind: "moaiDrop",                 // 追従用
      moaiTargetId: t.id,
      moaiAoeDmg:  w.dmg * dmgMul,      // 着弾衝撃波 dmg (= 追加で半分にしてもよい)
      moaiAoeR:    60,                  // 衝撃波半径
      iconId: w.iconId, iconSize: 24,
    });
  }
}
```

projectiles.js で moaiDrop 専用 update (= target.x 追従):

```js
export function tickProjectiles(dt) {
  // ... 既存
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    // SPEC-015: Moai の x 追従
    if (p.kind === "moaiDrop" && p.moaiTargetId != null) {
      const t = state.battle.enemies.find(e => e.id === p.moaiTargetId);
      if (t) p.x = t.x;
      // target が消滅したら追従停止 (= 最後の x を維持し落下継続)
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // ... 既存 collision
  }
}
```

衝突時 (= 既存ロジックで `e.hp -= p.dmg`) の後に `kind === "moaiDrop"` なら衝撃波 spawn:

```js
if (hit) {
  if (p.kind === "moaiDrop") {
    state.battle.shockwaves.push({
      id: state.battle.nextEntityId++,
      x: p.x, y: p.y,
      r0: 0, r1: p.moaiAoeR ?? 60,
      age: 0, life: 350,
      dmg: p.moaiAoeDmg ?? p.dmg,
      color: "#ffffff",
      hitSet: new Set(),
    });
  }
  projectiles.splice(i, 1);
}
```

### 4.8 shockwave entity (= 新規)

state.battle に追加:
```js
state.battle.shockwaves = [];   // {id, x, y, r0, r1, age, life, dmg, color, hitSet}
```

archetypes.js に tickShockwaves 追加:

```js
export function tickShockwaves(dt) {
  const dms = dt * 1000;
  const sw = state.battle.shockwaves;
  for (let i = sw.length - 1; i >= 0; i--) {
    const s = sw[i];
    s.age += dms;
    if (s.age >= s.life) { sw.splice(i, 1); continue; }
    const t = s.age / s.life;
    const r = s.r0 + (s.r1 - s.r0) * t;
    // 範囲内の敵に 1 回だけ damage
    const enemies = state.battle.enemies;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (s.hitSet.has(e.id)) continue;
      const dx = e.x - s.x, dy = e.y - s.y;
      if (dx * dx + dy * dy > r * r) continue;
      s.hitSet.add(e.id);
      e.hp -= s.dmg;
      if (e.hp <= 0) {
        spawnGem(e.x, e.y);
        enemies.splice(j, 1);
        state.killCount++;
      }
    }
  }
}
```

render に shockwave 描画 (= 透明な ring):
```js
for (const s of state.battle.shockwaves) {
  const sx = s.x - camera.x, sy = s.y - camera.y;
  const t = s.age / s.life;
  const r = s.r0 + (s.r1 - s.r0) * t;
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
```

### 4.9 武器バランス変更

`data/extensions.json` の各 weapon の tierParams を書き換え。 Lv.1 の dmg を上記表の値に。 Lv.2-5 はもとの ratio を維持しつつ底上げ。

サンプル (= Knife):
```json
"tierParams": [
  { "bullets":  4, "dmg": 30, "cdMs": 900, ... },
  { "bullets":  6, "dmg": 38, "cdMs": 880, ... },
  { "bullets":  8, "dmg": 48, "cdMs": 860, ... },
  { "bullets": 10, "dmg": 60, "cdMs": 840, ... },
  { "bullets": 12, "dmg": 75, "cdMs": 820, ... }
]
```

(= 全武器の数値は実装時に決定)

## 5. 受入基準

- [ ] 投射体 (= radial / homing / drop / stack / diagonal / random) が **アイコン** で描画される
- [ ] 投射体は進行方向に応じて回転
- [ ] **Knife** は右下 = 90° / 左下 = 180° / 左上 = 270° の回転 (= 自然向き 「右上」 を維持)
- [ ] **Book / Blade** の周回が **アイコン** で描画される
- [ ] **Pierrot** の bomb が **アイコン** で描画される
- [ ] **LaserGun** は線描画のまま (= 変更なし)
- [ ] icon 読込中 / 404 時は従来の単色円 fallback
- [ ] **Knife Lv.1** で雑魚 (HP 30) を 1 撃で倒せる
- [ ] **Revolver / Axe Lv.1** でも雑魚を 1 撃で倒せる
- [ ] **Moai** の投射体が、 移動中も最初に狙った敵を追従して落下
- [ ] **Moai** の着弾点に **衝撃波 ring** が広がり、 周辺の敵にも damage
- [ ] DevTools console エラー無し
- [ ] FPS PC 60 / mobile 30+ を維持

## 6. リスク

- **icon 読込時間** — battle 開始直後は ext icon が未 ready で fallback 円が出る → preload を main.js init() で呼んでもよい (= 必要なら別 SPEC)
- **rotation 計算の負荷** — atan2 + canvas rotate は frame ごとだが軽い
- **icon の自然向きが系列ごとに違う場合** — Knife 以外は 「右」 と仮定。 違ったら個別調整
- **Moai 追従と target 死亡の整合** — target 死亡時は最後の x を維持 + 落下継続。 別の敵に当たれば damage + shockwave
- **shockwave の dmg バランス** — 着弾と衝撃波の二重 damage に注意。 衝撃波は別の敵にしか当たらない (= hitSet で同じ敵を 2 回 damage しない、 ただし着弾敵と衝撃波は別 path で当たる可能性)
- **武器バランスの dmg up が enemy HP に追いつく** — 後続で敵 HP up や強敵 ENEMY_HP_PER_LEVEL 機構を入れたとき再調整必要

## 7. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | sprites.js 拡張 / archetypes.js 改修 / weaponFromExt iconId / projectiles.js Moai 追従 / shockwave entity / state / render / data/extensions.json バランス改 |

## 8. 参考

- ユーザー提示の Knife 回転仕様 (= 右下 90 / 左下 180 / 左上 270)
- 既存 `js/battle/archetypes.js` (= fireXxx / tickXxx)
- 既存 `js/battle/sprites.js` (= 円形クリップ)
- 既存 `data/extensions.json` v2 (= バランス調整対象)
