// SPEC-088: 初プレイは NORMAL だけ (= 1 回遊び終えた記録と、 ロックの判定。 純関数)。
// 実行: node --test tests/played.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasPlayed, markPlayed, lockedModes, isModeLocked, LOCKED_UNTIL_PLAYED } from "../js/played.js";
import { LS_PLAYED, LS_PREFIX } from "../js/constants.js";

const fakeStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

test("最初は遊んでいない。 終えたら mcs.played に \"1\" が入り、 遊んだことになる", () => {
  const s = fakeStorage();
  assert.equal(hasPlayed(s), false);
  assert.equal(markPlayed(s), true);
  assert.equal(s.m.get(LS_PLAYED), "1");
  assert.equal(LS_PLAYED, `${LS_PREFIX}.played`);
  assert.equal(hasPlayed(s), true);
  assert.equal(markPlayed(s), true, "2 回目も何も起きない");
});

test("storage が無い・投げるときは、 ロックされたまま (= 何も投げない)", () => {
  assert.equal(hasPlayed(null), false);
  assert.equal(markPlayed(null), false);
  const broken = { getItem() { throw new Error("quota"); }, setItem() { throw new Error("quota"); } };
  assert.equal(hasPlayed(broken), false);
  assert.equal(markPlayed(broken), false);
  assert.equal(hasPlayed({ getItem: () => "yes" }), false, "\"1\" 以外は遊んでいない");
});

test("初プレイは ABSOLUTE と RTA がロック。 NORMAL はいつでも", () => {
  assert.deepEqual(lockedModes(false), ["ABSOLUTE", "RTA"]);
  assert.deepEqual(lockedModes(true), []);
  // SPEC-165: NORMAL はチュートリアル (= ストーリー 5-5) を終えるまで (= 前から遊んでいる人は開いている)
  assert.deepEqual(lockedModes(false, false), ["NORMAL", "ABSOLUTE", "RTA"]);
  assert.deepEqual(lockedModes(true, false), []);
  assert.equal(isModeLocked("NORMAL", false, false), true);
  assert.equal(isModeLocked("NORMAL", false, true), false);
  assert.deepEqual([...LOCKED_UNTIL_PLAYED], ["ABSOLUTE", "RTA"]);
  assert.equal(isModeLocked("NORMAL", false), false);
  assert.equal(isModeLocked("ABSOLUTE", false), true);
  assert.equal(isModeLocked("RTA", false), true);
  assert.equal(isModeLocked("ABSOLUTE", true), false);
  assert.equal(isModeLocked("RTA", true), false);
});

test("終えたときに記録する (= ゲームオーバーと活動レポートの両方)。 ロックの 1 行はカードの中にあり、 文言は i18n にある", () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  assert.match(read("../js/battle/gameover.js"), /markPlayed\(\)/, "ゲームオーバーで記録");
  assert.match(read("../js/battle/activity-report.js"), /markPlayed\(\)/, "全クリアで記録");
  assert.match(read("../js/mode-select.js"), /isModeLocked\(rta \? "RTA" : regulation, hasPlayed\(\)(?: \|\| isTestSite\(\))?, tutorialDone\(\)\)/, "選ぶところでも止める (= SPEC-165: ストーリーのクリアも見る)");
  assert.match(read("../js/mode-select.js"), /return hasClearedEasy\(\) \|\| storyAllCleared\(loadStory\(\)\);/, "5-5 のクリアの印か、 全 25 のクリア");
  const html = read("../index.html");
  for (const [cardId, lockId] of [["modeCardAbsolute", "modeCardAbsoluteLock"], ["modeCardRta", "modeCardRtaLock"]]) {
    const start = html.indexOf(`id="${cardId}"`), end = html.indexOf("</article>", start);
    assert.ok(start > 0 && end > start);
    assert.ok(html.slice(start, end).includes(`id="${lockId}"`), `${lockId} は ${cardId} の中`);
  }
  // SPEC-165: NORMAL にもロックの行 (= 文は別: ストーリーを最後まで)
  assert.ok(html.slice(html.indexOf('id="modeCardNormal"'), html.indexOf("</article>", html.indexOf('id="modeCardNormal"'))).includes('id="modeCardNormalLock"'), "NORMAL のロックの行");
  assert.ok(!html.includes('id="modeCardEasy"') && !html.includes('id="btnModeEasy"'), "EASY の札は無い (= SPEC-165)");
  assert.match(JSON.parse(read("../data/i18n/ui.json"))["mode.lockedNormal"].ja, /ストーリーを最後まで/);
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  assert.ok(ui["mode.locked"]?.ja && ui["mode.locked"]?.en);
  assert.match(ui["mode.locked"].ja, /NORMAL を 1 回/);
});
