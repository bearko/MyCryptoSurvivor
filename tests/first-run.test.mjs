// SPEC-146: 初めての人の最初の挑戦 (= meta.runs が 0) だけ、 脅威の段階を上げない (= ショップを出さない決まりは SPEC-147 で外した)。
//           倒れたら、 スキルツリーからそのまま「もう一度挑む」
// 実行: node --test tests/first-run.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { runThreatTier, threatTier, THREAT_TIERS } = await import("../js/battle/threat.js");
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ui = JSON.parse(read("data/i18n/ui.json"));

test("初めての挑戦は T0 のまま。 2 回目からは今までどおり (= RTA・総合スコアに効く難しさは変えない)", () => {
  for (const k of [0, 149, 150, 400, 800, 1500, 5000]) {
    assert.equal(runThreatTier(k, { firstRun: true }), 0, `${k} 体`);
    assert.equal(runThreatTier(k, { firstRun: false }), threatTier(k));
    assert.equal(runThreatTier(k), threatTier(k), "既定は 2 回目以降");
  }
  assert.deepEqual([...THREAT_TIERS], [0, 150, 400, 800, 1500], "段階の境目は変えない");
});

test("つなぎ: 初めての挑戦の印・段階・ショップ", () => {
  const idx = read("js/battle/index.js");
  assert.match(idx, /state\.run\.firstRun = \(getMeta\(\)\.runs \| 0\) === 0 && !state\.rtaMode;/);
  assert.match(idx, /if \(isShopMode\(\)\) \{/, "SPEC-147: ショップはステージ 1 から");
  const en = read("js/battle/enemies.js");
  assert.equal((en.match(/runThreatTier\(state\.killCount, \{ firstRun: !!state\.run\?\.firstRun, easy: isEasy\(\) \}\)/g) ?? []).length, 2, "知らせと型の両方");
  assert.doesNotMatch(en, /[^n]threatTier\(state\.killCount\)/);
});

test("倒れたあと: スキルツリーから「もう一度挑む」・結果の画面の「もう一度挑む」はスキルツリーのすぐ下", () => {
  const html = read("index.html");
  const a = html.indexOf('id="gameOverSkillTree"'), b = html.indexOf('id="gameOverRetry"'), c = html.indexOf('id="gameOverName"');
  assert.ok(a > 0 && b > a && c > b, "スキルツリー → もう一度挑む → ランキング");
  const tree = read("js/skill-tree.js");
  assert.match(tree, /\["gameOverSkillTree", "gameOverModal", false, true\]/);
  assert.match(tree, /function retryFromTree\(\) \{\n\s+_returnTo = null;/);
  assert.match(tree, /g\.onBackFromTree\(\{ bought: _bought \}\)/);
  const go = read("js/battle/gameover.js");
  assert.match(go, /state\.rtaMode \|\| state\.regulation === REGULATION_ABSOLUTE \? t\("gameover\.reviveCurrent"/, "RTA と ABSOLUTE は「今のレギュレーションで復活する」");   // SPEC-150
  for (const k of ["gameover.revive", "tree.retryNow", "navi.afterTree.bought", "navi.afterTree.none"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);   // SPEC-150: 「復活する」
});
