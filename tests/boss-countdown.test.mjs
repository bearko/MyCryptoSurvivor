// SPEC-061: ボスが出るまでのカウントダウン
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bossCountdownText, BOSS_BANNER_INTRO_MS, BOSS_COUNTDOWN_BIG_SEC } from "../js/battle/fx.js";
import { BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS } from "../js/constants.js";

test("予告はボスの 10 秒前 (= SPEC-071。 30 秒は長い)", () => {
  assert.equal(BOSS_WARNING_LEAD_MS, 10000);
});

test("残りの秒は切り上げて 0:10 → 0:01 と数える (= 0:00 は出たとき)", () => {
  assert.equal(bossCountdownText(BOSS_WARNING_LEAD_MS), "0:10");
  assert.equal(bossCountdownText(9001), "0:10");
  assert.equal(bossCountdownText(9000), "0:09");
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

test("RTA のときは、 たたんだ帯を右端に縦に積む (= 上の真ん中の RTA の時計と重ねない。 SPEC-071)", () => {
  const css = readFileSync(new URL("../css/battle-ui.css", import.meta.url), "utf8");
  const rule = css.match(/\.boss-banner\.boss-banner--compact\.boss-banner--rta\s*\{([^}]*)\}/);
  assert.ok(rule, "RTA の帯の決まりがある");
  assert.match(rule[1], /left:\s*auto/);
  assert.match(rule[1], /right:/);
  assert.match(rule[1], /flex-direction:\s*column/);
  const fx = readFileSync(new URL("../js/battle/fx.js", import.meta.url), "utf8");
  assert.match(fx, /classList\.toggle\("boss-banner--rta", !!state\.rtaMode\)/);
});
