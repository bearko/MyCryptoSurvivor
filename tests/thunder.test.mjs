// SPEC-063: 雷鼓 (= 画面の敵すべてに雷)
import { test } from "node:test";
import assert from "node:assert/strict";
import { inView } from "../js/battle/field-geom.js";
import { boltPoints } from "../js/battle/fx.js";
import {
  POT_DROPS, CHEST_DROPS, CHEST_DROPS_RTA, THUNDER_BOSS_RATIO, THUNDER_EXT_ID, SFX,
} from "../js/constants.js";

test("画面に映っているか (= 半分見えている敵も入れる)", () => {
  assert.equal(inView(0, 0, 390, 760), true);
  assert.equal(inView(195, 380, 390, 760), true);
  assert.equal(inView(200, 0, 390, 760), false);
  assert.equal(inView(200, 0, 390, 760, 10), true);
  assert.equal(inView(0, -390, 390, 760, 10), true);
});

test("壺・宝箱から出る (= RTA の宝箱も)。 ボスには最大 HP の 20%", () => {
  for (const t of [POT_DROPS, CHEST_DROPS, CHEST_DROPS_RTA]) {
    assert.ok(t.some((e) => e.kind === "thunder" && e.w > 0));
  }
  // 宝箱の懐中時計の重みは変えていない (= RTA の最短時間の根拠)
  assert.equal(CHEST_DROPS_RTA.find((e) => e.kind === "watch").w, 50);
  assert.equal(THUNDER_BOSS_RATIO, 0.2);
  assert.equal(THUNDER_EXT_ID, 5071);
  assert.match(SFX.THUNDER, /^Audio\/SE\/Battle\/.+\.mp3$/);
});

test("稲妻は上から落ちて、 その敵に届く (= 形は seed で決まる)", () => {
  const a = boltPoints(100, 200, 0.3);
  assert.deepEqual(a.at(-1), { x: 100, y: 200 });
  assert.equal(a[0].x, 100);
  assert.ok(a[0].y < 200);
  assert.deepEqual(boltPoints(100, 200, 0.3), a);
});
