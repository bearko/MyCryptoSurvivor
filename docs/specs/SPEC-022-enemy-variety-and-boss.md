---
id: SPEC-022
title: Enemy Variety + Time-Based Waves + Deep Yoshka Boss
status: Done
pr: 28
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-022 — Enemy Variety + Time-Based Waves + Deep Yoshka Boss

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景 / 課題

ユーザー指示:
> 1 分ごとにエネミーの種類を増やしてください。 少しずつ大きく、 強力な敵にしてほしいです。
> ラスト 1 分はディープ・ヨシュカを出してください。

現状: 全敵が `ENEMY_HP_INITIAL=30` / `ENEMY_DMG=10` / `ENEMY_RADIUS=12` の単一スペックで、 単一画像 (= ENEMY_ROSTER[0]) で表示。 ステージ時間制限なし、 クリア概念なし。

## 2. ゴール

- **5 分間のステージ** (= STAGE_DURATION_MS = 300_000)
- **1 分ごとに wave が切替**、 新種が pool に追加 (= 種類が増えていく)
- 各敵に固有の **HP / DMG / 速度 / サイズ / アイコン**
- 4 分経過時に **ディープ・ヨシュカ (id 171)** をボスとして 1 体スポーン (= ラスト 1 分)
- ボス撃破 or 5 分経過 = **クリア** → Game Over モーダル (= reason="clear", `win.mp3`)
- 死亡 = 敗北 (= 既存 lose path)

## 3. 設計

### 3.1 wave 進行 (= 1 分ごとに種類追加)

| 分 | 出現プール |
|---|---|
| 0:00-1:00 | クリーパー ショート (101) |
| 1:00-2:00 | + ハートブリード ヴェンティ (124) |
| 2:00-3:00 | + メリッサ ヴェンティ (134) |
| 3:00-4:00 | + バイトバンディット ヴェンティ (164) |
| 4:00-5:00 | (= 雑魚継続) + **ディープ・ヨシュカ 171** (1 度のみ spawn) |

### 3.2 enemy 個別スペック (= ENEMY_SPECS)

| enemyId | 名前 | hp | dmg | speed | radius |
|---|---|---|---|---|---|
| 101 | クリーパー ショート | 25 | 10 | 80 | 12 |
| 124 | ハートブリード ヴェンティ | 55 | 14 | 75 | 14 |
| 134 | メリッサ ヴェンティ | 95 | 18 | 70 | 16 |
| 164 | バイトバンディット ヴェンティ | 160 | 22 | 65 | 19 |
| **171** | **ディープ・ヨシュカ (= ボス)** | **3000** | **30** | **45** | **48** |

### 3.3 state 拡張

- `state.battle.stageElapsedMs` (= 0 開始、 _loop で dt*1000 加算)
- `state.battle.bossSpawned: false` (= 多重 spawn 防止)
- `state.battle.stageCleared: false` (= 多重 clear 防止)
- enemy entity に `enemyId` フィールド追加 (= sprite lookup に使う)

### 3.4 sprites.js

`getEnemySprite(enemyId)` 新規 (= 既存 cache を使い enemyImg(enemyId) を preload)。 各敵描画で個別 sprite。

### 3.5 enemies.js

- `spawnEnemyAtRing(forcedEnemyId?)` — wave pool から選ぶ or 強制指定 (= ボス用)
- `tickEnemies(dt, nowMs)`:
  - `state.battle.stageElapsedMs += dt * 1000`
  - 経過分から wave を決定し、 spawn pool を選択
  - 4 分到達で `BOSS_ENEMY_ID` を 1 度だけ spawn
  - 5 分経過 or boss 撃破済で `triggerGameOver("clear")`
- 接触ダメージ / 移動 / hitFreezeMs は既存ロジック

### 3.6 render.js

- enemy 描画で `getEnemySprite(e.enemyId)` を使い per-enemy 画像
- ボス (= radius >= 30) は HP バー幅を倍に

### 3.7 data/enemies.json

ディープ・ヨシュカ (id 171) を `data/enemies.json` の `enemies[]` に追加 (= sprite preload + lookup 用)。

### 3.8 ボス撃破検出

`damage.js#hitEnemy` で死亡時に `enemyId === BOSS_ENEMY_ID` なら `state.battle.bossDefeated = true` セット → 次 tick で `triggerGameOver("clear")`。

## 4. 受入基準

- [ ] 戦闘開始から 1 分はクリーパー ショートのみ
- [ ] 1 分経過で ハートブリード も湧き始める
- [ ] 2 分経過で メリッサ も追加
- [ ] 3 分経過で バイトバンディット も追加 (= タンク寄り)
- [ ] **4 分経過で ディープ・ヨシュカ が 1 体スポーン** (= 大きな MCH 画像、 HP バー長い)
- [ ] ボスを倒すか 5 分耐えるとクリア (= `win.mp3` + Game Over with "クリア!" 文言)
- [ ] HP 0 で死ぬと敗北 (= 既存 lose path)
- [ ] 各敵が固有サイズ / 画像で見分けられる

## 5. リスク

- **ボス HP 3000 のバランス** — Lv.5 武器で 60-185 dmg、 1 sec に複数 hit すれば 30 sec で削れる程度。 暫定値、 後続でチューニング
- **時間切れクリア vs ボス未撃破** — 5 分耐えただけでもクリア扱い (= 親切設計)。 ユーザー要望次第で 「ボス撃破必須」 に変えられる
- **複数敵 sprite 同時 load** — 5 種 × 1 枚 = 5 リクエスト、 起動時に preload しておけば遅延なし

## 6. 参考

- MCH `Data/Enemies/enemies.json` (= 934 件、 id 171 = ディープ・ヨシュカ)
- 既存 `js/battle/enemies.js` (= spawnEnemyAtRing / tickEnemies)
- 既存 `js/battle/sprites.js` (= 画像 preload キャッシュ)
- 既存 `js/battle/gameover.js` (= triggerGameOver(reason="clear"|"lose"))
