# デザイン憲章 — UI/UX 規範

## 1. デザイン原則

### 1.1 Mobile First, but PC Comfortable

- 320px 幅でも崩れない
- 880px+ では PC レイアウトで余白を活かす
- `clamp()` を活用して中間サイズも自然に

### 1.2 認知負荷を低く

- **モーダルは 1 つずつ** (= 重ねない、 連鎖モーダルは前のを閉じてから次)
- **連続セリフは 1 popup にまとめる** (= MCF Phase β2-3 で年俸を 9 click → 1 click に変えた事例)
- **テキストはアイコン付き** (= 「⚒ クラフト」「🗺 クエスト」 等)

### 1.3 失敗を許容

- 確認 modal はオプトアウト不可 (= 重要操作は再確認)
- 取り消し可能な操作は気軽に
- 致命的操作 (= 解雇など) はテキスト確認

## 2. カラーパレット (= デフォルト dark theme)

```css
:root {
  --bg:        #121018;
  --panel:    #1e1a28;
  --panel-2:  #2a2438;
  --border:   #3d3550;
  --text:     #e6e0f0;
  --muted:    #8c7fb0;
  --accent:   #c4a35a;   /* primary action — gold */
  --garuda:    #5ecf8a;   /* HP / nature */
  --ifrit:     #e76060;   /* PHY / fire */
  --leviathan: #5ab4c4;   /* INT / water */
  --tiamat:    #f0c14b;   /* AGI / earth */
}
```

派生プロジェクトでもこのパレットを継承推奨。 ジャンルが変わる場合は accent / 4 元素を読み替え (= 例: SF 系なら --plasma / --cyber / --quantum / --void)。

## 3. レアリティの色分け

| Rarity | 表示色 | 用途 |
|---|---|---|
| Common | `#8c7fb0` (muted) | 基本 |
| Uncommon | `#5ecf8a` (緑) | 軽微な強化 |
| Rare | `#5ab4c4` (青) | 中堅 |
| Epic | `#bb86fc` (紫) | 上位 |
| Legendary | `#c4a35a` (金) | 最上位 |

`data-rarity="..."` 属性で CSS から参照する設計を統一。

## 4. タイポグラフィ

```css
font-family: "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
```

- **見出し**: 1.05-1.2rem, weight 800
- **本文**: 0.85-0.95rem
- **メタ情報**: 0.7-0.78rem, color: var(--muted)
- **タブナンバー**: `font-variant-numeric: tabular-nums` で固定幅

## 5. ボタン階層

| 種別 | 用途 | スタイル |
|---|---|---|
| Primary (= accent) | 主要アクション | `background: var(--accent); color: #1a1420;` |
| Secondary | 副次アクション | `border: 1px solid var(--accent); color: var(--accent);` |
| Ghost | テキストリンク | `background: transparent; color: var(--accent);` |
| Danger | 破壊的操作 | `border: 1.5px solid #e76060; color: #e76060;` |
| Disabled | 不可状態 | `opacity: 0.45; cursor: not-allowed;` |

## 6. モーダル設計

### 6.1 共通構造

```html
<div class="my-modal hidden" id="myModal" role="dialog" aria-modal="true">
  <div class="my-modal__card">
    <header class="my-modal__head">
      <h2 class="my-modal__title">タイトル</h2>
      <button class="my-modal__close-x" id="myModalClose">×</button>
    </header>
    <div class="my-modal__body" id="myModalBody"></div>
    <button class="my-modal__close" id="myModalCloseBtn">閉じる</button>
  </div>
</div>
```

### 6.2 共通 CSS

> **Survivor は 14 章「ノード端末」の外装を使う**（SPEC-055）。カードは角を切った筐体（`clip-path`）・縁は金 → シアンの光・面は走査線で、`css/node.css` が全モーダルにかぶせる。下の角丸の CSS は、テンプレートとしての既定値。

```css
.my-modal {
  position: fixed; inset: 0; z-index: 320;
  background: rgba(15, 12, 22, 0.92);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.my-modal.hidden { display: none !important; }
.my-modal__card {
  max-width: 520px; width: 100%; max-height: 90vh;
  background: linear-gradient(180deg, #2c2440 0%, var(--panel) 100%);
  border: 2px solid var(--accent);
  border-radius: 12px;
  padding: 1rem 1.1rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.6rem;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0,0,0,0.7);
}
```

### 6.3 閉じる動作

すべての modal は **3 つの方法** で閉じられること:
1. 「閉じる」 ボタン
2. 背景クリック (= modal 外側)
3. Esc キー (= keyboard accessibility)

## 7. アイコン使用規則

絵文字をボタン/バッジに併記して認知性を上げる:

| 絵文字 | 用途 |
|---|---|
| ⚒ | クラフト |
| 🗺 | クエスト |
| 💼 | 取引 |
| 📣 | 採用 |
| 💤 | 休憩 |
| 🏆 | ランキング |
| ✨ | アクティブ効果 |
| 🐛 | バグ報告 |
| 🆕 | 新機能 |

PR タイトルや commit 本文でも積極的に使う。

## 8. Empty State

データなし状態を放置しない:

- 倉庫が空 → 「倉庫にはまだ何もありません。 クラフトしてみましょう」
- ヒーローが居ない → 「ヒーローを雇用してください」
- ランキング未登録 → 「まだランキング登録がありません」

## 9. アニメーション

- **遷移**: 150-250ms ease (= ボタン hover, modal フェード)
- **画面の切り替え・ページ送り**: 500-700ms (= プレイヤーが自分で次の情報を取りに行く操作。短すぎず、待たせない。Survivor のワイプは 640ms)
- **演出**: 1.5-3s (= confetti, sprite float)
- **常に動く演出**: 5-30 秒の周期でゆっくり (= 背景の格子・粒・縁を流れる光)。どの画面でも何かが微かに動いている
- **`prefers-reduced-motion`** に従う (= SPEC-043 で全体に対応。 キャンバスの演出は `js/motion.js` の `prefersReducedMotion()` を見る)

- **「演出を減らす」設定**（SPEC-044）は `html[data-reduce-fx]` に映る（SPEC-055）。常に動く演出・ワイプはこれと `prefers-reduced-motion` で止める

## 10. アクセシビリティ

- **コントラスト比 4.5:1** 以上 (= text vs background)
- **focus-visible outline** を必ず付ける (= keyboard 操作可能)
- **role / aria-* 属性** を modal / dialog に
- **alt 属性** を img に必ず

## 11. Loading State

- 起動時のスプラッシュは **1〜2 秒以内**
- データロード中は **skeleton** か **spinner** (= 空白で待たせない)
- ランキング fetch 中は「取得中…」 表示

## 12. Responsive ブレイクポイント

| 幅 | レイアウト |
|---|---|
| 〜 420px | スマホ縦 (= 単列) |
| 421-879px | スマホ横 / タブレット (= 単列〜2 列) |
| 880px+ | PC (= 2 列レイアウト、 余白活用) |

`@media` は **3 つまで** に絞る (= 増やしすぎると保守困難)。 中間サイズは `clamp()` で対応。

## 13. ジャンル別カスタム

派生プロジェクトでジャンルが変わる場合:

- **戦術カード (= MCT)** → 戦闘演出メイン、 サウンドエフェクト多め
- **経営シム (= MCF)** → 数値とグラフメイン、 月次イベントで起伏
- **アドベンチャー** → セリフ popup の比重高、 BGM 重要
- **パズル** → タイル / グリッドが中央、 UI は最小限

派生プロジェクトの DESIGN_CHARTER.md でジャンル特化の項目を上書きしてください。

## 14. ノード端末（Survivor のデザイン言語。SPEC-055）

参考：作者が挙げた参考作の UI の考え方（手ざわり・世界観との一体化・操作への反応）。見た目を真似るのではなく、**この作品の世界（MCH のブロックチェーン、ステージは `node : 〜`）を UI の質感に落とす**。

### 14.1 質感

- **筐体**：パネル・ボタンは角を切った形（左上と右下。`--node-cut` 14px、ボタンは 8px）。角丸は使わない（例外：アイコンの丸。スライダーのつまみは菱形、スイッチ・言語の切り替えも角を切る。SPEC-058）
- **縁**：金（`--accent`）から始まり、右下でシアン（`--node-cyan`）に抜ける金属の光。切った斜めの辺にも光の線を入れる。失敗の画面（ゲームオーバー）は赤、ABSOLUTE は赤、RTA は紫、遊び方はシアン
- **面**：暗い紫の筐体（`--node-face`）に走査線（`--node-scan`）。上 2 割に光沢
- **見出し**：日本語の見出しの上に、英字の小見出し（`data-kicker`。シアン・字間を広く）

### 14.2 生きている（UI を死なせない）

- どの画面・どのモーダルでも、何かが微かに動いている：背景のブロックの格子が流れ、粒が漂い、パネルの縁を光が走る
- 押してほしいボタン（Press to Start など）には、ときどき光が走る
- 「演出を減らす」と `prefers-reduced-motion` では止める

### 14.3 色の優先度

- **UI をいちばん鮮やかに**。背景・戦場の床・エフェクトは彩度と明度を落とし、UI（数字・ボタン・選択肢）が先に目に入るようにする
- 金は「押せる・大事」、シアンは「端末の表示・案内」、赤は「危険・失敗」

### 14.4 キャラクターと UI の重なり

- UI とゲームの空間を分けない：見出しの文字の裏にキャラクター、結果の帯（テロップ）の手前にキャラクター、のように重ねる
- 喋るキャラ（ナビのアイン。SPEC-056）の吹き出しは、セリフの量で伸び縮みする（システムの表示ではなく、キャラが喋っている）
- ドット絵は 64 の整数倍で大きくし、`image-rendering: pixelated`

### 14.5 動き

- 画面の切り替えは、斜めの筐体が横切るワイプ（640ms。覆いきった 320ms で画面を差し替える）
- 二度押しで画面が二重に開かないよう、ワイプが流れている間の呼び出しは捨てる
- パネルは、端末の電源が入るように細い光の線から縦に開く（420ms。SPEC-058）
- 結果（ステージクリア・全クリア・倒れた）は、斜めの帯のテロップ（1.6 秒。押すと飛ばせる）のあとに出す。帯の上にヒーロー、下にアインを重ね、文字にはかぶせない（SPEC-058）
- 並んだ行（メニュー・設定・遊び方）は、上から 1 行ずつ入ってくる（50〜60ms ずつ）。押したときの縮みを消さないよう、入ってくる動きは始まりの状態だけを持つ（`animation-fill-mode: backwards`）

