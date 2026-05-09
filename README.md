# MyCryptoSurvivor

MCH 経済圏をモチーフにした **「カイロソフト風 + 雪山サバイバル」** のシングルプレイ web ゲーム。
プレイヤーは 10 名のヒーローから 1 名を選び、 限られた日数の中で資源収集 / クラフト / クエスト を回しながら脱出を目指す。

> **ベース**: `bearko/mycryptotemplate` (= vanilla JS / 静的 host テンプレート)
> **想定範囲**: モバイル / PC 両対応の 2D web ゲーム (= ビルドステップなし)
> **ジャンル**: サバイバル + リソース管理 + ランキング

## クイックリファレンス

| 項目 | 値 |
|---|---|
| localStorage prefix | `mcs.*` |
| ASSET_BASE | `https://raw.githubusercontent.com/bearko/MyCryptoSurvivor-assets/main/` |
| 多言語 | ja / en |
| 静的ホスティング | Vercel / GitHub Pages 等 (= `build:` 不要) |

## 必読 (= Claude Code セッション開始時)

1. `CLAUDE.md` — 全体観
2. `docs/charters/PROJECT_CHARTER.md` — プロジェクトの目的・スコープ
3. `docs/charters/DEVELOPMENT_CHARTER.md` — 開発の作法
4. `docs/charters/DESIGN_CHARTER.md` — UI/UX 規範
5. `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — 仕様駆動の流れ
6. `docs/process/GIT_WORKFLOW.md` — コミット / ブランチ / PR
7. `docs/specs/SPEC-INDEX.md` — 各機能の SPEC 一覧
8. `docs/patterns/*.md` — 個別実装パターン (= 該当する作業のときに参照)

## ディレクトリ構造

```
README.md / CLAUDE.md / AGENTS.md / CHANGELOG.md
.github/PULL_REQUEST_TEMPLATE.md
.claude/settings.json
docs/
  charters/
    PROJECT_CHARTER.md       MyCryptoSurvivor のゴールと制約
    DEVELOPMENT_CHARTER.md   開発作法 (= テンプレート継承)
    DESIGN_CHARTER.md        UI/UX 規範 (= テンプレート継承)
  patterns/                  実装パターン 8 章 (= テンプレート継承)
  process/                   SPEC 駆動 + Git workflow
  specs/
    SPEC-INDEX.md            SPEC 一覧
    SPEC-001-phase-1-bootstrap.md
  setup/                     新規プロジェクト初期化 / GAS デプロイ
  testing/                   テスト戦略とケース
  lessons-learned/           MCT/MCF 振り返り
index.html                   エントリポイント
js/
  main.js / state.js / constants.js / i18n.js
  effects.js / audio.js / data-loader.js / ranking-client.js
css/
  base.css / layout.css / components.css / effects.css / responsive.css
data/
  i18n/ui.json
  sample-entities.json
tools/sim/                   バランス調整シミュレータ
```

## 開発の流れ

```bash
# 1. main から feature ブランチを切る
git checkout main && git pull
git checkout -b feat/spec-NNN-<topic>

# 2. SPEC を docs/specs/ に書く (= Phase 0)
# 3. 実装 (= Phase 1+)
# 4. 各フェーズを 1 commit にまとめて push
git push -u origin feat/spec-NNN-<topic>
```

## ライセンス

bearko 個人プロジェクト。 ヒーロー画像 / 名称は MCH (MyCryptoHeroes) 公式 IP に依存し、
本リポジトリは非公式 fan project として CDN 経由で参照する。

## 関連リポジトリ

- `bearko/mycryptotemplate` — 派生元テンプレート
- `bearko/MyCryptoSurvivor-assets` — 画像 / 音声 CDN (= ASSET_BASE が指す先)
- `bearko/mycryptotactics` / `bearko/mycryptofactory` — 兄弟プロジェクト
