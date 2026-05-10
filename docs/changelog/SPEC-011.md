**Added Phase 0 (= Extension Schema Overhaul 17×5 + Buff Archetype spec)**
- `docs/specs/SPEC-011-extension-tiers-and-buffs.md` 新規 (= 武器 10 系列 + 強化 7 系列 × 5 段階レアリティ。 ピックで tier 昇格 = 名前/スキル名/効果説明が変化。 Buff 7 種が即時効果。 武器固有挙動は SPEC-012 で扱う)
- `docs/specs/SPEC-INDEX.md`: SPEC-010 を `#11 (open)`、 SPEC-011 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `data/extensions.json` v2: 17 系列 × tierNames[5] / skillName / skillDescTpl / tierParams[5] / archetype / category
- `js/extensions.js`: ローダ更新、 `getTierName(ext, level, lang)` / `getSkillDesc(ext, level, lang)` / `getCategory(ext)` 追加
- `js/state.js`: `state.buffs = {hpMaxBonus, regenPerSec, speedMul, cdMul, dmgTakenMul, dmgMul, bulletCountBonus}`、 startBattle で reset
- `js/battle/buffs.js` 新規 (= applyBuff(extId, level) / tickRegen(dt))
- `js/battle/extensions-as-weapons.js`: weaponFromExt を tier params 駆動に
- `js/battle/levelup.js`: applyPick で weapon vs buff 分岐、 カード DOM に tier name / skill name / skill desc / icon を表示
- `js/battle/index.js`: RAF ループに tickRegen 追加、 startBattle で state.buffs reset
- `js/battle/player.js`: speedMul 適用
- `js/battle/weapons.js`: cdMul / dmgMul 適用
- `js/battle/enemies.js`: dmgTakenMul 適用
