// SPEC-143: ステージ 1 のクリアで X の投稿をすすめる (= 投稿で 100 GUM。 1 回だけ)
// 実行: node --test tests/share-x.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { shareUrl, loadShare, saveShare, shouldOfferShare, SHARE_GUM, SHARE_MAX_SKIPS, GAME_URL, SHARE_TAG, SHARE_KEY } = await import("../js/share-x.js");
const ui = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));

test("投稿の URL に文・#MyCryptoGames・ゲームの URL が入る", () => {
  const u = new URL(shareUrl("ステージ 1 をクリア！"));
  assert.equal(u.origin + u.pathname, "https://x.com/intent/tweet");
  assert.equal(u.searchParams.get("text"), "ステージ 1 をクリア！");
  assert.equal(u.searchParams.get("hashtags"), "MyCryptoGames");
  assert.equal(u.searchParams.get("url"), "https://survivor.bearko.games/");
  assert.deepEqual([SHARE_GUM, SHARE_TAG, GAME_URL, SHARE_MAX_SKIPS], [100, "MyCryptoGames", "https://survivor.bearko.games/", 3]);
});

test("出すのはステージ 1・RTA でない・まだもらっていない・あとでが 3 回未満", () => {
  const st = { claimed: false, skips: 0 };
  assert.equal(shouldOfferShare(st, { stageIdx: 0 }), true);
  assert.equal(shouldOfferShare(st, { stageIdx: 1 }), false);
  assert.equal(shouldOfferShare(st, { stageIdx: 0, rta: true }), false);
  assert.equal(shouldOfferShare({ claimed: true, skips: 0 }, { stageIdx: 0 }), false);
  assert.equal(shouldOfferShare({ claimed: false, skips: 3 }, { stageIdx: 0 }), false);
});

test("覚えておく (= 壊れていたら初めて)", () => {
  const m = new Map(); const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.deepEqual(loadShare(s), { claimed: false, skips: 0 });
  saveShare({ claimed: true, skips: 2 }, s);
  assert.deepEqual(loadShare(s), { claimed: true, skips: 2 });
  m.set(SHARE_KEY, "{oops");
  assert.deepEqual(loadShare(s), { claimed: false, skips: 0 });
});

test("つなぎ: 画面・文言・ステージクリアから出す・投稿で GUM を 1 回", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const html = read("index.html");
  for (const id of ["shareModal", "shareAin", "shareLine", "shareGum", "sharePost", "shareLater"]) assert.ok(html.includes(`id="${id}"`), id);
  for (const k of ["share.line", "share.reward", "share.post", "share.later", "share.close", "share.thanks", "share.got", "share.text"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
  assert.equal(ui["share.line"].ja, "ナイスクリア！面白かったらXでもこのゲームを宣伝してくれると嬉しいな！");
  assert.match(read("js/battle/stage-transition.js"), /shouldOfferShare\(loadShare\(\), \{ stageIdx: endIdx, rta: !!state\.rtaMode \}\)/);
  const js = read("js/share-x.js");
  assert.match(js, /if \(!_st \|\| _st\.claimed\) return;/);
  assert.match(js, /addRewards\(\{ gum: SHARE_GUM \}\)/);
});
