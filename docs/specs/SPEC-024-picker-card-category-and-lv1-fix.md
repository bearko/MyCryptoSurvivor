---
id: SPEC-024
title: Picker Card Category Label + Lv.1 Effect Audit (= Oriflamme +0 → +1)
status: Done
pr: 31
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-024 — Picker Card Category Label + Lv.1 Effect Audit

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 武器エクステンションと強化エクステンションの違いが分かるようにカードの上部に
> 「武器エクステ」と「強化エクステ」と明示して欲しい。
>
> オリフラムの初期効果が「弾数＋0」になっており効果がなかったので＋1になるようにしてください。
>
> 他、レベル1で効果ゼロになってないか確認して。

## 2. ゴール

- ピッカーカード上端にカテゴリ見出しを表示 (= weapon → 「武器エクステ」、 buff → 「強化エクステ」)
- カテゴリで色分け (= weapon = 赤系、 buff = 緑系)
- Oriflamme Lv.1 の `magnitude` を `0` → `1` に修正 (= 効果ゼロを解消)
- 全 19 系列で Lv.1 がゼロ効果でないことを確認 (= 監査結果を SPEC に記録)

## 3. 監査結果 (= 全 19 系列の Lv.1)

### 武器 10 系列 (= 全て効果あり)

| ID | 系列 | Lv.1 主要パラメータ | 評価 |
|---|---|---|---|
| 1 | Revolver | bullets=1, dmg=30 | ✅ |
| 2 | Book | bullets=1, dmg=18 | ✅ |
| 3 | Panjandrum | bullets=1, dmg=60 | ✅ |
| 4 | Moai | bullets=1, dmg=25 | ✅ |
| 5 | Shuriken | bullets=3, dirs=1, dmg=15 | ✅ |
| 6 | LaserGun | bullets=1, dmg=35/s | ✅ |
| 7 | Knife | bullets=4, dmg=30 | ✅ |
| 8 | Axe | bullets=2, dmg=30 | ✅ |
| 9 | Pierrot | bullets=1, dmg=35 | ✅ |
| 10 | Blade | bullets=2, dmg=25 | ✅ |

### 強化 9 系列 (= Oriflamme のみ要修正)

| ID | 系列 | Lv.1 magnitude | 評価 |
|---|---|---|---|
| 11 | Armor | 20 (= 最大 HP +20) | ✅ |
| 12 | Ramen | 0.3 (= HP/s +0.3) | ✅ |
| 13 | Boots | 1.05 (= 速度 ×1.05) | ✅ |
| 14 | Horse | 0.95 (= cd ×0.95) | ✅ |
| 15 | Shield | 0.92 (= 被ダメ ×0.92) | ✅ |
| 16 | Apple | 1.10 (= dmg ×1.10) | ✅ |
| 17 | **Oriflamme** | **0** (= 弾数 +0) | ❌ **要修正** |
| 18 | Specimen | 1.10 (= 範囲 ×1.10) | ✅ |
| 19 | Gyoku | 1.20 (= 拾得 ×1.20) | ✅ |

## 4. 設計

### 4.1 カードカテゴリラベル (= `js/battle/levelup.js` + `css/components.css`)

`renderLevelUpModal` で各カードの先頭に `.levelup-card__cat` 要素を追加:

```js
const catEl = document.createElement("div");
catEl.className = "levelup-card__cat";
catEl.textContent = opt.ext.category === "buff"
  ? t("levelup.cat.buff",   "Buff")
  : t("levelup.cat.weapon", "Weapon");
card.append(catEl, iconWrap, main);
```

CSS は既存の `data-category` 属性に基づいて色を切り替え:
- weapon (= デフォルト) — 赤系 (`rgba(231,96,96,*)`)
- buff (`[data-category="buff"]`) — 緑系 (`rgba(94,207,138,*)`)

### 4.2 Oriflamme tierParams 補正 (= `data/extensions.json`)

| Lv | 旧 magnitude | 新 magnitude | 備考 |
|---|---|---|---|
| 1 | 0 | **1** | ゼロ効果解消 |
| 2 | 1 | 1 | 据置 (= Lv.1 同値、 後続で増分) |
| 3 | 1 | **2** | 旧 Lv.2 と同値だった重複を解消 |
| 4 | 2 | 2 | 据置 |
| 5 | 3 | 3 | 据置 (= ceiling 維持) |

旧シーケンス `0/1/1/2/3` → 新 `1/1/2/2/3` (= 単調非減少を維持しつつ Lv.1 から効果)

### 4.3 i18n (= `data/i18n/ui.json`)

```json
"levelup.cat.weapon": { "ja": "武器エクステ", "en": "Weapon" },
"levelup.cat.buff":   { "ja": "強化エクステ", "en": "Buff" }
```

## 5. 受入基準

- [ ] レベルアップピッカーで weapon カードの上端に **赤系の 「武器エクステ」** バッジが出る
- [ ] buff カードの上端に **緑系の 「強化エクステ」** バッジが出る
- [ ] EN 切替で 「Weapon」 / 「Buff」 表記に
- [ ] Oriflamme を Lv.1 でピックすると **全武器の弾数が +1** (= bulletCountBonus に 1 が入る)
- [ ] Oriflamme Lv.2 / Lv.3 / Lv.4 / Lv.5 で `+1 / +2 / +2 / +3` になる
- [ ] 他 18 系列の Lv.1 効果は変更なし (= 数値 / 名前 / icon 変動なし)
- [ ] DevTools console エラー無し

## 6. リスク

- **Oriflamme バランス変動** — Lv.1 でも +1 が入ることで序盤の DPS が伸びる。 対象は Revolver(1→2) / Pierrot(1→2) / Panjandrum(1→2) など base bullets=1 の武器群で 2 倍化するが、 Oriflamme を取らない選択肢もあり gain は player choice の範囲内
- **将来 archetype 追加時の Lv.1 ゼロ効果** — 同様の audit を SPEC に組み込む慣習化が望ましい (= 後続で Done に flip しつつ追加 archetype の Lv.1 effect は SPEC 必須欄にする)

## 7. 参考

- `js/battle/buffs.js` — bulletCountBonus を参照する archetype 群
- `js/battle/levelup.js` `renderLevelUpModal` — カード DOM 構築
- ユーザー指示: 「弾数＋0 で効果がなかったので ＋1 に」
