// ============================================================
// skill-data.js — スキルツリーの節 (= SPEC-090 §3)。 データだけ (= DOM も state も触らない)
// ============================================================
//
// 真ん中に根、 そこから 6 本の道が 60° ずつ。 各道は深さ 1〜4 で、 深さ 4 が奥義。
//   route  : 道 (vit 生存 / atk 攻撃 / mov 機動 / grw 成長 / trs 財宝 / bos ボス)
//   parent : 木の上の親。 親を取ると見える (= その先は「？」で見せる)
//   depth  : 中心からの段数 / lane: 横のずれ (-1 左 / 0 / +1 右)
//   kind   : root (0 GUM) / repeat (段ごとに費用 × 段数) / perk (1 回) / capstone (道の節 4 つ ＋ ダスト)
//   cost   : { gum, dust }。 repeat は gum × 次の段数 (= dust は段ごとに同じ)
//   fx     : 1 段ぶんの効果 (= SPEC-090c が state.buffs と定数に写す。 ここでは数だけ)
//   icon   : MCH のエクステンション (= Image/Extensions/<id>.png)
// 名前と説明は { ja, en }。 画面が getLang() で引く。

export const ROUTES = [
  { id: "vit", name: { ja: "生存", en: "Survival" }, color: "#e76060", angle: -90 },
  { id: "atk", name: { ja: "攻撃", en: "Attack" },   color: "#f0a04b", angle: -30 },
  { id: "mov", name: { ja: "機動", en: "Mobility" }, color: "#56ccf2", angle: 30 },
  { id: "grw", name: { ja: "成長", en: "Growth" },   color: "#5ecf8a", angle: 90 },
  { id: "trs", name: { ja: "財宝", en: "Treasure" }, color: "#f0c14b", angle: 150 },
  { id: "bos", name: { ja: "ボス", en: "Boss" },     color: "#bb86fc", angle: 210 },
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
  N("mov_wall",    "mov", "mov_item",  3,  1, "perk",     "壁ぎわ",       "Wall Runner",    "枠の縁・建物に当たっても速度が落ちない", "No slowdown against walls and buildings", { gum: 150 },      1005, { noWallSlow: 1 }),
  N("cap_mov",     "mov", "mov_speed", 4,  0, "capstone", "疾風",         "Gale",           "移動速度 ＋8%、 無敵時間 ＋30%", "Move speed +8%, invincibility +30%",          { gum: 300, dust: 3 },   5120, { speedMul: 0.08, iframeMul: 0.30 }),

  // ---- 成長 (緑) ----
  N("grw_xp",      "grw", ROOT_ID,     1,  0, "repeat",   "学びの速さ",   "Fast Learner",   "経験値 ＋4%（段ごと）", "XP +4% per rank",                                       { gum: 40 },             1008, { xpMul: 0.04 }, 5),
  N("grw_reroll",  "grw", "grw_xp",    2, -1, "repeat",   "引き直し",     "Redraw",         "リロール ＋1（段ごと）", "Rerolls +1 per rank",                                  { gum: 100 },            1178, { reroll: 1 }, 2),
  N("grw_start",   "grw", "grw_xp",    2,  1, "repeat",   "先手",         "Head Start",     "開始時にレベルアップ 1 回（段ごと）", "Start each run with 1 level-up per rank",  { gum: 120 },            1016, { startLevels: 1 }, 2),
  N("grw_stock",   "grw", "grw_reroll", 3, -1, "perk",    "大きな鞄",     "Big Bag",        "武器と強化の枠 ＋1", "Weapon and buff slots +1",                                 { gum: 250 },            4142, { stock: 1 }),
  N("grw_skip",    "grw", "grw_start", 3,  1, "perk",     "見送りの礼",   "Pass Reward",    "スキップすると HP 10% 回復", "Skipping a level-up heals 10% HP",                 { gum: 120 },            1154, { skipHeal: 0.10 }),
  N("cap_grw",     "grw", "grw_xp",    4,  0, "capstone", "天才",         "Prodigy",        "開始時にレベルアップ ＋2 回、 リロール ＋2", "Start with +2 level-ups, rerolls +2", { gum: 300, dust: 3 }, 4003, { startLevels: 2, reroll: 2 }),

  // ---- 財宝 (金) ----
  N("trs_gum",     "trs", ROOT_ID,     1,  0, "repeat",   "金勘定",       "Bookkeeping",    "挑戦で得る GUM ＋5%（段ごと）", "GUM from runs +5% per rank",                   { gum: 40 },             4121, { gumMul: 0.05 }, 5),
  N("trs_pot",     "trs", "trs_gum",   2, -1, "repeat",   "壺だらけ",     "More Pots",      "場に出る壺 ＋1（段ごと）", "Pots on the field +1 per rank",                      { gum: 60 },             4600, { pots: 1 }, 2),
  N("trs_chest",   "trs", "trs_gum",   2,  1, "perk",     "早い宝箱",     "Early Chest",    "ふつうの宝箱が 0:10 にも出る", "A chest also appears at 0:10",                   { gum: 150 },            5106, { earlyChest: 1 }),
  N("trs_heal",    "trs", "trs_pot",   3, -1, "perk",     "甘い匂い",     "Sweet Scent",    "壺からパンケーキが出やすい", "Pots drop pancakes more often",                     { gum: 100 },            4129, { pancakeWeight: 1.5 }),
  N("trs_rare",    "trs", "trs_chest", 3,  1, "perk",     "誘い",         "Lure",           "レアエネミーが 45 秒ごと（60 → 45）", "Rare enemies every 45 s (was 60)",         { gum: 150 },            1150, { rareIntervalSec: 45 }),
  N("cap_trs",     "trs", "trs_gum",   4,  0, "capstone", "金運",         "Fortune",        "GUM ＋20%、 ボスのゴールドダスト ＋1", "GUM +20%, boss Gold Dust +1",              { gum: 300, dust: 4 },   5109, { gumMul: 0.20, bossDust: 1 }),

  // ---- ボス (紫。 ゴールドダストで買う) ----
  N("bos_thunder", "bos", ROOT_ID,     1,  0, "repeat",   "雷鳴",         "Thunderclap",    "雷鼓のボスへのダメージ ＋5%（段ごと。 20% → 30%）", "Raiko's boss damage +5% per rank (20% → 30%)", { gum: 80, dust: 1 }, 5071, { thunderBossRatio: 0.05 }, 2),
  N("bos_chest",   "bos", "bos_thunder", 2, -1, "perk",   "急ぎの宝箱",   "Hasty Chest",    "ボス戦の宝箱が早く出る（6 秒 → 3 秒、 14 秒 → 10 秒ごと）", "Boss-fight chests come sooner (6 s → 3 s, every 14 s → 10 s)", { gum: 150, dust: 1 }, 4111, { bossChestFast: 1 }),
  N("bos_tele",    "bos", "bos_thunder", 2,  1, "repeat", "見切り",       "Foresight",      "突進・叩きつけの予告が 0.2 秒長い（段ごと）", "Charge and slam telegraphs last 0.2 s longer per rank", { gum: 100, dust: 1 }, 4105, { telegraphSec: 0.2 }, 2),
  N("bos_card",    "bos", "bos_chest", 3, -1, "perk",     "切り札",       "Trump Card",     "ボス戦の宝箱からマジックカードが出やすい（40% → 60%）", "Boss-fight chests drop Magic Cards more often (40% → 60%)", { gum: 200, dust: 2 }, 5178, { bossCardRate: 0.60 }),
  N("bos_dmg",     "bos", "bos_tele",  3,  1, "repeat",   "竜の爪",       "Dragon Claw",    "ボスへの攻撃力 ＋5%（段ごと）", "Damage to bosses +5% per rank",                 { gum: 100, dust: 1 },   4097, { bossDmgMul: 0.05 }, 4),
  N("cap_bos",     "bos", "bos_thunder", 4,  0, "capstone", "竜殺し",     "Dragonslayer",   "ボスへの攻撃力 ＋15%、 ボスの接触・技のダメージ −25%", "Damage to bosses +15%, damage from bosses −25%", { gum: 300, dust: 5 }, 5091, { bossDmgMul: 0.15, bossDmgTakenMul: -0.25 }),
];

export const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]));
/** 画面に出す節 (= 根と道の上のもの。 いまはすべて) */
export const TREE_NODES = NODES;

// 画面上の座標 (1 = 1 マス)。 中心から道の角度の向きに段数ぶん伸ばし、 lane で横にずらす (= 参考作と同じ比率)
const RING = 2.6;
const STEP = 1.7;
const LANE = 0.98;
export function nodePos(n) {
  if (n.kind === "root") return { x: 0, y: 0 };
  const a = (ROUTE_MAP[n.route].angle * Math.PI) / 180;
  const r = RING + (n.depth - 1) * STEP;
  const px = -Math.sin(a);
  const py = Math.cos(a);
  return { x: Math.cos(a) * r + px * n.lane * LANE, y: Math.sin(a) * r + py * n.lane * LANE };
}

/** 道の名前を置く半径 (= いちばん奥の節のさらに先) */
export function routeLabelPos(route) {
  const depth = Math.max(...TREE_NODES.filter((n) => n.route === route.id).map((n) => n.depth));
  const a = (route.angle * Math.PI) / 180;
  const r = RING + depth * STEP;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}
