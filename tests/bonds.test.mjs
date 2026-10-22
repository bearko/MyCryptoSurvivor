// SPEC-165 行 W: EASY の撤去・NORMAL のロックはストーリーのあと・絆の報酬は NORMAL でも・survivor.story
// 実行: node --test tests/bonds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { bondUnlocked, bondedGivers } from "../js/bonds.js";
import { pickMission, BONDED_GIVER_WEIGHT, MISSIONS } from "../js/battle/missions.js";
import { achievementIdsForStory } from "../js/platform.js";
import { storyAllCleared, allStoryIds } from "../js/story.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const P = (bonds) => ({ cleared: [], best: {}, bonds, loadout: null });

test("絆で開くもの: 信長の絆で雷鼓 30%。 NORMAL をすでに遊べる人 (= veteran) は最初から全部", () => {
  assert.equal(bondUnlocked("passive:thunder30", { progress: P([]), veteran: false }), false);
  assert.equal(bondUnlocked("passive:thunder30", { progress: P(["nobunaga"]), veteran: false }), true);
  assert.equal(bondUnlocked("passive:thunder30", { progress: P([]), veteran: true }), true);
  assert.equal(bondUnlocked("item:watch", { progress: P(["alexander"]), veteran: false }), true);
  assert.match(read("../js/perks.js"), /bondUnlocked\("passive:thunder30"\) \? 0\.3 : 0/);
});

test("ミッションの出し手: 絆のある人が 3 倍出やすい (= 無い人を外しはしない)", () => {
  assert.deepEqual([...bondedGivers(P(["lubu", "alexander"]))].sort(), ["alexander", "lubu"]);
  assert.equal(BONDED_GIVER_WEIGHT, 3);
  const bonded = new Set(["lubu"]);
  const n = 20000; let hit = 0;
  for (let i = 0; i < n; i++) if (pickMission({ rnd: Math.random, bonded }).id === "lubu") hit++;
  const expect = BONDED_GIVER_WEIGHT / (MISSIONS.length - 1 + BONDED_GIVER_WEIGHT);
  assert.ok(Math.abs(hit / n - expect) < 0.02, `呂布 ${(hit / n).toFixed(3)} ≒ ${expect.toFixed(3)}`);
  // 絆が無ければ均等。 rnd を固定すれば決まる
  assert.equal(pickMission({ rnd: () => 0 }).id, MISSIONS[0].id);
  assert.equal(pickMission({ rnd: () => 0.999 }).id, MISSIONS[MISSIONS.length - 1].id);
  assert.match(read("../js/battle/missions.js"), /bonded: bondedGivers\(\)/);
});

test("survivor.story: 25 ステージを全部クリアしたときだけ (= 5-5 のクリアで送る)", () => {
  assert.deepEqual(achievementIdsForStory({ cleared: [] }, storyAllCleared), []);
  assert.deepEqual(achievementIdsForStory({ cleared: allStoryIds().slice(0, -1) }, storyAllCleared), []);
  assert.deepEqual(achievementIdsForStory({ cleared: allStoryIds() }, storyAllCleared), ["survivor.story"]);
  assert.match(read("../js/battle/stage-transition.js"), /reportStoryAllClear\(progress, storyAllCleared\)/);
});

test("EASY は撤去 (= 札・ステージ・レッスン・根まで弱いヒーロー・負ける設計のゲート)。 NORMAL のロックはストーリーを最後まで", () => {
  for (const f of ["../js/lesson.js", "../js/lesson-cursor.js", "../tools/autoplay/easy.mjs", "./easy.test.mjs", "./easy-guide-164.test.mjs"]) assert.ok(!existsSync(new URL(f, import.meta.url)), `${f} は無い`);
  const all = ["js/easy.js", "js/mode-select.js", "js/main.js", "js/state.js", "js/battle/index.js", "js/battle/gameover.js", "js/battle/activity-report.js", "js/navi.js", "index.html"].map((f) => read("../" + f)).join("\n");
  assert.doesNotMatch(all, /easyMode|EASY_STAGES|LESSON_KEYS|easyHeroMul|showLesson|btnModeEasy|modeCardEasy|activityReportToNormal/);
  const go = read("../js/battle/gameover.js");
  assert.doesNotMatch(go, /gameover-modal--gate", gate\)/, "根なしのゲートは無い");
  assert.match(go, /again\?\.classList\.remove\("hidden"\);/, "倒れたら いつでも「復活する」");
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  for (const k of Object.keys(ui)) assert.ok(!k.startsWith("lesson.") && !["mode.easyDesc", "mode.startEasy", "navi.mode.easy", "report.easyTitle", "navi.stage.first.easy"].includes(k), `${k} は消した`);
  assert.match(ui["hero.lock.easyReward"].ja, /3-1/, "ビリーはストーリー 3-1");
  // 録音は残し、 鳴らさない
  const navi = read("../js/navi.js");
  for (const v of ["mode.easy", "stage.1.easy", "lesson.s1.move", "lesson.s2.clear"]) assert.ok(navi.includes(`"${v}"`), `${v} は RETIRED`);
});

test("台本: ストーリーの日本語のセリフは 1 列の CSV (= 文の中に改行なし・変数なし・マインと相手で別)", () => {
  const mine = read("../docs/voice/script-story-mine.csv"), others = read("../docs/voice/script-story-others.csv");
  for (const csv of [mine, others]) { for (const l of csv.replace(/^\ufeff/, "").trim().split("\n")) { assert.match(l, /^"(?:[^"]|"")*"$/, "1 列"); assert.doesNotMatch(l, /\{\w+\}/, "変数が残らない"); } }
  const keys = read("../docs/voice/script-story-keys.txt").trim().split("\n");
  assert.ok(keys.some((l) => l.startsWith("navi.mode.story\t")) && keys.some((l) => l.startsWith("story.scene.prologue.1\t")) && keys.some((l) => l.startsWith("story.5-5.clear\t")));
  assert.ok(keys.some((l) => l.startsWith("story.scene.final.1\tcovid\t")) && keys.some((l) => l.startsWith("shadow.lubu.appear\tlubu\t")));
  assert.equal(keys.filter((l) => l.startsWith("shadow.lubu.appear\t")).length, 1, "同じ一言は 1 回");
  assert.equal(mine.replace(/^\ufeff/, "").trim().split("\n").length, keys.filter((l) => l.split("\t")[1] === "mine").length);
});
