// ============================================================
// battle/story-battle.js — ストーリーのステージの中の進み (= SPEC-165)。 クリア条件・目印・ハート・マインちゃんの文
// ============================================================
//
// レシピ (= story.js) を読んで、 毎コマ 1 回: クリアしたか (= kills / survive / reach / collect / boss) を見て、
// 到達の目印を描き、 1-4 のハートを落とし、 ★が出た瞬間にマインちゃんが一言 (= レシピの lines.mid)。
// 文は data/i18n/ui.json の story.<id>.<…> (= 録音は後から。 無ければ文の長さで待つ)。 ゲームは止めない。

import { state, pauseTime, resumeTime } from "../state.js";
import { t } from "../i18n.js";
import { naviSay, naviLines, NAVI_TYPE_MS } from "../navi.js";
import { hasVoice, voiceMs } from "../voice.js";
import { storyStage, storyCleared, storyGoal, REACH_RADIUS, reachPoints, reachedPoint, markStoryBond, bondBurst } from "../story.js";
import { spawnGem } from "./gems.js";
import { spawnMagicCard } from "./magic-cards.js";
import { addShopGift, openShop } from "./shop.js";
import { tpl } from "../i18n.js";
import { spawnShadow, dismissShadow, findShadow } from "./shadow.js";
import { spawnItem } from "./field.js";
import { MISSION_MAP } from "./missions.js";   // 絆の相手の絵 (= 5-3)
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
  b.story = r ? { id: r.id, ce: 0, said: new Set(), healDropped: false, healWaiting: false, reached: false, done: false, cameoAt: 0, reachIdx: 0, goal: pts[0] ?? null, events: [], shadow: null, shadowMs: 0, shadowDefeated: false, shadowWon: false,
    picked: new Set(), pickupSpawned: false, preIdx: 0, preDone: !r.pre, shadowHits: 0, sparShopOpened: false, rankedUp: false } : null;
  if (r?.pre?.points?.length) b.story.goal = r.pre.points[0];   // 1-5: まず移動の練習の地点へ
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
  // 1-4: 始まりにパンケーキを確定で置く (= 取るまで光る道筋で誘導)
  if (r.pickup && !st.pickupSpawned) { st.pickupSpawned = true; spawnItem(r.pickup.kind, r.pickup.x, r.pickup.y); st.goal = { x: r.pickup.x, y: r.pickup.y }; }
  // 拾った・開けた などの出来事 (= field.js が積む。 その瞬間の一言)
  while (st.events.length) {
    const ev = st.events.shift();
    storySay(ev);
    if (ev.startsWith("item:")) { st.picked.add(ev.slice(5)); if (r.pickup && ev === `item:${r.pickup.kind}`) st.goal = null; }
    if (ev === "shadowHit") { st.shadowHits += 1; if (r.spar && !st.sparShopOpened && st.shadowHits >= r.spar.hits) { st.sparShopOpened = true; storySay("sparHits"); setTimeout(() => { if (state.battle === b && !b.gameOver && !st.shadowWon && !st.shadowDefeated && findShadow()) openShop({ opening: false }); }, 1200); } }   // 呂布がもういなければ開かない
    if (ev === "rankup") { st.rankedUp = true; const sh = findShadow(); if (sh && r.spar) { sh.hp = Math.min(sh.hp, r.spar.hpAfter); sh.hpMax = r.spar.hpAfter; } storySay("rankup"); }
    if (r.bondOn && ev === r.bondOn && r.bond?.who && !st.bondDone) { st.bondDone = true; markStoryBond(r.bond.who); _bondBurst(r, st); _showBondModal(r, st, { giver: MISSION_MAP[r.bond.who]?.giver, name: t(`mission.${r.bond.who}.giver`, r.bond.who), line: t(r.lines?.mid?.find((m) => m.on === "bond")?.key ?? "", ""), onAck: null }); }   // SPEC-165: 5-3 (= ミッション達成で絆)
  }
  _tickShadow(r, st, b);
  // 1-4: HP が減ったらハートを足もとに (= 拾うまで湧きを止める)
  if (r.heal && !st.healDropped && state.stats.hp <= state.statsMax.hp * r.heal.below) {
    st.healDropped = true; st.healWaiting = true;
    spawnItem("heal", b.player.x + 60, b.player.y - 30);
    storySay("healDrop");
  }
  if (st.healWaiting && !(b.items ?? []).some((it) => it.kind === "heal")) st.healWaiting = false;
  // 1-5: 移動の練習 (= pre の地点を順に。 全部めぐると呂布が出る)
  if (r.pre?.points?.length && !st.preDone) {
    const pp = r.pre.points;
    if (reachedPoint(pp[st.preIdx], b.player.x, b.player.y)) {
      fxBurst(pp[st.preIdx].x, pp[st.preIdx].y, "#ffe17a", 24, 260); playSe(SFX.PICK_HEAL, 0, 0.7);
      st.preIdx += 1;
      if (st.preIdx >= pp.length) { st.preDone = true; st.goal = null; } else { st.goal = pp[st.preIdx]; storySay("reach"); }
    }
  }
  // 到達: いまの地点に触れたら次の地点へ (= 最後の地点で顔見せがあれば、 一言のあいだ少し待つ)
  const pts = reachPoints(r.clear);
  if (pts.length && st.reachIdx < pts.length && reachedPoint(pts[st.reachIdx], b.player.x, b.player.y, r.clear.radius ?? REACH_RADIUS)) {
    const pt = pts[st.reachIdx];
    st.reachIdx += 1;
    st.goal = pts[st.reachIdx] ?? null;
    fxBurst(pt.x, pt.y, "#ffe17a", 24, 260);
    playSe(SFX.PICK_HEAL, 0, 0.7);
  }
  const ctx = { kills: state.killCount | 0, elapsedMs: b.stageElapsedMs ?? 0, px: b.player.x, py: b.player.y, ce: st.ce, bossDefeated: !!b.bossDefeated, reachIdx: st.reachIdx, shadowMs: st.shadowMs, shadowDefeated: st.shadowDefeated, picked: st.picked };
  if (!storyCleared(r, ctx)) return;
  if (r.clear.kind === "reach" && !st.reached) {
    st.reached = true;
    const ms = storySay("reach") || 0;
    if (r.cameo) { showCameo(r.cameo.giver); st.cameoAt = performance.now() + Math.max(1800, ms); return; }
  }
  if (st.cameoAt && performance.now() < st.cameoAt) return;
  if (r.shadow && !st.shadowWon) {
    // 試練を越えた: survive なら消える。 絆を結び、 大きなポップアップ (= 相手の絵・一言・報酬) を押すまで止める (= 作者 2026-10-22: 読めないうちにクリアの演出が始まっていた)
    st.shadowWon = true;
    if (r.shadow.mode !== "defeat" && r.shadow.mode !== "spar") dismissShadow();
    if (r.bond?.who) { markStoryBond(r.bond.who); _bondBurst(r, st); }
    hideCameo();
    _showBondModal(r, st, { giver: r.shadow.giver, name: t(`mission.${r.shadow.id}.giver`, r.shadow.id), line: t(`shadow.${r.shadow.id}.win`, ""), onAck: () => { st.bondAck = true; } });
    return;
  }
  if (r.shadow && st.shadowWon && !st.bondAck) return;   // ポップアップを押すまで待つ
  st.done = true;
  hideCameo();
  triggerStageEndOrTransition();
}

/** シャドーの試練 (= 時刻になったら出す。 survive は時間を数え、 defeat は倒れたかを見る) */
function _tickShadow(r, st, b) {
  const def = r.shadow;
  if (!def) return;
  const ready = def.trigger === "afterPre" ? st.preDone : (b.stageElapsedMs ?? 0) >= (def.atMs ?? 3000);
  if (!st.shadow && ready) {
    st.shadow = spawnShadow({ ...def });
    showCameo(def.giver);
    const ms = _sayShadow(r, "appear") || 0;
    setTimeout(hideCameo, Math.max(1600, ms));
    return;
  }
  if (!st.shadow || st.shadowWon) return;
  const alive = findShadow();
  if (def.mode === "defeat" || def.mode === "spar") { if (!alive) st.shadowDefeated = true; return; }
  if (alive) st.shadowMs += 1000 / 60;   // _step は 60 fps 相当で呼ばれる (= dt は呼び元が持つので目安)
}
/**
 * 絆の報酬ラッシュ (= 作者の方針: 報酬は早めに・一気に)。 越えた瞬間に、 足もとへ CE の宝石の輪・マジックカード・ハートが降り、
 * ギフト券はその場で財布へ、 GUM はクリアの内訳に「絆の報酬」の行で上乗せ。 画面の真ん中に 1 枚の札で中身を見せる
 */
function _bondBurst(r, st) {
  const bu = bondBurst(r);
  const b = state.battle;
  if (!bu || !b || st.burstDone) return;
  st.burstDone = true;
  const P = b.player;
  const n = 24, each = Math.max(1, Math.round(bu.ce / n));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const d = 70 + (i % 3) * 22; spawnGem(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, each); }
  for (let i = 0; i < (bu.cards | 0); i++) { const a = -Math.PI / 2 + (i - (bu.cards - 1) / 2) * 0.7; spawnMagicCard(P.x + Math.cos(a) * 54, P.y + Math.sin(a) * 54); }
  if (bu.heal) spawnItem("heal", P.x, P.y + 60);
  if (r.bond?.gifts) addShopGift(r.bond.gifts);
  st.bondGum = bu.gum | 0;
  fxBurst(P.x, P.y, "#ffe17a", 40, 360);
  playSe(SFX.LEVEL_UP, 0, 0.6);
}

/**
 * 越えた瞬間のポップアップ (= 相手の大きな絵・名前・一言・報酬。 時間を止めて、 押すまで出す)。 body に置く (= render() で消えない)
 * onAck: 押したときに呼ぶ (= シャドーの試練はここでクリアの演出へ)
 */
function _showBondModal(r, st, { giver, name, line, onAck }) {
  document.querySelector(".story-bond")?.remove();
  const bu = bondBurst(r);
  const rows = [];
  if (bu?.ce) rows.push(`<li><b>CE</b> +${bu.ce}</li>`);
  if (bu?.cards) rows.push(`<li><b>${t("story.burst.cards", "マジックカード")}</b> ×${bu.cards}</li>`);
  if (r.bond?.gifts) rows.push(`<li><b>${t("story.burst.gifts", "ギフト券")}</b> ×${r.bond.gifts}</li>`);
  if (bu?.heal) rows.push(`<li><b>${t("story.burst.heal", "ハート")}</b> ×1</li>`);
  if (bu?.gum) rows.push(`<li><b>GUM</b> +${bu.gum}</li>`);
  for (const u of r.bond?.unlock ?? []) rows.push(`<li class="story-bond__unlock">${t(`story.unlock.${u.replace(":", ".")}`, u)}</li>`);
  const el = document.createElement("div");
  el.className = "story-bond";
  el.setAttribute("role", "dialog");
  el.innerHTML = `
    <div class="story-bond__card">
      <div class="story-bond__kicker">${r.bond ? t("story.bond.kicker", "絆を結んだ") : t("story.bond.kickerWin", "試練を越えた")}</div>
      ${giver ? `<img class="story-bond__face" src="${img(`Image/Enemies/${giver}.png`)}" alt="" draggable="false" onerror="this.remove()" />` : ""}
      <div class="story-bond__name">${esc(name ?? "")}</div>
      ${line ? `<p class="story-bond__line">「${esc(line)}」</p>` : ""}
      ${rows.length ? `<div class="story-bond__rw"><small>${t("story.bond.rewards", "絆の報酬")}</small><ul>${rows.join("")}</ul></div>` : ""}
      <span class="story-bond__tap">${t("story.bond.tap", "タップで続ける ▶")}</span>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  pauseTime();
  const close = () => { el.removeEventListener("click", close); el.classList.add("is-out"); setTimeout(() => el.remove(), 300); resumeTime(); onAck?.(); };
  setTimeout(() => el.addEventListener("click", close), 500);   // 開いた直後の連打で消えないように
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function _sayShadow(r, kind) {
  const key = `shadow.${r.shadow.id}.${kind}`;
  const ms = Math.max(t(key, key).length * NAVI_TYPE_MS, voiceMs(hasVoice(key) ? key : "")) + LINE_HOLD_MS;
  naviSay(naviLines("story", { key, pose: kind === "win" ? "hooray" : "cross" }), { place: "battle", autoHideMs: LINE_HOLD_MS, top: _commTop() });
  return ms;
}

/** 到達の目印 (= 世界の座標で描く。 画面の外なら縁に矢印) */
export function drawStoryWorld(ctx, camera, w, h, nowMs) {
  const r = storyStage(), st = state.battle?.story;
  if (!r || !st || st.reached || !st.goal) return;   // reach のほか、 1-4 のパンケーキと 1-5 の練習の地点にも
  const sx = st.goal.x - camera.x, sy = st.goal.y - camera.y;
  const pulse = 0.75 + 0.25 * Math.sin(nowMs / 220);
  // 黄色い道筋 (= 自分からゴールへ。 仕掛けの赤い線と同じ作り: 光る帯・流れる破線・点滅。 近づくほど濃く太く、 光の粒が速く流れる)
  const b = state.battle, px = b.player.x - camera.x, py = b.player.y - camera.y;
  const dist = Math.hypot(sx - px, sy - py);
  const near = Math.max(0.2, Math.min(1, 1 - (dist - 120) / 900));   // 0.2 (遠い) → 1 (目の前)
  const blink = 0.8 + 0.2 * Math.sin(nowMs / 140);
  const ux = (sx - px) / (dist || 1), uy = (sy - py) / (dist || 1);
  ctx.save();
  ctx.lineCap = "round";
  // 光る帯 (= にじみ)
  ctx.shadowColor = "rgba(255, 225, 122, 0.9)"; ctx.shadowBlur = 12 + 24 * near;
  ctx.globalAlpha = (0.12 + 0.28 * near) * blink; ctx.strokeStyle = "#ffe17a"; ctx.lineWidth = 12 + 16 * near;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.shadowBlur = 0;
  // 流れる破線 (= 2 本。 近いほど速い)
  ctx.setLineDash([16, 14]); ctx.lineDashOffset = -((nowMs / (26 - 14 * near)) % 30);
  ctx.globalAlpha = (0.55 + 0.45 * near) * blink; ctx.strokeStyle = "#fff3c4"; ctx.lineWidth = 3 + 3 * near;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.setLineDash([4, 26]); ctx.lineDashOffset = -((nowMs / (14 - 8 * near)) % 30);
  ctx.globalAlpha = 0.9 * blink; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2 + 2 * near;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.setLineDash([]);
  // 光の粒 (= 道の上を流れる。 数も大きさも近いほど増える)
  const n = Math.round(4 + 10 * near), speed = 90 + 160 * near;
  ctx.fillStyle = "#fff8d6";
  for (let i = 0; i < n; i++) {
    const s = ((nowMs * speed / 1000) + i * (dist / n) + i * 37) % (dist || 1);
    const wob = Math.sin(nowMs / 170 + i * 1.7) * (3 + 5 * near);
    ctx.globalAlpha = (0.5 + 0.5 * near) * (0.6 + 0.4 * Math.sin(nowMs / 90 + i));
    ctx.beginPath(); ctx.arc(px + ux * s - uy * wob, py + uy * s + ux * wob, 1.5 + 2.5 * near, 0, Math.PI * 2); ctx.fill();
  }
  // ゴールの輪 (= 近いほど大きく明るい。 外へ広がる輪も)
  ctx.globalAlpha = 0.25 + 0.5 * near; ctx.strokeStyle = "#ffe17a"; ctx.lineWidth = 2;
  const ring = ((nowMs / 9) % 90);
  ctx.beginPath(); ctx.arc(sx, sy, REACH_RADIUS + ring * (0.6 + near), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (sx > -80 && sx < w + 80 && sy > -80 && sy < h + 80) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffe17a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, REACH_RADIUS * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = "#ffe17a";
    ctx.beginPath(); ctx.arc(sx, sy, REACH_RADIUS * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = "#fff6cc";
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(t("story.goal.reachHere", "ここまで来て！"), sx, sy - REACH_RADIUS - 10);   // story.goal.reach は帯の文 (= {now} / {goal} が残っていた)
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
  const g = storyGoal(r, { kills: state.killCount | 0, elapsedMs: b.stageElapsedMs ?? 0, ce: b.story.ce, bossDefeated: !!b.bossDefeated, reachIdx: b.story.reachIdx, shadowMs: b.story.shadowMs, shadowDefeated: b.story.shadowDefeated });
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
