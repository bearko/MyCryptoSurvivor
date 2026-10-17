// SPEC-078: 画面の敵の密度を目標に保つ・湧く数・置いていかれた敵の寄せ直し (= js/battle/horde.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  densityTarget, screenDensity, densityShortfall, spawnBudget, isLeftBehind, canRecycle, recycleActive, RECYCLE_FROM,
  DENSITY_AVG_R, SPAWN_MAX_PER_FRAME, RECYCLE_K,
} from "../js/battle/horde.js";
import { STAGE_TABLE, BOSS_SPAWN_AT_MS } from "../js/constants.js";

test("SPEC-078: 密度の目標は fromMs まで 0、 fullMs で max。 終わりほど急に上がる (= SPEC-084 でさらに序盤をゆるく)", () => {
  const d = { fromMs: 10000, fullMs: 110000, max: 1 };
  assert.equal(densityTarget(d, 0), 0);
  assert.equal(densityTarget(d, 10000), 0);
  assert.equal(densityTarget(d, 110000), 1);
  assert.equal(densityTarget(d, 200000), 1);
  const mid = densityTarget(d, 60000);
  assert.ok(mid > 0 && mid < 0.25, "まんなかでは 1/4 より低い");
  assert.equal(densityTarget(null, 100000), 0);
});

test("SPEC-078: ボスの直前の目標は、 後のステージほど濃い", () => {
  const at = STAGE_TABLE.map((s) => densityTarget(s.density, BOSS_SPAWN_AT_MS - 1000));
  assert.ok(at[0] > 0 && at[0] < at[1] && at[1] < at[2]);
});

test("SPEC-078: 画面の密度は、 画面の中の敵の円の面積の和 ÷ 画面の面積 (= 壺・ボス・木馬は数えない)", () => {
  const r = 10, A = Math.PI * r * r;
  const es = [
    { x: 50, y: 50, r },                          // 中
    { x: 150, y: 50, r },                         // 中
    { x: 500, y: 50, r },                         // 外
    { x: 60, y: 60, r, isProp: true },
    { x: 60, y: 60, r, isBoss: true },
    { x: 60, y: 60, r, behavior: "trojan" },
  ];
  assert.ok(Math.abs(screenDensity(es, 0, 0, 200, 100) - (2 * A) / 20000) < 1e-12);
  // カメラが動けば、 数える敵も変わる
  assert.ok(Math.abs(screenDensity(es, 400, 0, 200, 100) - A / 20000) < 1e-12);
});

test("SPEC-078: 足りない数は、 ふつうの大きさの敵で数える", () => {
  const vw = 400, vh = 800;
  assert.equal(densityShortfall(0.5, 0.6, vw, vh), 0);
  const n = densityShortfall(0.5, 0, vw, vh);
  assert.equal(n, Math.ceil((0.5 * vw * vh) / (Math.PI * DENSITY_AVG_R * DENSITY_AVG_R)));
});

test("SPEC-078: 湧く数は経った時間から。 1 コマに何体でも (= 上限まで)。 余りは持ち越す", () => {
  let r = spawnBudget(0, 16, 100, 100);
  assert.equal(r.n, 0);
  assert.ok(Math.abs(r.acc - 0.16) < 1e-9);
  r = spawnBudget(0.5, 250, 100, 100);
  assert.equal(r.n, 3);
  assert.ok(Math.abs(r.acc - 0) < 1e-9);
  // 1 コマに固まらない
  r = spawnBudget(0, 1000, 10, 1000);
  assert.equal(r.n, SPAWN_MAX_PER_FRAME);
  // 上限に届いたら、 余りをためこまない
  r = spawnBudget(0, 1000, 10, 2);
  assert.equal(r.n, 2);
  assert.ok(r.acc <= 1);
  r = spawnBudget(0, 1000, 10, 0);
  assert.equal(r.n, 0);
});

test("SPEC-078: 置いていかれた敵 (= 湧く輪の K 倍より外) だけ寄せ直す。 壺・宝箱・木馬・ボス・レアは動かさない", () => {
  const hw = 300, hh = 500;
  assert.equal(isLeftBehind(0, 0, hw, hh), false);
  assert.equal(isLeftBehind(hw, 0, hw, hh), false);                  // 湧く輪の上
  assert.equal(isLeftBehind(hw * RECYCLE_K * 0.99, 0, hw, hh), false);
  assert.equal(isLeftBehind(hw * RECYCLE_K * 1.01, 0, hw, hh), true);
  assert.equal(isLeftBehind(0, -hh * RECYCLE_K * 1.01, hw, hh), true);
  assert.ok(RECYCLE_K > 1.2, "画面のすぐ外の敵は動かさない");
  assert.equal(canRecycle({}), true);
  assert.equal(canRecycle({ behavior: "shooter" }), true);
  for (const e of [{ isProp: true }, { isBoss: true }, { isRare: true }, { behavior: "trojan" }]) assert.equal(canRecycle(e), false);
});

test("SPEC-084: 寄せ直すのはボスの前だけ (= 序盤は逃げ回れば敵を置いていける)", () => {
  for (const st of STAGE_TABLE) {
    const d = st.density;
    assert.equal(recycleActive(d, 60000), false, `stage ${st.idx}: 1:00`);
    assert.equal(recycleActive(d, 150000), false, `stage ${st.idx}: 2:30`);
    assert.equal(recycleActive(d, BOSS_SPAWN_AT_MS - 10000), true, `stage ${st.idx}: 3:50`);
  }
  assert.equal(recycleActive(null, 200000), false);
  assert.ok(RECYCLE_FROM > 0 && RECYCLE_FROM < 1);
});
