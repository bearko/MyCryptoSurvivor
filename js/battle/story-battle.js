// ============================================================
// battle/story-battle.js — ストーリーのステージの中の進み (= SPEC-165)。 クリア条件・目印・ハート・マインちゃんの文
// ============================================================
//
// レシピ (= story.js) を読んで、 毎コマ 1 回: クリアしたか (= kills / survive / reach / collect / boss) を見て、
// 到達の目印を描き、 1-4 のハートを落とし、 ★が出た瞬間にマインちゃんが一言 (= レシピの lines.mid)。
// 文は data/i18n/ui.json の story.<id>.<…> (= 録音は後から。 無ければ文の長さで待つ)。 ゲームは止めない。

import { state } from "../state.js";
import { t } from "../i18n.js";
import { naviSay, naviLines, NAVI_TYPE_MS } from "../navi.js";
import { hasVoice, voiceMs } from "../voice.js";
import { storyStage, storyCleared, storyGoal, REACH_RADIUS, reachPoints, reachedPoint } from "../story.js";
import { spawnItem } from "./field.js";
import { triggerStageEndOrTransition } from "./stage-transition.js";
import { img } from "../constants.js";
import { fxBurst } from "./fx.js";
import { playSe } from "../audio.js";
import { SFX } from "../constants.js";

const LINE_HOLD_MS = 1600;

/** ステージの始まり (= startBattle から) */
export function resetStoryBattle() {
  const b = state.battle;
  const r = storyStage();
  const pts = reachPoints(r?.clear);
  b.story = r ? { id: r.id, ce: 0, said: new Set(), healDropped: false, healWaiting: false, reached: false, done: false, cameoAt: 0, reachIdx: 0, goal: pts[0] ?? null } : null;
}

/** CE を拾った (= gems.js から。 collect の条件) */
export function storyOnCe(n) {
  const st = state.battle?.story;
  if (st) st.ce += n | 0;
}

/** ★が出た瞬間の一言 (= 1 回だけ。 on: firstKill / shopOpen / healDrop / reach) */
export function storySay(on) {
  const b = state.battle, r = storyStage();
  if (!b?.story || !r) return false;
  if (b.story.said.has(on)) return false;
  const line = (r.lines?.mid ?? []).find((m) => m.on === on);
  if (!line) return false;
  b.story.said.add(on);
  const key = line.key;
  const ms = Math.max(t(key, key).length * NAVI_TYPE_MS, voiceMs(hasVoice(key) ? key : "")) + LINE_HOLD_MS;
  naviSay(naviLines("story", { key, pose: line.pose ?? "pointer" }), { place: "battle", autoHideMs: LINE_HOLD_MS, top: _commTop() });
  return ms;
}

function _commTop() {
  const hud = globalThis.document?.getElementById("hud");
  const bottom = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
  return bottom + 8;
}

/** 湧きを止めているか (= 1-4: ハートを拾うまで) */
export function storyHoldsSpawn() {
  return !!state.battle?.story?.healWaiting;
}

/** 毎コマ (= battle/index.js の _step。 止まっているあいだは呼ばれない) */
export function tickStoryBattle() {
  const b = state.battle, r = storyStage(), st = b?.story;
  _goalBand(!!(r && st && !b.gameOver && !st.done));
  if (!st || !r || b.gameOver || st.done) return;
  if ((state.killCount | 0) >= 1) storySay("firstKill");
  // 1-4: HP が減ったらハートを足もとに (= 拾うまで湧きを止める)
  if (r.heal && !st.healDropped && state.stats.hp <= state.statsMax.hp * r.heal.below) {
    st.healDropped = true; st.healWaiting = true;
    spawnItem("heal", b.player.x + 60, b.player.y - 30);
    storySay("healDrop");
  }
  if (st.healWaiting && !(b.items ?? []).some((it) => it.kind === "heal")) st.healWaiting = false;
  // 到達: いまの地点に触れたら次の地点へ (= 最後の地点で顔見せがあれば、 一言のあいだ少し待つ)
  const pts = reachPoints(r.clear);
  if (pts.length && st.reachIdx < pts.length && reachedPoint(pts[st.reachIdx], b.player.x, b.player.y)) {
    const pt = pts[st.reachIdx];
    st.reachIdx += 1;
    st.goal = pts[st.reachIdx] ?? null;
    fxBurst(pt.x, pt.y, "#ffe17a", 24, 260);
    playSe(SFX.PICK_HEAL, 0, 0.7);
  }
  const ctx = { kills: state.killCount | 0, elapsedMs: b.stageElapsedMs ?? 0, px: b.player.x, py: b.player.y, ce: st.ce, bossDefeated: !!b.bossDefeated, reachIdx: st.reachIdx };
  if (!storyCleared(r, ctx)) return;
  if (r.clear.kind === "reach" && !st.reached) {
    st.reached = true;
    const ms = storySay("reach") || 0;
    if (r.cameo) { showCameo(r.cameo.giver); st.cameoAt = performance.now() + Math.max(1800, ms); return; }
  }
  if (st.cameoAt && performance.now() < st.cameoAt) return;
  st.done = true;
  hideCameo();
  triggerStageEndOrTransition();
}

/** 到達の目印 (= 世界の座標で描く。 画面の外なら縁に矢印) */
export function drawStoryWorld(ctx, camera, w, h, nowMs) {
  const r = storyStage(), st = state.battle?.story;
  if (!r || !st || r.clear?.kind !== "reach" || st.reached || !st.goal) return;
  const sx = st.goal.x - camera.x, sy = st.goal.y - camera.y;
  const pulse = 0.75 + 0.25 * Math.sin(nowMs / 220);
  if (sx > -80 && sx < w + 80 && sy > -80 && sy < h + 80) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffe17a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, REACH_RADIUS * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = "#ffe17a";
    ctx.beginPath(); ctx.arc(sx, sy, REACH_RADIUS * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = "#fff6cc";
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(t("story.goal.reach", "ここまで来て！"), sx, sy - REACH_RADIUS - 10);
    ctx.restore();
    return;
  }
  // 画面の外: 真ん中から目印へ向く矢印を縁に
  const cx = w / 2, cy = h / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const m = 28;
  const kx = Math.abs(Math.cos(a)) > 1e-6 ? (w / 2 - m) / Math.abs(Math.cos(a)) : Infinity;
  const ky = Math.abs(Math.sin(a)) > 1e-6 ? (h / 2 - m) / Math.abs(Math.sin(a)) : Infinity;
  const k = Math.min(kx, ky);
  const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = "#ffe17a"; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16 * pulse, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

let _goalLast = "";
function _goalBand(on) {
  const el = globalThis.document?.getElementById("storyGoal");
  if (!el) return;
  if (!on) { if (!el.classList.contains("hidden")) { el.classList.add("hidden"); _goalLast = ""; } return; }
  const txt = storyGoalText() ?? "";
  if (txt !== _goalLast) { _goalLast = txt; el.textContent = txt; el.style.top = `${_commTop()}px`; el.classList.toggle("hidden", !txt); }
}

/** 進み具合の 1 行 (= HUD の下の帯に出す文。 null なら出さない) */
export function storyGoalText() {
  const r = storyStage(), b = state.battle;
  if (!r || !b?.story) return null;
  const g = storyGoal(r, { kills: state.killCount | 0, elapsedMs: b.stageElapsedMs ?? 0, ce: b.story.ce, bossDefeated: !!b.bossDefeated, reachIdx: b.story.reachIdx });
  if (!g) return null;
  const key = `story.goal.${g.kind}`;
  const tpl0 = t(key, key);
  return tpl0.replace("{now}", String(g.now)).replace("{goal}", String(g.goal));
}

// ---- 顔見せ (= シャドーヒーローが現れて一言。 戦わない) ----
let _cameo = null;
export function showCameo(giverId) {
  if (typeof document === "undefined") return;
  hideCameo();
  const el = document.createElement("div");
  el.className = "story-cameo";
  el.setAttribute("aria-hidden", "true");
  const im = document.createElement("img");
  im.src = img(`Image/Enemies/${giverId}.png`); im.alt = "";
  el.appendChild(im);
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add("story-cameo--in");
  _cameo = el;
}
export function hideCameo() {
  if (!_cameo) return;
  const el = _cameo; _cameo = null;
  el.classList.add("story-cameo--out");
  setTimeout(() => el.remove(), 500);
}
