---
id: SPEC-034
title: Rare Size + Weapon Growth × 2 + Reroll 3 + Pause Menu
status: Implementing
pr: feat/spec-034-tunes-and-pause-menu
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-034 — Rare Size + Weapon Growth × 2 + Reroll 3 + Pause Menu

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> - レアエネミーのおおきさを 1.5 倍にしてほしい
> - 武器エクステのレベルアップ時の攻撃範囲の拡大具合がまだ緩やかに感じる。 Lv.5 で Lv.1 の **2 倍** に
> - リロール可能数を **3 回** にしたい
> - ヘッダーにメニュー (一時停止) ボタンを設置。 「ステージをはじめからやり直す」 「タイトルに戻る」 「閉じる」 の 3 択

## 2. ゴール

- レア 4 種の `radius` を ×1.5 (= 14→21 / 21→32 / 13→20 / 16→24)
- `WEAPON_SIZE_GROWTH_PER_LEVEL` `0.06` → **`0.25`** (= Lv.5 で 1 + 0.25×4 = 2.0×)
- `REROLL_PER_BATTLE` `2` → **`3`**
- ヘッダーに `☰` メニューボタン、 3 択モーダルで pause + 操作

## 3. 実装

### 3.1 数値調整 (= 1 行ずつ)

- `js/constants.js` `WEAPON_SIZE_GROWTH_PER_LEVEL = 0.25`
- `js/constants.js` `REROLL_PER_BATTLE = 3`
- `js/constants.js` `ENEMY_SPECS[147,170,396,407]` の `radius` を ×1.5

### 3.2 ヘッダーメニュー

**HTML** (`index.html`):
- `<header.header__right>` に `<button id="btnMenuOpen">☰</button>` を追加
- `#pauseMenuModal` を新規 (`gameover-modal` クラス再利用 + `.pause-menu__card`)
  - 3 ボタン: `#pauseMenuRestart` / `#pauseMenuToTitle` / `#pauseMenuClose`

**JS** (`js/menu.js` 新規):
- `installMenu()` を `init()` から呼ぶ (= `js/main.js`)
- `openMenu()` で `pauseTime()`、 `closeMenu()` で `resumeTime()`
- `_onRestart()`: closeMenu → 現ステージ idx の snapshot を `state.run.stages` から除去 → totals 再計算 → `startBattle(state.ownedHero)`
- `_onToTitle()`: 全 modal close → `stopBattle()` → `stopBgm()` → `pauseFlags=0` まで resumeTime → `state.ownedHero=null`、 `state.run` リセット、 `currentStageIdx=0`、 stats リセット → `#app` 隠す + `#titleScreen` 表示

**i18n** (`data/i18n/ui.json`):
- `menu.title` (= 「メニュー」 / "Menu")
- `menu.restart` (= 「ステージをはじめからやり直す」 / "Restart this stage")
- `menu.toTitle` (= 「タイトルに戻る」 / "Back to title")
- `menu.close` (= 「閉じる」 / "Close")

**CSS** (`css/components.css`):
- `.pause-menu__card` (= max-width 360px)
- `.pause-menu__buttons` (= flex column、 gap 0.5rem)

## 4. 受入基準

### 数値調整
- [ ] レア 4 種が以前より目視で 1.5 倍大きい (= 当たり判定もそれに伴って広がる)
- [ ] Revolver / Knife / Axe / Shuriken / Panjandrum / Moai / LaserGun / Pierrot / Book / Blade すべて Lv.5 で **Lv.1 の 2 倍** のアイコン (= LaserGun はビーム厚 2×、 Pierrot は爆弾アイコン 2×)
- [ ] レベルアップピッカーで 「リロール (残 **3**)」 が初期表示
- [ ] 3 回 click で disabled に

### メニュー
- [ ] ヘッダー右側に `☰` ボタン
- [ ] click でメニューモーダル表示 + ゲーム pause (= 敵 / 武器 / カメラが動かない)
- [ ] **「ステージをはじめからやり直す」**: 武器 / Lv / HP / 撃破数 0 リセット、 hero / currentStageIdx 維持、 即座に再開
- [ ] **「タイトルに戻る」**: 戦闘停止 + BGM 停止 + state リセット → タイトル画面に戻る、 Press to Start で再びヒーロー選択
- [ ] **「閉じる」**: モーダル閉じる + ゲーム再開
- [ ] レベルアップ / ボス出現 / ステージ遷移中もメニュー click で pause できる
- [ ] 言語切替でボタン文言が JP/EN 切替

### 共通
- [ ] DevTools console エラー無し

## 5. リスク

- **メニュー open 中に他モーダルが開く可能性** — pause している間は tickEnemies / tickGems も止まるので新規 trigger は出ない見込み
- **「タイトルに戻る」 で `pauseFlags=0` 強制リセット** — 通常の `resumeTime` ペアリング規約を破るが、 タイトルへの脱出 path では正しい振る舞い (= 呼び戻し時に splash 経由で再 init すればクリーン)
- **メニュー open 時の rerolls / activeReport 等の state** — 「閉じる」 で resumeTime のみ、 各 sub state は維持 (= ユーザー期待通り)

## 6. 参考

- `js/battle/stage-transition.js` (= startBattle 再呼出パターン)
- `js/battle/gameover.js` `applyRetry` (= currentStageIdx リセット参考)
- ユーザー指示: 「Lv5 で Lv1 の 2 倍」 「メニュー (一時停止) ボタン」 「3 択」
