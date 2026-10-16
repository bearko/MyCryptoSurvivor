// SPEC-039: ステージ → トロフィー ID の対応と、SDK がない・失敗するときに例外を出さないこと。
// 実行: node --test tests/platform.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { trophyIdsForStageEnd, reportStageEnd, initPlatform } from "../js/platform.js";

const STAGES = 3; // js/constants.js の STAGE_TABLE（あかばす・ほれりす・とろい）

test("ステージ終了で送るトロフィー", () => {
  assert.deepEqual(trophyIdsForStageEnd(0, STAGES), ["survivor.stage1"]);
  assert.deepEqual(trophyIdsForStageEnd(1, STAGES), []);
  assert.deepEqual(trophyIdsForStageEnd(2, STAGES), ["survivor.clear"]);
});

test("SDK がなくても例外を出さない", () => {
  assert.doesNotThrow(() => initPlatform("0.1.0"));
  assert.doesNotThrow(() => reportStageEnd(0, STAGES));
});

test("SDK があれば unlockTrophy を呼び、失敗してもゲームを止めない", async () => {
  const sent = [];
  globalThis.window = {
    BearkoGames: {
      init: async () => ({ ok: true }),
      unlockTrophy: async (id) => { sent.push(id); return { ok: id !== "survivor.clear", error: "network" }; },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    initPlatform("0.1.0");
    reportStageEnd(0, STAGES);
    reportStageEnd(2, STAGES);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, ["survivor.stage1", "survivor.clear"]);
    globalThis.window.BearkoGames.unlockTrophy = () => { throw new Error("boom"); };
    assert.doesNotThrow(() => reportStageEnd(0, STAGES));
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});
