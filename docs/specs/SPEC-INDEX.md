# SPEC Index — MyCryptoSurvivor

各 SPEC は `docs/specs/SPEC-NNN-<topic>.md` に置く。 ステータスは
`Draft / InReview / Approved / Implementing / Done / Cancelled` のいずれか。

| ID | タイトル | Status | Phase | 実装 PR |
|---|---|---|---|---|
| SPEC-001 | Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock) | Done | Phase 0 / Phase 1 | #1 (merged) |
| SPEC-002 | Hero Roster (= heroes.json + 10 体実データ + state.ownedHero) | Done | Phase 0 / Phase 1 | #2 (merged) |
| SPEC-003 | MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備) | Done | Phase 0 / Phase 1 | #4 (merged、 #3 は spec-002 枝に取り残されたため再 PR) |
| SPEC-004 | Survival HUD (= Day N + HP / 体温 / 食料 + tick decay) | Done | Phase 0 / Phase 1 | #5 (merged) |
| SPEC-005 | VS HUD slim (= HP のみ + XP + Lv、 体温/食料 撤去、 ヴァンパイアサバイバー方向に転換) | Done | Phase 0 / Phase 1 | #6 (merged) |
| SPEC-006 | Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従) | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-007 | Enemies + Hardcoded Weapon + XP Gems + Level Trigger (= VS core loop 完成) | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-008 | Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化) | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-009 | Game Over + Retry + Ranking Submit (= MVP 完了、 死んだら終わる + もう 1 回) | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-010 | Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-011 | Extension Schema Overhaul (17 系列 × 5 段階) + Buff Archetype | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-012 | 10 Weapon Archetype Behaviors (= radial / orbit / beam / placement / etc) | Done | Phase 0 / Phase 1 | #14 (merged via re-stack) |
| SPEC-013 | Hero Starter Weapon (= Lv.1 固定割当) + Picker Rules (= 重複なし / weapon ≥ 1) | Done | Phase 0 / Phase 1 | #15 (merged) |
| SPEC-014 | Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation | Done | Phase 0 / Phase 1 | #16 (merged) |
| SPEC-015 | Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave | Done | Phase 0 / Phase 1 | #17 (merged) |
| SPEC-016 | HP Bars + Damage Numbers + Hit Freeze | Done | Phase 0 / Phase 1 | #18 (merged) |
| SPEC-017 | Sound Effects + BGM Wiring | Implementing | Phase 0 / Phase 1 | #19 (open, base=main) |
| SPEC-018 | Extension Icon Mapping Fix (= 名前と icon の不一致解消) | Implementing | Phase 0 / Phase 1 | feat/spec-018-fix-extension-icon-mapping |

## 命名規則

- ファイル名: `SPEC-NNN-<kebab-topic>.md` (= 連番 3 桁 + 簡潔な topic)
- 連番は **欠番にしない** (= Cancelled も削除せず履歴として残す)
- Phase ラベルは SPEC タイトルに含める (= 実装フェーズが追える)

## 参考

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR の流れとテンプレート
- `docs/charters/PROJECT_CHARTER.md` — プロジェクトのゴール (= SPEC を起こすときの判断軸)
