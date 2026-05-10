---
id: SPEC-027
title: Clear Title on Win Conditions (= ボス撃破 / 5 分耐久 で 「クリア!」 表記)
status: Done
pr: 34
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-027 — Clear Title on Win Conditions

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ボスを倒したときと 5 分間生存した時はゲームオーバーではなくクリアの文言に差し替えをお願いします

SPEC-022 で既に勝利条件 (= ボス撃破 or 5 分経過) は `triggerGameOver("clear")` で trigger されているが、 モーダルのタイトルは常に `gameover.title` (= 「ゲームオーバー」) を表示していた。 結果ラベルを reason で分岐する。

## 2. ゴール

- 勝利条件 (= reason === "clear") のときモーダルタイトルを **「クリア!」 / 「Clear!」** に
- 敗北 (= reason !== "clear") は従来通り **「ゲームオーバー」 / 「Game Over」**
- 言語切替時にも reason を尊重 (= `applyDataI18n` の上書き後に再レンダ)

## 3. 設計

### 3.1 i18n (= `data/i18n/ui.json`)

```json
"gameover.titleClear": { "ja": "クリア!", "en": "Clear!" }
```

### 3.2 reason を保存 (= `js/battle/gameover.js`)

`triggerGameOver(reason)` で `state.lastRunStats.reason = reason` を持たせる:

```js
state.lastRunStats = {
  elapsed: state.elapsedTicks,
  level:   state.level,
  kills:   state.killCount,
  reason,
};
```

### 3.3 タイトル分岐 (= `_renderGameOverModal`)

```js
const titleEl = document.getElementById("gameOverTitle");
if (titleEl) {
  titleEl.textContent = (stats.reason === "clear")
    ? t("gameover.titleClear", "Clear!")
    : t("gameover.title",      "Game Over");
}
```

`onLangChange` ハンドラで modal 開放中なら `_renderGameOverModal` 再呼出 (= 既存 wire 済) → `applyDataI18n` の textContent 上書き後に正しいタイトルへ復元。

## 4. 受入基準

- [ ] HP 0 で死亡 → モーダルタイトル 「ゲームオーバー」 (= 既存挙動維持)
- [ ] **ボス撃破** → モーダルタイトル 「クリア!」 + win.mp3 (= 既存)
- [ ] **5 分経過** → モーダルタイトル 「クリア!」 + win.mp3
- [ ] クリアモーダル表示中に EN 切替 → 「Clear!」 に切り替わる (= 「Game Over」 に戻らない)
- [ ] リトライ → 次戦は title 初期化 (= modal hidden 化)、 死亡時は 「ゲームオーバー」 に戻る
- [ ] DevTools console エラー無し

## 5. リスク

- **`data-i18n="gameover.title"` の上書き** — `applyDataI18n` が title を強制書き換えるが、 `onLangChange` listener が後段で再レンダして reason 由来に上書きする (= setLang は applyDataI18n → listener の順、 既存の i18n.js コントラクトに沿う)
- **古いセッションの lastRunStats** — `reason` が無いランは `undefined` を `=== "clear"` で false 判定、 「ゲームオーバー」 表記にフォールバック

## 6. 参考

- `js/battle/gameover.js` (SPEC-009/017)
- `js/i18n.js` `setLang` の listener 発火順
- ユーザー指示: 「ボスを倒したときと 5 分間生存した時はゲームオーバーではなくクリアの文言に」
