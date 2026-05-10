---
id: SPEC-028
title: Orbit Redistribution + Per-Level Size Growth (= Book/Blade 等間隔 + tier icon swap + Lv 連動拡大)
status: Done
pr: 35
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-028 — Orbit Redistribution + Per-Level Size Growth

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ブレードやブックなど常時表示系のエクステンションをレベルアップやオリフラムで弾数増やした場合、
> - 既存のブレードやブックのアイコンをレベルアップ後のアイコンに差し替え
> - ブレードは追加分と既存分が等間隔で並ぶように都度再配置をお願いします
>   (2 本なら 180°、 3 本なら 120°、 4 本なら 90° という具合に)
>
> 武器エクステはレベルアップに伴い攻撃範囲も少し上げてほしい (= 当たり判定とアイコンを少しずつ大きく)

現状の `ensureOrbits` (= `js/battle/archetypes.js`) は:
- 既存の orbit 角度を維持しつつ、 末尾だけに追加 → 全体として **等間隔にならない**
  (例: 2 本 → 3 本に増やすと 180° / 60° / 120° の歪んだ配置)
- `iconId` を作成時にしか書き込まないため、 weapon の tier (= レベルアップで切替わる) に追従しない
- 全武器系列で `iconSize` / 投射体 `r` が完全固定で、 レベルアップしても見た目 / 当たり判定が変わらない

## 2. ゴール

### A. orbit 系 (= Book / Blade) の都度再配置 + tier icon 同期
- `desired = bullets + bulletBonus` が変わるたびに **全 owned orbit を等間隔に再配置** (= `2π / desired` 間隔)
- 既存先頭 orbit の `angle` を anchor にして再配置 (= 回転がスムーズに継続)
- 毎 frame で `iconId` / `iconSize` / `radius` (= 当たり) / `dmg` / `color` を **現 weapon spec から再書込** (= 直近のレベルアップが即時反映)

### B. 全武器の per-level サイズ拡大
- `WEAPON_SIZE_GROWTH_PER_LEVEL = 0.06` (= +6%/Lv、 Lv.5 で +24%) を導入
- `_levelSizeMul(w) = 1 + GROWTH × (w.level - 1)`
- 適用先:
  - Revolver / Shuriken / Knife / Axe / fallback Homing: 投射体 `iconSize` + `r` (PROJECTILE_RADIUS)
  - Panjandrum: `r = size × lvMul`、 `iconSize = max(28, size×1.6) × lvMul`
  - Moai (drop): `r = 10 × lvMul`、 `iconSize = 28 × lvMul`
  - LaserGun: `thick = baseThick × lvMul` (= ビーム厚で当たり判定広がる)
  - Pierrot (bomb): `iconSize = 26 × lvMul` (= 視覚のみ、 AoE radius は既存通り tier param)
  - orbit (Book / Blade): `radius` (= 当たり) と `iconSize` の base に lvMul を掛け、 毎 frame 反映

## 3. 設計

### 3.1 constants

```js
// js/constants.js
export const WEAPON_SIZE_GROWTH_PER_LEVEL = 0.06;
```

### 3.2 archetypes.js ヘルパ

```js
function _levelSizeMul(w) {
  const lv = w?.level ?? 1;
  return 1 + WEAPON_SIZE_GROWTH_PER_LEVEL * (lv - 1);
}
```

### 3.3 `ensureOrbits` リファクタ

```js
export function ensureOrbits(w, dmgMul, bulletBonus) {
  const desired = (w.bullets ?? 1) + bulletBonus;
  const orbits  = state.battle.orbits;
  const r       = (w.params?.orbitR ?? 70) * (state.buffs?.rangeMul ?? 1);
  const lvMul   = _levelSizeMul(w);
  const baseHitR     = (w.archetype === "orbitClose") ?  9 : 11;
  const baseIconSize = (w.archetype === "orbitClose") ? 22 : 26;
  const hitR     = baseHitR     * lvMul;
  const iconSize = baseIconSize * lvMul;
  const dmg      = Math.max(1, Math.round(w.dmg * dmgMul));

  // 既存 orbit に毎 frame 再書込 (= レベルアップ即時反映 + tier icon swap)
  for (const o of orbits) {
    if (String(o.weaponExtId) !== String(w.extId)) continue;
    o.r = r; o.radius = hitR; o.iconId = w.iconId; o.iconSize = iconSize;
    o.dmg = dmg; o.color = w.color;
  }

  let owned = orbits.filter(o => String(o.weaponExtId) === String(w.extId));
  if (owned.length === desired) return;

  const baseAng = (owned.length > 0) ? owned[0].angle : 0;
  // … desired 個まで push or 末尾削除 …

  // 等間隔再配置 (= 2 → 180° / 3 → 120° / 4 → 90° / N → 360°/N)
  owned = orbits.filter(o => String(o.weaponExtId) === String(w.extId));
  const step = (Math.PI * 2) / Math.max(1, desired);
  for (let i = 0; i < owned.length; i++) owned[i].angle = baseAng + step * i;
}
```

### 3.4 fireXxx の lvMul 適用

各 fireXxx の冒頭で `const lvMul = _levelSizeMul(w);` を計算し、 `_spawnProjectile` の `iconSize` / `r`、 `state.battle.bombs` の `iconSize`、 `state.battle.beams` の `thick` を lvMul で乗算。

### 3.5 render: bomb iconSize を bomb entity から読む

`js/battle/render.js` の bomb 描画で 26 ハードコードを `b.iconSize ?? 26` に変更。

## 4. 受入基準

### orbit 再配置 + icon swap
- [ ] Book Lv.1 (1 本) → Lv.2 (2 本) で **180°** の対角に並ぶ
- [ ] Book Lv.2 (2 本) → Lv.3 (3 本) で **120°** 等分
- [ ] Book Lv.3 (3 本) → Lv.4 (4 本) で **90°** 等分
- [ ] Book Lv.4 (4 本) → Lv.5 (5 本) で **72°** 等分
- [ ] Blade も同様に等間隔 (= Lv.1 から 2 本のため、 2/3/4/5/6 で 180/120/90/72/60°)
- [ ] **Oriflamme で +N**: Book Lv.1 + Oriflamme Lv.1 (+1) → 2 本 = 180° 等間隔
- [ ] レベルアップ瞬間に Book / Blade の icon が次 tier に切替わる (= tierIconIds 連動)
- [ ] 回転は途切れず継続 (= リセット感がない)

### per-level サイズ拡大
- [ ] Revolver Lv.1 → Lv.5 で投射体アイコンが目視で 1.24× 程度に
- [ ] Knife Lv.5 で投射体当たり判定が広がる (= 雑魚を以前より掠れにくく当てやすい)
- [ ] LaserGun Lv.5 でビーム厚が増す
- [ ] Pierrot (bomb) Lv.5 で爆弾アイコンが大きく見える (= AoE 半径自体は tier param)
- [ ] Moai 落石も Lv.5 で本体が大きく
- [ ] Book / Blade Lv.5 で orbit の当たり判定が広く、 アイコンも大きい

### 共通
- [ ] DevTools console エラー無し
- [ ] retry 後も Lv.1 表示で当たり判定が初期サイズに戻る

## 5. リスク

- **当たり判定 vs アイコン視覚の乖離** — 武器 tier の base は手動 tuning 値、 GROWTH 6% は控えめなので大幅な balance 崩れにはならない見込み。 Lv.5 でも +24% で許容範囲
- **bullet count 過多時の orbit 等間隔 anchor** — 1 本のみ存在で角度を anchor にするのは OK。 0 本 → N 本のときは anchor=0 で開始
- **redistribute 頻度** — 個数変化検出は `owned.length !== desired` のみ。 個数変化が無いフレームは redistribute 走らないので CPU は無視できる

## 6. 参考

- `js/battle/archetypes.js` (= SPEC-012)
- `js/battle/extensions-as-weapons.js` `weaponFromExt` (= tier icon ロジック、 SPEC-021)
- ユーザー指示: 「2 本なら 180°、 3 本なら 120°、 4 本なら 90° という具合に角度を等間隔に」
- ユーザー指示: 「武器エクステはレベルアップに伴い攻撃範囲も少し上げてほしい」
