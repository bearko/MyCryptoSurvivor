# SPEC Index — MyCryptoSurvivor

各 SPEC は `docs/specs/SPEC-NNN-<topic>.md` に置く。 ステータスは
`Draft / InReview / Approved / Implementing / Done / Cancelled` のいずれか。

<!-- BEGIN AUTO-INDEX -->
| ID | タイトル | Status | Phase | 実装 PR |
|---|---|---|---|---|
| SPEC-001 | Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock) | Done | Phase 0 / Phase 1 | #1 (merged) |
| SPEC-002 | Hero Roster (= heroes.json + 10 体実データ + state.ownedHero) | Done | Phase 0 / Phase 1 | #2 (merged) |
| SPEC-003 | MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備) | Done | Phase 0 / Phase 1 | #4 (merged) |
| SPEC-004 | Survival HUD (= Day N + HP / 体温 / 食料 + tick decay) | Done | Phase 0 / Phase 1 | #5 (merged) |
| SPEC-005 | VS HUD slim (= HP のみ + XP + Lv、 体温/食料 撤去、 サバイバー系アクション方向に転換) | Done | Phase 0 / Phase 1 | #6 (merged) |
| SPEC-006 | Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従) | Done | Phase 0 / Phase 1 | #7 (merged) |
| SPEC-007 | Enemies + Hardcoded Weapon + XP Gems + Level Trigger (= VS core loop 完成) | Done | Phase 0 / Phase 1 | #8 (merged) |
| SPEC-008 | Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化) | Done | Phase 0 / Phase 1 | #9 (merged) |
| SPEC-009 | Game Over + Retry + Ranking Submit (= MVP 完了、 死んだら終わる + もう 1 回) | Done | Phase 0 / Phase 1 | #10 (merged) |
| SPEC-010 | Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card | Done | Phase 0 / Phase 1 | #11 (merged) |
| SPEC-011 | Extension Schema Overhaul (17 系列 × 5 段階) + Buff Archetype | Done | Phase 0 / Phase 1 | #12 (merged) |
| SPEC-012 | 10 Weapon Archetype Behaviors (= radial / orbit / beam / placement / etc) | Done | Phase 0 / Phase 1 | #13 (merged) |
| SPEC-013 | Hero Starter Weapon (= Lv.1 固定割当) + Picker Rules (= 重複なし / weapon ≥ 1) | Done | Phase 0 / Phase 1 | #15 (merged) |
| SPEC-014 | Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation | Done | Phase 0 / Phase 1 | #16 (merged) |
| SPEC-015 | Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave | Done | Phase 0 / Phase 1 | #17 (merged) |
| SPEC-016 | HP Bars + Damage Numbers + Hit Freeze | Done | Phase 0 / Phase 1 | #18 (merged) |
| SPEC-017 | Sound Effects + BGM Wiring | Done | Phase 0 / Phase 1 | #19 (merged) |
| SPEC-018 | Extension Icon Mapping Fix (= 名前と icon の不一致解消) | Done | Phase 0 / Phase 1 | #21 (merged) |
| SPEC-019 | 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon | Done | Phase 0 / Phase 1 | #23 (merged) |
| SPEC-020 | Extension Icon Fix (= ユーザー指定 MCH ID で全系列を完全一致) | Done | Phase 0 / Phase 1 | #24 (merged) |
| SPEC-021 | Per-Tier Extension Icons + Names (= MCH 公式準拠、 1xxx → 5xxx) | Done | Phase 0 / Phase 1 | #25 (merged) |
| SPEC-022 | Enemy Variety + Time-Based Waves + Deep Yoshka Boss | Done | Phase 0 / Phase 1 | #28 (merged) |
| SPEC-023 | Picker Stock Limit (= 武器 5 / 強化 5) + Reroll (= 1戦 2回) | Done | Phase 0 / Phase 1 | #29 (merged) |
| SPEC-024 | Picker Card Category Label + Lv.1 Effect Audit (= Oriflamme +0 → +1) | Done | Phase 0 / Phase 1 | #31 (merged) |
| SPEC-025 | Fix Audio Paths (= MCH カタログ実体に整合、 404 → 200) | Done | Phase 0 / Phase 1 | #32 (merged) |
| SPEC-026 | Balance Tuning + Bounded Stage with Background (= XP / Gyoku / 1001.png + dim overlay) | Done | Phase 0 / Phase 1 | #33 (merged) |
| SPEC-027 | Clear Title on Win Conditions (= ボス撃破 / 5 分耐久 で 「クリア!」 表記) | Done | Phase 0 / Phase 1 | #34 (merged) |
| SPEC-028 | Orbit Redistribution + Per-Level Size Growth (= Book/Blade 等間隔 + tier icon swap + Lv 連動拡大) | Done | Phase 0 / Phase 1 | #35 (merged) |
| SPEC-029 | Logo Image + OG Thumbnail (= タイトル/スプラッシュ画像化 + X/OGP サムネ) | Done | Phase 0 / Phase 1 | #36 (merged) |
| SPEC-030 | Three-Stage System (= node : アバカス / ホレリス / トロイ + ファオ / yamap ボス) | Done | Phase 0 / Phase 1 | #38 (merged) |
| SPEC-031 | Pierce + LaserGun Fix + Pierrot AoE + Horse Tune + Gunbai + Header Date Removal | Done | Phase 0 / Phase 1 | #39 (merged) |
| SPEC-032 | Changelog Fragments + Auto-Generated SPEC-INDEX | Done | Phase 0 / Phase 1 | #40 (merged) |
| SPEC-033 | Rare Enemies + Magic Card + Activity Report + Stage 2/3 Boss Clear Fix | Done | Phase 0 / Phase 1 | #41 (merged) |
| SPEC-034 | Rare Size + Weapon Growth × 2 + Reroll 3 + Pause Menu | Done | Phase 0 / Phase 1 | #42 (merged) |
| SPEC-035 | Ranking — GAS Backend + UI | Done | Phase 0 / Phase 1 | #43 (merged) |
| SPEC-036 | GAS Sample Data Seed + Re-apply Default API URL | Done | Phase 0 / Phase 1 | #44 (merged) |
| SPEC-037 | Game Modes — NORMAL / ABSOLUTE Regulation | Done | Phase 0 / Phase 1 | #46 (merged) |
| SPEC-038 | Activity Report Icon Layout + Anonymous Default Name | Done | Phase 0 / Phase 1 | #47 (merged) |
| SPEC-039 | bearko.games Platform Trophies | Done | Phase 3 | #48 (merged) |
| SPEC-040 | bearko.games Platform RTA | Done | Phase 3 | #49 (merged) |
| SPEC-041 | bearko.games Platform Total Score | Done | Phase 3 | #50 (merged) |
| SPEC-042 | How to Play — Help Rewrite + First-Run Coach Hint | Done | v1.0 | #60 (merged) |
| SPEC-043 | UI Foundation — Tokens, Fonts, Buttons, Modals, Safe Area, Reduced Motion | Done | v1.0 | #61 (merged) |
| SPEC-044 | Settings — BGM/SE Volume, Reduce Effects, Language, Auto-Pause on Tab Switch | Done | v1.0 | #62 (merged) |
| SPEC-045 | Battle Feel — Shake, Hurt Flash, Kill Burst, Boss Warning, Kill Counter | Done | v1.0 | #63 (merged) |
| SPEC-046 | Result Reveal — Stage Intro, Stage Clear, Game Over, Activity Report | Done | v1.0 | #64 (merged) |
| SPEC-047 | v1.0 Release — Version, Changelog Releases, Icons, Manifest, OGP | Done | v1.0 | feat/spec-047-v1-release (merged) |
<!-- END AUTO-INDEX -->

## 命名規則

- ファイル名: `SPEC-NNN-<kebab-topic>.md` (= 連番 3 桁 + 簡潔な topic)
- 連番は **欠番にしない** (= Cancelled も削除せず履歴として残す)
- Phase ラベルは SPEC タイトルに含める (= 実装フェーズが追える)

## 参考

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR の流れとテンプレート
- `docs/charters/PROJECT_CHARTER.md` — プロジェクトのゴール (= SPEC を起こすときの判断軸)

