// SPEC-055: 画面の切り替えのワイプ (= js/transition.js) と「演出を減らす」の属性 (= js/motion.js)
// 実行: node --test tests/transition.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { playWipe, WIPE_MS, WIPE_COVER_MS } from "../js/transition.js";
import { installReduceFxAttr } from "../js/motion.js";

test("覆いきるのはワイプの真ん中、 長さは 500〜700ms (= 憲章 9 章)", () => {
  assert.ok(WIPE_MS >= 500 && WIPE_MS <= 700);
  assert.equal(WIPE_COVER_MS, WIPE_MS / 2);
});

test("画面がない (= document がない) ときは、 すぐ差し替える", async () => {
  let n = 0;
  await playWipe(() => { n += 1; });
  assert.equal(n, 1);
});

test("差し替えの中で失敗しても、 例外を外に出さない", async () => {
  const err = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(playWipe(() => { throw new Error("boom"); }));
  } finally {
    console.error = err;
  }
});

test("「演出を減らす」の属性は、 画面がなくても例外を出さない", () => {
  assert.doesNotThrow(() => installReduceFxAttr());
});
