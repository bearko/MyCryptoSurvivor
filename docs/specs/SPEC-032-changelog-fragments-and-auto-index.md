---
id: SPEC-032
title: Changelog Fragments + Auto-Generated SPEC-INDEX
status: Implementing
pr: feat/spec-032-changelog-fragments
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-032 — Changelog Fragments + Auto-Generated SPEC-INDEX

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

並列 PR でほぼ毎回 `CHANGELOG.md` と `docs/specs/SPEC-INDEX.md` が衝突 → fresh-branch + squashed commit で再 PR、 を繰り返してきた (= SPEC-018, 022, 023, 024, 026, 030, 037 の 7 件で発生)。 ユーザー要望:

> コンフリクトについて、 恒久対応が可能かも検討してください。

選択肢提示の結果、 **「Changelog Fragments + index 自動生成」** を採用。

## 2. 根本原因

両ファイルとも:
- 全 PR が **同じ「リスト」** を編集する (= 表 / 順序付き bullet)
- 各 PR が **既存エントリ (= 自分以外の SPEC)** にも触る (= status flip / merged 注釈)

→ 隣接行を 2 PR が同時に変更し、 git の三方マージで解決不能 → コンフリクト。

## 3. 解決方針

### 3.1 SPEC-INDEX.md を frontmatter から自動生成

各 `docs/specs/SPEC-NNN-*.md` の冒頭に YAML frontmatter:

```yaml
---
id: SPEC-NNN
title: 短いタイトル
status: Implementing | Done | Cancelled
pr: 39                            # 数値 PR 番号 or "feat/..." (= branch 名)
phase: Phase 0 / Phase 1
kind: Added | Changed | Fixed | Removed
---
```

`tools/build-spec-index.mjs` (= 純 Node、 依存なし) が全 SPEC を読んで `SPEC-INDEX.md` の `<!-- BEGIN AUTO-INDEX -->` ... `<!-- END AUTO-INDEX -->` 間を再生成。

### 3.2 CHANGELOG.md を per-SPEC fragment から自動生成

`docs/changelog/SPEC-NNN.md` (= **bullet list のみ、 見出し行不要**) を新規作成。 PR は自分の SPEC に対応する 1 ファイルだけを追加。

`tools/build-changelog.mjs` が:
1. `docs/changelog/SPEC-*.md` を SPEC 番号降順で集める
2. 対応する SPEC の frontmatter から `kind` / `title` / `status` / `pr` を読む
3. 見出しを `### {kind} — {id} (= {title}){— merged in #N if Done}` で組み立て
4. `CHANGELOG.md` の `<!-- BEGIN AUTO-UNRELEASED -->` ... `<!-- END AUTO-UNRELEASED -->` 間を再生成

### 3.3 マーカー区間の不変性

両ファイルとも、 **マーカー外** の文章 (= タイトル / 説明 / 命名規則 / 過去 release) は手動編集 OK。 マーカー内は自動生成、 PR では触らない。

## 4. 実装

### 4.1 ツール (= 新規 2 本)

- `tools/build-spec-index.mjs`
- `tools/build-changelog.mjs`

両方とも:
- 純 Node ESM (= `node:fs` / `node:path` のみ)、 npm 依存ゼロ
- 簡素な YAML frontmatter parser を内蔵 (= `key: value` 行のみ)
- マーカー間を sliceで置換、 一致なら no-op

### 4.2 既存 SPEC のマイグレーション

全 31 SPEC (= SPEC-001 ~ SPEC-031) に frontmatter を追加。 既存の `SPEC-INDEX.md` 表行から `status` / `pr` を抽出して frontmatter に書き戻す。 `pr` は数値 / branch 名のどちらでも受ける。

### 4.3 既存 CHANGELOG のマイグレーション

`[Unreleased]` セクション内の 30 SPEC (= SPEC-002 ~ SPEC-031) を `docs/changelog/SPEC-NNN.md` に分割。 複数 sub-section (= "Phase 0 spec" + "Planned Phase 1") を持つ古い SPEC は、 sub-section 見出しを `**Added Phase 0 (= ...)**` のような bold 太字段落として保持 (= 元の構造維持)。

`## [SPEC-001] — 2026-05-09` 以降 (= 過去リリース) は **そのまま残置** (= 移動しない)。

### 4.4 ドキュメント更新

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` 11 章を新設 (= 新ワークフロー手順)
- `CLAUDE.md` の 「作業の進め方」 に **触る / 触らないファイル** 表を追加

## 5. 受入基準

- [ ] `node tools/build-spec-index.mjs` を 2 回実行しても CHANGELOG / INDEX に diff が出ない (= idempotent)
- [ ] `node tools/build-changelog.mjs` を 2 回実行しても diff が出ない
- [ ] 新規 PR が `docs/specs/SPEC-NNN-*.md` (= 新規) と `docs/changelog/SPEC-NNN.md` (= 新規) のみを触れば、 SPEC-INDEX / CHANGELOG はメンテナーが後で再生成して反映できる
- [ ] 並列 PR (= e.g. SPEC-A と SPEC-B が同時 open) で `git merge` 時にコンフリクトが出ない (= 両者が触るのは別ファイル)
- [ ] 既存の SPEC-001 ~ SPEC-031 が SPEC-INDEX に Done として表示される
- [ ] `[Unreleased]` の自動生成出力が SPEC-031 → SPEC-002 の順で並ぶ (= 番号降順)
- [ ] `## [SPEC-001] — 2026-05-09` セクション以下 (= 過去 release) が壊れない

## 6. リスク / 既知の妥協

- **手書きアノテーションの欠落**: 旧 INDEX には 「`#21 (merged、 旧 #20 は close)`」 のような細かい注釈があった。 自動生成では `#21 (merged)` のみになる。 → 必要なら frontmatter に `notes:` を追加して描画する後続改善 (= 本 SPEC の non-goal)。
- **frontmatter 手動更新の漏れ**: `status: Implementing → Done` の flip を忘れる可能性。 → 慣れの問題。 必要ならマージ時 GH Action で自動 flip する後続改善も可能 (= 本 SPEC の non-goal)。
- **fragment ファイルの命名強制**: `docs/changelog/SPEC-NNN.md` で 3 桁 zero-pad 必須。 → tooling の前提、 既存 SPEC と同じ規約。

## 7. 後続改善 (= スコープ外)

- pre-push hook で自動的に build script を走らせる
- GitHub Actions で `main` push 時に自動再生成 + commit
- `notes:` frontmatter で複雑な PR ヒストリ (= 「旧 #20 は close」 等) を保持
- リリース時に `[Unreleased]` を `## [v0.x.y]` セクションに移動するスクリプト

## 8. 参考

- ユーザー回答 (= 4 択中): 「Changelog Fragments + index 自動生成 (推奨)」 を選択
- 過去の衝突事例: SPEC-018 / 022 / 023 / 024 / 026 / 030 (= ほぼ毎 PR で fresh-branch 戦略)
