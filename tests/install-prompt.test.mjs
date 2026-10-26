// SPEC-178: ホーム画面に追加の案内 (= NORMAL を 1 回遊び終えたら、 スマホに 1 回だけ)
// 実行: node --test tests/install-prompt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installKind, shouldOfferInstall, wasInstallAsked, LS_INSTALL_ASKED } from "../js/install-prompt.js";
import { tutorialStepOf } from "../js/story.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

test("端末: iPhone・iPad は共有メニューの手順、 Android は合図があればボタン・無ければメニューの手順、 パソコンとホーム画面からは出さない", () => {
  assert.equal(installKind({ ua: IPHONE, maxTouchPoints: 5 }), "ios");
  assert.equal(installKind({ ua: IPAD, maxTouchPoints: 5 }), "ios", "iPadOS は Mac のふりをする");
  assert.equal(installKind({ ua: IPAD, maxTouchPoints: 0 }), null, "本物の Mac");
  assert.equal(installKind({ ua: ANDROID, maxTouchPoints: 5, hasPrompt: true }), "prompt");
  assert.equal(installKind({ ua: ANDROID, maxTouchPoints: 5 }), "android");
  assert.equal(installKind({ ua: PC, maxTouchPoints: 0, hasPrompt: true }), null, "パソコンの Chrome にも合図は来るが出さない");
  assert.equal(installKind({ ua: IPHONE, maxTouchPoints: 5, standalone: true }), null);
  assert.equal(installKind({ ua: ANDROID, maxTouchPoints: 5, hasPrompt: true, standalone: true }), null);
});

test("出すのは NORMAL を遊び終えたあとに 1 回だけ (= mcs.installAsked。 読めないときは出さない)", () => {
  assert.equal(shouldOfferInstall({ played: true, asked: false, kind: "ios" }), true);
  assert.equal(shouldOfferInstall({ played: false, asked: false, kind: "ios" }), false);
  assert.equal(shouldOfferInstall({ played: true, asked: true, kind: "ios" }), false);
  assert.equal(shouldOfferInstall({ played: true, asked: false, kind: null }), false);
  assert.equal(LS_INSTALL_ASKED, "mcs.installAsked");
  assert.equal(wasInstallAsked({ getItem: () => null }), false);
  assert.equal(wasInstallAsked({ getItem: () => "1" }), true);
  assert.equal(wasInstallAsked({ getItem() { throw new Error("blocked"); } }), true);
});

test("段: 29 = 案内を出した、 30 = ホーム画面から開いた", () => {
  assert.deepEqual(tutorialStepOf("a2hs"), { step: 29, id: "a2hs" });
  assert.deepEqual(tutorialStepOf("home"), { step: 30, id: "home" });
  const src = read("../js/install-prompt.js");
  assert.match(src, /_markAsked\(\);\s*reportTutorialStep\(tutorialStepOf\("a2hs"\)\);/);
  assert.match(src, /if \(isStandalone\(\)\) reportTutorialStep\(tutorialStepOf\("home"\)\);/);
});

test("出すところ: モード選択を開いたとき・起動のときに合図を取っておく (= ブラウザの帯は止める)", () => {
  assert.match(read("../js/mode-select.js"), /maybeOfferInstall\(\{ played: hasPlayed\(\) \}\);/);
  const main = read("../js/main.js");
  assert.match(main, /installInstallPrompt\(\);/);
  assert.ok(main.indexOf("reportHomeLaunch();") > main.indexOf("initPlatform(APP_VERSION);"), "共通基盤の init のあと");
  assert.match(read("../js/install-prompt.js"), /"beforeinstallprompt", \(e\) => \{ e\.preventDefault\(\); _deferred = e; \}/);
  assert.ok(JSON.parse(read("../manifest.json")).display === "standalone");
});
