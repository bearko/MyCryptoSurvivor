# SPEC-009 — Game Over + Retry + Ranking Submit

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-008 (= extensions-as-weapons、 stack 上)

## 1. 背景 / 課題

SPEC-007/008 でゲームループはほぼ完成。 ただし **HP 0 でも止まらない** ので、 失敗判定もリプレイもない。
本 SPEC で:

- HP 0 検出 → **Game Over オーバーレイ**
- スコア (= 経過時間 / Level / 撃破数) を表示
- **プレイヤー名入力 + ranking 送信** (= 既存 `submitScore()` 流用)
- **リトライボタン** で startBattle 再呼出 (= 同じヒーロー)

これで MVP のサバイバーゲーム体験が完成する (= 「死んだら終わる」 + 「もう 1 回」)。

## 2. ゴール

- `state.killCount = 0` (= top-level、 startBattle で reset)
- 投射体が敵を倒すたびに `state.killCount++`
- `state.battle.gameOver = false` (= startBattle で reset)
- HP <= 0 検出 (= 接触 / その他経路) で `triggerGameOver()`
- triggerGameOver: pauseTime + Game Over modal 表示
- modal 中身: タイトル "ゲームオーバー" + 経過時間 (mm:ss) + Lv. N + 撃破数 + プレイヤー名入力 + 送信ボタン + リトライボタン
- 送信は `submitScore({ playerName, score, level, kills, elapsed, version, hero })` 形で投げる
  - score = `state.elapsedTicks` (= 何秒生き延びたか)
- ranking API 未設定なら送信ボタンを disable + ヒント表示
- リトライ: modal 閉 + resumeTime + `startBattle(state.ownedHero)` で全リセット
- 多重 trigger 防止: gameOver true 中は再度 trigger しない
- ja/en 完全対応
- pauseFlags 不変条件維持 (= 開時 +1、 閉時 -1)
- 既存 levelup modal が同時に開いている可能性 (= LV up 直後に死亡など) → gameOver が優先

## 3. 非ゴール

- ランキング表示画面 (= 「過去のスコア閲覧」、 別 SPEC)
- 「死亡時の演出」 アニメーション
- 死亡原因の表示 (= "Killed by Enemy" 等)
- セーブ / ロード (= 別 SPEC)
- マルチステージ / 周回 (= 別 SPEC、 現状は 1 マップ無限)
- 死亡前のラスト 1 秒 slow-motion / freeze (= 演出)

## 4. ユーザー体験

1. 敵に何度か触れて HP がゼロに → 一瞬で **Game Over** オーバーレイ
2. オーバーレイに表示:
   ```
   ┌──────────────────────────────┐
   │     ゲームオーバー            │
   │                              │
   │   経過時間: 02:34             │
   │   Lv.: 5                     │
   │   撃破数: 87                  │
   │                              │
   │   [プレイヤー名: ____________]  │
   │   [ランキングに送信]           │
   │                              │
   │   [リトライ]                   │
   └──────────────────────────────┘
   ```
3. プレイヤー名 → 既存 localStorage から prefill
4. 送信 → "送信中..." → 成功なら "送信完了"、 失敗ならエラー
5. リトライ → モーダル閉じ → starter pick → 戦闘再開
6. ranking API 未設定なら送信ボタン disable + 「ランキング API 未設定」 表示

## 5. 技術設計

### 5.1 state 拡張

```js
// state.js
state.killCount = 0;          // 現走の撃破数 (= startBattle で reset)
state.battle.gameOver = false;
state.lastRunStats = null;    // {elapsed, level, kills} (= モーダルに表示する snapshot)
```

### 5.2 撃破カウント

`projectiles.js` の hit 内 `if (e.hp <= 0) { spawnGem; splice; }` の直前で `state.killCount++`。

### 5.3 Game Over trigger

`enemies.js` の接触ダメージ後で:
```js
if (state.stats.hp <= 0 && !state.battle.gameOver) {
  triggerGameOver();
}
```

`triggerGameOver()` は新規 `js/battle/gameover.js` に:
```js
import { state, pauseTime, resumeTime } from "../state.js";
import { startBattle } from "./index.js";

export function triggerGameOver() {
  if (state.battle.gameOver) return;
  state.battle.gameOver = true;
  state.lastRunStats = {
    elapsed: state.elapsedTicks,
    level:   state.level,
    kills:   state.killCount,
  };
  pauseTime();
  renderGameOverModal();
  document.getElementById("gameOverModal")?.classList.remove("hidden");
}

export function applyRetry() {
  document.getElementById("gameOverModal")?.classList.add("hidden");
  resumeTime();
  startBattle(state.ownedHero);   // = 全 reset
}
```

### 5.4 Game Over の RAF ループ挙動

`battle/index.js` の `_loop` で:
- gameOver 中も入力 / 武器 / 投射体 tick は **skip** (= pauseFlags +1 によりすでに skip 済)
- 描画は continue (= フリーズ画面が見える)

つまり pauseFlags ガードに任せる。 追加コードなし。

### 5.5 modal DOM (= index.html)

```html
<div id="gameOverModal" class="gameover-modal hidden" role="dialog" aria-modal="true"
     aria-labelledby="gameOverTitle">
  <div class="gameover-modal__card">
    <h2 class="gameover-modal__title" id="gameOverTitle" data-i18n="gameover.title">ゲームオーバー</h2>
    <div class="gameover-modal__stats">
      <div class="gameover-stat" id="gameOverElapsed"></div>
      <div class="gameover-stat" id="gameOverLevel"></div>
      <div class="gameover-stat" id="gameOverKills"></div>
    </div>
    <div class="gameover-modal__form">
      <label class="gameover-form__label" for="gameOverName" data-i18n="gameover.namelabel">プレイヤー名</label>
      <input class="gameover-form__input" id="gameOverName" type="text" maxlength="30" autocomplete="off" />
      <button class="btn btn--secondary" id="gameOverSubmit" data-i18n="gameover.submit">ランキングに送信</button>
      <p class="gameover-form__msg" id="gameOverMsg" aria-live="polite"></p>
    </div>
    <button class="btn gameover-modal__retry" id="gameOverRetry" data-i18n="gameover.retry">リトライ</button>
  </div>
</div>
```

### 5.6 modal レンダ

```js
import { t, tpl, getLang, onLangChange } from "../i18n.js";
import { localizedHeroName } from "../heroes.js";
import { getPlayerName, setPlayerName, submitScore, getRankingApiUrl } from "../ranking-client.js";
import { APP_VERSION } from "../constants.js";
import { formatElapsed } from "../survival.js";

let _wired = false;

function renderGameOverModal() {
  const stats = state.lastRunStats;
  if (!stats) return;
  $("#gameOverElapsed").textContent = tpl(t("gameover.elapsed","Time: {time}"), { time: formatElapsed(stats.elapsed) });
  $("#gameOverLevel").textContent   = tpl(t("gameover.level",  "Lv.{n}"),       { n: String(stats.level) });
  $("#gameOverKills").textContent   = tpl(t("gameover.kills",  "Kills: {n}"),   { n: String(stats.kills) });
  $("#gameOverName").value           = getPlayerName();
  const submitBtn = $("#gameOverSubmit");
  const noApi = !getRankingApiUrl();
  submitBtn.disabled = noApi;
  $("#gameOverMsg").textContent = noApi ? t("gameover.noApi","Ranking API not configured") : "";
}
```

`_wireOnce()` 初回呼出で:
- `submitBtn click` → setPlayerName + submitScore + UI 更新
- `retryBtn click` → applyRetry()
- `onLangChange` → renderGameOverModal (= 再描画)

### 5.7 i18n キー

```json
"gameover.title":     { "ja": "ゲームオーバー",       "en": "Game Over" },
"gameover.elapsed":   { "ja": "経過時間: {time}",     "en": "Time: {time}" },
"gameover.level":     { "ja": "Lv.: {n}",             "en": "Lv.: {n}" },
"gameover.kills":     { "ja": "撃破数: {n}",          "en": "Kills: {n}" },
"gameover.namelabel": { "ja": "プレイヤー名",         "en": "Player Name" },
"gameover.submit":    { "ja": "ランキングに送信",     "en": "Submit Score" },
"gameover.submitting":{ "ja": "送信中…",              "en": "Submitting…" },
"gameover.submitOk":  { "ja": "送信完了",             "en": "Submitted!" },
"gameover.submitFail":{ "ja": "送信失敗: {err}",      "en": "Submit failed: {err}" },
"gameover.retry":     { "ja": "リトライ",             "en": "Retry" },
"gameover.noApi":     { "ja": "ランキング API 未設定", "en": "Ranking API not configured" }
```

### 5.8 送信 payload

```js
{
  playerName: <input>,
  score:      stats.elapsed,        // = 何秒生き延びたか
  level:      stats.level,
  kills:      stats.kills,
  hero:       state.ownedHero?.name?.[lang] ?? state.ownedHero?.name?.ja,
  faction:    state.ownedHero?.faction,
  version:    APP_VERSION,
}
```

### 5.9 startBattle の改修

`battle/index.js`:
```js
state.killCount = 0;
state.battle.gameOver = false;
state.lastRunStats = null;
```

### 5.10 リトライ挙動の循環依存

`gameover.js` が `battle/index.js#startBattle` を import → `battle/index.js` が import の chain で gameover を import しない (= levelup から呼ぶ paths のみ)。 直接 cycle なし。

念のため: `enemies.js` から `triggerGameOver` を import する。 こちらも cycle なし (= enemies.js → gameover.js → index.js → enemies.js？ 確認: index.js は enemies.js を import するが、 enemies.js は index.js を import しない、 OK)。

→ 実際には `gameover.js` 内で `startBattle` を import すると `gameover.js → index.js → enemies.js → gameover.js` の循環。 これは ES modules では import bindings になるので解決可能だが、 念のため retry 時の startBattle 呼出を遅延 (= setTimeout 0 or 直接 window 経由) で回避。

→ 現実的解: `gameover.js` には retry のロジックだけ書き、 実際の startBattle 呼出は `battle/index.js` が export した `restartBattle()` 関数に委譲。 同じく循環。 むしろ `import { startBattle } from "./index.js"` のままでも ESM は遅延束縛なので動く。 試してダメだったら queueMicrotask で延期。

簡便策: gameover.js は startBattle を **動的 import**:
```js
export async function applyRetry() {
  document.getElementById("gameOverModal")?.classList.add("hidden");
  resumeTime();
  const m = await import("./index.js");
  m.startBattle(state.ownedHero);
}
```

これで循環時も deferred resolution できる。

## 6. CSS

```css
.gameover-modal { position: fixed; inset: 0; z-index: 330;
  background: rgba(15, 12, 22, 0.95);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
  animation: modal-fade-in 0.2s ease;
}
.gameover-modal.hidden { display: none !important; }
.gameover-modal__card {
  width: 100%; max-width: 400px;
  background: linear-gradient(180deg, #2c2440 0%, var(--panel) 100%);
  border: 2px solid var(--ifrit, #e76060);
  border-radius: 14px;
  padding: 1.2rem 1.1rem;
  display: flex; flex-direction: column;
  gap: 1rem;
  text-align: center;
}
.gameover-modal__title { margin: 0; color: var(--ifrit, #e76060); font-size: 1.4rem; letter-spacing: 0.1em; }
.gameover-modal__stats { display: flex; flex-direction: column; gap: 0.2rem; color: var(--text); font-size: 0.95rem; }
.gameover-stat { font-variant-numeric: tabular-nums; }
.gameover-modal__form { display: flex; flex-direction: column; gap: 0.5rem; }
.gameover-form__label { color: var(--muted); font-size: 0.78rem; text-align: left; }
.gameover-form__input {
  appearance: none; background: var(--panel-2); color: var(--text);
  border: 1px solid var(--border); border-radius: 6px;
  padding: 0.5rem 0.7rem; font-size: 0.95rem;
}
.gameover-form__input:focus { outline: 2px solid var(--accent); }
.gameover-form__msg { margin: 0; color: var(--muted); font-size: 0.78rem; min-height: 1em; }
.gameover-modal__retry { margin-top: 0.5rem; }
```

## 7. 受入基準

- [ ] 敵接触で HP 0 → Game Over モーダルが即時開く
- [ ] モーダルに 経過時間 / Lv / 撃破数 が正しく表示
- [ ] プレイヤー名が localStorage 既値で prefill
- [ ] ranking API 未設定なら送信ボタン disable + 「ランキング API 未設定」 表示
- [ ] ranking API 設定済 (= localStorage に URL を入れる) なら送信動作 → 「送信完了」 か エラー表示
- [ ] リトライボタン → モーダル閉 → starter pick モーダル → 新しい戦闘 (= killCount 0 / Lv 1 / HP 100 / 経過 0)
- [ ] 多重 trigger なし (= HP 0 が連続発火しても 1 回だけ開く)
- [ ] JP/EN 切替で全テキスト追従
- [ ] モバイル幅で modal 全要素が縦並びで操作可
- [ ] DevTools console エラー無し
- [ ] DevTools `__state.killCount` でリアルタイム確認可

## 8. リスク・懸念

- **送信 CORS** — `ranking-client.js` 既存実装で text/plain 投げで preflight 回避済み
- **循環 import** — 動的 import で回避
- **Game Over 中の levelup modal** — 同 frame で LV up と death が起きうる。 gameOver が pauseFlags +1 すれば levelup の queue は走らないが、 既に開いていた modal は残る → triggerGameOver で hidden を強制
- **リトライ後の hero 維持** — `state.ownedHero` は startBattle 内では弄らない (= ヒーロー再選不要)
- **リトライ後の killCount / lastRunStats reset** — startBattle で扱う
- **送信ボタン連打** — 送信中は disable し loading text に変える
- **ranking API URL を localStorage で設定する手段** — DevTools コンソールから `localStorage.setItem("mcs.rankingApiUrl", "...")`、 SPEC-010 以降で UI 化候補

## 9. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | state 拡張 / projectiles.js kill 加算 / enemies.js gameOver trigger / battle/gameover.js 新規 / index.html / i18n / css / startBattle reset |

## 10. 参考

- `js/ranking-client.js` (= submitScore / getPlayerName / getRankingApiUrl / setPlayerName)
- `js/constants.js` `APP_VERSION`
- 既存 hero / levelup modal の構造
- VS の game over UX
