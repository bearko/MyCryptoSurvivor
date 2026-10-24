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

// ---- サブの作戦 (= 作者 2026-10-24。 ついてこい / 動き回れ / ザコを狩れ / 強敵を狙え) ----
export const TACTICS = ["follow", "roam", "weak", "strong"];
/** メインからこれ以上は離れない (= 離れたらまず戻る) */
export const TACTIC_LEASH = 380;
/** 動き回る輪の半径 (= メインのまわり) と、 次の行き先を決め直すまでの秒 */
export const ROAM_R = 200;
export const ROAM_EVERY = [1.2, 2.6];
/** 狙った敵との間合い (= 近づきすぎない。 ザコは寄り、 強敵は少し離れて撃つ) */
export const HUNT_KEEP = { weak: 36, strong: 110 };
/** サブの足の速さ (= メインのいまの速さに掛ける。 作者 2026-10-24: 機敏すぎたのでメインと同じに) */
export const SUB_SPEED_MUL = 1;
/** 立ち位置から離れたぶんだけ少し速く追いつく (= 0〜CATCHUP_MAX。 メインと同じ速さだと、 走り続けると追いつけない) */
export const CATCHUP_FROM = 50;
export const CATCHUP_SPAN = 250;
export const CATCHUP_MAX = 0.35;
/** 隊列の向きが回る速さ (= ラジアン / 秒。 向きを変えた瞬間にサブが反対側へ飛ばないように) */
export const TEAM_TURN_RATE = 4;

/** サブの速さ (= メインの速さ × (1 + 離れたぶんの上乗せ)) */
export function subSpeed(mainSpeed, distHome) {
  const k = Math.max(0, Math.min(1, (distHome - CATCHUP_FROM) / CATCHUP_SPAN));
  return mainSpeed * SUB_SPEED_MUL * (1 + CATCHUP_MAX * k);
}

/** 隊列の向きを target へ少しずつ回す (= dt 秒ぶん、 rate ラジアン / 秒まで)。 単位ベクトルを返す */
export function turnDir(cur, target, dt, rate = TEAM_TURN_RATE) {
  const a = Math.atan2(cur.y, cur.x), b = Math.atan2(target.y, target.x);
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  return { x: Math.cos(a + step), y: Math.sin(a + step) };
}

/** 狙う敵 (= メインから leash 以内。 ザコ: 体力の少ない順 → 近い順、 強敵: ボス → 体力の多い順 → 近い順)。 exclude はもう 1 人が狙っている敵 */
export function pickTarget(enemies, px, py, mode, { leash = TACTIC_LEASH, exclude = null } = {}) {
  const near = (enemies ?? []).filter((e) => e && !e.isProp && e.hp > 0 && Math.hypot(e.x - px, e.y - py) <= leash);
  if (!near.length) return null;
  const d = (e) => Math.hypot(e.x - px, e.y - py);
  const hp = (e) => e.hpMax ?? e.hp ?? 0;
  const list = mode === "strong"
    ? near.sort((a, b) => Number(!!b.isBoss) - Number(!!a.isBoss) || hp(b) - hp(a) || d(a) - d(b))
    : near.sort((a, b) => hp(a) - hp(b) || d(a) - d(b));
  return list.find((e) => e !== exclude) ?? list[0];
}

/** 行き先へ、 速さ speed で dt 秒ぶん (= keep の間合いで止まる) */
export function moveToward(cur, target, speed, dt, keep = 0) {
  const dx = target.x - cur.x, dy = target.y - cur.y, dist = Math.hypot(dx, dy);
  const go = Math.min(Math.max(0, dist - keep), speed * Math.max(0, dt));
  if (go <= 0 || dist === 0) return { x: cur.x, y: cur.y };
  return { x: cur.x + (dx / dist) * go, y: cur.y + (dy / dist) * go };
}

/** 動き回る行き先 (= メインのまわりの輪の中。 rnd は 0〜1 を返す関数) */
export function roamPoint(px, py, rnd = Math.random) {
  const a = rnd() * Math.PI * 2, r = 70 + rnd() * (ROAM_R - 70);
  return { x: px + Math.cos(a) * r, y: py + Math.sin(a) * r };
}

// ---- 下半分: localStorage と戦闘の状態 ----

export function loadTeam(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(LS_TEAM) ?? "null"); return { subs: Array.isArray(v?.subs) ? v.subs.map(Number) : [], tactic: TACTICS.includes(v?.tactic) ? v.tactic : "follow" }; } catch (_) { return { subs: [], tactic: "follow" }; }
}

export function saveTeam(team, storage = globalThis.localStorage) {
  const prev = loadTeam(storage);
  try { storage?.setItem(LS_TEAM, JSON.stringify({ subs: team.subs ?? prev.subs, tactic: TACTICS.includes(team.tactic) ? team.tactic : prev.tactic })); } catch (_) { /* 保存できなくても遊べる */ }
}
