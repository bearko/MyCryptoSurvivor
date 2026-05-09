# mycryptogame-template

**vanilla JS / 静的 HTML で動く web ゲーム** を Claude Code で開発するためのテンプレート。

MyCryptoTactics (PvP 戦術カード) と MyCryptoFactory (経営シム) の 2 作品で蓄積した
設計判断・実装パターン・運用作法を集約しています。

> **想定読者**: bearko 本人 + Claude Code エージェント
> **想定範囲**: モバイル/PC 両対応の 2D web ゲーム (= ビルドステップなし、 静的 host)
> **継承ジャンル**: パズル / カード / シム / RPG / アドベンチャー など (= 戦闘描写は簡易、 経済圏とランキングを軸に)

## このテンプレートを使うと得られるもの

- **動作環境**: PC + スマホ両対応 (= viewport / clamp / overflow 設計済み)
- **多言語**: ja / en の i18n 基盤 (= `t(key)` + `data-i18n` 属性で DOM 自動更新)
- **タイトル画面**: ロゴ + 版数バッジ + 言語トグル + ランキングボタン
- **ヘッダー**: バッジ + 通貨 + ヘルプ + ランキング + アクティブ効果ボタン
- **モーダル**: 共通 z-index 階層 + 背景クリック / Esc で閉じる + 多段階チェーン
- **時間制御**: `pauseFlags` カウンタ式 + `maiSays` の二重 pause 防止
- **エフェクト**: Confetti + sprite float + CSS @keyframes 実装例
- **音響**: BGM (= タイトル dismiss で unlock) + SE 関数群 + throttle
- **ランキング**: GAS web app 連携 (= base64 URL + localStorage 上書き) + デプロイ手順
- **テスト**: シード乱数シミュレータ + 手動 QA チェックリストひな型
- **開発フロー**: SPEC 駆動 + Conventional Commits + PR テンプレ + ブランチ戦略

## クイックスタート

### 1. このテンプレートからプロジェクトを作る

```bash
# Use this template ボタンから新リポジトリを作成 (GitHub UI)
# またはローカルで:
gh repo create my-new-game --template bearko/mycryptotemplate --public
git clone https://github.com/<you>/my-new-game
cd my-new-game
```

### 2. 識別子をリネーム

`docs/setup/new-project.md` の手順に従って以下をプロジェクト名に置換:
- `localStorage` キー prefix (`mct.*` → `<your-prefix>.*`)
- `<title>` / og:title / footer
- `data-i18n` の値は基本そのまま再利用可

### 3. Claude Code で開発開始

```bash
claude
> このプロジェクトの CLAUDE.md と docs/charters/PROJECT_CHARTER.md を読んで、
> 最初の SPEC (= docs/specs/SPEC-001-...) を一緒に書いて。
```

Claude が CLAUDE.md → AGENTS.md → docs/charters → docs/patterns の順に読み込み、
本テンプレートが規定する設計規則の中で実装を進めます。

## ディレクトリ構造

```
README.md                       本ファイル
CLAUDE.md                       Claude Code 開発ガイド (= 最初に読むファイル)
AGENTS.md                       AI エージェント運用規約
.gitignore
.github/
  PULL_REQUEST_TEMPLATE.md
.claude/
  settings.json                 permission allowlist + hooks
  skills/                       カスタムスキル (任意)
docs/
  charters/
    PROJECT_CHARTER.md          プロジェクトの目的・スコープ・成功基準
    DEVELOPMENT_CHARTER.md      開発の暗黙の作法 (= 必読)
    DESIGN_CHARTER.md           UI/UX 規範
  patterns/
    01-environment-and-assets.md
    02-screen-structure.md
    03-i18n-and-help.md
    04-time-and-modals.md
    05-effects-audio-ui.md
    06-state-and-data.md
    07-ranking-integration.md
    08-dev-conventions.md
  process/
    SPEC_DRIVEN_DEVELOPMENT.md
    GIT_WORKFLOW.md
  testing/
    TESTING_STRATEGY.md
    TEST_CASES.md
  setup/
    new-project.md              新規プロジェクト初期化手順
    google-apps-script.md       ランキング GAS デプロイ手順
  specs/
    SPEC-INDEX.md               (新規追加: SPEC を 1 行ずつ並べる)
index.html                      エントリポイント (タイトル/ヘッダー/views 雛形)
js/
  main.js                       state + onTick + 画面 routing 雛形
  constants.js                  ASSET_BASE + img()/audioUrl()
  i18n.js                       multi-locale 基盤
  ranking-client.js             GAS 連携クライアント
  effects.js                    confetti + sprite float
  data-loader.js                JSON loader (heroes 等の汎用パターン)
data/
  i18n/
    ui.json                     UI 文字列 (ja/en object 形式)
  sample-entities.json
tools/
  sim/
    README.md                   シミュレータ実装ガイド
og-image.png                    OG 画像 placeholder
```

## ライセンス

bearko 個人テンプレート。 派生作品の license は各プロジェクトで指定してください。
本テンプレート自体に依存する外部素材 (= MCH 公式 CDN 等) は、 各プロジェクトの規約に従って参照すること。

## 関連リポジトリ

- `bearko/mycryptotactics` — 戦術カードゲーム (本テンプレートの源流 1)
- `bearko/mycryptofactory` — 経営シム (本テンプレートの源流 2)
- `bearko/aidev_template` — bearko の AI 開発全プロジェクト共通の運用ベース
