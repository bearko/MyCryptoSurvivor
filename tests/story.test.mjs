// SPEC-165: ストーリーモード (= レシピの整合・進みの純関数・クリア条件・EASY との切り分け)
// 実行: node --test tests/story.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const S = await import("../js/story.js");
const { STORY_STAGES, STORY_MAP, LANDS, STORY_PLAN, allStoryIds, landOf, storyOverride, storyAllows, loadStory, saveStory, storyUnlocked, nextStoryId, currentStoryId, withCleared, storyCleared, storyGoal, storyAllCleared, REACH_RADIUS } = S;
const ui = JSON.parse(read("data/i18n/ui.json"));
const EXT = JSON.parse(read("data/extensions.json")).extensions;
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("5 ランド × 5 = 25 の id。 ランドは MCH の名前と背景 (= Ocean / Strawberry / Tangerine / Lime / Grape)", () => {
  assert.deepEqual(LANDS.map((l) => l.id), ["ocean", "strawberry", "tangerine", "lime", "grape"]);
  assert.deepEqual(LANDS.map((l) => l.bg.match(/\d+/)[0]), ["2105", "2205", "2301", "2405", "2605"]);
  assert.equal(allStoryIds().length, 25);
  assert.equal(Object.values(STORY_PLAN).reduce((a, v) => a + v, 0), 25);
  assert.equal(landOf("3-2").id, "tangerine");
  for (const l of LANDS) assert.ok(ui[`story.land.${l.id}`]?.ja && ui[`story.land.${l.id}`]?.en, l.id);
});

test("W1 の 5 行: 1 行 1 要素 (= 新しい feature は 1 つずつ)、 15〜60 秒、 クリア条件が 1 つ、 文が ja / en にある、 装備が実在する", () => {
  const w1 = STORY_STAGES.filter((s) => s.world === 1);
  assert.deepEqual(w1.map((s) => s.id), ["1-1", "1-2", "1-3", "1-4", "1-5"]);
  let seen = new Set();
  for (const s of STORY_STAGES) {
    assert.ok(s.targetSec >= 15 && (s.world > 1 || s.targetSec <= 60), `${s.id}: ${s.targetSec}s`);
    assert.ok(["kills", "survive", "reach", "collect", "boss"].includes(s.clear.kind), s.id);
    const f = Object.keys(s.features ?? {}).filter((k) => s.features[k] && k !== "items").concat((s.features?.items ?? []).map((k) => `items:${k}`));
    const fresh = f.filter((k) => !seen.has(k));
    assert.ok(fresh.length <= 1, `${s.id}: 新しい要素が ${fresh.join(",")}`);
    f.forEach((k) => seen.add(k));
    for (const key of [s.lines.intro, s.lines.clear, ...(s.lines.mid ?? []).map((m) => m.key), `story.${s.id}.name`]) assert.ok(ui[key]?.ja && ui[key]?.en, key);
    for (const o of s.startExt) assert.ok(EXT.some((e) => String(e.extId) === String(o.extId)), `${s.id}: ext ${o.extId}`);
    if (s.shop) { for (const id of s.shop.offers) assert.ok(EXT.some((e) => String(e.extId) === String(id)), `${s.id}: shop ${id}`); assert.ok(s.features.shop); }
    assert.equal(s.hero, 10001, "W1〜W2 は MCH ウォーリアー");
  }
  // 1-1 は CE も店も無し、 1-2 は店だけ (= ただ・買うまで閉じられない)、 1-4 はハート、 1-5 は到達
  assert.equal(storyAllows("ce", STORY_MAP["1-1"]), false); assert.equal(storyAllows("shop", STORY_MAP["1-1"]), false);
  assert.deepEqual([STORY_MAP["1-2"].shop.price, STORY_MAP["1-2"].shop.mustBuy, STORY_MAP["1-2"].shop.only], [0, true, true]);
  assert.equal(storyAllows("items:heal", STORY_MAP["1-4"]), true); assert.equal(storyAllows("items:magnet", STORY_MAP["1-4"]), false);
  assert.equal(STORY_MAP["1-5"].clear.kind, "reach");
  assert.equal(storyAllows("tree", STORY_MAP["1-5"]), false, "木は W3 まで出さない");
  assert.equal(storyAllows("anything", null), true, "ストーリーの外では何でも出る");
});

test("EASY の上書きと同じ形 (= storyOverride): ボスが無ければ Infinity、 店の時刻、 敵の種類と上限", () => {
  const o = storyOverride(STORY_MAP["1-2"]);
  assert.equal(o.bossAtMs, Infinity); assert.deepEqual(o.shopTimesMs, [12000]); assert.deepEqual(o.pool, [101]); assert.equal(o.maxEnemies, 6);
  assert.equal(o.enemyHpMul, 1.5); assert.equal(o.enemyDmgMul, 0.3); assert.deepEqual(o.chestTimesMs, []); assert.equal(o.rareAtMs, null); assert.equal(o.missionAtMs, null);
  assert.deepEqual(storyOverride(STORY_MAP["1-1"]).shopTimesMs, []);
  assert.equal(storyOverride(null), null);
});

test("進み: 一本道・遊び直し・自己ベスト・全クリア", () => {
  const st = store();
  let p = loadStory(st);
  assert.deepEqual(p, { cleared: [], best: {}, bonds: [] });
  assert.equal(storyUnlocked("1-1", p), true); assert.equal(storyUnlocked("1-2", p), false); assert.equal(currentStoryId(p), "1-1");
  p = withCleared(p, "1-1", { sec: 14, kills: 8 }); saveStory(p, st);
  assert.equal(storyUnlocked("1-2", loadStory(st)), true); assert.equal(currentStoryId(p), "1-2");
  p = withCleared(p, "1-1", { sec: 20, kills: 9 });
  assert.equal(p.best["1-1"].sec, 14, "遅いほうでは上書きしない");
  assert.equal(p.cleared.length, 1, "同じ行を 2 度数えない");
  assert.equal(nextStoryId("1-5"), "2-1"); assert.equal(nextStoryId("5-5"), null);
  assert.equal(storyAllCleared(p), false);
  const all = allStoryIds().reduce((q, id) => withCleared(q, id), p);
  assert.equal(storyAllCleared(all), true); assert.equal(currentStoryId(all), null);
  st.setItem("mcs.story", "{broken"); assert.deepEqual(loadStory(st), { cleared: [], best: {}, bonds: [] });
});

test("クリア条件 (= 純関数): 倒す・耐える・到達・集める・ボス", () => {
  const r = (clear) => ({ clear });
  assert.equal(storyCleared(r({ kind: "kills", n: 8 }), { kills: 7 }), false); assert.equal(storyCleared(r({ kind: "kills", n: 8 }), { kills: 8 }), true);
  assert.equal(storyCleared(r({ kind: "survive", sec: 30 }), { elapsedMs: 29999 }), false); assert.equal(storyCleared(r({ kind: "survive", sec: 30 }), { elapsedMs: 30000 }), true);
  assert.equal(S.reachedPoint({ x: 0, y: -600 }, 0, -600 + REACH_RADIUS + 1), false); assert.equal(S.reachedPoint({ x: 0, y: -600 }, 10, -590), true);
  assert.equal(storyCleared(r({ kind: "reach", points: [{ x: 0, y: 1 }, { x: 2, y: 3 }] }), { reachIdx: 1 }), false); assert.equal(storyCleared(r({ kind: "reach", points: [{ x: 0, y: 1 }, { x: 2, y: 3 }] }), { reachIdx: 2 }), true);
  assert.equal(S.reachPoints({ kind: "reach", x: 5, y: 6 }).length, 1); assert.equal(S.reachPoints(STORY_MAP["1-5"].clear).length, 3);
  assert.equal(storyCleared(r({ kind: "collect", n: 40 }), { ce: 40 }), true);
  assert.equal(storyCleared(r({ kind: "boss" }), { bossDefeated: true }), true);
  assert.deepEqual(storyGoal(r({ kind: "survive", sec: 30 }), { elapsedMs: 12400 }), { kind: "survive", now: 12, goal: 30 });
  assert.deepEqual(storyGoal(r({ kind: "kills", n: 8 }), { kills: 3 }), { kind: "kills", now: 3, goal: 8 });
});

test("つなぎ: easy.js はストーリーをチュートリアルとして扱い、 レシピを EASY の形で返す。 レッスンは出ない。 ランドマップ・札・結果の画面", () => {
  const easy = read("js/easy.js");
  assert.match(easy, /return !!state\.easyMode \|\| isStory\(\);/);
  assert.match(easy, /if \(isStory\(\)\) return storyOverride\(storyStage\(\)\);/);
  assert.match(easy, /if \(isStory\(\)\) return 1;/);
  assert.match(easy, /easyHeroMul\(meta, easy = !!state\.easyMode\)/);
  const lesson = read("js/lesson.js");
  assert.match(lesson, /if \(!isEasy\(\) \|\| isStory\(\) \|\| !globalThis\.document\) return false;/);
  assert.match(read("js/battle/enemies.js"), /ez\?\.pool \?\? currentPool\(b\.stageElapsedMs\)/);
  assert.match(read("js/battle/enemies.js"), /ez\?\.maxEnemies \?\? stageMaxEnemies\(stage\)/);
  assert.match(read("js/battle/damage.js"), /if \(storyAllows\("ce"\)\) spawnGem/);
  assert.match(read("js/battle/field.js"), /storyAllows\(`items:\$\{kind\}`\)/);
  assert.match(read("js/battle/shop.js"), /const gate = !!sr\?\.mustBuy && _boughtHere === 0;/);
  assert.match(read("js/battle/shop.js"), /if \(_storyShop\(\)\?\.price === 0\) return 0;/);
  assert.match(read("js/battle/stage-transition.js"), /if \(isStory\(\)\) \{ _storyClear\(\); return; \}/);
  assert.match(read("js/battle/gameover.js"), /tree\?\.classList\.toggle\("hidden", !storyAllows\("tree"\)\)/);
  const html = read("index.html");
  for (const id of ["modeCardStory", "btnModeStory", "storyMapScreen", "storyMapLands", "stageTransitionMap", "storyGoal"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /css\/story\.css/);
  // EASY の解放は触らない (= mcs.played / mcs.easyCleared を書く場所はストーリーに無い)
  assert.doesNotMatch(read("js/story.js") + read("js/story-map.js") + read("js/battle/story-battle.js"), /markPlayed|markEasyCleared|LS_PLAYED/);
});
