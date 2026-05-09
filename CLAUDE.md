# Claude Code 開発ガイド

このファイルは **本リポジトリで Claude Code を起動した際に最初に参照されるべきガイド** です。
派生プロジェクトでも、 この CLAUDE.md と `docs/charters/` の規範を最優先に従って実装してください。

## 必読順序

新規セッションで Claude が読むべき順番:

1. **本ファイル (CLAUDE.md)** — 全体観
2. **`docs/charters/PROJECT_CHARTER.md`** — プロジェクトの目的・スコープ
3. **`docs/charters/DEVELOPMENT_CHARTER.md`** — 開発の作法 (必読、 暗黙の了解集)
4. **`docs/charters/DESIGN_CHARTER.md`** — UI/UX 規範
5. **`docs/process/SPEC_DRIVEN_DEVELOPMENT.md`** — 仕様駆動の流れ
6. **`docs/process/GIT_WORKFLOW.md`** — コミット / ブランチ / PR
7. **`docs/patterns/*.md`** — 個別実装パターン (= 該当する作業のときだけ参照)
8. **`docs/specs/SPEC-INDEX.md`** — プロジェクト固有の SPEC 一覧

## 技術スタック (= 不変、 変更には合議が必要)

- **プレーン ES Modules + バニラ JS** — TypeScript / バンドラ / フレームワーク **なし**
- **HTML 単一エントリ** (`index.html`)
- **静的ホスティング前提** — Vercel / GitHub Pages / Cloudflare Pages 等で `build:` 不要
- **データは `data/*.json` から runtime fetch**
- **外部素材は CDN URL 参照** (= リポジトリにバイナリは置かない)
- **音声・画像は `js/constants.js` の `ASSET_BASE` 経由**

これらは派生プロジェクトでも **基本的に変えないでください**。 変更したい場合は新規 SPEC で合意を取ってからにすること。

## やってはいけないこと

- `package.json` を導入して npm dependency を増やす (= ビルドステップが発生する)
- 外部画像/音声をリポジトリに直接コミットする (= raw CDN URL を使う)
- `.env` / 認証情報をコミットする
- `git push --force` を main / prod に行う (= 必ず PR で)
- コミットメッセージから `Co-Authored-By: Claude` を消す
- `.claude/settings.json` を勝手に書き換える (= 権限 escalation)

## 作法 (= 暗黙の了解)

詳細は `docs/charters/DEVELOPMENT_CHARTER.md` を参照。 要点だけ:

### 関数命名

| 接頭辞 | 用途 | 例 |
|---|---|---|
| `trigger*` | イベントを起動 (内部で pauseTime 含む) | `triggerCraftCompletion` |
| `open*` / `close*` | Modal の表示制御 | `openCompletionScreen` / `closeAppraisalScreen` |
| `render*` | DOM 描画 (state を反映) | `renderHeader` / `renderQuestCard` |
| `pick*` | ユーザー選択を state に記録 | `pickCommission` / `pickHeroForTeam` |
| `apply*` | state 変化を確定 (= 金銭/コミット) | `applyFactoryLvUp` / `applySalary` |
| `find*` | condition で検索 (= 新オブジェクト返却) | `findEmptyCraftSlot` / `findActiveHero` |
| `get*` / `set*` | accessor / mutator | `getActiveCraft(idx)` / `setActiveCraft(idx, ac)` |
| `tick*` | 毎 tick の simulation | `tickActiveCraft(idx)` / `tickPassiveRestRecovery` |
| `is*` / `can*` | bool を返す predicate | `isExtUnlocked` / `canSellExt` |

### i18n キー

階層: `<feature>.<context>.<aspect>` 例:
- `quest.mai.success` (= クエスト feature の Mai セリフの success ケース)
- `enhance.rankUpBtn` (= 強化画面のランクアップボタン)
- `mai.craftBusy` (= Mai キャラの craftBusy セリフ、 prefix `mai.` 専用)

形式: 文字列か object (`{"ja":"..","en":".."}`)。 後者は i18n.js の `t()` で lang-aware lookup。

### Phase 表記

機能群を Phase でまとめて記録 (= `Phase 0` / `Phase 1A` / `Phase 1D-42` / `Phase β2-3 part 2` 等)。
`docs/specs/SPEC-NNN.md` の表題と commit message に Phase を入れる。

### コミットメッセージ

Conventional Commits + Phase ラベル + Co-Author:

```
feat(spec-006): Phase 1D-42 — 月次イベント / 経験値 / クエスト再出発

- Implement triggerAnnualSalary
- ...

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Pause/Resume 不変条件

`pauseTime()` と `resumeTime()` は **必ず対** で呼び出す。 modal 開閉に紐づける場合:

```js
// Modal を開くとき
function openMyModal() {
  pauseTime();
  $("#myModal").classList.remove("hidden");
}

// Modal を閉じるとき (= 必ず resumeTime)
function closeMyModal() {
  $("#myModal").classList.add("hidden");
  resumeTime();
}
```

`maiSays`/`maiSaysSequence` は **既に paused なら自前 pause を skip** する設計 (= MCF Phase 1D-47 fix)。 これにより呼出側 pre-pause と modal 連鎖の両立が成立。

詳細: `docs/patterns/04-time-and-modals.md`

## 作業の進め方

1. ユーザーが「X を実装したい」 と言う
2. Claude は **まず SPEC を書く** か、 既存 SPEC があるか確認
3. SPEC のレビュー → 承認 → 実装
4. 実装は **小さい PR** に分割 (= 1 PR 1 SPEC、 巨大 PR 禁止)
5. PR には **テスト計画** を Test plan セクションで記載
6. ユーザーがマージ → Claude は次タスクへ

## デバッグの際のチェックリスト

- 「時間が止まる/止まらない」 → `pauseFlags` の counter を console.log で確認
- 「Modal が裏で時間進行」 → modal opener が pauseTime を呼んでいるか
- 「翻訳が出ない」 → `data-i18n` 属性が設定されているか + `applyDataI18n()` が呼ばれているか
- 「画像が出ない」 → `img()` 経由で URL 解決しているか + onerror フォールバックがあるか
- 「ランキングに送信できない」 → `getRankingApiUrl()` が non-null を返すか (= localStorage か `_DEFAULT_API_URL_ENC`)

## 困ったとき

- **設計判断で迷う** → `docs/charters/` を参照、 それでも解決しないなら SPEC で議論
- **既存パターンの応用** → `docs/patterns/` の該当章 + MCT/MCF コードベースを grep
- **ユーザーへの提案** → 「複数案を提示 → ユーザー選択」 の形 (= 一方的に決めない)
- **大きな refactor** → 必ず段階的に。 1 PR で 100+ 箇所変更は禁止 (= MCF の `state.activeCraft` → array 化のような場合は accessor 関数で互換維持しながら段階移行)
