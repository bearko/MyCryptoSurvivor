// SPEC-064: ステージごとの仕掛け
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BEADS, BEAD_DIRS, PUNCH, TROJAN, TROJAN_EXT_ID, beadPos, beadLead, beadRowDone, beadDirChoices, beadSpan, clipRowToWorld,
  inHole, punchInterval, trojanSecLeft,
} from "../js/battle/gimmicks.js";
import { STAGE_TABLE, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS, CHEST_DROPS } from "../js/constants.js";

test("ステージごとに仕掛けが 1 つ (= 珠の列・パンチカード・トロイの木馬)", () => {
  assert.deepEqual(STAGE_TABLE.map((s) => s.gimmick), ["beads", "punch", "trojan"]);
});

test("珠の列は予告のあいだ止まっていて、 そのあと向きに進み、 抜けきると終わる", () => {
  const row = { x0: -300, y0: 50, ux: 1, uy: 0, len: 600 };
  assert.equal(beadLead(row, 0), 0);
  assert.equal(beadLead(row, BEADS.warnMs), 0);
  assert.equal(beadLead(row, BEADS.warnMs + 1000), BEADS.speed);
  assert.deepEqual(beadPos(row, 100, 0), { x: -200, y: 50, s: 100 });
  assert.equal(beadPos(row, 100, 2).x, -200 - 2 * BEADS.gap, "後ろの珠は進む向きと逆へ並ぶ");
  const back = { x0: 300, y0: 0, ux: -1, uy: 0, len: 600 };
  assert.equal(beadPos(back, 100, 2).x, 300 - 100 + 2 * BEADS.gap);
  assert.equal(beadRowDone(row, BEADS.warnMs), false);
  assert.equal(beadRowDone(row, BEADS.warnMs + 5000), true);
  assert.equal(beadRowDone(back, BEADS.warnMs + 5000), true);
  assert.ok(BEADS.warnMs >= 1000, "見てから避けられる");
});

test("SPEC-075: 列は縦・斜めにも走る (= 同じ計算で)", () => {
  const down = { x0: 0, y0: -400, ux: 0, uy: 1, len: 800 };
  assert.deepEqual(beadPos(down, 300, 1), { x: 0, y: -400 + 300 - BEADS.gap, s: 300 - BEADS.gap });
  const [dx, dy] = BEAD_DIRS.d[0];
  const diag = { x0: 0, y0: 0, ux: dx, uy: dy, len: 500 };
  const q = beadPos(diag, 100, 0);
  assert.ok(Math.abs(Math.hypot(q.x, q.y) - 100) < 1e-9, "斜めでも進んだ道のりは同じ");
  for (const list of Object.values(BEAD_DIRS)) for (const [ux, uy] of list) assert.ok(Math.abs(Math.hypot(ux, uy) - 1) < 1e-9);
});

test("SPEC-075: 最初の列は横。 そのあとは横・縦、 後半は斜めも", () => {
  assert.deepEqual(beadDirChoices(BEADS.firstMs, true), BEAD_DIRS.h);
  const early = beadDirChoices(BEADS.diagFromMs - 1, false);
  assert.equal(early.length, 4);
  assert.ok(early.every(([ux, uy]) => ux === 0 || uy === 0), "斜めはまだ出ない");
  const late = beadDirChoices(BEADS.diagFromMs, false);
  assert.equal(late.length, 8);
  assert.ok(BEADS.firstMs < BEADS.diagFromMs && BEADS.diagFromMs < BOSS_SPAWN_AT_MS);
});

test("SPEC-075: 列は画面の外から外へ横切り (= 向きに合わせた長さ)、 世界の外にははみ出さない", () => {
  assert.equal(beadSpan(1, 0, 390, 700), 390 + BEADS.margin * 2);
  assert.equal(beadSpan(0, -1, 390, 700), 700 + BEADS.margin * 2);
  const [dx, dy] = BEAD_DIRS.d[0];
  assert.ok(Math.abs(beadSpan(dx, dy, 390, 700) - ((390 + 700) * Math.SQRT1_2 + BEADS.margin * 2)) < 1e-9);
  // 世界 (= ±1000, ±1000) の中に切りつめる
  assert.deepEqual(clipRowToWorld(-1200, 0, 1, 0, 600, 1000, 1000), { x0: -1000, y0: 0, len: 400 });
  assert.deepEqual(clipRowToWorld(-500, 0, 1, 0, 600, 1000, 1000), { x0: -500, y0: 0, len: 600 });
  assert.equal(clipRowToWorld(-1200, 0, -1, 0, 100, 1000, 1000), null, "世界にかからない");
  const c = clipRowToWorld(-1100, -1100, dx, dy, 600, 1000, 1000);
  assert.ok(c && Math.abs(c.x0 + 1000) < 1e-9 && Math.abs(c.y0 + 1000) < 1e-9);
});

test("SPEC-075: 珠の絵は球状黒鉛 (= グラファイトの Legendary)", () => {
  assert.equal(BEADS.extId, 5042);
});

test("パンチの穴の当たり (= 半径の 6 割まではみ出してよい) と、 間隔が後半で縮む", () => {
  assert.equal(inHole(0, 0, 0, 0, 10), true);
  assert.equal(inHole(0, 0, PUNCH.w / 2 + 5, 0, 10), true);
  assert.equal(inHole(0, 0, PUNCH.w / 2 + 7, 0, 10), false);
  assert.equal(punchInterval(0), PUNCH.everyMs);
  assert.equal(punchInterval(PUNCH.fastFromMs), PUNCH.fastEveryMs);
  assert.ok(PUNCH.fastEveryMs > PUNCH.warnMs + PUNCH.decalMs, "前の穴が消えてから次");
});

test("木馬はボスの予告より前に出て、 開くまでに予告より前に終わる。 壊したときの中身に懐中時計はない", () => {
  for (const at of TROJAN.atMs) {
    assert.ok(at + TROJAN.openMs < BOSS_SPAWN_AT_MS - BOSS_WARNING_LEAD_MS);
  }
  assert.equal(trojanSecLeft(9000), 9);
  assert.equal(trojanSecLeft(8001), 9);
  assert.equal(trojanSecLeft(0), 0);
  assert.equal(TROJAN_EXT_ID, 5179);
  assert.ok(!CHEST_DROPS.some((e) => e.kind === "watch"), "RTA の最短時間を変えない");
  assert.equal(TROJAN.size % 64, 0, "ドット絵は 64 の整数倍");
  assert.equal(TROJAN.swarm.length, TROJAN.atMs.length, "何頭目かで群れの数が決まる");
  for (let i = 1; i < TROJAN.swarm.length; i++) assert.ok(TROJAN.swarm[i] > TROJAN.swarm[i - 1], "だんだん増える");
});
