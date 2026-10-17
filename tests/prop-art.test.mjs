// SPEC-074: 壺も宝箱もマイクリのエクステンションの絵。 ほかの絵と取り違えない
// 実行: node --test tests/prop-art.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  POT_EXT_ID, CHEST_EXT_ID, MAGNET_EXT_ID, HEAL_EXT_ID, WATCH_EXT_ID, THUNDER_EXT_ID, MAGIC_CARD_EXT_ID,
} from "../js/constants.js";
import { TROJAN_EXT_ID } from "../js/battle/gimmicks.js";

const EXT = JSON.parse(readFileSync(new URL("../data/extensions.json", import.meta.url), "utf8"));

test("宝箱の絵は 1165 オルゴール (= 木の箱に見える)", () => {
  assert.equal(CHEST_EXT_ID, 1165);
});

test("壺・宝箱・お助けアイテム・マジックカード・木馬は、 みな別の絵", () => {
  const ids = [POT_EXT_ID, CHEST_EXT_ID, MAGNET_EXT_ID, HEAL_EXT_ID, WATCH_EXT_ID, THUNDER_EXT_ID, MAGIC_CARD_EXT_ID, TROJAN_EXT_ID];
  assert.equal(new Set(ids).size, ids.length);
});

test("宝箱の絵は、 武器・強化の絵と重ならない (= 拾うものと壊すものを取り違えない)", () => {
  const list = Array.isArray(EXT) ? EXT : (EXT.extensions ?? []);
  const used = new Set();
  for (const e of list) {
    for (const k of ["iconId", "projectileIconId"]) if (e[k] != null) used.add(e[k]);
    for (const id of e.tierIconIds ?? []) used.add(id);
  }
  assert.ok(used.size > 0);
  assert.equal(used.has(CHEST_EXT_ID), false);
});
