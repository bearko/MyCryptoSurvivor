---
id: SPEC-003
title: MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備)
status: Done
pr: 4
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-003 — MCH IP Data Sources (= heroes / extensions / enemies 先行整備)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-002 (= 同じ feat/spec-002 ブランチにスタック)
- **Source**: `bearko/mycryptoheroes` (= MCH 公開図鑑由来の curated データベース、 権利上利用できない対象は除外済)

## 1. 背景 / 課題

SPEC-002 では 10 体のヒーローを **placeholder の単漢字命名** で入れた。 PROJECT_CHARTER §1 で
明示しているとおり MyCryptoSurvivor は MCH 経済圏の fan project であり、 ヒーロー / エクステンション /
エネミーの **名称・アイコン・スタッツは MCH IP に揃える** のが本筋。

bearko 個人の curated 図鑑 `bearko/mycryptoheroes` には以下が公開されている:

| 種別 | 件数 | パス |
|---|---|---|
| Heroes | 404 | `Data/Heroes/heroes.json` + `Image/Heroes/{id}.png` |
| Extensions | 1,797 | `Data/Extensions/extensions.json` + `Image/Extensions/{id}.png` |
| Enemies | 938 | `Data/Enemies/enemies.json` + `Image/Enemies/{filename}.png` |

これらをまだ UI が消費しない (= サバイバル本編未実装) 段階でも **データソース層を先に整備** することで、
後続 SPEC で UI を載せるときに名称/IP の決定を蒸し返さないで済む。

## 2. ゴール

- `ASSET_BASE` を `bearko/mycryptoheroes/main/` に切り替え (= 画像 CDN を本物に接続)
- `data/heroes.json` を **10 体の curated MCH ヒーロー** で書き換え (= SPEC-002 placeholder の上書き)
- `data/extensions.json` を **10 件 curated** で新規追加 (= UI 未接続だが loader + state 受け皿あり)
- `data/enemies.json` を **10 件 curated** で新規追加 (= 同上)
- `js/heroes.js` を MCH スキーマに合わせて更新 (= `faction` 概念導入、 `attributes` 配列を hint で表示)
- `js/extensions.js` / `js/enemies.js` 新規 (= 同じ loader パターン)
- ヒーロー選択モーダルが MCH ヒーロー名 (= ja: コナン・ドイル / en: Arthur Conan Doyle 等) で描画
- 5 派閥 (GENBU / SUZAKU / BYAKKO / SEIRYU / KOURYU) のいずれも色分けされて表示
- 起動時に 3 者とも `loadXxx()` が解決し、 fail 時は console.error で見える化

## 3. 非ゴール

- ヒーロースタッツの戦闘 / クラフト計算への反映 (= サバイバル本編 SPEC で別途)
- エクステンションの装備 / 合成 UI
- エネミーとの遭遇 / 戦闘 UI
- 全 404 / 1,797 / 938 件の取り込み (= 各 10 件の curated subset で十分。 拡張は後続 SPEC で)
- 画像のリポジトリへのコミット (= raw URL 参照のみ)

## 4. ユーザー体験

### 4.1 シナリオ

1. Title → Press to Start → ヒーロー選択モーダル (= SPEC-001 / SPEC-002 と同じ動線)
2. **モーダルに並ぶのは MCH の 10 ヒーロー**:
   - 1001 コナン・ドイル / Arthur Conan Doyle (Common, GENBU)
   - 1002 甲斐姫 / Kaihime (Common, SUZAKU)
   - 1004 シートン / Ernest Thompson Seton (Common, GENBU)
   - 1006 ピタゴラス / Pythagoras (Common, SEIRYU)
   - 2001 ライト兄弟 / Wright Brothers (Uncommon, KOURYU)
   - 2002 スパルタクス / Spartacus (Uncommon, SUZAKU)
   - 2005 グリム兄弟 / Brothers Grimm (Uncommon, GENBU)
   - 2011 孫子 / Sun Tzu (Uncommon, BYAKKO)
   - 2012 石田三成 / Ishida Mitsunari (Uncommon, SEIRYU)
   - 2013 許褚 / Xu Chu (Uncommon, BYAKKO)
3. 各タイル: portrait (= `Image/Heroes/{id}.png`) + 名前 + 派閥絵文字 + rarity ラベル
4. タイル選択時 hint に attributes 配列 (= "Soft Science / England / Mystery") を表示
5. 「冒険を始める」 で `state.ownedHero` 確定 → ヘッダー badge に派閥絵文字 + 名前

### 4.2 派閥カラー / 絵文字 (= 五行 + 四神 + 黄龍)

| Faction | 漢字 | 方位 / 五行 | 色変数 | 絵文字 |
|---|---|---|---|---|
| SEIRYU  | 青龍 | 東 / 木 | `--seiryu  = #5ecf8a` (緑) | 🐉 |
| SUZAKU  | 朱雀 | 南 / 火 | `--suzaku  = #e76060` (赤) | 🔥 |
| BYAKKO  | 白虎 | 西 / 金 | `--byakko  = #d4d4dc` (銀) | 🐅 |
| GENBU   | 玄武 | 北 / 水 | `--genbu   = #56ccf2` (青) | 🐢 |
| KOURYU  | 黄龍 | 中央 / 土 | `--kouryu = #f0c14b` (金) | 🐲 |

DESIGN_CHARTER §2 のカラーパレットに **5 派閥色を追加** する (= 既存 4 元素は残しつつ併記)。

## 5. 技術設計

### 5.1 ASSET_BASE 切替

```js
// js/constants.js
// Before (SPEC-001)
export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/MyCryptoSurvivor-assets/main/";
// After (SPEC-003)
export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/mycryptoheroes/main/";
```

これで `Image/Heroes/{id}.png` / `Image/Extensions/{id}.png` / `Image/Enemies/{file}.png` が直接取れる。

### 5.2 heroes.json スキーマ (v2)

```json
{
  "version": 2,
  "source":  "bearko/mycryptoheroes",
  "heroes": [
    {
      "heroId": 1001,
      "name":   { "ja": "コナン・ドイル", "en": "Arthur Conan Doyle" },
      "rarity": "Common",
      "faction": "GENBU",
      "attributes": ["Soft Science", "England", "Mystery"],
      "stats":  { "hp": 192, "phy": 25, "int": 69, "agi": 138 }
    }
  ]
}
```

**SPEC-002 (v1) からの変更**:
- `element` (= garuda/ifrit/leviathan/tiamat) → `faction` (= GENBU/SUZAKU/BYAKKO/SEIRYU/KOURYU)
- `blurb` を撤去 (= 公式図鑑にないため捏造しない)。 hint には `attributes` 配列を `/` 区切りで描画
- `version` を 2 に上げ、 loader で警告のみ (= breaking 扱いはしない、 旧データは存在しない)
- `heroId` は MCH 公式 ID (= 4 桁、 1000 番台 = Common, 2000 番台 = Uncommon, ...)

### 5.3 extensions.json スキーマ

```json
{
  "version": 1,
  "source":  "bearko/mycryptoheroes",
  "extensions": [
    {
      "extId":  1001,
      "name":   { "ja": "ノービスブレード", "en": "Novice Blade" },
      "rarity": "Common",
      "series": "Blade",
      "stats":  { "hp": 60, "phy": 59, "int": 0, "agi": 0 }
    }
  ]
}
```

10 件: ノービス系 5 (Blade/Musket/Quill/Armor/Horse) + 雑系 5 (Axe/Dragon/Bull/Monkey/Goblet)。
全件 Common で UI 未接続のため複雑性は最小化。 後続 SPEC で series/rarity 拡張。

### 5.4 enemies.json スキーマ

```json
{
  "version": 1,
  "source":  "bearko/mycryptoheroes",
  "enemies": [
    {
      "enemyId": 101,
      "name":    { "ja": "クリーパー ショート", "en": "Creeper-short" },
      "stats":   { "hp": 8, "phy": 4, "int": 4, "agi": 4 }
    }
  ]
}
```

10 件: Creeper / Elk Cloner / Heartbleed / Melissa / Byte Bandit / Bagle 系の小型雑魚で
HP / stats レンジは小さめ (= サバイバル序盤想定)。 ボス級は除外 (= 必要になったら別 SPEC で枠を増やす)。

### 5.5 関数

| モジュール | 関数 | 役割 |
|---|---|---|
| `js/heroes.js` (改修) | `loadHeroes` | `data/heroes.json` (v2) を fetch + cache |
| | `factionEmoji(faction)` | 派閥 → 絵文字マップ (= 5 種) |
| | `getHero` / `heroImg` / `localizedHeroName` | (= SPEC-002 と同じ) |
| | `localizedHeroBlurb` | **撤去** (= attributes ベースの hint に置換) |
| `js/extensions.js` (新規) | `loadExtensions` | `data/extensions.json` を fetch + cache |
| | `EXT_ROSTER` / `EXT_DEFS` / `getExt` / `extImg` | accessor |
| `js/enemies.js` (新規) | `loadEnemies` | `data/enemies.json` を fetch + cache |
| | `ENEMY_ROSTER` / `ENEMY_DEFS` / `getEnemy` / `enemyImg` | accessor |

### 5.6 main.js / state.js への影響

- `init()` で `Promise.all([initI18n, loadHeroes, loadExtensions, loadEnemies])` を await
- `state.js` に `EXTENSION_ROSTER` / `ENEMY_ROSTER` 由来の参照は持たない (= モジュール側で保持)
  ただし「装備中エクステンション」「遭遇中エネミー」 のための pending スロットは Phase 4+ 以降で別途
- `renderHeroSelectModal` 内の `localizedHeroBlurb` 呼出を `attributes.join(" / ")` に変更
- `data-element` 属性を `data-faction` に置換 (= CSS の border-top-color 切替を 5 色対応)

### 5.7 i18n キー

| キー | ja | en |
|---|---|---|
| `hero.faction.SEIRYU` | 青龍 | Seiryu |
| `hero.faction.SUZAKU` | 朱雀 | Suzaku |
| `hero.faction.BYAKKO` | 白虎 | Byakko |
| `hero.faction.GENBU` | 玄武 | Genbu |
| `hero.faction.KOURYU` | 黄龍 | Kouryu |

`hero.element.*` (SPEC-002) は **撤去** (= faction で置換、 4 元素は本作には合わない)。

### 5.8 CSS 追加 / 改名

`base.css` に派閥色を追加:

```css
:root {
  --seiryu:  #5ecf8a;   /* 青龍 / 東 / 木 */
  --suzaku:  #e76060;   /* 朱雀 / 南 / 火 */
  --byakko:  #d4d4dc;   /* 白虎 / 西 / 金 */
  --genbu:   #56ccf2;   /* 玄武 / 北 / 水 */
  --kouryu:  #f0c14b;   /* 黄龍 / 中央 / 土 */
}
```

`components.css` のセレクタ:

```css
.hero-tile[data-faction="SEIRYU"] { border-top-color: var(--seiryu); }
.hero-tile[data-faction="SUZAKU"] { border-top-color: var(--suzaku); }
.hero-tile[data-faction="BYAKKO"] { border-top-color: var(--byakko); }
.hero-tile[data-faction="GENBU"]  { border-top-color: var(--genbu); }
.hero-tile[data-faction="KOURYU"] { border-top-color: var(--kouryu); }

.header__hero-badge[data-faction="SEIRYU"] { border-color: var(--seiryu); }
/* ... 同様 */
```

旧 `data-element` 系セレクタは削除 (= SPEC-002 の境界をまたいで上書き)。

## 6. 実装フェーズ

| Phase | 内容 | コミット |
|---|---|---|
| **Phase 0** | SPEC-003 / SPEC-INDEX / CHANGELOG 更新 | 第 1 commit |
| **Phase 1** | ASSET_BASE 切替 / 3 種 .json 整備 / loader / hero modal を MCH 駆動に / CSS 5 派閥対応 | 第 2 commit |

## 7. テストケース

- [ ] `data/heroes.json` v2 で 10 体、 `heroId` 1001/1002/1004/1006/2001/2002/2005/2011/2012/2013
- [ ] `data/extensions.json` 10 件、 `extId` 重複なし
- [ ] `data/enemies.json` 10 件、 `enemyId` 重複なし
- [ ] 起動時 `Promise.all([loadHeroes, loadExtensions, loadEnemies])` がすべて resolve
- [ ] ヒーロー選択モーダル: portrait が `bearko/mycryptoheroes` の raw URL を指す (= devtools network で確認)
- [ ] CDN 画像が読める場合は実際のヒーロー画像が表示される、 404 時は `--missing` で透明化
- [ ] タイルの border-top が 5 派閥のいずれかの色になる
- [ ] 選択時 hint に `attributes.join(" / ")` (= "Soft Science / England / Mystery") が出る
- [ ] ja / en 切替で 名前 + faction ラベル + attributes が即時更新 (= attributes は英語のまま、 lang 非依存)
- [ ] 確定で `state.ownedHero.heroId` が 1001 系または 2000 系 4 桁
- [ ] ヘッダー badge に `<faction絵文字> <名前>` 表示
- [ ] DevTools console error なし (= extensions / enemies は UI 未接続でも fetch 成功すること)

## 8. リスク・懸念

- **PR #2 (SPEC-002 placeholder) との関係** — 本 PR は `feat/spec-002-hero-roster` の上に積まれるため、
  PR #2 が先にマージされる場合は順次 main 取り込み、 PR #2 が close される場合は本 PR を main から切り直す
  必要がある (= GitHub は base auto-update で対応する)
- **CDN 画像の URL 変更** — `bearko/mycryptoheroes` の構造が将来変わると ASSET_BASE 経由の URL が
  全部壊れる。 そのため `js/constants.js` でハードコードせず、 別途 `js/heroes.js` 内で
  `Image/Heroes/{id}.png` のパスを組み立てる構造を維持
- **5 派閥追加と 4 元素の併存** — DESIGN_CHARTER §2 の 4 元素は他派生プロジェクト用に残す。 本作では
  `--seiryu/--suzaku/--byakko/--genbu/--kouryu` を新規追加し、 SPEC-002 で導入した 4 元素
  border-top セレクタは削除する (= 5 派閥に統一)
- **件数の偏り** — Common 4 / Uncommon 6 / Rare 0 で偏っている。 これは MCH 公開図鑑のうち権利上問題ない
  10 件を curated した結果。 後続 SPEC でレアリティ多様化する余地あり
- **enemy id 171 (= ディープ・ヨシュカ、 HP 20M)** — ボス級アウトライアのため 10 件には含めず雑魚 10 件
  (= 101/104/111/124/134/164/166/182/136 + 1 件) に絞る

## 9. 参考

- `bearko/mycryptoheroes/Data/Heroes/heroes.json` — 404 件の公式図鑑データ
- `bearko/mycryptoheroes/Data/Extensions/extensions.json` — 1,797 件の装備データ
- `bearko/mycryptoheroes/Data/Enemies/enemies.json` — 938 件のエネミーデータ
- `docs/charters/PROJECT_CHARTER.md` §4 制約 (= MCH 経済圏 fan project)
- `docs/specs/SPEC-002-hero-roster.md` — 本 SPEC が data 内容を上書きする対象
- `docs/patterns/01-environment-and-assets.md` §6 (= ASSET_BASE / `img()` ヘルパ)
- `docs/patterns/06-state-and-data.md` §2, §8 (= JSON loader / version 付きスキーマ)
