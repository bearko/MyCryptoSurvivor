// SPEC-148: 負けた理由の分析 (= 被ダメの内訳・DPS・前回と自己ベストとの比較・マインちゃんのおすすめ)
// 実行: node --test tests/run-stats.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  newRunStats, tickRunStats, recordTaken, recordDown, recordDealt, recordHeal, recordKill, summarize,
  compareRow, pickBest, rememberRun, runLogKey, loadRunLog, saveRunLog, suggest, LOW_KILLS_PER_MIN, TAKEN_KINDS, LS_RUNLOG,
} from "../js/battle/run-stats.js";
import { NODE_MAP } from "../js/skill-data.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const ui = JSON.parse(read("../data/i18n/ui.json"));

function sampleRun() {
  const s = newRunStats();
  tickRunStats(s, 60);                        // 1 分
  recordTaken(s, "contact", 300, "クリーパー");
  recordTaken(s, "shot", 100, "バイトバンディット フラペチーノ");
  recordTaken(s, "boss", 50, "ヨシュカ");
  recordTaken(s, "gimmick", 50, "そろばんの珠");
  recordDealt(s, "w:10", 3000);
  recordDealt(s, "w:1", 1500);
  recordDealt(s, "sig", 500, true);
  recordHeal(s, "pancake", 40);
  recordHeal(s, "regen", 12.4);
  for (let i = 0; i < 120; i++) recordKill(s);
  recordTaken(s, "contact", 10, "疾走 クリーパー");
  recordDown(s);
  return s;
}

test("積んだ数字から、 DPS・撃破/分・被ダメの割合・武器の順を出す", () => {
  const sum = summarize(sampleRun(), { level: 12, stage: 1 });
  assert.equal(sum.sec, 60);
  assert.equal(sum.kills, 120);
  assert.equal(sum.killsPerMin, 120);
  assert.equal(sum.takenTotal, 510);
  assert.equal(sum.takenPerMin, 510);
  assert.equal(sum.dealtTotal, 5000);
  assert.equal(sum.dps, 83.3);
  assert.equal(sum.dealtBoss, 500);
  assert.deepEqual(sum.taken.map((x) => x.kind), [...TAKEN_KINDS]);
  assert.equal(sum.taken[0].pct, 61);   // 310 / 510
  assert.deepEqual(sum.weapons.map((w) => w.src), ["w:10", "w:1", "sig"]);
  assert.equal(sum.weapons[0].pct, 60);
  assert.equal(sum.healedTotal, 52);
  assert.deepEqual(sum.killer, { kind: "contact", name: "疾走 クリーパー" });
  assert.equal(sum.level, 12);
});

test("何も積んでいなくても落ちない (= 0 で割らない)", () => {
  const sum = summarize(newRunStats());
  assert.equal(sum.dps, 0);
  assert.equal(sum.killsPerMin, 0);
  assert.equal(sum.takenPerMin, 0);
  assert.equal(sum.killer, null);
  assert.equal(summarize(null).sec, 0);
  assert.equal(suggest(sum), null);
});

test("前回との差 (= 被ダメ/分 は少ないほうがよい)", () => {
  const now = { sec: 150, dps: 50, killsPerMin: 300, takenPerMin: 400 };
  const prev = { sec: 120, dps: 55, killsPerMin: 300, takenPerMin: 500 };
  assert.deepEqual(compareRow("sec", now, prev, "high"), { key: "sec", now: 150, prev: 120, delta: 30, up: true });
  assert.deepEqual(compareRow("dps", now, prev, "high"), { key: "dps", now: 50, prev: 55, delta: -5, up: false });
  assert.deepEqual(compareRow("killsPerMin", now, prev, "high").up, null);
  assert.deepEqual(compareRow("takenPerMin", now, prev, "low").up, true);
  assert.deepEqual(compareRow("sec", now, null, "high"), { key: "sec", now: 150, prev: null, delta: null, up: null });
});

test("自己ベストは長く生き残ったほう。 記録は前回の敗北・前回のクリア・自己ベストを別に持つ", () => {
  const a = { sec: 100, kills: 10 }, b = { sec: 100, kills: 20 }, c = { sec: 90, kills: 99 };
  assert.equal(pickBest(a, b), b);
  assert.equal(pickBest(b, c), b);
  assert.equal(pickBest(null, c), c);
  const key = runLogKey(7, { regulation: "NORMAL" });
  assert.equal(key, "7:NORMAL");
  assert.equal(runLogKey(7, { easy: true }), "7:EASY");   // EASY は別に数える
  let r = rememberRun({}, key, a, false);
  assert.equal(r.prev, null); assert.equal(r.best, null); assert.equal(r.newBest, false);
  r = rememberRun(r.log, key, b, false);
  assert.equal(r.prev, a); assert.equal(r.best, a); assert.equal(r.newBest, true);
  r = rememberRun(r.log, key, c, true);   // クリア
  assert.equal(r.prev, null);              // 前回のクリアはまだ無い
  assert.equal(r.best, b); assert.equal(r.newBest, false);
  assert.deepEqual(r.log[key], { lastDefeat: b, lastClear: c, best: b });
});

test("記録は localStorage に。 壊れていたら空から", () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadRunLog(storage), {});
  saveRunLog({ "1:NORMAL": { best: { sec: 1 } } }, storage);
  assert.equal(mem.has(LS_RUNLOG), true);
  assert.deepEqual(loadRunLog(storage), { "1:NORMAL": { best: { sec: 1 } } });
  mem.set(LS_RUNLOG, "[broken");
  assert.deepEqual(loadRunLog(storage), {});
  assert.deepEqual(loadRunLog({ getItem: () => { throw new Error("no"); } }), {});
});

test("マインちゃんのおすすめは被ダメの内訳で決まり、 節はすべて木にある", () => {
  const mk = (pcts, killsPerMin = 300) => ({
    takenTotal: 100, killsPerMin,
    taken: TAKEN_KINDS.map((kind) => ({ kind, amt: pcts[kind] ?? 0, pct: pcts[kind] ?? 0 })),
  });
  assert.deepEqual(suggest(mk({ shot: 50, contact: 50 })), { key: "advice.shot", nodes: ["vit_armor", "mov_ghost"] });
  assert.deepEqual(suggest(mk({ contact: 70, shot: 30 }, LOW_KILLS_PER_MIN - 1)), { key: "advice.crowdDps", nodes: ["atk_dmg", "atk_bullet"] });
  assert.deepEqual(suggest(mk({ contact: 70, shot: 30 }, LOW_KILLS_PER_MIN)), { key: "advice.crowdMove", nodes: ["mov_speed", "atk_range"] });
  assert.deepEqual(suggest(mk({ boss: 60, contact: 40 })), { key: "advice.boss", nodes: ["bos_dmg", "bos_tele"] });
  assert.deepEqual(suggest(mk({ gimmick: 45, contact: 55 })), { key: "advice.gimmick", nodes: [] });
  assert.deepEqual(suggest(mk({ contact: 40, shot: 30, boss: 30 })), { key: "advice.hp", nodes: ["vit_hp"] });
  for (const s of ["shot", "crowdDps", "crowdMove", "boss", "gimmick", "hp"]) {
    assert.ok(ui[`advice.${s}`]?.ja && ui[`advice.${s}`]?.en, s);
  }
  for (const id of ["vit_armor", "mov_ghost", "atk_dmg", "atk_bullet", "mov_speed", "atk_range", "bos_dmg", "bos_tele", "vit_hp"]) assert.ok(NODE_MAP[id], id);
});

test("与ダメは hitEnemy の出どころで、 被ダメは hurtPlayer の種類で記録する (= 配線)", () => {
  const dmg = read("../js/battle/damage.js");
  assert.match(dmg, /export function hitEnemy\(idx, dmg, src = "other"\)/);
  assert.match(dmg, /if \(!e\.isProp && src !== "gimmick"\) recordDealt\(state\.run\?\.stats, src, dmgInt, !!e\.isBoss\)/);   // 仕掛けは自分の火力ではない
  assert.match(dmg, /recordKill\(state\.run\?\.stats\)/);
  const hurt = read("../js/battle/hurt.js");
  assert.match(hurt, /recordTaken\(state\.run\?\.stats, k, takenInt/);
  assert.match(hurt, /recordDown\(state\.run\?\.stats\); triggerGameOver\(\);/);
  // 武器: 弾・周回・レーザー・爆弾・衝撃波のすべてに武器の id が乗る
  const arch = read("../js/battle/archetypes.js");
  assert.equal((arch.match(/weaponExtId: w\.extId,   \/\/ SPEC-148/g) ?? []).length, 8, "7 か所の _spawnProjectile と爆弾");
  assert.match(arch, /weaponExtId: opts\.weaponExtId \?\? null/);
  assert.match(arch, /hitEnemy\(j, o\.dmg, weaponSrc\(o\.weaponExtId\)\)/);
  assert.match(arch, /hitEnemy\(j, intDmg, weaponSrc\(b\.weaponExtId\)\)/);
  assert.match(arch, /hitEnemy\(j, b\.dmg, weaponSrc\(b\.weaponExtId\)\)/);
  assert.match(arch, /hitEnemy\(j, s\.dmg, weaponSrc\(s\.weaponExtId\)\)/);
  const proj = read("../js/battle/projectiles.js");
  assert.match(proj, /hitEnemy\(j, p\.dmg, weaponSrc\(p\.weaponExtId\)\)/);
  assert.match(proj, /weaponExtId: p\.weaponExtId \?\? null/);
  // 武器以外
  assert.match(read("../js/battle/field.js"), /hitEnemy\(i, [^;]*, "thunder"\)/);
  assert.match(read("../js/battle/index.js"), /tickSignature\(dt, \(j, d\) => hitEnemy\(j, d, "sig"\)\)/);
  assert.match(read("../js/battle/index.js"), /tickLLExtras\(dt, \(j, d\) => hitEnemy\(j, d, "ll"\)\)/);
  assert.match(read("../js/battle/gems.js"), /sigOnLevelUp\(levelUps, \(j, d\) => hitEnemy\(j, d, "sig"\)\)/);
  assert.equal((read("../js/battle/gimmicks.js").match(/"gimmick"/g) ?? []).length, 3);
  // 被ダメの種類: 接触 (= 名前つき)・弾・仕掛け。 ボスは hurt.js が boss から導く
  assert.match(read("../js/battle/enemies.js"), /hurtPlayer\(e\.dmg, \{ boss: !!e\.isBoss, name: enemyNameOf\(e\) \}\)/);
  assert.match(read("../js/battle/enemy-shots.js"), /kind: "shot", name: s\.from/);
  assert.match(read("../js/battle/gimmicks.js"), /kind: "gimmick", name/);
  // 回復: パンケーキ・自然回復・来店・見送りの礼 (= 店とレベルアップ)・不死鳥
  assert.match(read("../js/battle/field.js"), /recordHeal\(state\.run\?\.stats, "pancake"/);
  assert.match(read("../js/battle/buffs.js"), /recordHeal\(state\.run\?\.stats, "regen"/);
  assert.match(read("../js/battle/shop.js"), /recordHeal\(state\.run\?\.stats, "shop"/);
  assert.equal((read("../js/battle/shop.js").match(/recordHeal\(state\.run\?\.stats, "skip"/g) ?? []).length, 1);
  assert.match(read("../js/battle/levelup.js"), /recordHeal\(state\.run\?\.stats, "skip"/);
  assert.match(hurt, /recordHeal\(state\.run\?\.stats, "phoenix", hp\)/);
  // 挑戦の始まりで作り、 毎フレーム進める
  const idx = read("../js/battle/index.js");
  assert.match(idx, /state\.run\.stats = newRunStats\(\);/);
  assert.match(idx, /tickRunStats\(state\.run\.stats, dt\);/);
});

test("倒れた画面と全クリアの画面に表を出す。 倒れたときは木を始めていればおすすめを言う (= RTA では出さない)", () => {
  const go = read("../js/battle/gameover.js");
  assert.match(go, /analysis: reason !== "clear" \? collectAnalysis\(\{ cleared: false \}\) : null/);
  assert.match(go, /renderAnalysis\(document\.getElementById\("gameOverAnalysis"\), state\.lastRunStats\?\.analysis, \{\s*advice: !state\.rtaMode,/);
  assert.match(go, /openSkillTree\(\{ focus: id, returnTo: modal, retry: true \}\)/);
  assert.match(go, /const sug = guide \? null : suggest\(state\.lastRunStats\?\.analysis\?\.sum\);/);
  assert.match(go, /if \(sug\) lines\.push\(\.\.\.naviLines\("advice", \{ key: sug\.key, vars: adviceVars\(sug\) \}\)\);/);   // SPEC-150: 復活の 2 行目
  const ar = read("../js/battle/activity-report.js");
  assert.match(ar, /collectAnalysis\(\{ cleared: true \}\)/);
  assert.match(ar, /renderAnalysis\(document\.getElementById\("activityReportAnalysis"\), analysis\)/);
  const html = read("../index.html");
  assert.match(html, /id="gameOverAnalysis"/);   // SPEC-153: 「くわしく」の中
  assert.match(html, /id="activityReportAnalysis" data-reveal/);
  assert.match(read("../css/result-ui.css"), /\.anl__cmp \{/);
  for (const k of ["analysis.title", "analysis.titleClear", "analysis.taken", "analysis.killer", "analysis.dealt", "analysis.prevDefeat", "analysis.prevClear", "analysis.best",
    ...TAKEN_KINDS.map((k) => `analysis.kind.${k}`), ...["giant", "runner", "gatling", "crosser", "elite"].map((v) => `analysis.variant.${v}`)]) {
    assert.ok(ui[k]?.ja && ui[k]?.en, k);
  }
});
