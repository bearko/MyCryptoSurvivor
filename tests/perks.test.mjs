// SPEC-090c: スキルツリーの効果 (= 節の fx を足す・RTA では切る・定数の差し替え・強化の土台・画面の 1 行)
// 実行: node --test tests/perks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  NO_PERKS, computePerks, perksForRun, perkBuffBase, reweight, scaleWeight, perksSummary,
  contactCooldownMs, rerollsPerBattle, stockLimit, potMaxOnField, chestTimesMs, healRatio, thunderBossRatio,
  bossChestCfg, bossChestDrops, potDrops, rareIntervalMs, itemPickupMul, xpGainMul, windupMs,
  bossDmgDealtMul, bossDmgTakenMul, dashMul, baseMaxHp, EARLY_CHEST_MS,
} = await import("../js/perks.js");
const { state } = await import("../js/state.js");
const C = await import("../js/constants.js");
const { normalizeMeta, RENAMED_NODES } = await import("../js/meta.js");
const { TREE_NODES } = await import("../js/skill-data.js");

const meta = (nodes) => ({ gum: 0, dust: 0, nodes });

test("何も取っていなければ全部 0。 段 × fx を足し、 値を置くものは置く", () => {
  assert.deepEqual(computePerks(meta({})), { ...NO_PERKS });
  const p = computePerks(meta({ root: 1, vit_hp: 3, vit_armor: 2, atk_cd: 5, vit_pancake: 1, cap_vit: 1, trs_rare: 1, grw_reroll: 2 }));
  assert.equal(p.hpMul, 0.12 + 0.20, "頑丈なからだ 3 段 ＋ 鉄壁");
  assert.equal(p.dmgTakenMul, -0.06 - 0.10, "厚い皮 2 段 ＋ 鉄壁");
  assert.equal(p.cdMul, -0.1);
  assert.equal(p.pancakeHeal, 0.4, "置く");
  assert.equal(p.rareIntervalSec, 45, "置く");
  assert.equal(p.reroll, 2);
  assert.equal(p.dmgMul, 0, "取っていない道は 0");
  for (const n of TREE_NODES) for (const k of Object.keys(n.fx ?? {})) assert.ok(k in NO_PERKS, `${n.id} の fx.${k} は表にある`);
});

test("RTA では切る (= perksForRun)", () => {
  const m = meta({ root: 1, atk_dmg: 5 });
  assert.equal(perksForRun(m).dmgMul, 0.15);
  assert.deepEqual(perksForRun(m, { rta: true }), { ...NO_PERKS });
});

test("定数の差し替え: state.perks が無ければ元のまま、 あれば足す", () => {
  state.perks = null;
  assert.equal(contactCooldownMs(), C.CONTACT_COOLDOWN_MS);
  assert.equal(rerollsPerBattle(), C.REROLL_PER_BATTLE);
  assert.equal(stockLimit("weapon"), C.STOCK_LIMIT_WEAPON);
  assert.equal(stockLimit("buff"), C.STOCK_LIMIT_BUFF);
  assert.equal(potMaxOnField(), C.POT_MAX_ON_FIELD);
  assert.equal(chestTimesMs(), C.CHEST_TIMES_MS);
  assert.equal(healRatio(), C.HEAL_RATIO);
  assert.equal(thunderBossRatio(), C.THUNDER_BOSS_RATIO);
  assert.equal(bossChestCfg(), C.BOSS_CHEST);
  assert.equal(bossChestDrops(), C.BOSS_CHEST_DROPS);
  assert.equal(potDrops(), C.POT_DROPS);
  assert.equal(rareIntervalMs(), C.RARE_SPAWN_INTERVAL_MS);
  assert.deepEqual([itemPickupMul(), xpGainMul(), windupMs(950), bossDmgDealtMul(), bossDmgTakenMul(), dashMul(), baseMaxHp(100)], [1, 1, 950, 1, 1, 1, 100]);

  state.perks = computePerks(meta({
    root: 1, vit_hp: 5, cap_vit: 1, mov_ghost: 3, mov_dash: 1, mov_item: 1, grw_reroll: 2, grw_stock: 1, grw_xp: 5,
    trs_pot: 2, trs_chest: 1, trs_heal: 1, trs_rare: 1, vit_pancake: 1,
    bos_thunder: 2, bos_chest: 1, bos_tele: 2, bos_dmg: 4, bos_card: 1, cap_bos: 1,
  }));
  assert.equal(contactCooldownMs(), Math.round(C.CONTACT_COOLDOWN_MS * 1.6), "受け身 3 段");
  assert.equal(rerollsPerBattle(), C.REROLL_PER_BATTLE + 2);
  assert.equal(stockLimit("weapon"), C.STOCK_LIMIT_WEAPON + 1);
  assert.equal(potMaxOnField(), C.POT_MAX_ON_FIELD + 2);
  assert.deepEqual(chestTimesMs(), [EARLY_CHEST_MS, ...C.CHEST_TIMES_MS]);
  assert.equal(healRatio(), 0.4);
  assert.equal(thunderBossRatio(), 0.3, "雷鳴 2 段で 20% → 30%");
  assert.deepEqual([bossChestCfg().firstMs, bossChestCfg().everyMs, bossChestCfg().maxOnField], [3000, 10000, C.BOSS_CHEST.maxOnField]);
  const drops = bossChestDrops();
  const card = drops.find((d) => d.kind === "card").w, all = drops.reduce((a, d) => a + d.w, 0);
  assert.ok(Math.abs(card / all - 0.6) < 0.01, "切り札でマジックカードが 60%");
  assert.equal(potDrops().find((d) => d.kind === "heal").w, Math.round(C.POT_DROPS.find((d) => d.kind === "heal").w * 1.5));
  assert.equal(rareIntervalMs(), 45000);
  assert.equal(itemPickupMul(), 1.5);
  assert.equal(xpGainMul(), 1.2);
  assert.equal(windupMs(950), 950 + 400, "見切り 2 段で +0.4 秒");
  assert.equal(bossDmgDealtMul(), 1.35, "竜の爪 4 段 ＋ 竜殺し");
  assert.equal(bossDmgTakenMul(), 0.75);
  assert.equal(dashMul(), 1.4);
  assert.equal(baseMaxHp(100), 140, "頑丈なからだ 5 段 ＋ 鉄壁");
  state.perks = null;
});

test("強化の土台: 何も無ければ 0 / 1、 取っていればその倍率 (= 強化エクステンションはこれに掛かる)", () => {
  assert.deepEqual(perkBuffBase(NO_PERKS), { hpMaxBonus: 0, regenPerSec: 0, speedMul: 1, cdMul: 1, dmgTakenMul: 1, dmgMul: 1, bulletCountBonus: 0, rangeMul: 1, pickupMul: 1, pierceBonus: 0 });
  const b = perkBuffBase(computePerks(meta({ root: 1, atk_dmg: 2, atk_cd: 3, vit_regen: 2, atk_pierce: 1, atk_bullet: 1, cap_atk: 1 })));
  assert.deepEqual([b.dmgMul, b.cdMul, b.regenPerSec, b.pierceBonus, b.bulletCountBonus], [1.16, 0.94, 0.4, 1, 2]);
});

test("抽選の表の重み", () => {
  const t = [{ kind: "a", w: 40 }, { kind: "b", w: 60 }];
  const r = reweight(t, "a", 0.6);
  assert.deepEqual(r, [{ kind: "a", w: 90 }, { kind: "b", w: 60 }]);
  assert.deepEqual(scaleWeight(t, "b", 1.5), [{ kind: "a", w: 40 }, { kind: "b", w: 90 }]);
});

test("画面の 1 行: 効いているものだけ、 日本語と英語", () => {
  assert.deepEqual(perksSummary(NO_PERKS), []);
  const p = computePerks(meta({ root: 1, vit_hp: 2, atk_dmg: 2, grw_reroll: 1, vit_phoenix: 1, atk_cd: 1 }));
  assert.deepEqual(perksSummary(p, "ja"), ["最大 HP ＋8%", "不死鳥", "攻撃 ＋6%", "CD −2%", "リロール ＋1"]);
  assert.deepEqual(perksSummary(p, "en"), ["Max HP ＋8%", "Phoenix", "Attack ＋6%", "CD −2%", "Rerolls ＋1"]);
});

test("名前を変えた節は読み替える (= mov_wall → mov_dash。 払った GUM を失わない)", () => {
  assert.deepEqual(RENAMED_NODES, { mov_wall: "mov_dash" });
  assert.deepEqual(normalizeMeta({ nodes: { mov_wall: 1, atk_dmg: 2 } }).nodes, { mov_dash: 1, atk_dmg: 2 });
  assert.ok(TREE_NODES.some((n) => n.id === "mov_dash") && !TREE_NODES.some((n) => n.id === "mov_wall"));
});
