---
id: SPEC-008
title: Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化)
status: Implementing
pr: 9
phase: Phase 0 / Phase 1
kind: Added
---

# SPEC-008 — Extensions as Weapons + Level-Up Picker Modal

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-007 (= 仮 shockwave 武器、 stack 上)

## 1. 背景 / 課題

ユーザー指示で **「スキルはエクステンションで置き換え」** が確定。
SPEC-007 の hardcoded shockwave を撤去し、 EXT_ROSTER (= MCH 由来 extension 図鑑) を武器として使う。
さらに VS の核心である **Level up 時の 3 択ピック** モーダルを導入。

## 2. ゴール

- 仮 shockwave 武器を完全撤去 (= state.battle.weapons の hardcode を消す)
- `state.ownedExtensions = []` 導入 (= `[{extId, level}]`、 startBattle で reset)
- battle.weapons は `state.ownedExtensions` から derive (= pick / level up のたびに同期)
- 各 extension は **自動発射の単発ホーミング投射体** (= 最寄り敵を狙う) として機能
- 投射体は entity (= state.battle.projectiles) として追加、 速度 / ダメージ / 寿命を持つ
- weapon 性能は ext.stats から導出 (= dmg / cooldown / range / projSpeed)
- 武器のレベル up で性能上昇 (= dmg +20% / cdMs -100ms per level、 上限 lv 5)
- **Level up モーダル**: 既存 hero modal と同形のレイヤー、 3 枚のカードを表示、 1 枚クリックで適用
- ピック候補: 未所持 extension (= 残数あれば優先 1 枚) + 既所持 extension (= lv < MAX_LEVEL のもの) を mix し random 3 sample
- 利用可能 < 3 なら表示数を減らす
- 起動時の **starter pick**: startBattle 末尾で 1 度だけ自動的にモーダルを開く (= 最初の武器を選ばせる)
- pick 確定 → state 更新 → モーダル閉じる → battle 再開 (= pauseFlags 不変条件維持)
- ja/en ラベル
- 描画: 投射体は extension 系列ごとに簡易な色分け (= weapon.color)

## 3. 非ゴール

- Passive extension (= Armor / Horse / Goblet 等の stat 補正) — 武器化のみで一旦ユニフォーム
- 武器の系列固有挙動 (= Quill のバウンド、 Bull のチャージ、 等) — 全部単発ホーミング投射体に揃える
- 武器スロット数の制限 (= 無制限、 VS 本家は 6 だが Phase 1 では制限なし)
- 装備差し替え (= 一度取った extension は外せない)
- ranking 送信、 Game Over (= SPEC-009)
- ヒーロー固有のスタート武器 (= 全ヒーロー同じ pick から)
- アイコン / 図鑑画像 (= 文字 + 系列カラーで mock)

## 4. ユーザー体験

1. hero pick → 「冒険を始める」 → battle 開始直後 **starter pick モーダル**
2. 3 枚の extension カード (= 名前 + 系列 + 色帯) → 1 枚クリック
3. モーダル閉じる → 武器が自動発射開始 (= 最寄り敵に色付き弾が飛ぶ)
4. しばらくプレイ → XP gem 拾って Level up → 自動的にモーダル再オープン
5. 3 枚の中に **既所持の extension** が混じっていれば 「Lv.1 → Lv.2」 と表示
6. ピック → 該当 extension の weapon が強化される or 新 weapon が増える
7. 武器が増えるほど投射体の本数が増え、 画面が VS らしくなっていく

## 5. 技術設計

### 5.1 state 変更

```js
// state.js (= 追記)
state.ownedExtensions = [];   // [{extId, level}]
state.pendingPickOptions = []; // モーダル表示中の 3 候補 [{extId, currentLevel, nextLevel, isNew}]
state.pendingPickIsStarter = false; // starter pick かどうか (= UX hint)

state.battle.projectiles = []; // {id, x, y, vx, vy, r, dmg, color, life, age, ttlPenetration}
```

`state.battle.weapons` は引き続き `[{extId, level, dmg, cdMs, range, speedPx, color, lastFireMs}]` だが、 `kind: "shockwave"` は撤去、 全要素が `kind: "projectile"` (= 暗黙、 record しない)。

### 5.2 constants 追加

```js
// constants.js
export const EXT_MAX_LEVEL          = 5;
export const PROJECTILE_LIFE_MS     = 1500;
export const PROJECTILE_RADIUS      = 5;
export const PROJECTILE_DEFAULT_COLOR = "#ffffff";
export const PICK_OPTIONS_COUNT     = 3;

export const SERIES_COLOR = {           // extension 系列の色
  Blade:  "#d4d4dc",  Musket: "#56ccf2",
  Quill:  "#bb86fc",  Armor:  "#aaaaaa",
  Horse:  "#f0c14b",  Axe:    "#e76060",
  Dragon: "#ff7a59",  Bull:   "#5ecf8a",
  Monkey: "#fdcb6e",  Goblet: "#9be7c4",
};
export const SERIES_COLOR_DEFAULT = "#c4a35a";
```

### 5.3 weapon derivation (= extensions-as-weapons.js)

```js
// js/battle/extensions-as-weapons.js
import { getExt } from "../extensions.js";
import { SERIES_COLOR, SERIES_COLOR_DEFAULT, EXT_MAX_LEVEL } from "../constants.js";

/**
 * extension を 1 つの weapon spec に変換 (= 自動発射ホーミング投射体)
 */
export function weaponFromExt(extId, level) {
  const ext = getExt(extId);
  if (!ext) return null;
  const lv  = Math.max(1, Math.min(EXT_MAX_LEVEL, level));
  const stats = ext.stats || {};
  const baseDmg = 8 + (stats.phy ?? 0) * 0.15 + (stats.int ?? 0) * 0.15;
  const dmg     = Math.round(baseDmg * (1 + (lv - 1) * 0.20));
  const cdMs    = Math.max(300, 1500 - (stats.agi ?? 0) * 5 - (lv - 1) * 100);
  const speedPx = 260 + (stats.agi ?? 0) * 1.5;
  const range   = 320;
  const color   = SERIES_COLOR[ext.series] ?? SERIES_COLOR_DEFAULT;
  return { extId, level: lv, dmg, cdMs, speedPx, range, color, lastFireMs: 0 };
}

export function rebuildWeaponsFromOwned() {
  // ownedExtensions → battle.weapons を再生成。 lastFireMs は維持できないが、
  // pick 直後は誤差として許容。
  const owned = state.ownedExtensions;
  const newWeapons = [];
  const oldByExtId = new Map(state.battle.weapons.map(w => [w.extId, w]));
  for (const o of owned) {
    const w = weaponFromExt(o.extId, o.level);
    if (!w) continue;
    const old = oldByExtId.get(o.extId);
    if (old) w.lastFireMs = old.lastFireMs;
    newWeapons.push(w);
  }
  state.battle.weapons = newWeapons;
}
```

(`state` import は省略表記、 実装時に追加)

### 5.4 武器発射 + 投射体 (= weapons.js / projectiles.js)

`weapons.js` を全面改修:

```js
export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  for (const w of b.weapons) {
    if (nowMs - w.lastFireMs < w.cdMs) continue;
    const target = findNearestEnemy(b.player.x, b.player.y, w.range);
    if (!target) continue;
    w.lastFireMs = nowMs;
    spawnProjectile(b.player.x, b.player.y, target, w);
  }
}

function findNearestEnemy(px, py, range) {
  const arr = state.battle.enemies;
  let best = null, bestD2 = range * range;
  for (const e of arr) {
    const dx = e.x - px, dy = e.y - py;
    const d2 = dx*dx + dy*dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

function spawnProjectile(x, y, target, w) {
  const dx = target.x - x, dy = target.y - y;
  const d  = Math.hypot(dx, dy) || 1;
  const speed = w.speedPx;
  state.battle.projectiles.push({
    id: state.battle.nextEntityId++,
    x, y, vx: (dx/d)*speed, vy: (dy/d)*speed,
    r: PROJECTILE_RADIUS, dmg: w.dmg, color: w.color,
    life: PROJECTILE_LIFE_MS, age: 0,
  });
}

export function tickProjectiles(dt) {
  const b = state.battle;
  const dms = dt * 1000;
  for (let i = b.projectiles.length - 1; i >= 0; i--) {
    const p = b.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dms;
    if (p.age >= p.life) { b.projectiles.splice(i, 1); continue; }
    // hit
    let hit = false;
    for (let j = b.enemies.length - 1; j >= 0; j--) {
      const e = b.enemies[j];
      const dx = e.x - p.x, dy = e.y - p.y;
      const sumR = e.r + p.r;
      if (dx*dx + dy*dy <= sumR*sumR) {
        e.hp -= p.dmg;
        if (e.hp <= 0) { spawnGem(e.x, e.y); b.enemies.splice(j, 1); }
        hit = true;
        break;  // pierce なし
      }
    }
    if (hit) b.projectiles.splice(i, 1);
  }
}
```

shockwave 系の `tickShockwaveAnims` / `shockwaveAnims` は **完全削除** (= state.battle と weapons.js / render.js / index.js / constants.js から)。

### 5.5 Level up trigger 改修 (= gems.js)

```js
// gems.js tickGems の level up loop を、 1 回だけ open するよう変更
while (state.xp >= state.xpToNext) {
  state.xp -= state.xpToNext;
  state.level += 1;
  state.xpToNext = Math.ceil(state.xpToNext * XP_TO_NEXT_GROWTH);
  pendingLevelUps += 1;
}
if (pendingLevelUps > 0) {
  triggerLevelUpPick(pendingLevelUps);   // ← new
}
```

`triggerLevelUpPick(n)` は js/battle/levelup.js (新規) で実装:

```js
// js/battle/levelup.js
import { state } from "../state.js";
import { EXT_ROSTER } from "../extensions.js";
import { EXT_MAX_LEVEL, PICK_OPTIONS_COUNT } from "../constants.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { pauseTime, resumeTime } from "../state.js";

let _pendingCount = 0;
let _isOpen = false;
let _isStarter = false;

export function triggerLevelUpPick(n = 1) {
  _pendingCount += n;
  if (!_isOpen) _openNext();
}

export function triggerStarterPick() {
  _isStarter = true;
  _pendingCount += 1;
  if (!_isOpen) _openNext();
}

function _openNext() {
  if (_pendingCount <= 0) { _isStarter = false; return; }
  _pendingCount -= 1;
  _isOpen = true;
  state.pendingPickOptions = _samplePicks(PICK_OPTIONS_COUNT);
  state.pendingPickIsStarter = _isStarter;
  pauseTime();
  renderLevelUpModal();
  document.getElementById("levelUpModal")?.classList.remove("hidden");
}

function _samplePicks(n) {
  const owned = new Map(state.ownedExtensions.map(o => [o.extId, o]));
  const eligible = EXT_ROSTER.filter(e => {
    const o = owned.get(e.extId);
    return !o || o.level < EXT_MAX_LEVEL;
  });
  // shuffle (Fisher-Yates) + slice
  const arr = eligible.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length)).map(e => {
    const o = owned.get(e.extId);
    const cur = o?.level ?? 0;
    return {
      extId: e.extId, ext: e,
      currentLevel: cur, nextLevel: cur + 1,
      isNew: !o,
    };
  });
}

export function applyPick(extId) {
  const owned = state.ownedExtensions.find(o => o.extId === extId);
  if (owned) owned.level = Math.min(EXT_MAX_LEVEL, owned.level + 1);
  else state.ownedExtensions.push({ extId, level: 1 });
  rebuildWeaponsFromOwned();
  closeLevelUpModal();
}

function closeLevelUpModal() {
  document.getElementById("levelUpModal")?.classList.add("hidden");
  state.pendingPickOptions = [];
  state.pendingPickIsStarter = false;
  _isOpen = false;
  _isStarter = false;
  resumeTime();
  // 残ピックがあれば連鎖
  if (_pendingCount > 0) _openNext();
}
```

### 5.6 modal DOM (= index.html)

```html
<div id="levelUpModal" class="levelup-modal hidden" role="dialog" aria-modal="true"
     aria-labelledby="levelUpTitle">
  <div class="levelup-modal__card">
    <h2 class="levelup-modal__title" id="levelUpTitle" data-i18n="levelup.title">
      レベルアップ!
    </h2>
    <p class="levelup-modal__sub" id="levelUpSub" data-i18n="levelup.sub">
      強化を 1 つ選ぼう
    </p>
    <div class="levelup-modal__grid" id="levelUpGrid" role="listbox"></div>
  </div>
</div>
```

### 5.7 modal レンダ (= levelup.js)

```js
function renderLevelUpModal() {
  const grid = document.getElementById("levelUpGrid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const opt of state.pendingPickOptions) {
    const card = document.createElement("button");
    card.className = "levelup-card";
    card.setAttribute("data-ext-id", String(opt.extId));
    card.setAttribute("data-series", opt.ext.series ?? "");
    const name   = localizedExtName(opt.ext, getLang());
    const label  = opt.isNew
                   ? `<span class="levelup-card__lv">NEW</span>`
                   : `<span class="levelup-card__lv">Lv.${opt.currentLevel} → Lv.${opt.nextLevel}</span>`;
    card.innerHTML = `
      <div class="levelup-card__series" style="background:${SERIES_COLOR[opt.ext.series] ?? SERIES_COLOR_DEFAULT}"></div>
      <div class="levelup-card__name">${escapeText(name)}</div>
      <div class="levelup-card__series-label">${escapeText(opt.ext.series ?? "")}</div>
      ${label}
    `;
    card.addEventListener("click", () => applyPick(opt.extId));
    grid.appendChild(card);
  }
}
```

### 5.8 starter pick の起動 (= battle/index.js)

`startBattle` の末尾で:
```js
import { triggerStarterPick } from "./levelup.js";
// ... weapon array reset を空 [] にし、 シャクウェイブ初期化を撤去
b.weapons = [];
state.ownedExtensions = [];
b.projectiles = [];

// すぐ pick モーダルを開く (= 既存 pauseFlags パターン)
triggerStarterPick();
```

### 5.9 i18n 追加

```json
"levelup.title":   { "ja": "レベルアップ!",            "en": "Level Up!" },
"levelup.sub":     { "ja": "強化を 1 つ選ぼう",        "en": "Choose one upgrade" },
"levelup.starter": { "ja": "最初の武器を選ぼう",       "en": "Choose your starting weapon" },
"ext.new":         { "ja": "NEW",                       "en": "NEW" }
```

starter のときは `#levelUpSub` のテキストを `levelup.starter` に切替。

### 5.10 描画拡張 (= render.js)

projectiles を player の前 (= shockwave / gem の後) に挿入:

```js
for (const p of b.projectiles) {
  const sx = p.x - camera.x, sy = p.y - camera.y;
  if (sx < -p.r || sx > w + p.r || sy < -p.r || sy > h + p.r) continue;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
  ctx.fill();
}
```

shockwave 描画は撤去。

### 5.11 RAF ループ改修 (= battle/index.js)

```js
tickEnemies(dt, now);
tickWeapons(dt, now);   // ← projectile spawn のみ
tickProjectiles(dt);    // ← new
tickGems(dt);
// shockwaveAnims tick は撤去
```

## 6. CSS

```css
.levelup-modal {
  position: fixed; inset: 0; z-index: 320;
  background: rgba(15, 12, 22, 0.92);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.levelup-modal.hidden { display: none !important; }

.levelup-modal__card {
  width: 100%; max-width: 560px;
  background: linear-gradient(180deg, #2c2440 0%, var(--panel) 100%);
  border: 2px solid var(--accent);
  border-radius: 14px;
  padding: 1rem 1.1rem;
  display: flex; flex-direction: column;
  gap: 0.8rem;
}

.levelup-modal__title {
  margin: 0;
  text-align: center;
  color: var(--accent);
  font-size: 1.3rem;
  letter-spacing: 0.08em;
}
.levelup-modal__sub {
  margin: 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
}

.levelup-modal__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.levelup-card {
  appearance: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.3rem;
  background: var(--panel-2);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 0.8rem 0.4rem;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
  min-height: 130px;
}
.levelup-card:hover { border-color: var(--accent); }
.levelup-card:active { transform: translateY(1px); }
.levelup-card__series { width: 100%; height: 6px; border-radius: 3px; }
.levelup-card__name { font-weight: 800; font-size: 0.92rem; text-align: center; }
.levelup-card__series-label { font-size: 0.7rem; color: var(--muted); }
.levelup-card__lv { font-size: 0.78rem; color: var(--accent); font-weight: 700; }

@media (max-width: 480px) {
  .levelup-modal__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
  .levelup-card { padding: 0.6rem 0.3rem; min-height: 110px; }
  .levelup-card__name { font-size: 0.78rem; }
}
```

## 7. 受入基準

- [ ] battle 開始直後、 starter pick モーダルが自動的に開く (= `levelup.starter` 表示)
- [ ] 3 枚の extension カードが見え、 clcik で 1 つ選べる
- [ ] pick 後モーダル閉じ、 player 周囲に対応する色の弾が最寄り敵に飛ぶ
- [ ] XP gem 拾って LV up すると再びモーダル開く (= `levelup.title`)
- [ ] 既所持 extension が候補に混じれば 「Lv.1 → Lv.2」 表示
- [ ] 既所持を picks すると weapon が更新 (= cdMs / dmg が良くなる)
- [ ] 新規を pick すると weapon リストに増え、 弾の本数が増える
- [ ] modal 開時は battle 静止、 閉時は再開 (= pauseFlags 不変条件)
- [ ] 多重 LV up (= 1 frame で 2 つ閾値突破) → 連続 modal が出る
- [ ] EXT_MAX_LEVEL = 5 で頭打ち (= それ以上の重複は候補から除外)
- [ ] shockwave / shockwaveAnims が完全消滅 (= grep で 0 hit)
- [ ] DevTools console エラー無し
- [ ] JP/EN 切替で modal title / sub / NEW が言語追従
- [ ] mobile 縦画面で 3 カードが横並びでクリック可能

## 8. リスク・懸念

- **EXT_ROSTER が空のままの場合** (= loadExtensions 失敗) → starter pick で 0 候補、 modal 出るが空。 防御として `if eligible.length === 0` で 8 dmg / 1.5s の fallback weapon を 1 つ自動付与
- **多重 LV up の UX** — 連続 modal が出るので人によっては煩わしい。 まず動かしてから感触を見る
- **`rebuildWeaponsFromOwned` の lastFireMs リセット** — 古い weapon の lastFireMs を Map 参照で維持するが、 ext を新規追加したら新 weapon は lastFireMs=0 で即発射可能。 これは仕様 (= ピック直後の "boost" 感)
- **HP 0 でも止まらない** — SPEC-009 で対応
- **EXT_MAX_LEVEL の数値** — 暫定 5、 後続でバランス調整
- **projectile が無限に湧く** — life=1500ms で expire、 hit 時即 splice、 overflow しないがピーク時 N 武器 × cd = 投射体数。 通常 < 30 なので OK
- **starter モーダルとヒーロー modal の z-index 衝突** — どちらも 320、 ヒーロー modal は閉じてから starter が開く順序なので干渉しない

## 9. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants / state / extensions-as-weapons / weapons 改修 / projectiles tick / levelup.js / index.html modal / i18n / css / render.js 改修 / index.js 配線 |

## 10. 参考

- VS の core loop: 自動武器 + 移動のみ + Level up で picker
- 既存 hero modal 構造 (= 同型のモーダルパターン)
- SPEC-007 (= shockwave 仕様、 撤去対象)
- SPEC-003 (= EXT_ROSTER データソース)
