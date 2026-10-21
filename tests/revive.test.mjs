// SPEC-150: 「やり直し」ではなく「復活」 (= 粒子になって舞い、 王妃の黄金時計で集まる)
// 実行: node --test tests/revive.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REVIVE, REVIVE_EXT_ID, spriteParticles, dissolveStep, gatherPos, easeInCubic, easeOutCubic } from "../js/battle/revive-fx.js";
import { naviLines } from "../js/navi.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const ui = JSON.parse(read("../data/i18n/ui.json"));

test("64×64 の絵は 2×2 をまとめて最大 32×32 の粒になり、 透明なところは粒にしない", () => {
  const W = 64, H = 64;
  const data = new Uint8ClampedArray(W * H * 4);
  // 左半分だけ赤で塗る
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { const i = (y * W + x) * 4; data[i] = 200; data[i + 1] = 20; data[i + 2] = 30; data[i + 3] = 255; }
  const ps = spriteParticles(data, W, H);
  assert.equal(REVIVE.grid, 32);
  assert.equal(ps.length, 32 * 16);
  assert.ok(ps.every((p) => p.u < 0.5 && p.r === 200 && p.g === 20 && p.b === 30));
  assert.ok(ps.every((p) => p.u > 0 && p.u < 1 && p.v > 0 && p.v < 1));
  // 2×2 の平均 (= 半分だけ塗った升は平均の色)
  const d2 = new Uint8ClampedArray(2 * 2 * 4);
  d2.set([255, 255, 255, 255], 0); d2.set([0, 0, 0, 255], 4); d2.set([255, 255, 255, 255], 8); d2.set([0, 0, 0, 255], 12);
  const one = spriteParticles(d2, 2, 2, 1);
  assert.equal(one.length, 1);
  assert.equal(one[0].r, 128);
  // 薄すぎる升は粒にしない
  const d3 = new Uint8ClampedArray(4); d3.set([255, 0, 0, 40], 0);
  assert.equal(spriteParticles(d3, 1, 1, 1).length, 0);
});

test("散る: 舞い上がって、 そのあとゆっくり漂い、 上から出たら下から戻る", () => {
  const p = { x: 100, y: 300, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(p, 0, 0.1, 800);
  assert.ok(p.y < 300, "上へ");
  assert.ok(p.a >= REVIVE.alphaMin && p.a <= 1);
  const q = { x: 100, y: 300, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(q, 5, 0.1, 800);   // 舞い上がる時間を過ぎたら driftUp
  assert.ok(Math.abs((300 - q.y) - REVIVE.driftUp * 0.1) < 1e-9);
  const r = { x: 100, y: -20, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(r, 5, 0.1, 800);
  assert.equal(r.y, 808);
});

test("集まる: 最初はゆっくり、 最後に一気に元の画素の位置へ", () => {
  const p = { gx: 0, gy: 0, tx: 100, ty: 200 };
  assert.deepEqual(gatherPos(p, 0), { x: 0, y: 0 });
  assert.deepEqual(gatherPos(p, 1), { x: 100, y: 200 });
  const half = gatherPos(p, 0.5);
  assert.ok(half.x < 20, "半分の時間ではまだ 1/8");
  assert.equal(easeInCubic(0.5), 0.125);
  assert.equal(easeOutCubic(1), 1);
});

test("流れの配線: 倒れたら粒子 → 1.6 秒後に半透明の結果の画面。 復活するで集まってから戦闘を始める", () => {
  const go = read("../js/battle/gameover.js");
  assert.match(go, /const dissolved = _startDissolve\(\);/);
  assert.match(go, /modal\?\.classList\.toggle\("gameover-modal--revive", dissolved\)/);
  assert.match(go, /if \(dissolved\) _showTimer = setTimeout\(show, REVIVE\.dissolveMs\); else show\(\);/);
  assert.match(go, /presentResult\(modal, "allClear"/);
  assert.doesNotMatch(go, /presentResult\(modal, "lose"/, "lose のテロップは出さない");
  assert.match(go, /await _reviveGather\(\);\s*\/\/ SPEC-150[^\n]*\n\s*resumeTime\(\);/);
  assert.match(go, /playSe\(SFX\.PICK_HEAL, 0, 0\.8\);\s*\/\/ 3_heal_resurrection/);
  assert.match(go, /b\.heroDissolved = ok;/);
  assert.match(go, /clearReviveFx\(\);\s*\/\/ SPEC-150/);
  assert.match(go, /"REVIVE"/);
  // 戦闘の絵からヒーローを消す (= HP バーも)。 復活したら戻す
  const render = read("../js/battle/render.js");
  assert.match(render, /if \(state\.battle\.heroDissolved\) return _afterPlayer\(/);
  assert.match(read("../js/battle/index.js"), /b\.heroDissolved\s*= false;/);
  // 王妃の黄金時計 (= MCH 5111) のボタン
  assert.equal(REVIVE_EXT_ID, 5111);
  assert.match(go, /img\(`Image\/Extensions\/\$\{REVIVE_EXT_ID\}\.png`\)/);
  const html = read("../index.html");
  assert.match(html, /id="gameOverRetry" data-reveal><img class="gameover-modal__clock"[^>]*\/><span data-i18n="gameover\.revive">復活する ▶<\/span>/);
  assert.match(html, /data-kicker="REVIVE">力尽きた……</);
  const css = read("../css/components.css");
  assert.match(css, /\.gameover-modal--revive \{ background: rgba\(15, 12, 22, 0\.62\)/);
  assert.match(css, /\.revive-fx \{[^}]*z-index: calc\(var\(--z-modal-top\) \+ 1\)/);
  assert.match(css, /\.revive-text \{/);
});

test("文言: 見出し・復活する・マインちゃんの「王妃の黄金時計」。 RTA/ABSOLUTE も「復活する」", () => {
  assert.equal(ui["gameover.title"].ja, "力尽きた……");
  assert.equal(ui["gameover.revive"].ja, "復活する ▶");
  assert.equal(ui["gameover.reviveCurrent"].ja, "今のレギュレーションで復活する");
  assert.equal(ui["tree.retryNow"].ja, "復活する");
  assert.match(ui["navi.revive.intro"].ja, /^めげないで！この「王妃の黄金時計」のチカラで復活させてあげる！/);
  assert.match(ui["navi.afterTree.bought"].ja, /「復活する」/);
  assert.match(ui["navi.afterTree.none"].ja, /「復活する」/);
  for (const k of ["gameover.title", "gameover.revive", "gameover.reviveCurrent", "tree.retryNow", "navi.revive.intro", "revive.flash"]) assert.ok(ui[k]?.en, k);
  const [l] = naviLines("revive");
  assert.equal(l.key, "navi.revive.intro");
  assert.match(read("../js/skill-tree.js"), /t\("tree\.retryNow", "復活する"\)/);
});
