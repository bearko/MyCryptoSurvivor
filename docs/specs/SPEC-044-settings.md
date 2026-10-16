---
id: SPEC-044
title: Settings — BGM/SE Volume, Reduce Effects, Language, Auto-Pause on Tab Switch
status: Done
pr: 62
phase: v1.0
kind: Added
---

# SPEC-044 — 設定：BGM・SE の音量とミュート、演出を減らす、タブを離れたら一時停止

- **Status**: Done
- **Issue**: #55（親 #51 v1.0 仕上げ）
- **関連**: SPEC-017（音）、SPEC-034（メニュー）、SPEC-043（`prefersReducedMotion`）

## 1. 背景 / 課題

- 音を消す・小さくする手段がない（電車の中で開くと BGM がいきなり鳴る）
- 別のタブに移っても戦闘が進み、BGM も鳴り続ける（戻ると倒れている）
- 言語の切り替えが戦闘中のヘッダーの「JP/EN」に常に出ていて、場所をとる
- SE は鳴らすたびに `new Audio()` を作っていて、連打で読み込みが重なる

## 2. ゴール

- タイトルとメニューから開ける「設定」：BGM の音量、SE の音量（0 ＝ ミュート）、演出を減らす、言語
- 設定は `mcs.settings` に保存し、次に開いたときも同じ
- タブを離れたら、戦闘中ならメニューを開いて止め、BGM も止める。戻ると BGM だけ再開（戦闘はメニューを閉じて再開）
- SE は同じ音を使い回す（読み込みは 1 回）

## 3. 非ゴール

- 音そのものの差し替え・追加（ヒット音などは SPEC-045）
- キーの割り当ての変更

## 4. ユーザー体験

```
┌──────────────── 設定 ──── ✕ ┐
│ 🎵 BGM      ━━━━━●━━━  80% │
│ 🔊 効果音    ━━━━━━━●━ 100% │
│ ✨ 演出を減らす        [ OFF ] │  揺れ・粒・画面の光を止める
│ 🌐 言語     [日本語][English] │
│               [ 閉じる ]       │
└──────────────────────────┘
```

- 入口：タイトルの「設定」、メニューの「設定」、戦闘中のヘッダーの ⚙（「JP/EN」と置き換え）
- スライダーを動かすと、その場で BGM の音量が変わる。SE は離したときに 1 回鳴らして確かめられる
- 0% は「OFF」と表示。BGM が 0% のときは BGM を読み込まない
- 開いている間は戦闘を止める。✕・閉じる・背景・Esc で閉じる
- OS の reduced-motion が ON なら「演出を減らす」は ON 扱い（スイッチは ON で固定し、そう書く）

## 5. 技術設計

### 5.1 データ

`localStorage["mcs.settings"]` = `{ "v": 1, "bgm": 0.0〜1.0, "se": 0.0〜1.0, "reduceFx": bool }`

- 既定：`bgm 1.0`、`se 1.0`、`reduceFx false`（今と同じ音量）
- 音量は「呼び出し側の音量 × 設定」。100% のとき今と同じ大きさ

### 5.2 関数

| ファイル | 関数 | 役割 |
|---|---|---|
| `js/settings.js`（新規） | `normalizeSettings(raw)` | 純関数。壊れた値・範囲外を既定値と 0〜1 に直す |
| | `getSettings()` / `updateSettings(patch)` | 読み書き（保存と `onSettingsChange` の通知） |
| | `mixVolume(base, level)` | 純関数。`base × level` を 0〜1 に |
| `js/audio.js` | `applyAudioSettings()` | 鳴っている BGM の音量を直す。0 なら止め、0 から上げたら鳴らし直す |
| | `playSe` | 設定が 0 なら鳴らさない。パスごとに 1 つ読み込んだ `Audio` を `cloneNode()` で鳴らす |
| | `suspendBgm()` / `resumeBgm()` | タブを離れた・戻ったとき |
| `js/motion.js` | `prefersReducedMotion()` | OS の設定 **または** 「演出を減らす」 |
| `js/settings-ui.js`（新規） | `installSettingsUI()` / `openSettings()` / `closeSettings()` | モーダル。`pauseTime` / `resumeTime` は対 |
| `js/main.js` | `visibilitychange` | 隠れたら：戦闘中で止まっていなければ `openMenu()`、`suspendBgm()`。見えたら `resumeBgm()` |

## 6. 受け入れ基準

- [x] BGM 0% で BGM が止まり、上げると鳴り直す。リロードしても 0% のまま
- [x] SE 0% で効果音が鳴らない
- [x] 「演出を減らす」で `prefersReducedMotion()` が true（SPEC-045 の揺れ・粒が止まる）
- [x] 戦闘中にタブを隠すとメニューが開いて止まる
- [x] 設定・メニュー・ヘルプを開いて閉じても、`pauseFlags` が 0 に戻る

## 7. テスト

- `node --test tests/settings.test.mjs`：`normalizeSettings`（既定値・範囲外・壊れた JSON 相当）、`mixVolume`
- 手元のブラウザで：スライダーで BGM の音量が変わる・保存される、タブを隠すとメニューが開く（`document.hidden` を差し替えて `visibilitychange` を送る）
