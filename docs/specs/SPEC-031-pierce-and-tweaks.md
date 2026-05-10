---
id: SPEC-031
title: Pierce + LaserGun Fix + Pierrot AoE + Horse Tune + Gunbai + Header Date Removal
status: Done
pr: 39
phase: Phase 0 / Phase 1
kind: Changed
---

# SPEC-031 — Pierce + LaserGun Fix + Pierrot AoE + Horse Tune + Gunbai + Header Date Removal

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> ## 武器エクステ
> - パンジャンドラム: 貫通性能をつけたい (1 体当たっても消滅しないで、 2 体目に当たった際に消滅。 レベルアップすると貫通する体数が増える)
> - レーザーガン: 途中から敵へのダメージが 1 しか通らないので攻撃力を補正してほしい
> - ピエロ: 爆発の攻撃範囲が分かりやすいように赤い半透明の円で当たり判定を表示
>
> ## 強化エクステ
> - ホース: 攻撃頻度を早くする効果の係数をもっと大きく
>
> ### 新規強化エクステ
> - 「グンバイ」 シリーズ: 武器エクステの貫通を +〇
>
> ## その他
> ヘッダーにある yyyy 年 mm 月 ww 週 は不要なので削除

## 2. ゴール

- **Panjandrum 貫通**: tier 連動 (= Lv.1=1, Lv.2=2, ..., Lv.5=5)、 pierce 中は同 frame で複数体貫通可
- **LaserGun ダメージ補正**: 高 fps での `Math.round(0.x)` 丸め損 (= 1 dmg 連発) を解消、 per-beam-per-enemy で float 蓄積 + 250ms 周期 dispatch
- **Pierrot AoE 視認**: 爆発半径を **赤の半透明 fill (= alpha 0.22-0.32)** + 赤系 stroke で表示
- **Horse 強化**: tier magnitude を `0.95/0.9/0.84/0.78/0.72` → `0.85/0.7/0.55/0.4/0.3` (= Lv.5 で 70% 短縮 ≒ 3.33× 連射)
- **Gunbai (extId 20)**: `pierceUp` archetype、 全 projectile 武器の base pierce に加算 (= Lv 1/2/3/4/5 で +1/+2/+3/+4/+5)
- **ヘッダー日付削除**: `<div class="header__center">` (= `#dateLabel`) を撤去

## 3. 設計

### 3.1 Pierce 機構 (= 共通)

`_spawnProjectile` opts に `pierce` を追加。 spawn 時:

```js
const basePierce  = opts.pierce ?? 0;
const gunbaiBonus = state.buffs?.pierceBonus ?? 0;
const pierce = (opts.kind === "moaiDrop") ? 0 : basePierce + gunbaiBonus;
```

`moaiDrop` は shockwave で AoE 完結なので Gunbai の影響を受けない (= 多重 shockwave 防止)。

projectile entity に `pierceLeft` (= 整数) と `hitIds` (= Set) を持たせる。 `tickProjectiles` の collision:

```js
for (let j = enemies.length - 1; j >= 0; j--) {
  const e = enemies[j];
  if (p.hitIds && p.hitIds.has(e.id)) continue;     // 同弾 / 同 frame の重複ガード
  if (collide) {
    hitEnemy(j, p.dmg);
    p.hitIds.add(e.id);
    if (p.pierceLeft <= 0) { despawn = true; break; }
    p.pierceLeft -= 1;
  }
}
```

#### Panjandrum tierParams

| Lv | pierce | 効果 |
|---|---|---|
| 1 | 1 | 1 体目で消えない、 2 体目で消滅 |
| 2 | 2 | 3 体目で消滅 |
| 3 | 3 | 4 体目で消滅 |
| 4 | 4 | 5 体目で消滅 |
| 5 | 5 | 6 体目で消滅 |

#### Gunbai (extId 20)

| Lv | magnitude | tier name (= MCH 公式) |
|---|---|---|
| 1 | 1 | グンバイ |
| 2 | 2 | エリートグンバイ |
| 3 | 3 | ブレイブグンバイ |
| 4 | 4 | 立行司の軍配 |
| 5 | 5 | 梵字軍配 |

`tierIconIds`: 1037 / 2037 / 3037 / 4037 / 5037 (= MCH 1037 系列)。

例: Panjandrum Lv.3 (pierce=3) + Gunbai Lv.2 (= +2) → 実効 pierce=5 → 6 体目で消滅。

### 3.2 LaserGun 丸め損対策

各 beam 上に `dmgAccum` (= `{[enemyId]: float}`) と `lastHitMs` (= `{[enemyId]: ms}`) を保持。

```js
b.dmgAccum[e.id] = (b.dmgAccum[e.id] ?? 0) + b.dmgPerSec * dt;
if (nowMs - (b.lastHitMs[e.id] ?? 0) < BEAM_HIT_INTERVAL_MS) continue;
if (b.dmgAccum[e.id] < 1) continue;
const intDmg = Math.round(b.dmgAccum[e.id]);
b.dmgAccum[e.id] = 0;
b.lastHitMs[e.id] = nowMs;
hitEnemy(j, intDmg);
```

`BEAM_HIT_INTERVAL_MS = 250`。 例:
- LaserGun Lv.1: dmgPerSec=35 → 250ms で 8.75 → round 9 dmg dispatch → 36 dmg/sec ≒ 設計通り
- LaserGun Lv.5: dmgPerSec=105 → 250ms で 26.25 → round 26 dmg → 104 dmg/sec ≒ 設計通り

副次効果: ダメージ数字 floater が 4Hz になり視覚的にも整理される。

`tickBeams(dt, nowMs)` シグネチャ変更、 `index.js _loop` 側の呼び出し更新。

### 3.3 Pierrot AoE 可視化

`render.js` の bombs 描画ブロックを書き換え:

```js
const fillAlpha = (t > 0.7 ? 0.32 : 0.22) + (t > 0.7 ? 0.08 * Math.abs(Math.sin(b.age / 60)) : 0);
ctx.globalAlpha = fillAlpha;
ctx.fillStyle = "#e76060";
ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
ctx.globalAlpha = 0.6;
ctx.strokeStyle = "#ff8a8a";
ctx.lineWidth = 1.8;
ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke();
// アイコンは fill の上に乗せる
```

赤系統 (`#e76060` / `#ff8a8a`) で爆発範囲を表現、 fuse 終盤に点滅。

### 3.4 Horse 強化 (= `data/extensions.json`)

`magnitude` を `0.95/0.9/0.84/0.78/0.72` → `0.85/0.7/0.55/0.4/0.3` に。 `state.buffs.cdMul` に絶対値で代入されるため、 多段乗算によるバグはない。

### 3.5 Gunbai 系列

- `data/extensions.json`: extId 20 を末尾に追加
- `js/battle/buffs.js`: `applyBuff` の switch に `case "pierceUp": buffs.pierceBonus = m;`
- `js/battle/buffs.js`: `resetBuffs` で `state.buffs.pierceBonus = 0;`
- `js/state.js`: `state.buffs.pierceBonus = 0` 初期値
- `_spawnProjectile` で取り込み (= 上記 3.1)

### 3.6 ヘッダー日付削除

`index.html` から `<div class="header__center">...</div>` を削除。 `js/main.js` の `renderHeader` は `if (el)` ガード済で安全に no-op、 残置 (= 撤去は SPEC のスコープ外)。

## 4. 受入基準

- [ ] **Panjandrum Lv.1**: 1 体目を撃ち抜き、 2 体目で消滅
- [ ] **Panjandrum Lv.5**: 6 体目で消滅 (= 5 体貫通)
- [ ] **Gunbai Lv.1 + Panjandrum Lv.1**: 3 体目で消滅 (= 1+1=2 pierce)
- [ ] **Gunbai Lv.5 + Revolver / Knife / Axe**: 全弾が 6 体目で消滅 (= 5 体貫通)
- [ ] **Moai 落石は Gunbai 効果を受けない** (= 既存通り 1 体着弾 → shockwave のみ)
- [ ] **LaserGun Lv.1**: 250ms ごとに 9 前後の整数ダメージが出る (= 「1」 が連発しない)
- [ ] **LaserGun Lv.5**: 250ms ごとに 26 前後のダメージ
- [ ] **Pierrot bomb**: 爆発半径が **赤い半透明円 + 赤い線** で常時可視、 fuse 後半で点滅濃度 UP
- [ ] **Horse Lv.1**: 攻撃間隔が ×0.85 (= 17.6% 短縮)
- [ ] **Horse Lv.5**: 攻撃間隔が ×0.3 (= 70% 短縮 ≒ 3.33× 連射)
- [ ] **ピッカーで 「グンバイ」 が候補に出る**、 weapon stock 上限後でも buff 枠で出る
- [ ] **ヘッダー** から `2018 年 1 月 1 週` 表示が消える、 layout 崩れなし
- [ ] DevTools console エラー無し

## 5. リスク

- **Gunbai が Pierrot bomb / LaserGun beam / Book / Blade orbit に効かない** — 仕様 (= 投射体だけが対象)。 Pierrot は AoE で対応、 beam は本来貫通、 orbit は持続なので不要
- **Panjandrum を低 hp 雑魚群に通すと過剰火力** — Gunbai 重ね掛けで Lv.5+5=10 体貫通する。 後半ステージでは敵 hp も上がるので相殺される見込み、 必要なら後続で再 tune
- **LaserGun 250ms 周期で攻撃感が「ガッ ガッ ガッ」 になる** — 3 frame 毎に 1 hit、 既存 ORBIT_HIT_COOLDOWN_MS (= 250ms) と整合、 違和感少ない見込み

## 6. 参考

- `js/battle/projectiles.js` (= 既存 `// pierce なし` のコメント箇所を SPEC-031 で書換)
- MCH catalog: `Image/Extensions/{1,2,3,4,5}037.png` (= グンバイ tier、 全 200 OK)
- ユーザー指示: 「2 体目に当たった際に消滅」 「貫通する体数が増える」 「グンバイシリーズ: 武器エクステの貫通を +〇」
