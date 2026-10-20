// SPEC-105: 撃破数の節目
// 実行: node --test tests/milestones.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
const { state } = await import("../js/state.js");
const { nextMilestone, crossedMilestone, resetMilestones, totalKills, KILL_MILESTONES } = await import("../js/battle/milestones.js");

test("次の節目：表のあとは 5,000 ごと", () => {
  assert.equal(nextMilestone(0), 100);
  assert.equal(nextMilestone(99), 100);
  assert.equal(nextMilestone(100), 250);
  assert.equal(nextMilestone(9999), 10000);
  assert.equal(nextMilestone(10000), 15000);
  assert.equal(nextMilestone(14999), 15000);
  assert.equal(nextMilestone(15000), 20000);
  assert.deepEqual([...KILL_MILESTONES].slice(0, 4), [100, 250, 500, 1000]);
});

test("越えた節目：いちばん大きいものだけ（一度に 2 つ越えても 1 回）", () => {
  assert.equal(crossedMilestone(90, 99), 0);
  assert.equal(crossedMilestone(99, 100), 100);
  assert.equal(crossedMilestone(240, 600), 500);
  assert.equal(crossedMilestone(9990, 15010), 15000);
});

test("通算はステージの始まりの通算 ＋ そのステージの撃破数（ステージの終わりの足し込みで二重に数えない）", () => {
  state.run.totalKills = 0;
  state.killCount = 0;
  resetMilestones(0);
  state.killCount = 420;
  assert.equal(totalKills(), 420);
  state.run.totalKills = 420;   // ステージの終わりに足し込まれる (= killCount はまだ 420)
  assert.equal(totalKills(), 420, "足し込みのあとも同じ");
  resetMilestones(state.run.totalKills);
  state.killCount = 0;
  assert.equal(totalKills(), 420, "次のステージの頭");
  state.killCount = 100;
  assert.equal(totalKills(), 520);
});
