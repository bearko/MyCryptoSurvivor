---
id: SPEC-018
title: Extension Icon Mapping Fix (= 名前と icon の不一致解消)
status: Done
pr: 21
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-018 — Extension Icon Mapping Fix (= 名前と icon の不一致解消)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10
- **Updated**: 2026-05-10
- **依存**: なし (= data/extensions.json の `iconId` のみ変更、 動作 / schema は据置)

## 1. 背景 / 課題

ユーザー指摘: **「エクステンションのアイコンと名前が一致していない」**

参照リポジトリ:
- https://github.com/bearko/mycryptoheroes/tree/main/Data/Extensions
- https://github.com/bearko/mycryptoheroes/tree/main/Image/Extensions

調査の結果、 MCH 公式の extension は **1001-1033 の 33 種** (= 連番一部欠番) で、 そのうち多くが我々の 17 系列名と **完全一致または近似** する名前を持っていた。 SPEC-011 で iconId を選定した際、 適切な ID を見落としていた箇所がある:

- ❌ Revolver → iconId 1002 (= Musket) — 銃だが厳密には別物
- ❌ Book → iconId 1003 (= Quill / 羽ペン) — 本ではない
- ❌ Knife → iconId 1001 (= Blade / 直剣) — Blade と被って同じアイコンに
- ❌ LaserGun → iconId 1003 (= Quill / 羽ペン) — 本でも銃でもない
- ❌ Boots → iconId 1005 (= Horse) — 馬
- ❌ Shield → iconId 1004 (= Armor) — 鎧
- ❌ Shuriken → iconId 1011 (= Axe) — Axe と被って同じアイコンに

実は MCH には **1029 Revolver / 1008 Book / 1028 Rapier (細刀) / 1031 Boots / 1010 Shield / 1014 Cross Spear** など、 我々の系列に **より忠実な icon** が存在していた。

## 2. ゴール

`data/extensions.json` の各 entry の `iconId` を **正しい MCH ext ID** に更新する。 schema / 系列名 / tierParams / archetype は **一切変更しない** (= データ修正のみ)。

## 3. 非ゴール

- 系列名の変更
- archetype の変更
- 武器バランス変更 (= dmg / cdMs 等)
- 新しい系列の追加
- per-tier アイコンの導入 (= 全 tier 同じ iconId、 別 SPEC 候補)

## 4. MCH 公式 extension 一覧 (= 1001-1033、 33 種)

調査結果 (= `Data/Extensions/extensions.json` raw):

| extId | name (en) | name (ja) | series |
|---|---|---|---|
| 1001 | Novice Blade   | ノービスブレード   | Blade |
| 1002 | Novice Musket  | ノービスマスケット | Musket |
| 1003 | Novice Quill   | ノービスペン       | Quill |
| 1004 | Novice Armor   | ノービスアーマー   | Armor |
| 1005 | Novice Horse   | ノービスホース     | Horse |
| 1006 | Novice Katana  | ノービスカタナ     | Katana |
| 1008 | Novice Book    | ノービスブック     | **Book** |
| 1009 | Novice Ring    | ノービスリング     | Ring |
| 1010 | Novice Shield  | ノービスシールド   | **Shield** |
| 1011 | Axe            | アックス           | Axe |
| 1013 | Yumi           | ユミ               | Yumi (= 弓) |
| 1014 | Cross Spear    | クロススピア       | CrossSpear |
| 1015 | Halberd        | ハルバード         | Halberd |
| 1016 | Scrolls        | スクロール         | Scrolls |
| 1017 | Necklace       | ネックレス         | Necklace |
| 1018 | Kabuto         | カブト             | Kabuto (= 兜) |
| 1019 | Turtle         | タートル           | Turtle |
| 1020 | Rooster        | ルースター         | Rooster |
| 1021 | Tiger          | タイガー           | Tiger |
| 1022 | Dragon         | ドラゴン           | Dragon |
| 1023 | Bull           | ブル               | Bull |
| 1024 | Elephant       | エレファント       | Elephant |
| 1025 | Monkey         | モンキー           | Monkey |
| 1026 | Snake          | スネーク           | Snake |
| 1027 | Dog            | ドッグ             | Dog |
| 1028 | Rapier         | レイピア           | Rapier (= 細刀) |
| 1029 | Revolver       | リボルバー         | **Revolver** |
| 1030 | Goblet         | ゴブレット         | Goblet |
| 1031 | Boots          | ブーツ             | **Boots** |
| 1032 | Sensu          | センス             | Sensu (= 扇) |
| 1033 | MCH Medal      | MCH メダル         | MCHMedal |

## 5. 改修マッピング

### 5.1 武器 10 系列

| Our series | 旧 iconId | 旧 (失敗理由) | **新 iconId** | 新マッチ理由 |
|---|---|---|---|---|
| Revolver   | 1002 | Musket (= 銃だが別物) | **1029** | **Revolver 完全一致** |
| Book       | 1003 | Quill (= 羽ペン) | **1008** | **Book 完全一致** |
| Panjandrum | 1022 (Dragon) | 抽象的 | **1023 Bull** | 「突進」 のイメージが Bull に近い |
| Moai       | 1023 (Bull) | 動物 | **1018 Kabuto** | 兜 = 石像 / 守護神の顔のニュアンス |
| Shuriken   | 1011 (Axe) | Axe と被り | **1014 Cross Spear** | 投擲 + 十字 = 手裏剣のシルエット |
| LaserGun   | 1003 (Quill) | 羽ペンに変更必要 | **1002 Musket** | 銃 = レーザー銃の代替 |
| Knife      | 1001 (Blade) | Blade と被り | **1028 Rapier** | 細刀 = ナイフ |
| Axe        | 1011 | Axe (= 完全一致) | **1011** (維持) | — |
| Pierrot    | 1025 (Monkey) | 動物 | **1032 Sensu** | 扇 = 道化師の小道具 |
| Blade      | 1001 | Blade (= 完全一致) | **1001** (維持) | — |

### 5.2 強化 7 系列

| Our series | 旧 iconId | 旧 (失敗理由) | **新 iconId** | 新マッチ理由 |
|---|---|---|---|---|
| Armor      | 1004 | Armor (= 完全一致) | **1004** (維持) | — |
| Ramen      | 1030 (Goblet) | 飲食類でやや近い | **1030** (維持) | 飲食つながり、 直接代替なし |
| Boots      | 1005 (Horse) | 馬と混同 | **1031** | **Boots 完全一致** |
| Horse      | 1005 | Horse (= 完全一致) | **1005** (維持) | — |
| Shield     | 1004 (Armor) | 鎧と混同 | **1010** | **Shield 完全一致** |
| Apple      | 1030 (Goblet) | 杯ではなく実 | **1033 MCH Medal** | 「力の象徴」 として勲章で代替 |
| Oriflamme  | 1022 (Dragon) | 旗ではない | **1016 Scrolls** | 巻物 = 旗印 / 召喚紋 |

### 5.3 改修サマリ (= 17 系列中 13 件改修、 4 件維持)

- **完全一致を発見** : Revolver / Book / Boots / Shield (= 大きな改善)
- **被り解消** : Knife (Blade 被り解消)、 Shuriken (Axe 被り解消)
- **より忠実** : LaserGun (Quill→Musket)、 Pierrot (Monkey→Sensu)、 Apple (Goblet→Medal)、 Oriflamme (Dragon→Scrolls)、 Panjandrum (Dragon→Bull)、 Moai (Bull→Kabuto)
- **維持** : Axe (1011)、 Blade (1001)、 Armor (1004)、 Horse (1005)、 Ramen (1030)

## 6. 技術設計

`data/extensions.json` の各 entry の `iconId` 数値のみを書き換え。 schema は v2 のまま。 ローダ / 描画 / picker / hero detail panel の挙動は **一切変えない** (= `extImg(ext)` が新 iconId を URL 解決するだけで OK)。

差分 (= 13 行のみ書き換え):

```diff
- "extId": 1, ... "iconId": 1002,    // Revolver → Musket
+ "extId": 1, ... "iconId": 1029,    // Revolver → Revolver (= 完全一致)

- "extId": 2, ... "iconId": 1003,    // Book → Quill
+ "extId": 2, ... "iconId": 1008,    // Book → Book (= 完全一致)

- "extId": 3, ... "iconId": 1022,    // Panjandrum → Dragon
+ "extId": 3, ... "iconId": 1023,    // Panjandrum → Bull

- "extId": 4, ... "iconId": 1023,    // Moai → Bull
+ "extId": 4, ... "iconId": 1018,    // Moai → Kabuto

- "extId": 5, ... "iconId": 1011,    // Shuriken → Axe
+ "extId": 5, ... "iconId": 1014,    // Shuriken → Cross Spear

- "extId": 6, ... "iconId": 1003,    // LaserGun → Quill
+ "extId": 6, ... "iconId": 1002,    // LaserGun → Musket

- "extId": 7, ... "iconId": 1001,    // Knife → Blade
+ "extId": 7, ... "iconId": 1028,    // Knife → Rapier

(extId 8 Axe は維持)

- "extId": 9, ... "iconId": 1025,    // Pierrot → Monkey
+ "extId": 9, ... "iconId": 1032,    // Pierrot → Sensu

(extId 10 Blade / 11 Armor / 12 Ramen / 14 Horse は維持)

- "extId": 13, ... "iconId": 1005,   // Boots → Horse
+ "extId": 13, ... "iconId": 1031,   // Boots → Boots (= 完全一致)

- "extId": 15, ... "iconId": 1004,   // Shield → Armor
+ "extId": 15, ... "iconId": 1010,   // Shield → Shield (= 完全一致)

- "extId": 16, ... "iconId": 1030,   // Apple → Goblet
+ "extId": 16, ... "iconId": 1033,   // Apple → MCH Medal

- "extId": 17, ... "iconId": 1022,   // Oriflamme → Dragon
+ "extId": 17, ... "iconId": 1016,   // Oriflamme → Scrolls
```

## 7. 受入基準

- [ ] hero 選択画面の詳細パネルで、 各ヒーローの 「開始武器」 アイコンが系列名に対応する MCH icon に変わっている
- [ ] Revolver / Book / Boots / Shield 等の **完全一致系列** が、 そのものの MCH icon で表示される
- [ ] Level up モーダル 3 候補の左カラムアイコンが、 系列名と一致
- [ ] 戦闘中の投射体 / 周回 / bomb のアイコンが、 武器系列の名前と一致
- [ ] CDN 404 (= MCH に存在しない iconId) が無い (= 1001-1033 内のみ使用)
- [ ] DevTools console エラー無し
- [ ] schema / tierParams / archetype / dmg / cdMs などの数値は **一切変更されていない**

## 8. リスク

- **MCH リポジトリの id 規約が変わる** → 1001-1033 は MCH 公式の固定 id なので動かない
- **新 iconId の画像が想定と違う** → MCH 公式の Image/Extensions/{id}.png を見る限り `Novice` シリーズ + 各種 = 31 件分 あり、 全 mapping は問題なくロード可能
- **「Cross Spear が手裏剣にしては槍寄り」 等のデザイン主観** → 「絶対の正解」 は無いので、 改善見込みが大きい候補を選んだ。 ユーザーがさらに別 id を望めば SPEC-019 で再調整可能
- **Pierrot = Sensu (= 扇) は議論の余地あり** → 道化師は 1025 Monkey も候補だが Monkey は別系列でないので Sensu に。 ユーザー指示があれば変更可

## 9. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | data/extensions.json の 13 件の iconId 書き換え |

## 10. 参考

- MCH `Data/Extensions/extensions.json` raw (= 33 件)
- MCH `Image/Extensions/{id}.png` (= 各 id に対応する画像)
- 既存 `js/extensions.js` `extImg(ext)` (= iconId → URL 解決済)
