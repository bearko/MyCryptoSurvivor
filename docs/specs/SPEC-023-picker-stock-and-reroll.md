# SPEC-023 — Picker Stock Limit + Reroll

- **Status**: Implementing
- **Author**: bearko (with Claude Code)
- **Created**: 2026-05-10

## 1. 背景

ユーザー指示:
> 武器エクステンションと強化エクステンションはそれぞれ 5 種類までストック化のしたい (合計 10 種類)。
> 5 種類選択した場合は、 以降のレベルアップでは選択した 5 種類の中からしか表示されないようにしたい
> (10 種類全部選べるとレベルがバラけてしまうので、 上限を設けることで後半は狙ったエクステンションを取得しやすくするため)。
>
> バトル中合計 2 回までリロールできるようにしたい。

## 2. ゴール

- **武器ストック上限**: 5 種類 (= `STOCK_LIMIT_WEAPON`)
- **強化ストック上限**: 5 種類 (= `STOCK_LIMIT_BUFF`)
- 上限到達後、 picker はそのカテゴリの **既所持系列の Lv up のみ** 表示
- リロールボタンを picker モーダル下部に追加
- **1 戦闘あたり 2 回** リロール可能 (= `REROLL_PER_BATTLE`)
- 残数を 「リロール (残 N)」 として表示、 0 なら disabled

## 3. 設計

### 3.1 constants

- `STOCK_LIMIT_WEAPON = 5`
- `STOCK_LIMIT_BUFF = 5`
- `REROLL_PER_BATTLE = 2`

### 3.2 state

- `state.battle.rerollsLeft: 2` (= startBattle で reset)

### 3.3 `_samplePicks` (= levelup.js) 改修

```js
const ownedWeaponCount = state.ownedExtensions
  .filter(o => getCategory(getExt(o.extId)) === "weapon").length;
const ownedBuffCount = state.ownedExtensions
  .filter(o => getCategory(getExt(o.extId)) === "buff").length;
const weaponStockFull = ownedWeaponCount >= STOCK_LIMIT_WEAPON;
const buffStockFull   = ownedBuffCount   >= STOCK_LIMIT_BUFF;

const eligible = EXT_ROSTER.filter(e => {
  const o = ownedById.get(String(e.extId));
  if (o) return o.level < EXT_MAX_LEVEL;        // 既所持は LV up 可なら eligible
  if (e.category === "weapon") return !weaponStockFull;  // stock 上限超で除外
  if (e.category === "buff")   return !buffStockFull;
  return true;
});
```

(= 残りの 「最低 1 weapon」 / 重複防止 / 最終 shuffle は既存ロジック踏襲)

### 3.4 `rerollPicks()` (= 新規 export)

```js
export function rerollPicks() {
  if (!_isOpen) return;
  if ((state.battle.rerollsLeft ?? 0) <= 0) return;
  state.battle.rerollsLeft -= 1;
  state.pendingPickOptions = _samplePicks(PICK_OPTIONS_COUNT);
  renderLevelUpModal();
  playSe(SFX.LEVEL_UP, 100, 0.4);   // open_treasure を流用
}
```

### 3.5 UI

- `index.html` の levelup モーダル末尾に `<button id="levelUpReroll">` を追加
- `_wireOnce()` で click → `rerollPicks()`
- `renderLevelUpModal()` 末尾でボタンの textContent と `disabled` を更新
- i18n: `levelup.reroll` (= "リロール (残 {n})") / `levelup.rerollNone` (= "リロール不可")

### 3.6 startBattle reset

`battle/index.js` で `b.rerollsLeft = REROLL_PER_BATTLE`

## 4. 受入基準

- [ ] 開戦直後 (= 武器 1 / 強化 0) の picker は **全 19 系列から候補**
- [ ] 武器を 5 種ストック後の picker は **武器候補は既所持の Lv up のみ**、 新 weapon は出ない
- [ ] 強化を 5 種ストック後の picker は **強化候補は既所持の Lv up のみ**、 新 buff は出ない
- [ ] picker モーダル下に **「リロール (残 2)」** ボタンが表示
- [ ] click すると 3 候補が再抽選 + 残数が **2 → 1 → 0** に減る
- [ ] 残 0 でボタン disabled (= 「リロール不可」 表示)
- [ ] retry すると残 2 にリセット
- [ ] 「最低 1 weapon」 ルールは weapon stock 0 件かつ buff stock full の edge ケース で破綻しない
- [ ] DevTools console エラー無し

## 5. リスク

- **stock 上限と最低 weapon ルールの競合** — 武器 stock が満杯なら 「既所持武器の Lv up」 を weapon 枠と扱う (= 既存 `weaponPool` の filter は `category==="weapon"` で OK)
- **モーダル中に rerollsLeft を直接弄る** — DevTools 経由で `state.battle.rerollsLeft = 99` 等は許容 (= デバッグ用)
- **言語切替で 「残 N」 が古い数値** — `onLangChange` で renderLevelUpModal を呼ぶ既存 hook で更新

## 6. 参考

- 既存 `js/battle/levelup.js` `_samplePicks` (= SPEC-013 の重複防止 + 最低 1 weapon)
- ユーザー指示: 「上限を設けることで後半は狙ったエクステンションを取得しやすくする」
