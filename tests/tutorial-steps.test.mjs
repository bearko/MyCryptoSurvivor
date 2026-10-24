// SPEC-174: チュートリアル (= ストーリー) の段を共通基盤へ (= 管理画面の「チュートリアル」タブで離脱を見る)
// 実行: node --test tests/tutorial-steps.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tutorialStepOf, allStoryIds, PROLOGUE } from "../js/story.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("段は 0 = 始めた、 1 = プロローグ、 2〜26 = 1-1〜5-5 (= 遊ぶ順。 最後は done)", () => {
  assert.deepEqual(tutorialStepOf("start"), { step: 0, id: "start" });
  assert.deepEqual(tutorialStepOf(PROLOGUE.id), { step: 1, id: "s1-0" });
  const ids = allStoryIds();
  assert.equal(ids.length, 25);
  ids.forEach((id, i) => {
    const t = tutorialStepOf(id);
    assert.equal(t.step, i + 2, id);
    assert.equal(t.id, i === ids.length - 1 ? "done" : `s${id}`);
    assert.match(t.id, /^[a-z0-9_-]{1,40}$/, "共通基盤が受け付ける形");
  });
  assert.equal(tutorialStepOf("5-5").step, 26);
  assert.equal(tutorialStepOf("9-9"), null);
});

test("送るところ: ストーリーのステージを始めたとき (= start) とクリアしたとき。 テスト用のサイトでは送らない", () => {
  assert.match(read("../js/battle/index.js"), /if \(isStory\(\)\) reportTutorialStep\(tutorialStepOf\("start"\)\);/);
  assert.match(read("../js/battle/stage-transition.js"), /reportTutorialStep\(tutorialStepOf\(r\.id\)\);/);
  assert.match(read("../js/platform.js"), /_sdkSend\(\)\?\.tutorialStep\?\.\(t\.step, t\.id\)/, "isTestMode なら送らない (= _sdkSend)");
});
