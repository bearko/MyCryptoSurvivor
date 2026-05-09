# SPEC Index — MyCryptoSurvivor

各 SPEC は `docs/specs/SPEC-NNN-<topic>.md` に置く。 ステータスは
`Draft / InReview / Approved / Implementing / Done / Cancelled` のいずれか。

| ID | タイトル | Status | Phase | 実装 PR |
|---|---|---|---|---|
| SPEC-001 | Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock) | Done | Phase 0 / Phase 1 | #1 (merged) |
| SPEC-002 | Hero Roster (= heroes.json + 10 体実データ + state.ownedHero) | Done | Phase 0 / Phase 1 | #2 (merged) |
| SPEC-003 | MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備) | Done | Phase 0 / Phase 1 | #4 (merged、 #3 は spec-002 枝に取り残されたため再 PR) |
| SPEC-004 | Survival HUD (= Day N + HP / 体温 / 食料 + tick decay) | Done | Phase 0 / Phase 1 | #5 (merged) |
| SPEC-005 | VS HUD slim (= HP のみ + XP + Lv、 体温/食料 撤去、 ヴァンパイアサバイバー方向に転換) | Implementing | Phase 0 / Phase 1 | #6 (open) |
| SPEC-006 | Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従) | Implementing | Phase 0 / Phase 1 | #7 (open, stacked on SPEC-005) |
| SPEC-007 | Enemies + Hardcoded Weapon + XP Gems + Level Trigger (= VS core loop 完成) | Implementing | Phase 0 / Phase 1 | #8 (open, stacked on SPEC-006) |
| SPEC-008 | Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化) | Implementing | Phase 0 / Phase 1 | #9 (open, stacked on SPEC-007) |
| SPEC-009 | Game Over + Retry + Ranking Submit (= MVP 完了、 死んだら終わる + もう 1 回) | Implementing | Phase 0 / Phase 1 | #10 (open, stacked on SPEC-008) |
| SPEC-010 | Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card | Implementing | Phase 0 / Phase 1 | #11 (open, stacked on SPEC-009) |
| SPEC-011 | Extension Schema Overhaul (17 系列 × 5 段階) + Buff Archetype | Implementing | Phase 0 / Phase 1 | #12 (open, stacked on SPEC-010) |
| SPEC-012 | 10 Weapon Archetype Behaviors (= radial / orbit / beam / placement / etc) | Implementing | Phase 0 / Phase 1 | #13 (open, also bundled in re-stack PR #14) |
| SPEC-013 | Hero Starter Weapon (= Lv.1 固定割当) + Picker Rules (= 重複なし / weapon ≥ 1) | Implementing | Phase 0 / Phase 1 | #15 (open, base=main) |
| SPEC-014 | Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation | Implementing | Phase 0 / Phase 1 | #16 (open, base=main) |
| SPEC-015 | Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave | Implementing | Phase 0 / Phase 1 | #17 (open, base=main) |
| SPEC-016 | HP Bars + Damage Numbers + Hit Freeze | Implementing | Phase 0 / Phase 1 | feat/spec-016-hp-bars-and-damage-feedback |

## 命名規則

- ファイル名: `SPEC-NNN-<kebab-topic>.md` (= 連番 3 桁 + 簡潔な topic)
- 連番は **欠番にしない** (= Cancelled も削除せず履歴として残す)
- Phase ラベルは SPEC タイトルに含める (= 実装フェーズが追える)

## 参考

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR の流れとテンプレート
- `docs/charters/PROJECT_CHARTER.md` — プロジェクトのゴール (= SPEC を起こすときの判断軸)
