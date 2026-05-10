**Added Phase 0 (= Game Over + Retry + Ranking Submit spec)**
- `docs/specs/SPEC-009-game-over.md` 新規 (= HP 0 で Game Over モーダル + 経過時間 / Lv / 撃破数 表示 + プレイヤー名入力 + 既存 submitScore() 経由でランキング送信 + リトライボタン)
- `docs/specs/SPEC-INDEX.md`: SPEC-008 を `#9 (open)` に、 SPEC-009 を Implementing 登録
- これにより VS-like MVP 完了 (= 「死んだら終わる」 + 「もう 1 回」)

**Planned Phase 1 (= 実装)**
- `js/state.js`: `state.killCount` / `state.battle.gameOver` / `state.lastRunStats` 追加
- `js/battle/projectiles.js`: 敵撃破時 `state.killCount++`
- `js/battle/enemies.js`: 接触ダメージ後 HP <= 0 で `triggerGameOver()`
- `js/battle/gameover.js` 新規 (= triggerGameOver / applyRetry / モーダル制御 / submit / lang change)
- `js/battle/index.js`: startBattle で killCount / gameOver / lastRunStats を reset
- `index.html`: `#gameOverModal` 追加
- `data/i18n/ui.json`: `gameover.*` 11 キー追加
- `css/components.css`: `.gameover-modal*` / `.gameover-form*` / `.gameover-stat`
