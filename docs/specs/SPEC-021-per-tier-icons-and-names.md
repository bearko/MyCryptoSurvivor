---
id: SPEC-021
title: Per-Tier Extension Icons + Names (= MCH 公式準拠、 1xxx → 5xxx)
status: Done
pr: 25
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-021 — Per-Tier Extension Icons + Names (= MCH 公式準拠)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10
- **Updated**: 2026-05-10
- **依存**: SPEC-020 (= base iconId が MCH 完全一致済)

## 1. 背景 / 課題

ユーザー指示:
> レアリティが上がったらアイコンもレアリティに応じてアイコンも変えてください (= 同シリーズの 1 つ上のレアリティ)。 名前もレアリティに応じたエクステンション名に準拠してください。

現状 (= SPEC-020 まで): 全 tier (= Lv.1〜Lv.5) で同じ iconId / 名前は我々の独自命名 (= 「ガンスリンガー」「ヴォーパルブレード」 等)。 ユーザーは MCH 公式の rarity 階層 (= 1xxx Common / 2xxx Uncommon / 3xxx Rare / 4xxx Epic / 5xxx Legendary) に揃えたい。

調査の結果、 MCH catalog では **完全に +1000 ルール**:
- Knife: 1048 → 2048 → 3048 → 4048 → 5048
- 全 19 系列で 5 tier 全部存在 (= 19 × 5 = **95/95** hit)

## 2. ゴール

- `data/extensions.json` の各 entry に **`tierIconIds: [base, base+1000, ..., base+4000]`** 追加
- `tierNames` を **MCH 公式名** で上書き (= 我々の独自命名は撤去)
- `js/extensions.js` に `extTierImg(ext, level)` ヘルパ追加
- `js/battle/extensions-as-weapons.js`: `weaponFromExt` で `iconId` を **現 tier の icon** に
- `js/main.js` `renderHeroDetail`: 開始時の Lv.1 icon を `extTierImg(ext, 1)` で取得
- `js/battle/levelup.js` カード: pick 候補は **「次 tier の icon + 名前」** を表示 (= ピック後の見た目をプレビュー)
- 戦闘中の投射体 / 周回 / bomb は **現在装備の tier の icon** で描画 (= LV up すると見た目が変わる)

## 3. 非ゴール

- 系列名 (= series) の変更
- archetype / tierParams / 武器バランス変更
- 我々の独自命名の保持 (= 「ガンスリンガー」 等は撤去)
- 「カエルの標本」「待合せ場所のモアイ像」 等の長い MCH 名による UI レイアウト崩れ対策 (= まずそのまま採用、 必要なら CSS で調整)

## 4. 取得した MCH per-tier (= 19 系列 × 5 段、 全 95 件)

例 (= Knife):
| Lv | iconId | 名前 (ja / en) |
|---|---|---|
| 1 | 1048 | ナイフ / Knife |
| 2 | 2048 | エリートナイフ / Elite Knife |
| 3 | 3048 | ブレイブナイフ / Brave Knife |
| 4 | 4048 | グルカナイフ / Gurkha Knife |
| 5 | 5048 | アゾット / Azoth |

例 (= Apple):
| Lv | iconId | 名前 (ja) |
|---|---|---|
| 1 | 1159 | りんご |
| 2 | 2159 | 葉とらずりんご |
| 3 | 3159 | 寿りんご |
| 4 | 4159 | 帝国式林檎型電脳心臓 APC1984 |
| 5 | 5159 | 不和の女神授けし黄金の果実 |

(= 全 19 系列分は data/extensions.json の diff を参照)

## 5. 実装

1. **Node ワンショット**: MCH catalog から 19 系列 × 5 tier を抽出して `data/extensions.json` を更新
2. **`js/extensions.js`** に `extTierImg(ext, level)` 追加 (= ext.tierIconIds[level-1] → URL)
3. **`js/battle/extensions-as-weapons.js`**: `weaponFromExt` で `iconId = ext.tierIconIds[level-1]`、 `projectileIconId` も同様 (= 明示 null は維持)
4. **`js/main.js`**: `renderHeroDetail` で `extTierImg(ext, 1)` を使用
5. **`js/battle/levelup.js`**: カード icon に `extTierImg(opt.ext, opt.nextLevel)`
6. 既存 `getTierName(ext, level, lang)` (= `ext.tierNames[level-1]`) は MCH 名を返すようになる (= ローダコード不変、 データ差し替えのみ)

## 6. 受入基準

- [ ] hero 詳細パネル: 開始武器の icon が **Lv.1 (Common)** の MCH icon、 名前が MCH 公式名
- [ ] Level up モーダル: 候補カードの icon と名前が **次 tier (= ピック後)** の MCH 公式
  - 例: Knife を Lv.1 装備中 → 次 tier 候補で 「エリートナイフ」 + 2048 icon
- [ ] 戦闘中: 投射体 / 周回 / bomb の icon が **現在装備の tier** に追従 (= Lv.5 装備中なら 5048 icon が飛ぶ)
- [ ] Revolver は SPEC-019 の `projectileIconId: null` で投射体は引き続き ◯ (= per-tier 設定の影響を受けない)
- [ ] DevTools console エラー無し

## 7. リスク

- **MCH 名前の長さ** — 「帝国式林檎型電脳心臓 APC1984」 等 16 文字超でカード幅から食み出る恐れ。 まずそのまま採用、 ユーザー視認後に必要なら CSS で `font-size` 調整 / `word-break` 強化
- **画像 CDN 404** — 1xxx-5xxx 全 95 件は MCH 公式に存在を確認済 (= 95/95 hit)、 404 は無いはず
- **per-tier 切替アニメ無し** — Lv up 直後にカード icon が次 tier に切替、 戦闘中の投射体は次フレームから新 icon で出現 (= 既存動作と整合)
- **picker の card icon が ピック前と後でズレる** — pick 前 = 「次 tier」 を見せる、 pick 後 = 「現 tier」 で武器発射、 整合済

## 8. 参考

- MCH `Data/Extensions/extensions.json` raw (= 1797 件、 id 1001-17143、 +1000 で rarity)
- 既存 `js/extensions.js` `getTierName` (= tierNames[level-1] を引き当て、 ローダ不変)
- SPEC-020 (= base iconId 確定)
