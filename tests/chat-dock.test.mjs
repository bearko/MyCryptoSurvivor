// SPEC-156: チャットのドック (= SDK が右に 320px) のぶん、 スキルツリーと結果の画面を狭める
// 実行: node --test tests/chat-dock.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const { dockInset, CHAT_DOCK_W, chatDockWidth, applyChatDock, onChatDockChange } = await import("../js/chat-dock.js");
const { chatLayout, chatShown, setChatCollapsed, onChatToggle, setChatVisible } = await import("../js/platform.js");

test("dockInset: ドックで見えているときだけ幅。 窓・シート・畳んだドックは 0", () => {
  assert.equal(CHAT_DOCK_W, 320);
  assert.equal(dockInset({ layout: "dock", shown: true }), 320);
  assert.equal(dockInset({ layout: "dock", shown: false }), 0);
  assert.equal(dockInset({ layout: "float", shown: true }), 0);
  assert.equal(dockInset({ layout: "sheet", shown: true }), 0);
  assert.equal(dockInset({ layout: "dock", shown: true, width: 400 }), 400);
  assert.equal(dockInset({}), 0);
});

test("SDK がない・古い (= layout や isOpen が無い) なら 'float' / false / 何もしない", () => {
  delete globalThis.window;
  assert.equal(chatLayout(), "float");
  assert.equal(chatShown(), false);
  assert.equal(chatDockWidth(), 0);
  assert.doesNotThrow(() => setChatCollapsed(true));
  assert.equal(typeof onChatToggle(() => {}), "function");
  globalThis.window = { BearkoGames: { chat: { setVisible() {} } } };
  try {
    assert.equal(chatLayout(), "float");
    assert.equal(chatDockWidth(), 0);
    assert.doesNotThrow(() => setChatVisible(true));
  } finally { delete globalThis.window; }
});

test("SDK のドックが見えていれば 320、 畳めば 0。 変わったときだけ聞いている相手に知らせる", () => {
  let collapsed = false;
  const toggles = [];
  globalThis.window = { BearkoGames: { chat: {
    layout: () => "dock", isOpen: () => !collapsed,
    collapse: (on) => { collapsed = !!on; }, onToggle: (fn) => { toggles.push(fn); return () => {}; }, setVisible() {},
  } } };
  try {
    const seen = [];
    const off = onChatDockChange((w) => seen.push(w));
    assert.equal(applyChatDock(), 320);
    assert.equal(applyChatDock(), 320);
    setChatCollapsed(true);
    assert.equal(chatDockWidth(), 0);
    assert.equal(applyChatDock(), 0);
    setChatCollapsed(false);
    assert.equal(applyChatDock(), 320);
    assert.deepEqual(seen, [320, 0, 320], "変わったときだけ");
    off();
    assert.equal(typeof onChatToggle(() => {}), "function");
    assert.equal(toggles.length, 1);
  } finally { delete globalThis.window; }
});

test("画面の側は right: var(--chat-dock) で避け、 木は広い画面の判定からドックを引く。 頭にチャットのボタン", () => {
  assert.match(read("../css/skill-tree.css"), /\.tree-screen \{[^}]*right: var\(--chat-dock, 0px\);/);
  assert.match(read("../css/components.css"), /\.gameover-modal \{[^}]*right: var\(--chat-dock, 0px\);/);
  const tree = read("../js/skill-tree.js");
  assert.match(tree, /const isWide = \(\) => \(typeof window !== "undefined" \? window\.innerWidth : 0\) - chatDockWidth\(\) >= WIDE_MIN;/);
  assert.match(tree, /const wide = isWide\(\);/);
  assert.match(tree, /onChatDockChange\(rebuild\);/, "ドックを畳む・広げると組み直す");
  assert.match(tree, /chatLayout\(\) === "dock" \? h\("button", \{ class: "tree-tool tree-chat"/, "PC のドックのときだけボタン");
  assert.match(read("../js/main.js"), /installChatDock\(\);/);
  assert.match(read("../js/platform.js"), /window\.dispatchEvent\(new Event\("mcs:chat"\)\)/, "出す・隠すでも置き直す");
  const ui = JSON.parse(read("../data/i18n/ui.json"));
  assert.equal(ui["tree.chatHide"].ja, "チャットをたたむ");
  assert.ok(ui["tree.chatShow"].en);
});
