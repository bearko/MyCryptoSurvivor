# SPEC-013 — Hero Starter Weapon + Picker Rules (= no dup, ≥1 weapon)

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-09
- **Updated**: 2026-05-09
- **依存**: SPEC-012 (= 10 weapon archetypes、 stack 上)

## 1. 背景 / 課題

ユーザー指示 3 点:

1. **「ヒーローそれぞれが武器エクステンション 1 種類を Lv.1 で持った状態から始めてください (= ヒーローごとの武器エクステンションの割り当ては固定)」**
   現状は starter pick モーダルを開いて 3 候補から 1 つ選ばせる方式。 これを撤廃し、 各ヒーローに固定の武器を **戦闘開始と同時に Lv.1 で装備** する。

2. **「エクステンションの選択で同じ種類のエクステンションが重複して表示されないようにしてください」**
   Level up モーダルの 3 候補で、 同じ系列が複数枠に出ないことを **明示的に保証** する (= 現状もユニーク化されているが、 防御コードで担保)。

3. **「ウェポンは最低一枠出してください」**
   3 候補のうち **最低 1 枠は weapon カテゴリ** にする。 強化 (= buff) 系列が偏って 3 つ出るのを防ぐ。 ただし全 10 weapon が Legendary に達したら weapon 枠は出さない (= edge case)。

## 2. ゴール

- `js/constants.js` に **`HERO_STARTING_WEAPON`** マップ追加 (= heroId → weapon extId)
- 全 10 ヒーローに 10 武器を **1:1 重複なく** 割当
- ヒーロー不明時の fallback weapon (= `HERO_STARTING_WEAPON_DEFAULT = 1` Revolver)
- `js/battle/index.js` `startBattle()`:
  - `triggerStarterPick()` 呼出を削除
  - 代わりに `state.ownedExtensions.push({extId: starterId, level: 1})` + `rebuildWeaponsFromOwned()` で starter weapon 装備
- `js/battle/levelup.js` `_samplePicks(n)`:
  - 重複防止: 使用済 extId を Set で管理し、 同じ系列を 2 回 push しない
  - 最低 1 weapon: weapon eligible が 1 件以上あれば、 必ず 1 つ pick の中に含める
  - 候補数 < n の場合は表示数を縮小 (= 既存挙動を維持)
- starter pick 関連 i18n キー (`levelup.starter`) は残置 (= 後続でリスポーン演出等に再利用余地)
- `triggerStarterPick()` 関数本体は残置 (= 死活コードだが破壊変更を避ける)

## 3. 非ゴール

- ヒーロー固有の starter weapon を **後から変える** UI (= 別 SPEC)
- starter weapon の rarity を Lv.1 以外にする (= 仕様通り Lv.1 固定)
- 弱体時のリロール / バンク機能
- weapon カテゴリの最低数を 1 以外にする
- buff カテゴリの最大数の制限

## 4. ヒーロー → スターター武器マッピング

10 体全員に重複なく 1 ずつ割当。 キャラクター性に寄せた配置:

| heroId | name | faction | starter weapon | extId |
|---|---|---|---|---|
| 1001 | コナン・ドイル | GENBU | **Revolver** (= 探偵 / 銃)           | 1 |
| 1002 | 甲斐姫       | SUZAKU | **Blade** (= 戦国姫 / 剣)             | 10 |
| 1004 | シートン     | GENBU | **Moai** (= 自然 / 落石)              | 4 |
| 1006 | ピタゴラス   | SEIRYU | **Book** (= 哲学 / 守護書)            | 2 |
| 2001 | ライト兄弟   | KOURYU | **LaserGun** (= 発明家 / 高速光線)    | 6 |
| 2002 | スパルタクス | SUZAKU | **Axe** (= 剣闘士 / 投擲斧)           | 8 |
| 2005 | グリム兄弟   | GENBU | **Pierrot** (= 童話 / トリックスター) | 9 |
| 2011 | 孫子         | BYAKKO | **Shuriken** (= 兵法 / 暗器)          | 5 |
| 2012 | 石田三成     | SEIRYU | **Knife** (= 武将 / 短刀)             | 7 |
| 2013 | 許褚         | BYAKKO | **Panjandrum** (= 怪力 / 突進輪)      | 3 |

## 5. 技術設計

### 5.1 constants.js 追加

```js
// js/constants.js
// SPEC-013: hero ↔ starter weapon の 1:1 fixed mapping (= heroId -> extId)
export const HERO_STARTING_WEAPON = {
  1001: 1,    // コナン・ドイル → Revolver
  1002: 10,   // 甲斐姫       → Blade
  1004: 4,    // シートン     → Moai
  1006: 2,    // ピタゴラス   → Book
  2001: 6,    // ライト兄弟   → LaserGun
  2002: 8,    // スパルタクス → Axe
  2005: 9,    // グリム兄弟   → Pierrot
  2011: 5,    // 孫子         → Shuriken
  2012: 7,    // 石田三成     → Knife
  2013: 3,    // 許褚         → Panjandrum
};
export const HERO_STARTING_WEAPON_DEFAULT = 1;   // 不明 hero は Revolver
```

### 5.2 battle/index.js startBattle 改修

```js
import {
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT,
  /* 既存 */
} from "../constants.js";
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";

// startBattle 内、 既存の reset 後 / triggerStarterPick の代わりに:
const starterId = HERO_STARTING_WEAPON[hero?.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
const starterExt = getExt(starterId);
if (starterExt && getCategory(starterExt) === "weapon") {
  state.ownedExtensions.push({ extId: starterId, level: 1 });
  rebuildWeaponsFromOwned();
}
// triggerStarterPick();   ← 削除
```

(= weapon が見つからない場合は何もしない。 EXT_ROSTER 未ロード等のレアケース。 levelup の fallback weapon が後で入る)

### 5.3 levelup.js `_samplePicks` 改修

```js
function _samplePicks(n) {
  const ownedById = new Map(state.ownedExtensions.map(o => [String(o.extId), o]));
  const eligible = EXT_ROSTER.filter(e => {
    const o = ownedById.get(String(e.extId));
    return !o || o.level < EXT_MAX_LEVEL;
  });

  // 重複防止用
  const used = new Set();
  const result = [];

  // SPEC-013: 最低 1 枠は weapon (= weapon が eligible なら必ず 1 つ含める)
  const weaponPool = eligible.filter(e => e.category === "weapon");
  if (weaponPool.length > 0 && n > 0) {
    const w = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    result.push(w);
    used.add(String(w.extId));
  }

  // 残り枠を eligible 全体から重複なく fill (= weapon もう 1 つ来てもよい)
  const restPool = eligible.filter(e => !used.has(String(e.extId)));
  // Fisher-Yates shuffle
  for (let i = restPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [restPool[i], restPool[j]] = [restPool[j], restPool[i]];
  }
  for (const e of restPool) {
    if (result.length >= n) break;
    if (used.has(String(e.extId))) continue;   // 防御 (= 想定上不要だが念のため)
    result.push(e);
    used.add(String(e.extId));
  }

  // weapon を必ず先頭にせず、 結果全体を再 shuffle で表示順をランダムに
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.map(e => {
    const o   = ownedById.get(String(e.extId));
    const cur = o?.level ?? 0;
    return {
      extId:        e.extId,
      ext:          e,
      currentLevel: cur,
      nextLevel:    cur + 1,
      isNew:        !o,
    };
  });
}
```

### 5.4 starter pick モーダルの triggering 撤去

`battle/index.js` から `triggerStarterPick()` 呼出のみ削除。 関数本体は `levelup.js` に残し、 `_isStarter` フラグの取り回しもそのまま (= 何かの拍子で starter pick 風モーダルを開きたい時に再利用可能)。

### 5.5 starter weapon の名前表示

ヒーロー pick 後に 「あなたは Revolver を持って戦闘に入りました」 のような表示は **しない** (= 既存 owned-hero badge と HUD で見える、 過剰演出を避ける)。 必要なら別 SPEC で 「starter weapon ハンドアウト演出」 を入れる。

## 6. 受入基準

- [ ] hero pick → 「冒険を始める」 → starter pick モーダルは **開かない**、 すぐ戦闘開始
- [ ] 戦闘開始直後、 ヒーローに対応する武器の弾が自動発射される (= e.g., コナン pick → Revolver の放射弾、 ピタゴラス pick → Book の周回)
- [ ] 1 LV up 後、 picker 3 候補のうち **少なくとも 1 つは weapon** (= 全 weapon 未取得時は当然満たす)
- [ ] 1 LV up 後、 picker 3 候補のうち **同じ系列が 2 回出ない** (= 100 回 LV up しても duplicate 0)
- [ ] 全 weapon が Legendary 到達後、 picker は buff のみ表示 (= weapon 枠は無くなる、 受入)
- [ ] eligible 候補が 3 未満なら表示数が縮小 (= 2 候補 / 1 候補も許容、 既存挙動)
- [ ] DevTools `__state.ownedExtensions` で starter weapon が 1 件入っていることが確認可能
- [ ] DevTools console エラー無し
- [ ] JP/EN 切替で picker が正しく動く (= 既存挙動を破壊しない)

## 7. リスク・懸念

- **HERO_STARTING_WEAPON の漏れ** — heroes.json に新規ヒーロー追加時 mapping が無いと fallback (= Revolver) になる。 console.warn を出す
- **starter weapon の選択肢が単調になる** — 全プレイで同じ hero = 同じ武器スタート。 これは仕様通り。 後続でユーザーに starter weapon 選択肢を選ばせる UI も追加可能
- **「最低 1 weapon」 が常に強制される** — buff 偏重狙いの戦略を制限する。 これは VS 設計と整合 (= weapon が無いと攻撃が出ない)
- **`_samplePicks` の random 偏り** — 最初に weapon を pull する重み付けで weapon が出る確率が他系列より高くなる。 これは仕様通り
- **starter pick i18n の dead code** — `levelup.starter` キーは残置、 後続で UX に再利用予定
- **rebuildWeaponsFromOwned の冪等性** — 既存 weapons[] が空の状態で呼ぶ前提。 startBattle で weapons=[] 直後に push → rebuild なので OK

## 8. 実装フェーズ

| Phase | 内容 |
|---|---|
| **Phase 0** | SPEC + INDEX + CHANGELOG |
| **Phase 1** | constants の HERO_STARTING_WEAPON / startBattle 改修 / _samplePicks 改修 |

## 9. 参考

- 既存 `js/battle/index.js` `startBattle` (= triggerStarterPick の呼出箇所)
- 既存 `js/battle/levelup.js` `_samplePicks` (= 既存 sample ロジック)
- `data/heroes.json` v2 (= 10 hero ID)
- `data/extensions.json` v2 (= 10 weapon series)
