// SPEC-176: Extra パネル (= エンドコンテンツ。 通常の品が尽きたら商人が売る、 難しさに干渉するパネル)
// 実行: node --test tests/extra-panels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXTRA_PANELS, EXTRA_PRICE, EXTRA_MAX_LEVEL, extraModsOf, extraScoreAdd, scoreMulWithExtra, normalizeExtra, extraAllowed } from "../js/battle/extra-panels.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const UI = JSON.parse(read("../data/i18n/ui.json"));

test("8 枚・1 枚 10,000 CE・各 Lv.10 まで。 アイコンはエネミーとシャドーヒーローの絵・文言がある", () => {
  assert.equal(EXTRA_PANELS.length, 8);
  assert.equal(EXTRA_PRICE, 10000);
  assert.equal(EXTRA_MAX_LEVEL, 10);
  for (const p of EXTRA_PANELS) {
    assert.ok(Number.isInteger(p.icon), p.id);
    assert.ok(UI[`shop.extra.${p.id}`]?.ja && UI[`shop.extra.${p.id}.what`]?.ja, p.id);
  }
  assert.deepEqual(EXTRA_PANELS.map((p) => p.icon), [481, 396, 170, 468, 433, 519, 373, 893]);
});

test("効き目 (= Lv.0 は効かない・Lv.10 の値)", () => {
  const none = extraModsOf({});
  assert.deepEqual(none, { spawnMul: 1, speedMul: 1, hpMul: 1, healMul: 1, missionChanceAdd: 0, missionMul: 1, bossEarlyMs: 0, bossMul: 1 });
  const all = extraModsOf(Object.fromEntries(EXTRA_PANELS.map((p) => [p.id, 10])));
  assert.equal(all.spawnMul, 2);
  assert.equal(all.speedMul, 1.5);
  assert.equal(all.hpMul, 2);
  assert.equal(all.healMul, 0, "禁止令 Lv.10 は回復なし");
  assert.ok(Math.abs(all.missionChanceAdd - 0.6) < 1e-9, "40% → 100%");
  assert.equal(all.missionMul, 2);
  assert.equal(all.bossEarlyMs, 100000, "4:00 → 2:20");
  assert.equal(all.bossMul, 2);
  assert.equal(extraModsOf({ horde: 99 }).spawnMul, 2, "Lv.10 で止まる");
});

test("スコアの倍率 (= 難易度の倍率に足す・2.0 まで。 共通基盤の survivor.v5 と同じ表)", () => {
  assert.equal(extraScoreAdd({}), 0);
  assert.equal(extraScoreAdd({ horde: 2, bell: 1, famine: 1, overlord: 1 }), 0.14);
  assert.equal(scoreMulWithExtra(1, { horde: 10 }), 1.3);
  assert.equal(scoreMulWithExtra(1, Object.fromEntries(EXTRA_PANELS.map((p) => [p.id, 10]))), 2);
  assert.equal(scoreMulWithExtra(1.8, { horde: 10 }), 2, "ABSOLUTE と合わせても 2.0");
  assert.deepEqual(EXTRA_PANELS.map((p) => p.add), [0.03, 0.03, 0.03, 0.02, 0.01, 0.02, 0.03, 0.03]);
  assert.deepEqual(normalizeExtra({ horde: 3, x: 5, iron: 0, bell: 12 }), { horde: 3, bell: 10 });
});

test("ストーリーと RTA では出さない。 店はそれ以外で、 並べる通常の品が尽きたら (= 全部 Lv.MAX)", () => {
  assert.equal(extraAllowed({}), true);
  assert.equal(extraAllowed({ story: true }), false);
  assert.equal(extraAllowed({ rta: true }), false);
  const shop = read("../js/battle/shop.js");
  assert.match(shop, /return freshCount\(\{ banned: new Set\(s\.bans\) \}\) === 0;/);
  assert.match(shop, /extra: \{ \.\.\.\(s\.extra \?\? \{\}\) \}/, "同じステージのやり直しで、 入ったときのレベルに戻す");
});

test("配線: 敵の数・速さ・HP、 ボス、 回復、 ミッション、 スコア、 総合スコア", () => {
  const en = read("../js/battle/enemies.js");
  assert.match(en, /\/ extraMods\(\)\.spawnMul;/);
  assert.match(en, /xm\.speedMul/);
  assert.match(read("../js/easy.js"), /BOSS_SPAWN_AT_MS - extraMods\(\)\.bossEarlyMs/);
  assert.match(read("../js/battle/field.js"), /if \(kind === "heal" && extraMods\(\)\.healMul <= 0\) return;/);
  const mi = read("../js/battle/missions.js");
  assert.match(mi, /MISSION_CHANCE \+ extraMods\(\)\.missionChanceAdd/);
  assert.match(mi, /harsh = extraMods\(\)\.missionMul/);
  assert.match(read("../js/battle/activity-report.js"), /scoreMulWithExtra\(computeRegulationMul/);
  assert.match(read("../js/platform.js"), /if \(Object\.keys\(ex\)\.length\) out\.extra = ex;/);
});
