**Added Phase 0 (= Survival HUD spec)**
- `docs/specs/SPEC-004-survival-hud.md` 新規作成 (= Day N + HP/体温/食料 の 3 スタッツ + 1 tick = 1 sec の線形 decay + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-002 / SPEC-003 を Done に flip、 PR 番号も #2 / #4 で正、 SPEC-004 を Implementing として登録)

**Planned Phase 1 (= 実装)**
- `js/state.js` に `state.day` (= 1 開始) と `state.stats` / `state.statsMax` (= `{hp, temp, food}`) を追加
- `js/constants.js` に `STATS_INITIAL` / `STATS_MAX` / `STATS_DECAY_PER_TICK` を追加
- `js/survival.js` 新規 (= `tickStatsDecay` / `clampStats` / `getStatRatio` / `renderHud`)
- `js/main.js` の `onTick` に `tickStatsDecay()` + `renderHud()` 呼出を追加、 `advanceWeek` に `state.day++` を追加
- `index.html` の `<header>` と `<section.stage>` の間に `<section class="hud" id="hud">` を新設 (= Day + 3 bar)
- `data/i18n/ui.json` に `hud.day` / `hud.stats.{hp,temp,food}` を追加
- `css/base.css` に `--hp` / `--temp` / `--food` の 3 色変数追加、 `css/components.css` に `.hud` / `.hud__bar` 系を追加、 `css/responsive.css` で 640px 未満の折り返し対応
