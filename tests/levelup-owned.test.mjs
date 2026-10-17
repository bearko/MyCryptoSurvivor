// SPEC-087: 強化画面の「装備中」の帯と、 ランクアップの札の印 (= 純関数)。
// 実行: node --test tests/levelup-owned.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ownedStripGroups, rankUpKind } from "../js/battle/levelup.js";
import { EXT_MAX_LEVEL, STOCK_LIMIT_WEAPON, STOCK_LIMIT_BUFF } from "../js/constants.js";

const CAT = { 1: "weapon", 2: "weapon", 3: "weapon", 11: "buff", 12: "buff" };
const categoryOf = (o) => CAT[o.extId];

test("武器 → 強化の順に、 持った順で並べ、 上限までの空き枠を数える", () => {
  const owned = [{ extId: 11, level: 2 }, { extId: 1, level: 1 }, { extId: 3, level: 4 }];
  const [w, b] = ownedStripGroups(owned, categoryOf);
  assert.equal(w.category, "weapon");
  assert.deepEqual(w.items.map((i) => i.extId), [1, 3], "武器は持った順");
  assert.equal(w.limit, STOCK_LIMIT_WEAPON);
  assert.equal(w.empty, STOCK_LIMIT_WEAPON - 2);
  assert.equal(b.category, "buff");
  assert.deepEqual(b.items.map((i) => i.extId), [11]);
  assert.equal(b.empty, STOCK_LIMIT_BUFF - 1);
});

test("Lv.5 は MAX。 上限いっぱいなら空き枠は 0 (= 負にならない)", () => {
  const owned = [1, 2, 3, 11, 12].map((extId) => ({ extId, level: EXT_MAX_LEVEL }));
  const [w, b] = ownedStripGroups(owned, categoryOf, { weaponLimit: 2, buffLimit: 2 });
  assert.ok(w.items.every((i) => i.isMax) && b.items.every((i) => i.isMax));
  assert.equal(w.items.length, 3, "持っているものは全部出す");
  assert.equal(w.empty, 0);
  assert.equal(b.empty, 0);
  assert.equal(ownedStripGroups([{ extId: 1, level: 4 }], categoryOf)[0].items[0].isMax, false);
});

test("何も持っていなければ、 どちらの行も空で、 空き枠だけ。 図鑑に無いものは数えない", () => {
  const [w, b] = ownedStripGroups([], categoryOf);
  assert.equal(w.items.length + b.items.length, 0);
  assert.equal(w.empty, STOCK_LIMIT_WEAPON);
  assert.equal(b.empty, STOCK_LIMIT_BUFF);
  const [w2] = ownedStripGroups([{ extId: 999, level: 1 }, { extId: 1, level: 1 }], categoryOf);
  assert.deepEqual(w2.items.map((i) => i.extId), [1]);
  assert.deepEqual(ownedStripGroups(undefined, categoryOf)[0].items, []);
});

test("持っているものの札は「ランクアップ」、 次で上限なら「ランクアップ MAX」、 新しいものは印なし", () => {
  assert.equal(rankUpKind({ isNew: true, currentLevel: 0, nextLevel: 1 }), null);
  assert.equal(rankUpKind({ isNew: false, currentLevel: 1, nextLevel: 2 }), "rankUp");
  assert.equal(rankUpKind({ isNew: false, currentLevel: EXT_MAX_LEVEL - 1, nextLevel: EXT_MAX_LEVEL }), "rankUpMax");
  assert.equal(rankUpKind(null), null);
});

test("装備中の帯は候補の札の上にあり、 文言は i18n にある", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const owned = html.indexOf('id="levelUpOwned"'), grid = html.indexOf('id="levelUpGrid"');
  assert.ok(owned > 0 && grid > 0 && owned < grid, "装備中の帯が候補の札より先 (= 上)");
  assert.match(html, /id="levelUpOwned"[^>]*class="[^"]*hidden|class="levelup-modal__owned hidden"/, "最初は隠れている (= 何も持っていないときは出さない)");
  const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
  for (const k of ["levelup.rankUp", "levelup.rankUpMax", "levelup.owned", "levelup.owned.weapon", "levelup.owned.buff", "levelup.owned.lv", "levelup.owned.max"]) {
    assert.ok(ui[k]?.ja && ui[k]?.en, `${k} に ja / en がある`);
  }
  assert.equal(ui["levelup.rankUp"].ja, "ランクアップ");
  assert.equal(ui["levelup.rankUpMax"].ja, "ランクアップ MAX");
});

test("ランクアップの札の金の縁は、 配る・選ぶの演出 (= battle-ui.css) の縁の変数を通す", () => {
  const battleUi = readFileSync(new URL("../css/battle-ui.css", import.meta.url), "utf8");
  const components = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  assert.match(battleUi, /\.levelup-card\s*\{[^}]*--edge:\s*var\(--cat\)/s, "ふだんの縁は種類の色");
  assert.match(components, /\.levelup-card--rankup\s*\{\s*--edge:\s*var\(--accent\)/, "ランクアップの縁は金");
  assert.match(components, /\.levelup-card__rankup\s*\{/, "アイコンの上の帯");
  assert.match(components, /:root\[data-reduce-fx\] \.levelup-card--rankup::after \{ animation: none/, "演出を減らす設定では光らせない");
});
