---
id: SPEC-019
title: 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon
status: Done
pr: 23
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-019 — 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10
- **Updated**: 2026-05-10
- **依存**: なし (= main 直接、 SPEC-018 PR #21 と並列)

## 1. 背景 / 課題

ユーザーから 4 件の指示:

1. **強化エクステンションを 2 系列追加**:
   - 液浸標本 (= 攻撃判定範囲の拡大)
   - ギョク (= CE 収集範囲の拡大)
2. **リボルバーシリーズ**:
   - 弾のアイコンを 「銃そのもの」 ではなく **◯ もしくは弾丸状アイコン** に
   - Lv.1 の弾数を **1 つに引き下げ** (= 3 は強すぎる)
3. **ブレードシリーズ**: ブックとの差異を出すため、 周回半径を **より狭く** (= ヒーローに近く)
4. **経験値 gem のアイコン**: `bearko/mycryptoheroes/main/Image/Icons/ce.png` に差し替え

## 2. ゴール

### 2.1 強化系列 2 種追加

- `data/extensions.json` v2 に 2 entry を追加:
  - extId **18** = `series: "Specimen"` / `archetype: "attackRangeUp"` / 系列名 「液浸標本」
  - extId **19** = `series: "Gyoku"` / `archetype: "pickupRangeUp"` / 系列名 「ギョク」
- `state.buffs` に `rangeMul` / `pickupMul` (= 既定 1) を追加
- 各 fireXxx / ensureOrbits / fireBeam / firePlaceBomb / fireDropTarget で **range 系パラメータに `rangeMul` を乗算**:
  - weapon.range (= 最寄り敵検索半径)
  - params.orbitR (= Book / Blade の周回半径)
  - params.len (= LaserGun ビーム長)
  - params.radius (= Pierrot 爆発 AoE)
  - params.aoeR (= Moai 着弾衝撃波)
- gem 拾得半径 = `GEM_PICKUP_RADIUS * pickupMul`
- buffs.js `applyBuff` の switch に `attackRangeUp` / `pickupRangeUp` を追加
- buffs.js `resetBuffs()` に rangeMul=1, pickupMul=1 を追加

### 2.2 Revolver の弾アイコンを丸 / 弾丸に

- 投射体描画用の **新フィールド `projectileIconId` (= 任意)** を ext entry に追加
  - `null` (= 明示的に指定) → 投射体は icon を使わず、 既存の単色円 fallback を使用
  - 未指定 → 従来通り `ext.iconId` を使う (= 後方互換)
- Revolver entry に `"projectileIconId": null` を設定
- weaponFromExt: `projectileIconId` を weapon spec に伝播
- archetypes.js _spawnProjectile / fireXxx: iconId を渡すときは `w.projectileIconId ?? w.iconId` を参照

### 2.3 Revolver Lv.1 弾数 = 1

- Revolver の tierParams 配列を全段書き換え:
  - Lv.1: bullets **1** (= 旧 3)
  - Lv.2: bullets **2** (= 旧 4)
  - Lv.3: bullets **3** (= 旧 5)
  - Lv.4: bullets **4** (= 旧 6)
  - Lv.5: bullets **6** (= 旧 8)
  - 1 発で 1 撃殺の dmg は維持 (= Lv.1 30 / Lv.5 75)、 cdMs / range / speedPx / spreadDeg は据置

### 2.4 Blade を Book より明確に近距離化

- Blade の tierParams.orbitR を全段書き換え:
  - Lv.1: **32** (= 旧 50)
  - Lv.2: **34** (= 旧 52)
  - Lv.3: **36** (= 旧 54)
  - Lv.4: **38** (= 旧 56)
  - Lv.5: **40** (= 旧 58)
- Book の orbitR (70/75/80/85/90) は据置 → 約 **半分の半径** で明確に近距離

### 2.5 XP gem アイコン差し替え

- 既存 `state.battle.gems[]` の描画は黄色ダイヤ (= 45° 回転正方形)
- 新規: `bearko/mycryptoheroes/Image/Icons/ce.png` (= MCH の経験値アイコン) に差し替え
- `js/constants.js` に `GEM_ICON_PATH = "Image/Icons/ce.png"` を追加
- `js/battle/sprites.js` に `getGemSprite()` ヘルパを追加 (= `_loadImage(img(GEM_ICON_PATH))`)
- `js/battle/render.js` で gem 描画を sprite 化、 ready=false / failed=true なら従来のダイヤ fallback

## 3. 非ゴール

- 全武器系列の re-balance (= Revolver / Blade のみ)
- 弾丸専用アイコンを別途デザインして commit する (= 円 fallback で対応、 必要なら別 SPEC で SVG 等を起こす)
- buff 系列の追加トータル数調整 (= 既存 7 + 新 2 = 9 buff、 picker 重複防止は SPEC-013 で実装済)
- iconId mapping の更なる調整 (= SPEC-018 PR #21 の枠で対応)
- 経験値の獲得量 / xp-to-next の curve 調整

## 4. 技術設計

### 4.1 data/extensions.json — entry 追加 + 既存 2 系列改修

(= 全文は Phase 1 の diff を参照)

```jsonc
// Revolver (extId 1) の改修部分
{
  "extId": 1, "category": "weapon", "series": "Revolver",
  "archetype": "radial",
  "iconId": 1029,
  "projectileIconId": null,           // ← NEW: 投射体は円描画
  "seriesColor": "#56ccf2",
  "tierNames": [...],                  // 不変
  "skillName": {...},                  // 不変
  "skillDescTpl": {...},               // 不変
  "tierParams": [                      // bullets を 1/2/3/4/6 に
    { "bullets": 1, "dmg": 30, ... },
    { "bullets": 2, "dmg": 38, ... },
    { "bullets": 3, "dmg": 48, ... },
    { "bullets": 4, "dmg": 60, ... },
    { "bullets": 6, "dmg": 75, ... }
  ]
}

// Blade (extId 10) の orbitR
"tierParams": [
  { "bullets": 2, "dmg": 25, "cdMs": 600, "range": 0, "speedPx": 0, "orbitR": 32 },
  { "bullets": 3, ..., "orbitR": 34 },
  { "bullets": 4, ..., "orbitR": 36 },
  { "bullets": 5, ..., "orbitR": 38 },
  { "bullets": 6, ..., "orbitR": 40 }
]

// extId 18 — 液浸標本 (= 攻撃範囲 up)
{
  "extId": 18, "category": "buff", "series": "Specimen",
  "archetype": "attackRangeUp",
  "iconId": 1019,                       // Turtle (= 標本のような甲羅)
  "seriesColor": "#9be7c4",
  "tierNames": [
    { "ja": "液浸標本",       "en": "Specimen" },
    { "ja": "結晶標本",       "en": "Crystal Specimen" },
    { "ja": "黄金標本",       "en": "Aurum Specimen" },
    { "ja": "古代標本",       "en": "Ancient Specimen" },
    { "ja": "禁断標本",       "en": "Forbidden Specimen" }
  ],
  "skillName":    { "ja": "拡張視野",    "en": "Wide Sight" },
  "skillDescTpl": { "ja": "攻撃範囲 ×{magnitude}", "en": "Attack range ×{magnitude}" },
  "tierParams": [
    { "magnitude": 1.10 },
    { "magnitude": 1.20 },
    { "magnitude": 1.32 },
    { "magnitude": 1.46 },
    { "magnitude": 1.60 }
  ]
}

// extId 19 — ギョク (= CE 収集範囲 up)
{
  "extId": 19, "category": "buff", "series": "Gyoku",
  "archetype": "pickupRangeUp",
  "iconId": 1009,                       // Ring (= 玉 / 装飾)
  "seriesColor": "#fdcb6e",
  "tierNames": [
    { "ja": "ギョク",         "en": "Gyoku" },
    { "ja": "勾玉",           "en": "Magatama" },
    { "ja": "翡翠玉",         "en": "Jade Orb" },
    { "ja": "賢者の石",       "en": "Sage Stone" },
    { "ja": "天玉",           "en": "Heavenly Orb" }
  ],
  "skillName":    { "ja": "招集",        "en": "Beckon" },
  "skillDescTpl": { "ja": "CE 収集範囲 ×{magnitude}", "en": "CE pickup range ×{magnitude}" },
  "tierParams": [
    { "magnitude": 1.20 },
    { "magnitude": 1.40 },
    { "magnitude": 1.65 },
    { "magnitude": 1.95 },
    { "magnitude": 2.30 }
  ]
}
```

### 4.2 state.buffs 拡張

```js
// state.js
buffs: {
  ...
  rangeMul:         1,    // 液浸標本: 攻撃範囲倍率
  pickupMul:        1,    // ギョク: CE 収集範囲倍率
}
```

### 4.3 buffs.js

```js
case "attackRangeUp":  buffs.rangeMul  = m; break;
case "pickupRangeUp":  buffs.pickupMul = m; break;
```

`resetBuffs()`:
```js
state.buffs.rangeMul  = 1;
state.buffs.pickupMul = 1;
```

### 4.4 archetypes.js — rangeMul 適用

各 fireXxx の検索半径 / 投射体寿命 / orbit半径 / beam長 / bomb半径 / Moai aoeR を `rangeMul` 倍:

```js
// 例: fireRadial / fireDiagonal / fireRandomRadial / fireStack / fireHoming / fireBigHoming
const rangeMul = state.buffs?.rangeMul ?? 1;
const target = _findNearestEnemy(px, py, w.range * rangeMul);

// fireBeam
len: (w.params?.len ?? 600) * rangeMul,

// firePlaceBomb
radius: (w.params?.radius ?? 60) * rangeMul,

// fireDropTarget
moaiAoeR: aoeR * rangeMul,

// ensureOrbits
const r = (w.params?.orbitR ?? 70) * rangeMul;
```

### 4.5 投射体 iconId の上書き

```js
// extensions-as-weapons.js weaponFromExt
return {
  ...,
  iconId:           ext.iconId ?? null,
  projectileIconId: (ext.projectileIconId !== undefined) ? ext.projectileIconId : ext.iconId,
};
```

```js
// archetypes.js _spawnProjectile / fireXxx
_spawnProjectile({
  ...,
  iconId: w.projectileIconId,   // null なら render 側で fallback 円
});
```

### 4.6 gems.js — pickupMul

```js
const r = GEM_PICKUP_RADIUS * (state.buffs?.pickupMul ?? 1);
const r2 = r * r;
```

### 4.7 sprites.js — getGemSprite

```js
import { GEM_ICON_PATH } from "../constants.js";
import { img } from "../constants.js";

export function getGemSprite() {
  return _loadImage(img(GEM_ICON_PATH));
}
```

### 4.8 render.js — gem 描画を sprite 化

```js
const gemSprite = getGemSprite();
for (const g of gems) {
  const sx = g.x - camera.x, sy = g.y - camera.y;
  if (offscreen) continue;
  // SPEC-019: ce.png を 16-20px で描画、 fallback はダイヤ
  const drew = drawSpriteCircular(ctx, gemSprite, sx, sy, g.r * 1.6);
  if (!drew) {
    // 既存ダイヤ fallback
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.moveTo(sx,        sy - g.r);
    ...
  }
}
```

`drawSpriteCircular` は SPEC-010 既存。 ce.png は丸い MCH エンブレムなので円形クリップでよい。

## 5. 受入基準

- [ ] **液浸標本** を pick → DevTools `__state.buffs.rangeMul` が 1.10 (Lv.1) 等に切替、 投射体到達距離 / orbit 半径 / beam 長が拡大
- [ ] **ギョク** を pick → DevTools `__state.buffs.pickupMul` が 1.20 等に切替、 XP gem の吸引範囲が広がる
- [ ] Level up 候補に 液浸標本 / ギョク が混在 (= 全 19 系列から sample)
- [ ] **Revolver** Lv.1 で **弾 1 発** だけ放たれる (= 旧 3 発から減量)
- [ ] **Revolver** の弾は銃画像ではなく **○ (= 単色円)** で描画
- [ ] **Blade** の周回半径が Book と比べて **明確に半分以下** (= 視覚で 「内周」 が分かる)
- [ ] **XP gem** が `Image/Icons/ce.png` (= MCH 経験値アイコン) で描画 (= 黄色ダイヤから変更)
- [ ] gem icon 404 / load 失敗時はダイヤ fallback
- [ ] DevTools console エラー無し
- [ ] schema validity 維持 (= JSON parse OK)、 全 19 entry が読み込める

## 6. リスク

- **rangeMul の orbit 適用** — Blade を狭くしたのに rangeMul を掛けると元に戻りかねない。 この SPEC では Blade orbitR=32-40、 Specimen Lv.5=×1.60 で最大 64 (= Book Lv.1=70 より小さい)。 違和感ない範囲
- **picker の重複防止** — extId が unique (= 18, 19 が新規追加) なので SPEC-013 の Set ロジックがそのまま機能
- **CDN 404** — Image/Icons/ce.png が無い場合は fallback ダイヤ。 image preload が初回 frame で間に合わない場合も同様
- **HERO_STARTING_WEAPON との整合** — extId 18-19 は buff カテゴリなので starter 武器 mapping (= heroId → weapon extId 1-10) に影響なし
- **SPEC-018 (= PR #21) との順序** — どちらが先に merge されても data/extensions.json が衝突する可能性あり。 本 PR は SPEC-018 と独立した entry / 行を変更するが、 extId 1 (Revolver) は両方触る → conflict 起こりうる。 base=main で立ててマージ前に rebase 想定
- **Specimen / Gyoku の icon 適合性** — 1019 Turtle / 1009 Ring は MCH 既存 icon、 完全一致ではない。 ユーザー再調整希望なら別 SPEC で

## 7. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants / state.buffs / buffs.js / archetypes.js / extensions-as-weapons / sprites.js / gems.js / render.js / data/extensions.json (= Revolver / Blade / 新 2 entry) |

## 8. 参考

- 既存 `js/battle/buffs.js` (= 強化系列の switch)
- 既存 `js/battle/archetypes.js` (= fireXxx / ensureOrbits)
- `https://github.com/bearko/mycryptoheroes/blob/main/Image/Icons/ce.png` (= XP gem 新アイコン)
- SPEC-011 (= 強化系列 archetype 設計、 7 種を 9 種に拡張)
- SPEC-013 (= picker の重複防止 Set)
