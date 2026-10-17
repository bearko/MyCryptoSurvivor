// SPEC-067: リロールで続けて同じものを出さない・スキップ
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickFromPool } from "../js/battle/levelup.js";

const W = (id) => ({ extId: id, category: "weapon" });
const B = (id) => ({ extId: id, category: "buff" });
const ids = (arr) => arr.map((e) => e.extId).sort((a, b) => a - b);
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

test("武器を 1 つ入れ、 重ならない 3 つを選ぶ", () => {
  for (let k = 0; k < 50; k++) {
    const r = pickFromPool([W(1), W(2), B(3), B(4), B(5)], 3, { rnd });
    assert.equal(r.length, 3);
    assert.equal(new Set(ids(r)).size, 3);
    assert.ok(r.some((e) => e.category === "weapon"));
  }
});

test("リロールでは、 そのレベルアップで出したものを続けて出さない (= 足りるかぎり)", () => {
  const pool = [W(1), W(2), W(3), B(4), B(5), B(6), B(7)];
  for (let k = 0; k < 50; k++) {
    const first = pickFromPool(pool, 3, { rnd });
    const shown = new Set(first.map((e) => String(e.extId)));
    const second = pickFromPool(pool, 3, { exclude: shown, last: shown, rnd });
    assert.equal(second.length, 3);
    for (const e of second) assert.ok(!shown.has(String(e.extId)), "前の 3 つは出ない");
  }
});

test("候補が足りないときだけ前のものを混ぜ、 直前のものは最後に回す", () => {
  const pool = [W(1), B(2), B(3), B(4), B(5)];
  const shown = new Set(["1", "2", "3"]);   // 1 回目に出したもの
  const last = new Set(["3", "4", "5"]);    // 直前 (= 2 回目) に出したもの
  for (let k = 0; k < 30; k++) {
    // 出していないものは無い: 2 回目より前にだけ出したもの (1・2) を先に、 足りない 1 つを直前のものから
    const r = pickFromPool(pool, 3, { exclude: new Set([...shown, ...last]), last, rnd });
    assert.equal(r.length, 3);
    assert.ok(ids(r).includes(1) && ids(r).includes(2));
  }
  assert.deepEqual(ids(pickFromPool([W(1), B(2)], 3, { rnd })), [1, 2], "候補が 3 つ未満ならあるだけ");
  assert.deepEqual(pickFromPool([], 3, { rnd }), []);
});
