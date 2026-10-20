// SPEC-112: ミッション (= 出し手・効き目・持ちかける時刻・報酬・達成)
// 実行: node --test tests/missions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const {
  MISSIONS, MISSION_MAP, NO_MODS, modsOf, pickMission, planOffer, rewardOf, missionResult,
  MISSION_CHANCE, MISSION_PER_STAGE,
} = await import("../js/battle/missions.js");
const { spreadMul } = await import("../js/battle/enemy-shots.js");
const { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } = await import("../js/constants.js");

const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

test("出し手は 10 人 (= SPEC-103 7.4 の表。 シャドーの絵の番号)", () => {
  assert.deepEqual(MISSIONS.map((m) => m.giver), [481, 767, 450, 433, 468, 463, 893, 495, 445, 467]);
  for (const m of MISSIONS) {
    for (const k of ["giver", "title", "desc"]) assert.ok(ui[`mission.${m.id}.${k}`]?.ja && ui[`mission.${m.id}.${k}`]?.en, `${m.id}.${k}`);
    assert.ok(m.durS >= 20 && m.durS <= 40, m.id);
  }
});

test("効き目: 無いときは効かない値。 ミッションごとの中身", () => {
  assert.deepEqual(modsOf(null), NO_MODS);
  assert.equal(modsOf(MISSION_MAP.lubu).spawnMul, 10);
  assert.equal(modsOf(MISSION_MAP.ripper).fogR, 180);
  assert.equal(modsOf(MISSION_MAP.nobunaga).shooterOnly, true);
  assert.equal(modsOf(MISSION_MAP.nobunaga).shotMul, 3);
  assert.equal(modsOf(MISSION_MAP.cleopatra).hiddenShots, true);
  assert.equal(modsOf(MISSION_MAP.shihuangdi).noHeal, true);
  assert.equal(modsOf(MISSION_MAP.alexander).speedMul, 1.6);
  assert.equal(modsOf(MISSION_MAP.xiangyu).dmgMul, 10);
  assert.deepEqual([modsOf(MISSION_MAP.caocao).sizeMul, modsOf(MISSION_MAP.caocao).speedMul], [0.6, 1.2]);
  // 効き目のないもの (= 条件だけ) は、 ほかの値は効かない
  assert.deepEqual(modsOf(MISSION_MAP.napoleon), NO_MODS);
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

test("報酬: CE はステージの値段の倍率を掛ける。 固有スキルが上がりきっていれば CE", () => {
  assert.deepEqual(rewardOf(MISSION_MAP.ripper, { stageIdx: 0 }), { ce: 80 });
  assert.deepEqual(rewardOf(MISSION_MAP.ripper, { stageIdx: 1 }), { ce: 145 });   // 80 × 1.8 = 144 → 145
  assert.deepEqual(rewardOf(MISSION_MAP.lubu, { stageIdx: 0, sigLevel: 2 }), { sig: 1 });
  assert.deepEqual(rewardOf(MISSION_MAP.lubu, { stageIdx: 2, sigLevel: 5 }), { ce: 390 });   // 150 × 2.6
  assert.deepEqual(rewardOf(MISSION_MAP.nobunaga), { gift: 1 });
  assert.deepEqual(rewardOf(MISSION_MAP.caocao), { ban: 1 });
});

test("達成: 時間まで生き残る。 白衣の誓いは当たると失敗、 不可能の文字はないは 200 体で達成", () => {
  const m = MISSION_MAP.lubu;
  assert.equal(missionResult({ mission: m, remainMs: 5000 }), null);
  assert.equal(missionResult({ mission: m, remainMs: 0 }), "clear");
  const n = MISSION_MAP.nightingale;
  assert.equal(missionResult({ mission: n, remainMs: 5000, hit: true }), "fail");
  assert.equal(missionResult({ mission: n, remainMs: 0, hit: false }), "clear");
  const p = MISSION_MAP.napoleon;
  assert.equal(missionResult({ mission: p, remainMs: 9000, kills: 200 }), "clear");   // 届いたらすぐ
  assert.equal(missionResult({ mission: p, remainMs: 9000, kills: 120 }), null);
  assert.equal(missionResult({ mission: p, remainMs: 0, kills: 199 }), "fail");
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
  for (const k of ["mission.accept", "mission.decline", "mission.clear", "mission.fail", "mission.failSub", "mission.reward.sig", "mission.reward.ce", "mission.reward.gift", "mission.reward.ban"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});
