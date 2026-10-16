---
id: SPEC-045
title: Battle Feel — Shake, Hurt Flash, Kill Burst, Boss Warning, Kill Counter
status: Done
pr: feat/spec-045-battle-feel
phase: v1.0
kind: Added
---

# SPEC-045 — 戦闘の手ごたえ：揺れ・被弾・撃破・ボスの予告・撃破数

- **Status**: Done
- **Issue**: #56（親 #51 v1.0 仕上げ）
- **関連**: SPEC-016（ダメージ数字・ヒットストップ）、SPEC-022（ボス）、SPEC-044（演出を減らす）

## 1. 背景 / 課題

戦闘の手ごたえが、ダメージ数字と敵のヒットストップしかない。

- 被弾しても、プレイヤーの頭上に赤い数字が出るだけ。画面の動きがなく、群れの中では気づかない
- 敵は倒れた瞬間に消える。光も粒も音もない
- 4 分でボスが出るが、予告がない（いきなり上から来る）
- 撃破数がゲームオーバー・活動レポートまで見えない
- HP が少なくなっても画面で分からない（HUD の帯だけ）

## 2. ゴール

| 場面 | 手ごたえ |
|---|---|
| 敵に当たる | 敵が一瞬白く光る（80ms） |
| 敵を倒す | 敵の色の粒が散る（雑魚 6・レア 14・ボス 32。同時に 240 粒まで）。撃破音（90ms に 1 回まで） |
| ボスを倒す | 大きく揺れる・白い閃光 |
| 被弾 | 画面の縁が赤く光る（0.35 秒で消える）・小さく揺れる（ボスの攻撃は大きく）・端末が短く震える |
| HP 30% 以下 | 画面の縁がうっすら赤いまま（脈打つ） |
| ボスが出る | 3.5 分（出る 30 秒前）に「⚠ WARNING — ボス接近」の帯と音。出た瞬間に揺れ |
| 撃破数 | HUD に 💀 n。増えたときに小さく弾む |

- 「演出を減らす」（SPEC-044）または OS の reduced-motion では：揺れ・粒・閃光・震え・脈打ちを止める。被弾の縁の赤と HP 低下の縁は、動かさずに薄く出す（情報は残す）
- 演出は遊びを止めない（ヒットストップ以外で時間を止めない）

## 3. 非ゴール

- 武器ごとの専用エフェクト
- 新しい音素材（MCH の素材の中から選ぶ）

## 4. 技術設計

### 4.1 データ（`state.battle.fx`、ステージの開始で作り直す）

```js
{ shake: 0, shakeMs: 0, hurt: 0, flash: 0, particles: [], bossWarned: false }
```

### 4.2 関数（`js/battle/fx.js` 新規）

| 関数 | 役割 |
|---|---|
| `burstCount(kind)` | 純関数。`"normal" | "rare" | "boss"` → 6 / 14 / 32 |
| `capParticles(arr, max)` | 純関数。古いものから捨てて `max` 以下に |
| `decay(v, dtMs, lifeMs)` | 純関数。`v` を `lifeMs` で 1 → 0 に線形に減らす |
| `resetFx()` | ステージの開始で |
| `fxEnemyHit(e)` | `e.hitFlashMs = 80` |
| `fxEnemyKilled(e)` | 粒・撃破音。ボスなら揺れ・閃光 |
| `fxPlayerHurt(isBoss)` | 縁の赤・揺れ・震え |
| `fxBossIncoming()` / `fxBossSpawned()` | 予告の帯と音 ／ 揺れ |
| `tickFx(dt)` | 減衰・粒の移動 |
| `shakeOffset()` | 描画のずらし量（reduced では 0） |
| `renderFxWorld(ctx, camera)` / `renderFxScreen(ctx, w, h)` | 粒 ／ 縁の赤・閃光 |

### 4.3 つなぐ場所

- `damage.js` `hitEnemy`：当たり → `fxEnemyHit`、倒した → `fxEnemyKilled`
- `enemies.js` 接触ダメージ、`boss-attack.js` `applyDmg` → `fxPlayerHurt`
- `enemies.js`：`stageElapsedMs >= BOSS_SPAWN_AT_MS − 30 秒` で `fxBossIncoming`、スポーンで `fxBossSpawned`
- `render.js`：最初に `shakeOffset` で `translate`、敵の白い光、最後に粒と画面の縁
- HUD：`#hudKills`（`survival.js` の `renderHud`）。増えたら `.hud__kills--pop` を付け直す

### 4.4 音

| 場面 | 素材 | 音量 | 間隔 |
|---|---|---|---|
| 撃破 | `Audio/SE/Battle/2_area_damage.mp3` | 0.18 | 90ms |
| ボスの予告 | `Audio/SE/Battle/5_debuff_status_effect.mp3` | 0.6 | — |

## 5. 受け入れ基準

- [x] 敵を倒すと粒が散り、同時に 240 粒を超えない
- [x] 被弾で画面の縁が赤く光って消える。HP 30% 以下で縁が赤いまま
- [x] 3:30 に「ボス接近」の帯が出る（1 ステージ 1 回）
- [x] HUD に撃破数が出る
- [x] 「演出を減らす」で揺れと粒が出ない（`shakeOffset()` が 0、粒が増えない）
- [x] 60fps を大きく割らない（粒は上限つき・画面外は描かない）

## 6. テスト

- `node --test tests/fx.test.mjs`：`burstCount`・`capParticles`・`decay`
- 手元のブラウザで、敵の撃破・被弾・ボス予告を起こして撮る（state を直接動かす）。「演出を減らす」で粒が増えないこと
