// SPEC-158: ステージクリアの画面 (= GUM とゴールドダストが主役、 内訳は「くわしく」/ PC では左)、 勝利の SE、 2 列は置き場の幅で
// 実行: node --test tests/stage-clear.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const { SFX } = await import("../js/constants.js");

test("ステージクリアの札: 1 行の小さな字 → 大きな報酬 → くわしく (内訳と CE) → 木 → 次へ。 REVIVE と同じ組み立て", () => {
  const html = read("../index.html");
  const m = html.slice(html.indexOf('id="stageTransitionModal"'), html.indexOf('id="stageTransitionProceed"'));
  assert.match(m, /class="gameover-modal stage-clear-modal result-split hidden"/);
  assert.ok(!m.includes("result-tiles"), "3 つの大きな札はやめた");
  const order = ['id="stageTransitionElapsed"', 'id="stageTransitionKills"', 'id="stageTransitionLevel"', 'id="stageTransitionRewards"', 'id="stageTransitionMore"', 'id="stageTransitionMoreBody"', 'id="stageTransitionGum"', 'id="stageTransitionSig"', 'id="stageTransitionSkillTree"', 'id="stageTransitionSub"'];
  let last = -1;
  for (const k of order) { const i = m.indexOf(k); assert.ok(i > last, k); last = i; }
  assert.match(m, /class="result-rewards result-rewards--hero hidden" id="stageTransitionRewards"/, "報酬は大きく");
  assert.match(m, /class="result-more-body hidden" id="stageTransitionMoreBody"/);
  assert.match(html, /id="gameOverModal" class="gameover-modal result-split hidden"/, "REVIVE も同じ印");
});

test("stage-transition.js: 1 行を埋め、 くわしくは毎回畳み、 NODE CLEAR の帯の瞬間に勝利の SE", () => {
  const st = read("../js/battle/stage-transition.js");
  assert.match(st, /set\("stageTransitionElapsed", formatElapsed\(/);
  assert.match(st, /set\("stageTransitionLevel", `Lv\.\$\{snap\?\.level \?\? 1\}`\)/);
  assert.match(st, /countUp\(document\.getElementById\("stageTransitionKills"\)/, "撃破数は数え上げる");
  assert.match(st, /playSe\(SFX\.STAGE_CLEAR, 0, 0\.7\);[^\n]*\n[\s\S]{0,400}presentResult\(modal, "clear"/, "帯の直前に SE");
  assert.match(st, /document\.getElementById\("stageTransitionMore"\)\?\.addEventListener\("click"/);
  assert.match(st, /document\.getElementById\("stageTransitionMoreBody"\)\?\.classList\.add\("hidden"\);/, "毎回畳む");
  assert.ok(!st.includes("resultTilesHtml"), "使わなくなった札の HTML は消した");
  assert.equal(SFX.STAGE_CLEAR, "Audio/SE/Jingles/win.mp3");
});

test("2 列にするかは窓ではなく置き場 (= ドックを引いた幅) で決める (= container query)。 ドックが開いていれば 3 列", () => {
  const comp = read("../css/components.css");
  assert.match(comp, /\.gameover-modal \{[^}]*container-type: inline-size;/);
  const css = read("../css/result-ui.css");
  assert.match(css, /@container \(min-width: 940px\) \{/);
  assert.ok(!/@media \(min-width: 980px\) \{\s*\/\* PC: 内訳/.test(css), "窓の幅の判定は消した");
  assert.match(css, /\.result-split \.result-more-body \{ grid-column: 1; grid-row: 1 \/ span 9;/);
});

test("SPEC-161: ステージクリアから開いた木には「復活する」と同じ場所に「次のノードに挑む」。 押すと元の画面に戻らず次のステージへ", () => {
  const tree = read("../js/skill-tree.js");
  assert.match(tree, /\["stageTransitionSkillTree", "stageTransitionModal", true, false, true\]/);
  assert.match(tree, /_next = !!next && !retry;/);
  assert.match(tree, /h\("button", \{ class: "tree-tool tree-retry tree-next", type: "button", onclick: nextFromTree \}/, "同じ場所 (= .tree-retry)");
  assert.match(tree, /function nextFromTree\(\) \{\n\s+_returnTo = null;[\s\S]*?closeSkillTree\(\);\n\s+import\("\.\/battle\/stage-transition\.js"\)\.then\(\(m\) => m\.proceedToNextStage\(\)\)/);
  const st = read("../js/battle/stage-transition.js");
  assert.match(st, /export async function proceedToNextStage\(\)/);
  assert.match(st, /const _onProceedClick = \(\) => \(isStory\(\) \? proceedStory\(\) : proceedToNextStage\(\)\);/);   // SPEC-165: ストーリーは次の行へ
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  assert.equal(ui["tree.nextNode"].ja, "次のノードに挑む");
  assert.ok(ui["tree.nextNode"].en);
});
