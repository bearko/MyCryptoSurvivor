**Added Phase 0 (= Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect spec)**
- `docs/specs/SPEC-010-mobile-viewport-and-sprites.md` 新規 (= モバイル full-screen 化 / プレイヤー & 敵を MCH 画像で円形クリップ描画 / Level up カードに extension アイコン + 効果テキスト追加)
- `docs/specs/SPEC-INDEX.md`: SPEC-009 を `#10 (open)` に、 SPEC-010 を Implementing 登録
- 17 系列 × 5 段階の本格再設計 (= SPEC-011) の前段の **視覚 / レイアウト 改修のみ** に絞る

**Planned Phase 1 (= 実装)**
- `css/base.css` / `css/layout.css` / `css/components.css`: `html/body { height:100% }`, `.app { height:100dvh; overflow:hidden }`, `.battle-canvas { position:absolute; inset:0 }` で mobile full-screen
- `js/battle/sprites.js` 新規 (= preload 画像キャッシュ + `drawSpriteCircular`)
- `js/state.js`: `state.battle.playerSprite` / `defaultEnemySprite` 追加
- `js/battle/index.js`: startBattle で sprite preload を仕込む
- `js/battle/render.js`: プレイヤー / 敵を sprite 円形クリップで描画、 fallback で従来円
- `js/battle/levelup.js`: カード DOM を icon-wrap + main の 2 列に再構成、 効果テキスト (`DMG / CD / range`) を追加
- `data/i18n/ui.json`: `levelup.weaponEffect` 追加
- `css/components.css`: `.levelup-card` を grid + icon + effect 表示用に再設計
