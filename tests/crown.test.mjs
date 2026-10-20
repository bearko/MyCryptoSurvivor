// SPEC-108: クラウンシリーズ (= 拾う CE が増える強化)
// 実行: node --test tests/crown.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8")).extensions;

test("クラウンは強化の 11 種目。 名前と技の名前は資産リポジトリのまま、 CE ×1.15〜×2.0", () => {
  const c = EXT.find((e) => e.series === "Crown");
  assert.ok(c);
  assert.equal(c.category, "buff");
  assert.equal(c.archetype, "ceGainUp");
  assert.deepEqual(c.tierNames.map((n) => n.ja), ["クラウン", "エリートクラウン", "ウィズダムクラウン", "宝冠", "冕冠"]);
  assert.deepEqual(c.tierIconIds, [1036, 2036, 3036, 4036, 5036]);
  assert.deepEqual(c.tierParams.map((p) => p.magnitude), [1.15, 1.3, 1.5, 1.75, 2.0]);
  assert.equal(c.skillName.ja, "マジェスティ");
  assert.equal(EXT.filter((e) => e.category === "buff").length, 11);
  assert.equal(new Set(EXT.map((e) => e.extId)).size, EXT.length, "extId が重ならない");
  const dir = new URL("../../mycryptoheroes/Image/Extensions/", import.meta.url);
  if (existsSync(dir)) for (const id of c.tierIconIds) assert.ok(existsSync(new URL(`${id}.png`, dir)), `${id}.png`);
});

test("クラウンを付けると、 拾う CE に倍率が掛かる", async () => {
  const { state } = await import("../js/state.js");
  const { applyBuff, resetBuffs } = await import("../js/battle/buffs.js");
  const { EXT_DEFS } = await import("../js/extensions.js");
  for (const e of EXT) EXT_DEFS[String(e.extId)] = e;
  resetBuffs();
  assert.equal(state.buffs.ceGainMul, 1);
  applyBuff(21, 3);
  assert.equal(state.buffs.ceGainMul, 1.5);
  applyBuff(21, 5);
  assert.equal(state.buffs.ceGainMul, 2);
});
