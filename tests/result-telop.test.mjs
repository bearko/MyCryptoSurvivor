// SPEC-058: 結果のテロップ
import { test } from "node:test";
import assert from "node:assert/strict";
import { TELOP_KINDS, TELOP_MS, TELOP_POSE2_MS, telopSpec, presentResult } from "../js/result-telop.js";
import { NAVI_POSES } from "../js/navi.js";
import fs from "node:fs";

const ui = JSON.parse(fs.readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

test("テロップは短く (= 結果を待たせない。 押せば飛ばせる)", () => {
  assert.ok(TELOP_MS >= 1000 && TELOP_MS <= 2000);
  assert.ok(TELOP_POSE2_MS > 0 && TELOP_POSE2_MS < TELOP_MS);
});

test("どの結果にも ja・en の文と、 マインちゃんのポーズが 2 つある", () => {
  for (const [kind, spec] of Object.entries(TELOP_KINDS)) {
    for (const key of [spec.sub, spec.line]) {
      assert.ok(ui[key]?.ja && ui[key]?.en, `${kind}: ${key}`);
    }
    assert.equal(spec.poses.length, 2, kind);
    for (const p of spec.poses) assert.ok(NAVI_POSES[p], `${kind}: ${p}`);
  }
});

test("倒れたときは負けの色、 クリアは勝ちの色。 知らない種類はクリア", () => {
  assert.equal(telopSpec("lose").tone, "lose");
  assert.equal(telopSpec("clear").tone, "win");
  assert.equal(telopSpec("allClear").tone, "win");
  assert.equal(telopSpec("???"), TELOP_KINDS.clear);
});

test("画面が無くても、 結果の画面を出す続き (= then) はすぐ呼ばれる", () => {
  let called = 0;
  presentResult(null, "clear", { then: () => { called += 1; } });
  assert.equal(called, 1);
});
