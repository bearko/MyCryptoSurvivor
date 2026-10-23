// ============================================================
// jin.js — JIN (= MCH のアトリビュートの重なり) と、 サブの武器 (= SPEC-166 §4.6 / §4.7)
// ============================================================
//
// チームの 3 人が同じアトリビュートを持つと JIN。 2 人だと小さな補正だけ (= 作者 2026-10-23 J1=A)。
// そのアトリビュートを持つヒーローが MCH に少ないほど強い (= 作者 J2。 人数は data/hero-pool.json の attrs[].n)。
// JIN の効き方は 2 つ: 単発の大技 (= 必殺技の威力) か、 一定時間の強化 (= 武器の威力と間隔)。 専用背景は 攻撃中 / 強化のあいだ (= 作者 J3)。
// DOM にも state にも触れない純関数だけ (= テストする)。

/** 持っている人数 → 強さ (= 少ないほど強い)。 star は画面の ★ の数 */
export const JIN_TIERS = [
  { maxN: 3,  mul: 2.0,  star: 5 },
  { maxN: 5,  mul: 1.75, star: 4 },
  { maxN: 8,  mul: 1.5,  star: 3 },
  { maxN: 12, mul: 1.3,  star: 2 },
  { maxN: Infinity, mul: 1.15, star: 1 },
];
export function jinTier(n) {
  return JIN_TIERS.find((t) => (n | 0) <= t.maxN) ?? JIN_TIERS[JIN_TIERS.length - 1];
}

/** 2 人そろいの補正 (= 武器の威力。 1 つあたり (倍率 - 1) × 10%、 合わせて最大 15%) */
export const PAIR_RATE = 0.1;
export const PAIR_CAP = 0.15;

/** 単発の大技になるアトリビュート (= 戦い・武器・軍勢の連携)。 ほかは一定時間の強化 */
export const STRIKE_ATTRS = new Set([102, 110, 111, 112, 117, 118, 120, 121, 122, 123, 124, 125, 141, 142, 144, 145, 151, 201, 203, 204, 205, 207, 212, 213]);

/** 強化の JIN の長さ (= 秒) と、 武器の間隔の縮み (= 倍率の半分だけ速く) */
export const BUFF_SEC = 8;

/** JIN の専用背景 (= MCH の Backgrounds。 作者が JIN ごとの絵を決めるまでは、 アトリビュートの id で決まった 1 枚) */
export const JIN_BACKGROUNDS = ["1002", "1003", "1004", "1010", "1028", "1030", "1039", "1041", "1046", "1051", "1052", "1053", "1056", "2505", "2705", "2805", "2905"];
export function jinBackground(attrId) {
  return `Image/Backgrounds/${JIN_BACKGROUNDS[Math.abs(Number(attrId) | 0) % JIN_BACKGROUNDS.length]}.png`;
}

/**
 * チームの JIN。 members = [{ id, attrs: [attrId] }] (= メインとサブ。 アトリビュートの無い人も入れてよい)
 * attrs = { [attrId]: { ja, en, n } }
 * @returns {{ full: null | { attr, name, n, mul, star, kind }, pairs: Array<{ attr, name, n, bonus }>, pairBonus: number }}
 */
export function computeJin(members, attrs) {
  const count = new Map();
  for (const m of members) for (const a of new Set(m?.attrs ?? [])) count.set(a, (count.get(a) ?? 0) + 1);
  const size = members.filter(Boolean).length;
  const info = (a) => attrs?.[a] ?? attrs?.[String(a)] ?? { ja: String(a), en: String(a), n: 99 };
  const byRare = (x, y) => info(x).n - info(y).n || x - y;
  const fullIds = size >= 3 ? [...count].filter(([, c]) => c >= 3).map(([a]) => a).sort(byRare) : [];
  let full = null;
  if (fullIds.length) {
    const a = fullIds[0], it = info(a), t = jinTier(it.n);
    full = { attr: a, name: { ja: it.ja, en: it.en }, n: it.n, mul: t.mul, star: t.star, kind: STRIKE_ATTRS.has(a) ? "strike" : "buff" };
  }
  const pairs = [...count].filter(([a, c]) => c === 2 && a !== full?.attr).map(([a]) => a).sort(byRare).map((a) => {
    const it = info(a);
    return { attr: a, name: { ja: it.ja, en: it.en }, n: it.n, bonus: Math.round((jinTier(it.n).mul - 1) * PAIR_RATE * 1000) / 1000 };
  });
  const pairBonus = Math.min(PAIR_CAP, Math.round(pairs.reduce((s, p) => s + p.bonus, 0) * 1000) / 1000);
  return { full, pairs, pairBonus };
}

// ---- サブの武器 (= 10 人以外の MCH ヒーローもサブに来る。 アトリビュートから 10 系統のどれかへ) ----

/** アトリビュート → 武器の系統 (= extId)。 その人のアトリビュートを少ない順に見て、 最初に当たったもの */
export const ATTR_WEAPON = {
  1:  [110, 150, 129, 202],                      // リボルバー: 銃火器・ウェスタン・アメリカ大陸・アメリカンドリーム
  2:  [106, 138, 103, 101, 105, 104, 143],       // 本: 文系学問・信仰・政治・指導者・音楽・美術・芸能
  3:  [148, 116, 211, 139, 149, 108, 209, 210],  // ホーキ: 呪い・オカルト・童話・伝承・謎・女性・ジャンヌ・美女
  4:  [109, 205, 113, 114, 146],                 // オウム: 海・黒ひげ海賊団・動物・旅・地中海
  5:  [112, 126, 118, 119, 120, 117, 204, 201, 212, 147],   // 手裏剣: 隠密・日本・戦国・江戸・幕末・平安鎌倉・新撰組・本能寺・天下人・アジア
  6:  [107, 153, 154, 206, 214],                 // レーザーガン: 理系学問・機械・宇宙・Etheremon・OASYX
  7:  [111, 115, 131, 151, 127, 132, 130],       // ナイフ: 決闘・革命・イギリス・隻眼・フランス・ドイツ・イタリア
  8:  [144, 145, 121, 122, 123, 124, 125, 128, 203, 213, 141],   // 木槌: 斧・格闘・三国志・秦・魏・呉・蜀・中国・桃園・四面楚歌・長柄武器
  9:  [134, 140, 133, 136],                      // 雪だるま: ロシア・ケルト・オーストリア・ヨーロッパ
  10: [207, 102, 137, 135, 142, 152],            // ブレード: 円卓の騎士・戦術・ローマ・ギリシャ・弓・デュオ
};
const WEAPON_OF_ATTR = new Map(Object.entries(ATTR_WEAPON).flatMap(([w, list]) => list.map((a) => [a, Number(w)])));

/**
 * サブの武器。 決まった初期武器がある人 (= 本作の 10 人) はそれ、 ほかはアトリビュートから。
 * used に入っている系統 (= メインともう 1 人のサブ) とは重ねない (= 同じ系統は武器の枠で 1 つになるため)
 * @returns {number} extId (1〜10)
 */
export function subWeaponFor(hero, { starter = null, used = new Set(), attrs = {} } = {}) {
  const free = (w) => w != null && !used.has(Number(w));
  if (free(starter)) return Number(starter);
  const rare = [...(hero?.attrs ?? [])].sort((x, y) => (attrs[x]?.n ?? 99) - (attrs[y]?.n ?? 99) || x - y);
  for (const a of rare) { const w = WEAPON_OF_ATTR.get(a); if (free(w)) return w; }
  const s = hero?.stats ?? {};
  const byStat = [[s.phy ?? 0, 8], [s.int ?? 0, 2], [s.agi ?? 0, 7]].sort((x, y) => y[0] - x[0]).map(([, w]) => w);
  for (const w of byStat) if (free(w)) return w;
  for (let w = 1; w <= 10; w++) if (free(w)) return w;
  return Number(starter ?? 1);
}
