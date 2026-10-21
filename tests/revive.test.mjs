// SPEC-150 / SPEC-151: 「やり直し」ではなく「復活」 (= 粒子になって舞い、 渦で待ち、 王妃の黄金時計で上から降って姿になる)
// 実行: node --test tests/revive.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REVIVE, REVIVE_EXT_ID, spriteParticles, dissolveStep, vortexPos, vortexStep, lerpPos, easeInCubic, easeOutCubic, easeInOut } from "../js/battle/revive-fx.js";
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
  // 2×2 の平均
  const d2 = new Uint8ClampedArray(2 * 2 * 4);
  d2.set([255, 255, 255, 255], 0); d2.set([0, 0, 0, 255], 4); d2.set([255, 255, 255, 255], 8); d2.set([0, 0, 0, 255], 12);
  const one = spriteParticles(d2, 2, 2, 1);
  assert.equal(one.length, 1);
  assert.equal(one[0].r, 128);
  // 薄すぎる升は粒にしない
  const d3 = new Uint8ClampedArray(4); d3.set([255, 0, 0, 40], 0);
  assert.equal(spriteParticles(d3, 1, 1, 1).length, 0);
});

test("散る: 舞い上がり、 だんだん弱まる。 上から出たら下から戻る", () => {
  const p = { x: 100, y: 300, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(p, 0, 0.1, 800);
  assert.ok(p.y < 300, "上へ");
  assert.ok(p.a >= REVIVE.alphaMin && p.a <= 1);
  const q = { x: 100, y: 300, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(q, REVIVE.dissolveMs / 1000, 0.1, 800);   // 舞い上がる時間の終わりは 15% の速さ
  assert.ok(Math.abs((300 - q.y) - 15 * 0.1) < 1e-9);
  const r = { x: 100, y: -20, up: 100, side: 0, phase: 0, a: 1 };
  dissolveStep(r, 5, 0.1, 800);
  assert.equal(r.y, 808);
});

test("渦: 紡錘 (= 上下で細く真ん中で太い) の中を回りながら上から下へ流れ、 下へ抜けたら上から", () => {
  const cx = 200, cy = 400, H = 400, R = 80;
  const top = vortexPos({ theta: 0, s: 0, rj: 1 }, cx, cy, H, R);
  const mid = vortexPos({ theta: 0, s: 0.5, rj: 1 }, cx, cy, H, R);
  const bottom = vortexPos({ theta: 0, s: 0.999, rj: 1 }, cx, cy, H, R);
  assert.ok(Math.abs(top.x - cx) < 1e-9 && top.y === cy - H / 2, "上は細い");
  assert.ok(Math.abs(mid.x - (cx + R)) < 1e-9 && mid.y === cy, "真ん中が一番太い");
  assert.ok(Math.abs(bottom.x - cx) < 2, "下も細い");
  assert.equal(vortexPos({ theta: Math.PI / 2, s: 0.5, rj: 1 }, cx, cy, H, R).depth, 1, "手前");
  assert.equal(vortexPos({ theta: -Math.PI / 2, s: 0.5, rj: 1 }, cx, cy, H, R).depth, -1, "奥");
  const p = { theta: 0, s: 0.95, spin: 1, fall: 0.1 };
  vortexStep(p, 1);
  assert.equal(p.theta, 1);
  assert.ok(Math.abs(p.s - 0.05) < 1e-9, "下へ抜けたら上から");
});

test("途中の位置と ease", () => {
  assert.deepEqual(lerpPos(0, 0, 100, 200, 0), { x: 0, y: 0 });
  assert.deepEqual(lerpPos(0, 0, 100, 200, 1), { x: 100, y: 200 });
  assert.equal(easeInCubic(0.5), 0.125);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeInOut(0.5), 0.5);
});

test("流れの配線: 倒れたら粒子 → 渦に入ったらマインちゃんが全身で時計の絵と → 言い終えたら半透明の結果。 復活するで吸い込まれ → 戦闘 → 上から降って姿に", () => {
  const go = read("../js/battle/gameover.js");
  assert.match(go, /const dissolved = _startDissolve\(\(\) => \{/);
  assert.match(go, /naviSay\(lines, \{ place: "revive", autoHideMs: REVIVE_LINE_HOLD_MS, onTapNavi:/);
  assert.match(go, /_showWatch\(\);/);
  assert.match(go, /modal\?\.classList\.toggle\("gameover-modal--revive", dissolved\)/);
  assert.match(go, /if \(!dissolved\) show\(\);/);
  assert.match(go, /presentResult\(modal, "allClear"/);
  assert.doesNotMatch(go, /presentResult\(modal, "lose"/, "lose のテロップは出さない");
  // 倒れたときの音: lose のジングルは鳴らさず、 ダメージの SE をゆっくり
  assert.match(go, /else playSe\(SFX\.PLAYER_DAMAGED, 0, 0\.8, DEATH_SE_RATE\);/);
  assert.doesNotMatch(go, /playSe\(SFX\.GAME_OVER_LOSE/);
  assert.match(go, /const DEATH_SE_RATE = 0\.45;/);
  // 復活する: 吸い込まれてから戦闘を始め、 上から降りこむあいだは止めておく
  assert.match(go, /const sunk = await _reviveSink\(\);/);
  assert.match(go, /m\.startBattle\(state\.ownedHero\);\n\s+if \(sunk\) await _reviveRain\(\);/);
  assert.match(go, /b\.heroDissolved = true;\n\s+pauseTime\(\);/);
  assert.match(go, /b\.heroDissolved = false;\n\s+resumeTime\(\);\n\s+_noCountdown\(\);/);
  assert.match(go, /playSe\(SFX\.PICK_HEAL, 0, 0\.8\);\s*\/\/ 3_heal_resurrection/);
  assert.match(go, /if \(_reviving\) return;/, "集まっているあいだに 2 度押されても 1 回");
  assert.match(go, /_hideWatch\(\);\s*\/\/ SPEC-151\n\s+clearReviveFx\(\);\s*\/\/ SPEC-150/);
  // 戦闘の絵からヒーローを消す (= 当たりの円も HP バーも)
  const render = read("../js/battle/render.js");
  assert.match(render, /if \(state\.battle\.heroDissolved\) return _afterPlayer\(/);
  assert.match(render, /function _afterPlayer\(ctx, camera, w, h, nowMs\) \{\n[^\n]*\n\s+const \{ player, magicCards, damageNumbers, enemies \} = state\.battle;\n\s+const mods = missionMods\(\);/, "切り出した関数は renderBattle の局所変数を自分で読み直す (= SPEC-153 の regression)");
  assert.match(read("../js/battle/index.js"), /b\.heroDissolved\s*= false;/);
  // 王妃の黄金時計 (= MCH 5111) のボタンと絵
  assert.equal(REVIVE_EXT_ID, 5111);
  assert.match(go, /img\(`Image\/Extensions\/\$\{REVIVE_EXT_ID\}\.png`\)/);   // マインちゃんの横の時計の絵
  assert.match(go, /_watch\.className = "revive-watch";/);
  const html = read("../index.html");
  assert.match(html, /id="gameOverRetry" data-reveal><img class="gameover-modal__clock"[^>]*\/><span data-i18n="gameover\.revive">復活する ▶<\/span>/);
  assert.match(read("../css/components.css"), /\.gameover-modal__again \{ display: inline-flex; align-items: center; justify-content: center; gap: 0\.4rem; white-space: nowrap;/, "SPEC-155: 時計の絵と文字を 1 行に (= 折り返さない)");
  assert.match(html, /id="gameOverPicks" data-reveal/);
  assert.match(html, /data-kicker="">REVIVE</, "「力尽きた」は出さない (= 作者の決定)");
  const css = read("../css/components.css");
  assert.match(css, /\.gameover-modal--revive \.gameover-modal__card \{ background: rgba\(20, 16, 30, 0\.42\); \}/, "札は半透明");
  assert.match(css, /\.revive-fx \{[^}]*z-index: calc\(var\(--z-modal-top\) - 1\)/, "渦は結果の画面の後ろ");
  assert.match(css, /\.revive-watch \{/);
  assert.match(css, /\.revive-text \{/);
  assert.match(read("../css/chars.css"), /\.navi\[data-place="revive"\] \{ --s: 2; --peek: 0\.1; z-index: calc\(var\(--z-modal-top\) \+ 5\); \}/, "全身で結果の画面より上");
});

test("SPEC-152: 吸い込みのあいだは暗いまま → hold → 降りこみながら晴れる。 木を開いているあいだ渦は隠す。 止まっているあいだは揺らさない", () => {
  const fx = read("../js/battle/revive-fx.js");
  assert.match(fx, /if \(k >= 1\) \{ _mode = "hold"; _finish\(true\); \}/);
  assert.match(fx, /\} else if \(_mode === "hold"\) \{\n\s+_ctx\.fillStyle = "rgba\(0,0,0,1\)";/, "降りこみが始まるまで真っ暗");
  assert.match(fx, /_mode === "rain"[^]*?rgba\(0,0,0,\$\{\(1 - easeOutCubic\(k\)\)\.toFixed\(2\)\}\)/, "降りこみながら晴れる");
  assert.match(fx, /REVIVE\.dark \+ \(1 - REVIVE\.dark\) \* k/, "吸い込みながら真っ暗に");
  const tree = read("../js/skill-tree.js");
  assert.match(tree, /classList\.add\("revive-fx--hold"\)/);
  assert.match(tree, /classList\.remove\("revive-fx--hold"\)/);
  assert.match(read("../css/components.css"), /\.revive-fx\.revive-fx--hold \{ display: none !important; \}/);
  assert.match(read("../js/battle/fx.js"), /if \(state\.pauseFlags > 0 \|\| state\.battle\.gameOver\) return \{ x: 0, y: 0 \};/);
});

test("ボスの予告の警告は 1 度だけ (= 毎コマ呼ぶと吹き出しが空のまま止まる)", () => {
  assert.match(read("../js/battle/enemies.js"), /if \(fxBossIncoming\(\)\) _bossIncomingHook\?\.\(\);/);
  assert.match(read("../js/battle/fx.js"), /if \(fx\.bossWarned\) return false;[\s\S]*?_showBossBanner\(\);\n\s+return true;/);
});

test("レッスンは告げ声が終わるのを待ち、 出すときは前のボイスを切る (= 「ここは node ホレリス」と「新しいステージ！」を重ねない)", () => {
  assert.match(read("../js/voice.js"), /export function isVoicePlaying\(\)/);
  const lesson = read("../js/lesson.js");
  assert.match(lesson, /if \(isVoicePlaying\(\)\) return;\s*\/\/ SPEC-151/);
  // SPEC-154: 通信窓で話す (= naviSay がそのセリフのボイスを鳴らし、 前のボイスは止まる)。 止めない
  assert.match(lesson, /naviSay\(\[\{ key: vid, pose: POSE\[key\] \?\? "pointer", voice: hasVoice\(vid\) \? vid : null \}\], opt\);/);
  assert.doesNotMatch(lesson, /pauseTime\(/, "レッスンはゲームを止めない");
});

test("文言: 見出し・復活する・マインちゃんの「王妃の黄金時計」。 RTA/ABSOLUTE も「復活する」", () => {
  assert.equal(ui["gameover.title"].ja, "REVIVE");
  assert.doesNotMatch(ui["result.fellAt"].ja, /力尽きた/);
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
