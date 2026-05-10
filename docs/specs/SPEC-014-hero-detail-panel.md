---
id: SPEC-014
title: Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation
status: Done
pr: 16
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-014 — Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-013 (= hero ↔ starter weapon mapping)

## 1. 背景 / 課題

ユーザー指摘:
- 「ヒーローごとの性能の違いが分からないので明示したい」
- 「移動速度や HP に差があるのか、 エクステンションが違うのかが分からない」
- 「どのヒーローにどのエクステンションが割り当てられているか分かるようにしたい」
- 「ヒーロー選択時に詳細画面が画面上部に表示され、 ヒーローの情報＋エクステンションの情報を表示してほしい」

現状: ヒーロー選択モーダルにグリッドのみで、 性能差は **存在しない** (= 全員 HP 100 / 速度 180)。 担当 extension は 「starter pick で 1 つ pick」 されていたが、 SPEC-013 で固定割当に変更したのに UI に表示が出ていない。

## 2. ゴール

### 2.1 性能差の導入

- ヒーローの **HP 上限** を hero.stats.hp から派生
- ヒーローの **移動速度** を hero.stats.agi から派生
- 全 10 ヒーローで HP / 速度に視認可能な差が出る

### 2.2 詳細パネル

- ヒーロー選択モーダルのグリッド **上部** に詳細パネルを設置
- 表示内容:
  - ヒーローのポートレート (= 大きめ)
  - 名前 (= localized)
  - 派閥 (= emoji + label)
  - レアリティ
  - ステータス: HP / 移動速度 (= 数値)
  - **担当 starter extension**: アイコン + tier 名 + スキル名 + 効果テキスト (Lv.1)
- 未選択時: 案内文 (= 「ヒーローを選んでください」)
- 言語切替で全テキスト追従

## 3. 非ゴール

- starter extension の変更 UI (= SPEC-013 で固定、 別 SPEC で変動可能化検討)
- 派閥アイコンの大型化 / 派閥効果
- ヒーロー個別のスキル / アビリティ (= 別 SPEC、 hero unique skill 検討余地)
- battle 中の HP 上限変動 (= hero stats を battle ステータスに反映するのは startBattle の 1 回限り)

## 4. 技術設計

### 4.1 性能式

```js
// constants.js (= 追加)
export const HERO_HP_BASE      = 80;    // 基礎 HP
export const HERO_HP_PER_STAT  = 0.20;  // hero.stats.hp の 20% を加算
export const HERO_SPEED_BASE   = 140;   // 基礎速度
export const HERO_SPEED_PER_AGI = 0.6;  // hero.stats.agi の 60% を加算
```

派生公式:
- `maxHp(hero) = HERO_HP_BASE + round(hero.stats.hp * HERO_HP_PER_STAT)`
- `speed(hero) = HERO_SPEED_BASE + round(hero.stats.agi * HERO_SPEED_PER_AGI)`

10 ヒーローのおおよその HP / 速度 (= heroes.json v2 の MCH stats から):

| heroId | name | stats.hp | stats.agi | maxHp | speed |
|---|---|---|---|---|---|
| 1001 | コナン・ドイル | 99 | 145 | 100 | 227 |
| 1002 | 甲斐姫 | 167 | 47 | 113 | 168 |
| 1004 | シートン | 96 | 63 | 99 | 178 |
| 1006 | ピタゴラス | 73 | 80 | 95 | 188 |
| 2001 | ライト兄弟 | 99 | 174 | 100 | 244 |
| 2002 | スパルタクス | 232 | 35 | 126 | 161 |
| 2005 | グリム兄弟 | 154 | 41 | 111 | 165 |
| 2011 | 孫子 | 109 | 91 | 102 | 195 |
| 2012 | 石田三成 | 99 | 119 | 100 | 211 |
| 2013 | 許褚 | 240 | 63 | 128 | 178 |

(= 値はあくまで参考、 実際の heroes.json と整合する)

### 4.2 startBattle で反映

```js
// battle/index.js startBattle
const maxHp = HERO_HP_BASE + Math.round((hero?.stats?.hp ?? 0) * HERO_HP_PER_STAT);
const spd   = HERO_SPEED_BASE + Math.round((hero?.stats?.agi ?? 0) * HERO_SPEED_PER_AGI);
state.statsMax.hp  = maxHp;
state.stats.hp     = maxHp;
b.player.speed     = spd;   // SPEC-013 では PLAYER_SPEED_PX_S 固定だった所を hero 別に
```

(= STATS_INITIAL.hp / STATS_MAX.hp 定数の参照を hero 由来に置換)

### 4.3 詳細パネル DOM

```html
<div id="heroSelectModal" ...>
  <div class="hero-modal__card">
    <header class="hero-modal__head">...</header>

    <!-- SPEC-014: 詳細パネル (= 上部、 選択中ヒーローを表示) -->
    <div class="hero-detail" id="heroDetail">
      <div class="hero-detail__placeholder" id="heroDetailPlaceholder"
           data-i18n="hero.detail.placeholder">ヒーローを選んでください</div>
      <div class="hero-detail__content hidden" id="heroDetailContent">
        <img class="hero-detail__portrait" id="heroDetailPortrait" alt="" />
        <div class="hero-detail__info">
          <div class="hero-detail__name" id="heroDetailName"></div>
          <div class="hero-detail__sub" id="heroDetailSub"></div>
          <div class="hero-detail__stats">
            <span class="hero-detail__stat" id="heroDetailHp"></span>
            <span class="hero-detail__stat" id="heroDetailSpeed"></span>
          </div>
        </div>
        <div class="hero-detail__weapon">
          <img class="hero-detail__weapon-icon" id="heroDetailWeaponIcon" alt="" />
          <div class="hero-detail__weapon-info">
            <div class="hero-detail__weapon-label"
                 data-i18n="hero.detail.starterWeapon">開始武器</div>
            <div class="hero-detail__weapon-name"  id="heroDetailWeaponName"></div>
            <div class="hero-detail__weapon-skill" id="heroDetailWeaponSkill"></div>
            <div class="hero-detail__weapon-desc"  id="heroDetailWeaponDesc"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-modal__grid" id="heroSelectGrid"></div>
    ...
  </div>
</div>
```

### 4.4 JS 改修 (= main.js)

- `pickHero(heroId)` の最後に `renderHeroDetail(heroId)` 追加
- `renderHeroDetail(heroId)`: hero 取得 → DOM に portrait/name/faction/rarity/HP/speed 設定 + assigned extension の icon/tierName/skillName/skillDesc 設定
- `openHeroSelectModal()` で placeholder 表示、 content hidden 状態に
- `onLangChange` ハンドラに hero detail 再レンダ追加

```js
function renderHeroDetail(heroId) {
  const hero = getHero(heroId);
  const placeholder = $("#heroDetailPlaceholder");
  const content     = $("#heroDetailContent");
  if (!hero) {
    placeholder?.classList.remove("hidden");
    content?.classList.add("hidden");
    return;
  }
  placeholder?.classList.add("hidden");
  content?.classList.remove("hidden");

  const lang = getLang();
  const name        = localizedHeroName(hero, lang);
  const factionLab  = t(`hero.faction.${hero.faction}`, hero.faction);
  const rarityLab   = t(`hero.rarity.${hero.rarity}`,   hero.rarity);

  $("#heroDetailPortrait").src = heroImg(hero.heroId);
  $("#heroDetailPortrait").alt = name;
  $("#heroDetailName").textContent = name;
  $("#heroDetailSub").textContent  = `${factionEmoji(hero.faction)} ${factionLab} · ${rarityLab}`;

  const maxHp = HERO_HP_BASE + Math.round((hero.stats?.hp ?? 0) * HERO_HP_PER_STAT);
  const spd   = HERO_SPEED_BASE + Math.round((hero.stats?.agi ?? 0) * HERO_SPEED_PER_AGI);
  $("#heroDetailHp").textContent    = tpl(t("hero.detail.hp", "HP {n}"),       { n: String(maxHp) });
  $("#heroDetailSpeed").textContent = tpl(t("hero.detail.speed", "Speed {n}"), { n: String(spd) });

  // 担当 starter weapon
  const wId = HERO_STARTING_WEAPON[hero.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
  const ext = getExt(wId);
  if (ext) {
    $("#heroDetailWeaponIcon").src = extImg(ext);
    $("#heroDetailWeaponIcon").alt = getTierName(ext, 1, lang);
    $("#heroDetailWeaponName").textContent  = getTierName(ext, 1, lang);
    $("#heroDetailWeaponSkill").textContent = getSkillName(ext, lang);
    $("#heroDetailWeaponDesc").textContent  = getSkillDesc(ext, 1, lang);
  }
}
```

### 4.5 i18n

```json
"hero.detail.placeholder":   { "ja": "ヒーローを選んでください", "en": "Pick a hero" },
"hero.detail.hp":            { "ja": "HP {n}",                  "en": "HP {n}" },
"hero.detail.speed":         { "ja": "速度 {n}",                "en": "Speed {n}" },
"hero.detail.starterWeapon": { "ja": "開始武器",                 "en": "Starter Weapon" }
```

### 4.6 CSS

`.hero-detail`:
- background gradient + border accent
- grid layout: portrait (left) / hero info (center) / weapon (right)
- mobile では縦並び

```css
.hero-detail {
  background: linear-gradient(180deg, rgba(196,163,90,0.10), rgba(0,0,0,0.0));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem;
  min-height: 96px;
}
.hero-detail__placeholder {
  text-align: center;
  color: var(--muted);
  padding: 1.6rem 0;
  font-size: 0.85rem;
}
.hero-detail__placeholder.hidden,
.hero-detail__content.hidden { display: none !important; }
.hero-detail__content {
  display: grid;
  grid-template-columns: 64px 1fr 1fr;
  gap: 0.6rem;
  align-items: center;
}
.hero-detail__portrait {
  width: 64px; height: 64px;
  object-fit: cover;
  border-radius: 6px;
  border: 1.5px solid var(--accent);
  background: var(--panel);
}
.hero-detail__info { min-width: 0; }
.hero-detail__name { font-weight: 800; font-size: 0.95rem; }
.hero-detail__sub  { font-size: 0.72rem; color: var(--muted); margin-top: 0.1rem; }
.hero-detail__stats {
  display: flex; gap: 0.6rem; margin-top: 0.25rem;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
}
.hero-detail__weapon {
  display: grid; grid-template-columns: 40px 1fr; gap: 0.4rem;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem;
}
.hero-detail__weapon-icon {
  width: 40px; height: 40px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--panel);
}
.hero-detail__weapon-label { font-size: 0.62rem; color: var(--muted); letter-spacing: 0.04em; }
.hero-detail__weapon-name  { font-weight: 700; font-size: 0.78rem; line-height: 1.1; }
.hero-detail__weapon-skill { font-size: 0.7rem;  color: var(--accent); margin-top: 0.05rem; }
.hero-detail__weapon-desc  { font-size: 0.62rem; color: var(--text); opacity: 0.8; margin-top: 0.1rem; line-height: 1.2; }

@media (max-width: 480px) {
  .hero-detail__content { grid-template-columns: 56px 1fr; gap: 0.4rem; }
  .hero-detail__weapon  { grid-column: 1 / -1; }
}
```

## 5. 受入基準

- [ ] ヒーロー選択モーダルを開くと placeholder (= 「ヒーローを選んでください」) 表示
- [ ] タイル click → 詳細パネルに当該ヒーローの portrait / 名前 / 派閥 / レアリティ / HP / 速度 が表示
- [ ] 詳細パネル右に **担当 extension** の icon / 名前 / スキル名 / 効果テキスト (Lv.1) が表示
- [ ] 別ヒーロー click で詳細が切替
- [ ] JP/EN 切替で詳細パネル全テキストが即時切替
- [ ] 戦闘開始時の HP 上限 / 移動速度がヒーローごとに異なる (= DevTools `__state.statsMax.hp` / `__state.battle.player.speed` で確認)
- [ ] mobile 縦画面 (375px) で詳細パネル全要素が読める / 操作可
- [ ] DevTools console エラー無し

## 6. リスク

- **既存 modal レイアウトの圧迫** — 詳細パネルが追加で縦に長くなる、 5 列タイルのサイズが小さくなる可能性 → 既存 max-height: 90vh + overflow-y: auto で対応
- **hero.stats が無いヒーロー** (= 旧データ) → fallback で base 値のみ
- **HERO_STARTING_WEAPON に無い heroId** → SPEC-013 同様 fallback (= Revolver)
- **画像 404** → 既存 onerror handler で gradient placeholder

## 7. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants HERO_HP_BASE 等 / battle/index.js startBattle 改修 / index.html DOM / main.js renderHeroDetail / i18n / CSS |

## 8. 参考

- 既存 `js/main.js` `setupHeroSelectModal` / `pickHero` / `renderHeroSelectModal`
- 既存 `js/heroes.js` `localizedHeroName` / `heroImg` / `factionEmoji`
- 既存 `js/extensions.js` `getTierName` / `getSkillName` / `getSkillDesc` / `extImg`
- SPEC-013 `HERO_STARTING_WEAPON` map
