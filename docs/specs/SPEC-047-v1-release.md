---
id: SPEC-047
title: v1.0 Release — Version, Changelog Releases, Icons, Manifest, OGP
status: Done
pr: 65
phase: v1.0
kind: Added
---

# SPEC-047 — v1.0：版・変更履歴・アイコン・manifest・OGP

- **Status**: Done
- **Issue**: #58（親 #51 v1.0 仕上げ）
- **関連**: SPEC-029（ロゴ・OGP 画像）、SPEC-032（変更履歴の断片）、SPEC-035（ランキング）

## 1. 背景 / 課題

- 版が `0.1.0` のまま。変更履歴は全部 `[Unreleased]` で、公開版の区切りがない
- ファビコンが雪山の絵文字 🏔️（旧テーマの名残）。apple-touch-icon・manifest がなく、ホーム画面に追加できない
- OGP の画像が相対パス（X などは読まない）。説明が英語の仮の文
- ランキングの絞り込みの既定が「今の版のみ」。版を上げた瞬間に、ゲーム内のランキングが空に見える

## 2. ゴール

- `APP_VERSION` を `1.0.0` に（bearko.games 共通基盤の `init` とランキングの送信に入る）
- 変更履歴に `## [1.0.0] — 2026-10-16`。SPEC-001〜047 の断片はこの版の下に、これから足す断片は `[Unreleased]` に
- アイコン：ロゴの紋章を切り出した 48・180・192・512px。`manifest.json`（standalone・縦・maskable）
- OGP：`https://survivor.bearko.games/` の絶対 URL、日本語の説明、`<meta name="description">`
- ランキングの既定の絞り込みを「全バージョン」に（v1.0 でスコアの式は変えていないので、0.1.0 の記録も同じ物差し）

## 3. 非ゴール

- オフラインで動かす（service worker）。ゲームの素材を CDN から読むので、オフラインでは遊べない
- 新しい OGP 画像（SPEC-029 のものを使う）

## 4. 技術設計

| ファイル | 変更 |
|---|---|
| `js/constants.js` | `APP_VERSION = "1.0.0"` |
| `docs/changelog/RELEASES.json`（新規） | `[{ version, date, upTo, summary }]` |
| `tools/build-changelog.mjs` | `RELEASES.json` を読み、`upTo` 以下の断片をその版の見出しの下に出す。どの版にも入らない断片は `[Unreleased]` |
| `assets/icons/`（新規） | `favicon-48.png`・`apple-touch-icon.png`（180）・`icon-192.png`・`icon-512.png`。ロゴ（`assets/logo.png`）の紋章を正方形に切り出した。素材のバイナリではなくロゴの派生なので、憲章 4 章の例外（ロゴ・OGP 画像）に含める |
| `manifest.json`（新規） | 名前・`start_url ./`・`display standalone`・`orientation portrait`・色・アイコン（any と maskable） |
| `index.html` | `<title>`・description・OGP の絶対 URL・`og:url`・アイコン・manifest・`apple-mobile-web-app-*`。ランキングの絞り込みの並び（全バージョンを先に） |
| `js/ranking-ui.js` | 既定の絞り込みを `all` に |

## 5. 受け入れ基準

- [x] タイトルのタブにロゴの紋章のファビコン
- [x] `manifest.json` が読め、アイコンが 192・512 で出る
- [x] OGP の画像が絶対 URL
- [x] 変更履歴の `[1.0.0]` の下に SPEC-001〜047、`[Unreleased]` は空
- [x] ゲーム内のランキングを開くと「全バージョン」が選ばれている

## 6. テスト

- `node --test tests/*.test.mjs`
- `node tools/build-changelog.mjs` を 2 回走らせて、2 回目が「最新（no change）」
- 手元のブラウザで `manifest.json` とアイコンが 200 で読めること、ファビコンの `<link>`、ランキングの既定値
