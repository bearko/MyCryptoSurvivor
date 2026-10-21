// SPEC-147: EASY (= 短い 3 ステージ・レッスン・根を取るまで弱い・共通基盤に送らない・NORMAL は EASY のあと)
// 実行: node --test tests/easy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { EASY_STAGES, EASY_HERO_MUL, LESSON_KEYS, easyHeroMul, hasClearedEasy, markEasyCleared, loadLessons, saveLessons, LS_EASY_CLEARED } = await import("../js/easy.js");
const { lessonPending, lessonHoldMs, timedLesson } = await import("../js/lesson.js");
const { runThreatTier } = await import("../js/battle/threat.js");
const { ROOT_ID } = await import("../js/skill-data.js");
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ui = JSON.parse(read("data/i18n/ui.json"));
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), map: m }; };

test("ステージの作り: ボスは 0:15 / 0:30、 ステージ 2 にレアとミッション、 ボスが出たら雷鼓。 ショップはステージ 1 から (= SPEC-154: 2 ステージ)", () => {
  assert.deepEqual(EASY_STAGES.map((s) => s.bossAtMs), [15000, 30000]);
  assert.deepEqual(EASY_STAGES.map((s) => s.shopTimesMs), [[10000], [15000]]);   // SPEC-152: 開幕の店は出さない
  for (const s of EASY_STAGES) {
    assert.ok(s.warnMs < s.bossAtMs);
    for (const sh of s.shopTimesMs) assert.ok(sh < s.bossAtMs - s.warnMs, "店はボスの予告より前");
    assert.ok(s.bossHpMul > 0 && s.bossHpMul <= 0.05, "NORMAL のボスは育った装備向けなので、 EASY では大きく下げる (= SPEC-163: 180 / 1,440)");
    assert.ok(s.bossDmgMul > 0 && s.bossDmgMul <= 1);
  }
  assert.equal(EASY_STAGES[1].rareAtMs, 5000); assert.equal(EASY_STAGES[1].missionAtMs, 8000);
  assert.equal(EASY_STAGES[0].rareAtMs, null); assert.equal(EASY_STAGES[0].missionAtMs, null);
  assert.equal(EASY_STAGES.length, 2, "SPEC-154: EASY は 2 ステージ");
  assert.equal(EASY_STAGES[1].thunderAtBoss, true);
  assert.match(read("js/battle/field.js"), /ez\?\.thunderAtBoss && !b\.easyThunderDropped && b\.bossSpawned/, "雷鼓はボスが出てから");
  assert.ok(EASY_STAGES[1].enemyHpMul >= 1.5 && EASY_STAGES[1].enemyDmgMul >= 1.5, "ステージ 2 は負ける設計");
  assert.ok(EASY_STAGES[1].missionAtMs + EASY_STAGES[1].missionDurS * 1000 <= EASY_STAGES[1].bossAtMs - EASY_STAGES[1].warnMs, "ミッションはボスの予告の前に終わる");
});

test("ヒーローは根を取るまで弱い (= EASY だけ)。 EASY は T0 のまま", () => {
  assert.equal(EASY_HERO_MUL, 0.6);
  assert.equal(easyHeroMul({ nodes: {} }, true), 0.6);
  assert.equal(easyHeroMul({ nodes: { [ROOT_ID]: 1 } }, true), 1);
  assert.equal(easyHeroMul({ nodes: {} }, false), 1, "NORMAL・RTA には効かない");
  for (const k of [150, 400, 1500]) assert.equal(runThreatTier(k, { easy: true }), 0);
});

test("レッスンは 16 本で文がある (ja / en)。 見たものは覚える・番号ごとの出す順", () => {
  assert.equal(LESSON_KEYS.length, 15);   // SPEC-154: 2 ステージ
  for (const k of LESSON_KEYS) assert.ok(ui[`lesson.${k}`]?.ja && ui[`lesson.${k}`]?.en, k);
  const st = store();
  assert.deepEqual([...loadLessons(st)], []);
  saveLessons(new Set(["s1.move", "x"]), st);
  assert.deepEqual([...loadLessons(st)], ["s1.move"], "知らない番号は捨てる");
  assert.equal(lessonPending(new Set(["s1.move"]), "s1.move"), false);
  assert.equal(lessonPending(new Set(), "s1.ce"), true);
  assert.equal(lessonHoldMs("あいうえお", 0), 2500); assert.equal(lessonHoldMs("あ".repeat(40), 0), 3600); assert.equal(lessonHoldMs("x", 5000), 5000);
  const seen = new Set();
  const at = (p) => timedLesson({ stageIdx: 0, elapsedMs: 0, shopAtMs: 10000, bossWarnAtMs: 10000, kills: 0, seen, ...p });
  assert.equal(at({ elapsedMs: 500 }), null);
  assert.equal(at({ elapsedMs: 1200 }), "s1.move"); seen.add("s1.move");
  assert.equal(at({ elapsedMs: 3000, kills: 1 }), "s1.ce"); seen.add("s1.ce");
  assert.equal(at({ elapsedMs: 8500, kills: 5 }), "s1.shop"); seen.add("s1.shop");
  assert.equal(at({ elapsedMs: 10000, kills: 5 }), "s1.boss"); seen.add("s1.boss");
  assert.equal(at({ elapsedMs: 14000, kills: 50 }), null);
  assert.equal(timedLesson({ stageIdx: 1, elapsedMs: 0, shopAtMs: 0, bossWarnAtMs: 25000, kills: 0, seen }), "s2.start");
  assert.equal(timedLesson({ stageIdx: 1, elapsedMs: 0, shopAtMs: 0, bossWarnAtMs: 25000, kills: 0, seen }), "s2.start");
  assert.equal(read("docs/voice/script-lessons.csv").replace(/^\uFEFF/, "").trim().split("\n").length, 15, "作者が録る台本 (= 1 列)");
});

test("クリアの記録と、 つなぎ (= 共通基盤に送らない・ロック・NORMAL へ・レッスンの出どころ)", () => {
  const st = store();
  assert.equal(hasClearedEasy(st), false); markEasyCleared(st); assert.equal(st.map.get(LS_EASY_CLEARED), "1"); assert.equal(hasClearedEasy(st), true);
  assert.match(read("js/battle/index.js"), /if \(!isEasy\(\)\) reportStageStart/);
  assert.match(read("js/battle/stage-transition.js"), /if \(!isEasy\(\)\) reportStageEnd/);
  assert.match(read("js/battle/gameover.js"), /if \(!isEasy\(\)\) markPlayed\(\)/);
  assert.match(read("js/battle/gameover.js"), /reason !== "clear" && !isEasy\(\)\) reportRunScore/);
  const ar = read("js/battle/activity-report.js");
  assert.match(ar, /if \(!easy\) markPlayed\(\)/); assert.match(ar, /if \(easy\) \{ markEasyCleared\(\); unlockEasyReward\(\); \}/);   // SPEC-153: ビリーが仲間に assert.match(ar, /if \(!easy\) reportRunScore/);
  assert.match(read("js/battle/index.js"), /baseMaxHp\(heroMaxHp\(hero\)\) \* ezMul/);
  assert.match(read("js/battle/index.js"), /heroDmgMul\(hero\) \* ezMul/);
  assert.match(read("js/battle/hurt.js"), /easyStage\(\)\?\.bossDmgMul \?\? 1/);
  const html = read("index.html");
  for (const id of ["modeCardEasy", "btnModeEasy", "modeCardNormalLock", "activityReportToNormal", "stageTransitionTreeLock"]) assert.ok(html.includes(`id="${id}"`), id);
  for (const k of ["mode.easyDesc", "mode.startEasy", "mode.lockedNormal", "navi.mode.easy", "tree.lockedEasy", "report.toNormal", "lesson.next"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  // レッスンの出どころ (= 時刻で出すもの以外)
  const src = ["js/battle/enemies.js", "js/battle/magic-cards.js", "js/battle/missions.js", "js/battle/field.js", "js/battle/stage-transition.js", "js/battle/gameover.js", "js/skill-tree.js", "js/battle/activity-report.js"].map(read).join("\n");
  for (const k of ["s2.rare", "s2.gift", "s2.mission", "s2.reward", "s2.thunder", "s1.clear", "s2.lose", "s2.root", "s2.clear"]) assert.ok(src.includes(`showLesson("${k}")`), k);
});
