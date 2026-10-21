// ============================================================
// tools/sim/balance.mjs — DPS の期待値と敵の流入 HP の机上 sim (= SPEC-163)。 ゲームの定数と純関数をそのまま読む
// ============================================================
// 使い方: node tools/sim/balance.mjs [--stage 0] [--k 0.3] [--gum 0] [--json out.json]
//   ステージを 1 秒刻みで回す: 湧き (= 間隔 × 洪水 × 群れ) → 敵の HP → 自分の DPS (= 装備の段から理論値 × 当たりやすさ) →
//   倒した数 → CE → 店で安い順に買う (= tools/autoplay/run.mjs と同じ買い方) → 装備の段が上がる。
//   「圧」 = 流入 HP/秒 ÷ DPS。 1 を超えると敵がたまり、 画面の敵が CRIT を超えたら倒れたとみなす。
//   数字は目安 (= 本番の答えは tools/autoplay/run.mjs の自動プレイ)。 この sim は「どの時刻でどちらが勝っているか」を速く見るためのもの
import { readFileSync } from "node:fs";
import {
  STAGE_TABLE, ENEMY_SPECS, WAVE_TABLE, ENEMY_SPAWN_INTERVAL_MS, SHOP_PRICE, SHOP_STAGE_MUL, SHOP_FIRST_MS, SHOP_EVERY_MS, SHOP_PER_STAGE,
  HERO_STARTING_WEAPON, EXT_MAX_LEVEL, BOSS_SPAWN_AT_MS,
} from "../../js/constants.js";
import { floodMul, densityTarget } from "../../js/battle/horde.js";
import { THREAT_TIERS, VARIANTS, VARIANT_CHANCE } from "../../js/battle/threat.js";
import { levelParams } from "../../js/ext-level.js";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const STAGE = Number(opt("stage", 0)), K = Number(opt("k", 0.3)), GUM_PERK = Number(opt("dmgPerk", 0)), JSON_OUT = opt("json", null), QUIET = args.includes("--quiet");
const EXT = JSON.parse(readFileSync(new URL("../../data/extensions.json", import.meta.url), "utf8")).extensions;
const byId = Object.fromEntries(EXT.map((e) => [String(e.extId), e]));

/** 当たりやすさ (= 理論値の何割が敵に入るか。 群れの中で測った目安) */
export const HIT_FACTOR = { radial: 0.75, orbit: 0.55, orbitClose: 0.5, bigHoming: 0.9, dropTarget: 1.0, stack: 0.7, beam: 1.0, diagonal: 0.45, randomRadial: 0.5, placeBomb: 0.8, homing: 0.9 };
/** 武器 1 本の DPS の期待値 (= 純関数)。 perks: { dmgMul, cdMul, bullets } */
export function weaponDps(ext, level, perks = {}) {
  if (!ext || ext.category !== "weapon") return 0;
  const p = level >= 16 && ext.ll ? ext.ll.params : levelParams(ext, level);
  const dmg = (p.dmg ?? 0) * (perks.dmgMul ?? 1);
  const cd = Math.max(0.1, ((p.cdMs ?? 1000) / 1000) * (perks.cdMul ?? 1));
  const bullets = (p.bullets ?? 1) + (perks.bullets ?? 0);
  const hf = HIT_FACTOR[ext.archetype] ?? 0.7;
  switch (ext.archetype) {
    case "orbit": case "orbitClose": return bullets * dmg * 4 * hf * 0.3;   // 0.25 秒ごとに同じ敵へ。 敵が触れているあいだだけ (= 実測: Blade Lv1 で 15〜20)
    case "beam": return dmg * ((p.durMs ?? 500) / 250) / cd * hf * 1.5;    // 250 ms ごと、 太さで 1.5 体
    case "placeBomb": return bullets * dmg / cd * hf * 3;                  // 爆発で 3 体
    case "dropTarget": return bullets * dmg / cd * hf * (1 + (p.aoeDmgRatio ?? 0.5) * 2);
    case "bigHoming": return bullets * dmg / cd * hf * (1 + (p.pierce ?? 0) * 0.8);
    case "stack": return bullets * (p.dirs ?? 1) * dmg / cd * hf;
    default: return bullets * dmg / cd * hf;
  }
}
/** 雑魚の平均 HP と CE (= 時刻の pool × 段階の型) */
export function enemyAvg(stage, elapsedMs, tier) {
  const pool = [...WAVE_TABLE].reverse().find((w) => elapsedMs >= w.fromMs)?.pool ?? [101];
  const base = pool.map((id) => ENEMY_SPECS[id]);
  let hp = base.reduce((a, s) => a + s.hp, 0) / base.length, xp = base.reduce((a, s) => a + s.xpValue, 0) / base.length;
  const ch = VARIANT_CHANCE[Math.min(tier, VARIANT_CHANCE.length - 1)] ?? {};
  let hpMul = 1, ceMul = 1;
  for (const [k, c] of Object.entries(ch)) { hpMul += c * ((VARIANTS[k]?.hpMul ?? 1) - 1); ceMul += c * ((VARIANTS[k]?.ceMul ?? 1) - 1); }
  return { hp: hp * (stage.enemyHpMul ?? 1) * hpMul, xp: Math.max(1, Math.round(xp * (stage.xpMul ?? 1))) * ceMul, pool };
}
/** 1 秒あたりの湧き (= 間隔 × 洪水 ＋ 群れ)。 密度の寄せ直しは「画面の目標」として別に返す */
export function spawnPerSec(stage, elapsedMs) {
  const base = 1000 / (ENEMY_SPAWN_INTERVAL_MS * (stage.spawnIntervalMul ?? 1)) * floodMul(stage.flood, elapsedMs);
  const f = stage.flood;
  const pack = f && elapsedMs >= f.packFromMs ? (f.packSize ?? 0) / ((f.packEveryMs ?? 1e9) / 1000) : 0;
  const dens = densityTarget(stage.density, elapsedMs);
  return { base, pack, total: base + pack, densityTarget: dens, screenCap: Math.round(dens * 390 * 760 / (Math.PI * 20 * 20)) };
}
export function tierOf(kills) { let t = 0; for (let i = 0; i < THREAT_TIERS.length; i++) if (kills >= THREAT_TIERS[i]) t = i; return t; }

/** 1 ステージを回す (= 純関数に近い。 乱数なし)。 build: [{extId, level}]。 返す: 1 秒ごとの行と結果 */
export function simStage({ stageIdx = 0, build = null, ce = 0, k = 0.3, dmgPerk = 0, crit = 70, buy = true, heroDmgMul = 1 } = {}) {
  const stage = STAGE_TABLE[stageIdx];
  const starter = HERO_STARTING_WEAPON[10001];
  let owned = build ? build.map((o) => ({ ...o })) : [{ extId: starter, level: 1 }];
  let alive = 0, kills = 0, dealt = 0, hp = 1, t = 0;
  const rows = [], perks = { dmgMul: (1 + dmgPerk) * heroDmgMul, cdMul: 1, bullets: 0 };
  const shops = Array.from({ length: SHOP_PER_STAGE }, (_, i) => SHOP_FIRST_MS[Math.min(stageIdx, SHOP_FIRST_MS.length - 1)] + i * SHOP_EVERY_MS);
  const price = (nextLv) => Math.max(5, Math.round(SHOP_PRICE[Math.min(SHOP_PRICE.length, nextLv) - 1] * SHOP_STAGE_MUL[Math.min(2, stageIdx)] / 5) * 5);
  const dps = () => owned.reduce((a, o) => a + weaponDps(byId[String(o.extId)], o.level, perks), 0);
  let died = null, bossAt = BOSS_SPAWN_AT_MS / 1000;
  for (t = 0; t <= bossAt; t++) {
    const ms = t * 1000;
    const tier = tierOf(kills);
    const en = enemyAvg(stage, ms, tier);
    const sp = spawnPerSec(stage, ms);
    // 密度の寄せ直し: 画面の敵が目標に満たなければ、 足りないぶんの 4 割を毎秒足す
    const topup = Math.max(0, sp.screenCap - alive) * 0.4;
    alive += sp.total + topup * 0.5;
    const d = dps();
    const killed = Math.min(alive, d / Math.max(1, en.hp));
    alive -= killed; kills += killed; dealt += killed * en.hp;
    ce += killed * en.xp;
    // 受けるダメージ: 画面の敵 1 体あたり 0.3% HP/秒 × K (= 目安)。 自然回復は 0
    hp -= alive * 0.003 * k;
    if (shops.includes(ms) && buy) {
      // 店: 安い順に買う (= 持っている武器の段上げ → 新しい武器 1 本)。 1 回の店で 4 枚まで
      for (let n = 0; n < 4; n++) {
        const cands = owned.filter((o) => o.level < EXT_MAX_LEVEL).map((o) => ({ o, p: price(o.level + 1) })).sort((a, b) => a.p - b.p);
        const newW = owned.length < 5 ? { o: null, p: price(1) } : null;
        const pick = [...cands, ...(newW ? [newW] : [])].sort((a, b) => a.p - b.p)[0];
        if (!pick || pick.p > ce) break;
        ce -= pick.p;
        if (pick.o) pick.o.level += 1; else owned.push({ extId: [1, 7, 8, 5, 9][owned.length - 1] ?? 1, level: 1 });
      }
    }
    const row = { t, spawn: +sp.total.toFixed(2), cap: sp.screenCap, hp: +en.hp.toFixed(0), inflow: +(sp.total * en.hp).toFixed(0), dps: +d.toFixed(0), pressure: +((sp.total * en.hp) / Math.max(1, d)).toFixed(2), alive: Math.round(alive), kills: Math.round(kills), ce: Math.round(ce), hpPct: Math.round(hp * 100), build: owned.map((o) => `${o.extId}:${o.level}`).join(" ") };
    rows.push(row);
    if (!died && (alive > crit || hp <= 0)) { died = t; break; }
  }
  return { stageIdx, rows, died, kills: Math.round(kills), ce: Math.round(ce), build: owned, dealt: Math.round(dealt) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = simStage({ stageIdx: STAGE, k: K, dmgPerk: GUM_PERK });
  if (!QUIET) {
    console.log(`stage ${STAGE + 1}  K=${K}  → ${r.died ? `死亡 ${r.died}s` : "ボスまで到達"}  kills=${r.kills} ce=${r.ce} build=[${r.build.map((o) => `${o.extId}:${o.level}`).join(" ")}]`);
    console.log("  t   spawn/s  cap  enemyHP  inflow/s   DPS  圧   alive  kills    ce  hp%  build");
    for (const row of r.rows) if (row.t % 20 === 0 || row.t === r.died) console.log(`${String(row.t).padStart(3)}  ${String(row.spawn).padStart(6)}  ${String(row.cap).padStart(3)}  ${String(row.hp).padStart(6)}  ${String(row.inflow).padStart(8)}  ${String(row.dps).padStart(4)}  ${String(row.pressure).padStart(4)}  ${String(row.alive).padStart(5)}  ${String(row.kills).padStart(5)}  ${String(row.ce).padStart(5)}  ${String(row.hpPct).padStart(3)}  ${row.build}`);
  }
  if (JSON_OUT) (await import("node:fs")).writeFileSync(JSON_OUT, JSON.stringify(r, null, 1));
}
