// SPEC-081: ボス戦の宝箱 (= 枠の中に出る。 マジックカードが出るのはボス戦の宝箱だけ)
// 実行: node --test tests/boss-chest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { tickField, dropFromProp, chestDrops } from "../js/battle/field.js";
import { ARENA } from "../js/battle/arena.js";
import { BOSS_CHEST, BOSS_CHEST_DROPS, CHEST_DROPS, CHEST_DROPS_RTA, CHEST_TIMES_MS, BOSS_SPAWN_AT_MS } from "../js/constants.js";
import { state } from "../js/state.js";

function setup() {
  const b = state.battle;
  b.stageElapsedMs = BOSS_SPAWN_AT_MS;
  b.nextChestIdx = CHEST_TIMES_MS.length;   // ふつうの宝箱は出しきった
  b.nextPotAtMs = 1e12;
  b.bossSpawned = true;
  b.bossDefeated = false;
  b.arena = { t: 1e9 };
  b.bossChestAtMs = null;
  b.player = { x: 0, y: 200, r: 20 };
  b.enemies = [{ id: 1, isBoss: true, x: 0, y: 0, r: 50 }];
  b.items = [];
  b.gems = [];
  b.magicCards = [];
  b.obstacles = [];
  b.obstacleRects = [];
  b.nextEntityId = 10;
  return b;
}
const chests = (b) => b.enemies.filter((e) => e.bossChest);
const step = (b, ms) => { b.stageElapsedMs += ms; tickField(ms / 1000); };

test("ボスが出て少ししてから、 枠の中に宝箱が出る (= 自分から少し離れ、 ボスに重ならない)", () => {
  const b = setup();
  tickField(0);
  assert.equal(chests(b).length, 0);
  step(b, BOSS_CHEST.firstMs - 100);
  assert.equal(chests(b).length, 0);
  step(b, 200);
  assert.equal(chests(b).length, 1);
  const c = chests(b)[0];
  assert.equal(c.propKind, "chest");
  assert.ok(Math.abs(c.x) <= ARENA.halfW && Math.abs(c.y) <= ARENA.halfH, "枠の中");
  assert.ok(Math.hypot(c.x - b.player.x, c.y - b.player.y) >= BOSS_CHEST.minD - 1);
  assert.ok(Math.hypot(c.x, c.y) >= 50 + c.r, "ボスに重ならない");
});

test("一定の間隔で足し、 場には上限まで", () => {
  const b = setup();
  tickField(0);
  for (let i = 0; i < 10; i++) step(b, BOSS_CHEST.everyMs);
  assert.equal(chests(b).length, BOSS_CHEST.maxOnField);
});

test("ボスを倒したら・枠がなければ出ない", () => {
  let b = setup();
  b.bossDefeated = true;
  tickField(0); step(b, 60000);
  assert.equal(chests(b).length, 0);
  b = setup();
  b.arena = null;
  tickField(0); step(b, 60000);
  assert.equal(chests(b).length, 0);
});

test("中身: マジックカード・パンケーキ・サンダー・磁石。 懐中時計は出ない (= RTA の最短時間を変えない)", () => {
  const kinds = BOSS_CHEST_DROPS.map((d) => d.kind);
  assert.deepEqual(kinds.sort(), ["card", "heal", "magnet", "thunder"]);
  assert.ok(!kinds.includes("watch"));
  // マジックカードは、 ボス戦の宝箱だけ
  for (const t of [CHEST_DROPS, CHEST_DROPS_RTA]) assert.ok(!t.some((d) => d.kind === "card"));
  assert.ok(BOSS_CHEST_DROPS.find((d) => d.kind === "card").w >= 30, "カードがいちばん出やすい");
});

test("ボス戦の宝箱を壊すと、 カードかお助けアイテムと CE。 ふつうの宝箱からカードは出ない", () => {
  const b = setup();
  const orig = Math.random;
  try {
    let got = { card: 0, item: 0 };
    for (let i = 0; i < 200; i++) {
      Math.random = () => (i + 0.5) / 200;
      b.items = []; b.magicCards = []; b.gems = [];
      dropFromProp({ propKind: "chest", bossChest: true, x: 0, y: 0 });
      got.card += b.magicCards.length;
      got.item += b.items.length;
      assert.equal(b.magicCards.length + b.items.length, 1);
      assert.ok(b.gems.length > 0);
    }
    assert.ok(Math.abs(got.card / 200 - 0.4) < 0.02, `card ${got.card}`);
    for (let i = 0; i < 50; i++) {
      Math.random = () => (i + 0.5) / 50;
      b.magicCards = [];
      dropFromProp({ propKind: "chest", x: 0, y: 0 });
      assert.equal(b.magicCards.length, 0);
    }
  } finally { Math.random = orig; }
  assert.ok(chestDrops());
});
