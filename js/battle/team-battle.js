// ============================================================
// battle/team-battle.js — 戦闘のサブ 2 人・必殺技・JIN (= SPEC-166)
// ============================================================
//
// サブはメインの左後ろ・右後ろについて回り (= 当たり判定なし・倒れない)、 自分の武器を自分の位置から撃つ。
// サブは本作の 10 人に限らず MCH のどのヒーローでもよい。 武器は初期武器があればそれ、 なければアトリビュートから (= jin.js)。
// SPEC-168: サブの武器はメインの装備の枠に入れない (= 別の枠。 店で同じ武器を買えばメインも撃てる)。 段は店の 3 列で上げる。
//   強化エクステ (= リンゴ・ホースなど) は全員に効く (= weapons.js が同じ倍率を掛ける)
// 必殺技: 撃破でチームゲージが溜まり、 ボタンで撃つ (= 作者 2026-10-23 J4=B)。 JIN が成立していれば JIN の技になる
//   - 単発の JIN: 画面の敵全体へ大ダメージ。 専用背景は攻撃の演出のあいだだけ
//   - 強化の JIN: 一定時間、 武器の威力と間隔が伸びる。 専用背景は強化のあいだずっと
// 2 人そろいのアトリビュートは、 武器の威力に小さな補正 (= 常に)。

import { state } from "../state.js";
import { getHero, heroImg } from "../heroes.js";
import { getHeroSprite, drawSprite } from "./sprites.js";
import { HERO_STARTING_WEAPON, CHAR_SPRITE_RATIO, EXT_MAX_LEVEL } from "../constants.js";
import { subTarget, subSpeed, turnDir, TACTICS, TACTIC_LEASH, ROAM_EVERY, HUNT_KEEP, pickTarget, moveToward, roamPoint, loadTeam, saveTeam } from "../team.js";
import { computeJin, subWeaponFor, jinBackground, BUFF_SEC } from "../jin.js";
import { poolHero, poolAttrs, poolHeroName } from "../hero-pool.js";
import { hitEnemy } from "./damage.js";
import { getLang } from "../i18n.js";
import { naviTipOnce } from "../navi-tips.js";   // SPEC-172: チームの説明 (= 初めてのとき)

/** ゲージが満タンになる撃破数 (= 1 ステージで 2〜4 回撃てる量) */
export const GAUGE_MAX = 150;
/** 必殺技の威力 (= 画面の敵 1 体あたり。 ステージが進むほど上がる) と、 ボスへの割合 (= 最大 HP の) */
export const STRIKE_BASE = 260;
export const STRIKE_STAGE_MUL = 0.8;
export const STRIKE_BOSS_RATIO = 0.06;
/** カットインのあと、 当てるまで (ms) と、 単発の専用背景を出す長さ (ms) */
export const STRIKE_DELAY_MS = 900;
export const STRIKE_BG_MS = 2200;

/**
 * SPEC-170: チームで出ているときのボス (= 作者 2026-10-24「こちらが 3 人になったので大幅に強化」)。
 * ボスへの火力を測ると、 チームはソロの 2.3 倍 (= 序盤)・2.0 倍 (= 中盤)・1.2〜1.5 倍 (= 終盤) で、 これに必殺技が乗る。
 * HP は 2 倍。 サブは倒れずメインの HP は同じなので、 攻撃 (= 体当たり・突進) も 1.25 倍にして手ごたえを残す
 */
/**
 * SPEC-171: サブの人数ぶんの難しさ (= 作者 2026-10-24「選んだ数だけ難易度が変動」。 [0 人, 1 人, 2 人])。
 *   enemyHp: 雑魚の HP の倍率 (= ステージ 1・2・3。 サブの武器は Lv.1 から始まるので、 序盤ほど効きが大きい)
 *   boss: ボスの HP と攻撃 (= 体当たり・突進)
 */
export const TEAM_DIFFICULTY = [
  { enemyHp: [1, 1, 1], boss: null },
  { enemyHp: [1.5, 1.3, 1.15], boss: { hpMul: 1.5, dmgMul: 1.12 } },
  { enemyHp: [2.2, 1.7, 1.4], boss: { hpMul: 2, dmgMul: 1.25 } },
];
/** いまのサブの人数の行 */
export function teamDifficulty(n = state.battle?.subs?.length ?? 0) {
  return TEAM_DIFFICULTY[Math.max(0, Math.min(TEAM_DIFFICULTY.length - 1, n | 0))];
}
/** 2 人のときのボス (= SPEC-170。 名前は残す) */
export const TEAM_BOSS = TEAM_DIFFICULTY[2].boss;
export function teamBossMul() {
  return teamDifficulty().boss;
}
/** SPEC-171: 雑魚の HP の倍率 (= サブの人数とステージ) */
export function teamEnemyHpMul(stageIdx = state.currentStageIdx ?? 0) {
  const t = teamDifficulty().enemyHp;
  return t[Math.max(0, Math.min(t.length - 1, stageIdx | 0))];
}

// ---- 純関数 ----

/** 必殺技の 1 体あたりの威力 */
export function strikeDamage(stageIdx, jinMul = 1, dmgMul = 1) {
  return Math.round(STRIKE_BASE * (1 + (stageIdx | 0) * STRIKE_STAGE_MUL) * jinMul * dmgMul);
}

/** 強化の JIN の数値 (= 威力 ×mul、 間隔は倍率の半分だけ速く) */
export function buffParams(mul) {
  return { dmgMul: mul, cdMul: 1 / (1 + (mul - 1) / 2), ms: BUFF_SEC * 1000 };
}

// ---- 戦闘の状態 ----

/** ステージの始まりにサブを置く (= メインの初期武器を積んだあと、 武器を組み直す前に呼ぶ) */
export function setupTeamBattle(subIds = []) {
  const b = state.battle;
  const p = b.player;
  b.teamDir = { x: 0, y: -1 };   // 最初は上を向いている (= サブは下の左右)
  const attrs = poolAttrs();
  const lv = state.run?.subLv ?? [];   // SPEC-168: サブの武器の段 (= 挑戦のあいだ残る。 carryOwnedExtensions)
  // SPEC-168: サブの武器はメインの枠と別なので、 メインと同じ武器でもよい (= 本作の 10 人はいつも自分の初期武器)
  b.subs = subIds.map((id) => poolHero(id) ? id : null).filter((id) => id != null).map((id, i) => {
    const extId = subWeaponFor(poolHero(id), { starter: HERO_STARTING_WEAPON[id] ?? null, attrs });
    const t = subTarget(p.x, p.y, b.teamDir, i);
    return { heroId: Number(id), extId, level: Math.max(1, Math.min(EXT_MAX_LEVEL, lv[i] ?? 1)), x: t.x, y: t.y, face: 0, walkT: 0, sprite: getHeroSprite(getHero(id) ?? { heroId: Number(id) }) };
  });
  // JIN (= メイン ＋ サブ)。 ゲージはステージをまたいで残す (= 溜めた分を次で撃てる)
  const main = poolHero(state.ownedHero?.heroId);
  b.jin = b.subs.length ? computeJin([main, ...b.subs.map((s) => poolHero(s.heroId))], attrs) : { full: null, pairs: [], pairBonus: 0 };
  const keep = (state.currentStageIdx ?? 0) > 0 ? (b.team?.gauge ?? 0) : 0;
  const tactics = loadTeam().tactics;   // 作戦はサブごとに前のものを覚える (= SPEC-169)
  b.subs.forEach((s, i) => { s.tactic = tactics[i] ?? "follow"; });
  b.team = { gauge: b.subs.length ? keep : 0, t: 0, buffUntil: 0, buff: null, bg: null, pending: null };
  _menuSub = -1;
  if (b.subs.length) { naviTipOnce("team.auto"); naviTipOnce("team.tactic"); }   // SPEC-172: 初めてチームで出たとき
  _renderHud(true);
}

/** 武器の持ち主の鍵 (= メインは extId、 サブは "s<i>:<extId>"。 同じ武器をメインとサブが持っても別の武器) */
export function weaponKey(w) {
  return w?.owner == null ? String(w?.extId) : `s${w.owner}:${w.extId}`;
}

/** その武器を撃つ位置 (= サブの武器ならそのサブ、 ほかはメイン)。 武器か、 弾・刃に残した鍵を渡す */
export function weaponOrigin(w) {
  const b = state.battle;
  const owner = typeof w === "object" && w ? w.owner : (/^s(\d+):/.exec(String(w ?? ""))?.[1] ?? null);
  return (owner != null && b?.subs?.[Number(owner)]) || b.player;
}

/** SPEC-168: サブ i の武器を 1 段上げる (= 店の 3 列。 段は挑戦のあいだ残る) */
export function levelUpSub(i) {
  const b = state.battle;
  const s = b?.subs?.[i];
  if (!s || s.level >= EXT_MAX_LEVEL) return false;
  s.level += 1;
  state.run.subLv ??= [];
  state.run.subLv[i] = s.level;
  return true;
}

/** 武器の威力の倍率 (= 2 人そろいの補正 × 強化の JIN) */
export function teamDmgMul() {
  const t = state.battle?.team;
  if (!t) return 1;
  const pair = 1 + (state.battle.jin?.pairBonus ?? 0);
  return pair * (t.buff && t.t < t.buffUntil ? t.buff.dmgMul : 1);
}

/** 武器の間隔の倍率 (= 強化の JIN のあいだだけ) */
export function teamCdMul() {
  const t = state.battle?.team;
  return t?.buff && t.t < t.buffUntil ? t.buff.cdMul : 1;
}

/** JIN の専用背景 (= 出しているあいだだけ。 sprites.js の背景が見る) */
export function teamBackgroundPath() {
  const t = state.battle?.team;
  return t?.bg && t.t < t.bg.until ? t.bg.path : null;
}

/** 敵を倒したとき (= damage.js) */
export function teamOnKill() {
  const b = state.battle;
  if (!b?.subs?.length || !b.team) return;
  b.team.gauge = Math.min(GAUGE_MAX, b.team.gauge + 1);
  if (b.team.gauge >= GAUGE_MAX) { naviTipOnce("team.gauge"); naviTipOnce("team.done"); }   // SPEC-172: 初めて満タンになったとき (= 2 回目からは黙る)
}

/** サブ i の作戦を変える (= 画面のボタン。 サブごとに別。 次の挑戦でも覚えている。 SPEC-169) */
export function setTeamTactic(tactic, i = 0) {
  const b = state.battle;
  const s = b?.subs?.[i];
  if (!TACTICS.includes(tactic) || !s) return;
  s.tactic = tactic;
  s.target = null; s.roam = null;
  const tactics = [];
  tactics[i] = tactic;
  saveTeam({ tactics });
  _renderTactics(true);
}

/** 必殺技を撃てるか */
export function canTeamStrike() {
  const b = state.battle;
  return !!(b?.active && b.subs?.length && b.team && b.team.gauge >= GAUGE_MAX && !b.team.pending);
}

/** 必殺技 (= ボタン・J キー) */
export function fireTeamStrike() {
  if (!canTeamStrike()) return false;
  const b = state.battle, t = b.team, jin = b.jin?.full;
  t.gauge = 0;
  t.pending = { at: t.t + STRIKE_DELAY_MS };
  if (jin) t.bg = { path: jinBackground(jin.attr), until: t.t + (jin.kind === "buff" ? STRIKE_DELAY_MS + BUFF_SEC * 1000 : STRIKE_DELAY_MS + STRIKE_BG_MS) };
  _showCutin(jin);
  b.fx && (b.fx.shake = Math.max(b.fx.shake ?? 0, 6), b.fx.shakeMs = 400);
  return true;
}

function _applyStrike() {
  const b = state.battle, t = b.team, jin = b.jin?.full;
  if (jin && jin.kind === "buff") {
    t.buff = buffParams(jin.mul);
    t.buffUntil = t.t + t.buff.ms;
    return;
  }
  const dmg = strikeDamage(state.currentStageIdx ?? 0, jin?.mul ?? 1, (state.buffs?.dmgMul ?? 1) * (b.heroDmgMul ?? 1));
  const { camera, viewport } = b;
  const pad = 40;
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e = b.enemies[i];
    if (!e || e.isProp) continue;
    if (e.x < camera.x - pad || e.x > camera.x + viewport.w + pad || e.y < camera.y - pad || e.y > camera.y + viewport.h + pad) continue;
    const d = e.isBoss ? Math.max(dmg, Math.round((e.hpMax ?? e.hp) * STRIKE_BOSS_RATIO * (jin?.mul ?? 1))) : dmg;
    hitEnemy(i, d, "team");
  }
  if (b.fx) { b.fx.shake = Math.max(b.fx.shake ?? 0, 12); b.fx.shakeMs = 500; b.fx.flash = 1; }
}

/** 毎コマ: サブを追いかけさせ、 ゲージ・必殺技・強化の時計を進める */
export function tickTeam(dt, input) {
  const b = state.battle;
  if (!b.subs || !b.subs.length) return;
  const t = b.team;
  if (t) {
    t.t += dt * 1000;
    if (t.pending && t.t >= t.pending.at) { t.pending = null; _applyStrike(); }
    if (t.buff && t.t >= t.buffUntil) t.buff = null;
  }
  // 隊列の向きは少しずつ回す (= 作者 2026-10-24: 向きを変えた瞬間にサブが反対側へ飛んで、 機敏すぎた)
  if (Math.hypot(input?.x ?? 0, input?.y ?? 0) > 0.2) b.teamDir = turnDir(b.teamDir, input, dt);
  const p = b.player;
  const mainSpeed = (p.speed ?? 180) * (state.buffs?.speedMul ?? 1);   // メインのいまの速さ (= ホースの強化も)
  b.subs.forEach((s, i) => {
    const tactic = s.tactic ?? "follow";   // SPEC-169: サブごとの作戦
    const before = { x: s.x, y: s.y };
    const home = subTarget(p.x, p.y, b.teamDir, i);
    const far = Math.hypot(s.x - p.x, s.y - p.y) > TACTIC_LEASH;
    const speed = subSpeed(mainSpeed, Math.hypot(home.x - s.x, home.y - s.y));   // メインと同じ速さ (= 離れたぶんだけ少し速く追いつく)
    let n;
    if (tactic === "follow" || far) {
      s.target = null; s.roam = null;
      n = moveToward(s, home, speed, dt);   // 離れすぎたら、 まず立ち位置へ戻る
    } else if (tactic === "roam") {
      s.roamT = (s.roamT ?? 0) - dt;
      if (!s.roam || s.roamT <= 0 || Math.hypot(s.roam.x - s.x, s.roam.y - s.y) < 8) {
        s.roam = roamPoint(p.x, p.y);
        s.roamT = ROAM_EVERY[0] + Math.random() * (ROAM_EVERY[1] - ROAM_EVERY[0]);
      }
      n = moveToward(s, s.roam, mainSpeed * 0.85, dt);
    } else {   // weak / strong: 狙った敵へ (= 倒れたり離れたりしたら選び直す。 2 人は別の敵を狙う)
      const alive = s.target && s.target.hp > 0 && b.enemies.includes(s.target) && Math.hypot(s.target.x - p.x, s.target.y - p.y) <= TACTIC_LEASH;
      if (!alive) s.target = pickTarget(b.enemies, p.x, p.y, tactic, { exclude: b.subs[1 - i]?.target ?? null });
      n = s.target ? moveToward(s, s.target, mainSpeed, dt, HUNT_KEEP[tactic] ?? 40) : moveToward(s, home, speed, dt);
    }
    s.x = n.x; s.y = n.y;
    const vx = (s.x - before.x) / Math.max(dt, 1e-3);
    s.moving = Math.hypot(vx, s.y - before.y) > 0.5;
    s.face = (s.face ?? 0) + (Math.max(-1, Math.min(1, vx / 120)) - (s.face ?? 0)) * Math.min(1, dt * 10);
    if (s.moving) s.walkT = (s.walkT ?? 0) + dt;
  });
  _renderHud(false);
}

/** サブを描く (= メインより下。 少し小さく) */
export function renderTeamWorld(ctx, camera, nowMs) {
  const b = state.battle;
  if (!b.subs || !b.subs.length) return;
  const r = b.player.r * 0.85;
  const buffing = b.team?.buff && b.team.t < b.team.buffUntil;
  for (const s of b.subs) {
    const x = s.x - camera.x, y = s.y - camera.y;
    ctx.save();
    ctx.globalAlpha = 0.25;   // 足もとの影
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (buffing) {   // 強化の JIN のあいだ、 足もとに赤い輪
      ctx.save();
      ctx.strokeStyle = "rgba(255,40,64,.85)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * (1 + 0.15 * Math.sin(nowMs / 90)), r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const hop = s.moving ? Math.abs(Math.sin((s.walkT ?? 0) * 11)) * r * 0.16 : Math.sin(nowMs / 420 + s.heroId) * r * 0.03;
    ctx.save();
    ctx.translate(x, y + r * 0.55);
    ctx.rotate((s.face ?? 0) * 0.14);
    const drew = drawSprite(ctx, s.sprite, 0, -r * 0.55 - r * 0.12 - hop, r * CHAR_SPRITE_RATIO);
    ctx.restore();
    if (!drew) {
      ctx.fillStyle = "rgba(127,224,255,.6)";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- 画面 (= ゲージとボタン・カットイン。 index.html の #teamStrike / #tsCutin) ----

let _wired = false, _lastPct = -1, _lastReady = null;
function _renderHud(force) {
  if (typeof document === "undefined") return;
  const box = document.getElementById("teamStrike");
  if (!box) return;
  const b = state.battle, on = !!(b.subs?.length);
  box.classList.toggle("hidden", !on);
  if (!on) return;
  if (!_wired) {
    _wired = true;
    document.getElementById("tsBtn")?.addEventListener("click", (e) => { e.stopPropagation(); fireTeamStrike(); });
    window.addEventListener("keydown", (e) => { if (e.code === "KeyJ") fireTeamStrike(); });
    // SPEC-169: 作戦のボタンはサブごと。 押したサブの 4 つを開き、 もう一度押すか選ぶと閉じる
    document.getElementById("tsTacticRow")?.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-sub]");
      if (!btn) return;
      e.stopPropagation();
      const i = Number(btn.dataset.sub);
      _menuSub = _menuSub === i ? -1 : i;
      _renderTactics(true);
    });
    for (const el of document.querySelectorAll("#tsTactics [data-tactic]")) el.addEventListener("click", (e) => { e.stopPropagation(); const i = _menuSub; _menuSub = -1; setTeamTactic(el.dataset.tactic, i < 0 ? 0 : i); });
  }
  _renderTactics(force);
  const t = b.team, jin = b.jin?.full;
  const pct = Math.round(((t?.gauge ?? 0) / GAUGE_MAX) * 100);
  const ready = canTeamStrike();
  const buffing = !!(t?.buff && t.t < t.buffUntil);
  if (!force && pct === _lastPct && ready === _lastReady && !buffing) return;
  _lastPct = pct; _lastReady = ready;
  const fill = document.getElementById("tsFill");
  if (fill) fill.style.width = `${buffing ? Math.max(0, Math.round(((t.buffUntil - t.t) / t.buff.ms) * 100)) : pct}%`;
  box.classList.toggle("is-ready", ready);
  box.classList.toggle("is-buff", buffing);
  const lang = getLang();
  const label = document.getElementById("tsLabel");
  if (label) label.textContent = jin ? `JIN ${"★".repeat(jin.star)}` : "TEAM";
  const btn = document.getElementById("tsBtn");
  if (btn) btn.disabled = !ready;
  const main = document.getElementById("tsBtnText");
  if (main) main.textContent = jin ? (jin.name[lang] ?? jin.name.ja) : (lang === "en" ? "TEAM STRIKE" : "チームストライク");
  const sub = document.getElementById("tsBtnSub");
  if (sub) sub.textContent = buffing ? "BUFF!" : ready ? "GO!" : `${pct}%`;
}

let _lastTactic = null;
let _menuSub = -1;   // SPEC-169: 4 つを開いているサブ (= -1 は閉じている)
const TACTIC_LABEL = { follow: ["ついてこい！", "Follow me!"], roam: ["動き回れ！", "Roam!"], weak: ["ザコを狩れ！", "Hunt the small fry!"], strong: ["強敵を狙え！", "Go for the big ones!"] };
/** 作戦のボタン (= サブごとに 1 つ。 顔と「SUB n」と作戦の名前) と、 開いているサブの 4 つ */
function _renderTactics(force) {
  if (typeof document === "undefined") return;
  const subs = state.battle?.subs ?? [];
  const lang = getLang(), L = (k) => TACTIC_LABEL[k][lang === "en" ? 1 : 0];
  const key = `${lang}|${_menuSub}|${subs.map((s) => `${s.heroId}:${s.tactic}`).join(",")}`;
  if (!force && key === _lastTactic) return;
  _lastTactic = key;
  const row = document.getElementById("tsTacticRow");
  const menu = document.getElementById("tsTactics");
  if (row) {
    if (menu && menu.parentNode === row) row.after(menu);   // 4 つは作り直さない (= 押したときの配線が付いている)
    row.innerHTML = "";
    subs.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ts-tactic" + (_menuSub === i ? " is-open" : "");
      btn.dataset.sub = String(i);
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", _menuSub === i ? "true" : "false");
      btn.innerHTML = `<img class="ts-tactic__face" alt="" /><span class="ts-tactic__kicker"></span><span class="ts-tactic__label"></span>`;
      btn.querySelector("img").src = heroImg(s.heroId);
      btn.querySelector(".ts-tactic__kicker").textContent = `SUB ${i + 1}`;
      btn.querySelector(".ts-tactic__label").textContent = L(s.tactic ?? "follow");
      row.appendChild(btn);
      if (_menuSub === i && menu) row.appendChild(menu);   // 作者 2026-10-24: 縦に並べ、 開いたサブのすぐ下に 4 つ (= 下のサブはそのぶんずれる)
    });
  }
  document.getElementById("teamStrike")?.classList.toggle("is-menu", _menuSub >= 0);
  const cur = subs[_menuSub]?.tactic;
  const head = document.getElementById("tsTacticsHead");
  if (head) head.textContent = _menuSub >= 0 ? (lang === "en" ? `Orders for SUB ${_menuSub + 1}` : `SUB ${_menuSub + 1} への作戦`) : "";
  for (const el of document.querySelectorAll("#tsTactics [data-tactic]")) {
    el.classList.toggle("is-on", el.dataset.tactic === cur);
    el.querySelector("span").textContent = L(el.dataset.tactic);
  }
}

let _cutinTimer = null;
function _showCutin(jin) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("tsCutin");
  if (!el) return;
  const b = state.battle, lang = getLang();
  const ids = [state.ownedHero?.heroId, ...(b.subs ?? []).map((s) => s.heroId)].filter((x) => x != null);
  const faces = el.querySelector(".ts-cutin__faces");
  if (faces) faces.innerHTML = ids.map((id) => `<img src="${heroImg(id)}" alt="" />`).join("");
  const title = el.querySelector(".ts-cutin__title");
  if (title) title.textContent = jin ? (jin.name[lang] ?? jin.name.ja) : (lang === "en" ? "TEAM STRIKE" : "チームストライク");
  const sub = el.querySelector(".ts-cutin__sub");
  if (sub) sub.textContent = jin ? `JIN ${"★".repeat(jin.star)}  ${jin.kind === "buff" ? (lang === "en" ? "POWER UP" : "強化") : (lang === "en" ? "ALL ATTACK" : "総攻撃")}` : ids.map((id) => poolHeroName(poolHero(id), lang)).join(" × ");
  el.classList.remove("hidden", "is-run");
  void el.offsetWidth;
  el.classList.add("is-run");
  clearTimeout(_cutinTimer);
  _cutinTimer = setTimeout(() => { el.classList.remove("is-run"); el.classList.add("hidden"); }, 1500);
}
