# SPEC-020 — Extension Icon Fix (= ユーザー指定 MCH ID で全系列を完全一致)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10
- **Updated**: 2026-05-10
- **依存**: なし (= main 直接、 data/extensions.json の `iconId` のみ)

## 1. 背景 / 課題

ユーザー指摘:
> エクステンションのシリーズ名とアイコンが未だにあっていない。 全部対応するシリーズ名あるはず。 勝手に変えるのは絶対にやめてください。

SPEC-018 では MCH 公式 catalog の **1001-1033** だけを見て近似 icon を割当てたため、 Panjandrum / Moai / Pierrot / 手裏剣 / LaserGun / ラーメン / りんご / オリフラム / 液浸標本 / ギョク は別物 icon に。 ユーザーから 「実際は MCH に該当 series が全部存在する」 + 各 Common id を直接提示してもらった。

調査の結果、 MCH `Data/Extensions/extensions.json` は **数字キー (= 0..1796) を持つ object** で 1797 件 (id 1001-17143) を含み、 `series.name` に各シリーズの ja/en 名が入っている。 SPEC-018 の grep / WebFetch では構造を取り違えて 1001-1033 しか見えていなかったのが根本原因。

## 2. ゴール

ユーザー指定の MCH Common id で 10 系列の `iconId` を更新。 Knife についてもユーザーの方針 (= 全系列に同名 id あり) に従い 1048 (= Common 「ナイフ」) に揃える。 schema / archetype / tierParams 等は **一切変更しない**。

| extId | 系列 | 旧 iconId | **新 iconId** | MCH Common 名 (ja / en) |
|---|---|---|---|---|
| 3 | Panjandrum | 1023 | **1153** | 木製パンジャンドラム / Wooden Panjandrum |
| 4 | Moai | 1018 | **1106** | 待合せ場所のモアイ像 / Moai at the meeting place |
| 5 | Shuriken | 1014 | **1124** | 手裏剣 / Shuriken |
| 6 | LaserGun | 1002 | **1130** | レーザーガン / Raygun |
| 7 | Knife | 1028 | **1048** | ナイフ / Knife |
| 9 | Pierrot | 1032 | **1063** | ピエロ / Pierrot |
| 12 | Ramen | 1030 | **1154** | お手軽カップラーメン / Instant Cup Ramen |
| 16 | Apple | 1033 | **1159** | りんご / Apple |
| 17 | Oriflamme | 1016 | **1140** | オリフラム / Oriflamme |
| 18 | Specimen (= 液浸標本) | 1019 | **1169** | カエルの標本 / Frog Specimen |
| 19 | Gyoku (= ギョク) | 1009 | **1098** | ギョク / Orb |

合計 **11 entry** 変更 (= ユーザー指定 10 + Knife 1)。 残り 8 系列 (Revolver/Book/Axe/Blade/Armor/Boots/Horse/Shield) は SPEC-018 で既に完全一致なので変更なし。

## 3. 非ゴール

- 系列名の変更 (= 「Specimen」 を 「FrogSpecimen」 等にしない)
- archetype / 武器バランス / projectileIconId 等の変更
- 新 series の追加
- per-tier アイコンの導入 (= 全 tier 同じ iconId、 別 SPEC 候補)
- MCH 公式 catalog の他 id (= 2xxx-17xxx の Uncommon〜Mythic 帯) への移行

## 4. 実装

`data/extensions.json` の 11 件の `iconId` を書き換え。 全 19 entry の検証スクリプトで 19/19 OK を確認。

## 5. 受入基準

- [ ] hero 詳細パネル (= SPEC-014): 各ヒーローの開始武器のアイコンが、 系列名と一致した MCH icon
- [ ] Level up モーダル (= SPEC-008): 3 候補カードのアイコンが系列名と整合
- [ ] 戦闘中 (= SPEC-015): 投射体 / 周回 / bomb / レーザー の各アイコンが武器系列と一致 (= Revolver は SPEC-019 で `projectileIconId: null` なので円描画)
- [ ] 全 19 系列で iconId が MCH 公式 catalog 内
- [ ] CDN 404 が無い
- [ ] schema / tierParams / archetype / dmg / cdMs などの数値は **一切変更されていない**

## 6. リスク

- **MCH catalog の id 改廃** — 1048/1063/1098/1106/1124/1130/1140/1153/1154/1159/1169 は MCH 公式の固定 id、 動かない
- **WebFetch / grep の限界** — JSON の `series` を含むキーが大きい場合、 partial fetch で見落とす可能性。 今回は raw curl + node JSON.parse で構造確認済
- **per-tier 名前との視覚乖離** — 「グリモア / コーデックス / アカシック」 等の高 tier 名でも全 tier で同じ icon (= Common 「ノービスブック」)。 後続 SPEC で per-tier mapping 検討余地

## 7. 参考

- MCH `Data/Extensions/extensions.json` raw (= 7.3 MB、 1797 件、 id 1001-17143)
- 既存 `js/extensions.js` `extImg(ext)` (= iconId → URL 解決済)
- SPEC-018 (= 1001-1033 の調査が partial だったことの反省)
