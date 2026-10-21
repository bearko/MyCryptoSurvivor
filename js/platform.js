// ============================================================
// platform.js — bearko.games 共通基盤（アチーブメント・RTA・総合スコア）への窓口 (= SPEC-039 / SPEC-096)
// ============================================================
//
// SDK（https://bearko.games/sdk/v1.js）が読めない・通信に失敗しても何もしない。
// ゲームの進行・pauseTime には触らない。ログイン状態は共通基盤が持つ（localStorage は使わない）。

import { owns, ownedCount } from "./skill-logic.js";
import { TREE_NODES, ROOT_ID } from "./skill-data.js";
import { noteTrophies, refreshHeroUnlocks } from "./hero-unlock.js";   // SPEC-098

// ============================================================
// SPEC-039 / SPEC-096: アチーブメント (= 共通基盤 SPEC-008。 SDK の関数名は unlockTrophy のまま)
// ============================================================

/** 覚醒魔王ファオ (= data/enemies.json の 373。 ステージ 2 のボス) */
export const FAO_ENEMY_ID = 373;
/** ABSOLUTE のアチーブメントに要る倍率 (= 4 軸すべて) */
export const ACHIEVEMENT_ABSOLUTE_MUL = 2.0;
const ABSOLUTE_AXES = ["spawnMul", "hpMul", "dmgMul", "speedMul"];

/**
 * 終えたステージ（0 始まり）で送るアチーブメント ID。純関数 (= tests/platform.test.mjs)
 *   ctx.bossDefeated: そのステージのボスを倒したか、 ctx.bossEnemyId: そのステージのボス、
 *   ctx.stages: state.run.stages (= ボスを倒したステージは dust を持つ)、 ctx.rtaMode / regulation / absolute
 */
export function trophyIdsForStageEnd(stageIdx, stageCount, ctx = {}) {
  const ids = [];
  const last = stageCount > 0 && stageIdx === stageCount - 1;
  if (stageIdx === 0) ids.push("survivor.stage1");
  if (stageIdx === 1) ids.push("survivor.stage2");
  if (ctx.bossDefeated && ctx.bossEnemyId === FAO_ENEMY_ID) ids.push("survivor.fao");
  if (!last) return ids;
  ids.push("survivor.clear");
  const stages = Array.isArray(ctx.stages) ? ctx.stages : [];
  const bossIdx = new Set(stages.filter((s) => s && s.dust != null).map((s) => s.idx));
  let allBoss = true;
  for (let i = 0; i < stageCount; i++) if (!bossIdx.has(i)) allBoss = false;
  if (allBoss) ids.push("survivor.allboss");
  if (ctx.rtaMode) ids.push("survivor.rta");
  if (ctx.regulation === "ABSOLUTE") {
    const a = ctx.absolute || {};
    // スライダーの値は小数 (= parseFloat) なので、 わずかな誤差は許す
    if (ABSOLUTE_AXES.every((k) => Number(a[k]) >= ACHIEVEMENT_ABSOLUTE_MUL - 1e-9)) ids.push("survivor.absolute");
  }
  return ids;
}

/** 始めたステージ（0 始まり）で送るアチーブメント ID (= ステージ 3 にたどり着く)。純関数 */
export function achievementIdsForStageStart(stageIdx, stageCount = 3) {
  return stageIdx === 2 && stageCount >= 3 ? ["survivor.stage3"] : [];
}

/**
 * セーブ (= localStorage["mcs.meta.v1"]。 meta.js の normalizeMeta の形) から、 いま満たしているアチーブメント ID。純関数
 */
export function achievementIdsForMeta(meta) {
  const ids = [];
  if (!meta || typeof meta !== "object") return ids;
  if (owns(meta, ROOT_ID)) ids.push("survivor.awaken");
  if (ownedCount(meta) >= 5) ids.push("survivor.tree5");
  if (TREE_NODES.some((n) => n.kind === "capstone" && owns(meta, n.id))) ids.push("survivor.capstone");
  if ((meta.earned?.dust | 0) > 0) ids.push("survivor.firstboss");   // ゴールドダストはボスを倒したときだけ入る
  if ((meta.runs | 0) >= 10) ids.push("survivor.runs10");
  return ids;
}

const _sdk = () => (typeof window !== "undefined" ? window.BearkoGames : undefined);

// 送る列: 1 つずつ順に (= 未ログインの最初の書き込みで仮アカウントができるため)。 同じ起動で同じ ID は 1 度だけ
let _ready = Promise.resolve();   // 共通基盤の init が終わるまで待つ
const _sentIds = new Set();
const _queue = [];
let _pump = null;

/** アチーブメントを送る (= 列に足す)。 SDK がなければ何もしない */
export function unlockAchievements(ids) {
  // SPEC-098: 本作のアチーブメントで解放されるヒーローは、 通信できなくてもこの端末で解放する
  noteTrophies(ids || []);
  const bg = _sdk();
  if (!bg || typeof bg.unlockTrophy !== "function") return;
  for (const id of ids || []) {
    if (typeof id !== "string" || !id || _sentIds.has(id)) continue;
    _sentIds.add(id);
    _queue.push(id);
  }
  _kick();
}

function _kick() {
  if (_pump || !_queue.length) return;
  // 終わりぎわに足されたものも取りこぼさない (= finally でもう一度見る)
  _pump = _drain().finally(() => { _pump = null; _kick(); });
}

async function _drain() {
  await _ready;
  while (_queue.length) {
    const id = _queue.shift();
    const bg = _sdk();
    if (!bg || typeof bg.unlockTrophy !== "function") { _queue.length = 0; return; }
    try {
      const r = await bg.unlockTrophy(id);
      if (!r || !r.ok) console.warn("[platform] achievement", id, r && r.error);
    } catch (e) {
      console.warn("[platform] achievement", id, e);
    }
  }
}

/** テスト用: 列が空になるまで待つ */
export function whenAchievementsSent() {
  return _pump ?? Promise.resolve();
}

/** テスト用: 送った記録と列を空にする */
export function _resetAchievementsForTest() {
  _sentIds.clear();
  _queue.length = 0;
  _ready = Promise.resolve();
}

export function initPlatform(version) {
  const bg = _sdk();
  if (!bg) return;
  try {
    // SPEC-052: 通知は画面の上に出す (= 結果画面のボタンを隠さない。 SDK 1.5.0 から。 古い SDK は無視する)
    // SPEC-091: 全体チャットの 💬 は右上 (= 下はマインちゃんの帯と通知が使う。 SDK 1.6.0 から)。
    //           読み込みの画面には出さない (= タイトルに入ったとき setChatVisible(true))
    _ready = Promise.resolve(bg.init({ game: "survivor", version, toast: "top", chat: { position: "top-right", offset: { x: 12, y: 12 } } }))
      .then(() => setChatVisible(false))
      .catch((e) => console.warn("[platform] init", e));
    // SPEC-098: 持っているアチーブメントからヒーローを解放する (= 起動時・ほかのタブから戻ったとき・新しく得たとき)
    _ready.then(() => refreshHeroUnlocks());
    if (typeof bg.onTrophy === "function") bg.onTrophy((def) => { if (def?.id) noteTrophies([def.id]); });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshHeroUnlocks(); });
    }
  } catch (e) {
    console.warn("[platform] init", e);
  }
}

/** ステージを終えたとき (= ボス撃破 or 5 分耐久。 死亡は通らない) */
export function reportStageEnd(stageIdx, stageCount, ctx = {}) {
  unlockAchievements(trophyIdsForStageEnd(stageIdx, stageCount, ctx));
}

/** ステージを始めたとき (= SPEC-096: ステージ 3 にたどり着く) */
export function reportStageStart(stageIdx, stageCount) {
  unlockAchievements(achievementIdsForStageStart(stageIdx, stageCount));
}

/** セーブ (= mcs.meta.v1) が変わったとき・起動時 (= SPEC-096: 前から遊んでいる人にも付く) */
export function reportMetaAchievements(meta) {
  unlockAchievements(achievementIdsForMeta(meta));
}

/** 宝箱を開けたとき (= SPEC-096: その場で) */
export function reportChestOpened() {
  unlockAchievements(["survivor.chest"]);
}

// ============================================================
// SPEC-040: RTA (= 共通基盤の SDK が時間を計る。 公式タイムはサーバーの受信時刻の差)
// ============================================================
// SPEC-054: 宝箱から懐中時計 (= 10 秒 2 倍速) が出るようになったので、 懐中時計ありのレギュレーション (-v2) で計った。
// SPEC-066: v1.2 (= 撃ってくる敵・雷鼓・ステージの仕掛け・トロイの大群・レベルアップの速さ) で遊びの中身が変わったので、 -v3 で計った。
// SPEC-082: v1.3 (= 敵の大群・ボス戦の枠・ボスの強化・ボス戦の宝箱) で遊びの中身が変わったので、 -v4 で計る。
// それより前の記録 (= -v3・-v2・懐中時計なし) は、 過去の記録として共通基盤に残る
export const RTA_REGULATION = "survivor-normal-v4";
// SPEC-048: ABSOLUTE の 4 軸をすべて ×2.0 に固定した RTA
export const RTA_REGULATION_ABSOLUTE_2X = "survivor-absolute-2x-v4";
export const RTA_ABSOLUTE_MUL = 2.0;

/**
 * 今のルールで走る RTA のレギュレーション ID。 決まったルールでなければ null (= 計測しない)。 純関数 (= tests/platform.test.mjs)
 *   NORMAL → survivor-normal-v4、 ABSOLUTE で 4 軸すべて ×2.0 → survivor-absolute-2x-v4
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
 * SPEC-066: ゲームのバランスの版 (= 共通基盤の総合スコア v4 が、 版ごとに「ふつうの全クリア」を 5,000 にそろえる係数を使う)。
 *   1: v1.1 まで (= 送らない)、 2: v1.2 (= 撃ってくる敵・雷鼓・ステージの仕掛け・トロイの大群・レベルアップの速さ)、
 *   3: v1.3 (= SPEC-082。 敵の大群・ボス戦の枠・ボスの強化・ボス戦の宝箱。 撃破が 2 万体を超え、 点が v1.2 の約 9 倍)
 * 遊びの中身を変えて点の出方が変わったら、 ここを上げて、 共通基盤に新しい係数を足す
 */
export const SCORE_BALANCE = 3;

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
    balance: SCORE_BALANCE,   // SPEC-066 / SPEC-082
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

// ============================================================
// SPEC-091: 全体チャット (= 共通基盤 SPEC-004。 窓は SDK が描く。 ここでは出す・隠すだけ)
// ============================================================

/**
 * 💬 を出す (true) / 隠す (false)。 戦闘中は隠し、 タイトル・結果の画面で出す。
 * SDK がない・古い (= chat が無い) ときは何もしない
 */
export function setChatVisible(on) {
  const bg = _sdk();
  if (!bg || !bg.chat || typeof bg.chat.setVisible !== "function") return;
  try {
    bg.chat.setVisible(!!on);
  } catch (e) {
    console.warn("[platform] chat", e);
  }
  // SPEC-156: ドックの幅を置き直す (= chat-dock.js が聞いている。 SDK の onToggle は出す・隠すでは鳴らない)
  try { if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof Event === "function") window.dispatchEvent(new Event("mcs:chat")); } catch { /* 古い環境 */ }
}

/** SPEC-156: いまのチャットの形 'dock' | 'float' | 'sheet' (= SDK 1.7.0 の chat.layout()。 無ければ 'float') */
export function chatLayout() {
  const bg = _sdk();
  try { const l = bg?.chat?.layout?.(); return l === "dock" || l === "sheet" ? l : "float"; } catch { return "float"; }
}
/** SPEC-156: タイムラインが見えているか (= ドックなら畳んでいない) */
export function chatShown() {
  const bg = _sdk();
  try { return !!bg?.chat?.isOpen?.(); } catch { return false; }
}
/** SPEC-156: ドックを畳む (true) / 広げる (false) (= SDK 1.7.0 の chat.collapse) */
export function setChatCollapsed(on) {
  const bg = _sdk();
  if (!bg || !bg.chat || typeof bg.chat.collapse !== "function") return;
  try { bg.chat.collapse(!!on); } catch (e) { console.warn("[platform] chat", e); }
}
/** SPEC-156: 見える・見えないが変わったら (= SDK 1.6.1 の chat.onToggle)。 解除する関数を返す */
export function onChatToggle(fn) {
  const bg = _sdk();
  if (!bg || !bg.chat || typeof bg.chat.onToggle !== "function") return () => {};
  try { const off = bg.chat.onToggle(fn); return typeof off === "function" ? off : () => {}; } catch { return () => {}; }
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

// ============================================================
// SPEC-092: bearko.games 共通のアイコン (= 共通基盤 SPEC-005 5.3。 選ぶ窓は SDK 1.7.0 が持つ)
// ============================================================

/** 選ぶ窓を出せるか (= SDK が読めて、 1.7.0 以上) */
export function canPickAvatar() {
  const bg = _sdk();
  return !!(bg && typeof bg.openAvatarPicker === "function");
}

/** アイコンを選ぶ窓を開く。 SDK がない・古いときは何もしない (= false) */
export function openAvatarPicker() {
  const bg = _sdk();
  if (!bg || typeof bg.openAvatarPicker !== "function") return false;
  try {
    bg.openAvatarPicker();
  } catch (e) {
    console.warn("[platform] avatar", e);
  }
  return true;
}
