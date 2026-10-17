// SPEC-069: BGM の要素の使い回しと、 止められたときの鳴らし直し (= js/audio.js。 Audio はにせもの)
// 実行: node --test tests/audio-bgm.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const created = [];
let allow = false;   // いまブラウザが鳴らすのを許すか
class FakeAudio {
  constructor(src = "") { this.src = src; this.paused = true; this.loop = false; this.volume = 1; this.currentTime = 0; this.plays = 0; created.push(this); }
  play() {
    this.plays += 1;
    if (!allow) return Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
}
globalThis.Audio = FakeAudio;
const audio = await import("../js/audio.js");
const tick = () => new Promise((r) => setTimeout(r, 0));

test("止められたら覚えておき、 次の操作で同じ要素を鳴らし直す", async () => {
  allow = false;
  audio.startBgm("Audio/SE/Actions/craft.mp3", 0.26);
  await tick();
  assert.equal(audio.isBgmBlocked(), true);
  assert.equal(created.length, 1);
  allow = true;   // 操作のあと
  await audio.retryBgm();
  assert.equal(audio.isBgmBlocked(), false);
  assert.equal(created[0].plays, 2);
  assert.equal(created[0].paused, false);
  assert.equal(audio.retryBgm(), null, "鳴っていれば何もしない");
});

test("曲を替えても要素は 1 つ (= src だけ替える。 iOS は操作で鳴らした要素なら、 あとから替えても鳴らせる)", async () => {
  allow = true;
  audio.startBgm("Audio/BGM/land.mp3", 0.26);
  await tick();
  audio.startBgm("Audio/BGM/pvp.mp3", 0.32);
  await tick();
  assert.equal(created.length, 1);
  assert.match(created[0].src, /Audio\/BGM\/pvp\.mp3$/);
  assert.equal(created[0].loop, true);
  assert.equal(audio.currentBgmPath(), "Audio/BGM/pvp.mp3");
});

test("止めたら、 鳴らし直しもしない", async () => {
  allow = false;
  audio.startBgm("Audio/BGM/land.mp3", 0.26);
  await tick();
  assert.equal(audio.isBgmBlocked(), true);
  audio.stopBgm();
  assert.equal(audio.isBgmBlocked(), false);
  assert.equal(audio.retryBgm(), null);
  assert.equal(audio.currentBgmPath(), null);
});
