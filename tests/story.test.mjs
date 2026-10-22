// SPEC-165: ストーリーモード (= レシピの整合・進みの純関数・クリア条件・EASY との切り分け)
// 実行: node --test tests/story.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

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

test("W1〜W5 の 25 行: 1 行 1 要素 (= 新しい feature は 1 つずつ)、 15〜60 秒、 クリア条件が 1 つ、 文が ja / en にある、 装備が実在する", () => {
  const w1 = STORY_STAGES.filter((s) => s.world === 1);
  assert.deepEqual(w1.map((s) => s.id), ["1-1", "1-2", "1-3", "1-4", "1-5"]);
  assert.deepEqual(STORY_STAGES.filter((s) => s.world === 2).map((s) => s.id), ["2-1", "2-2", "2-3", "2-4", "2-5"]);
  assert.deepEqual(STORY_STAGES.filter((s) => s.world === 3).map((s) => s.id), ["3-1", "3-2", "3-3", "3-4", "3-5"]);
  assert.deepEqual(STORY_STAGES.filter((s) => s.world === 4).map((s) => s.id), ["4-1", "4-2", "4-3", "4-4", "4-5"]);
  assert.deepEqual(STORY_STAGES.filter((s) => s.world === 5).map((s) => s.id), ["5-1", "5-2", "5-3", "5-4", "5-5"]);
  assert.equal(STORY_STAGES.length, 25, "25 行そろった");
  assert.deepEqual(STORY_MAP["1-2"].shop.offers, [16], "1-2 はりんご (= 作者 2026-10-22)"); assert.equal(STORY_MAP["1-3"].startExt[0].level, 1, "1-3 はブレード Lv.1 で始まる (= ランクアップは 1-5)");
  assert.match(read("js/battle/story-battle.js"), /if \(r\.shadow && st\.shadowWon && !st\.bondAck\) return;/, "越えた瞬間のポップアップを押すまでクリアしない");
  assert.equal(STORY_MAP["1-5"].shadow.mode, "spar"); assert.equal(STORY_MAP["1-5"].spar.hits, 3); assert.equal(STORY_MAP["1-5"].shop.rankupFx, true); assert.deepEqual(STORY_MAP["1-4"].pickup, { kind: "heal", x: 0, y: -340, heal: "full" });
  assert.equal(S.storyCleared(STORY_MAP["1-4"], { elapsedMs: 31000, picked: new Set() }), false, "パンケーキを取るまでクリアしない"); assert.equal(S.storyCleared(STORY_MAP["1-4"], { elapsedMs: 31000, picked: new Set(["heal"]) }), true);
  assert.equal(S.nextInSameLand("1-4"), true); assert.equal(S.nextInSameLand("1-5"), false); assert.equal(S.nextInSameLand("5-5"), false);
  assert.equal(STORY_MAP["2-2"].shop.offers.length, 4); assert.equal(STORY_MAP["2-2"].shop.priceMul, 1.6);
  assert.equal(S.PROLOGUE.id, "1-0"); assert.equal(STORY_MAP["1-0"].scene, "prologue"); assert.ok(!S.allStoryIds().includes("1-0"), "プロローグは 25 に数えない"); assert.equal(S.prologueDone({ cleared: ["1-0"] }), true); assert.equal(S.prologueDone({ cleared: [] }), false);
  assert.equal(storyOverride(STORY_MAP["1-0"]).maxEnemies, 3, "プロローグは敵が数体だけ"); assert.equal(storyOverride(STORY_MAP["1-0"]).spawnFrom, "sides"); assert.deepEqual(storyOverride(STORY_MAP["1-0"]).bounds, { x: 240, yMax: 260 }); assert.equal(storyOverride(STORY_MAP["1-1"]).bounds, null); assert.equal(S.reachedPoint({ x: 0, y: -640 }, -240, -650, 260), true); assert.equal(S.reachedPoint({ x: 0, y: -640 }, -240, -650), false);
  assert.match(read("js/battle/story-battle.js"), /story\.goal\.reachHere/, "目印の文は帯の文と別"); assert.equal(STORY_MAP["5-5"].sceneAfter, "ending");
  assert.match(read("js/battle/stage-transition.js"), /if \(r\.scene\) \{/, "プロローグはクリアの画面を出さない");
  assert.match(read("js/mode-select.js"), /enterStory\(\)/, "入り口はプロローグ経由");
  assert.deepEqual(STORY_MAP["5-1"].shop.must, ["reroll"]); assert.equal(STORY_MAP["3-2"].shop.must, undefined); assert.deepEqual(STORY_MAP["5-2"].shop.must, ["sig"]);   // お断りは 3-2 で案内だけ (= 作者 2026-10-22: 強制すると詰む)
  assert.equal(STORY_MAP["5-3"].bondOn, "missionClear"); assert.equal(STORY_MAP["5-3"].mission.must, false);
  assert.equal(storyOverride(STORY_MAP["5-4"]).spawnIntervalMs, null); assert.equal(storyOverride(STORY_MAP["5-4"]).shopTimesMs, null); assert.equal(storyOverride(STORY_MAP["5-4"]).maxEnemies, null);
  assert.equal(storyOverride(STORY_MAP["5-5"]).bossId, S.FINAL_BOSS_ID); assert.equal(S.FINAL_BOSS_ID, 681, "ラスボスは COVID-19 (= 作者 2026-10-22)"); assert.equal(storyOverride(STORY_MAP["5-5"]).bossAtMs, 120000); assert.equal(storyOverride(STORY_MAP["5-5"]).missionFree, true); assert.equal(storyOverride(STORY_MAP["5-5"]).chestTimesMs, null);
  assert.equal(STORY_MAP["5-5"].unlock, "mode:NORMAL");
  for (const l of S.LANDS) { assert.ok(l.ach?.plain && l.ach?.shadow && l.ach?.boss, `${l.id}: ach`); assert.equal(String(l.ach.boss).slice(0, 2), "20", "金は King 就任 (200nn)"); assert.equal(String(l.ach.plain).slice(-1), "1"); assert.equal(String(l.ach.shadow).slice(-1), "2"); }
  assert.equal(S.stageArt(S.LANDS[0], "boss"), "Image/Achievements/piece_20011.png"); assert.equal(S.stageArt(S.LANDS[2], "shadow"), "Image/Achievements/piece_10092.png"); assert.equal(S.stageArt(S.LANDS[2], "plain"), "Image/Achievements/piece_10091.png");
  assert.deepEqual(S.bondBurst(STORY_MAP["2-4"]), { ce: 120, cards: 2, heal: true, gum: 30 }); assert.equal(S.bondBurst(STORY_MAP["5-4"]).ce, 200); assert.equal(S.bondBurst(STORY_MAP["1-1"]), null);
  const sb = read("js/battle/story-battle.js");
  assert.match(sb, /markStoryBond\(r\.bond\.who\); _bondBurst\(r, st\);/, "シャドーを越えた瞬間にラッシュ");
  assert.match(sb, /if \(r\.bond\?\.gifts\) addShopGift\(r\.bond\.gifts\);/, "ギフト券はその場で財布へ");
  assert.match(read("js/battle/stage-transition.js"), /key: "bond", n: 1, rate: bg, gum: bg/, "GUM は内訳の行");
  assert.deepEqual(storyOverride(STORY_MAP["4-1"]).variants, { giant: 0.2, runner: 0.2 }); assert.equal(storyOverride(STORY_MAP["4-2"]).gimmick, "beads");
  assert.equal(storyOverride(STORY_MAP["4-3"]).missionAtMs, 8000); assert.equal(storyOverride(STORY_MAP["4-3"]).missionMust, true); assert.equal(storyOverride(STORY_MAP["4-4"]).missionAtMs, null);
  assert.equal(STORY_MAP["4-5"].shadow.mode, "defeat"); assert.deepEqual(STORY_MAP["4-5"].bond.unlock, ["passive:thunder30"]);
  assert.equal(STORY_MAP["3-1"].treeFirst, true); assert.equal(STORY_MAP["3-2"].hero, "select"); assert.equal(STORY_MAP["3-5"].boss.id, 171); assert.equal(STORY_MAP["5-5"].sceneBefore, "final");
  assert.equal(storyOverride(STORY_MAP["3-5"]).bossId, 171); assert.equal(storyOverride(STORY_MAP["3-5"]).bossAtMs, 45000); assert.equal(storyOverride(STORY_MAP["3-4"]).shooters.ids[0], 166); assert.equal(storyOverride(STORY_MAP["3-3"]).shooters, null);
  let seen = new Set();
  for (const s of STORY_STAGES) {
    assert.ok(s.targetSec >= 15 && (s.world > 1 || s.targetSec <= 60), `${s.id}: ${s.targetSec}s`);
    assert.ok(["kills", "survive", "reach", "collect", "boss", "shadowSurvive", "shadowDefeat"].includes(s.clear.kind), s.id);
    if (s.shadow) { assert.ok(ui[`shadow.${s.shadow.id}.appear`]?.ja && ui[`shadow.${s.shadow.id}.win`]?.ja, s.id); assert.ok(["survive", "defeat", "spar"].includes(s.shadow.mode)); if (s.shadow.mode !== "spar") assert.equal(s.bond?.who, s.shadow.id, "試練は絆を結ぶ"); }
    if (s.require) assert.ok(s.pickup && `item:${s.pickup.kind}` === s.require, `${s.id}: require は pickup と対`);
    if (s.chestDrop) for (const k of (Array.isArray(s.chestDrop) ? s.chestDrop : [s.chestDrop])) assert.ok(s.features.chests && (k === "card" ? s.features.magicCards : s.features.items?.includes(k)), `${s.id}: chestDrop は features にも`);
    // 壊せるもの (= 宝箱・壺と、 そこから出る棒磁石) は 1 つの要素として数える (= 2-3)
    const group = (k) => (k === "chests" || k === "pots" || k === "items:magnet" ? "breakables" : (k === "rare" || k === "magicCards" ? "rare" : (k === "items:thunder" || k === "items:heal" || k === "bossChest" ? "boss" : (k === "items:watch" || k === "items:robot" ? "helpers" : k))));
    const f = Object.keys(s.features ?? {}).filter((k) => s.features[k] && k !== "items").concat((s.features?.items ?? []).map((k) => `items:${k}`)).map(group);
    const fresh = [...new Set(f)].filter((k) => !seen.has(k));
    assert.ok(fresh.length <= 1, `${s.id}: 新しい要素が ${fresh.join(",")}`);
    f.forEach((k) => seen.add(k));
    for (const key of [s.lines.intro, s.lines.clear, ...(s.lines.mid ?? []).map((m) => m.key), `story.${s.id}.name`]) assert.ok(ui[key]?.ja && ui[key]?.en, key);
    for (const o of s.startExt) assert.ok(EXT.some((e) => String(e.extId) === String(o.extId)), `${s.id}: ext ${o.extId}`);
    if (s.world >= 3) assert.ok(s.hero === "select" || s.hero === "keep" || typeof s.hero === "number", s.id);
    if (s.boss) assert.ok(["3-5", "5-5"].includes(s.id), "大型ボスは 3-5 と 5-5 だけ");
    if (s.shop) { for (const id of s.shop.offers) assert.ok(EXT.some((e) => String(e.extId) === String(id)), `${s.id}: shop ${id}`); assert.ok(s.features.shop); }
    if (s.world <= 2) assert.equal(s.hero, 10001, "W1〜W2 は MCH ウォーリアー");
  }
  // 1-1 は CE も店も無し、 1-2 は店だけ (= ただ・買うまで閉じられない)、 1-4 はハート、 1-5 は到達
  assert.equal(storyAllows("ce", STORY_MAP["1-1"]), false); assert.equal(storyAllows("shop", STORY_MAP["1-1"]), false);
  assert.deepEqual([STORY_MAP["1-2"].shop.price, STORY_MAP["1-2"].shop.mustBuy, STORY_MAP["1-2"].shop.only], [0, true, true]);
  assert.equal(storyAllows("items:heal", STORY_MAP["1-4"]), true); assert.equal(storyAllows("items:magnet", STORY_MAP["1-4"]), false);
  assert.equal(STORY_MAP["1-5"].clear.kind, "shadowDefeat"); assert.equal(STORY_MAP["1-5"].pre.points.length, 3, "移動の練習は 3 地点");
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
  assert.deepEqual(p, { cleared: [], best: {}, bonds: [], loadout: null });
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
  st.setItem("mcs.story", "{broken"); assert.deepEqual(loadStory(st), { cleared: [], best: {}, bonds: [], loadout: null });
});

test("SPEC-165: 持ち物 (= 装備・CE・ヒーロー) はストーリーのあいだ残り、 開始装備はレシピと重ねる", () => {
  // 覚える → 読む (= 壊れた値は整える)
  const st = new Map(); st.getItem = (k) => st.get(k) ?? null; st.setItem = (k, v) => st.set(k, v);
  let p = loadStory(st);
  p = S.withLoadout(p, { hero: 4006, owned: [{ extId: 10, level: 3 }, { extId: "2", level: "2" }, { bad: 1 }], ce: 48.5, sigLevel: 2, sigCe: 10 }); saveStory(p, st);
  assert.deepEqual(loadStory(st).loadout, { hero: 4006, owned: [{ extId: 10, level: 3 }, { extId: 2, level: 2 }], ce: 48.5, sigLevel: 2, sigCe: 10 });
  assert.equal(S.normalizeLoadout("x"), null);
  assert.deepEqual(S.normalizeLoadout({}), { hero: S.STORY_HERO, owned: [], ce: 0, sigLevel: 1, sigCe: 0 });
  // レシピの開始装備は底 (= 同じ品は高いほう。 持っていない品は足す。 持ち物にしか無い品も残る)
  assert.deepEqual(S.mergeStartExt([{ extId: 10, level: 3 }, { extId: 1, level: 1 }], [{ extId: 10, level: 1 }, { extId: 16, level: 1 }]),
    [{ extId: 10, level: 3 }, { extId: 16, level: 1 }, { extId: 1, level: 1 }]);
  assert.deepEqual(S.mergeStartExt([], [{ extId: 10, level: 1 }]), [{ extId: 10, level: 1 }]);
  assert.deepEqual(S.mergeStartExt(undefined, undefined), []);
  // 戦闘の始まりは持ち物を重ね、 クリアの瞬間に覚える。 木の「次のノードに挑む」はストーリーなら旅の演出へ
  const bi = read("js/battle/index.js"), stt = read("js/battle/stage-transition.js"), tree = read("js/skill-tree.js"), sm = read("js/story-map.js");
  assert.match(bi, /mergeStartExt\(loadStory\(\)\.loadout\?\.owned \?\? \[\], storyStage\(\)\?\.startExt \?\? \[\]\)/);
  assert.match(bi, /if \(lo\) \{ s\.ce = lo\.ce; s\.sigLevel = lo\.sigLevel; s\.sigCe = lo\.sigCe; \}/);
  assert.match(stt, /markStoryLoadout\(\{ hero: state\.ownedHero\?\.heroId \?\? STORY_HERO/);
  assert.match(tree, /S\.isStory\(\) \? m\.proceedStory\(\) : m\.proceedToNextStage\(\)/);
  assert.match(sm, /loadStory\(\)\.loadout\?\.hero \?\? state\.ownedHero\?\.heroId \?\? STORY_HERO/);
});

test("クリア条件 (= 純関数): 倒す・耐える・到達・集める・ボス", () => {
  const r = (clear) => ({ clear });
  assert.equal(storyCleared(r({ kind: "kills", n: 8 }), { kills: 7 }), false); assert.equal(storyCleared(r({ kind: "kills", n: 8 }), { kills: 8 }), true);
  assert.equal(storyCleared(r({ kind: "survive", sec: 30 }), { elapsedMs: 29999 }), false); assert.equal(storyCleared(r({ kind: "survive", sec: 30 }), { elapsedMs: 30000 }), true);
  assert.equal(S.reachedPoint({ x: 0, y: -600 }, 0, -600 + REACH_RADIUS + 1), false); assert.equal(S.reachedPoint({ x: 0, y: -600 }, 10, -590), true);
  assert.equal(storyCleared(r({ kind: "reach", points: [{ x: 0, y: 1 }, { x: 2, y: 3 }] }), { reachIdx: 1 }), false); assert.equal(storyCleared(r({ kind: "reach", points: [{ x: 0, y: 1 }, { x: 2, y: 3 }] }), { reachIdx: 2 }), true);
  assert.equal(S.reachPoints({ kind: "reach", x: 5, y: 6 }).length, 1); assert.equal(S.reachPoints({ kind: "reach", points: STORY_MAP["1-5"].pre.points }).length, 3);
  assert.equal(storyCleared(r({ kind: "collect", n: 40 }), { ce: 40 }), true);
  assert.equal(storyCleared(r({ kind: "boss" }), { bossDefeated: true }), true);
  assert.deepEqual(storyGoal(r({ kind: "survive", sec: 30 }), { elapsedMs: 12400 }), { kind: "survive", now: 12, goal: 30 });
  assert.deepEqual(storyGoal(r({ kind: "kills", n: 8 }), { kills: 3 }), { kind: "kills", now: 3, goal: 8 });
  assert.equal(storyCleared(r({ kind: "shadowSurvive", sec: 15 }), { shadowMs: 14999 }), false); assert.equal(storyCleared(r({ kind: "shadowSurvive", sec: 15 }), { shadowMs: 15000 }), true);
  assert.equal(storyCleared(r({ kind: "shadowDefeat" }), { shadowDefeated: true }), true);
  const bonded = S.withBond(S.withBond({ cleared: [], best: {}, bonds: [] }, "alexander"), "lubu");
  assert.deepEqual(S.bondRewards(bonded), { gifts: 2, unlock: ["item:watch"] });
  assert.deepEqual(S.bondRewards({ cleared: [], best: {}, bonds: [] }), { gifts: 0, unlock: [] });
});

test("つなぎ: easy.js はストーリーをチュートリアルとして扱い、 レシピを EASY の形で返す (= EASY のモードとレッスンは撤去)。 ランドマップ・札・結果の画面", () => {
  const easy = read("js/easy.js");
  assert.match(easy, /export function isEasy\(\) \{\n\s+return isStory\(\);/);
  assert.match(easy, /return isStory\(\) \? storyOverride\(storyStage\(\)\) : null;/);
  assert.match(easy, /return isStory\(\) \? 1 : STAGE_TABLE\.length;/);
  assert.doesNotMatch(easy, /EASY_STAGES|LESSON_KEYS|easyHeroMul|easyMode/);
  assert.ok(!existsSync(new URL("../js/lesson.js", import.meta.url)) && !existsSync(new URL("../js/lesson-cursor.js", import.meta.url)), "レッスンは消した");
  assert.doesNotMatch(read("js/state.js") + read("js/main.js") + read("js/mode-select.js"), /easyMode/);
  assert.match(read("js/battle/enemies.js"), /ez\?\.pool \?\? currentPool\(b\.stageElapsedMs\)/);
  assert.match(read("js/battle/enemies.js"), /ez\?\.maxEnemies \?\? stageMaxEnemies\(stage\)/);
  assert.match(read("js/battle/damage.js"), /if \(storyAllows\("ce"\)\) spawnGem/);
  assert.match(read("js/battle/field.js"), /storyAllows\(`items:\$\{kind\}`\)/);
  assert.match(read("js/battle/shop.js"), /const gate = \(!!sr\?\.mustBuy && _boughtHere === 0\) \|\| left\.length > 0;/);
  assert.match(read("js/battle/shop.js"), /if \(_storyShop\(\)\?\.price === 0\) return 0;/);
  assert.match(read("js/battle/stage-transition.js"), /if \(isStory\(\)\) \{ _storyClear\(\); return; \}/);
  assert.match(read("js/battle/gameover.js"), /tree\?\.classList\.toggle\("hidden", !storyAllows\("tree"\)\)/);
  const html = read("index.html");
  for (const id of ["modeCardStory", "btnModeStory", "storyMapScreen", "storyMapLands", "storyMapPlates", "storyWorldScreen", "storyWorldNodes", "storyStageModal", "stageTransitionMap", "storyGoal"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(read("js/story-map.js"), /showStageInfo\(id\)/, "S-B の札は S-C を開く");
  assert.match(read("js/story-map.js"), /_zoomTo\(pl, \(\) => showStoryWorld\(land\.id\)\)/, "S-A の札はズームして S-B へ");
  assert.deepEqual(S.stagePos({ map: { x: 1, y: 2 } }, 0), { x: 1, y: 2 }); assert.deepEqual(S.stagePos({}, 0), S.MAP_PATH[0]); assert.equal(Object.keys(S.MAP_TERRITORY).length, 5);
  assert.match(html, /css\/story\.css/);
  // EASY の解放は触らない (= mcs.played / mcs.easyCleared を書く場所はストーリーに無い)
  assert.doesNotMatch(read("js/story.js") + read("js/story-map.js") + read("js/battle/story-battle.js"), /markPlayed|markEasyCleared|LS_PLAYED/);
});
