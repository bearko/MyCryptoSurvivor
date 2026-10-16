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

// ============================================================
// SPEC-040: RTA (= 共通基盤の SDK が時間を計る。 公式タイムはサーバーの受信時刻の差)
// ============================================================
export const RTA_REGULATION = "survivor-normal";

/** RTA を出せるか (= SDK が読めたときだけ。 ローカルで開いたときなどは RTA の card を隠す) */
export function isRtaAvailable() {
  const bg = _sdk();
  return !!(bg && bg.rta && typeof bg.rta.start === "function");
}

/**
 * 終えたステージ（0 始まり）に対応する RTA の区切り ID。純関数 (= tests/platform.test.mjs)
 * 最終ステージは "clear"、 それ以外は "stage1" / "stage2" …
 */
export function rtaCheckpointForStageEnd(stageIdx, stageCount) {
  if (!(stageCount > 0) || stageIdx < 0 || stageIdx >= stageCount) return null;
  return stageIdx === stageCount - 1 ? "clear" : `stage${stageIdx + 1}`;
}

function _rtaCall(name, fn) {
  const bg = _sdk();
  if (!bg || !bg.rta) return;
  try {
    Promise.resolve(fn(bg.rta))
      .then((r) => { if (r && r.ok === false) console.warn("[platform] rta", name, r.error); })
      .catch((e) => console.warn("[platform] rta", name, e));
  } catch (e) {
    console.warn("[platform] rta", name, e);
  }
}

/** ステージ 1 が始まったとき (= startBattle で stage idx 0)。 前の計測は SDK が中断にする */
export function startRtaRun() {
  // 経過時間の表示は HUD (= ヘッダー + Lv / HP / XP) のすぐ下に出す
  const hud = typeof document !== "undefined" ? document.getElementById("hud") : null;
  const timerOffset = hud ? Math.round(hud.getBoundingClientRect().bottom) + 6 : 0;
  _rtaCall("start", (rta) => rta.start({ regulation: RTA_REGULATION, timerOffset }));
}

/** ステージを終えたとき。 igtMs は各ステージのゲーム内時間の合計 */
export function reportRtaStageEnd(stageIdx, stageCount, igtMs) {
  const id = rtaCheckpointForStageEnd(stageIdx, stageCount);
  if (!id) return;
  _rtaCall("checkpoint", (rta) => (rta.current && rta.current() ? rta.checkpoint(id, { igtMs }) : null));
}

/** ゲームオーバー・タイトルに戻ったとき */
export function abortRtaRun() {
  _rtaCall("abort", (rta) => (rta.current && rta.current() ? rta.abort() : null));
}

// ============================================================
// SPEC-041: 総合スコア (= 共通基盤 SPEC-002 3.2。 計算はサーバー)
// ============================================================

/**
 * 1 回の挑戦の成績 (= 共通基盤に送る形)。 純関数 (= tests/platform.test.mjs)
 *   run: state.run、 cleared: 全ステージクリアか、 reportScore: 活動レポートのスコア (= 倍率の前)
 */
export function scoreMetrics({ run, cleared, reportScore, regulation, regulationMul, absolute }) {
  const stagesCleared = Math.min(3, (run?.stages ?? []).length);
  return {
    stagesCleared,
    cleared: !!cleared && stagesCleared === 3,
    reportScore: cleared ? Math.max(0, Math.round(reportScore || 0)) : 0,
    regulationMul: regulationMul || 1,
    // 将来の「難易度ごとのレギュレーション」用 (= 今は点に効かない)
    regulation: regulation || "NORMAL",
    absolute: absolute || null,
  };
}

/** 挑戦が終わったとき (= 全クリア・倒れた・タイトルに戻った)。 ステージを 1 つも終えていなければ送らない */
export function reportRunScore(metrics) {
  const bg = _sdk();
  if (!bg || typeof bg.submitScore !== "function" || !metrics) return;
  if (metrics.stagesCleared < 1) return;
  try {
    Promise.resolve(bg.submitScore(metrics))
      .then((r) => { if (r && r.ok === false) console.warn("[platform] score", r.error); })
      .catch((e) => console.warn("[platform] score", e));
  } catch (e) {
    console.warn("[platform] score", e);
  }
}
