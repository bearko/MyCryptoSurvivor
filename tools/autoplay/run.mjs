// ============================================================
// tools/autoplay/run.mjs — NORMAL / EASY を自動で遊んで、 生存時間・撃破・CE・装備の伸びを測る (= SPEC-163 のバランス調整)
// ============================================================
// 使い方: python3 -m http.server 8790 をリポジトリのルートで立てて
//   node tools/autoplay/run.mjs http://localhost:8790 --mode normal --k 0.3 --gum 0 --runs 3 --out out.json
//   --mode normal|easy   --hero 10001   --k 0.3 (= 受けるダメージの倍率。 人の上手さの代わり)   --gum N (= 最初の GUM。 木は安い順に自動で取る)
//   --runs N (= 倒れたら木で強化して復活。 周回の伸びを見る)   --maxsec 330 (= 1 ステージの上限)   --real (= 実時間。 既定は Playwright の clock で速く回す)
//   --buy all|weapons (= 店の買い方)   --label 名前
// Playwright は npm の依存にしない (= PLAYWRIGHT にパスを渡す。 無ければ "playwright" を探す)。
// 出力: 周回ごとに ステージ・倒れた秒・撃破・CE・装備 と、 10 秒ごとの様子 (= 敵の数・HP・与ダメ・被ダメ)。 JSON (= --out) と要約
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith("http")) ?? "http://localhost:8790";
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const MODE = opt("mode", "normal"), HERO = Number(opt("hero", 10001)), K = Number(opt("k", 0.3)), GUM = Number(opt("gum", 0));
const RUNS = Number(opt("runs", 1)), MAXSEC = Number(opt("maxsec", 330)), REAL = args.includes("--real"), BUY = opt("buy", "all"), LABEL = opt("label", `${MODE}-k${K}-g${GUM}`), OUT = opt("out", null);
const SAMPLE_MS = 10000, STEP_MS = 250;

const b = await chromium.launch({ args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await ctx.route((u) => !u.href.startsWith(BASE) && !u.href.includes("raw.githubusercontent.com"), (r) => r.abort());
await p.addInitScript(({ gum }) => { try {
  localStorage.setItem("mcs.settings", JSON.stringify({ bgm: 0, se: 0, voice: 0, reduceFx: true }));
  localStorage.setItem("mcs.played", "1"); localStorage.setItem("mcs.easyCleared", "1"); localStorage.setItem("mcs.coachSeen", "1"); localStorage.setItem("mcs.reviveSeen", "1");
  localStorage.setItem("mcs.naviTips", JSON.stringify(["item.heal", "item.magnet", "item.watch", "item.thunder", "item.card", "item.bossChest", "gimmick.beads", "gimmick.punch", "gimmick.trojan", "enemy.shooter", "mission.offer"]));
  localStorage.setItem("mcs.lessons", JSON.stringify(["s1.move", "s1.ce", "s1.shop", "s1.boss", "s1.clear", "s2.start", "s2.rare", "s2.gift", "s2.mission", "s2.reward", "s2.boss", "s2.lose", "s2.root", "s2.thunder", "s2.clear"]));
  localStorage.setItem("mcs.shareX", JSON.stringify({ claimed: true, skips: 0 }));
  localStorage.setItem("mcs.meta.v1", JSON.stringify({ gum, dust: 0, runs: 1, nodes: {} }));
} catch {} }, { gum: GUM });
if (!REAL) await p.clock.install({ time: new Date("2026-10-21T00:00:00Z") });
const tick = async (ms) => { if (REAL) await p.waitForTimeout(ms); else await p.clock.runFor(ms); };
await p.goto(`${BASE}/index.html`);
for (let k = 0; k < 200 && !(await p.isVisible("#btnPressStart").catch(() => false)); k++) { await tick(200); if (await p.isVisible("#splashTap").catch(() => false)) await p.click("#splash", { force: true }).catch(() => {}); }
await p.click("#btnPressStart", { force: true }); await tick(1500);

/** 木: 根 → 安い順に、 GUM が尽きるまで (= 周回の自動強化) */
async function buyTree() {
  return p.evaluate(async () => {
    const m = await import("/js/meta.js"); const L = await import("/js/skill-logic.js");
    const bought = [];
    for (let g = 0; g < 200; g++) {
      const mm = m.getMeta();
      const c = L.claimableNodes(mm).filter((n) => n.id !== "wm_main" && L.nodeCost(mm, n.id).dust === 0).sort((a, b) => L.nodeCost(mm, a.id).gum - L.nodeCost(mm, b.id).gum)[0];
      if (!c) break;
      const r = L.tryBuy(mm, c.id); if (!r.ok) break;
      m.spend(r.cost); m.setNodeRank(c.id, r.rank); bought.push(`${c.id}:${r.rank}`);
    }
    return { bought, gumLeft: m.getMeta().gum, nodes: Object.keys(m.getMeta().nodes).length };
  });
}
const TREE = opt("tree", "auto");   // auto: 根 → 安い順に GUM が尽きるまで / none: 木を触らない (= EASY の 1 回目)
const tree0 = TREE === "none" ? { bought: [], gumLeft: GUM, nodes: 0 } : await buyTree();
await p.click(MODE === "easy" ? "#btnModeEasy" : "#btnModeNormal", { force: true }); await tick(1500);
await p.evaluate((hero) => { const tiles = [...document.querySelectorAll("#heroSelectGrid .hero-tile")]; (tiles.find((t) => t.dataset.heroId === String(hero) && !t.disabled && !t.classList.contains("locked")) ?? tiles.find((t) => !t.disabled && !t.classList.contains("locked")))?.click(); }, HERO); await tick(400);
await p.click("#heroSelectCta", { force: true });
for (let k = 0; k < 100 && !(await p.evaluate(() => !!window.__state?.battle?.active)); k++) await tick(200);

// ページの中の操作 (= 1 コマごとに呼ぶ。 止まっている画面を片づけ、 動き、 10 秒ごとに様子を記録)
await p.evaluate(({ K, BUY }) => {
  const s = window.__state;
  const keys = new Set();
  const setKey = (code, on) => { if (on === keys.has(code)) return; on ? keys.add(code) : keys.delete(code); window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code, key: code })); };
  const vis = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains("hidden") && getComputedStyle(el).display !== "none"; };
  const sum = (o) => Object.values(o ?? {}).reduce((a, v) => a + (v | 0), 0);
  const A = window.__auto = { lastHp: null, samples: [], lastSampleMs: -1e9, events: [], stageStart: {}, buys: 0 };
  A.step = () => {
    const b = s.battle; if (!b) return { st: "nobattle" };
    // 受けるダメージを K 倍に (= 人の上手さの代わり)
    if (A.lastHp != null && s.stats.hp < A.lastHp && s.stats.hp > 0) s.stats.hp = A.lastHp - (A.lastHp - s.stats.hp) * K;
    A.lastHp = s.stats.hp;
    const idx = s.currentStageIdx | 0;
    const el = b.stageElapsedMs ?? 0;
    if (vis("shopModal")) {
      // SPEC-163: 同じ札を続けて買えるので、 何度か回す。 focus: 初期武器 → 持っている武器の段上げ → 新しい武器 → 強化 の順
      for (let round = 0; round < 12; round++) {
        const cards = [...document.querySelectorAll(".shop-offer:not(.shop-offer--sold) .shop-card")].map((c) => {
          const txt = c.textContent;
          const m = txt.match(/Lv\.(\d+) → Lv\.(\d+)/);
          const extId = Number(c.dataset.extId ?? c.closest(".shop-offer")?.dataset.extId ?? 0);
          const own = (s.ownedExtensions ?? []).find((o) => String(o.extId) === String(extId));
          return { c, price: Number((c.querySelector(".shop-price")?.textContent ?? "").replace(/[^\d]/g, "")) || 0, isBuff: /強化エクステ/.test(txt), isNew: /NEW/.test(txt), lv: own?.level ?? 0, starter: String(extId) === String(s.battle?.starterExtId) };
        });
        let order;
        // focus: 初期武器 → 持っている武器の段上げ (= 段の高いほう) → 新しい武器 (= 3 本まで) → 強化 → 残りは安い順
        const rank = (x) => (x.starter ? 0 : (!x.isNew && !x.isBuff) ? 1 : (x.isNew && !x.isBuff && (s.ownedExtensions ?? []).length < 4) ? 2 : x.isBuff && !x.isNew ? 3 : 4);
        if (BUY === "focus") order = cards.sort((x, y) => (rank(x) - rank(y)) || (y.lv - x.lv) || (x.price - y.price));
        else order = cards.sort((x, y) => x.price - y.price);
        let any = false;
        for (const x of order) { if (BUY === "weapons" && x.isBuff) continue; if (x.price <= s.shop.ce && x.price > 0 || x.price === 0) { x.c.click(); A.buys++; any = true; break; } }
        if (!any) break;
      }
      // 固有スキルも安ければ (= 残りの CE の 4 割以下)
      const sig = document.querySelector("#shopSig button"); if (sig && !sig.disabled) { const pr = Number((sig.textContent.match(/◆\s*(\d+)/) ?? [])[1] ?? 1e9); if (pr <= s.shop.ce * 0.4) sig.click(); }
      document.getElementById("shopLeave")?.click(); return { st: "shop" };
    }
    if (vis("missionOffer")) { document.getElementById("missionAccept")?.click(); return { st: "mission" }; }
    if (vis("missionReward")) { document.querySelector("#missionRewardChoices button")?.click(); return { st: "reward" }; }
    if (vis("levelUpModal")) { document.querySelector("#levelUpModal .levelup-card")?.click(); return { st: "levelup" }; }
    if (vis("bossChestModal")) { document.querySelector("#bossChestModal button, #bossChestModal .boss-chest__next")?.click(); document.getElementById("bossChestModal")?.click(); return { st: "chest" }; }
    if (vis("stageTransitionModal")) return { st: "clear", idx, el };
    if (vis("activityReportModal")) return { st: "allclear", idx, el };
    if (vis("gameOverModal")) return { st: "lose", idx, el };
    if (s.pauseFlags > 0) return { st: "paused", idx, el };
    // 10 秒ごとの様子
    if (el - A.lastSampleMs >= 10000 || el < A.lastSampleMs) {
      A.lastSampleMs = el;
      const st = s.run.stats ?? {};
      A.samples.push({ stage: idx + 1, t: Math.round(el / 1000), kills: s.killCount | 0, ce: Math.round(s.shop?.ce ?? 0), enemies: b.enemies.filter((e) => !e.isProp).length, hp: Math.round(100 * s.stats.hp / Math.max(1, s.statsMax.hp)), dealt: sum(st.dealt), taken: Math.round(sum(st.taken)), owned: (s.ownedExtensions ?? []).map((o) => `${o.extId}:${o.level}`).join(" "), lv: s.level, sig: s.shop?.sigLevel ?? 1 });
    }
    // 動き: 12 方向それぞれの「危険」 (= その向きにいる敵と弾の近さ) を足し、 いちばん安全な向きへ。 近くに敵がいなければ CE を拾い、 端に寄らない
    //   (= 以前はベクトルの和だったので、 囲まれると打ち消して止まってしまい、 人より早く倒れていた)
    const P = b.player;
    const N = 12, danger = new Array(N).fill(0);
    let near = 0;
    const add = (x, y, R, m) => { const dx = x - P.x, dy = y - P.y; const d = Math.hypot(dx, dy) || 1; if (d > R) return; near++; const w = ((R - d) / R) ** 2 * m; const a = Math.atan2(dy, dx); for (let i = 0; i < N; i++) { const ang = (i / N) * Math.PI * 2; const cos = Math.cos(ang - a); danger[i] += w * Math.max(0, cos) ** 2 + w * 0.15; } };
    // ボス戦: 人はボスから逃げ続けず、 武器が届く距離 (= 射程のある武器なら 220、 近接だけなら 70) を保って戦う。 ボスそのものの危険は弾・叩きつけより軽く見る
    const boss = (b.enemies ?? []).find((e) => e.isBoss && !e.isProp);
    //   近接 (= 回る武器) が DPS の半分以上なら触れる距離 (70)、 そうでなければ射程のある武器が届く 220
    let meleeDps = 0, rangedDps = 0;
    for (const w of b.weapons ?? []) { const orbit = w.archetype === "orbit" || w.archetype === "orbitClose"; const d = orbit ? (w.bullets ?? 1) * w.dmg * 4 * 0.5 : (w.bullets ?? 1) * w.dmg / Math.max(0.1, (w.cdMs ?? 1000) / 1000); if (orbit) meleeDps += d; else rangedDps += d; }
    const ringD = meleeDps >= rangedDps ? 70 : 220;
    for (const e of b.enemies ?? []) { if (e.isProp) continue; add(e.x, e.y, 260 + (e.r ?? 10), e.isBoss ? 1 : 1 + (e.r ?? 12) / 12); }
    for (const q of [...(b.enemyShots ?? []), ...(b.bossProjectiles ?? [])]) add(q.x, q.y, 140, 1.5);
    // ボスの型の予告 (= 人は赤い帯・赤い円を見て避ける): 突進の通り道と、 叩きつけの円を危険に足す
    const act = boss?.mv?.act;
    if (act?.kind === "charge" && (act.phase === "windup" || act.phase === "dash")) for (let d = 0; d <= 620; d += 50) add(boss.x + act.dx * d, boss.y + act.dy * d, 130, 3);
    if (act?.kind === "slam" && act.phase === "windup") add(boss.x, boss.y, (act.radius ?? 150) + 60, 4);
    let vx = 0, vy = 0;
    if (near > 0 || boss) {
      // 端に寄る向きは少し嫌う。 真ん中から 500 を超えたら戻る向きを好む。 ボスがいれば、 ボスとの距離が ringD から離れる向きを嫌う
      const dc = Math.hypot(P.x, P.y);
      let bi = 0, bv = Infinity;
      for (let i = 0; i < N; i++) { const ang = (i / N) * Math.PI * 2; const nx = P.x + Math.cos(ang) * 120, ny = P.y + Math.sin(ang) * 120; const edge = Math.max(0, Math.abs(nx) - 400) + Math.max(0, Math.abs(ny) - 650); const ring = boss ? Math.abs(Math.hypot(boss.x - nx, boss.y - ny) - ringD) * 0.012 : 0; const v = danger[i] + edge * 0.02 + ring + (dc > 500 && !boss ? (Math.hypot(nx, ny) - dc) * 0.004 : 0); if (v < bv) { bv = v; bi = i; } }
      const ang = (bi / N) * Math.PI * 2; vx = Math.cos(ang); vy = Math.sin(ang);
    } else {
      let best = null, bd = 1e9; for (const g of [...(b.gems ?? []), ...(b.items ?? []), ...(b.magicCards ?? [])]) { const d = Math.hypot(g.x - P.x, g.y - P.y); if (d < bd) { bd = d; best = g; } }
      if (best && bd < 500) { vx = (best.x - P.x) / bd; vy = (best.y - P.y) / bd; }
      const dc = Math.hypot(P.x, P.y); if (dc > 500) { vx += -P.x / dc; vy += -P.y / dc; }
    }
    setKey("KeyD", vx > 0.3); setKey("KeyA", vx < -0.3); setKey("KeyS", vy > 0.3); setKey("KeyW", vy < -0.3);
    return { st: "play", idx, el };
  };
}, { K, BUY });

const runs = [];
let run = { n: 1, stages: [], tree: tree0, samples: [] };
const stageOf = (idx) => run.stages.find((x) => x.idx === idx) ?? (run.stages.push({ idx, cleared: false, sec: 0, kills: 0 }), run.stages.at(-1));
const snapshot = async () => p.evaluate(() => ({ kills: window.__state.killCount | 0, ce: Math.round(window.__state.shop?.ce ?? 0), owned: (window.__state.ownedExtensions ?? []).map((o) => `${o.extId}:${o.level}`).join(" "), lv: window.__state.level, sig: window.__state.shop?.sigLevel ?? 1, dealt: Object.values(window.__state.run.stats?.dealt ?? {}).reduce((a, v) => a + v, 0) | 0, gum: JSON.parse(localStorage.getItem("mcs.meta.v1") ?? "{}").gum ?? 0 }));
const wall0 = Date.now();
let guard = 0;
while (true) {
  await tick(STEP_MS);
  const r = await p.evaluate(() => window.__auto.step());
  if (r.st === "play" || r.st === "paused") {
    if (r.el > MAXSEC * 1000) { const sn = await snapshot(); Object.assign(stageOf(r.idx), { timeout: true, sec: Math.round(r.el / 1000), ...sn }); run.result = "timeout"; run.samples = await p.evaluate(() => window.__auto.samples.splice(0)); run.gumAfter = sn.gum; runs.push(run); console.error(`[${LABEL}] run ${run.n}: timeout at stage ${r.idx + 1} ${Math.round(r.el / 1000)}s`); break; }
    guard = 0; continue;
  }
  if (r.st === "clear") {
    const sn = await snapshot(); const st = stageOf(r.idx); Object.assign(st, { cleared: true, sec: Math.round(r.el / 1000), ...sn });
    await p.evaluate(() => document.getElementById("stageTransitionProceed")?.click()); await tick(600); continue;
  }
  if (r.st === "allclear" || r.st === "lose") {
    const sn = await snapshot(); const st = stageOf(r.idx); Object.assign(st, { cleared: r.st === "allclear", sec: Math.round(r.el / 1000), ...sn });
    run.result = r.st; run.samples = await p.evaluate(() => window.__auto.samples.splice(0)); run.buys = await p.evaluate(() => window.__auto.buys);
    run.gumAfter = sn.gum; runs.push(run);
    console.error(`[${LABEL}] run ${run.n}: ${r.st} at stage ${r.idx + 1} ${Math.round(r.el / 1000)}s kills=${sn.kills} ce=${sn.ce} owned=[${sn.owned}] gum=${sn.gum} (wall ${((Date.now() - wall0) / 1000).toFixed(0)}s)`);
    if (runs.length >= RUNS) break;
    const tree = TREE === "none" && runs.length < 1 ? { bought: [], gumLeft: 0, nodes: 0 } : await buyTree();   // none でも 2 回目からは木 (= 倒れて強化する流れ)
    run = { n: runs.length + 1, stages: [], tree, samples: [] };
    await p.evaluate(async () => { window.__auto.lastHp = null; window.__auto.buys = 0; window.__auto.lastSampleMs = -1e9; const m = document.getElementById("activityReportModal"); if (m && !m.classList.contains("hidden")) document.getElementById("activityReportRetry")?.click(); else { const G = await import("/js/battle/gameover.js"); G.applyRetry(); } });
    for (let k = 0; k < 100 && !(await p.evaluate(() => !!window.__state?.battle?.active && !window.__state.battle.gameOver)); k++) await tick(200);
    continue;
  }
  if (++guard > 400) { console.error("stuck:", JSON.stringify(r)); break; }
}
const out = { label: LABEL, mode: MODE, hero: HERO, k: K, gum0: GUM, runs, errors: errs, wallSec: Math.round((Date.now() - wall0) / 1000) };
if (OUT) (await import("node:fs")).writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ label: LABEL, runs: runs.map((r) => ({ n: r.n, result: r.result, stages: r.stages.map((s) => `${s.idx + 1}:${s.cleared ? "clear" : "lose"}@${s.sec}s k${s.kills} ce${s.ce} [${s.owned}]`), gumAfter: r.gumAfter, tree: r.tree.bought.length })), errors: errs.slice(0, 3), wallSec: out.wallSec }, null, 1));
await b.close();
