**Added Phase 0 (= VS HUD slim spec)**
- `docs/specs/SPEC-005-vs-hud-slim.md` 新規 (= 体温/食料 を撤去し HP のみ + XP バー + Lv 表示 + 経過時間 mm:ss、 ヴァンパイアサバイバーライクへの方向転換 prep)
- `docs/specs/SPEC-INDEX.md`: SPEC-004 を Done (#5) に flip、 SPEC-005 を Implementing として登録

**Planned Phase 1 (= 実装)**
- `js/state.js` から `state.day` / `state.stats.temp,food` / `state.statsMax.temp,food` を撤去、 `state.level=1` / `state.xp=0` / `state.xpToNext=5` / `state.elapsedTicks=0` を追加
- `js/constants.js`: `STATS_INITIAL` / `STATS_MAX` から temp/food を撤去、 `STATS_DECAY_PER_TICK.hp=0` (= idle decay 廃止)、 `XP_INITIAL` / `XP_TO_NEXT_INITIAL` / `LEVEL_INITIAL` 追加
- `js/survival.js`: `STAT_KEYS=["hp"]`、 `renderHud` を Level/Elapsed/HP/XP 4 セルに改修、 `formatElapsed` export
- `js/main.js`: `onTick` に `state.elapsedTicks++` 追加、 `advanceWeek` から `state.day++` 削除
- `index.html` HUD: `#hudLevel` + `#hudElapsed` + `#hudHp` + `#hudXp` (= temp/food 撤去)
- `data/i18n/ui.json`: `hud.level` / `hud.stats.xp` 追加、 `hud.day` / `hud.stats.temp` / `hud.stats.food` 撤去
- `css/base.css`: `--xp` 黄色変数追加
- `css/components.css`: `.hud__level` / `.hud__elapsed` / `.hud__bar[data-stat="xp"]` 追加、 temp/food 用セレクタ撤去
