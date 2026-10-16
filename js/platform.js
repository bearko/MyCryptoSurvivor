// ============================================================
// platform.js — bearko.games 共通基盤（トロフィー）への窓口 (= SPEC-039)
// ============================================================
//
// SDK（https://bearko.games/sdk/v1.js）が読めない・通信に失敗しても何もしない。
// ゲームの進行・pauseTime には触らない。ログイン状態は共通基盤が持つ（localStorage は使わない）。

/**
 * 終えたステージ（0 始まり）に対応するトロフィー ID。純関数 (= tests/platform.test.mjs)
 */
export function trophyIdsForStageEnd(stageIdx, stageCount) {
  const ids = [];
  if (stageIdx === 0) ids.push("survivor.stage1");
  if (stageCount > 0 && stageIdx === stageCount - 1) ids.push("survivor.clear");
  return ids;
}

const _sdk = () => (typeof window !== "undefined" ? window.BearkoGames : undefined);

export function initPlatform(version) {
  const bg = _sdk();
  if (!bg) return;
  try {
    Promise.resolve(bg.init({ game: "survivor", version })).catch((e) => console.warn("[platform] init", e));
  } catch (e) {
    console.warn("[platform] init", e);
  }
}

export function reportStageEnd(stageIdx, stageCount) {
  const bg = _sdk();
  if (!bg) return;
  for (const id of trophyIdsForStageEnd(stageIdx, stageCount)) {
    try {
      Promise.resolve(bg.unlockTrophy(id))
        .then((r) => { if (!r || !r.ok) console.warn("[platform] trophy", id, r && r.error); })
        .catch((e) => console.warn("[platform] trophy", id, e));
    } catch (e) {
      console.warn("[platform] trophy", id, e);
    }
  }
}
