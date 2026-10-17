// SPEC-053: 建物の当たり・出す場所・ドロップの抽選 (= js/battle/field-geom.js の純関数)
// 実行: node --test tests/field.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  obstacleRect, pushCircleOutOfRect, resolveCircle, circleHitsAnyRect,
  slideAlongWall, rayRectDistance, clipRayLength, rollTable, pickSpawnPoint,
} from "../js/battle/field-geom.js";
import {
  STAGE_TABLE, OBSTACLE_HITBOX_RATIO, WORLD_W, WORLD_H, POT_DROPS, CHEST_DROPS, CHEST_TIMES_MS,
  BOSS_SPAWN_AT_MS, CHEST_DROPS_RTA, WATCH_DURATION_MS, WATCH_SPEED,
} from "../js/constants.js";

const R = { x: 0, y: 0, w: 100, h: 60 };   // 左 -50 / 右 50 / 上 -30 / 下 30

test("建物の当たりの四角は、 絵の大きさの 8 割", () => {
  assert.deepEqual(obstacleRect({ x: 10, y: 20, size: 100 }, 0.8), { x: 10, y: 20, w: 80, h: 80 });
});

test("円が重なっていなければ押し出さない", () => {
  assert.equal(pushCircleOutOfRect(-70, 0, 10, R), null);
  assert.equal(pushCircleOutOfRect(-60, 0, 10, R), null, "ちょうど接しているだけ");
});

test("辺から重なった円は、 その辺の外へ押し出す", () => {
  const p = pushCircleOutOfRect(-55, 5, 10, R);
  assert.deepEqual([p.x, p.y, p.nx, p.ny], [-60, 5, -1, 0]);
  const q = pushCircleOutOfRect(0, 35, 10, R);
  assert.deepEqual([q.x, q.y, q.nx, q.ny], [0, 40, 0, 1]);
});

test("角から重なった円は、 角から斜めに押し出す", () => {
  const p = pushCircleOutOfRect(55, 35, 10, R);
  assert.ok(Math.abs(Math.hypot(p.x - 50, p.y - 30) - 10) < 1e-9);
  assert.ok(p.nx > 0 && p.ny > 0);
});

test("中心が四角の中に入っていたら、 いちばん浅い辺から出す", () => {
  const p = pushCircleOutOfRect(45, 0, 10, R);
  assert.deepEqual([p.x, p.nx], [60, 1]);
  const q = pushCircleOutOfRect(0, -25, 10, R);
  assert.deepEqual([q.y, q.ny], [-40, -1]);
});

test("いくつもの四角から外へ出す", () => {
  const rects = [R, { x: 0, y: 70, w: 100, h: 60 }];   // 上下に並んだ 2 つ (= すきま 10)
  const res = resolveCircle(-55, 35, 12, rects);
  assert.equal(res.hit, true);
  assert.equal(circleHitsAnyRect(res.x, res.y, 12 - 1e-6, rects), false);
  assert.deepEqual(resolveCircle(-200, 0, 12, rects), { x: -200, y: 0, hit: false, nx: 0, ny: 0 });
});

test("壁に当たった敵は、 目標に近づく向きへ壁に沿って回りこむ", () => {
  // 左の壁 (法線 -1, 0) に当たって、 目標は右上
  const s = slideAlongWall(-1, 0, 100, -50);
  assert.deepEqual([s.x, s.y], [-0, -1]);
  const t = slideAlongWall(-1, 0, 100, 50);
  assert.deepEqual([t.x, t.y], [0, 1]);
});

test("レーザーは最初に当たる建物の手前で止まる", () => {
  assert.equal(rayRectDistance(-100, 0, 1, 0, R), 50);
  assert.equal(rayRectDistance(-100, 0, -1, 0, R), Infinity, "反対向き");
  assert.equal(rayRectDistance(-100, 100, 1, 0, R), Infinity, "横を通りすぎる");
  assert.equal(rayRectDistance(0, 0, 1, 0, R), 0, "中から");
  assert.equal(clipRayLength(-100, 0, 1, 0, 300, [R]), 50);
  assert.equal(clipRayLength(-100, 0, 1, 0, 30, [R]), 30, "届かなければ元の長さ");
  assert.equal(clipRayLength(-100, 0, 1, 0, 300, []), 300);
});

test("ドロップの抽選は重みどおり", () => {
  const table = [{ kind: "a", w: 1 }, { kind: "b", w: 3 }];
  assert.equal(rollTable(table, 0), "a");
  assert.equal(rollTable(table, 0.24), "a");
  assert.equal(rollTable(table, 0.25), "b");
  assert.equal(rollTable(table, 0.999), "b");
  assert.equal(rollTable([], 0.5), null);
  for (const t of [POT_DROPS, CHEST_DROPS]) {
    assert.ok(t.every((e) => e.w > 0));
    assert.ok(t.every((e) => ["ce", "heal", "magnet"].includes(e.kind)));
  }
});

test("壺・宝箱は、 世界の中で建物から離れた場所に置く", () => {
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const stage of STAGE_TABLE) {
    const rects = stage.obstacles.map((o) => obstacleRect(o, OBSTACLE_HITBOX_RATIO));
    for (let i = 0; i < 200; i++) {
      const at = pickSpawnPoint({ rnd, px: 0, py: 0, minD: 200, maxD: 700, halfW: WORLD_W / 2, halfH: WORLD_H / 2, rects, r: 18 });
      if (!at) continue;
      const d = Math.hypot(at.x, at.y);
      assert.ok(d >= 200 && d <= 700);
      assert.ok(Math.abs(at.x) <= WORLD_W / 2 - 18 && Math.abs(at.y) <= WORLD_H / 2 - 18);
      assert.equal(circleHitsAnyRect(at.x, at.y, 18 + 24, rects), false);
    }
  }
  const blocked = pickSpawnPoint({ rnd, px: 0, py: 0, minD: 10, maxD: 20, halfW: 500, halfH: 500, rects: [{ x: 0, y: 0, w: 200, h: 200 }], r: 10 });
  assert.equal(blocked, null, "置けなければ null");
});

test("建物はヒーローの出発点 (0, 0) をふさがず、 世界の中にある", () => {
  for (const stage of STAGE_TABLE) {
    assert.ok(stage.obstacles.length > 0);
    const rects = stage.obstacles.map((o) => obstacleRect(o, OBSTACLE_HITBOX_RATIO));
    assert.equal(circleHitsAnyRect(0, 0, 150, rects), false);
    for (const r of rects) {
      assert.ok(Math.abs(r.x) + r.w / 2 < WORLD_W / 2 && Math.abs(r.y) + r.h / 2 < WORLD_H / 2);
    }
  }
});

test("宝箱は 1 ステージ 4 つ、 すべてボスより前に出る (= 共通基盤の RTA の最短時間の根拠)", () => {
  assert.equal(CHEST_TIMES_MS.length, 4);
  assert.ok(CHEST_TIMES_MS.every((t) => t < BOSS_SPAWN_AT_MS));
});

test("SPEC-054: 懐中時計は RTA の宝箱からだけ出る", () => {
  assert.ok(CHEST_DROPS_RTA.some((e) => e.kind === "watch" && e.w > 0));
  assert.ok(!CHEST_DROPS.some((e) => e.kind === "watch"), "RTA でないときは出ない");
  assert.ok(!POT_DROPS.some((e) => e.kind === "watch"), "壺からは出ない");
});

test("SPEC-054: 懐中時計で縮む実時間は 1 ステージ 40 秒まで (= 共通基盤 survivor-normal-v2 の最短 3 分 15 秒の根拠)", () => {
  // 2 倍速の実時間 T でゲーム内は 2T 進む → 実時間が T 縮む。 宝箱は 1 ステージ 4 つ
  const maxSaveMs = CHEST_TIMES_MS.length * WATCH_DURATION_MS * (WATCH_SPEED - 1);
  assert.equal(maxSaveMs, 40000);
  assert.ok(BOSS_SPAWN_AT_MS - maxSaveMs >= 195e3, "ボスが出るのは実時間で 3 分 20 秒より前にはならない");
});
