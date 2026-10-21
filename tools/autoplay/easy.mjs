// ============================================================
// tools/autoplay/easy.mjs — 初めての端末で EASY を通す (= SPEC-147 §9)
// ============================================================
// 使い方: python3 -m http.server 8790 をリポジトリのルートで立てて  K=0.15 node tools/autoplay/easy.mjs http://localhost:8790
// レッスンは「つぎへ」で進め、 店は買えるだけ買い、 ミッションは受け、 倒れたら木で根と安い節を取って再挑戦 (= 4 回まで)。
// K は受けるダメージの補正 (= tools/autoplay/stage1.mjs と同じ)。 出力: 流れのログと、 クリアしたか・何回目か
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.argv[2] ?? 'http://localhost:8790'; const K = +(process.env.K ?? 0.15); const MOVE = +(process.env.MOVE ?? 1); const MAXA = +(process.env.MAXA ?? 4);   // SPEC-149: MOVE=0 で動かない。 MAXA は挑む回数
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await ctx.route((u) => !u.href.startsWith(BASE) && !u.href.includes('raw.githubusercontent.com'), (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('mcs.settings', JSON.stringify({ bgm: 0, se: 0, voice: 0, reduceFx: true })); } catch {} });
await p.goto(`${BASE}/index.html`);
for (let k = 0; k < 150 && !(await p.isVisible('#btnPressStart').catch(() => false)); k++) { await p.waitForTimeout(200); if (await p.isVisible('#splashTap').catch(() => false)) await p.click('#splash', { force: true }).catch(() => {}); }
await p.click('#btnPressStart', { force: true }); await p.waitForTimeout(2500);
console.log('mode', await p.evaluate(() => ({ normalLocked: document.getElementById('modeCardNormal').classList.contains('mode-card--locked'), easyRec: document.getElementById('modeCardEasy').classList.contains('mode-card--recommend'), navi: document.querySelector('.navi__text')?.textContent })));
await p.click('#btnModeEasy', { force: true }); await p.waitForTimeout(2000);
await p.evaluate(() => [...document.querySelectorAll('#heroSelectGrid .hero-tile')].find((t) => !t.disabled && !t.classList.contains('locked'))?.click()); await p.waitForTimeout(400);
await p.click('#heroSelectCta', { force: true });
await p.waitForFunction(() => window.__state?.battle?.active, null, { timeout: 30000 });
const seenLessons = []; const log = []; let attempts = 0; let shots = 0;
const out = await p.evaluate(async ([K, MOVE, MAXA]) => await new Promise((resolve) => {
  const s = window.__state; const keys = new Set(); const seen = []; const log = []; let attempts = 1; let lastHp = null; let lastStage = -1;
  const setKey = (code, on) => { if (on === keys.has(code)) return; on ? keys.add(code) : keys.delete(code); window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code })); };
  const vis = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none'; };
  const t0 = performance.now();
  const iv = setInterval(async () => {
    const b = s.battle; if (!b) return;
    if (lastHp != null && s.stats.hp < lastHp && s.stats.hp > 0) s.stats.hp = lastHp - (lastHp - s.stats.hp) * K;
    lastHp = s.stats.hp;
    const t = Math.round((b.stageElapsedMs ?? 0) / 1000);
    if (s.currentStageIdx !== lastStage) { lastStage = s.currentStageIdx; log.push(`stage ${lastStage + 1} start hp=${Math.round(s.statsMax.hp)} dmgMul=${(b.heroDmgMul ?? 1).toFixed(2)} gum=${JSON.parse(localStorage.getItem('mcs.meta.v1') ?? '{}').gum ?? 0}`); }
    if (vis('lessonModal')) { const k = document.querySelector('#lessonModal .lesson__text').textContent.slice(0, 18); if (seen.at(-1) !== k) { seen.push(k); log.push(`lesson @s${s.currentStageIdx + 1} ${t}s: ${k}`); } document.getElementById('lessonNext').click(); return; }
    const cards = [...document.querySelectorAll('#levelUpModal:not(.hidden) .levelup-card')]; if (cards.length) { cards[0].click(); return; }
    if (vis('shopModal')) { for (const c of document.querySelectorAll('.shop-offer:not(.shop-offer--sold) .shop-card')) c.click(); document.getElementById('shopLeave')?.click(); return; }
    if (vis('missionOffer')) { document.getElementById('missionAccept')?.click(); return; }
    if (vis('missionReward')) { document.querySelector('#missionRewardChoices button')?.click(); return; }
    if (vis('stageTransitionModal')) { log.push(`clear s${s.currentStageIdx + 1} ${t}s kills=${s.killCount} hp=${Math.round(s.stats.hp)}/${Math.round(s.statsMax.hp)} treeHidden=${document.getElementById('stageTransitionSkillTree').classList.contains('hidden')}`); document.getElementById('stageTransitionProceed')?.click(); return; }
    if (vis('activityReportModal')) { clearInterval(iv); resolve({ ok: true, attempts, log, seen, easyCleared: localStorage.getItem('mcs.easyCleared'), toNormal: vis('activityReportToNormal'), title: document.getElementById('activityReportTitle').textContent }); return; }
    if (vis('gameOverModal')) {
      const retryHidden = document.getElementById('gameOverRetry').classList.contains('hidden');
      const meta = JSON.parse(localStorage.getItem('mcs.meta.v1') ?? '{}');
      log.push(`lose s${s.currentStageIdx + 1} ${t}s kills=${s.killCount} retryHidden=${retryHidden} gum=${meta.gum}`);
      if (attempts >= MAXA) { clearInterval(iv); resolve({ ok: false, attempts, log, seen }); return; }
      attempts++;
      // 木で根と安い節を取る (= 画面を通さずに)
      const m = await import('/js/meta.js'); const L = await import('/js/skill-logic.js'); const D = await import('/js/skill-data.js');
      let bought = [];
      for (let g = 0; g < 20; g++) { const mm = m.getMeta(); const c = L.claimableNodes(mm).filter((n) => n.id !== 'wm_main').sort((a, b) => L.nodeCost(mm, a.id).gum - L.nodeCost(mm, b.id).gum)[0]; if (!c) break; const r = L.tryBuy(mm, c.id); if (!r.ok) break; m.spend(r.cost); m.setNodeRank(c.id, r.rank); bought.push(c.id); }
      log.push(`tree bought: ${bought.join(',')} gumLeft=${m.getMeta().gum}`);
      const G = await import('/js/battle/gameover.js'); G.applyRetry(); return;
    }
    if (performance.now() - t0 > 900000) { clearInterval(iv); resolve({ ok: false, timeout: true, attempts, log, seen }); return; }
    // 動き: 近い敵から逃げる (= 簡単に)
    const P = b.player; let vx = 0, vy = 0;
    for (const e of b.enemies ?? []) { if (e.isProp) continue; const dx = P.x - e.x, dy = P.y - e.y; const d = Math.hypot(dx, dy) || 1; const R = 200 + (e.r ?? 10); if (d < R) { const w = (R - d) / R; vx += dx / d * w * w * (e.isBoss ? 3 : 1); vy += dy / d * w * w * (e.isBoss ? 3 : 1); } }
    let best = null, bd = 1e9; for (const g of [...(b.gems ?? []), ...(b.items ?? []), ...(b.magicCards ?? [])]) { const d = Math.hypot(g.x - P.x, g.y - P.y); if (d < bd) { bd = d; best = g; } }
    if (best && bd < 400 && Math.hypot(vx, vy) < 0.5) { vx += (best.x - P.x) / bd * 0.7; vy += (best.y - P.y) / bd * 0.7; }
    const dc = Math.hypot(P.x, P.y); if (dc > 500) { vx += -P.x / dc * 0.5; vy += -P.y / dc * 0.5; }
    if (!MOVE) { vx = 0; vy = 0; }
    setKey('KeyD', vx > 0.1); setKey('KeyA', vx < -0.1); setKey('KeyS', vy > 0.1); setKey('KeyW', vy < -0.1);
  }, 40);
}), [K, MOVE, MAXA]);
console.log(JSON.stringify(out, null, 1)); console.log('errors', errs);
await b.close();
