// SPEC-083: ヒーロー選択の武器のプレビュー (= 流れ・段・敵の HP)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { previewPhase, previewWaveSize, PREVIEW_TIMING, PREVIEW_TIERS, PREVIEW_RARITY, PREVIEW_ENEMIES } from "../js/hero-preview.js";
import { HERO_STARTING_WEAPON, ENEMY_SPECS, WAVE_TABLE } from "../js/constants.js";

test("SPEC-083: 選んで 1 秒は大きな絵、 そのあと Common → Uncommon → Rare を 3 秒ずつ", () => {
  assert.deepEqual(PREVIEW_TIMING, { firstShowMs: 1000, tierMs: 3000, showMs: 3000 });
  assert.equal(previewPhase(0).mode, "show");
  assert.equal(previewPhase(999).mode, "show");
  const at = (ms) => { const p = previewPhase(ms); return p.mode === "show" ? "show" : PREVIEW_RARITY[p.tier]; };
  assert.equal(at(1000), "Common");
  assert.equal(at(3999), "Common");
  assert.equal(at(4000), "Uncommon");
  assert.equal(at(6999), "Uncommon");
  assert.equal(at(7000), "Rare");
  assert.equal(at(9999), "Rare");
});

test("SPEC-083: 流し終えたら大きな絵に 3 秒戻り、 また Common から", () => {
  const at = (ms) => { const p = previewPhase(ms); return p.mode === "show" ? "show" : PREVIEW_RARITY[p.tier]; };
  assert.equal(at(10000), "show");
  assert.equal(at(12999), "show");
  assert.equal(at(13000), "Common");
  assert.equal(at(16000), "Uncommon");
  assert.equal(at(19000), "Rare");
  assert.equal(at(22000), "show");
  // 段の中の経過も数える
  assert.deepEqual(previewPhase(5500), { mode: "preview", tier: 2, idx: 1, tierT: 1500 });
});

test("SPEC-083: 見せる段は 1〜3 段目 (= Common・Uncommon・Rare)", () => {
  assert.deepEqual(PREVIEW_TIERS, [1, 2, 3]);
  assert.deepEqual(PREVIEW_TIERS.map((t) => PREVIEW_RARITY[t]), ["Common", "Uncommon", "Rare"]);
});

test("SPEC-086: 敵はいちばん弱い雑魚を、 2 秒ごとに段の数だけ (= Common 1・Uncommon 2・Rare 3)", () => {
  assert.deepEqual(PREVIEW_TIERS.map(previewWaveSize), [1, 2, 3]);
  assert.equal(PREVIEW_ENEMIES.everyMs, 2000);
  const normal = WAVE_TABLE.flatMap((w) => w.pool);
  const weakest = normal.reduce((a, id) => (ENEMY_SPECS[id].hp < ENEMY_SPECS[a].hp ? id : a), normal[0]);
  assert.equal(PREVIEW_ENEMIES.id, weakest);
  // 1 つの段 (= 3 秒) で出るのは 0 秒と 2 秒の 2 回
  const waves = Math.ceil(PREVIEW_TIMING.tierMs / PREVIEW_ENEMIES.everyMs);
  assert.deepEqual(PREVIEW_TIERS.map((t) => previewWaveSize(t) * waves), [2, 4, 6]);
});

test("SPEC-083: どのヒーローにも最初の武器がある", () => {
  const heroes = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8"));
  const list = Array.isArray(heroes) ? heroes : (heroes.heroes ?? Object.values(heroes));
  for (const h of list) assert.ok(HERO_STARTING_WEAPON[h.heroId] != null, `hero ${h.heroId}`);
});

test("SPEC-083: 見せ場にプレビューの canvas と段の札がある", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const stage = html.slice(html.indexOf('id="heroStage"'), html.indexOf('id="heroDetailPlaceholder"'));
  assert.match(stage, /<canvas[^>]+id="heroStagePreview"/);
  assert.match(stage, /id="heroStageTierRarity"/);
  assert.match(stage, /id="heroStageTierName"/);
});
