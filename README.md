# MyCryptoSurvivor

MyCryptoHeroes のヒーローとエクステンションで遊ぶ **サバイバー系アクション** のシングルプレイ web ゲーム。
10 名のヒーローから 1 名を選び、押し寄せる敵の中を動き回りながら、自動で撃つ武器（エクステンション）を
レベルアップのたびに選んで育て、全 3 ステージのボスを倒す（1 プレイ約 15 分）。

**遊ぶ**: https://survivor.bearko.games/

> **ベース**: `bearko/mycryptotemplate` (= vanilla JS / 静的 host テンプレート)
> **想定範囲**: モバイル / PC 両対応の 2D web ゲーム (= ビルドステップなし)
> **ジャンル**: サバイバー系アクション + ランキング（bearko.games のアチーブメント・RTA・総合スコアに参加）

## 遊び方

| 操作 | PC | スマホ |
|---|---|---|
| 移動 | WASD / 矢印キー | 画面をドラッグ（指の下にスティックが出る） |
| 攻撃 | 自動 | 自動 |
| メニュー（一時停止） | ☰ | ☰ |

- 敵を倒すと出る経験値ジェムを拾うと Lv が上がり、武器か強化を 1 つ選ぶ
- 各ステージは 4 分でボスが出る。倒すか 5 分耐えるとクリア。全 3 ステージで活動レポートとスコア
- モード：NORMAL ／ ABSOLUTE（難易度を 4 軸で調整、スコアに倍率）／ RTA（bearko.games）

## bearko.games のアチーブメント

条件を満たすと bearko.games 共通基盤のアチーブメントが手に入る（SPEC-039 / SPEC-096。ログインしていなくても獲得でき、あとでログインすると登録される）。
一覧と絵は共通基盤の `docs/ACHIEVEMENT_CATALOG.md`。

| 種類 | No. | ID | 名前 | 絵 | 条件 |
|---|---|---|---|---|---|
| ヒーロー | 023 | `survivor.stage1` | 狼王ロボ | シートン | 最初のステージをクリアする（ボス撃破か 5 分耐久） |
| ヒーロー | 024 | `survivor.awaken` | 荒野の復讐者 | ジェロニモ | スキルツリーの「サバイバーの覚醒」を解放する |
| ヒーロー | 025 | `survivor.stage2` | 幻の生存者 | アナスタシア | ステージ 2 をクリアする |
| ヒーロー | 026 | `survivor.tree5` | 変身 | カフカ | スキルツリーの節を 5 つ取る |
| ヒーロー | 027 | `survivor.stage3` | 不屈のガンマン | ワイアット・アープ | ステージ 3 にたどり着く |
| ヒーロー | 028 | `survivor.fao` | フンババとの戦い | ギルガメッシュ | 覚醒魔王ファオを倒す |
| ヒーロー | 029 | `survivor.capstone` | 六韜 | 太公望 | スキルツリーの奥義をひとつ解放する |
| ヒーロー | 030 | `survivor.clear` | ロシアの怪僧 | ラスプーチン | 全 3 ステージをクリアする（クリア） |
| ヒーロー | 031 | `survivor.allboss` | 人中に呂布あり | 呂布 | 3 体のボスをすべて倒して全ステージをクリアする |
| ヒーロー | 032 | `survivor.rta` | ワンホールショット | ビリー・ザ・キッド | RTA で全ステージを完走する |
| ヒーロー | 033 | `survivor.absolute` | 蒼狼 | チンギス・ハン | ABSOLUTE の 4 軸すべて ×2.0 以上で全ステージをクリアする |
| エクステンション | — | `survivor.visit` | 慈愛の雪崩 | 慈愛の氷雪王妃クイーンスノー&ベビー | MyCryptoSurvivor を遊ぶ（SDK が送る） |
| エクステンション | — | `survivor.firstboss` | タイガーシュート | アムールタイガー | 初めてボスを倒す |
| エクステンション | — | `survivor.chest` | 世界を駆けたドラムライン | ドレークの遺産 | 宝箱を初めて開ける |
| エクステンション | — | `survivor.runs10` | 黄金氷河期 | 絶対零度ゴールデンスノーマン | 挑戦を通算 10 回終える |

## クイックリファレンス

| 項目 | 値 |
|---|---|
| localStorage prefix | `mcs.*` |
| ASSET_BASE | `https://raw.githubusercontent.com/bearko/mycryptoheroes/main/` |
| 多言語 | ja / en |
| 静的ホスティング | Cloudflare Workers の静的アセット（`main` にマージで公開。`build:` 不要） |
| テスト | `node --test tests/*.test.mjs` |

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
    SPEC-INDEX.md            SPEC 一覧（自動生成: node tools/build-spec-index.mjs）
    SPEC-NNN-<topic>.md      各機能の仕様
  setup/                     新規プロジェクト初期化 / GAS デプロイ
  testing/                   テスト戦略とケース
  lessons-learned/           MCT/MCF 振り返り
index.html                   エントリポイント
js/
  main.js / state.js / constants.js / i18n.js
  effects.js / audio.js / data-loader.js / ranking-client.js / platform.js
  battle/                    戦闘（入力・敵・武器・描画・レベルアップ・結果）
css/
  base.css / layout.css / components.css / effects.css / responsive.css
data/
  heroes.json / extensions.json / enemies.json
  i18n/ui.json
tests/                       node --test のテスト
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
- `bearko/mycryptoheroes` — 画像 / 音声 CDN (= ASSET_BASE が指す先)
- `bearko/MyCryptoPortfolio` — bearko.games 共通基盤（ログイン・アチーブメント・RTA・総合スコア）
- `bearko/mycryptotactics` / `bearko/mycryptofactory` — 兄弟プロジェクト
