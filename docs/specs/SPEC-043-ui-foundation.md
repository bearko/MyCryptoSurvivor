---
id: SPEC-043
title: UI Foundation — Tokens, Fonts, Buttons, Modals, Safe Area, Reduced Motion
status: Done
pr: 61
phase: v1.0
kind: Changed
---

# SPEC-043 — UI の土台：トークン・フォント・ボタン・モーダル・safe-area・reduced-motion

- **Status**: Done
- **Issue**: #54（親 #51 v1.0 仕上げ）
- **基準**: bearko.games の UI/UX の共通の基準（[MyCryptoPortfolio docs/ROADMAP.md 3 章](https://github.com/bearko/MyCryptoPortfolio/blob/claude/game-portfolio-page-4afqbc/docs/ROADMAP.md)）。DeckBattle・10 buy year に合わせる

## 1. 背景 / 課題

| 基準 | いま |
|---|---|
| トークン | `:root` は色と影 2 つだけ。角・余白・文字・z-index・動きの速さは部品ごとに直書き。使っていない `--temp` `--food` が残る |
| フォント | システムフォントだけ。見出し・数字の書体がない |
| ボタン | 押したときは 1px 沈むだけ。`focus-visible` なし。タップのハイライトが出る |
| モーダル | Esc で閉じるのはヘルプとヒーロー選択だけ（メニュー・ランキングは閉じない）。開いてもフォーカスが動かない。safe-area はヘッダーとステージだけ |
| reduced-motion | 使っていない CSS（`.shake` など）にだけ |
| 戦闘の画面 | ヘッダー（タイトル名・ヒーロー名・3 ボタン）と HUD（2 段）で 390×844 の縦 117px を使う。英語のヒーロー名が 2 行に折れる |
| ヒーロー選択 | 名前が「コナン・」「ピタゴラ」で切れる |
| タイトル | 単色の背景にロゴとボタン |

## 2. ゴール

- 色・角・余白・文字・z-index・動きをトークンにし、新しく書く CSS はトークンだけで書ける
- 見出し（Dela Gothic One）と数字（Chakra Petch）のフォント。DeckBattle と同じ組み合わせで、シリーズとしてそろえる
- ボタンに押した感じ（縮む）と `focus-visible`。タップのハイライトを消す
- モーダル共通：safe-area の内側に出る、開いたら最初のボタンにフォーカス、閉じてよいもの（メニュー・ランキング）は Esc で閉じる
- `prefers-reduced-motion` を全体に
- 戦闘のヘッダーと HUD を 1 段ずつに詰めて、戦場を広く（スマホで縦 117px → 約 80px）
- ヒーロー選択の名前が切れない
- タイトルの背景にステージ 1 の背景をゆっくり動かして敷く

## 3. 非ゴール

- 音量・演出の設定（SPEC-044）、戦闘の演出（SPEC-045）、結果の演出（SPEC-046）
- 画面の構成や遷移の変更
- 色の変更（`--bg` `--accent` などの値は変えない）

## 4. 技術設計

### 4.1 トークン（`css/base.css`）

| 種類 | トークン |
|---|---|
| 色（足す） | `--good` `--bad` `--warn`、`--line`（薄い区切り） |
| 角 | `--r-sm 6px` `--r-md 10px` `--r-lg 14px` `--r-pill 999px` |
| 余白 | `--sp-1 .25rem` 〜 `--sp-6 1.6rem` |
| 文字 | `--fs-xs .7rem` `--fs-sm .8rem` `--fs-md .9rem` `--fs-lg 1.1rem` `--fs-xl 1.4rem` |
| フォント | `--font-body`（今のシステムフォント）、`--font-display`、`--font-num` |
| z-index | `--z-stage-ui 5` `--z-header 50` `--z-toast 100` `--z-title 200` `--z-modal 320` `--z-modal-top 330` `--z-help 340` `--z-splash 1000` |
| 動き | `--ease-out cubic-bezier(.2,.8,.4,1)` `--ease-spring cubic-bezier(.2,.9,.25,1.15)` `--dur-fast 120ms` `--dur-base 220ms` |
| safe-area | `--safe-t/r/b/l`（`env(safe-area-inset-*)`） |

使っていない `--temp` `--food` `--rarity-n/r/sr/ssr` のうち、参照のないものを消す。

### 4.2 全体（`css/base.css`）

- `* { -webkit-tap-highlight-color: transparent }`、ボタンに `touch-action: manipulation` と `user-select: none`
- `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`
- `@media (prefers-reduced-motion: reduce)`：アニメーション・トランジションをほぼ 0 にする。JS 用に `js/motion.js` の `prefersReducedMotion()`（SPEC-044・045 で設定と合わせて使う）

### 4.3 ボタン

- `.btn:active` / 各種カード：`transform: scale(.97)`（`--dur-fast`）
- `:hover` は `hover: hover` の端末だけ（タッチで色が残らない）

### 4.4 モーダル（`js/modal-a11y.js` 新規）

- `installModalA11y()` を起動時に 1 回。`role="dialog"` の要素の `hidden` が外れたら、中の最初の使えるボタンに `focus({ preventScroll: true })`。**最後の操作がキーボードのときだけ**（タッチ・マウスでは動かさない。枠のちらつきを出さない）
- `data-esc-close="<ボタンの id>"` を持つダイアログが開いているとき、Esc でそのボタンを押す（メニュー → `pauseMenuClose`、ランキング → `rankingClose`）。結果・レベルアップ・ステージクリアは選ばないと進めないので付けない
- 全モーダルの外側に safe-area の内側の余白、カードの高さは `dvh` で上限

### 4.5 戦闘の画面

- ヘッダー：上下の余白を詰め、ボタンを 36px の正方形に。スマホ（〜480px）ではタイトル名を隠し、ヒーロー名のバッジを 1 行（はみ出しは …）に
- HUD：スマホ（〜640px）では XP を HUD の下端に貼り付く細い帯（4px）にして、Lv・時間・HP を 1 段に
- 数字（Lv・時間・HP・XP）は `--font-num`

### 4.6 ヒーロー選択

- タイルの縦横比の固定をやめ、名前を 2 行まで（それ以上は …）

### 4.7 タイトル

- 背景にステージ 1 の背景画像（`img()` 経由）を暗くして敷き、ゆっくり拡大・移動（20 秒で往復）。reduced-motion では止める
- 見出しのフォント・ボタンの押した感じ

## 5. 受け入れ基準

- [x] 390×844 で、戦闘のヘッダー＋HUD が約 80px（変更前 117px）
- [x] 英語でもヒーロー名のバッジが 1 行
- [x] ヒーロー選択の 10 人の名前が切れない（390px・ja/en）
- [x] メニュー・ランキングが Esc で閉じる。開いたモーダルの最初のボタンにフォーカス（キーボードのときだけ枠が出る）
- [x] reduced-motion で、タイトルの背景・Press to Start の脈動が止まる
- [x] 1280×800 で崩れない

## 6. テスト

- `node --test tests/*.test.mjs`（`modal-a11y` の Esc の対応表を純関数で）
- 手元のブラウザ（390×844・360×640・1280×800）で各画面を撮って、前後を見比べる
