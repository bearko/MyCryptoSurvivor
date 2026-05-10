---
id: SPEC-002
title: Hero Roster (= heroes.json + 10 体実データ + state.ownedHero)
status: Done
pr: 2
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-002 — Phase 1 ヒーロー実データ (= roster + 選択確定)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-001 (Done)

## 1. 背景 / 課題

SPEC-001 で Day 1 入口のヒーロー選択モーダルを **placeholder タイル 10 個** として入れた。
タイル番号と "Hero {n}" のラベル以外には情報がなく、 「どのヒーローを選ぶか」 の体験が成立していない。

このまま Phase 2 (= サバイバル時間軸 / 体力 / 行動メニュー) に進むと、 ヒーローの個性 (= 元素 / スタッツ)
が後付けになって設計が歪む。 先に **データスキーマと最小ロスター 10 体** を確定させ、
タイルを実データ駆動に切り替える。

## 2. ゴール

- `data/heroes.json` に **10 体** のヒーローデータを配置 (= heroId / name / element / stats / rarity / blurb)
- `js/data-loader.js` の `loadJson` を介して runtime fetch (= キャッシュ付き)
- ヒーロー選択モーダルが実データから **画像 + 名前 + 元素アクセント** を描画
- 画像は `ASSET_BASE` 経由 (= `Image/Heroes/{heroId}.png`) で `onerror` フォールバック付き
- `applyHeroPick` 時に `state.ownedHero = { ...hero }` を確定し、 ヘッダーにヒーロー名を表示
- ja / en どちらの言語でも名前 / blurb が破綻しない

## 3. 非ゴール

- ヒーロースタッツの実ゲームへの反映 (= 戦闘 / クラフト計算は SPEC-003+ の範疇)
- レアリティに応じた抽選 / ガチャ要素 (= 単純に 10 体並列で選ぶだけ)
- ヒーロー画像のリポジトリへのコミット (= CDN 参照のみ)
- save / load (= 選んだヒーローの永続化は SPEC-004+ で別途)
- 行動メニュー / Day N / 体力等のサバイバル本編

## 4. ユーザー体験

### 4.1 シナリオ

1. Title → Press to Start → ヒーロー選択モーダルが開く (= SPEC-001 と同じ)
2. **Phase 1 と異なるのはタイルの中身**:
   - 上半分: ヒーロー画像 (= `ASSET_BASE/Image/Heroes/{heroId}.png`、 失敗時はシルエット)
   - 下半分: ヒーロー名 + 元素絵文字 + レアリティ色帯
3. タイルクリックで blurb (= 一行紹介) が hint 行に表示 (= 未選択 → 選択中の hint 入れ替え)
4. 「冒険を始める」 → モーダル閉じ + ヘッダーに `🦅 Mori` のように `<element>絵文字 <hero名>` が表示
5. ja/en 切替で名前 / blurb / hint が即座に切り替わる

### 4.2 UI モック (ASCII)

```
┌──── ヒーローを選ぶ ────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │[画]│ │[画]│ │[画]│ │[画]│ │[画]│  │  ← img (= onerror で透明化)
│ │雪  │ │炎  │ │森  │ │岩  │ │風  │  │  ← name (= ja: 雪 / en: Yuki)
│ │💧R │ │🔥R │ │🌿N │ │⛰N │ │🌿C │  │  ← 元素絵文字 + レアリティ色
│ └────┘ └────┘ └────┘ └────┘ └────┘  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │... │ │... │ │... │ │... │ │... │  │
│ └────┘ └────┘ └────┘ └────┘ └────┘  │
│                                        │
│ 選択中: 雪原を駆ける斥候。 食料を見つける │  ← blurb / hint
│                                        │
│        [ 冒険を始める ]                │
└────────────────────────────────────────┘

選択確定後 / Header:
  MyCryptoSurvivor    Day 1     💧 雪    JP/EN  ?
```

## 5. 技術設計

### 5.1 データスキーマ — `data/heroes.json`

```json
{
  "version": 1,
  "heroes": [
    {
      "heroId": 1,
      "name":   { "ja": "雪",   "en": "Yuki" },
      "element": "leviathan",
      "rarity":  "Rare",
      "stats":   { "hp": 36, "phy": 22, "int": 28, "agi": 30 },
      "blurb":   { "ja": "雪原を駆ける斥候。 食料の在処を素早く見つける。",
                   "en": "A snowfield scout who finds food fast." }
    }
  ]
}
```

**フィールド規約**:

| フィールド | 型 | 範囲 / 例 | 用途 |
|---|---|---|---|
| `heroId` | number | 1〜10 (= 連番、 欠番なし) | 画像 URL / state 識別 |
| `name` | `{ja, en}` | 1〜8 文字程度 | タイル / ヘッダー表示 |
| `element` | string enum | `garuda` \| `ifrit` \| `leviathan` \| `tiamat` | 4 元素 (= DESIGN_CHARTER §2 のカラーパレット) |
| `rarity` | string enum | `Common` \| `Uncommon` \| `Rare` \| `Epic` \| `Legendary` | DESIGN_CHARTER §3 の色分け |
| `stats` | `{hp, phy, int, agi}` | 各 10〜60 | サバイバル本編で使う数値 (= Phase 1 では未使用) |
| `blurb` | `{ja, en}` | 1 行 30〜60 文字 | hint 行に表示する一行紹介 |

### 5.2 ロスター (= 10 体)

元素分布をバランス: garuda 3 / ifrit 3 / leviathan 2 / tiamat 2。
ja は単漢字 1〜2 字、 en は短いローマ字。 サバイバル文脈に寄せて命名。

| ID | ja | en | element | rarity | stats (HP/PHY/INT/AGI) | blurb (ja) |
|---|---|---|---|---|---|---|
| 1 | 雪 | Yuki | leviathan | Rare | 36/22/28/30 | 雪原を駆ける斥候。 食料の在処を素早く見つける。 |
| 2 | 炎 | Honoo | ifrit | Rare | 40/34/22/18 | 炎を纏う近接戦士。 体温を保ちやすい。 |
| 3 | 森 | Mori | garuda | Common | 32/24/26/26 | 森と歩む薬師。 薬草の収集が得意。 |
| 4 | 岩 | Iwa | tiamat | Uncommon | 50/38/14/14 | 岩のように頑強な大盾。 防御クラフトに長ける。 |
| 5 | 風 | Kaze | garuda | Common | 28/20/26/40 | 風読みの追跡者。 移動コストが軽い。 |
| 6 | 月 | Tsuki | leviathan | Epic | 30/16/44/26 | 月光の魔術師。 夜間の探索に強い。 |
| 7 | 牙 | Kiba | garuda | Uncommon | 34/32/16/30 | 山犬を率いる狩人。 獣との遭遇に有利。 |
| 8 | 鉄 | Tetsu | tiamat | Rare | 44/30/22/16 | 鋼鉄の鍛冶師。 高品質な装備を打てる。 |
| 9 | 陽 | Hi | ifrit | Common | 30/22/30/24 | 陽光の聖職者。 体力回復が速い。 |
| 10 | 灰 | Hai | ifrit | Uncommon | 32/26/24/26 | 灰被りの旅人。 瓦礫からの収集が得意。 |

**設計メモ**: 10 体は 5 列 × 2 行で並ぶ。 元素 4 種 + レアリティ 5 段階のうち、 Phase 1 では
Common / Uncommon / Rare / Epic を使い、 Legendary は将来の拡張枠として温存する。

### 5.3 関数

| 関数名 | 役割 | 入力 | 出力 |
|---|---|---|---|
| `loadHeroes()` | `data/heroes.json` を fetch + cache (= `loadJson` ラッパー) | なし | `Promise<Hero[]>` |
| `getHero(heroId)` | id 検索 | `heroId: number` | `Hero \| undefined` |
| `heroImg(heroId)` | 画像 URL 組み立て | `heroId: number` | string |
| `elementEmoji(element)` | 元素 → 絵文字 | `element: string` | string (= 🌿 / 🔥 / 💧 / ⛰) |
| `localizedHeroName(hero)` | 言語に応じて名前を取り出す | `hero: Hero` | string |
| `localizedHeroBlurb(hero)` | 同上、 blurb 用 | `hero: Hero` | string |
| `applyHeroPick()` | (= 既存) `state.ownedHero` 確定 + header 反映 | なし | void |
| `renderOwnedHeroBadge()` | ヘッダーの `#ownedHeroBadge` 描画 | なし | void |

### 5.4 state 拡張

```js
// state.js
state.ownedHero = null;   // 選択確定後の hero オブジェクト (= heroes.json の 1 要素を copy)
```

`pendingHeroPick` は **slot index ではなく heroId** を入れるよう変更 (= Phase 1 では 1〜10 で
slot=heroId だったが、 将来 roster が増えた / 並び替わった時に slot index だと壊れるため)。

### 5.5 フロー

```
init()
  ├─ initI18n()
  ├─ await loadHeroes()                ← 追加 (= Promise.all で平行実行可)
  ├─ Splash hide / Title show
  └─ ...

[Press to Start] → dismissTitle() → openHeroSelectModal()
  └─ renderHeroSelectModal()
      ├─ HERO_ROSTER.forEach(hero => タイル要素)
      └─ 画像 + name + 元素絵文字 + rarity 色帯

[Tile click] → pickHero(heroId)
  ├─ state.pendingHeroPick = heroId
  ├─ renderHeroSelectModal()           ← aria-selected + hint に blurb
  └─ refreshHeroSelectCta()

[「冒険を始める」] → applyHeroPick()
  ├─ state.ownedHero = getHero(state.pendingHeroPick)
  ├─ renderOwnedHeroBadge()            ← ヘッダーに反映
  └─ closeHeroSelectModal()
```

### 5.6 i18n キー追加

| キー | ja | en |
|---|---|---|
| `hero.element.garuda` | 風 | Wind |
| `hero.element.ifrit` | 火 | Fire |
| `hero.element.leviathan` | 水 | Water |
| `hero.element.tiamat` | 土 | Earth |
| `hero.rarity.Common` | コモン | Common |
| `hero.rarity.Uncommon` | アンコモン | Uncommon |
| `hero.rarity.Rare` | レア | Rare |
| `hero.rarity.Epic` | エピック | Epic |
| `hero.rarity.Legendary` | レジェンダリー | Legendary |
| `hero.select.imgAlt` | {name} のポートレート | Portrait of {name} |
| `hero.select.fallbackHint` | ヒーローを選択すると、 ここに紹介が出ます | Pick a hero to see the description |

### 5.7 CSS 追加

```css
/* tile に画像領域とラベル領域 */
.hero-tile { aspect-ratio: 4 / 5; padding: 0; overflow: hidden; }
.hero-tile__portrait { width: 100%; aspect-ratio: 1; object-fit: cover; }
.hero-tile__meta { padding: 0.25rem 0.3rem 0.4rem; gap: 0.15rem; }

/* element accent (= 4 色) */
.hero-tile[data-element="garuda"]    { border-top: 3px solid var(--garuda); }
.hero-tile[data-element="ifrit"]     { border-top: 3px solid var(--ifrit); }
.hero-tile[data-element="leviathan"] { border-top: 3px solid var(--leviathan); }
.hero-tile[data-element="tiamat"]    { border-top: 3px solid var(--tiamat); }

/* rarity color (= DESIGN_CHARTER §3) */
.hero-tile__rarity[data-rarity="Common"]    { color: var(--rarity-n); }
.hero-tile__rarity[data-rarity="Uncommon"]  { color: var(--garuda); }
.hero-tile__rarity[data-rarity="Rare"]      { color: var(--rarity-r); }
.hero-tile__rarity[data-rarity="Epic"]      { color: var(--rarity-sr); }
.hero-tile__rarity[data-rarity="Legendary"] { color: var(--rarity-ssr); }
```

## 6. 実装フェーズ

| Phase | 内容 | コミット |
|---|---|---|
| **Phase 0** | SPEC-002 / SPEC-INDEX / CHANGELOG 更新 | 第 1 commit |
| **Phase 1** | data/heroes.json / loadHeroes / state.ownedHero / 実描画 + i18n + CSS | 第 2 commit |

## 7. テストケース

- [ ] `data/heroes.json` が JSON として valid (= `version === 1`、 `heroes.length === 10`)
- [ ] `heroId` は 1〜10 の重複なし
- [ ] 起動時に `loadHeroes()` が解決し、 console error なし
- [ ] ヒーロー選択モーダルが 10 タイルで開き、 各タイルに **画像枠 + name + 元素絵文字 + rarity** がある
- [ ] CDN 画像が 404 でも layout が崩れない (= `onerror` フォールバック動作)
- [ ] ja / en 切替で 全ヒーロー名 + blurb + 元素ラベル + rarity ラベル が即座に切り替わる
- [ ] タイル選択時、 hint 行に該当ヒーローの blurb が表示
- [ ] 「冒険を始める」 で `state.ownedHero.heroId` が選択値と一致
- [ ] ヘッダー左に `<元素絵文字> <ヒーロー名>` が表示される
- [ ] モーダル close 後 `state.pauseFlags === 0` (= leak しない)
- [ ] PC (1280×800) / Mobile (375×667) でレイアウト破綻なし

## 8. リスク・懸念

- **CDN 画像が未準備の段階でも UI を成立させたい** → `onerror` で透明化 + 元素絵文字を必ず出すことで、
  画像なしでもヒーロー識別性を担保する
- **MCH IP との関係** → Charter にあるとおり 「非公式 fan project / CDN 経由参照」 に留める。 名前は
  単漢字 + ローマ字の placeholder を使い、 公式 IP に依存しない
- **将来 roster を増やす時** — 現在は 10 固定だが、 `HERO_SELECT_PLACEHOLDER_COUNT` を撤去して
  `HERO_ROSTER.length` で動的にする (= grid 列数は CSS で 5 固定 / 行数は flex 折返し)
- **stats を未使用で持つこと** → サバイバル本編 (SPEC-003+) で参照することを前提に、 スキーマだけ
  確定させておく。 Phase 1 では UI に出さない (= 「選択時に表示」 は SPEC-003 で検討)

## 9. 参考

- `docs/charters/PROJECT_CHARTER.md` §6 リリース計画 (Phase 2 開始準備)
- `docs/charters/DESIGN_CHARTER.md` §2 カラーパレット / §3 レアリティ色分け
- `docs/patterns/01-environment-and-assets.md` §6, §7 (= ASSET_BASE / `onerror` フォールバック)
- `docs/patterns/06-state-and-data.md` §2 JSON loader / §8 version 付きスキーマ
- `docs/specs/SPEC-001-phase-1-bootstrap.md` §9 後続予告
