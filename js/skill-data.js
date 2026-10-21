// ============================================================
// skill-data.js — スキルツリーの節 (= SPEC-090 §3)。 データだけ (= DOM も state も触らない)
// ============================================================
//
// SPEC-133: 整数のマス目に置く (= MyCryptoWorkshop の作り)。 根 (0, 0) から道を方向ごとに分け、 道の主な流れは軸に沿って、
// その脇の節は隣の列に並べる。 線は requires の親から子へまっすぐ引く。
//   route    : 道 (vit 生存 / atk 攻撃 / mov 機動 / grw 成長 / trs 財宝 / bos ボス / wm 武器の極意 / bm 強化の目利き)
//   x, y     : マス目の位置 (= 1 マス = UNIT px。 y は下が正)
//   requires : どれか 1 つを取っていれば開く (= 根の子は根)
//   hero     : そのヒーローを仲間にしていることも要る (= SPEC-133。 そのときは 1 段目が無料)
//   kind     : root (0 GUM) / repeat (段ごとに費用 × 段数) / perk (1 回) / capstone (道の節 4 つ ＋ ダスト)
//   cost     : { gum, dust }。 repeat は gum × 次の段数 (= dust は段ごとに同じ)
//   fx       : 1 段ぶんの効果 (= SPEC-090c が state.buffs と定数に写す。 ここでは数だけ)
//   icon     : MCH のエクステンション (= Image/Extensions/<id>.png)
// 道の節は (parent・depth・lane) で書き、 下の ROUTE_LAYOUT でマス目に写す (= 座標を手で書かない)。
// 名前と説明は { ja, en }。 画面が getLang() で引く。

// d1: 1 段目の位置 / axis: 道の流れ (= 2 段目・3 段目・奥義) / side: 脇の列 / label: 道の名前の見出し (= 手で決めた位置)
export const ROUTES = [
  { id: "atk", name: { ja: "攻撃", en: "Attack" },   color: "#f0a04b", d1: [0, -1], axis: [0, -1], side: [1, 0],  label: [0.5, -5.2] },
  { id: "bos", name: { ja: "ボス", en: "Boss" },     color: "#bb86fc", d1: [-1, -1], axis: [0, -1], side: [-1, 0], label: [-1.5, -5.2] },
  { id: "mov", name: { ja: "機動", en: "Mobility" }, color: "#56ccf2", d1: [1, 0],  axis: [1, 0],  side: [0, 1],  label: [5.6, 0] },
  { id: "trs", name: { ja: "財宝", en: "Treasure" }, color: "#f0c14b", d1: [0, 1],  axis: [0, 1],  side: [1, 0],  label: [0.5, 5.2] },
  { id: "vit", name: { ja: "生存", en: "Survival" }, color: "#e76060", d1: [-1, 1], axis: [0, 1],  side: [-1, 0], label: [-1.5, 5.2] },
  { id: "grw", name: { ja: "成長", en: "Growth" },   color: "#5ecf8a", d1: [-1, 0], axis: [-1, 0], side: [0, -1], label: [-5.6, -0.5] },
  // SPEC-131 / SPEC-133: エクステ別 (= minor: 上の道の一覧には出さない・奥義は無い)
  { id: "wm", name: { ja: "武器の極意", en: "Weapon Mastery" }, color: "#ffb37a", minor: true, label: [4, -7.2] },
  { id: "bm", name: { ja: "強化の目利き", en: "Buff Bargains" }, color: "#7fd6c2", minor: true, label: [5.5, 6.8] },
  // SPEC-140: お助けアイテム (= 合体ロボ。 生存の「自然治癒」の左)
  { id: "itm", name: { ja: "お助け", en: "Helpers" }, color: "#ff9bf5", minor: true, label: [-4.4, 2.9] },
];
export const ROUTE_MAP = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

/** 奥義に要る、 その道の節の数 */
export const CAPSTONE_NEED = 4;
export const ROOT_ID = "root";

const N = (id, route, parent, depth, lane, kind, ja, en, dja, den, cost, icon, fx, max) =>
  ({ id, route, parent, depth, lane, kind, name: { ja, en }, desc: { ja: dja, en: den }, cost, icon, fx, ...(max ? { max } : {}) });

export const NODES = [
  { id: ROOT_ID, route: null, parent: null, depth: 0, lane: 0, kind: "root",
    name: { ja: "サバイバーの覚醒", en: "Survivor's Awakening" },
    desc: { ja: "挑戦で得た GUM とゴールドダストで、 次の挑戦を少し楽にする。 すべてはここから。", en: "Spend the GUM and Gold Dust from your runs to make the next one a little easier. It all starts here." },
    cost: { gum: 0, dust: 0 }, icon: 5033, fx: {} },

  // ---- 生存 (赤) ----
  N("vit_hp",      "vit", ROOT_ID,     1,  0, "repeat",   "頑丈なからだ", "Tough Body",     "最大 HP ＋4%（段ごと）", "Max HP +4% per rank",                                { gum: 40 },             1004, { hpMul: 0.04 }, 5),
  N("vit_armor",   "vit", "vit_hp",    2, -1, "repeat",   "厚い皮",       "Thick Hide",     "受けるダメージ −3%（段ごと）", "Damage taken −3% per rank",                     { gum: 60 },             2010, { dmgTakenMul: -0.03 }, 5),
  N("vit_regen",   "vit", "vit_hp",    2,  1, "repeat",   "自然治癒",     "Regeneration",   "毎秒 0.2 HP 回復（段ごと）", "Regenerate 0.2 HP per second per rank",         { gum: 80 },             1159, { regen: 0.2 }, 3),
  N("vit_pancake", "vit", "vit_armor", 3, -1, "perk",     "大盛り",       "Big Serving",    "パンケーキの回復 30% → 40%", "Pancake heals 40% instead of 30%",               { gum: 150 },            1129, { pancakeHeal: 0.40 }),
  N("vit_phoenix", "vit", "vit_regen", 3,  1, "perk",     "不死鳥",       "Phoenix",        "1 回の挑戦に 1 度だけ、 HP 0 で倒れずに 50% 回復", "Once per run, survive a fatal hit with 50% HP", { gum: 250 },  5020, { phoenix: 1 }),
  N("cap_vit",     "vit", "vit_hp",    4,  0, "capstone", "鉄壁",         "Iron Wall",      "受けるダメージ −10%、 開始 HP ＋20%", "Damage taken −10%, starting HP +20%",      { gum: 300, dust: 3 },   5004, { dmgTakenMul: -0.10, hpMul: 0.20 }),

  // ---- 攻撃 (橙) ----
  N("atk_dmg",     "atk", ROOT_ID,     1,  0, "repeat",   "鋭い一撃",     "Sharp Strike",   "攻撃力 ＋3%（段ごと）", "Attack +3% per rank",                                  { gum: 40 },             1100, { dmgMul: 0.03 }, 5),
  N("atk_cd",      "atk", "atk_dmg",   2, -1, "repeat",   "手早さ",       "Quick Hands",    "クールダウン −2%（段ごと）", "Cooldown −2% per rank",                           { gum: 60 },             1111, { cdMul: -0.02 }, 5),
  N("atk_range",   "atk", "atk_dmg",   2,  1, "repeat",   "長い腕",       "Long Reach",     "攻撃の範囲 ＋4%（段ごと）", "Attack range +4% per rank",                        { gum: 80 },             5013, { rangeMul: 0.04 }, 3),
  N("atk_bullet",  "atk", "atk_cd",    3, -1, "perk",     "二連",         "Double Shot",    "弾数 ＋1", "Projectiles +1",                                                    { gum: 250 },            4002, { bullets: 1 }),
  N("atk_pierce",  "atk", "atk_range", 3,  1, "perk",     "貫く",         "Pierce",         "貫通 ＋1", "Pierce +1",                                                        { gum: 150 },            4187, { pierce: 1 }),
  N("cap_atk",     "atk", "atk_dmg",   4,  0, "capstone", "一騎当千",     "One Against a Thousand", "攻撃力 ＋10%、 弾数 ＋1", "Attack +10%, projectiles +1",               { gum: 300, dust: 3 },   5100, { dmgMul: 0.10, bullets: 1 }),

  // ---- 機動 (水色) ----
  N("mov_speed",   "mov", ROOT_ID,     1,  0, "repeat",   "俊足",         "Swift Feet",     "移動速度 ＋2%（段ごと）", "Move speed +2% per rank",                            { gum: 40 },             1031, { speedMul: 0.02 }, 5),
  N("mov_pickup",  "mov", "mov_speed", 2, -1, "repeat",   "長い手",       "Long Arms",      "CE を拾う範囲 ＋8%（段ごと）", "CE pickup range +8% per rank",                  { gum: 60 },             1156, { pickupMul: 0.08 }, 5),
  N("mov_item",    "mov", "mov_speed", 2,  1, "perk",     "目ざとい",     "Keen Eye",       "お助けアイテムを拾う範囲 ＋50%", "Item pickup range +50%",                       { gum: 100 },            3102, { itemPickupMul: 0.5 }),
  N("mov_ghost",   "mov", "mov_pickup", 3, -1, "repeat",  "受け身",       "Breakfall",      "被弾のあとの無敵時間 ＋20%（段ごと）", "Invincibility after a hit +20% per rank", { gum: 100 },          1141, { iframeMul: 0.20 }, 3),
  N("mov_dash",    "mov", "mov_item",  3,  1, "perk",     "逃げ足",       "Quick Escape",   "被弾のあとの無敵時間のあいだ、 移動速度 ＋40%", "Move 40% faster during post-hit invincibility", { gum: 150 }, 1005, { dashMul: 0.4 }),
  N("cap_mov",     "mov", "mov_speed", 4,  0, "capstone", "疾風",         "Gale",           "移動速度 ＋8%、 無敵時間 ＋30%", "Move speed +8%, invincibility +30%",          { gum: 300, dust: 3 },   5120, { speedMul: 0.08, iframeMul: 0.30 }),

  // ---- 成長 (緑) ----
  N("grw_xp",      "grw", ROOT_ID,     1,  0, "repeat",   "学びの速さ",   "Fast Learner",   "拾う CE ＋4%（段ごと）", "CE gained +4% per rank",                                       { gum: 40 },             1008, { xpMul: 0.04 }, 5),
  N("grw_reroll",  "grw", "grw_xp",    2, -1, "repeat",   "引き直し",     "Redraw",         "リロール ＋1（段ごと）", "Rerolls +1 per rank",                                  { gum: 100 },            1178, { reroll: 1 }, 2),
  N("grw_start",   "grw", "grw_xp",    2,  1, "repeat",   "先手",         "Head Start",     "ステージの始めに CE ＋20（段ごと）", "Start each stage with +20 CE per rank",  { gum: 120 },            1016, { startLevels: 1 }, 2),
  N("grw_stock",   "grw", "grw_reroll", 3, -1, "perk",    "大きな鞄",     "Big Bag",        "武器と強化の枠 ＋1", "Weapon and buff slots +1",                                 { gum: 250 },            4142, { stock: 1 }),
  N("grw_skip",    "grw", "grw_start", 3,  1, "perk",     "見送りの礼",   "Pass Reward",    "何も買わずに店を出ると HP 10% 回復", "Leaving a shop without buying heals 10% HP",                 { gum: 120 },            1154, { skipHeal: 0.10 }),
  N("cap_grw",     "grw", "grw_xp",    4,  0, "capstone", "天才",         "Prodigy",        "ステージの始めに CE ＋40、 リロール ＋2", "Start each stage with +40 CE, rerolls +2", { gum: 300, dust: 3 }, 4003, { startLevels: 2, reroll: 2 }),

  // ---- 財宝 (金) ----
  N("trs_gum",     "trs", ROOT_ID,     1,  0, "repeat",   "金勘定",       "Bookkeeping",    "挑戦で得る GUM ＋5%（段ごと）", "GUM from runs +5% per rank",                   { gum: 40 },             4121, { gumMul: 0.05 }, 5),
  N("trs_pot",     "trs", "trs_gum",   2, -1, "repeat",   "壺だらけ",     "More Pots",      "場に出る壺 ＋1（段ごと）", "Pots on the field +1 per rank",                      { gum: 60 },             4600, { pots: 1 }, 2),
  N("trs_chest",   "trs", "trs_gum",   2,  1, "perk",     "早い宝箱",     "Early Chest",    "ふつうの宝箱が 0:10 にも出る", "A chest also appears at 0:10",                   { gum: 150 },            5106, { earlyChest: 1 }),
  N("trs_heal",    "trs", "trs_pot",   3, -1, "perk",     "甘い匂い",     "Sweet Scent",    "壺からパンケーキが出やすい", "Pots drop pancakes more often",                     { gum: 100 },            4129, { pancakeWeight: 1.5 }),
  N("trs_rare",    "trs", "trs_chest", 3,  1, "perk",     "誘い",         "Lure",           "レアエネミーが 45 秒ごと（60 → 45）", "Rare enemies every 45 s (was 60)",         { gum: 150 },            1150, { rareIntervalSec: 45 }),
  N("cap_trs",     "trs", "trs_gum",   4,  0, "capstone", "金運",         "Fortune",        "GUM ＋20%、 ボスのゴールドダスト ＋1", "GUM +20%, boss Gold Dust +1",              { gum: 300, dust: 4 },   5109, { gumMul: 0.20, bossDust: 1 }),
  // SPEC-152: 開幕の店は節で開く (= CE は持ち越さないので、 先手やギフト券と組み合わせてはじめて意味がある)。 位置は手で (= 誘いの先)
  { ...N("trs_open", "bm", "trs_rare", 0, 0, "perk", "先行オープン", "Early Opening", "ステージ 2・3 の始まりにも店が開く（先手やギフト券と）", "The shop also opens at the start of stages 2 and 3 (pairs with Head Start and gift tickets)", { gum: 150 }, 1037, { shopAtStart: 1 }),
    x: 1, y: 4, requires: ["trs_rare"], fixed: true },

  // ---- ボス (紫。 ゴールドダストで買う) ----
  N("bos_thunder", "bos", ROOT_ID,     1,  0, "repeat",   "雷鳴",         "Thunderclap",    "雷鼓のボスへのダメージ ＋5%（段ごと。 20% → 30%）", "Raiko's boss damage +5% per rank (20% → 30%)", { gum: 80, dust: 1 }, 5071, { thunderBossRatio: 0.05 }, 2),
  N("bos_chest",   "bos", "bos_thunder", 2, -1, "perk",   "急ぎの宝箱",   "Hasty Chest",    "ボス戦の宝箱が早く出る（6 秒 → 3 秒、 14 秒 → 10 秒ごと）", "Boss-fight chests come sooner (6 s → 3 s, every 14 s → 10 s)", { gum: 150, dust: 1 }, 4111, { bossChestFast: 1 }),
  N("bos_tele",    "bos", "bos_thunder", 2,  1, "repeat", "見切り",       "Foresight",      "突進・叩きつけの予告が 0.2 秒長い（段ごと）", "Charge and slam telegraphs last 0.2 s longer per rank", { gum: 100, dust: 1 }, 4105, { telegraphSec: 0.2 }, 2),
  N("bos_card",    "bos", "bos_chest", 3, -1, "perk",     "切り札",       "Trump Card",     "ボス戦の宝箱からマジックカードが出やすい（40% → 60%）", "Boss-fight chests drop Magic Cards more often (40% → 60%)", { gum: 200, dust: 2 }, 5178, { bossCardRate: 0.60 }),
  N("bos_dmg",     "bos", "bos_tele",  3,  1, "repeat",   "竜の爪",       "Dragon Claw",    "ボスへの攻撃力 ＋5%（段ごと）", "Damage to bosses +5% per rank",                 { gum: 100, dust: 1 },   4097, { bossDmgMul: 0.05 }, 4),
  N("cap_bos",     "bos", "bos_thunder", 4,  0, "capstone", "竜殺し",     "Dragonslayer",   "ボスへの攻撃力 ＋15%、 ボスの接触・技のダメージ −25%", "Damage to bosses +15%, damage from bosses −25%", { gum: 300, dust: 5 }, 5091, { bossDmgMul: 0.15, bossDmgTakenMul: -0.25 }),
];

// ---- 道の節をマス目へ (= 1 段目 d1、 2・3 段目は軸の上 (lane -1) と脇の列 (lane +1)、 奥義は軸の 3 つ先) ----
for (const n of NODES) {
  if (n.kind === "root") { Object.assign(n, { x: 0, y: 0, requires: [] }); continue; }
  if (n.fixed) continue;   // SPEC-152: 位置と条件を手で決めた節
  const r = ROUTES.find((x) => x.id === n.route);
  const sideCol = n.depth === 1 || n.kind === "capstone" ? 0 : (n.lane > 0 ? 1 : (n.depth === 3 ? (NODES.find((p) => p.id === n.parent)?.lane > 0 ? 1 : 0) : 0));
  const k = n.kind === "capstone" ? 3 : n.depth - 1;
  n.x = r.d1[0] + r.axis[0] * k + r.side[0] * sideCol;
  n.y = r.d1[1] + r.axis[1] * k + r.side[1] * sideCol;
  // 奥義は 3 段目のどちらかから (= 道の節 4 つの条件はそのまま)。 ほかは親 1 つ
  n.requires = n.kind === "capstone"
    ? NODES.filter((p) => p.route === n.route && p.depth === 3).map((p) => p.id)
    : [n.parent];
}

/**
 * SPEC-131: エクステ別の強化 (= 21 枚・各 5 段)
 *   武器: その武器の威力 ＋5%（段ごと）。 perk の名前は wdmg_<extId>
 *   強化: その強化エクステのショップの値段 −6%（段ごと）。 perk の名前は cut_<extId>
 * SPEC-133: 武器はその武器を使うヒーローを仲間にしていることが条件で、 そのとき 1 段目は無料。
 *   本作で仲間になるヒーローは、 仲間になる順に数珠つなぎ (= ブレード → リボルバー → 手裏剣 → 雪だるま → ナイフ → レーザーガン)。
 *   ほかのタイトルで仲間になるヒーローは、 最初から使える 2 人の武器 (= ブレード・リボルバー) から分岐 (= 先に仲間にしても開ける)。
 *   強化は持ち主がいないので、 財宝から数珠つなぎ。
 * SPEC-145: どの極意・目利きからも、 その先に目利き・仕込みがまっすぐ伸びる (= 下の EXT_TOOTH の向き)。
 *   入口は攻撃の「長い腕」・財宝の「早い宝箱」 (= 1 段目のまわりには、 まっすぐ伸ばす隙間がないため)
 */
export const MASTERY_GUM = 40;
export const MASTERY_MAX = 5;
export const WEAPON_DMG_PER_RANK = 0.05;
export const BUFF_CUT_PER_RANK = 0.06;
// route, extId, kind, 名前 (ja / en), アイコン, x, y, requires, hero
export const EXT_MASTERY = [
  // SPEC-145: 武器の極意は攻撃の 2 段目「長い腕」から。 本作のヒーローは横一列 (= y −3)、 ほかのタイトルはその上の列 (= y −4)
  ["wm", 10, "w", "ブレード", "Blade", 1001, 2, -3, ["atk_range"], 10001],
  ["wm", 1, "w", "リボルバー", "Revolver", 1029, 3, -3, ["wm_10"], 4006],
  ["wm", 5, "w", "手裏剣", "Shuriken", 1124, 4, -3, ["wm_1"], 2043],
  ["wm", 9, "w", "雪だるま", "Snowman", 1126, 5, -3, ["wm_5"], 2016],
  ["wm", 7, "w", "ナイフ", "Knife", 1048, 6, -3, ["wm_9"], 2003],
  ["wm", 6, "w", "レーザーガン", "Raygun", 1130, 7, -3, ["wm_7"], 4041],
  ["wm", 2, "w", "ブック", "Book", 1008, 1, -4, ["wm_10"], 1006],
  ["wm", 3, "w", "ホーキ", "Broomstick", 1080, 2, -4, ["wm_10"], 1007],
  ["wm", 8, "w", "マレット", "Mallet", 1073, 3, -4, ["wm_1"], 2013],
  ["wm", 4, "w", "パロット", "Parrot", 1113, 4, -4, ["wm_1"], 4052],
  // SPEC-145: 強化の目利きは財宝の 2 段目「早い宝箱」から。 U の字 (= y 3 を右へ、 y 4 を左へ)
  ["bm", 19, "b", "ギョク", "Orb", 1098, 2, 3, ["trs_chest"]],
  ["bm", 18, "b", "カエルの標本", "Frog Specimen", 1169, 3, 3, ["bm_19"]],
  ["bm", 21, "b", "クラウン", "Crown", 1036, 4, 3, ["bm_18"]],
  ["bm", 20, "b", "グンバイ", "Gunbai", 1037, 5, 3, ["bm_21"]],
  ["bm", 16, "b", "りんご", "Apple", 1159, 6, 3, ["bm_20"]],
  ["bm", 17, "b", "オリフラム", "Oriflamme", 1140, 7, 3, ["bm_16"]],
  ["bm", 14, "b", "ホース", "Horse", 1005, 7, 4, ["bm_17"]],
  ["bm", 13, "b", "ブーツ", "Boots", 1031, 6, 4, ["bm_14"]],
  ["bm", 11, "b", "アーマー", "Armor", 1004, 5, 4, ["bm_13"]],
  ["bm", 15, "b", "シールド", "Shield", 1010, 4, 4, ["bm_11"]],
  ["bm", 12, "b", "ラーメン", "Ramen", 1154, 3, 4, ["bm_15"]],
];
for (const [route, extId, kind, ja, en, icon, x, y, requires, hero] of EXT_MASTERY) {
  const w = kind === "w";
  NODES.push({
    ...N(
      `${w ? "wm" : "bm"}_${extId}`, route, requires[0], 0, 0, "repeat",
      w ? `${ja}の極意` : `${ja}の目利き`, w ? `${en} Mastery` : `${en} Bargain`,
      w ? `${ja}の威力 ＋${WEAPON_DMG_PER_RANK * 100}%（段ごと）` : `ショップで${ja}が −${BUFF_CUT_PER_RANK * 100}%（段ごと）`,
      w ? `${en} damage +${WEAPON_DMG_PER_RANK * 100}% per rank` : `${en} costs ${BUFF_CUT_PER_RANK * 100}% less in shops per rank`,
      { gum: MASTERY_GUM }, icon,
      w ? { [`wdmg_${extId}`]: WEAPON_DMG_PER_RANK } : { [`cut_${extId}`]: BUFF_CUT_PER_RANK },
      MASTERY_MAX,
    ),
    x, y, requires, extId, mastery: kind, ...(hero ? { hero } : {}),
  });
}

/**
 * SPEC-139: エクステ別の仕込み・武器の目利き・得意武器
 *   仕込み (= sl_<extId>): 手に入れたとき、 最初から Lv ＋1（段ごと・2 段まで）。 値段は Lv.1 のまま。 perk は slv_<extId>
 *   武器の目利き (= wc_<extId>): ショップでその武器が −6%（段ごと）。 perk は強化と同じ cut_<extId>
 *   得意武器 (= wm_main): ショップとレベルアップで札を引くたびに、 その確率で初期武器の札が必ず並ぶ (= SPEC-144: 20% / 40% / 60%)
 * SPEC-145: 極意・目利きの先にまっすぐ伸ばす (= 武器: 極意 → 目利き → 仕込み、 強化: 目利き → 仕込み)
 */
export const START_LV_GUM = 150;
export const START_LV_MAX = 2;
export const MAIN_BIAS_MAX = 3;
/** SPEC-144: 得意武器 1 段で、 札を引くときに初期武器が必ず並ぶ確率 (= 20% / 40% / 60%) */
export const MAIN_CHANCE_PER_RANK = 0.2;
/** SPEC-145: 伸ばす向き (= 本作の武器は下・ほかのタイトルの武器は上・強化は U の外側) */
export const EXT_TOOTH = Object.fromEntries(EXT_MASTERY.map(([route, extId, , , , , , y]) => [extId,
  route === "wm" ? (y === -3 ? [0, 1] : [0, -1]) : (y === 3 ? [0, -1] : [0, 1])]));
const slNode = (route, parent, extId, ja, en, icon, x, y) => ({
  ...N(`sl_${extId}`, route, parent, 0, 0, "repeat", `${ja}の仕込み`, `${en} Prep`,
    `${ja}を手に入れたとき、 最初から Lv ＋1（段ごと。 値段は Lv.1 のまま）`, `${en} starts 1 level higher per rank when you get it (priced as Lv.1)`,
    { gum: START_LV_GUM }, icon, { [`slv_${extId}`]: 1 }, START_LV_MAX),
  x, y, requires: [parent], extId, mastery: "s",
});
for (const [route, extId, kind, ja, en, icon, x, y] of EXT_MASTERY) {
  const [dx, dy] = EXT_TOOTH[extId];
  if (kind === "w") {
    NODES.push({
      ...N(`wc_${extId}`, "wm", `wm_${extId}`, 0, 0, "repeat", `${ja}の目利き`, `${en} Bargain`,
        `ショップで${ja}が −${BUFF_CUT_PER_RANK * 100}%（段ごと）`, `${en} costs ${BUFF_CUT_PER_RANK * 100}% less in shops per rank`,
        { gum: MASTERY_GUM }, icon, { [`cut_${extId}`]: BUFF_CUT_PER_RANK }, MASTERY_MAX),
      x: x + dx, y: y + dy, requires: [`wm_${extId}`], extId, mastery: "c",
    });
    NODES.push(slNode(route, `wc_${extId}`, extId, ja, en, icon, x + dx * 2, y + dy * 2));
  } else {
    NODES.push(slNode(route, `bm_${extId}`, extId, ja, en, icon, x + dx, y + dy));
  }
}
NODES.push({
  ...N("wm_main", "wm", "atk_dmg", 0, 0, "repeat", "得意武器", "Favored Weapon",
    "ショップとレベルアップで札が並ぶたびに、 初期武器の札が必ず並ぶ確率 20%（段ごとに ＋20%。 最大 60%）", "Each time shop or level-up cards are dealt, 20% chance per rank (max 60%) that your starting weapon is guaranteed among them",
    { gum: 100 }, 3001, { mainBias: 1 }, MAIN_BIAS_MAX),
  x: 1, y: -1, requires: ["atk_dmg"],
});

/**
 * SPEC-140: 合体ロボ (= 解放すると壺・宝箱から出る。 拾うと無敵。 段で絵のレアリティ (= Common → Legendary) と秒 (= 3/4/5/6/8) が上がる)
 */
NODES.push({
  ...N("itm_robot", "itm", "vit_regen", 0, 0, "repeat", "合体ロボ", "Combined Robot",
    "壺と宝箱から合体ロボが出る。 拾うと無敵（3 / 4 / 5 / 6 / 8 秒。 段でレアリティが上がる）", "Pots and chests drop a Combined Robot. Pick it up to become invincible (3/4/5/6/8 s; rarity rises per rank)",
    { gum: 120 }, 1123, { robot: 1 }, 5),
  x: -3, y: 2, requires: ["vit_regen"],
});

export const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]));
/** 画面に出す節 (= 根と道の上のもの。 いまはすべて) */
export const TREE_NODES = NODES;

// 画面上の座標 (1 = 1 マス)。 SPEC-133: マス目そのもの
export function nodePos(n) {
  return { x: n.x, y: n.y };
}

/** 道の名前の見出し (= 道ごとに手で決めた位置) */
export function routeLabelPos(route) {
  return { x: route.label[0], y: route.label[1] };
}
