// SPEC-177: ストーリーを終えたら「ここからが本番」 (= NORMAL のボス・開いたもの・回り方を 1 枚で。 ボタン 1 つで NORMAL へ)
// 実行: node --test tests/post-story.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldShowPostStory, markPostStoryShown, normalBosses, LS_POST_STORY } from "../js/post-story.js";
import { tutorialStepOf } from "../js/story.js";
import { STAGE_TABLE } from "../js/constants.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test("出すのは 1 回だけ (= mcs.postStory)。 storage が無い・壊れているときは出さない", () => {
  const s = mem();
  assert.equal(LS_POST_STORY, "mcs.postStory");
  assert.equal(shouldShowPostStory(s), true);
  markPostStoryShown(s);
  assert.equal(shouldShowPostStory(s), false);
  assert.equal(shouldShowPostStory(null), false);
  assert.equal(shouldShowPostStory({ getItem() { throw new Error("blocked"); } }), false);
});

test("ボスは NORMAL の 3 つのノードの順", () => {
  assert.deepEqual(normalBosses().map((b) => b.enemyId), STAGE_TABLE.map((s) => s.bossEnemyId));
  assert.equal(normalBosses().length, 3);
});

test("チュートリアルの段: 27 = この画面、 28 = NORMAL を始めた (= done の 26 の先)", () => {
  assert.deepEqual(tutorialStepOf("next"), { step: 27, id: "next" });
  assert.deepEqual(tutorialStepOf("normal"), { step: 28, id: "normal" });
  assert.match(read("../js/post-story.js"), /reportTutorialStep\(tutorialStepOf\("next"\)\)/);
  assert.match(read("../js/battle/index.js"), /!state\.rtaMode && state\.regulation === REGULATION_NORMAL && \(state\.currentStageIdx \?\? 0\) === 0\) reportTutorialStep\(tutorialStepOf\("normal"\)\)/);
});

test("出すところ: 5-5 のあと (= モード選択の代わり) と、 終えたのに NORMAL を遊び終えていない人がタイトルから入るとき", () => {
  assert.match(read("../js/story-map.js"), /if \(!shouldShowPostStory\(\)\) \{ _onBack\?\.\(\); return; \}/);
  assert.match(read("../js/main.js"), /hasClearedEasy\(\) && !hasPlayed\(\) && shouldShowPostStory\(\)/);
  assert.match(read("../js/mode-select.js"), /export function pickNormal\(\) \{ _pick\(REGULATION_NORMAL\); \}/);
});

test("画面: ボタンは 1 つ (= NORMAL に挑む)。 Extra パネルは予告しない (= 作者 2026-10-26)", () => {
  const html = read("../index.html");
  const sec = html.slice(html.indexOf('id="postStoryScreen"'), html.indexOf("</section>", html.indexOf('id="postStoryScreen"')));
  assert.equal((sec.match(/<button/g) ?? []).length, 1);
  assert.match(sec, /id="postStoryGo"/);
  assert.doesNotMatch(sec, /Extra|EXTRA/);
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  for (const k of ["postStory.title", "postStory.go", "postStory.loop.run", "postStory.loop.gum", "postStory.loop.tree", "postStory.loop.far", "story.clear.toNext"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});
