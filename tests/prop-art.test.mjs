// SPEC-074: 壺も宝箱もマイクリのエクステンションの絵。 ほかの絵と取り違えない (= SPEC-076 で宝箱は 5106)
// 実行: node --test tests/prop-art.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  POT_EXT_ID, CHEST_EXT_ID, MAGNET_EXT_ID, HEAL_EXT_ID, WATCH_EXT_ID, THUNDER_EXT_ID, MAGIC_CARD_EXT_ID,
} from "../js/constants.js";
import { TROJAN_EXT_ID } from "../js/battle/gimmicks.js";

const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8"));

test("宝箱の絵は 5106 財宝ゴールデンモアイ (= 作者の指定。 SPEC-076)", () => {
  assert.equal(CHEST_EXT_ID, 5106);
});

test("壺・宝箱・お助けアイテム・マジックカード・木馬は、 みな別の絵", () => {
  const ids = [POT_EXT_ID, CHEST_EXT_ID, MAGNET_EXT_ID, HEAL_EXT_ID, WATCH_EXT_ID, THUNDER_EXT_ID, MAGIC_CARD_EXT_ID, TROJAN_EXT_ID];
  assert.equal(new Set(ids).size, ids.length);
});

test("宝箱の絵は、 武器・強化の絵と重ならない (= SPEC-076。 SPEC-097 でモアイの系列がパロットに替わり、 5 段目の弾とも重ならなくなった)", () => {
  const list = Array.isArray(EXT) ? EXT : (EXT.extensions ?? []);
  const base = new Set(), tiers = [];
  for (const e of list) {
    for (const k of ["iconId", "projectileIconId"]) if (e[k] != null) base.add(e[k]);
    (e.tierIconIds ?? []).forEach((id, i) => { if (id === CHEST_EXT_ID) tiers.push(`${e.series}:${i + 1}`); });
  }
  assert.ok(base.size > 0);
  assert.equal(base.has(CHEST_EXT_ID), false);
  assert.deepEqual(tiers, []);
});
