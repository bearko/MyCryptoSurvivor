// SPEC-061: ボスが出るまでのカウントダウン
import { test } from "node:test";
import assert from "node:assert/strict";
import { bossCountdownText, BOSS_BANNER_INTRO_MS, BOSS_COUNTDOWN_BIG_SEC } from "../js/battle/fx.js";
import { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } from "../js/constants.js";

test("残りの秒は切り上げて 0:30 → 0:01 と数える (= 0:00 は出たとき)", () => {
  assert.equal(bossCountdownText(BOSS_WARNING_LEAD_MS), "0:30");
  assert.equal(bossCountdownText(29001), "0:30");
  assert.equal(bossCountdownText(29000), "0:29");
  assert.equal(bossCountdownText(1), "0:01");
  assert.equal(bossCountdownText(0), "0:00");
  assert.equal(bossCountdownText(-500), "0:00");
  assert.equal(bossCountdownText(75000), "1:15");
});

test("予告の帯は大きく出たあと、 ボスが出る前にたたむ。 大きな数字は最後の数秒だけ", () => {
  assert.ok(BOSS_BANNER_INTRO_MS > 0 && BOSS_BANNER_INTRO_MS < BOSS_WARNING_LEAD_MS - BOSS_COUNTDOWN_BIG_SEC * 1000);
  assert.ok(BOSS_COUNTDOWN_BIG_SEC >= 3 && BOSS_COUNTDOWN_BIG_SEC <= 10);
  assert.ok(BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS > 0);
});
