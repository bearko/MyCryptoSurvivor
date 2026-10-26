// SPEC-179: ホーム画面のアイコン (= 丸型・角丸で切り抜いても白枠が出ない・絵が欠けない)
// 実行: node --test tests/icons.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const pngSize = (p) => { const b = readFileSync(new URL(p, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };   // 幅・高さ・色の型 (2 = RGB、 6 = RGBA)

test("manifest: ふつう (any) と切り抜き用 (maskable) を別の絵で 192 と 512", () => {
  const icons = JSON.parse(read("../manifest.json")).icons;
  for (const purpose of ["any", "maskable"]) {
    const sizes = icons.filter((i) => i.purpose === purpose).map((i) => i.sizes).sort();
    assert.deepEqual(sizes, ["192x192", "512x512"], purpose);
  }
  const any = new Set(icons.filter((i) => i.purpose === "any").map((i) => i.src));
  for (const i of icons.filter((i) => i.purpose === "maskable")) assert.ok(!any.has(i.src), "切り抜き用は専用の絵");
});

test("どのアイコンも不透明 (= 透明なところが白や黒で埋められない) で、 書いてある大きさ", () => {
  const icons = JSON.parse(read("../manifest.json")).icons;
  for (const i of icons) {
    const p = `../${i.src}`;
    assert.ok(existsSync(new URL(p, import.meta.url)), i.src);
    const [w, h, type] = pngSize(p);
    assert.equal(`${w}x${h}`, i.sizes, i.src);
    assert.equal(type, 2, `${i.src} は RGB (= アルファ無し)`);
  }
  assert.equal(pngSize("../assets/icons/apple-touch-icon.png")[2], 2, "iOS は透明なところを黒で埋める");
});
