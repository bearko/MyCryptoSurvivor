// SPEC-165 行 Y: 作者のプレイ報告 (= 4-4 の宝箱・1-4 の一撃・目標の帯・2-5・3-1 の木・GUM の促し・店の購入枠と系列・お断りは CE と 3-2・ブレード・重なり・スマホ)
// 実行: node --test tests/story-y.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STORY_MAP, storyAllows } from "../js/story.js";
import { SHOP_MAX_BUYS, SHOP_BAN_COST } from "../js/battle/shop.js";
import { TREE_NUDGE_GUM } from "../js/battle/stage-transition.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("4-4 の宝箱: dropFromProp は b を持つ (= 列の chestDrop で落ちて、 OPEN! が出続けていた)", () => {
  assert.match(read("../js/battle/field.js"), /export function dropFromProp\(e\) \{\n\s+const b = state\.battle;/);
  assert.deepEqual(STORY_MAP["4-4"].chestDrop, ["watch", "robot"]);
});

test("1-4: 始まりに呂布の一撃で HP 20%。 パンケーキは満タンまで", () => {
  const r = STORY_MAP["1-4"];
  assert.deepEqual(r.strike, { id: "lubu", giver: 481, atMs: 1200, hpRatio: 0.2 });
  assert.equal(r.pickup.heal, "full");
  assert.ok(r.lines.mid.some((m) => m.on === "strike" && m.key === "story.1-4.strike"));
  const sb = read("../js/battle/story-battle.js");
  assert.match(sb, /mode: "strike"/);
  assert.match(sb, /state\.stats\.hp = after;/);
  assert.match(read("../js/battle/field.js"), /storyStage\(\)\?\.pickup\?\.heal === "full" \? 1 : healRatio\(\)/);
});

test("2-5 の呂布は少し痛い。 3-1 の木は根があっても開く。 GUM 500 で木を促す", () => {
  assert.equal(STORY_MAP["2-5"].shadow.dmg, 24);
  assert.match(read("../js/story-map.js"), /if \(r\.treeFirst && !_treeDone\) \{/);
  assert.equal(TREE_NUDGE_GUM, 500);
  assert.match(read("../js/battle/stage-transition.js"), /key: "story\.treeNudge"/);
});

test("店: 買った札は消える・1 回の店で 4 つまで・同じ系列は 1 回・お断りは CE", () => {
  const sh = read("../js/battle/shop.js");
  assert.equal(SHOP_MAX_BUYS, 4);
  assert.equal(SHOP_BAN_COST, 20);
  assert.match(sh, /o\.sold = true;/);
  assert.match(sh, /if \(_boughtHere >= SHOP_MAX_BUYS\) return false;/);
  assert.match(sh, /_seriesHere\.has\(seriesOf\(e\.extId\)\)/);
  assert.match(sh, /s\.ce -= cost;/);
});

test("お断りのレクチャーは 3-2 (= 初めてのふつうの品ぞろえ)。 5-1 はリロールだけ", () => {
  assert.deepEqual(STORY_MAP["3-2"].shop.must, ["ban"]);
  assert.deepEqual(STORY_MAP["5-1"].shop.must, ["reroll"]);
  assert.equal(storyAllows("ban", STORY_MAP["3-2"]), true);
  assert.equal(storyAllows("ban", STORY_MAP["5-1"]), true, "リロールのある店ではお断りも");
  assert.equal(storyAllows("ban", STORY_MAP["2-2"]), false);
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  for (const k of ["story.3-2.shop", "story.3-2.ban", "story.1-4.strike", "story.treeNudge", "story.goal.done", "story.1-3.ce"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});

test("ブレードは大きく速く、 重なった敵にも当たる。 雑魚は自分の中心まで来ない。 スマホの長押しと拡大縮小を止める", () => {
  const a = read("../js/battle/archetypes.js");
  assert.match(a, /ORBIT_CLOSE_ANG_SPEED = 3\.6;/);
  assert.match(a, /\? 12 : 11;/);
  assert.match(a, /if \(px \* px \+ py \* py > o\.r \* o\.r\) continue;/);
  const ext = JSON.parse(read("../data/extensions.json"));
  const lst = Array.isArray(ext) ? ext : (ext.extensions ?? Object.values(ext));
  assert.equal(lst.find((e) => String(e.extId) === "10").tierParams[0].orbitR, 40);
  assert.match(read("../js/battle/enemies.js"), /const ENEMY_MIN_SEP = 0\.8;/);
  assert.match(read("../index.html"), /maximum-scale=1\.0, user-scalable=no/);
  assert.match(read("../css/base.css"), /-webkit-touch-callout: none/);
  assert.match(read("../js/main.js"), /gesturestart/);
  // 2026-10-22: 壺・宝箱はねらう対象 (= 敵より近いか 170px の中なら先に)
  assert.match(a, /export const PROP_AIM_R = 170;/);
  assert.match(a, /if \(prop && \(propD2 < bestD2 \|\| propD2 <= PROP_AIM_R \* PROP_AIM_R\)\) return prop;/);
  assert.match(read("../js/navi.js"), /export const EYES_FRONT = \{ pointer: "11_idle", smile: "11_idle", sparkle: "02_both_arms_up" \};/);
  assert.match(read("../js/battle/damage.js"), /if \(!\(isStory\(\) && storyStage\(\)\?\.clear\?\.kind === "boss"\)\)/);
  assert.match(read("../js/story-map.js"), /const toModes = r\?\.unlock === "mode:NORMAL";/);
  assert.match(read("../index.html"), /id="btnModeSkillTree"/);
});
