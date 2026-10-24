// SPEC-165 行 W: EASY の撤去・NORMAL のロックはストーリーのあと・絆の報酬は NORMAL でも・survivor.story
// 実行: node --test tests/bonds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { bondUnlocked, bondedGivers } from "../js/bonds.js";
import { pickMission, MISSIONS } from "../js/battle/missions.js";
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

test("SPEC-175: ミッションの出し手は全員が同じ割合 (= ストーリーの絆に関わらず。 プレイ中のヒーローと同じ人・直前の人は出さない)", () => {
  assert.deepEqual([...bondedGivers(P(["lubu", "alexander"]))].sort(), ["alexander", "lubu"]);
  const n = 22000, hit = new Map();
  for (let i = 0; i < n; i++) { const id = pickMission({ rnd: Math.random }).id; hit.set(id, (hit.get(id) ?? 0) + 1); }
  assert.equal(hit.size, MISSIONS.length, "全員が来る");
  for (const [id, c] of hit) assert.ok(Math.abs(c / n - 1 / MISSIONS.length) < 0.015, `${id} ${(c / n).toFixed(3)}`);
  assert.equal(pickMission({ rnd: () => 0 }).id, MISSIONS[0].id);
  assert.equal(pickMission({ rnd: () => 0.999 }).id, MISSIONS[MISSIONS.length - 1].id);
  assert.notEqual(pickMission({ rnd: () => 0, prevId: MISSIONS[0].id }).id, MISSIONS[0].id, "直前の人は出さない");
  for (let i = 0; i < 200; i++) assert.notEqual(pickMission({ heroId: 2003 }).id, "ripper", "プレイ中のヒーローの影は出さない");
  const src = read("../js/battle/missions.js");
  assert.ok(!/bondedGivers|BONDED_GIVER_WEIGHT/.test(src), "絆で重みを付けない");
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
