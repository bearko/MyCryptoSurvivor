// SPEC-045: 戦闘の手ごたえの純関数 (= 粒の数・上限・減衰)。
// 実行: node --test tests/fx.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { burstCount, capParticles, decay, MAX_PARTICLES } from "../js/battle/fx.js";

test("撃破の粒は 雑魚 < レア < ボス", () => {
  assert.equal(burstCount("normal"), 6);
  assert.equal(burstCount("rare"), 14);
  assert.equal(burstCount("boss"), 32);
  assert.equal(burstCount("unknown"), 6);
});

test("粒は上限を超えたら古いものから捨てる", () => {
  const arr = Array.from({ length: MAX_PARTICLES + 10 }, (_, i) => i);
  capParticles(arr);
  assert.equal(arr.length, MAX_PARTICLES);
  assert.equal(arr[0], 10);   // 先頭 (= 古い) 10 個が消えた
  const small = [1, 2, 3];
  capParticles(small, 5);
  assert.deepEqual(small, [1, 2, 3]);
});

test("減衰は lifeMs で 1 → 0、 0 より下がらない", () => {
  assert.equal(decay(1, 175, 350), 0.5);
  assert.equal(decay(0.2, 1000, 350), 0);
  assert.equal(decay(1, 16, 0), 0);
});
