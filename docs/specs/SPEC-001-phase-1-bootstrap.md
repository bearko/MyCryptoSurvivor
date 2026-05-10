---
id: SPEC-001
title: Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock)
status: Done
pr: 1
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-001 — Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **参考**: `bearko/mycryptotemplate#2` SPEC-001 (= Done 済み)

## 1. 背景 / 課題

`mycryptotemplate` を派生させて MyCryptoSurvivor を起ち上げる。 テンプレート由来のひな形は
プロジェクト固有の識別子 (= `LS_PREFIX`, `ASSET_BASE`, タイトル名) をプレースホルダで残しているため、
**まずこれらを置換し、 Day 1 の入口となるヒーロー選択モーダルのモック** を入れる。

mycryptotemplate#2 と同じ受入基準を満たすことで、 「テンプレートからの起ち上げが正しく終わった」
ことを別プロジェクトでも再現可能なかたちで担保する。

## 2. ゴール

- `LS_PREFIX = "mcs"` で localStorage キー名前空間を確定
- `ASSET_BASE = "https://raw.githubusercontent.com/bearko/MyCryptoSurvivor-assets/main/"` で外部 CDN を確定
- タイトル画面は **テキストロゴのみ** (= 画像は持たない / 持ち込まない)
- Press to Start 後、 **ヒーロー選択モーダル** が開き、 placeholder タイル 10 個が並ぶ
- タイル選択 → 選択中の状態が反映される (= データロジックは未実装、 UI 上のフィードバックのみ)
- ja / en 双方で UI 文字列が破綻しない

## 3. 非ゴール

- ヒーロー実データの読み込み (= `data/heroes.json` 等は Phase 2)
- ヒーロー画像の表示 (= placeholder ボックスのみ、 ASSET_BASE 経由の `<img>` は Phase 2)
- ゲーム本体ロジック (= サバイバル tick / 行動メニュー / クラフト / クエスト)
- ランキング送信
- save / load
- BGM / SE

## 4. ユーザー体験

### 4.1 シナリオ

1. ユーザーが index.html を開く
2. Splash → Title 画面に遷移 (= タイトルはテキストロゴ "MyCryptoSurvivor")
3. 言語トグル (JP / EN) で UI が切り替わる
4. **Press to Start** をクリック
5. **ヒーロー選択モーダル** がフェードインで表示 (= 10 タイル / 1 タイル選択中状態)
6. タイルをクリックすると `aria-selected` が切り替わり、 確定ボタンが活性化
7. 「冒険を始める」 ボタンを押すと、 モーダルが閉じてメインのステージ領域 (= プレースホルダ) が見える

### 4.2 UI モック (ASCII)

```
┌──────── Title ────────┐
│                       │
│   MyCryptoSurvivor    │  ← テキストロゴ (color: --accent, weight 900)
│  Survive the chain.   │  ← サブタイトル (--muted)
│                       │
│   [ Press to Start ]  │  ← 主アクション
│                       │
│ Language / 言語       │
│ [ JP ] [ EN ]         │  ← 言語トグル
└───────────────────────┘

  Press → openHeroSelectModal() →

┌──── ヒーローを選ぶ ────┐
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│ │1│ │2│ │3│ │4│ │5│  │  ← placeholder タイル (4:5 比、 番号と "Hero" の仮文字)
│ └─┘ └─┘ └─┘ └─┘ └─┘  │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│ │6│ │7│ │8│ │9│ │10│ │
│ └─┘ └─┘ └─┘ └─┘ └─┘  │
│                       │
│   [ 冒険を始める ]    │  ← 1 件選択時のみ活性化
└───────────────────────┘
```

## 5. 技術設計

### 5.1 識別子の置換

| ファイル | キー | 置換前 | 置換後 |
|---|---|---|---|
| `js/constants.js` | `LS_PREFIX` | `"<prefix>"` | `"mcs"` |
| `js/constants.js` | `ASSET_BASE` | `https://raw.githubusercontent.com/<user>/<asset-repo>/main/` | `https://raw.githubusercontent.com/bearko/MyCryptoSurvivor-assets/main/` |
| `index.html` | `<title>` | `ProjectName` | `MyCryptoSurvivor` |
| `index.html` | OGP og:title / og:description | `ProjectName` | `MyCryptoSurvivor` + サバイバル一行説明 |
| `index.html` | splash / title 内テキスト | `ProjectName` | `MyCryptoSurvivor` |

### 5.2 関数

| 関数名 | 役割 | 入力 | 出力 |
|---|---|---|---|
| `openHeroSelectModal()` | ヒーロー選択モーダルを開く (= `pauseTime` 含む) | なし | void |
| `closeHeroSelectModal()` | モーダルを閉じる (= `resumeTime` 含む) | なし | void |
| `renderHeroSelectModal()` | placeholder タイル 10 個を描画 | なし | void |
| `pickHero(slotIdx)` | 選択状態を `state.pendingHeroPick` に保存し再レンダ | `slotIdx: number` (1〜10) | void |
| `applyHeroPick()` | 選択を確定して modal を閉じる (= ステージへ) | なし | void |

### 5.3 state 拡張

```js
// state.js (= Phase 1 では UI フラグのみ)
state.pendingHeroPick = null;   // 選択中のスロット index (1〜10) / null
```

`heroes` 実データは Phase 2 で `state.ownedHero = {...}` に確定する想定。 ここではまだ持たない。

### 5.4 フロー

```
DOMContentLoaded
  └─ init()
      ├─ initI18n()
      ├─ Splash hide / Title show
      ├─ setupTitleScreen()
      ├─ setupHelpOverlay()
      ├─ setupLangToggle()
      ├─ setupHeroSelectModal()         ← 追加
      └─ startTimeLoop()

[Press to Start click]
  └─ dismissTitle()
      ├─ Title hide
      ├─ App show
      └─ openHeroSelectModal()          ← 追加

[Hero tile click]
  └─ pickHero(idx)
      ├─ state.pendingHeroPick = idx
      └─ renderHeroSelectModal()        ← aria-selected 反映

[「冒険を始める」 click]
  └─ applyHeroPick()
      ├─ closeHeroSelectModal()
      └─ (= Phase 2 でメイン画面初期化)
```

### 5.5 i18n キー追加

| キー | ja | en |
|---|---|---|
| `title.subtitle` | サバイバルがチェーンを駆ける。 | Survive the chain. |
| `hero.select.title` | ヒーローを選ぶ | Choose Your Hero |
| `hero.select.placeholder` | Hero {n} | Hero {n} |
| `hero.select.cta` | 冒険を始める | Begin Survival |
| `hero.select.empty` | ヒーローを選択してください | Select a hero to continue |

## 6. 実装フェーズ

| Phase | 内容 | コミット |
|---|---|---|
| **Phase 0** | Charter / SPEC-INDEX / SPEC-001 を docs/ に追加 (= 文書のみ) | 第 1 commit |
| **Phase 1** | 識別子置換 (constants / index.html / og), ヒーロー選択モーダル mock + i18n | 第 2 commit |

## 7. テストケース (= mycryptotemplate#2 と同等の受入基準)

- [ ] `index.html` がブラウザで開け、 console 致命的エラーなし
- [ ] タイトルが **テキスト** で "MyCryptoSurvivor" と表示される (= 画像 `<img>` を含まない)
- [ ] サブタイトル / Press to Start ボタンが ja / en 双方で正しく表示
- [ ] 言語トグル切替で `localStorage["mcs.lang"]` が更新される (= prefix が `mcs.` であること)
- [ ] Press to Start 後、 ヒーロー選択モーダルが **必ず開く**
- [ ] モーダル内に placeholder タイルが **10 個** ある
- [ ] タイル選択で `aria-selected="true"` が 1 件のみに付く
- [ ] 選択中は 「冒険を始める」 ボタンが活性化、 未選択時は disabled
- [ ] モーダルは **背景クリック / Esc / 「冒険を始める」 / × ボタン** のいずれでも閉じられる
- [ ] モーダル open 中は `state.pauseFlags > 0` (= 時間が止まる)
- [ ] モーダル close 後 `state.pauseFlags === 0` に戻る (= leak しない)
- [ ] PC (1280×800) / Mobile (375×667) でレイアウト破綻なし
- [ ] `js/constants.js` の `ASSET_BASE` が `bearko/MyCryptoSurvivor-assets` を指す

## 8. リスク・懸念

- **画像なし** で 10 タイルを並べると単調になりがち → タイル番号 + "Hero" 仮文字 + 元素っぽいアクセントカラーで Day 1 でも識別性を担保
- モーダル open 中の pauseFlags leak (= テンプレート Pattern 04 の不変条件) → open / close の対が `pauseTime` / `resumeTime` をペア呼び出しすること
- 派生プロジェクトの後続 SPEC で 10 体構成を変える可能性 → 本 SPEC の placeholder は **数字を強調しない実装** (= 配列の length に追従) にしておく

## 9. 参考

- `docs/charters/PROJECT_CHARTER.md` — プロダクト目的とリリース計画
- `docs/patterns/02-screen-structure.md` — Title / Modal / z-index 規約
- `docs/patterns/04-time-and-modals.md` — pauseFlags 不変条件
- `docs/patterns/06-state-and-data.md` — state 単一オブジェクト / pending* 規約
- `bearko/mycryptotemplate#2` — テンプレート側の SPEC-001 (Done 済み参照実装)
