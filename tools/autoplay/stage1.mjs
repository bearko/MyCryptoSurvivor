// ============================================================
// tools/autoplay/stage1.mjs — 初めての人 (= 何も無い localStorage) でステージ 1 を自動で遊ぶ (= SPEC-146)
// ============================================================
// 使い方: python3 -m http.server 8790 をリポジトリのルートで立てて
//   K=0.15 node tools/autoplay/stage1.mjs http://localhost:8790 8 3 "" label
//   (= 回数 8・同時に 3。 query は "?shop=0" など。 K は受けるダメージの補正 (= 人の初回に合わせる。 SPEC-146 §2))
// Playwright は npm の依存にしない (= PLAYWRIGHT にパスを渡す。 無ければ "playwright" を探す)
// 出力: 1 回ごとの JSON と、 SUMMARY (= クリアの割合・撃破 150 体の秒・倒れた秒の中央)
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [BASE, RUNS = "6", PAR = "3", QUERY = "", LABEL = "run", SKILL = "0"] = process.argv.slice(2);
const K = +(process.env.K ?? 1);   // 受けるダメージの倍率 (= 人の初回に合わせる補正。 1 より小さいほど上手)
const b = await chromium.launch({ args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const results = [];
async function one(i) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await ctx.route((u) => !u.href.startsWith(BASE) && !u.href.includes('raw.githubusercontent.com'), (r) => r.abort());
  await p.addInitScript(({ skill }) => { try { localStorage.setItem('mcs.settings', JSON.stringify({ bgm: 0, se: 0, voice: 0, reduceFx: true })); if (skill) localStorage.setItem('mcs.meta.v1', skill); } catch {} }, { skill: SKILL === "0" ? null : SKILL });
  await p.goto(`${BASE}/index.html${QUERY}`);
  for (let k = 0; k < 150 && !(await p.isVisible('#btnPressStart').catch(() => false)); k++) { await p.waitForTimeout(200); if (await p.isVisible('#splashTap').catch(() => false)) await p.click('#splash', { force: true }).catch(() => {}); }
  await p.click('#btnPressStart', { force: true }); await p.waitForTimeout(2500);
  await p.click('#btnModeNormal', { force: true }); await p.waitForTimeout(2000);
  await p.evaluate(() => [...document.querySelectorAll('#heroSelectGrid .hero-tile')].find((t) => !t.disabled && !t.classList.contains('locked'))?.click()); await p.waitForTimeout(400);
  await p.click('#heroSelectCta', { force: true });
  await p.waitForFunction(() => window.__state?.battle?.active, null, { timeout: 30000 });
  const res = await p.evaluate(async (K) => { const C = await import('/js/constants.js'); let AR = null; try { AR = await import('/js/battle/arena.js'); } catch {} return await new Promise((resolve) => {
    const s = window.__state;
    const keys = new Set();
    const setKey = (code, on) => { if (on === keys.has(code)) return; on ? keys.add(code) : keys.delete(code); window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code })); };
    const vis = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none'; };
    const out = { t150: null, t400: null, end: null, reason: null, kills: 0, level: 0, buys: 0, hpLow: null, firstHit: null };
    let lastHp = null;
    const startReal = performance.now();
    const tick = () => {
      const b = s.battle;
      if (!b) return;
      b.fastForwardMs = 1e9;   // 2 倍速
      // 受けたダメージを K 倍に (= 減った HP の差を K 倍で戻す)
      if (lastHp != null && s.stats.hp < lastHp && s.stats.hp > 0) s.stats.hp = lastHp - (lastHp - s.stats.hp) * K;
      const t = Math.round((b.stageElapsedMs ?? 0) / 1000);
      const kills = s.killCount | 0;
      if (out.t150 == null && kills >= 150) out.t150 = t;
      if (out.t400 == null && kills >= 400) out.t400 = t;
      if (lastHp != null && s.stats.hp < lastHp && out.firstHit == null) out.firstHit = t;
      lastHp = s.stats.hp;
      // 画面
      const cards = [...document.querySelectorAll('#levelUpModal:not(.hidden) .levelup-card')];
      if (cards.length) {
        const isW = (c) => /武器|Weapon/.test(c.querySelector('.levelup-card__cat')?.textContent ?? '');
        const pick = cards.find((c) => isW(c) && c.classList.contains('levelup-card--rankup')) ?? cards.find(isW) ?? cards[0];
        pick.click();
      }
      if (vis('shopModal')) {
        const offers = [...document.querySelectorAll('.shop-offer:not(.shop-offer--sold) .shop-card')];
        const isW = (c) => /武器|Weapon/.test(c.closest('.shop-offer')?.textContent ?? '');
        for (const c of [...offers.filter(isW), ...offers.filter((c) => !isW(c))]) c.click();
        document.getElementById('shopLeave')?.click();
      }
      if (vis('missionOffer')) document.getElementById('missionDecline')?.click();
      if (vis('missionReward')) document.querySelector('#missionRewardChoices button')?.click();
      if (vis('shareModal')) document.getElementById('shareLater')?.click();
      if ((b.gameOver && (vis('gameOverModal') || vis('stageTransitionModal') || vis('activityReportModal') || window.__state.lastRunStats)) || vis('gameOverModal') || vis('stageTransitionModal') || vis('activityReportModal')) {
        out.end = t; out.reason = vis('stageTransitionModal') || vis('activityReportModal') || (b.gameOver && !vis('gameOverModal') && !(s.stats.hp <= 0)) ? 'clear' : 'lose';
        out.kills = kills; out.level = s.level; out.buys = s.shop?.purchases ?? null;
        out.tier = typeof s.battle.threatTier === 'number' ? s.battle.threatTier : null;
        clearInterval(iv); for (const k of [...keys]) setKey(k, false); resolve(out); return;
      }
      if (performance.now() - startReal > 600000) { out.end = t; out.reason = 'timeout'; clearInterval(iv); resolve(out); return; }
      // 動き: 16 方向を試し、 0.25・0.5 秒先の危なさが小さい向きへ (= 敵はこちらへ寄ってくる前提)。 安全なら CE に寄る
      const P = b.player;
      const sp = (P.speed ?? 150) * (s.buffs?.speedMul ?? 1);
      const foes = (b.enemies ?? []).filter((e) => !e.isProp && Math.hypot(e.x - P.x, e.y - P.y) < 520);
      const shots = [...(b.enemyShots ?? []), ...(b.bossProjectiles ?? [])].filter((q) => Math.hypot(q.x - P.x, q.y - P.y) < 300);
      const rects = b.obstacleRects ?? [];
      let best = null, bestSc = Infinity;
      let target = null, td = 1e9;
      for (const g of [...(b.gems ?? []), ...(b.items ?? []), ...(b.magicCards ?? [])]) { const d = Math.hypot(g.x - P.x, g.y - P.y); if (d < td) { td = d; target = g; } }
      const cands = [[0, 0]];
      for (let k = 0; k < 16; k++) cands.push([Math.cos(k * Math.PI / 8), Math.sin(k * Math.PI / 8)]);
      for (const [ux, uy] of cands) {
        let sc = 0;
        for (const T of [0.15, 0.35, 0.6]) {
          const x = P.x + ux * sp * T, y = P.y + uy * sp * T;
          for (const e of foes) {
            const ed = Math.hypot(P.x - e.x, P.y - e.y) || 1;
            const ev = (e.cross ? 0 : (e.speed ?? 60) * T);
            const ex = e.cross ? e.x + (e.cross.ux ?? 0) * 420 * T : e.x + (P.x - e.x) / ed * ev;
            const ey = e.cross ? e.y + (e.cross.uy ?? 0) * 420 * T : e.y + (P.y - e.y) / ed * ev;
            const gap = Math.hypot(x - ex, y - ey) - (e.r ?? 10) - (P.r ?? 14);
            sc += Math.exp(-gap / 22) * (e.isBoss ? 4 : 1) * (1 / T);
          }
          for (const q of shots) {
            const qx = q.x + (q.vx ?? 0) * T, qy = q.y + (q.vy ?? 0) * T;
            const gap = Math.hypot(x - qx, y - qy) - (q.r ?? 6) - (P.r ?? 14);
            sc += Math.exp(-gap / 18) * 2 / T;
          }
          for (const r of rects) if (x > r.x - 16 && x < r.x + r.w + 16 && y > r.y - 16 && y < r.y + r.h + 16) sc += 5;
          const hw = C.WORLD_W / 2 - 60, hh = C.WORLD_H / 2 - 60;
          const ox = Math.max(0, Math.abs(x) - hw), oy = Math.max(0, Math.abs(y) - hh);
          sc += (ox + oy) * 0.15;
          const cb = AR?.currentBounds?.();
          if (cb && cb.minX != null) { const m = 50; sc += (Math.max(0, cb.minX + m - x) + Math.max(0, x - cb.maxX + m) + Math.max(0, cb.minY + m - y) + Math.max(0, y - cb.maxY + m)) * 0.15; }
        }
        // 大きな輪をまわる (= 敵を後ろに引き連れる)。 輪の向きからずれるほど少し悪い
        const cb2 = AR?.currentBounds?.() ?? { minX: -C.WORLD_W / 2, maxX: C.WORLD_W / 2, minY: -C.WORLD_H / 2, maxY: C.WORLD_H / 2 };
        const ccx = (cb2.minX + cb2.maxX) / 2, ccy = (cb2.minY + cb2.maxY) / 2;
        const Rr = Math.min(cb2.maxX - cb2.minX, cb2.maxY - cb2.minY) * 0.32;
        const rx = P.x - ccx, ry = P.y - ccy, rd = Math.hypot(rx, ry) || 1;
        let tx = -ry / rd, ty = rx / rd;   // 時計まわり
        const corr = (Rr - rd) / Rr;       // 輪へ寄る
        tx += (rx / rd) * corr * 1.2; ty += (ry / rd) * corr * 1.2;
        const tn = Math.hypot(tx, ty) || 1;
        if (ux || uy) sc += (1 - (ux * tx + uy * ty) / tn) * 0.35; else sc += 0.8;
        if (target && td < 160) { const dd = Math.hypot(target.x - (P.x + ux * 40), target.y - (P.y + uy * 40)); sc += (dd - td) * 0.003; }
        if (sc < bestSc) { bestSc = sc; best = [ux, uy]; }
      }
      let vx = best[0], vy = best[1];
      const th = 0.38;
      setKey('KeyD', vx > th); setKey('KeyA', vx < -th); setKey('KeyS', vy > th); setKey('KeyW', vy < -th);
    };
    const iv = setInterval(tick, 40);
  }); }, K);
  res.errs = errs.length;
  results.push(res);
  console.log(LABEL, i, JSON.stringify(res));
  await ctx.close();
}
let next = 0;
await Promise.all(Array.from({ length: +PAR }, async () => { while (next < +RUNS) { const i = next++; await one(i).catch((e) => console.log(LABEL, i, 'ERR', e.message)); } }));
const clear = results.filter((r) => r.reason === 'clear').length;
const med = (a) => { const x = a.filter((v) => v != null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
console.log(`SUMMARY ${LABEL} runs=${results.length} clear=${clear} (${Math.round(clear / Math.max(1, results.length) * 100)}%) t150med=${med(results.map((r) => r.t150))} loseMed=${med(results.filter((r) => r.reason === 'lose').map((r) => r.end))} endMed=${med(results.map((r) => r.end))}`);
await b.close();
