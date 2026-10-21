---
id: SPEC-140
title: Combined Robot Helper Item — Unlocked in the Skill Tree, Drops From Pots and Chests, Invincibility With Rainbow Glow and Its Own BGM; Rank Raises Rarity and Duration
status: Done
pr: TBD
phase: v1.6 Skill Tree
kind: Added
---

# SPEC-140 — お助けアイテム「合体ロボ」（無敵）

- **Status**: Done
- **関連**: SPEC-053（お助けアイテム）・SPEC-090（スキルツリー）・SPEC-125（力添えの無敵）

## 1. 作者の依頼（2026-10-21）

（合体ロボシリーズ）◯秒の無敵時間の解放。 スキルツリーでレベルアップするほどアイコンのレアリティアップ＆無敵の持続時間を延長。
無敵時間中は虹色に光ってほしい＆BGM が変わってほしい。

作者の決定：解放すると **壺・宝箱から落ちる**。

## 2. 中身

| 段 | 絵 | 無敵 |
|---|---|---|
| 1 | 1123（Common） | 3 秒 |
| 2 | 2123（Uncommon） | 4 秒 |
| 3 | 3123（Rare） | 5 秒 |
| 4 | 4123（Epic） | 6 秒 |
| 5 | 5123（Legendary） | 8 秒 |

- スキルツリー：新しい道「お助け」に `itm_robot`（生存の「自然治癒」の左・120 GUM × 段・5 段）。
- 出る割合（重み）：壺 6・ふつうの宝箱 15・ボス戦の宝箱 10。 RTA はスキルツリーが切れているので出ない。
- 無敵は被弾のあとの無敵と同じしくみ（`contactCooldownMs`）。 続けて拾うと長いほうに延びる。 時間はゲーム内時間。
- 無敵のあいだ：自分の絵の色が回り（`hue-rotate`）、 まわりに虹色の光の輪。 残り 1 秒は点滅。 BGM は `Audio/BGM/raid.mp3` に替わり、 切れたら前の曲に戻す（ステージの始まりは startBattle がいつもの曲にする）。

## 3. 確かめたこと

- `node --test tests/*.test.mjs`：336 件すべて通過（`tests/robot.test.mjs`）。
- ブラウザ（390×844・段 3）：壺の表に入る、 拾うと無敵 5 秒・虹色・BGM が raid.mp3 に、 切れたら pvp.mp3 に戻る。 エラーなし。
