// SPEC-089: PC でステージの始まりの帯のレイアウトを直す (= CSS の形を見る)
// 実行: node --test tests/stage-intro-pc.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../css/chars.css", import.meta.url), "utf8");
const start = CSS.indexOf("/* SPEC-089");
const pc = CSS.slice(start, CSS.indexOf("\n}\n", start) + 3);   // @media ブロック

test("PC (960px 以上) だけの媒体指定があり、 ヒーローは 192px (= 64 の 3 倍)", () => {
  assert.ok(start > 0, "SPEC-089 のブロックがある");
  assert.match(pc, /@media \(min-width: 960px\)/);
  const m = pc.match(/\.stage-intro__hero\s*\{[^}]*width:\s*(\d+)px;[^}]*height:\s*(\d+)px;/s);
  assert.ok(m, "ヒーローの大きさがある");
  assert.equal(m[1], m[2]);
  assert.equal(Number(m[1]) % 64, 0, "64 の倍数");
  assert.equal(Number(m[1]), 192);
});

test("文字とヒーローは真ん中の幅に寄せる (= 文字の左とヒーローの右を同じ式で)", () => {
  assert.match(pc, /--intro-w:\s*560px/);
  assert.match(pc, /padding-left:\s*max\(9%, calc\(50% - var\(--intro-w\) \/ 2\)\)/);
  assert.match(pc, /right:\s*max\(3%, calc\(50% - var\(--intro-w\) \/ 2\)\)/);
});

test("スマホの並び (= 128px・左 9%・右 3%・pixelated) と動きはそのまま", () => {
  const phone = CSS.slice(CSS.indexOf("3. ステージの始まり"), start);
  assert.match(phone, /\.stage-intro \{ align-items: flex-start; padding-left: 9%; \}/);
  assert.match(phone, /\.stage-intro__hero \{[^}]*right: 3%;[^}]*width: 128px;[^}]*height: 128px;[^}]*image-rendering: pixelated;/s);
  assert.match(phone, /@keyframes stage-intro-band/);
  assert.match(phone, /@keyframes stage-intro-hero/);
  assert.ok(!/animation/.test(pc), "PC のブロックで動きを触らない");
});
