// SPEC-064: ステージごとの仕掛け
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BEADS, PUNCH, TROJAN, TROJAN_EXT_ID, beadX, beadLead, beadRowDone, inHole, punchInterval, trojanSecLeft,
} from "../js/battle/gimmicks.js";
import { STAGE_TABLE, BOSS_SPAWN_AT_MS, BOSS_WARNING_LEAD_MS, CHEST_DROPS } from "../js/constants.js";

test("ステージごとに仕掛けが 1 つ (= 珠の列・パンチカード・トロイの木馬)", () => {
  assert.deepEqual(STAGE_TABLE.map((s) => s.gimmick), ["beads", "punch", "trojan"]);
});

test("珠の列は予告のあいだ止まっていて、 そのあと向きに進み、 抜けきると終わる", () => {
  const row = { x0: -300, x1: 300, dir: 1 };
  assert.equal(beadLead(row, 0), -300);
  assert.equal(beadLead(row, BEADS.warnMs), -300);
  assert.equal(beadLead(row, BEADS.warnMs + 1000), -300 + BEADS.speed);
  assert.equal(beadX(100, 1, 2), 100 - 2 * BEADS.gap, "後ろの珠は進む向きと逆へ並ぶ");
  assert.equal(beadX(100, -1, 2), 100 + 2 * BEADS.gap);
  assert.equal(beadRowDone(row, BEADS.warnMs), false);
  assert.equal(beadRowDone(row, BEADS.warnMs + 5000), true);
  const back = { x0: 300, x1: -300, dir: -1 };
  assert.equal(beadRowDone(back, BEADS.warnMs + 5000), true);
  assert.ok(BEADS.warnMs >= 1000, "見てから避けられる");
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
