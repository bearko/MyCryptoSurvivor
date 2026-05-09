# SPEC Index — MyCryptoSurvivor

各 SPEC は `docs/specs/SPEC-NNN-<topic>.md` に置く。 ステータスは
`Draft / InReview / Approved / Implementing / Done / Cancelled` のいずれか。

| ID | タイトル | Status | Phase | 実装 PR |
|---|---|---|---|---|
| SPEC-001 | Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock) | Done | Phase 0 / Phase 1 | #1 (merged) |
| SPEC-002 | Hero Roster (= heroes.json + 10 体実データ + state.ownedHero) | Implementing | Phase 0 / Phase 1 | feat/spec-002-hero-roster |

## 命名規則

- ファイル名: `SPEC-NNN-<kebab-topic>.md` (= 連番 3 桁 + 簡潔な topic)
- 連番は **欠番にしない** (= Cancelled も削除せず履歴として残す)
- Phase ラベルは SPEC タイトルに含める (= 実装フェーズが追える)

## 参考

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR の流れとテンプレート
- `docs/charters/PROJECT_CHARTER.md` — プロジェクトのゴール (= SPEC を起こすときの判断軸)
