// SPEC-141: お助けアイテムを最前面に・画面の外のアイテムを縁の矢印と絵で示す
// 実行: node --test tests/item-pointers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../js/battle/render.js", import.meta.url), "utf8");

test("アイテムとマジックカードは粒のあと (= 敵・弾・自分より上)、 霧の下で描く", () => {
  const fx = src.indexOf("renderFxWorld(ctx, camera, w, h);");
  const items = src.indexOf("_drawItems(ctx, camera, w, h, nowMs);");
  const cards = src.indexOf("_drawMagicCards(ctx, camera, w, h, magicCards);");
  const fog = src.indexOf("if (mods.fogR) _drawFog");
  const player = src.indexOf("drawHitDisc(ctx, px, py, player.r, \"hero\")");
  assert.ok(player > 0 && fx > player && cards > fx && items > fx && fog > items, "自分 → 粒 → カード・アイテム → 霧");
  assert.equal(src.split("_drawItems(ctx, camera, w, h, nowMs);").length, 2, "描くのは 1 回だけ");
});

test("画面の外のアイテムは、 縁の矢印とそのすぐ内側の絵の丸 (= 近い順に 8 つまで)", async () => {
  const { ITEM_POINTER_MAX } = await import("../js/battle/render.js");
  assert.equal(ITEM_POINTER_MAX, 8);
  assert.match(src, /_drawItemPointers\(ctx, camera, w, h, nowMs, magicCards\);/);
  assert.match(src, /list\.sort\(\(p, q\) => p\.d - q\.d\)/);
  assert.match(src, /push\(c\.x, c\.y, "card", getMagicCardSprite\(\)\)/);
});
