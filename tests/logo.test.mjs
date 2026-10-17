// SPEC-070: タイトルのロゴ (= assets/logo.png) は背景が透けていて、 四角い枠が出ない
// 実行: node --test tests/logo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";

const root = new URL("../", import.meta.url);

/** PNG を読む (= 8 bit の RGBA だけ。 ロゴの確かめに足りるぶん) */
function readPngRgba(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, color = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; color = data[9]; }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    pos += 12 + len;
  }
  assert.equal(depth, 8, "8 bit");
  assert.equal(color, 6, "RGBA (= 透明を持つ)");
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= bpp && y > 0 ? out[(y - 1) * stride + i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : (pb <= pc ? b : c); }
      out[y * stride + i] = v & 0xff;
    }
  }
  return { w, h, alpha: (x, y) => out[y * stride + x * bpp + 3] };
}

test("ロゴは背景が透けている (= 四隅が透明。 SPEC-029 の暗い四角をやめた)", () => {
  const png = readPngRgba(readFileSync(new URL("assets/logo.png", root)));
  for (const [x, y] of [[0, 0], [png.w - 1, 0], [0, png.h - 1], [png.w - 1, png.h - 1]]) {
    assert.equal(png.alpha(x, y), 0, `corner ${x},${y}`);
  }
  assert.ok(png.alpha(png.w >> 1, png.h >> 1) > 0 || png.alpha(png.w >> 1, Math.round(png.h * 0.25)) > 0, "中身がある");
  assert.ok(png.w / png.h > 1.4 && png.w / png.h < 2.2, "縦に積んだロゴ (= 横長の帯ではない)");
});

test("ロゴの元 (= tools/logo) があり、 スプラッシュとタイトルが同じロゴを使う", () => {
  assert.ok(existsSync(new URL("tools/logo/logo.html", root)));
  assert.ok(existsSync(new URL("tools/logo/emblem.png", root)));
  const html = readFileSync(new URL("index.html", root), "utf8");
  assert.ok(html.includes('class="splash__logo" src="assets/logo.png"'));
  assert.ok(html.includes('class="title-screen__logo" src="assets/logo.png"'));
});
