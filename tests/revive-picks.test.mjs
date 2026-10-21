// SPEC-155: 復活の画面のおすすめの強化 (= 純関数)、 時計の絵の並べ方、 復活の説明は初回だけ、 カメラの初期位置、 台本の変数の展開
// 実行: node --test tests/revive-picks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { pickRecommendations, PICKS_MAX } = await import("../js/battle/revive-picks.js");
const { NODE_MAP, ROOT_ID } = await import("../js/skill-data.js");
const { claimableNodes, nodeCost } = await import("../js/skill-logic.js");
const { ADVICE_NODES, suggest } = await import("../js/battle/run-stats.js");

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const meta = (gum = 0, dust = 0, nodes = {}) => ({ gum, dust, nodes: { ...nodes } });

test("根をまだ取っていなければ、 おすすめは出さない (= SPEC-157: 初回は「スキルツリーへ」から木が広がるのを見てもらう)", () => {
  assert.deepEqual(pickRecommendations(meta(0), ["vit_hp"]), []);
  assert.deepEqual(pickRecommendations(meta(9999), []), []);
  assert.deepEqual(pickRecommendations(null, []), []);
  assert.ok(pickRecommendations(meta(500, 0, { [ROOT_ID]: 1 }), []).length > 0, "根を取ってあれば出る");
});

test("根を取ってあれば、 倒れた理由のおすすめを先に、 残りを安い順で 3 つまで。 得意武器 (wm_main) は出さない", () => {
  const m = meta(500, 0, { [ROOT_ID]: 1 });
  const ids = pickRecommendations(m, ADVICE_NODES["advice.shot"]);
  assert.equal(ids.length, PICKS_MAX);
  assert.equal(PICKS_MAX, 3);
  const can = new Set(claimableNodes(m).map((n) => n.id));
  for (const id of ids) { assert.ok(NODE_MAP[id], id); assert.ok(can.has(id), `${id} はいま買える`); }
  assert.ok(!ids.includes("wm_main"));
  // おすすめのうち買えるものは先頭に
  const adviceIn = ADVICE_NODES["advice.shot"].filter((id) => can.has(id));
  assert.deepEqual(ids.slice(0, adviceIn.length), adviceIn);
  // 残りは安い順
  const rest = ids.slice(adviceIn.length);
  for (let i = 1; i < rest.length; i++) assert.ok(nodeCost(m, rest[i - 1]).gum <= nodeCost(m, rest[i]).gum, "安い順");
});

test("おすすめが無くても (= advice.gimmick) 買える節が 3 つ並ぶ。 同じ節は 2 度出ない", () => {
  const m = meta(100, 0, { [ROOT_ID]: 1 });
  const ids = pickRecommendations(m, ADVICE_NODES["advice.gimmick"]);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  const dup = pickRecommendations(m, ["vit_hp", "vit_hp"]);
  assert.equal(new Set(dup).size, dup.length);
});

test("GUM が足りなければ (= 買えるものが無い) 空", () => {
  // 根だけ持って GUM 0: 1 段目の費用がある節は買えない
  const ids = pickRecommendations(meta(0, 0, { [ROOT_ID]: 1 }), ["vit_hp"]);
  for (const id of ids) assert.equal(nodeCost(meta(0, 0, { [ROOT_ID]: 1 }), id).gum, 0, `${id} は 0 GUM のときだけ`);
});

test("suggest は ADVICE_NODES の表から節を返す (= 台本の CSV も同じ表を使う)", () => {
  const sum = (taken, kpm = 300) => ({ takenTotal: 100, killsPerMin: kpm, taken: Object.entries(taken).map(([kind, pct]) => ({ kind, pct })) });
  assert.deepEqual(suggest(sum({ shot: 50 })), { key: "advice.shot", nodes: ADVICE_NODES["advice.shot"] });
  assert.deepEqual(suggest(sum({ contact: 70 }, 100)).nodes, ADVICE_NODES["advice.crowdDps"]);
  assert.deepEqual(suggest(sum({ boss: 60 })).nodes, ["bos_dmg", "bos_tele"]);
  assert.equal(suggest(null), null);
});

test("復活の画面: おすすめの欄は木のボタンの上。 買えたら onBackFromTree で「復活する」が脈打つ。 PC では内訳と分析を左に", () => {
  const html = read("../index.html");
  const picks = html.indexOf('id="gameOverPicks"'), tree = html.indexOf('id="gameOverSkillTree"'), retry = html.indexOf('id="gameOverRetry"');
  assert.ok(picks > 0 && picks < tree && tree < retry, "おすすめ → 木 → 復活する の順");
  const go = read("../js/battle/gameover.js");
  assert.match(go, /renderRevivePicks\(document\.getElementById\("gameOverPicks"\), \{\n\s+adviceNodes: suggest\(state\.lastRunStats\?\.analysis\?\.sum\)\?\.nodes \?\? \[\],\n\s+onBought: \(\) => onBackFromTree\(\{ bought: 1 \}\),/);
  assert.match(go, /if \(fromTree\) renderRevivePicks\(/, "木から戻ったら描き直す");
  const picksJs = read("../js/battle/revive-picks.js");
  assert.match(picksJs, /const r = tryBuy\(m, id\);[\s\S]*if \(!spend\(r\.cost\)\)[\s\S]*setNodeRank\(id, r\.rank\);/, "木と同じ手順で買う");
  const css = read("../css/result-ui.css");
  assert.match(css, /@container \(min-width: 940px\) \{[\s\S]*\.result-split \.gameover-modal__card \{ max-width: 960px; display: grid; grid-template-columns: minmax\(0, 1fr\) 420px;/, "SPEC-158: 窓ではなく置き場の幅で");
  assert.match(css, /\.result-split \.result-more-body \{ grid-column: 1;[^}]*display: block !important; \}/, "PC では「くわしく」を開かずに左に");
  assert.match(css, /\.result-split \.result-more \{ display: none; \}/);
});

test("復活のしかたの説明 (= マインちゃんの全身と時計) は初回だけ。 2 回目からは渦に入ったらそのまま REVIVE の画面", () => {
  const go = read("../js/battle/gameover.js");
  assert.match(go, /if \(hasSeenRevive\(\)\) \{ show\(\); return; \}\n\s+markReviveSeen\(\);\n\s+const lines = naviLines\("revive"\);/);
  assert.match(go, /const lines = state\.battle\.heroDissolved \|\| hasSeenRevive\(\) \? \[\] : naviLines\("revive"\);/, "帯でも言い直さない");
  assert.match(read("../js/constants.js"), /export const LS_REVIVE_SEEN = `\$\{LS_PREFIX\}\.reviveSeen`;/);
  // 設定の「もう一度聞く」で忘れる
  assert.match(read("../js/settings-ui.js"), /resetReviveSeen\(\)/);
});

test("復活の直後にステージの外が映らない (= startBattle でカメラを自分に合わせてから最初のコマを描く)", () => {
  const idx = read("../js/battle/index.js");
  assert.match(idx, /resizeCanvas\(\);\n\s+centerCameraOnPlayer\(\);[^\n]*\n\s+_showStageIntro\(\);/);
});

test("台本の CSV は変数を実際の語に展開してある (= {stage} や {name} が残らない)", () => {
  const keys = read("../docs/voice/script-mine-keys.txt").trim().split("\n");
  const csv = read("../docs/voice/script-mine.csv");
  assert.ok(!/\{\w+\}/.test(csv), "変数が残っていない");
  assert.ok(keys.some((l) => l.startsWith("navi.stage.first.easy#stage1\t") && /15 秒|15秒/.test(l)), "EASY の秒数が入っている");
  assert.ok(keys.some((l) => l.startsWith("navi.hero.pick#hero10001\t") && l.includes("MCHウォーリアー") && l.includes("ブレード")));
  assert.ok(keys.some((l) => l.startsWith("advice.shot\t") && l.includes("厚い皮")));
  assert.equal(keys.filter((l) => l.startsWith("navi.stage.next#")).length, 1, "ステージ 2 のぶん");
  assert.equal(keys.filter((l) => l.startsWith("navi.hero.pick#")).length, 10, "ヒーロー 10 人ぶん");
});
