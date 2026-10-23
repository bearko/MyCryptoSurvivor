// SPEC-166: 三人一組のチーム編成
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTestHost, isTestSite, teamAvailable, normalizeTeam, toggleSub, withMain, subTarget, followStep, TEAM_MAX_SUBS } from "../js/team.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("テスト用のホストでだけ編成が出る (= 本番の survivor.bearko.games では出ない)", () => {
  assert.equal(isTestHost("survivor-test.bearko.games"), true);
  assert.equal(isTestHost("localhost"), true);
  assert.equal(isTestHost("survivor.bearko.games"), false);
  assert.equal(isTestSite("survivor-test.bearko.games"), true);
  assert.equal(isTestSite("localhost"), false, "ローカルでは全員解放・送信止めはしない (= 自動プレイを変えない)");
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 3 }), true);
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 2 }), false, "3 人そろうまでソロ");
  assert.equal(teamAvailable({ testHost: false, unlockedCount: 10 }), false);
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 10, story: true }), false, "ストーリーはソロ");
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 10, rta: true }), false, "RTA はソロ");
});

test("サブは 2 人まで・メインと重ならない・解放していない人は落とす", () => {
  const unlocked = new Set([10001, 4006, 2043, 2016]);
  assert.deepEqual(normalizeTeam({ subs: [4006, 4006, 10001, 9999, 2043, 2016] }, { main: 10001, unlocked }).subs, [4006, 2043]);
  let s = [];
  s = toggleSub(s, 4006, 10001); s = toggleSub(s, 2043, 10001); s = toggleSub(s, 2016, 10001);
  assert.equal(s.length, TEAM_MAX_SUBS, "満員なら入れない");
  assert.deepEqual(toggleSub(s, 4006, 10001), [2043], "押し直すと外れる");
  assert.deepEqual(toggleSub([], 10001, 10001), [], "メインはサブにしない");
  assert.deepEqual(withMain([4006, 2043], 4006), [2043], "サブの人をメインにしたら外す");
});

test("サブはメインの後ろの左右に立ち、 追いかけて寄る", () => {
  const up = { x: 0, y: -1 };
  const a = subTarget(0, 0, up, 0), b = subTarget(0, 0, up, 1);
  assert.ok(a.y > 0 && b.y > 0, "上へ進むと下 (= 後ろ)");
  assert.ok(a.x < 0 && b.x > 0, "左と右");
  const n = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1);
  assert.ok(n.x > 0 && n.x < 100);
  assert.deepEqual(followStep({ x: 5, y: 5 }, { x: 5, y: 5 }, 1), { x: 5, y: 5 });
});

test("配線: 武器は持ち主の位置から・サブの初期武器は武器の枠に・テスト用サイトは送らない", () => {
  const arch = read("../js/battle/archetypes.js");
  assert.ok(!/const px = state\.battle\.player\.x;/.test(arch), "撃つ位置はすべて weaponOrigin");
  assert.match(arch, /weaponOrigin\(o\.weaponExtId\)/, "ブレードはサブの周り");
  assert.match(arch, /weaponOrigin\(b\.weaponExtId\)/, "レーザーはサブから");
  assert.match(read("../js/battle/team-battle.js"), /STOCK_LIMIT_WEAPON/, "枠が埋まっていればサブの武器は入れない");
  assert.match(read("../js/battle/index.js"), /setupTeamBattle\(isTestHost\(\) && !isStory\(\) && !state\.rtaMode/);
  assert.match(read("../js/platform.js"), /!isTestSite\(\) \? window\.BearkoGames/);
  assert.match(read("../js/hero-unlock.js"), /if \(isTestSite\(\)\) return new Set/);
});
