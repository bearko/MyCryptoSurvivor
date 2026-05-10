---
id: SPEC-025
title: Fix Audio Paths (= MCH カタログ実体に整合、 404 → 200)
status: Done
pr: 32
phase: Phase 0 / Phase 1
kind: Fixed
---

# SPEC-025 — Fix Audio Paths (MCH カタログ整合)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指摘:
> SE と BGM、 反映されてますか?

検証結果: SPEC-017 で組んだ配線 (= `audio.js` の `playSe` / `startBgm` + 各 caller) は正しいが、
**`js/constants.js` で定義した SFX / BGM のパス文字列が MCH カタログの実構造と一致しない** ため
全てのオーディオが `404` で読込失敗。 `audio.js` の `play().catch(() => {})` が例外を握りつぶす
ため UI エラー無しで無音化していた。

## 2. ゴール

- 全 9 SE + 1 BGM のパスを **MCH カタログ実体に揃える** (= 全部 `200 OK`)
- 配線 (= `playSe` 呼出側 / `startBgm` 呼出側) は変更しない (= スコープ最小)

## 3. MCH カタログの実構造 (= 検証済 200)

```
Audio/
  BGM/
    land.mp3 / pve.mp3 / pvp.mp3 / raid.mp3
  SE/
    clear.wav
    Actions/
      cp-mining-complete.mp3 / craft.mp3 / crash.mp3 / insp.mp3 /
      open_treasure.mp3 / production.mp3 / tooldev.mp3
    Battle/
      1_single_damage.{mp3,ogg} / 2_area_damage.{mp3,ogg} /
      3_heal_resurrection.{mp3,ogg} / 4_buff.{mp3,ogg} /
      5_debuff_status_effect.{mp3,ogg}
    Jingles/
      knight.mp3 / lose.mp3 / win.mp3
```

## 4. 修正対象 (= `js/constants.js` の SFX / BGM_BATTLE)

| 定数 | 旧パス (= 404) | 新パス (= 200) |
|---|---|---|
| `BGM_BATTLE` | `Audio/SE/pvp.mp3` | **`Audio/BGM/pvp.mp3`** |
| `SFX.HERO_PICK` | `Audio/SE/tooldev.mp3` | **`Audio/SE/Actions/tooldev.mp3`** |
| `SFX.PLAYER_DAMAGED` | `Audio/SE/1_single_damage.mp3` | **`Audio/SE/Battle/1_single_damage.mp3`** |
| `SFX.GEM_PICKUP` | `Audio/SE/crash.mp3` | **`Audio/SE/Actions/crash.mp3`** |
| `SFX.LEVEL_UP` | `Audio/SE/open_treasure.mp3` | **`Audio/SE/Actions/open_treasure.mp3`** |
| `SFX.PICK_WEAPON` | `Audio/SE/insp.mp3` | **`Audio/SE/Actions/insp.mp3`** |
| `SFX.PICK_BUFF` | `Audio/SE/4_buff.mp3` | **`Audio/SE/Battle/4_buff.mp3`** |
| `SFX.PICK_HEAL` | `Audio/SE/3_heal_resurrection.mp3` | **`Audio/SE/Battle/3_heal_resurrection.mp3`** |
| `SFX.GAME_OVER_LOSE` | `Audio/SE/lose.mp3` | **`Audio/SE/Jingles/lose.mp3`** |
| `SFX.GAME_OVER_CLEAR` | `Audio/SE/win.mp3` | **`Audio/SE/Jingles/win.mp3`** |

## 5. 受入基準

- [ ] Press to Start → ヒーロー選択画面で hero タイル click 時に `tooldev.mp3` が鳴る
- [ ] バトル開始時に `pvp.mp3` BGM がループ再生される (= 適度な音量で他 SE を圧倒しない 0.32)
- [ ] 敵接触で `1_single_damage.mp3` が鳴る (= 200ms throttle で連発防止)
- [ ] CE gem 拾得で `crash.mp3` が鳴る (= 80ms throttle)
- [ ] レベルアップモーダル表示時に `open_treasure.mp3` が鳴る
- [ ] 武器ピックで `insp.mp3` / 強化 (回復系以外) で `4_buff.mp3` / Armor / Ramen で `3_heal_resurrection.mp3` が鳴る
- [ ] 死亡で `lose.mp3` / クリア (= ボス撃破 or 5 分耐久) で `win.mp3` が鳴る + BGM 停止
- [ ] DevTools Network タブで全 audio リクエストが **200 OK**
- [ ] DevTools console エラー無し

## 6. リスク

- **autoplay 制限** — モバイル / Safari は user gesture 後しか自動再生不可。 既存 `unlockAudio()` で対処済 (= Press Start click で解除)
- **再 PR 不要** — 配線層は触らないので SPEC-017 とは互いに干渉しない

## 7. 参考

- `js/audio.js` — `playSe(path, throttleMs, volume)` / `startBgm(path, volume)` 実装
- `js/constants.js` — SFX / BGM_BATTLE 定数 (= 本 SPEC で更新)
- ユーザー指示: 「SE と BGM、 反映されてますか」 → カタログパス調査で 10 件全て 404 を発見
