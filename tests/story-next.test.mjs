// SPEC-180: ストーリーの区切りで「次」を見せる (= あと◯ と、 ランドを取り戻したときは次のランドで開くもの)
// 実行: node --test tests/story-next.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { storyNextInfo, LAND_NEXT, LANDS, allStoryIds } from "../js/story.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const upTo = (id) => { const ids = allStoryIds(); return ids.slice(0, ids.indexOf(id) + 1); };

test("あと◯: クリアした数・NORMAL までの残り・絆 (= 試練のある 5 人)", () => {
  const i = storyNextInfo("2-5", { cleared: ["1-0", ...upTo("2-5")], bonds: ["alexander", "lubu", "unknown"] });
  assert.equal(i.total, 25);
  assert.equal(i.done, 10, "プロローグ (1-0) は数えない");
  assert.equal(i.left, 15);
  assert.equal(i.bondTotal, 5);
  assert.equal(i.bonds, 2, "知らない名前は数えない");
});

test("次のランドのカードは、 ランドの最後 (= x-5) だけ。 5-5 (= NORMAL) と途中には出さない", () => {
  const p = { cleared: [], bonds: [] };
  assert.equal(storyNextInfo("2-3", p).nextLand, null);
  assert.equal(storyNextInfo("5-5", p).nextLand, null);
  assert.deepEqual(["1-5", "2-5", "3-5", "4-5"].map((id) => storyNextInfo(id, p).nextLand?.key), ["shadow", "tree", "mission", "zeus"]);
  assert.equal(storyNextInfo("2-5", p).nextLand.id, "tangerine", "W2 のあとはスキルツリー (= いちばん離れる場所)");
});

test("どのランドにも、 絵・名前・ひとこと (= 予告はワールドマップの札と同じ hint)", () => {
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  for (const land of LANDS.filter((l) => l.w >= 2)) {
    const n = LAND_NEXT[land.id];
    assert.ok(n?.icon, land.id);
    for (const k of [`storyNext.${n.key}`, `storyNext.${n.key}.sub`, `story.land.${land.id}.hint`]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  }
  assert.match(ui["storyNext.tree.sub"].ja, /\{gum\}/, "W2 のあとは、 いまの GUM を見せる");
});

test("結果の画面: ストーリーのクリアで描く (= プロローグと 5-5 では出さない。 ストーリーの外では隠す)", () => {
  const src = read("../js/battle/stage-transition.js");
  assert.match(src, /_renderStoryNext\(story\);/);
  assert.match(src, /story\.id === PROLOGUE\.id \|\| story\.unlock === "mode:NORMAL" \? null : storyNextInfo\(story\.id, loadStory\(\)\)/);
  assert.match(src, /document\.getElementById\("stageTransitionNext"\)\?\.classList\.add\("hidden"\);/);
  assert.match(read("../index.html"), /id="stageTransitionNext"/);
});
