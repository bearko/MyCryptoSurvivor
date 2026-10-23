// SPEC-166: 三人一組のチーム編成
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTestHost, isTestSite, teamAvailable, normalizeTeam, toggleSub, withMain, subTarget, followStep, TEAM_MAX_SUBS } from "../js/team.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("テスト用のホストでだけ編成が出る (= 本番の survivor.bearko.games では出ない)", () => {
  assert.equal(isTestHost("survivor-test.bearko.games"), true);
  assert.equal(isTestHost("localhost"), true);
  assert.equal(isTestHost("survivor.bearko.games"), false);
  assert.equal(isTestSite("survivor-test.bearko.games"), true);
  assert.equal(isTestSite("localhost"), false, "ローカルでは全員解放・送信止めはしない (= 自動プレイを変えない)");
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 3 }), true);
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 2 }), false, "3 人そろうまでソロ");
  assert.equal(teamAvailable({ testHost: false, unlockedCount: 10 }), false);
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 10, story: true }), false, "ストーリーはソロ");
  assert.equal(teamAvailable({ testHost: true, unlockedCount: 10, rta: true }), false, "RTA はソロ");
});

test("サブは 2 人まで・メインと重ならない・解放していない人は落とす", () => {
  const unlocked = new Set([10001, 4006, 2043, 2016]);
  assert.deepEqual(normalizeTeam({ subs: [4006, 4006, 10001, 9999, 2043, 2016] }, { main: 10001, unlocked }).subs, [4006, 2043]);
  let s = [];
  s = toggleSub(s, 4006, 10001); s = toggleSub(s, 2043, 10001); s = toggleSub(s, 2016, 10001);
  assert.equal(s.length, TEAM_MAX_SUBS, "満員なら入れない");
  assert.deepEqual(toggleSub(s, 4006, 10001), [2043], "押し直すと外れる");
  assert.deepEqual(toggleSub([], 10001, 10001), [], "メインはサブにしない");
  assert.deepEqual(withMain([4006, 2043], 4006), [2043], "サブの人をメインにしたら外す");
});

test("サブはメインの後ろの左右に立ち、 追いかけて寄る", () => {
  const up = { x: 0, y: -1 };
  const a = subTarget(0, 0, up, 0), b = subTarget(0, 0, up, 1);
  assert.ok(a.y > 0 && b.y > 0, "上へ進むと下 (= 後ろ)");
  assert.ok(a.x < 0 && b.x > 0, "左と右");
  const n = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1);
  assert.ok(n.x > 0 && n.x < 100);
  assert.deepEqual(followStep({ x: 5, y: 5 }, { x: 5, y: 5 }, 1), { x: 5, y: 5 });
});

test("配線: 武器は持ち主の位置から・サブの初期武器は武器の枠に・テスト用サイトは送らない", () => {
  const arch = read("../js/battle/archetypes.js");
  assert.ok(!/const px = state\.battle\.player\.x;/.test(arch), "撃つ位置はすべて weaponOrigin");
  assert.match(arch, /weaponOrigin\(o\.weaponExtId\)/, "ブレードはサブの周り");
  assert.match(arch, /weaponOrigin\(b\.weaponExtId\)/, "レーザーはサブから");
  assert.match(read("../js/battle/team-battle.js"), /STOCK_LIMIT_WEAPON/, "枠が埋まっていればサブの武器は入れない");
  assert.match(read("../js/battle/index.js"), /setupTeamBattle\(isTestHost\(\) && !isStory\(\) && !state\.rtaMode/);
  assert.match(read("../js/platform.js"), /!isTestSite\(\) \? window\.BearkoGames/);
  assert.match(read("../js/hero-unlock.js"), /if \(isTestSite\(\)\) return new Set/);
});

// ---- 第 2 段: JIN・サブの武器・必殺技 ----
import { computeJin, jinTier, subWeaponFor, STRIKE_ATTRS, PAIR_CAP, jinBackground } from "../js/jin.js";
import { strikeDamage, buffParams, GAUGE_MAX } from "../js/battle/team-battle.js";
const POOL = JSON.parse(read("../data/hero-pool.json"));
const H = (id) => POOL.heroes.find((h) => h.id === id);

test("台帳: MCH の図鑑の 201 人とアトリビュートの人数", () => {
  assert.equal(POOL.heroes.length, 201);
  assert.ok(Object.values(POOL.attrs).every((a) => a.n >= 1 && a.ja && a.en));
  for (const id of [4006, 2043, 2016, 2003, 4041, 1006, 1007, 2013, 4052]) assert.ok(H(id), `本作の ${id} も台帳にいる`);
});

test("JIN: 3 人で成立・2 人は補正だけ・持っている人が少ないアトリビュートほど強い", () => {
  assert.ok(jinTier(3).mul > jinTier(10).mul && jinTier(10).mul > jinTier(38).mul, "少ないほど強い");
  const hard = computeJin([H(4041), H(1006), H(1007)], POOL.attrs);   // テスラ・ピタゴラス・大長今 = 理系学問
  assert.equal(hard.full?.attr, 107);
  assert.equal(hard.full.kind, "buff", "学問は一定時間の強化");
  const two = computeJin([H(4041), H(1006)], POOL.attrs);
  assert.equal(two.full, null, "2 人では JIN にならない");
  assert.ok(two.pairBonus > 0 && two.pairBonus <= PAIR_CAP);
  // 桃園の誓い (= 3 人しかいない) は最強の単発
  const peach = POOL.heroes.filter((h) => h.attrs.includes(203));
  assert.equal(peach.length, 3);
  const p = computeJin(peach, POOL.attrs);
  assert.equal(p.full.attr, 203); assert.equal(p.full.star, 5); assert.equal(p.full.kind, "strike");
  assert.ok(STRIKE_ATTRS.has(203));
  assert.match(jinBackground(203), /^Image\/Backgrounds\/\d+\.png$/);
  assert.equal(computeJin([H(4041), { id: 10001, attrs: [] }, H(1006)], POOL.attrs).full, null, "MCHウォーリアーはアトリビュートが無い");
});

test("サブの武器: 初期武器 → アトリビュート → ステータス。 メインともう 1 人のサブとは重ねない", () => {
  assert.equal(subWeaponFor(H(4006), { starter: 1, used: new Set([10]), attrs: POOL.attrs }), 1, "本作の人は初期武器");
  const peach = POOL.heroes.filter((h) => h.attrs.includes(203));
  const used = new Set([10]);
  const ws = peach.map((h) => { const w = subWeaponFor(h, { used, attrs: POOL.attrs }); used.add(w); return w; });
  assert.equal(new Set(ws).size, 3, "3 人とも別の系統");
  assert.ok(ws.every((w) => w >= 1 && w <= 10));
  assert.notEqual(subWeaponFor(H(4006), { starter: 1, used: new Set([1, 10]), attrs: POOL.attrs }), 1, "初期武器がメインと同じなら別の系統");
});

test("必殺技: ボタンで撃つ・ステージが進むほど強い・強化は一定時間", () => {
  assert.ok(GAUGE_MAX >= 100);
  assert.ok(strikeDamage(2) > strikeDamage(0));
  assert.equal(strikeDamage(0, 2), strikeDamage(0) * 2);
  const b = buffParams(1.5);
  assert.equal(b.dmgMul, 1.5); assert.ok(b.cdMul < 1); assert.ok(b.ms > 0);
  assert.match(read("../index.html"), /id="tsBtn"/);
  assert.match(read("../js/battle/damage.js"), /teamOnKill\(\)/);
  assert.match(read("../js/battle/weapons.js"), /teamDmgMul\(\)/);
  assert.match(read("../js/battle/sprites.js"), /team\.bg\.path/, "JIN の専用背景");
});

// ---- ?test=1 (= 本番でテスト。 作者 2026-10-23 A 案) ----
import { isTestFlag } from "../js/team.js";
test("?test=1 はそのタブのあいだ続き、 ?test=0 で戻る。 送るものは止める", () => {
  const mem = new Map(); const ss = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  assert.equal(isTestFlag({ search: "" }, ss), false);
  assert.equal(isTestFlag({ search: "?test=1" }, ss), true);
  assert.equal(isTestFlag({ search: "" }, ss), true, "URL から消えても同じタブなら続く");
  assert.equal(isTestFlag({ search: "?test=0" }, ss), false);
  assert.equal(isTestFlag({ search: "?jin=1" }, ss), false);
  const pf = read("../js/platform.js");
  for (const fn of ["unlockAchievements", "_kick", "_rtaCall", "reportRunScore", "isRtaAvailable"]) {
    const body = pf.slice(pf.search(new RegExp(`(export )?(async )?function ${fn}\\(`)));
    assert.match(body.slice(0, 900), /_sdkSend\(\)/, `${fn} は送らない`);
  }
  assert.match(pf, /presence: false/, "来訪・同時接続も送らない");
  assert.match(read("../js/ranking-client.js"), /if \(isTestMode\(\)\) return/, "旧ランキングにも送らない");
});

test("作者 2026-10-23: 選ぶ画面を詰める・サブは 2 人まとめて・武器のタブと並べ替え", () => {
  const html = read("../index.html"), main = read("../js/main.js"), ui = JSON.parse(read("../data/i18n/ui.json"));
  assert.match(html, /<details class="hero-perks hidden" id="heroPerks"><summary/, "スキルツリーの効果は畳む");
  for (const id of ["subPickerSlots", "subPickerTabs", "subPickerSorts", "subPickerDone"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(main, /_subSlot = subs\.length < 2 \? subs\.length/, "1 人目を選んだら 2 人目の枠へ");
  assert.match(main, /hero-modal--team/, "チームのときは詳しい欄を小さく");
  assert.equal(ui["team.pickMain"].ja, "ヒーローを選択", "「札を選ぶ」ではなく");
  for (const k of ["team.sort.hp", "team.sort.phy", "team.sort.int", "team.sort.agi", "team.tab.all", "hero.perks.summary"]) assert.ok(ui[k]?.ja && ui[k]?.en, k);
});

test("作者 2026-10-23 (2): 2 人そろったら閉じる・メインのアトリビュートを出す・説明の 1 行は無い", () => {
  const main = read("../js/main.js"), html = read("../index.html");
  assert.match(main, /if \(at < 0 && subs\.length >= 2\) \{ closeSubPicker\(\); return; \}/);
  assert.match(main, /_mainAttrsLine\(ids\[0\], lang\)/);
  assert.ok(!/id="heroTeamHint"/.test(html), "「SUB の枠を押すと…」は消した");
  assert.match(read("../css/team.css"), /\.hero-modal--team \.hero-detail__weapon \{ display: none; \}/, "開始武器の行はチームの顔に任せる");
});
