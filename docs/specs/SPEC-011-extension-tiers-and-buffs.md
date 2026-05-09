# SPEC-011 — Extension Schema Overhaul (17 Series × 5 Tiers) + Buff Archetype

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-010 (= sprite + viewport、 stack 上)

## 1. 背景 / 課題

ユーザーから extension 仕様の **整理されたスペック** 提示:
- **武器エクステンション** (10 系列): リボルバー / ブック / パンジャンドラム / モアイ / 手裏剣 / レーザーガン / ナイフ / アックス / ピエロ / ブレード
- **強化エクステンション** (7 系列): アーマー / ラーメン / ブーツ / ホース / シールド / りんご / オリフラム
- 各系列に **5 段階のレアリティ** (Common / Uncommon / Rare / Epic / Legendary)
- レベルアップ = レアリティ昇格 = 名前 / アイコン / スキル名 / 効果が変化

現状 (= SPEC-008) の `data/extensions.json` は flat な MCH ext 10 件のみで、 全部が
「自動発射ホーミング投射体」 という単一武器に reduce されている。 強化 (= buff) の概念も無い。

本 SPEC では **データスキーマを v2 に全面再設計** し、 17 系列 × 5 段階を表現する。 武器の固有挙動
(= リボルバーの放射 / ブックの周回 / レーザーの貫通 等) は **SPEC-012 で扱う**。 ここでは:

- スキーマ変更
- 17 系列分のデータエントリ
- Level up モーダル UI で tier 名 / スキル名 / 効果説明 / アイコンを正しく表示
- **強化 7 系列の効果適用**ロジック (= 上限 HP up / 毎秒回復 / 移動速度 up / 攻撃間隔短縮 / 被ダメ率減 / 威力 up / 弾数 up)

を完成させる。 武器系列は既存の単一 homing projectile (= weaponFromExt) を流用、 ただし tier params
を読むよう変更。

## 2. ゴール

### 2.1 データスキーマ v2

- `data/extensions.json` を version 2 に。 17 系列の entry。
- 各 entry のフィールド:
  - `extId` (= 1〜17 の連番、 内部識別、 既存 MCH ID とは別)
  - `category` (= "weapon" or "buff")
  - `series` (= 系列名キー、 i18n key の suffix にも使う)
  - `archetype` (= weapon: "homing"/"radial"/"orbit"/... のいずれか。 SPEC-011 では全部 "homing" に固定。 SPEC-012 で系列別に分岐。 buff: "hpMaxUp"/"regen"/"speedUp"/"cdDown"/"dmgTakenDown"/"dmgUp"/"bulletCount" のいずれか)
  - `iconId` (= MCH ext 図鑑の URL に使う ID、 全 tier 共通で 1 つ。 後続 SPEC で per-tier 化検討)
  - `seriesColor` (= 系列カラー、 既存 SERIES_COLOR map にあるなら参照)
  - `tierNames[]` (= 5 個、 各 `{ja, en}`)
  - `skillName` (= series 全体で共通の `{ja, en}` 1 件)
  - `skillDescTpl` (= `{ja, en}` テンプレ、 `{...}` プレースホルダで params を展開)
  - `tierParams[]` (= 5 個、 archetype に応じた数値: weapon なら `{dmg, cdMs, range, speedPx, ...}` 、 buff なら `{magnitude}` 等)

### 2.2 EXT_ROSTER / Level up UI

- `EXT_ROSTER` は新スキーマを返す (= ローダ更新)
- Level up モーダルカードは:
  - icon (= `extImg(iconId)`)
  - 系列バー (= seriesColor)
  - **tier 名** (= `tierNames[level-1]` を表示。 ピック時は `tierNames[nextLevel-1]`)
  - **スキル名** (= `skillName`)
  - **効果説明** (= `skillDescTpl` を `tierParams[nextLevel-1]` で fill)
  - Lv ラベル (= 既存 `Lv.{cur} → Lv.{next}` or NEW)
- Common (= `tierNames[0]`) は NEW pick の場合にのみ表示、 既所持 lv up は次 tier の名前

### 2.3 武器系列 (= 一旦単一 homing 維持)

- `js/battle/extensions-as-weapons.js` の `weaponFromExt` を tier-aware に
  - tierParams から dmg / cdMs / range / speedPx / projColor を読む
  - color は seriesColor を使う
- 全武器系列は SPEC-011 では `archetype: "homing"` 扱い (= 既存挙動)
- 武器系列の系列ごとの挙動分岐は SPEC-012

### 2.4 強化系列 (= 7 系列の効果実装)

| 系列 | archetype | 効果 |
|---|---|---|
| Armor | hpMaxUp | tier ごとに +20/+40/+70/+110/+160 (= 累積で statsMax.hp、 現在 hp も同量回復) |
| Ramen | regen | tier ごとに +0.3/+0.6/+1.0/+1.5/+2.0 hp/sec (= 累積で regenPerSec) |
| Boots | speedUp | tier ごとに ×1.05/×1.10/×1.16/×1.23/×1.32 (= 累積、 player.speed に乗算) |
| Horse | cdDown | tier ごとに ×0.95/×0.90/×0.84/×0.78/×0.72 (= 累積、 weapon.cdMs に乗算 = 短縮) |
| Shield | dmgTakenDown | tier ごとに -8%/-15%/-22%/-30%/-40% (= 累積で dmgTakenMul、 enemy.dmg 適用前に乗算) |
| Apple | dmgUp | tier ごとに ×1.10/×1.20/×1.32/×1.46/×1.60 (= 累積、 weapon.dmg に乗算) |
| Oriflamme | bulletCount | tier ごとに +0/+1/+1/+2/+3 (= 累積で bulletCountBonus、 SPEC-012 で archetype が活用) |

`累積` の意味: ピックは下位 tier から順に上がる。 例えば Boots Lv.3 にすると ×1.05 × 1.10 × 1.16 = ×1.34 ではなく、 単純に Lv.3 の値 ×1.16 を採用 (= 段階的に強くなる)。 つまり tier 値 = その時点の **絶対値**。

- `state.buffs = { hpMaxBonus, regenPerSec, speedMul, cdMul, dmgTakenMul, dmgMul, bulletCountBonus }`
- Buff pick 適用時に該当 field を tier 値で **上書き** (= 1 系列 1 値を更新)
- 武器側は読み取り時に buff を反映:
  - `tickPlayer` の speed: `player.speed * state.buffs.speedMul`
  - `tickWeapons` の effective cdMs: `weapon.cdMs * state.buffs.cdMul`
  - `tickWeapons` の effective dmg: `weapon.dmg * state.buffs.dmgMul`
  - `tickEnemies` の被ダメ: `enemy.dmg * state.buffs.dmgTakenMul`
- regen tick: `tickRegen(dt)` を毎フレーム呼び `state.stats.hp += regenPerSec * dt`、 cap 到達で停止

### 2.5 buff の即時効果

- HP max up: pick 時に `state.statsMax.hp += delta` (= delta は前 tier との差)、 同じ delta だけ `state.stats.hp` も足す (= 全回復ではなく増加分のみ)

## 3. 非ゴール

- 武器系列の固有挙動 (= radial / orbit / laser / placement) (= SPEC-012)
- 武器スロット数の制限 (= 既存と同じく無制限、 後続検討)
- 強化系列のスロット制限 (= 同上)
- 多言語のスキル説明テンプレに語順差異対応 (= プレースホルダ順は ja/en 同一とする、 必要なら個別 string)
- icon を tier ごとに変更 (= 全 tier 共通 iconId、 後続検討)
- ヒーロー固有のスタート武器 (= 全ヒーロー同じ pick から)
- ステージごとの差異
- save / load の `state.buffs` 永続化

## 4. ユーザー体験

1. 戦闘開始 → starter pick で **17 系列の中から 3 候補** (= 武器も強化も混在)
2. カードに icon + 系列バー + tier 名 (= "リボルバー") + スキル名 (= "弾幕") + 効果テキスト (= "敵がいる方向に放射状に弾を放つ。 弾数 3 / DMG 8 / CD 1.3秒") + NEW
3. ピック → 武器なら自動発射開始 (= SPEC-011 では引き続き homing だが効果テキストの数値が反映)、 強化なら buff が即時適用 (= HP max が増える / 移動が速くなる 等)
4. Level up → 既所持の系列が出ると 「リボルバー → ガンスリンガー」 のような昇格表示
5. ピック → 名前 / スキル名 / アイコンが新 tier に更新、 性能上昇
6. 5 回 lv up = Legendary tier 到達、 候補から外れる

## 5. 技術設計

### 5.1 data/extensions.json v2 (= 概形)

```json
{
  "version": 2,
  "source": "MyCryptoSurvivor SPEC-011",
  "extensions": [
    {
      "extId": 1, "category": "weapon", "series": "Revolver",
      "archetype": "homing",
      "iconId": 1002, "seriesColor": "#56ccf2",
      "tierNames": [
        { "ja": "リボルバー", "en": "Revolver" },
        { "ja": "ガンスリンガー", "en": "Gunslinger" },
        { "ja": "デュアルリボルバー", "en": "Dual Revolver" },
        { "ja": "サイキックリボルバー", "en": "Psyche Revolver" },
        { "ja": "ガトリングガン", "en": "Gatling Gun" }
      ],
      "skillName": { "ja": "弾幕", "en": "Barrage" },
      "skillDescTpl": {
        "ja": "敵がいる方向に放射状に弾を放つ。 弾数 {bullets} / DMG {dmg} / CD {cd}秒",
        "en": "Radial spray toward enemies. Bullets {bullets} / DMG {dmg} / CD {cd}s"
      },
      "tierParams": [
        { "bullets": 3, "dmg": 8,  "cdMs": 1300, "range": 320, "speedPx": 280 },
        { "bullets": 4, "dmg": 11, "cdMs": 1200, "range": 340, "speedPx": 300 },
        { "bullets": 5, "dmg": 14, "cdMs": 1100, "range": 360, "speedPx": 320 },
        { "bullets": 6, "dmg": 18, "cdMs": 1000, "range": 380, "speedPx": 340 },
        { "bullets": 8, "dmg": 23, "cdMs": 900,  "range": 400, "speedPx": 360 }
      ]
    },
    /* ... 残り 16 系列 ... */
  ]
}
```

(= 全 17 entry を本 SPEC で書く。 Buff entry の例:)

```json
{
  "extId": 11, "category": "buff", "series": "Armor",
  "archetype": "hpMaxUp",
  "iconId": 1004, "seriesColor": "#aaaaaa",
  "tierNames": [...],
  "skillName": { "ja": "鋼の体", "en": "Iron Body" },
  "skillDescTpl": {
    "ja": "最大 HP +{magnitude}",
    "en": "Max HP +{magnitude}"
  },
  "tierParams": [
    { "magnitude": 20  },
    { "magnitude": 40  },
    { "magnitude": 70  },
    { "magnitude": 110 },
    { "magnitude": 160 }
  ]
}
```

### 5.2 extensions.js loader 更新

- 既存 `EXT_ROSTER` / `EXT_DEFS` をそのまま v2 構造で埋める
- 新ヘルパ:
  - `getTierName(ext, level, lang)` (= `ext.tierNames[level-1]` を localize)
  - `getSkillDesc(ext, level, lang)` (= `ext.skillDescTpl` を `ext.tierParams[level-1]` で fill。 cdMs は `cd` (秒、 1 桁) に変換)
  - `getCategory(ext)` (= "weapon" or "buff")
- `localizedExtName(ext, lang)` は **後方互換**: 引数 ext が新 / 旧どちらでも動くよう内部分岐

### 5.3 levelup.js UI 改修

```js
const tierName = getTierName(opt.ext, opt.nextLevel, lang);   // ← 名前
const skillName = ... // ext.skillName
const skillDesc = getSkillDesc(opt.ext, opt.nextLevel, lang); // ← 効果テキスト
```

カード DOM:
- icon (= `extImg(opt.ext.iconId)`)
- 系列バー (= `opt.ext.seriesColor`)
- tier 名 (large)
- スキル名 (small accent)
- スキル説明 (small muted)
- Lv ラベル

### 5.4 weapon spec 派生 (= extensions-as-weapons.js)

```js
export function weaponFromExt(extId, level) {
  const ext = getExt(extId);
  if (!ext || ext.category !== "weapon") return null;
  const lv = Math.max(1, Math.min(EXT_MAX_LEVEL, level));
  const params = ext.tierParams[lv - 1];
  return {
    extId, level: lv,
    archetype: ext.archetype,
    dmg:     params.dmg,
    cdMs:    params.cdMs,
    range:   params.range,
    speedPx: params.speedPx,
    bullets: params.bullets ?? 1,
    color:   ext.seriesColor,
    lastFireMs: 0,
  };
}
```

### 5.5 buff 適用 (= js/battle/buffs.js 新規)

```js
import { state } from "../state.js";
import { getExt } from "../extensions.js";

export function applyBuff(extId, level) {
  const ext = getExt(extId);
  if (!ext || ext.category !== "buff") return;
  const params = ext.tierParams[level - 1];
  const m = params.magnitude;
  const buffs = state.buffs;
  const before = _snapshot(ext.archetype);
  switch (ext.archetype) {
    case "hpMaxUp": {
      const delta = m - before;
      buffs.hpMaxBonus = m;
      state.statsMax.hp = STATS_INITIAL_HP + m;
      state.stats.hp    = Math.min(state.statsMax.hp, state.stats.hp + delta);
      break;
    }
    case "regen":         buffs.regenPerSec     = m; break;
    case "speedUp":       buffs.speedMul        = m; break;
    case "cdDown":        buffs.cdMul           = m; break;
    case "dmgTakenDown":  buffs.dmgTakenMul     = m; break;
    case "dmgUp":         buffs.dmgMul          = m; break;
    case "bulletCount":   buffs.bulletCountBonus = m; break;
  }
}

function _snapshot(arch) {
  const b = state.buffs;
  switch (arch) {
    case "hpMaxUp":      return b.hpMaxBonus;
    case "regen":        return b.regenPerSec;
    case "speedUp":      return b.speedMul;
    case "cdDown":       return b.cdMul;
    case "dmgTakenDown": return b.dmgTakenMul;
    case "dmgUp":        return b.dmgMul;
    case "bulletCount":  return b.bulletCountBonus;
  }
  return 0;
}

export function tickRegen(dt) {
  const r = state.buffs.regenPerSec;
  if (r <= 0) return;
  state.stats.hp = Math.min(state.statsMax.hp, state.stats.hp + r * dt);
}
```

### 5.6 buffs 反映タイミング

- player speed: `tickPlayer(dt, v)` 内で `p.speed * (state.buffs.speedMul ?? 1)`
- weapon cd: `tickWeapons` 内で `effectiveCd = w.cdMs * (state.buffs.cdMul ?? 1)`
- weapon dmg: 投射体 spawn 時に `dmg * (state.buffs.dmgMul ?? 1)` を payload に
- enemy dmg: `tickEnemies` 接触時 `e.dmg * (state.buffs.dmgTakenMul ?? 1)`
- regen: RAF ループに `tickRegen(dt)` 追加

### 5.7 levelup.js applyPick 改修

```js
export function applyPick(extId) {
  const ext = getExt(extId);
  const owned = state.ownedExtensions.find(o => String(o.extId) === String(extId));
  const next = owned ? Math.min(EXT_MAX_LEVEL, owned.level + 1) : 1;
  if (owned) owned.level = next;
  else       state.ownedExtensions.push({ extId, level: next });

  if (ext?.category === "buff") {
    applyBuff(extId, next);
  } else {
    rebuildWeaponsFromOwned();   // weapon の場合のみ
  }
  _close();
}
```

### 5.8 startBattle reset

```js
state.buffs = {
  hpMaxBonus: 0,
  regenPerSec: 0,
  speedMul: 1,
  cdMul: 1,
  dmgTakenMul: 1,
  dmgMul: 1,
  bulletCountBonus: 0,
};
```

### 5.9 i18n 追加

- buff の `magnitude` を整形する helper (= 整数 → そのまま、 1.0 以下の倍率 → 「-{n}%」 / 1.0 以上 → 「+{n}%」 等は skillDescTpl に直接記述)
- データ JSON 内の {ja,en} で完結、 ui.json には触らない (= 系列固有スキル名は i18n 外)

### 5.10 17 系列の概要 (= 一覧)

#### 武器 10 系列

| extId | series | archetype | スキル名(ja) | テンプレ ja |
|---|---|---|---|---|
| 1 | Revolver | radial (= SPEC-011 では homing) | 弾幕 | 敵方向に放射状。 弾数 {bullets} / DMG {dmg} / CD {cd}秒 |
| 2 | Book | orbit | 守護書 | 自分を周回。 数 {bullets} / DMG {dmg} |
| 3 | Panjandrum | bigHoming | 突進輪 | 巨大な追尾弾。 DMG {dmg} / 数 {bullets} / CD {cd}秒 |
| 4 | Moai | dropTarget | 落石 | ランダム敵頭上に落下。 数 {bullets} / DMG {dmg} / CD {cd}秒 |
| 5 | Shuriken | stack | 連手裏剣 | 最寄り方向に 3 連 × {dirs} 方向。 DMG {dmg} / CD {cd}秒 |
| 6 | LaserGun | beam | レーザー | 直線貫通レーザー。 DMG {dmg} / CD {cd}秒 |
| 7 | Knife | diagonal | 四方刃 | 対角 4 方向。 数 {bullets} / DMG {dmg} / CD {cd}秒 |
| 8 | Axe | randomRadial | 投擲 | ランダム方向に放射。 弾数 {bullets} / DMG {dmg} / CD {cd}秒 |
| 9 | Pierrot | placeBomb | 爆弾配置 | 現在地に置いて遅延爆発。 数 {bullets} / DMG {dmg} / CD {cd}秒 |
| 10 | Blade | orbitClose | 高速回転刃 | 自分を近距離周回。 数 {bullets} / DMG {dmg} |

(= archetype は SPEC-011 ではまだ全部 "homing" 扱いだが、 schema に書いておくことで SPEC-012 が即座に分岐できる)

#### 強化 7 系列

| extId | series | archetype | スキル名(ja) | テンプレ ja |
|---|---|---|---|---|
| 11 | Armor | hpMaxUp | 鋼の体 | 最大 HP +{magnitude} |
| 12 | Ramen | regen | 滋養 | HP 毎秒 +{magnitude} |
| 13 | Boots | speedUp | 韋駄天 | 移動速度 ×{magnitude} |
| 14 | Horse | cdDown | 加速 | 攻撃間隔 ×{magnitude} |
| 15 | Shield | dmgTakenDown | 鉄壁 | 被ダメ ×{magnitude} |
| 16 | Apple | dmgUp | 力の杏 | 威力 ×{magnitude} |
| 17 | Oriflamme | bulletCount | 旗印 | 弾数 +{magnitude} |

## 6. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | data/extensions.json v2 全 17 entry / extensions.js loader / extensions-as-weapons.js / battle/buffs.js / levelup.js UI / state.buffs / RAF ループ buffs 反映 + tickRegen |

## 7. 受入基準

- [ ] 戦闘開始時 starter pick に 武器 + 強化が混在した 3 候補が出る
- [ ] 候補カードに tier 名 + スキル名 + 効果説明 (= テンプレに数値が埋まる) + アイコンが表示
- [ ] 強化 (= Armor) を pick → HUD の HP / HP max が増える、 戦闘続行可
- [ ] 強化 (= Ramen) を pick → HP が毎秒回復する (= 視認可能、 1 sec で +n)
- [ ] 強化 (= Boots) を pick → player の移動が速くなる (= 視認可能)
- [ ] 強化 (= Horse) を pick → 武器発射の cd が短くなる
- [ ] 強化 (= Shield) を pick → 敵接触時のダメージが減る
- [ ] 強化 (= Apple) を pick → 武器ダメージが増える
- [ ] 強化 (= Oriflamme) を pick → state.buffs.bulletCountBonus が増える (= 数値で確認、 SPEC-012 で archetype が利用)
- [ ] 既所持の Lv up で **次 tier の名前** に切替 (= "リボルバー" → "ガンスリンガー")
- [ ] Legendary 到達後はその系列が候補に出ない
- [ ] data/extensions.json が version=2 で 17 entry
- [ ] DevTools console エラー無し
- [ ] JP/EN 切替で tier 名 / スキル名 / 効果説明が追従

## 8. リスク・懸念

- **データ JSON が巨大になる** (= 17 系列 × 5 tier 名 × 2 言語 + skill desc tpl × 2 言語 = 200+ 翻訳エントリ) → 1 ファイルに収め、 Phase 1 commit のみ大きい
- **buff の累積上限** — 各系列の Lv 5 で打ち切り、 candidate 排除の既存ロジックがそのまま効く
- **tier 値が前 tier 値より大きい必要** — Boots/Apple のような乗算 buff は monotonic、 Horse/Shield は逆方向だが昇順絶対値で処理
- **スピードアップで joystick との相性** — speed * 1.32 でも操作感は崩れない、 想定内
- **RegEx 不要** — テンプレは `{key}` プレースホルダのみ、 既存 `tpl()` 流用
- **iconId が tier で同じ** → 視覚的に違いを出すのは tier 名の文字列のみ。 「ガトリングガン」 と 「リボルバー」 でアイコンが同じだとちょっと寂しいが許容範囲、 別 SPEC で対応
- **archetype フィールドだけ書いて挙動は SPEC-012** で実装 → SPEC-011 マージだけで挙動が変わらない、 ユーザー体験は 「強化が効く」 「名前が変わる」 「ホーミング弾が引き続き飛ぶ」

## 9. 参考

- 既存 `js/battle/extensions-as-weapons.js` (= weaponFromExt v1)
- 既存 `js/battle/levelup.js` (= モーダル制御)
- 既存 `js/extensions.js` (= EXT_ROSTER ローダ)
- ユーザーが提示した 17 系列の概要 (= 武器 10 / 強化 7)
- VS の strength curve (= Lv up 5 段階で大きく変わる)
