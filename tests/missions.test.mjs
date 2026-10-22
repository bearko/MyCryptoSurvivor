// SPEC-112: ミッション (= 出し手・効き目・持ちかける時刻・報酬・達成)
// 実行: node --test tests/missions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const {
  MISSIONS, MISSION_MAP, NO_MODS, modsOf, pickMission, planOffer, rewardChoices, BOONS, REWARD_SIZE, missionResult,
  MISSION_CHANCE, MISSION_PER_STAGE, tierOf, maxDurS, clampStar, loadStar, saveStar, missionDesc, STAR_KEY,
} = await import("../js/battle/missions.js");
const { spreadMul } = await import("../js/battle/enemy-shots.js");
const { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } = await import("../js/constants.js");

const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

test("出し手は 11 人 (= SPEC-103 7.4 の表 ＋ SPEC-138 の武田信玄。 シャドーの絵の番号)", () => {
  assert.deepEqual(MISSIONS.map((m) => m.giver), [481, 767, 450, 433, 468, 463, 893, 495, 445, 519, 467]);
  for (const m of MISSIONS) {
    for (const k of ["giver", "title", "desc"]) assert.ok(ui[`mission.${m.id}.${k}`]?.ja && ui[`mission.${m.id}.${k}`]?.en, `${m.id}.${k}`);
    assert.equal(m.tiers.length, 3, m.id);
    for (const x of m.tiers) assert.ok(x.durS >= 10 && x.durS <= 50, m.id);
    assert.ok(maxDurS(m) <= 50);
  }
});

test("効き目: 無いときは効かない値。 ミッションごとの中身 (= SPEC-137: ★で厳しくなる)", () => {
  assert.deepEqual(modsOf(null), NO_MODS);
  assert.deepEqual([1, 2, 3].map((s) => modsOf(MISSION_MAP.lubu, s).spawnMul), [4, 7, 10]);
  assert.deepEqual([1, 2, 3].map((s) => modsOf(MISSION_MAP.ripper, s).fogR), [240, 150, 70]);
  assert.ok(modsOf(MISSION_MAP.ripper, 3).fogA >= 0.98, "★3 はほとんど何も見えない");
  assert.equal(modsOf(MISSION_MAP.nobunaga, 2).shooterOnly, true);
  assert.deepEqual([1, 2, 3].map((s) => modsOf(MISSION_MAP.nobunaga, s).shotMul), [2, 3, 5]);
  assert.equal(modsOf(MISSION_MAP.cleopatra, 1).hiddenShots, true);
  assert.equal(modsOf(MISSION_MAP.shihuangdi, 1).noHeal, true);
  assert.deepEqual([1, 2, 3].map((s) => tierOf(MISSION_MAP.shihuangdi, s).durS), [20, 35, 50]);
  assert.deepEqual([1, 2, 3].map((s) => modsOf(MISSION_MAP.alexander, s).speedMul), [1.3, 1.6, 2]);
  assert.deepEqual([1, 2, 3].map((s) => modsOf(MISSION_MAP.xiangyu, s).dmgMul), [3, 6, 10]);
  assert.deepEqual([modsOf(MISSION_MAP.caocao, 2).sizeMul, modsOf(MISSION_MAP.caocao, 2).speedMul], [0.6, 1.2]);
  // 効き目のないもの (= 条件だけ) は、 ほかの値は効かない
  assert.deepEqual(modsOf(MISSION_MAP.napoleon, 3), NO_MODS);
  // 知らない★は ★1
  assert.deepEqual([0, 4, "x", null].map(clampStar), [1, 1, 1, 1]);
  // ★ごとに厳しくなる (= 秒か効き目か条件のどれかが ★1 ≦ ★2 ≦ ★3)
  for (const m of MISSIONS) {
    const sig = (s) => JSON.stringify(tierOf(m, s));
    assert.notEqual(sig(1), sig(2), m.id); assert.notEqual(sig(2), sig(3), m.id);
  }
});

test("SPEC-138: 風林火山 (= ★1 風林・★2 風林火・★3 風林火山。 すべて同時に効く)", () => {
  const s = MISSION_MAP.shingen;
  const has = (star) => { const m = modsOf(s, star); return [m.speedMul > 1, m.silent, m.spawnMul > 1, (m.playerSpeedMul ?? 1) < 1]; };   // 2026-10-22: 「山」は足が 1/10
  assert.deepEqual(has(1), [true, true, false, false]);
  assert.deepEqual(has(2), [true, true, true, false]);
  assert.deepEqual(has(3), [true, true, true, true]);
  assert.equal(s.giver, 519);
  for (const k of ["x1", "x2", "x3", "thanks"]) assert.ok(ui[`mission.shingen.${k}`]?.ja && ui[`mission.shingen.${k}`]?.en, k);
  assert.equal(NO_MODS.silent, false); assert.equal(NO_MODS.noMove, false); assert.equal(NO_MODS.playerSpeedMul, 1);
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(read("js/battle/player.js"), /\* missionPlayerSpeedMul\(\)/, "足が 1/10 (= 動けないではなく)");
  assert.match(read("js/audio.js"), /if \(_seMuted \|\| _silent\) return;/);
  assert.match(read("js/battle/missions.js"), /setMissionSilence\(!!missionMods\(\)\.silent\)/);
});

test("SPEC-137: 選んだ★を覚えておく・説明の数は★で変わる", () => {
  const m = new Map(); const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(loadStar(st), 1, "初めては ★1");
  saveStar(3, st); assert.equal(m.get(STAR_KEY), "3"); assert.equal(loadStar(st), 3);
  assert.equal(loadStar({ getItem: () => { throw new Error("x"); } }), 1);
  assert.match(ui["mission.lubu.desc"].ja, /\{n\}/);
  assert.match(ui["mission.napoleon.desc"].ja, /\{s\}.*\{n\}/);
  for (const s of [1, 2, 3]) assert.ok(ui[`mission.ripper.x${s}`]?.ja && ui[`mission.ripper.x${s}`]?.en);
  assert.equal(typeof missionDesc(MISSION_MAP.lubu, 2), "string");
});

test("持ちかける人: 同じ人が続けて来ない・プレイ中のヒーローと同じ人は出さない", () => {
  for (const m of MISSIONS) for (const r of [0, 0.3, 0.6, 0.99]) assert.notEqual(pickMission({ prevId: m.id, rnd: () => r }).id, m.id);
  for (const r of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.99]) assert.notEqual(pickMission({ heroId: 2003, rnd: () => r }).id, "ripper");
});

test("持ちかける時刻: 店のあと 10〜30 秒。 1 回目の店の前・上限・次の店の 10 秒前・ボスの予告に重なるなら出さない", () => {
  assert.equal(MISSION_CHANCE, 0.4);
  assert.equal(MISSION_PER_STAGE, 3);
  // ステージ 1: 店は 0:10 / 0:50 / … → 1 回目の店のあとは 0:20〜0:40
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 1, durS: 30, count: 0, rolls: [0, 0] }), 20000);
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 1, durS: 30, count: 0, rolls: [0, 1] }), 40000);
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 1, durS: 30, count: 0, rolls: [0.5, 0] }), null);   // 4 割に入らない
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 0, durS: 30, count: 0, rolls: [0, 0] }), null);     // 最初の店の前
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 2, durS: 30, count: 3, rolls: [0, 0] }), null);     // 1 ステージ 3 回まで
  // 最後の店 (= 3:30) のあとは、 終わりがボスの予告 (= 3:50) に重なるので出さない
  assert.equal(planOffer({ stageIdx: 0, waveIdx: 6, durS: 20, count: 0, rolls: [0, 0] }), null);
  // どの時刻でも、 終わりはボスの予告より前
  for (let w = 1; w <= 6; w++) for (const r of [0, 0.5, 1]) {
    const at = planOffer({ stageIdx: 1, waveIdx: w, durS: 40, count: 0, rolls: [0, r] });
    if (at != null) assert.ok(at + 40000 <= BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS);
  }
});

test("SPEC-125 + 137: ごほうびは 3 つから選ぶ。 ★で大きさが変わり、 ギフト券は ★2 から (= ★1 は CE)", () => {
  assert.deepEqual(rewardChoices(MISSION_MAP.lubu, 3), [{ kind: "gift", n: 2 }, { kind: "boon", boon: "power", sec: 30 }, { kind: "heal", ratio: 1 }]);
  assert.deepEqual(rewardChoices(MISSION_MAP.ripper, 2), [{ kind: "gift", n: 1 }, { kind: "boon", boon: "swift", sec: 20 }, { kind: "heal", ratio: 0.5 }]);
  assert.deepEqual(rewardChoices(MISSION_MAP.ripper, 1), [{ kind: "ce", n: 300 }, { kind: "boon", boon: "swift", sec: 15 }, { kind: "heal", ratio: 0.3 }]);
  assert.deepEqual(rewardChoices(MISSION_MAP.ripper, 1, 2)[0], { kind: "ce", n: 780 }, "ステージの値段の倍率 (×2.6)");
  assert.deepEqual(rewardChoices(MISSION_MAP.nobunaga, 2)[1], { kind: "boon", boon: "thunder", sec: 0 });   // お助けアイテムはその場で
  assert.deepEqual(rewardChoices(MISSION_MAP.nightingale, 1)[1], { kind: "boon", boon: "guard", sec: 5 });   // 無敵は 1/3
  for (const m of MISSIONS) {
    assert.ok(BOONS[m.boon], `${m.id} の力添え`);
    for (const s of [1, 2, 3]) assert.equal(rewardChoices(m, s).length, 3);
    assert.ok(!rewardChoices(m, 1).some((c) => c.kind === "gift"), "★1 にギフト券は無い");
  }
  for (const s of [1, 2, 3]) assert.ok(REWARD_SIZE[s]);
});

test("達成: 時間まで生き残る。 白衣の誓いは当たると失敗、 不可能の文字はないは 200 体で達成", () => {
  const m = MISSION_MAP.lubu;
  assert.equal(missionResult({ mission: m, star: 3, remainMs: 5000 }), null);
  assert.equal(missionResult({ mission: m, remainMs: 0 }), "clear");
  const n = MISSION_MAP.nightingale;
  assert.equal(missionResult({ mission: n, star: 2, remainMs: 5000, hit: true }), "fail");
  assert.equal(missionResult({ mission: n, star: 2, remainMs: 0, hit: false }), "clear");
  const p = MISSION_MAP.napoleon;
  assert.equal(missionResult({ mission: p, star: 2, remainMs: 9000, kills: 200 }), "clear");   // 届いたらすぐ
  assert.equal(missionResult({ mission: p, star: 2, remainMs: 9000, kills: 120 }), null);
  assert.equal(missionResult({ mission: p, star: 2, remainMs: 0, kills: 199 }), "fail");
  assert.equal(missionResult({ mission: p, star: 1, remainMs: 9000, kills: 100 }), "clear");
  assert.equal(missionResult({ mission: p, star: 3, remainMs: 0, kills: 349 }), "fail");
});

test("三段撃ち: 1 発を 3 発に (= 真ん中と左右)", () => {
  const a = spreadMul(1, 3);
  assert.equal(a.length, 3);
  assert.equal(a[0], 1);
  assert.ok(a[1] > 1 && a[2] < 1);
});

test("つなぎ: 戦闘の各所が効き目を読む・ショップで遊ぶときだけ・画面と文言", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(read("js/battle/enemies.js"), /\/ mods\.spawnMul;/);
  assert.match(read("js/battle/enemies.js"), /e\.speed \* mods\.speedMul/);
  assert.match(read("js/battle/hurt.js"), /missionMods\(\)\.dmgMul/);
  assert.match(read("js/battle/hurt.js"), /missionOnHurt\(\)/);
  assert.match(read("js/battle/buffs.js"), /if \(!canHeal\(\)\) return;/);
  assert.match(read("js/battle/render.js"), /if \(mods\.fogR\) _drawFog/);
  assert.match(read("js/battle/index.js"), /resetMissionsForStage\(!!state\.shop\)/);
  const html = read("index.html");
  for (const id of ["missionOffer", "missionAccept", "missionDecline", "missionBar", "missionResult"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('href="css/missions.css"'));
  for (const k of ["mission.accept", "mission.decline", "mission.fail", "mission.failSub", "mission.reward.gift", "mission.reward.heal", "mission.reward.pick", "mission.rewardAsk", "mission.bar.boost"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  // SPEC-125: ごほうびの画面・出し手のひとこと・力添えの名前・効き目のつなぎ
  for (const id of ["missionOfferStars"]) assert.ok(html.includes(`id="${id}"`), id);   // SPEC-137
  assert.match(read("js/battle/render.js"), /rgba\(226, 230, 238/, "霧は白");
  for (const k of ["navi.mission.1", "navi.mission.2", "mission.reward.ce", "mission.reward.pickGum"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  for (const id of ["missionReward", "missionRewardLine", "missionRewardChoices"]) assert.ok(html.includes(`id="${id}"`), id);
  for (const m of MISSIONS) assert.ok(ui[`mission.${m.id}.thanks`]?.ja && ui[`mission.${m.id}.thanks`]?.en, `${m.id}.thanks`);
  for (const b of Object.keys(BOONS)) assert.ok(ui[`mission.boon.${b}`]?.ja && ui[`mission.boon.${b}.detail`]?.en, b);
  assert.match(read("js/battle/damage.js"), /dmg \*= boostDmgMul\(\)/);
  assert.match(read("js/battle/player.js"), /boostSpeedMul\(\)/);
});
