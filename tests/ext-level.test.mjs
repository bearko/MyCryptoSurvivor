// SPEC-162: エクステンションの 15 段階 (= 3 段ごとにランク、 Lv10 が今までの 5 段目、 Lv11〜15 はその先) と、 装備・CE の引き継ぎ
// 実行: node --test tests/ext-level.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const { EXT_MAX_LEVEL, LL_LEVEL, EXT_RANK_SIZE, SHOP_PRICE, EXT_START_LEVEL_STEP } = await import("../js/constants.js");
const { rankOf, levelOfRank, levelParams, tierAnchors, EXT_LEGACY_MAX_LEVEL, EXT_RANKS } = await import("../js/ext-level.js");
const { getTierName, extTierImg, getSkillDesc, isLLLevel, EXT_DEFS } = await import("../js/extensions.js");
const { weaponFromExt } = await import("../js/battle/extensions-as-weapons.js");
const EXT = JSON.parse(read("../data/extensions.json")).extensions;
for (const e of EXT) EXT_DEFS[String(e.extId)] = e;
const WEAPONS = EXT.filter((e) => e.category === "weapon");

test("15 段・LL は 16・3 段ごとにランク", () => {
  assert.equal(EXT_MAX_LEVEL, 15);
  assert.equal(LL_LEVEL, 16);
  assert.equal(EXT_RANK_SIZE, 3);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 15].map(rankOf), [1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual([1, 2, 3, 4, 5].map(levelOfRank), [1, 4, 7, 10, 13]);
  assert.equal(EXT_RANKS, 5);
  assert.deepEqual(tierAnchors(5), [1, 3.25, 5.5, 7.75, 10]);
  assert.equal(EXT_LEGACY_MAX_LEVEL, 10);
  assert.equal(SHOP_PRICE.length, 15);
  assert.equal(EXT_START_LEVEL_STEP, 2);
});

test("Lv1 は 1 段目、 Lv10 は 5 段目の数値そのもの。 あいだは単調に伸びる。 Lv15 は Lv10 より強い (= 全武器)", () => {
  for (const e of WEAPONS) {
    const t1 = e.tierParams[0], t5 = e.tierParams[4];
    assert.deepEqual(levelParams(e, 1), t1, `${e.series} Lv1`);
    assert.deepEqual(levelParams(e, 10), t5, `${e.series} Lv10`);
    let prev = levelParams(e, 1);
    for (let lv = 2; lv <= 15; lv++) {
      const p = levelParams(e, lv);
      assert.ok(p.dmg >= prev.dmg, `${e.series} dmg Lv${lv}`);
      assert.ok((p.cdMs ?? 0) <= (prev.cdMs ?? 0), `${e.series} cd Lv${lv}`);
      assert.ok((p.bullets ?? 0) >= (prev.bullets ?? 0), `${e.series} bullets Lv${lv}`);
      assert.ok(Number.isInteger(p.dmg) && Number.isInteger(p.cdMs), `${e.series} 整数 Lv${lv}`);
      prev = p;
    }
    const p15 = levelParams(e, 15);
    assert.ok(p15.dmg > t5.dmg * 1.2 && p15.dmg < t5.dmg * 2, `${e.series} Lv15 dmg ${p15.dmg} (Lv10 ${t5.dmg})`);
    assert.ok(p15.cdMs >= t5.cdMs * 0.5, `${e.series} 間隔は半分まで`);
    // LL はまだその先
    assert.ok(e.ll.params.dmg > p15.dmg, `${e.series} LL`);
  }
});

test("強化 (= buff) の magnitude も伸びる。 小数は 2 桁", () => {
  const crown = EXT.find((e) => e.series === "Crown");
  assert.equal(levelParams(crown, 1).magnitude, 1.15);
  assert.equal(levelParams(crown, 10).magnitude, 2);
  assert.equal(levelParams(crown, 3).magnitude, 1.28);
  assert.ok(levelParams(crown, 15).magnitude > 2);
});

test("絵と名前は 3 段ごと、 説明の数値はその段のもの。 LL は 16 から", () => {
  const rev = EXT.find((e) => e.series === "Revolver");
  assert.equal(getTierName(rev, 1, "ja"), "リボルバー");
  assert.equal(getTierName(rev, 3, "ja"), "リボルバー");
  assert.equal(getTierName(rev, 4, "ja"), "エリートリボルバー");
  assert.equal(getTierName(rev, 13, "ja"), "モデル１");
  assert.equal(getTierName(rev, 16, "ja"), "モデル２");
  assert.match(extTierImg(rev, 6), /2029\.png$/);
  assert.match(extTierImg(rev, 7), /3029\.png$/);
  assert.ok(getSkillDesc(rev, 10, "ja").includes("弾数 6"), getSkillDesc(rev, 10, "ja"));
  assert.ok(!isLLLevel(rev, 15) && isLLLevel(rev, 16));
  const w = weaponFromExt(rev.extId, 12);
  assert.equal(w.level, 12);
  assert.equal(w.iconId, 4029);
  assert.ok(w.dmg > 75);
});

test("装備と CE はステージをまたいで残る (= つなぎ)", () => {
  const idx = read("../js/battle/index.js");
  assert.match(idx, /export function carryOwnedExtensions\(idx\) \{[\s\S]*if \(idx === 0\) state\.ownedExtensions = \[\];[\s\S]*else if \(at && at\.idx === idx\) state\.ownedExtensions = at\.owned\.map/);
  assert.match(idx, /carryOwnedExtensions\(state\.currentStageIdx \?\? 0\);/);
  assert.match(idx, /if \(!state\.ownedExtensions\.some\(\(o\) => String\(o\.extId\) === String\(starterId\)\)\)/, "初期武器は無いときだけ");
  assert.match(idx, /if \(getCategory\(getExt\(o\.extId\)\) === "buff"\) applyBuff\(o\.extId, o\.level\);/, "強化は掛け直す");
  assert.ok(!/state\.ownedExtensions = \[\];\s*\/\/ SPEC-008/.test(idx), "ステージごとの装備リセットは無い");
  const st = read("../js/battle/stage-transition.js");
  assert.ok(!st.includes("pourShopCeIntoSig("), "CE は固有スキルへ振らない");
  assert.match(read("../js/perks.js"), /\* EXT_START_LEVEL_STEP/, "仕込みは 2 段ぶん");
  assert.match(read("../js/battle/shop-logic.js"), /const rank = rankOf\(/, "ギフト券はランクで");
});
