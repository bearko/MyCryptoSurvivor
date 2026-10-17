// SPEC-062: 離れたところから撃ってくる敵
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  shooterMode, shooterKeep, shooterOnScreen, shotAngles, nextFireMs, SHOOTER_BAND, SHOOTER_AIM_MS,
  SHOOTER_KEEP_MIN_PX, SPREAD_RAD, MAX_ENEMY_SHOTS,
} from "../js/battle/enemy-shots.js";
import { ENEMY_SPECS, STAGE_TABLE } from "../js/constants.js";

const ENEMIES = JSON.parse(fs.readFileSync(new URL("../data/enemies.json", import.meta.url), "utf8"));
const ROSTER = new Set((Array.isArray(ENEMIES) ? ENEMIES : ENEMIES.enemies).map((e) => e.enemyId));

test("遠ければ近づき、 近すぎると下がり、 ちょうどよい距離では横へ回る", () => {
  const k = { rx: 200, ry: 300 };
  assert.equal(shooterMode(200 * (1 + SHOOTER_BAND) + 1, 0, k), "approach");
  assert.equal(shooterMode(200, 0, k), "strafe");
  assert.equal(shooterMode(0, 300, k), "strafe");
  assert.equal(shooterMode(200 * (1 - SHOOTER_BAND) - 1, 0, k), "retreat");
});

test("保つ距離は画面に合わせた楕円で、 保った位置は画面の中 (= 映っているので撃てる)", () => {
  for (const [vw, vh] of [[390, 760], [360, 560], [1280, 640], [800, 600]]) {
    const k = shooterKeep(vw, vh);
    assert.ok(k.rx >= SHOOTER_KEEP_MIN_PX && k.ry >= SHOOTER_KEEP_MIN_PX);
    // 楕円の上・横 (= 横へ回る帯の外側の端) が画面に映っている
    assert.ok(shooterOnScreen(k.rx, 0, vw, vh), `${vw}x${vh} 横`);
    assert.ok(shooterOnScreen(0, k.ry, vw, vh), `${vw}x${vh} 縦`);
  }
  assert.equal(shooterOnScreen(400, 0, 390, 760), false, "画面の外からは撃たない");
});

test("狙って 1 発と、 3 方向", () => {
  assert.deepEqual(shotAngles("aimed", 1), [1]);
  const s = shotAngles("spread3", 0);
  assert.equal(s.length, 3);
  assert.deepEqual(s, [-SPREAD_RAD, 0, SPREAD_RAD]);
});

test("撃つ間隔は毎回少しずれ (= 一斉に撃たない)、 狙う線はそれより短い", () => {
  assert.equal(nextFireMs(2000, 0), 1700);
  assert.equal(nextFireMs(2000, 1), 2300);
  for (const id of [166, 136]) assert.ok(SHOOTER_AIM_MS < nextFireMs(ENEMY_SPECS[id].shot.everyMs, 0));
  assert.ok(MAX_ENEMY_SHOTS >= 30);
});

test("撃ってくる敵は絵があり、 弾は避けられる速さ。 ステージが進むほど多く・早く出る", () => {
  for (const id of [166, 136]) {
    const s = ENEMY_SPECS[id];
    assert.equal(s.behavior, "shooter");
    assert.ok(ROSTER.has(id), `${id} の絵`);
    assert.ok(s.shot.speed >= 100 && s.shot.speed <= 220, `${id} の弾の速さ`);
  }
  const sh = STAGE_TABLE.map((st) => st.shooters);
  assert.ok(sh.every(Boolean));
  for (let i = 1; i < sh.length; i++) {
    assert.ok(sh[i].max >= sh[i - 1].max && sh[i].fromMs <= sh[i - 1].fromMs && sh[i].everyMs <= sh[i - 1].everyMs);
  }
  for (const s of sh) for (const id of s.ids) assert.equal(ENEMY_SPECS[id]?.behavior, "shooter");
});
