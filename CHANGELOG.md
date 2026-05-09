# Changelog

このテンプレートの変更履歴。 [Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

### Added
- `docs/lessons-learned/MCT-MCF-KPT.md` — MyCryptoTactics + MyCryptoFactory 2 作の振り返り (= テンプレート発端文書)
- `CHANGELOG.md` — このファイル

## [0.1.0] — 2026-05-09

### Added — テンプレート初版

#### Charters
- `docs/charters/PROJECT_CHARTER.md` — プロジェクト目的・スコープ・成功指標のテンプレ
- `docs/charters/DEVELOPMENT_CHARTER.md` — 14 セクションの開発規約 (Spec-First / Small PR / Defensive Coding ほか)
- `docs/charters/DESIGN_CHARTER.md` — Mobile First / カラーパレット / ボタン階層 / モーダル閉じ方

#### Patterns (8 docs)
- `01-environment-and-assets.md` — viewport / clamp / アセット CDN / JSON loader
- `02-screen-structure.md` — Title / Header / Stage / Modal / z-index 表
- `03-i18n-and-help.md` — i18n.js full code + applyDataI18n
- `04-time-and-modals.md` — pauseFlags counter + MCF Phase 1D-47 ownership fix
- `05-effects-audio-ui.md` — 紙吹雪 / sprite float / shake / BGM / SE
- `06-state-and-data.md` — 単一 state + 並列スロット accessor + 月次イベント dedup Set + seed RNG
- `07-ranking-integration.md` — Google Apps Script ランキング API + GAS V8 numeric separator 警告
- `08-dev-conventions.md` — 命名規則 / i18n キー / JSDoc / Conventional Commits

#### Process
- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR 三段階ワークフロー
- `docs/process/GIT_WORKFLOW.md` — main / prod 戦略 + ブランチ命名 + リリース手順

#### Testing
- `docs/testing/TESTING_STRATEGY.md` — 3 層 (Unit / Sim / Manual QA)
- `docs/testing/TEST_CASES.md` — 起動 / レイアウト / i18n / 時間制御 / ランキング / 並列スロットの汎用チェックリスト

#### Setup
- `docs/setup/new-project.md` — 新規プロジェクト起ち上げ手順
- `docs/setup/google-apps-script.md` — GAS デプロイガイド (CORS preflight 回避 / numeric separator 警告含む)

#### Skeleton code
- `index.html` — Splash + Title + Header + Stage + Help overlay + Effect layers
- `js/main.js` — entry point (= initI18n / time loop / lang toggle / help overlay)
- `js/state.js` — 単一 state + pauseTime / resumeTime
- `js/constants.js` — ASSET_BASE / img / audioUrl / LS_PREFIX
- `js/i18n.js` — t / tpl / applyDataI18n / lang change listener
- `js/effects.js` — triggerConfetti / pushSpriteFloat / applyShake
- `js/audio.js` — startBgm / stopBgm / playSe (= throttle 付き)
- `js/data-loader.js` — loadJson cache helper
- `js/ranking-client.js` — getRankingApiUrl / submitScore / fetchRanking

#### CSS
- `css/base.css` — reset + CSS 変数
- `css/layout.css` — splash / title / header / stage
- `css/components.css` — buttons / cards / modals / notification
- `css/effects.css` — confetti / float / shake + reduced-motion
- `css/responsive.css` — mobile / tablet / pc + safe-area

#### Data
- `data/i18n/ui.json` — サンプル翻訳エントリ
- `data/sample-entities.json` — version 付きサンプルデータ

#### Tools
- `tools/sim/README.md` — sim ディレクトリの使い方
- `tools/sim/BALANCE_LOOP.md` — バランス調整自動 loop の収束条件と仕様

#### Claude Code 連携
- `CLAUDE.md` — 必読順 / 命名規則 / pause/resume invariants / デバッグ checklist
- `AGENTS.md` — Sub-agent 推奨カタログ + HITL escalation rules + Skills (= /loop, /schedule)
- `.claude/settings.json` — permission allowlist + ask list (= 破壊的操作)

#### Project meta
- `README.md` — テンプレート概要 + quickstart
- `.gitignore` — Node / IDE / OS / Vercel / Claude セッション
- `.github/PULL_REQUEST_TEMPLATE.md` — Summary / Why / Changes / Test plan

[Unreleased]: https://github.com/bearko/mycryptotemplate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bearko/mycryptotemplate/releases/tag/v0.1.0
