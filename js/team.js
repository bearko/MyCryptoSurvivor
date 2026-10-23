// ============================================================
// team.js — 三人一組のチーム編成 (= SPEC-166)
// ============================================================
//
// メイン 1 人 (= 操作する人。 いまと同じ) ＋ サブ 2 人 (= ついて回って、 自分の初期武器を自分の位置から撃つ)。
// サブの初期武器は武器の枠 (= 5) に入る。 HP・被弾・固有スキル・LL はメインだけ。
// テスト用のホスト (= survivor-test.bearko.games とローカル) でだけ開く (= 作者 2026-10-23。 本番では出ない)。
// ストーリーと RTA はソロのまま。 ヒーローを 3 人解放したら開く。
// 上半分は純関数 (= テストする)。

export const TEST_HOSTS = ["survivor-test.bearko.games", "localhost", "127.0.0.1"];
export const LS_TEAM = "mcs.team";
export const TEAM_MAX_SUBS = 2;
export const TEAM_MIN_UNLOCKED = 3;
/** サブの立ち位置 (= メインの進む向きに対して、 左後ろと右後ろ。 px) */
export const SUB_OFFSET = { back: 42, side: 34 };
/** サブが追いつく速さ (= 1 秒あたりの寄り。 大きいほどぴったりつく) */
export const SUB_FOLLOW = 6;

/** テスト用のホストか (= 新しい機能を先に試す場所。 SPEC-166 §4.5) */
export function isTestHost(hostname = (typeof location !== "undefined" ? location.hostname : "")) {
  return TEST_HOSTS.includes(String(hostname || "").toLowerCase()) || (arguments.length === 0 && isTestFlag());   // ?test=1 でも (= 本番でテスト)
}

/** テスト用のサイトそのものか (= ローカルは含めない)。 ここでは全員とすべてのモードが使え、 共通基盤へは何も送らない */
export const TEST_SITE = "survivor-test.bearko.games";
export function isTestSite(hostname = (typeof location !== "undefined" ? location.hostname : "")) {
  return String(hostname || "").toLowerCase() === TEST_SITE;
}

/**
 * URL の ?test=1 で本番でもテストする (= 作者 2026-10-23 A 案)。 そのタブを閉じるまで続く (= sessionStorage)。 ?test=0 で戻る。
 * 本番と同じ場所なので、 ヒーローの解放はいまのまま (= 全員にはしない)・共通基盤へは送らない
 */
export const SS_TEST = "mcs.test";
export function isTestFlag(loc = (typeof location !== "undefined" ? location : null), storage = globalThis.sessionStorage) {
  const q = new URLSearchParams(loc?.search ?? "").get("test");
  try {
    if (q === "1") storage?.setItem(SS_TEST, "1");
    else if (q === "0") storage?.removeItem(SS_TEST);
    return storage?.getItem(SS_TEST) === "1";
  } catch (_) { return q === "1"; }
}

/** 共通基盤へ送らない (= テスト用のサイトか ?test=1) */
export function isTestMode() { return isTestSite() || isTestFlag(); }

/** 編成の画面を出すか */
export function teamAvailable({ testHost, unlockedCount, story = false, rta = false }) {
  return !!testHost && !story && !rta && (unlockedCount | 0) >= TEAM_MIN_UNLOCKED;
}

/** 保存した編成を正す (= 解放していない人・メインと同じ人・重なり・3 人目以降を落とす) */
export function normalizeTeam(raw, { main, unlocked }) {
  const ok = (id) => unlocked == null || unlocked.has(Number(id));
  const subs = [];
  for (const id of Array.isArray(raw?.subs) ? raw.subs : []) {
    const n = Number(id);
    if (!Number.isFinite(n) || n === Number(main) || subs.includes(n) || !ok(n)) continue;
    subs.push(n);
    if (subs.length >= TEAM_MAX_SUBS) break;
  }
  return { subs };
}

/** 札を押したときの「サブに入れる / 外す」 (= 新しい配列を返す。 満員なら入れない) */
export function toggleSub(subs, heroId, main) {
  const id = Number(heroId);
  if (id === Number(main)) return [...subs];
  if (subs.includes(id)) return subs.filter((x) => x !== id);
  if (subs.length >= TEAM_MAX_SUBS) return [...subs];
  return [...subs, id];
}

/** メインを選び直したとき (= そのヒーローがサブにいれば外す) */
export function withMain(subs, main) {
  return subs.filter((x) => x !== Number(main));
}

/** サブ i (= 0 / 1) の立ち位置の目標 (= メインの向き dir の後ろ、 左右に開く) */
export function subTarget(px, py, dir, i) {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const fx = dir.x / len, fy = dir.y / len;   // 前
  const sx = -fy, sy = fx;                    // 右
  const side = i === 0 ? -1 : 1;
  return { x: px - fx * SUB_OFFSET.back + sx * SUB_OFFSET.side * side, y: py - fy * SUB_OFFSET.back + sy * SUB_OFFSET.side * side };
}

/** 追いかけて寄る (= dt 秒ぶん。 指数で寄せる) */
export function followStep(cur, target, dt, k = SUB_FOLLOW) {
  const a = 1 - Math.exp(-k * Math.max(0, dt));
  return { x: cur.x + (target.x - cur.x) * a, y: cur.y + (target.y - cur.y) * a };
}

// ---- 下半分: localStorage と戦闘の状態 ----

export function loadTeam(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(LS_TEAM) ?? "null"); return { subs: Array.isArray(v?.subs) ? v.subs.map(Number) : [] }; } catch (_) { return { subs: [] }; }
}

export function saveTeam(team, storage = globalThis.localStorage) {
  try { storage?.setItem(LS_TEAM, JSON.stringify({ subs: team.subs })); } catch (_) { /* 保存できなくても遊べる */ }
}
