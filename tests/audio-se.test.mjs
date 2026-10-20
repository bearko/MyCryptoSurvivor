// SE の鳴らし方 (= js/audio.js)。 鳴らすたびに <audio> を増やすと、 ブラウザの上限 (= too many WebMediaPlayers) で
// 長い戦闘のあと SE が鳴らなくなっていた (= 敗北のジングル・ショップで買ったときの音)。 Audio はにせもの
// 実行: node --test tests/audio-se.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const created = [];
class FakeAudio {
  constructor(src = "") { this.src = src; this.paused = true; this.ended = false; this.volume = 1; this.currentTime = 0; this.plays = 0; created.push(this); }
  play() { this.plays += 1; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
globalThis.Audio = FakeAudio;
const audio = await import("../js/audio.js");

test("Web Audio が無いとき: 同じ SE は 4 つまでの <audio> を使い回す (= いくら鳴らしても増えない)", () => {
  for (let i = 0; i < 500; i++) audio.playSe("Audio/SE/Battle/2_area_damage.mp3", 0, 0.2);
  const area = created.filter((a) => a.src.endsWith("2_area_damage.mp3"));
  assert.equal(area.length, 4);
  // 鳴り終わったものを鳴らし直す
  area.forEach((a) => { a.paused = true; a.ended = true; });
  audio.playSe("Audio/SE/Battle/2_area_damage.mp3", 0, 0.2);
  assert.equal(created.filter((a) => a.src.endsWith("2_area_damage.mp3")).length, 4);
  // ほかの SE (= 敗北のジングル) は別の枠なので鳴る
  audio.playSe("Audio/SE/Jingles/lose.mp3", 0, 0.7);
  const lose = created.filter((a) => a.src.endsWith("lose.mp3"));
  assert.equal(lose.length, 1);
  assert.equal(lose[0].plays, 1);
});

test("Web Audio では、 重なりすぎたら古い音を止めて新しい音を鳴らす (= 捨てない)", () => {
  const src = readFileSync(new URL("../js/audio.js", import.meta.url), "utf8");
  assert.match(src, /while \(_voices\.length >= SE_VOICES_MAX\)/);
  assert.match(src, /old\.stop\(\)/);
  assert.doesNotMatch(src, /base\.cloneNode/);
});
