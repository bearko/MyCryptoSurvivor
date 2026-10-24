// SPEC-068: マインちゃんの「初めて」のひとこと (= js/navi-tips.js の純関数)
// 実行: node --test tests/navi-tips.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIP_KEYS, loadSeen, saveSeen, shouldShowTip, canSpeakTip, tipDurationMs, naviTipOnce,
} from "../js/navi-tips.js";
import { naviLines, NAVI_POSES, NAVI_TYPE_MS } from "../js/navi.js";
import { LS_NAVI_TIPS, LS_PREFIX, POT_DROPS, CHEST_DROPS, CHEST_DROPS_RTA } from "../js/constants.js";

const UI = JSON.parse(readFileSync(new URL("../data/i18n/ui.json", import.meta.url), "utf8"));
const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

test("どの場面のひとことにも、 日本語と英語の文言とポーズがある", () => {
  for (const key of TIP_KEYS) {
    const lines = naviLines("tip", { key });
    assert.equal(lines.length, 1, key);
    assert.equal(lines[0].key, `navi.tip.${key}`);
    assert.ok(UI[lines[0].key]?.ja && UI[lines[0].key]?.en, key);
    assert.ok(NAVI_POSES[lines[0].pose], `${key}: pose ${lines[0].pose}`);
  }
  assert.deepEqual(naviLines("tip", {}), []);
});

test("壺・宝箱から出るアイテムは、 どれも初めてのひとことがある (= CE はアイテムではない)", () => {
  const kinds = new Set([...POT_DROPS, ...CHEST_DROPS, ...CHEST_DROPS_RTA].map((d) => d.kind).filter((k) => k !== "ce"));
  for (const k of kinds) assert.ok(TIP_KEYS.includes(`item.${k}`), k);
  assert.ok(TIP_KEYS.includes("item.card"));
});

test("見たものは端末に覚え、 次からは話さない", () => {
  const st = memStorage();
  const seen = loadSeen(st);
  assert.equal(seen.size, 0);
  assert.ok(shouldShowTip(seen, "item.heal"));
  seen.add("item.heal");
  saveSeen(st, seen);
  assert.equal(LS_NAVI_TIPS, `${LS_PREFIX}.naviTips`);
  assert.deepEqual(JSON.parse(st.getItem(LS_NAVI_TIPS)), ["item.heal"]);
  const again = loadSeen(st);
  assert.equal(shouldShowTip(again, "item.heal"), false);
  assert.ok(shouldShowTip(again, "gimmick.beads"));
});

test("知らない場面は話さない。 壊れた記録は空として読む (= 落ちない)", () => {
  assert.equal(shouldShowTip(new Set(), "item.ce"), false);
  assert.equal(shouldShowTip(new Set(), ""), false);
  assert.equal(loadSeen(memStorage({ [LS_NAVI_TIPS]: "{broken" })).size, 0);
  assert.equal(loadSeen(memStorage({ [LS_NAVI_TIPS]: '{"a":1}' })).size, 0);
  assert.deepEqual([...loadSeen(memStorage({ [LS_NAVI_TIPS]: '["item.heal","nope",3]' }))], ["item.heal"]);
  assert.equal(loadSeen(null).size, 0);
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadSeen(throwing).size, 0);
  assert.doesNotThrow(() => saveSeen(throwing, new Set(["item.heal"])));
});

test("話すのは、 戦闘中で、 止まっておらず、 マインちゃんがほかのことを話していないときだけ", () => {
  assert.ok(canSpeakTip({ battleActive: true, pauseFlags: 0, naviShown: false }));
  assert.equal(canSpeakTip({ battleActive: true, pauseFlags: 1, naviShown: false }), false);   // レベルアップ・メニューの裏
  assert.equal(canSpeakTip({ battleActive: true, pauseFlags: 0, naviShown: true }), false);    // ステージの始まり・ボスの知らせ
  assert.equal(canSpeakTip({ battleActive: false, pauseFlags: 0, naviShown: false }), false);
});

test("話している長さは、 1 文字ずつ出る時間と引っこむまで", () => {
  assert.equal(tipDurationMs("12345") - tipDurationMs(""), 5 * NAVI_TYPE_MS);
  assert.equal(tipDurationMs(null), tipDurationMs(""));
});

test("画面のない環境 (= テスト・シミュレーター) では何もしない", () => {
  assert.equal(naviTipOnce("item.heal"), false);
});

test("設定に「マインちゃんの補足」と「もう一度聞く」がある", () => {
  assert.ok(HTML.includes('id="settingsTipsReset"'));
  for (const k of ["settings.tips", "settings.tipsNote", "settings.tipsReset", "settings.tipsDone"]) {
    assert.ok(UI[k]?.ja && UI[k]?.en, k);
  }
});

// ---- SPEC-172: チームの説明 ----
test("SPEC-172: チームの説明は 7 場面・どれも日本語と英語とポーズがある (= ボイスはまだない)", async () => {
  const { TEAM_SCREEN_TIPS, TEAM_BATTLE_TIPS } = await import("../js/navi-tips.js");
  assert.deepEqual(TEAM_SCREEN_TIPS, ["team.hero", "team.picker", "team.set"]);
  assert.deepEqual(TEAM_BATTLE_TIPS, ["team.auto", "team.tactic", "team.gauge", "team.done"]);
  const n = { "team.hero": 2, "team.picker": 3, "team.set": 2, "team.auto": 1, "team.tactic": 1, "team.gauge": 1, "team.done": 1 };
  for (const key of [...TEAM_SCREEN_TIPS, ...TEAM_BATTLE_TIPS]) {
    const lines = naviLines("team", { key });
    assert.equal(lines.length, n[key], key);
    for (const l of lines) {
      assert.ok(UI[l.key]?.ja && UI[l.key]?.en, l.key);
      assert.ok(NAVI_POSES[l.pose], `${l.key}: ${l.pose}`);
    }
  }
  assert.equal(UI["navi.team.hero.1"].ja, "NORMAL モードはチームで挑戦できるよ！");
  assert.equal(UI["navi.team.done"].ja, "これでチームの設定はおしまい！ チームの力でクリアを目指そう！");
});

test("SPEC-172: チームの説明は見たら覚える (= 戦闘のものは順番に並ぶ・設定の「もう一度聞く」で忘れる)", () => {
  const st = memStorage();
  st.setItem("mcs.naviTips", JSON.stringify(["team.hero", "team.auto", "xxx"]));
  const seen = loadSeen(st);
  assert.ok(seen.has("team.hero") && seen.has("team.auto") && !seen.has("xxx"));
  assert.equal(shouldShowTip(seen, "team.auto"), false);
  assert.equal(shouldShowTip(seen, "team.gauge"), true, "戦闘の説明は naviTipOnce で並ぶ");
  assert.equal(shouldShowTip(seen, "team.hero"), false, "画面の説明は naviTeamScreen で出す");
  const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(main, /if \(!\(_teamOn\(\) && naviTeamScreen\("team\.hero"\)\)\) naviSay\(naviLines\("hero"\)/);
  assert.match(main, /naviTeamScreen\("team\.picker"\);/);
  assert.match(main, /naviTeamScreen\("team\.set"\)/);
  const tb = readFileSync(new URL("../js/battle/team-battle.js", import.meta.url), "utf8");
  assert.match(tb, /naviTipOnce\("team\.auto"\); naviTipOnce\("team\.tactic"\);/);
  assert.match(tb, /if \(b\.team\.gauge >= GAUGE_MAX\) \{ naviTipOnce\("team\.gauge"\); naviTipOnce\("team\.done"\); \}/);
});

test("SPEC-172: 店の札の「武器エクステ／強化エクステ」はスマホでも出す", () => {
  const css = readFileSync(new URL("../css/shop.css", import.meta.url), "utf8");
  assert.ok(!/\.shop-card \.levelup-card__cat \{ display: none; \}/.test(css));
});
