---
id: SPEC-017
title: Sound Effects + BGM Wiring
status: Done
pr: 19
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-017 — Sound Effects + BGM Wiring

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: 既存 `js/audio.js` (= BGM / SE 再生関数は揃済)

## 1. 背景 / 課題

ユーザー指示: `bearko/mycryptoheroes/main/Audio/SE/` 配下の音源を以下の場面に割当てたい:

| 場面 | ファイル |
|---|---|
| ヒーロー選択時 (= ゲーム開始) | `tooldev.mp3` |
| ゲーム中 BGM | `pvp.mp3` |
| ヒーロー被ダメ時 | `1_single_damage.mp3` |
| 経験値獲得時 | `crash.mp3` |
| レベルアップ時 | `open_treasure.mp3` |
| 武器エクステンション選択時 | `insp.mp3` |
| 強化エクステンション選択時 (= 回復以外) | `4_buff.mp3` |
| 回復エクステンション選択時 | `3_heal_resurrection.mp3` |
| クリア時 | `win.mp3` |
| 敗北時 | `lose.mp3` |

現状音声系は完全に無音。 既存 `js/audio.js` (= `startBgm` / `stopBgm` / `playSe`) を流用し、 各イベントに hook を追加する。

## 2. ゴール

- `js/constants.js` に **`SFX_*` パス定数** を追加 (= `Audio/SE/` 接頭辞付き、 後で集中変更しやすい)
- 各イベントに hook を追加 (= main.js / battle/index.js / battle/enemies.js / battle/gems.js / battle/levelup.js / battle/gameover.js)
- ヒーロー confirm CTA (= 「冒険を始める」) で **`tooldev.mp3` SE 再生 + audio unlock**
- battle 開始 (= startBattle 末尾) で **`pvp.mp3` BGM ループ開始**
- プレイヤー被弾 (= contact damage 適用直後) で **`1_single_damage.mp3` SE** (= 200ms throttle)
- XP gem 拾得 (= `tickGems` の splice 直後) で **`crash.mp3` SE** (= 80ms throttle で連発抑止)
- Level up trigger (= modal 開く瞬間) で **`open_treasure.mp3` SE**
- pick 確定 (= `applyPick`) で category / archetype に応じて分岐:
  - weapon → `insp.mp3`
  - buff archetype = `hpMaxUp` (Armor) or `regen` (Ramen) → `3_heal_resurrection.mp3` (= 回復扱い)
  - その他 buff → `4_buff.mp3`
- Game Over (= `triggerGameOver`) で **BGM 停止 + `lose.mp3` SE**
- "クリア" 条件は現状未実装 (= SPEC-009 は lose のみ)。 `triggerGameOver(reason)` を拡張して `reason: "lose" | "clear"` を取り、 `clear` のときは `win.mp3` を鳴らす。 呼出側は **lose だけ**、 clear は将来 SPEC で trigger する想定。
- mobile autoplay 制限対策: タイトル画面の **Press to Start クリック** で audio context を unlock (= dummy `playSe` を一度実行)

## 3. 非ゴール

- 音量調整 UI (= 別 SPEC)
- BGM フェードイン / アウト (= 別 SPEC、 現状即停止 / 即開始)
- SE 重畳 (= 既存 `playSe` は `new Audio()` で都度生成、 ある程度の重畳は OK)
- 「クリア」 条件の game logic 実装 (= 別 SPEC)
- 音源プリロード / sprite 化 (= 必要なら別 SPEC)

## 4. 技術設計

### 4.1 constants.js

```js
// SPEC-017: Sound effect / BGM パス定数
export const SFX = {
  HERO_PICK:       "Audio/SE/tooldev.mp3",
  PLAYER_DAMAGED:  "Audio/SE/1_single_damage.mp3",
  GEM_PICKUP:      "Audio/SE/crash.mp3",
  LEVEL_UP:        "Audio/SE/open_treasure.mp3",
  PICK_WEAPON:     "Audio/SE/insp.mp3",
  PICK_BUFF:       "Audio/SE/4_buff.mp3",
  PICK_HEAL:       "Audio/SE/3_heal_resurrection.mp3",
  GAME_OVER_LOSE:  "Audio/SE/lose.mp3",
  GAME_OVER_CLEAR: "Audio/SE/win.mp3",
};
export const BGM_BATTLE = "Audio/SE/pvp.mp3";
```

### 4.2 audio.js 拡張 (= 軽微)

`unlockAudio()` を新規 export (= autoplay policy 対策、 dummy 再生でロック解除):

```js
let _audioUnlocked = false;
export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try {
    const a = new Audio();
    a.volume = 0;
    a.play().catch(() => {});
  } catch (_) {}
}
```

(= 必須ではないが、 mobile での確実性向上のため)

### 4.3 hook 配線

**`js/main.js`**:
- `setupTitleScreen` の `dismissTitle` で `unlockAudio()` を呼ぶ (= Press Start クリック)
- `applyHeroPick` の冒頭で `playSe(SFX.HERO_PICK)` (= 「冒険を始める」 押下)

**`js/battle/index.js`**:
- `startBattle` 末尾 (= 既存 active = true / RAF 起動の後) に `startBgm(BGM_BATTLE, 0.32)`
- `stopBattle()` で `stopBgm()` 既存呼出はそのままで OK

**`js/battle/enemies.js`**:
- 接触ダメージ適用直後 (= `pushDamageNumber` の付近) に `playSe(SFX.PLAYER_DAMAGED, 200)`

**`js/battle/gems.js`**:
- `tickGems` の splice 直後に `playSe(SFX.GEM_PICKUP, 80, 0.4)` (= 連発時 throttle、 やや小音量)

**`js/battle/levelup.js`**:
- `_openNext()` で modal class を hidden 解除する直前に `playSe(SFX.LEVEL_UP)`
- `applyPick(extId)` の category 分岐に SE 追加:
  ```js
  if (getCategory(ext) === "buff") {
    applyBuff(extId, next);
    const isHeal = ext.archetype === "hpMaxUp" || ext.archetype === "regen";
    playSe(isHeal ? SFX.PICK_HEAL : SFX.PICK_BUFF);
  } else {
    rebuildWeaponsFromOwned();
    playSe(SFX.PICK_WEAPON);
  }
  ```

**`js/battle/gameover.js`**:
- `triggerGameOver(reason = "lose")` に変更 (= 後方互換)
- 関数内で:
  ```js
  stopBgm();
  if (reason === "clear") playSe(SFX.GAME_OVER_CLEAR, 0);
  else                    playSe(SFX.GAME_OVER_LOSE,  0);
  ```
- 既存呼出 (= `enemies.js` の HP 0 ガード) は引数なしで lose 扱い

### 4.4 unlock タイミング

- Press to Start click → `dismissTitle()` 内で `unlockAudio()` を呼ぶ
- ヒーロー modal の CTA は別の user gesture なので問題なし
- iOS Safari は最初の `play()` が user gesture 内であれば以降の play 呼出も解禁される

### 4.5 BGM 二重再生防止

`startBgm` 自体が `stopBgm()` を最初に呼ぶので、 retry 時の `startBattle` 多重呼出でも 1 トラックに収束。

## 5. 受入基準

- [ ] タイトル → Press to Start → ヒーロー modal を開いた時点で **音は鳴らない**
- [ ] ヒーロー pick → 「冒険を始める」 click → **`tooldev.mp3` が 1 度鳴る**
- [ ] 戦闘開始 → **`pvp.mp3` が小音量でループ開始**
- [ ] 敵に触れて HP が減る → **`1_single_damage.mp3` SE** (= 連発しても 200ms 間隔)
- [ ] XP gem を拾う → **`crash.mp3` SE** (= 連続拾い時も throttle で爽快感)
- [ ] LV up → **`open_treasure.mp3` SE** + モーダル開く
- [ ] 武器系列 pick (= Revolver/Knife/etc) → **`insp.mp3` SE**
- [ ] Armor / Ramen pick → **`3_heal_resurrection.mp3` SE**
- [ ] Boots / Horse / Shield / Apple / Oriflamme pick → **`4_buff.mp3` SE**
- [ ] HP 0 で Game Over → **BGM 停止 + `lose.mp3` SE**
- [ ] retry → BGM 再開
- [ ] DevTools console エラー無し
- [ ] PC / mobile (Chrome / Safari) で再生確認

## 6. リスク

- **CDN 404** — `Audio/SE/{name}.mp3` がリポジトリに存在しない場合 silent fail。 `playSe` の catch で握りつぶしてあるので無音 fallback。 リポジトリ側の存在確認は実走で
- **iOS Safari の autoplay** — Press Start で unlock するが、 ヒーロー modal の数秒滞在中に iOS が再ロックするケースは稀にあり。 SE 各 play で都度 catch してあるので落ちはしない
- **SE 連発 (= AoE で大量被弾、 大量 gem 拾い)** — 既存 throttle で抑止。 80-200ms の throttle で十分
- **BGM 音量** — 0.32 を仮値。 後続でユーザー設定 UI で調整できるよう `setBgmVolume` 公開済
- **clear 条件未実装** — `win.mp3` は実装に組み込むが trigger は無し。 後続 SPEC で Game Over の clear path を生やすときに即対応可能 (= reason="clear")
- **Press Start で unlock するが、 タイトル画面で iOS が再 sleep するシナリオ** → 起動から数秒以内にヒーロー pick まで進めば問題なし

## 7. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants SFX / BGM 定数追加、 audio.js に unlockAudio 追加、 main.js / battle/index.js / battle/enemies.js / battle/gems.js / battle/levelup.js / battle/gameover.js に hook 配線 |

## 8. 参考

- 既存 `js/audio.js` `startBgm` / `playSe` (= 流用)
- 既存 `js/constants.js` `audioUrl(relPath)` (= URL 解決ヘルパ)
- 音源リスト: https://github.com/bearko/mycryptoheroes/tree/main/Audio/SE
