// ============================================================
// bonds.js — 絆の報酬 (= SPEC-165 §6.3) を NORMAL でも効かせる
// ============================================================
//
// 試練を越えた相手との絆 (= mcs.story.bonds) で開くもの: 雷鼓 30% (= 信長)・ミッションの出し手の優先。
// 「解放済みの人を縛らない」: NORMAL をすでに遊べる人 (= mcs.played / mcs.easyCleared) は最初から全部開いている扱い。
// 絆の報酬は新しい人が順に手に入れるための鍵で、 すでに持っている人から取り上げない。

import { bondRewards, loadStory, STORY_STAGES } from "./story.js";
import { hasPlayed } from "./played.js";
import { hasClearedEasy } from "./easy.js";

/** 絆で開くものを持っているか (= "passive:thunder30" など。 NORMAL をすでに遊べる人は全部) */
export function bondUnlocked(key, { progress = loadStory(), veteran = hasPlayed() || hasClearedEasy() } = {}) {
  return veteran || bondRewards(progress).unlock.includes(key);
}

/** 絆を結んだ出し手の id (= ミッションの持ちかけで優先。 純関数) */
export function bondedGivers(progress = loadStory(), stages = STORY_STAGES) {
  return new Set(stages.filter((s) => s.bond && progress.bonds.includes(s.bond.who)).map((s) => s.bond.who));
}
