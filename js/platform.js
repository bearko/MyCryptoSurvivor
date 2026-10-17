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
    // SPEC-052: 通知は画面の上に出す (= 結果画面のボタンを隠さない。 SDK 1.5.0 から。 古い SDK は無視する)
    Promise.resolve(bg.init({ game: "survivor", version, toast: "top" })).catch((e) => console.warn("[platform] init", e));
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
// SPEC-048: ABSOLUTE の 4 軸をすべて ×2.0 に固定した RTA
export const RTA_REGULATION_ABSOLUTE_2X = "survivor-absolute-2x";
export const RTA_ABSOLUTE_MUL = 2.0;

/**
 * 今のルールで走る RTA のレギュレーション ID。 決まったルールでなければ null (= 計測しない)。 純関数 (= tests/platform.test.mjs)
 *   NORMAL → survivor-normal、 ABSOLUTE で 4 軸すべて ×2.0 → survivor-absolute-2x
 */
export function rtaRegulationFor(regulation, absolute) {
  if (regulation == null || regulation === "NORMAL") return RTA_REGULATION;
  if (regulation !== "ABSOLUTE") return null;
  const a = absolute || {};
  const axes = ["spawnMul", "hpMul", "dmgMul", "speedMul"];
  return axes.every((k) => a[k] === RTA_ABSOLUTE_MUL) ? RTA_REGULATION_ABSOLUTE_2X : null;
}

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
export function startRtaRun(regulation = RTA_REGULATION) {
  // 経過時間の表示は HUD (= ヘッダー + Lv / HP / XP) のすぐ下に出す
  const hud = typeof document !== "undefined" ? document.getElementById("hud") : null;
  const timerOffset = hud ? Math.round(hud.getBoundingClientRect().bottom) + 6 : 0;
  _rtaCall("start", (rta) => rta.start({ regulation, timerOffset }));
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
export function scoreMetrics({ run, cleared, reportScore, regulation, absolute }) {
  const stagesCleared = Math.min(3, (run?.stages ?? []).length);
  const out = {
    stagesCleared,
    cleared: !!cleared && stagesCleared === 3,
    reportScore: cleared ? Math.max(0, Math.round(reportScore || 0)) : 0,
    // SPEC-051: 難易度は名前だけ送る。 係数 (= ABSOLUTE は 4 軸の平均・上限 2.0) は共通基盤が決める
    difficulty: regulation === "ABSOLUTE" ? "absolute" : "normal",
  };
  if (out.difficulty === "absolute") {
    const a = absolute || {};
    out.absolute = { spawnMul: a.spawnMul ?? 1, hpMul: a.hpMul ?? 1, dmgMul: a.dmgMul ?? 1, speedMul: a.speedMul ?? 1 };
  }
  return out;
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

// ============================================================
// SPEC-052: 結果画面 (= 通知の置き場所・ポータルへ戻る・プレイヤー名の既定)
// ============================================================
export const PORTAL_URL = "https://bearko.games/";

/** 通知を画面の上、 上端から offset px に置く (= 戦闘中は HUD と RTA の時計の下)。 古い SDK では何もしない */
export function placePlatformToasts(offset = 0) {
  const bg = _sdk();
  if (!bg || typeof bg.setToastPosition !== "function") return;
  try {
    bg.setToastPosition({ position: "top", offset });
  } catch (e) {
    console.warn("[platform] toast", e);
  }
}

/** ログイン中の bearko.games の名前 (= ログインしていない・SDK がないなら null) */
export function platformUserName() {
  const bg = _sdk();
  try {
    const u = bg && typeof bg.getUser === "function" ? bg.getUser() : null;
    const n = u && typeof u.name === "string" ? u.name.trim() : "";
    return n || null;
  } catch (e) {
    return null;
  }
}

/**
 * ランキングの名前の既定。 純関数 (= tests/platform.test.mjs)
 *   ログイン中の名前 → 前に送った名前 → 空 (= "anonymous" は既定にしない。 前に送った "anonymous" も空として扱う)
 */
export function defaultPlayerName({ accountName, saved } = {}) {
  const a = (accountName || "").trim();
  if (a) return a.slice(0, 30);
  const s = (saved || "").trim();
  return s && s.toLowerCase() !== "anonymous" ? s.slice(0, 30) : "";
}
