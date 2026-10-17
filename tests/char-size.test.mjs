// SPEC-077: キャラを大きく・当たりの円を薄く
// 実行: node --test tests/char-size.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAR_SCALE, BOSS_CHAR_SCALE, CHAR_SPRITE_RATIO, PLAYER_RADIUS } from "../js/constants.js";
import { HIT_DISC_STYLE } from "../js/battle/sprites.js";

const RENDER = readFileSync(new URL("../js/battle/render.js", import.meta.url), "utf8");

test("自分と敵は 1.4 倍、 ボスは 1.2 倍 (= 視界はそのまま)", () => {
  assert.equal(CHAR_SCALE, 1.4);
  assert.equal(BOSS_CHAR_SCALE, 1.2);
  assert.equal(Math.round(PLAYER_RADIUS * CHAR_SCALE), 20);
  assert.ok(CHAR_SPRITE_RATIO > 2 && CHAR_SPRITE_RATIO < 3, "絵は当たりの円より少し大きく (= 絵の縁は透明)");
});

test("当たりの目安は薄い円 (= 太い黒い縁にしない)。 自分はシアン、 撃ってくる敵は赤い縁", () => {
  for (const [k, s] of Object.entries(HIT_DISC_STYLE)) {
    assert.ok(s.a0 <= 0.35 && s.a1 <= 0.1, `${k}: 面は薄く`);
    assert.ok(s.rimW <= 2, `${k}: 縁は細く`);
    assert.ok(!/rgba\(0, 0, 0/.test(s.rim), `${k}: 黒い縁にしない`);
  }
  assert.deepEqual(HIT_DISC_STYLE.hero.fill, [86, 204, 242]);
  assert.match(HIT_DISC_STYLE.shooter.rim, /255, 96, 112/);
});

test("自分と敵の絵は円で切り抜かず、 足もとに当たりの円を敷く", () => {
  assert.ok(!/drawSpriteCircular\(ctx, sp, sx, sy, e\.r\)/.test(RENDER), "敵を円で切り抜かない");
  assert.ok(!/drawSpriteCircular\(ctx, state\.battle\.playerSprite/.test(RENDER), "自分を円で切り抜かない");
  assert.match(RENDER, /drawHitDisc\(ctx, px, py, player\.r, "hero"\)/);
  assert.match(RENDER, /drawHitDisc\(ctx, sx, sy, e\.r,/);
});
