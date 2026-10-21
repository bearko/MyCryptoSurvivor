// SPEC-140: 合体ロボ (= スキルツリーで解放 → 壺・宝箱から出る → 拾うと無敵・虹色・BGM が変わる)
// 実行: node --test tests/robot.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { ROBOT_EXT_IDS, ROBOT_SEC, ROBOT_DROP_W, BGM_ROBOT, POT_DROPS, CHEST_DROPS } = await import("../js/constants.js");
const { withRobot, robotExtId, robotSec, NO_PERKS, computePerks, formatStat } = await import("../js/perks.js");
const { NODE_MAP, ROOT_ID } = await import("../js/skill-data.js");
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("段で絵のレアリティと無敵の秒が上がる (= 合体ロボシリーズ Common → Legendary)", () => {
  assert.deepEqual(ROBOT_EXT_IDS, [1123, 2123, 3123, 4123, 5123]);
  assert.deepEqual([1, 2, 3, 4, 5].map((r) => robotSec(r)), [3, 4, 5, 6, 8]);
  assert.deepEqual([1, 3, 5].map((r) => robotExtId(r)), [1123, 3123, 5123]);
  assert.equal(formatStat("robot", 5), "8 秒");
  assert.equal(BGM_ROBOT, "Audio/BGM/raid.mp3");
});

test("解放していなければ表に足さない・解放すれば壺と宝箱に入る", () => {
  assert.equal(withRobot(POT_DROPS, ROBOT_DROP_W.pot, 0), POT_DROPS);
  const t = withRobot(CHEST_DROPS, ROBOT_DROP_W.chest, 1);
  assert.deepEqual(t.at(-1), { kind: "robot", w: 15 });
  assert.equal(NO_PERKS.robot, 0);
  assert.equal(computePerks({ nodes: { [ROOT_ID]: 1, vit_hp: 1, vit_regen: 1, itm_robot: 3 } }).robot, 3);
  const n = NODE_MAP.itm_robot;
  assert.deepEqual([n.x, n.y, n.max, n.requires], [-3, 2, 5, ["vit_regen"]]);
});

test("つなぎ: 拾うと無敵 (= 被弾のあとの無敵と同じしくみ)・切れたら BGM を戻す・虹色に光る", () => {
  const f = read("js/battle/field.js");
  assert.match(f, /kind === "robot"\) \{\n\s+robotOn\(robotSec\(\)\)/);
  assert.match(f, /b\.contactCooldownMs = Math\.max\(b\.contactCooldownMs \?\? 0, ms\)/);
  assert.match(f, /startBgm\(BGM_ROBOT, 0\.32\)/);
  assert.match(f, /currentBgmPath\(\) === BGM_ROBOT\) startBgm\(prev, 0\.32\)/);
  assert.match(read("js/battle/index.js"), /tickRobot\(dt\);/);
  assert.match(read("js/battle/render.js"), /if \(robot\) _drawRainbowAura/);
  assert.match(read("js/battle/render.js"), /if \(kind === "robot"\) return robotExtId\(\)/);
});
