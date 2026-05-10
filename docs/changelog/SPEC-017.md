**Added Phase 0 (= Sound Effects + BGM Wiring spec)**
- `docs/specs/SPEC-017-audio-and-bgm.md` 新規 (= タイトル click → tooldev、 戦闘 BGM pvp loop、 被弾 1_single_damage、 gem 拾得 crash、 LV up open_treasure、 武器 pick insp、 buff (回復以外) 4_buff、 回復 (Armor/Ramen) 3_heal_resurrection、 lose / win)
- `docs/specs/SPEC-INDEX.md`: SPEC-013〜SPEC-016 を Done (= マージ済 #15-#18) に flip、 SPEC-017 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `SFX.*` 9 パス + `BGM_BATTLE` 追加
- `js/audio.js`: `unlockAudio()` を新規 export (= 初回 user gesture で autoplay policy 解除)
- `js/main.js`: dismissTitle で `unlockAudio()`、 applyHeroPick で `tooldev.mp3`
- `js/battle/index.js`: startBattle 末尾で `pvp.mp3` BGM
- `js/battle/enemies.js`: 被弾時 `1_single_damage.mp3` (= 200ms throttle)
- `js/battle/gems.js`: 拾得時 `crash.mp3` (= 80ms throttle)
- `js/battle/levelup.js`: open 時 `open_treasure.mp3`、 applyPick で weapon=insp / heal=3_heal / その他 buff=4_buff
- `js/battle/gameover.js`: triggerGameOver(reason) で BGM 停止 + lose / win 分岐
