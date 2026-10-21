// SPEC-164: EASY の導線 (= CE の輪なし・根なしの REVIVE は木だけ・木は根を取るまでほかを押せない) とバランス (= 根があれば雑魚は痛くない・ボスは長いが雷鼓で半分)
// 実行: node --test tests/easy-guide-164.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const { EASY_STAGES, EASY_HERO_MUL } = await import("../js/easy.js");
const { ENEMY_SPECS } = await import("../js/constants.js");
const { rootGated } = await import("../js/skill-tree.js");
const { ROOT_ID } = await import("../js/skill-data.js");

test("CE のレッスンにはカーソル (= 黄色い輪) を当てない", () => {
  assert.match(read("js/lesson.js"), /case "s1\.ce":\s+return null;/);
});

test("根なしの REVIVE: スキルツリーへ だけ押せる (= 送信・名前・タイトルに戻る は disabled、 大きく出す)", () => {
  const go = read("js/battle/gameover.js");
  assert.match(go, /classList\.toggle\("gameover-modal--gate", gate\)/);
  assert.match(go, /\["gameOverSubmit", "gameOverName", "gameOverToTitle"\]/);
  assert.match(read("css/result-ui.css"), /\.gameover-modal--gate \.result-tree-btn \{/);
});

test("木: 根を取るまで 復活する・戻る・道・一括解放 を押せない。 縮める・広げる・中心へ・全体 は残す", () => {
  assert.equal(rootGated({ nodes: {} }), true);
  assert.equal(rootGated({ nodes: { [ROOT_ID]: 1 } }), false);
  const tree = read("js/skill-tree.js");
  assert.match(tree, /querySelectorAll\("\.tree-retry, \.tree-back2, \.route-pip, \.sheet-bulk button, \.sheet-bulk input"\)/);
  assert.match(tree, /drawMinimap\(\);\n  applyRootGate\(\);/);
  assert.match(read("css/skill-tree.css"), /\.tree-screen\.gate \.tree-retry/);
});

test("EASY のバランス: ヒーローは根まで ×0.5。 ステージ 2 の雑魚の攻撃 ×0.6・ボス 4,050 HP・攻撃 ×0.3・雷鼓で半分", () => {
  assert.equal(EASY_HERO_MUL, 0.5);
  const s2 = EASY_STAGES[1];
  assert.equal(s2.enemyDmgMul, 0.6);
  assert.equal(s2.bossDmgMul, 0.3);
  assert.equal(Math.round(ENEMY_SPECS[373].hp * s2.bossHpMul), 4050);
  assert.equal(s2.thunderBossRatio, 0.5);
  assert.match(read("js/battle/field.js"), /easyStage\(\)\?\.thunderBossRatio \?\? thunderBossRatio\(\)/);
  // 雷鼓のレッスンは EASY のステージ 2 (= idx 1) で出る (= SPEC-154 の直し漏れ)
  assert.match(read("js/battle/field.js"), /currentStageIdx \?\? 0\) === 1\) showLesson\("s2\.thunder"\)/);
});
