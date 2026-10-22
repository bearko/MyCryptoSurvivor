# Changelog — MyCryptoSurvivor

[Keep a Changelog](https://keepachangelog.com/) 準拠。

## [Unreleased]

<!-- BEGIN AUTO-UNRELEASED -->
### Added — SPEC-165 (= Story Mode — Five MCH Lands, 25 Short Stages That Teach One Element Each With a Forced Path, Shadow-Hero Trials as Mid-Bosses That Become NORMAL Mission Givers, Big Bosses Only at 3-5 and 5-5, Replacing EASY and Unlocking NORMAL at the End)
- **ストーリーモード（β）の土台と W1 オーシャン** (`js/story.js` + `js/story-map.js` + `js/battle/story-battle.js` + `css/story.css` + 戦闘側の差し込み): 5 ランド × 25 ステージのレシピの型（湧き・敵・店の固定・ゲート・クリア条件・文）、 ランドマップ（一本道・遊び直し・準備中）、 EASY の上書きと同じ形で戦闘に読ませる `storyOverride()`。 クリア条件は 倒す・耐える・到達（地点の列）・集める・ボス。 W1 の 5 行（自動攻撃 → 店でただのエリートブレード → CE で本を買う → ハートで回復 → 光る地点へ・呂布の顔見せ）と文 15 本＋α。 モード選択に「ストーリー（β）」の札（EASY は残す）。 自動プレイ `--mode story --stage 1-1 --count 5`
- **シャドーの試練と W2 ストロベリー** (`js/battle/shadow.js` + `js/story.js` + `js/battle/story-battle.js`): シャドーヒーローを中ボスに（ボスの型を借り、 ミッションの効き目をオーラに。 耐える = 削れない / 倒す = HP あり。 場は縮めない）。 絆 `mcs.story.bonds` と報酬（ギフト券・解放）。 W2 の 5 行（2 品から選ぶ → 全部は買えない → 宝箱・壺・棒磁石で CE を集める → アレキサンダーの試練 15 秒 → 呂布の試練 20 秒）と文。 宝箱の中身の固定・拾った瞬間の一言
- **W3 タンジェリン** (`js/story.js` + `js/story-map.js` + `js/skill-tree.js` + 戦闘側): 3-1 はステージの前にスキルツリー（根を取るまで「ステージへ ▶」が押せない）・クリアでビリー・ザ・キッドが仲間に、 3-2 からヒーロー選択（`hero: "select"` / `"keep"`）、 3-3 はレアエネミーとギフト券（店で 1 品買うまで出られない）、 3-4 は撃つ敵（赤い線）、 3-5 は初の大型ボス ディープ・ヨシュカ（HP ×0.1・雷鼓・ハート）。 ストーリーの店はリロール・お断り・固有スキルを W5 まで隠す。 絆のギフト券を各ステージの店で持って始める
- **W4 ライム** (`js/story.js` + `js/battle/enemies.js` + `js/battle/gimmicks.js` + `js/battle/missions.js` + `js/battle/field.js` + `js/perks.js`): 4-1 は型のついた雑魚（巨人・走る）をレシピの割合で、 4-2 はそろばんの珠（種類と痛さもレシピ）、 4-3 はアレキサンダーのミッション★1（断れない・★は決め打ち）、 4-4 は懐中時計と合体ロボ（宝箱の中身を順に固定）、 4-5 はゴースト・織田信長を倒す（鉄砲隊つき）。 絆で雷鼓の対ボスが 30% に
- **W5 グレープ** (`js/story.js` + `js/battle/shop.js` + `js/battle/missions.js` + `js/battle/story-battle.js` + 戦闘側): 5-1 は店の全部（リロールとお断りを使うまで出られない）、 5-2 は固有スキルの強化とマジックカード（1 段上げるまで出られない・足りなければ手持ちで）、 5-3 は武田信玄の★3「風林火山」（断ってもよい。 達成で絆: 合体ロボ）、 5-4 は本番の湧きでゴースト・項羽を倒す（絆: ギフト券 ×3）、 5-5 は本番の 4 分 → 覚醒魔王ファオ（クリアで NORMAL が開く）。 25 ステージがそろった
- **ワールドマップ** (`js/story-map.js` + `css/story.css` + `index.html`): ランドの一覧を 1 画面の地図に。 四方に四神のランド（北=玄武 オーシャン / 南=朱雀 ストロベリー / 西=白虎 タンジェリン / 東=青龍 ライム）、 中央に W1〜W4 を越えると立つ 天候操作装置ゼウス と 頂上のファオ。 板はランドの絵に黒い板（α 0.8）、 見出しにクリプタイド、 札にランドセクタのアイコン（大型ボス Legendary / 中ボス Rare / ほか Common）。 開いていないランドは揺れる黒い靄（晴れる瞬間に上へ抜ける）。 ランドの中は折れ線の道、 ランド間は板の裏を通る道
- **絆の報酬ラッシュ** (`js/battle/story-battle.js` + `js/story.js` + `js/meta.js` + `js/meta-ui.js`): シャドーの試練を越えた瞬間（5-3 はミッション達成の瞬間）に、 足もとへ CE の宝石の輪（120）・マジックカード ×2・ハートが降り、 ギフト券はその場で財布へ、 GUM +30 がクリアの内訳に「絆の報酬」の行で乗る。 画面の真ん中に中身の札（解放したものも）。 作者の方針「報酬は早めに・一気に」
- **札の飾りをアチーブメントのアートに** (`js/story.js` + `js/story-map.js`): ワールドマップのステージの札に、 MCH のアチーブメント（ランドのクリプタイドの像）を置く。 大型ボス = 金（King 就任）/ 中ボス = 銀（G5 10 回）/ それ以外 = 銅（G5 3 回）
- **ワールドマップ v2** (`js/story-map.js` + `css/story.css` + `index.html` + `js/story.js`): 3 画面に。 S-A は暗い海の上に 4 つのランドの背景を領土の形に切り抜いた地図（札 1 枚・靄・雲・道・中央の島と塔・ランドへズーム）、 S-B はそのランドの背景を全面に 5 つの札を道で結ぶ（中ボスとボスの上に影・マインちゃんの一言）、 S-C はステージの説明（クリア条件・エネミー・報酬・ヒーロー・一言・自己ベスト）から開始。 結果の「マップへ」はいたランドへ
- **プロローグと台本** (`js/story.js` + `js/story-map.js` + `js/battle/stage-transition.js` + `js/mode-select.js` + `js/navi.js`): ストーリーに入るといきなり戦闘（1-0。 上の光る地点へ走るだけ）。 着くと次元の裂け目（画面がゆがんで暗転）→ マインちゃんのシーン（世界線・封印・クリプタイド・ファオ。 5 つ）→ ワールドマップ。 5-5 のあとにエンディングのシーン。 ランド名を英名に。 モード選択の案内を「まずはストーリーから」に（ストーリーの札が光る）。 ステージの説明の札は例外が出ても開く
- **ラスボスを COVID-19 に・台詞・不具合 2 件** (`js/story.js` + `js/story-map.js` + `js/constants.js` + `js/battle/boss-moves.js` + `data/enemies.json` + `js/mode-select.js` + `css/story.css`): 5-5 のボスと塔の頂上を COVID-19（681。 ウイルスをバラまく = 放射が多い）に。 5-5 の前に COVID のシーン、 後のエンディングも COVID の一言から。 地図に戻ったときの一言（ランドを取り戻した・塔が立った）。 封印されたヒーローは「解放」。 ストーリーの入り口でワイプを二重に掛けて真っ暗のまま止まっていたのを直した。 スマホでヒーロー選択の × が共通基盤のチャットのボタンと重なっていたのを右に寄せた
- **プロローグの手ざわり** (`js/story.js` + `js/battle/enemies.js` + `js/battle/player.js` + `js/battle/story-battle.js`): 1-0 に敵を左右と下から数体（追われてゴールへ）、 見えない壁（横と下に脱線しない）、 自分からゴールへの黄色い道筋。 目印の文に {now} / {goal} が残っていたのを直した
- **1-1 の札が出ない不具合・光の道筋・固有名詞の色** (`css/story.css` + `js/battle/story-battle.js` + `js/rich-text.js` + `js/navi.js` + `js/story-map.js`): ステージの説明の札がワールド詳細の画面の裏に隠れていた（z-index）。 1-0 の道筋を光る帯・流れる破線・光の粒にし、 近づくほど濃く太く速く。 マインちゃんの台詞で固有名詞（ランド・人・COVID・クリプタイド）を橙で目立たせる
- **1-4 のパンケーキ・1-5 のランクアップ・2-2 の取捨選択・旅の演出** (`js/story.js` + `js/battle/story-battle.js` + `js/battle/story-fx.js` + `js/battle/shadow.js` + `js/battle/shop.js` + `js/battle/stage-transition.js` + `js/story-map.js`): 1-4 は真ん中の上にパンケーキを確定で置いて光る道筋で誘導（取るまでクリアしない）。 1-5 は移動の練習のあと真ん中に呂布（小手調べ）、 3 回当てると店が開き、 ブレード → エリートブレードのランクアップの演出、 呂布を倒してクリア。 ランドの最後は「マップへ」だけ（新しいランドの札が弾む）。 2-2 は 4 品・値段 ×1.6。 結果の「次のステージへ」は詳細の画面に戻ってヒーローが次の札へ歩く旅（押すと飛ばせる）
- **1-2 はりんご・越えた瞬間のポップアップ** (`js/story.js` + `js/battle/story-battle.js`): 1-2 の店はりんご（攻撃力）に（ランクアップは 1-5）。 シャドーの試練を越えた瞬間（5-3 の絆も）、 相手の大きな絵・名前・一言・絆の報酬を 1 枚のポップアップで出し、 時間を止めて押すまで待つ
- **持ち物はストーリーのあいだ残る** (`js/story.js` + `js/battle/index.js` + `js/battle/stage-transition.js`): クリアの瞬間にヒーロー・装備・CE・固有スキルの段を `mcs.story.loadout` に覚え、 次のステージはレシピの開始装備を底にして重ねる（タイトルに戻っても消えない）。 2-2 の「全部は買えない」は開いた瞬間の CE に合わせる（`shop.fit`）。 木の「次のノードに挑む」はストーリーなら旅の演出へ（`js/skill-tree.js`）
- **EASY の撤去・NORMAL のロックはストーリーのあと・絆の報酬は NORMAL でも・`survivor.story`** (`js/easy.js` + `js/bonds.js` + `js/mode-select.js` + `js/platform.js`): モード選択の EASY の札・`EASY_STAGES`・レッスン・根まで弱いヒーロー・根なしのゲートを撤去。 NORMAL の 🔒 は「ストーリーを最後までクリア」（遊んだことがある人・旧 EASY をクリアした人は開いたまま）。 絆の雷鼓 30% と出し手の優先は NORMAL でも（すでに遊べる人は最初から）。 25 のクリアで共通基盤の実績 `survivor.story`。 SPEC-147 / 154 / 164 は Superseded。 録音の台本 `docs/voice/script-story-*.csv`

### Changed — SPEC-164 (= EASY Guidance Gates — No Ring on the CE Lesson, Skill-Tree-Only Revive Before the Root, Root-First Skill Tree, and a Gentle Stage 2 (Harmless Mobs, Long Boss, Thunder Drum for Half))
- **EASY の導線のゲートと、 ステージ 2 のやさしさ** (`js/lesson.js` + `js/battle/gameover.js` + `js/skill-tree.js` + `js/easy.js` + `js/battle/field.js` + `css/result-ui.css` + `css/skill-tree.css`): CE のレッスンに黄色い輪を出さない。 根なしの REVIVE は「スキルツリーへ」を大きく出し、 ランキング送信・名前・タイトルに戻るは押せない。 木は根（サバイバーの覚醒）を取るまで 復活する・戻る・道・一括解放 を押せない。 EASY ステージ 2 は根があれば雑魚がほぼ痛くなく（攻撃 ×0.6）、 ボスは痛くないが長い（HP 4,050・攻撃 ×0.3）、 雷鼓が HP の半分を削る。 根なしは ×0.5。 雷鼓のレッスンがステージ番号のズレで出ていなかったのを直す

### Changed — SPEC-163 (= Balance Pass Around the Expected DPS Curve — Gentler Spawn Flood and Density, HP-Based Stage Scaling for Carried-Over Gear, Bigger Bosses, Stronger Skill Tree Ranks, Repeat-Buy Shop Cards, a Desk Simulator and a Fast Autoplay Harness) — merged in #203
- **DPS の期待値に合わせたバランス調整と、 sim・自動プレイ** (`js/constants.js` + `js/battle/boss-moves.js` + `js/easy.js` + `js/skill-data.js` + `js/perks.js` + `js/battle/shop.js` + `tools/sim/balance.mjs` + `tools/autoplay/run.mjs`): 始まりの湧きを初期武器 Lv.1 の DPS より下に（0.8 秒 × 1.4 / 1.1 / 0.9）、 洪水 ×4 / ×7 / ×9・群れを小さく遅く・密度の目標 0.3 / 0.7 / 0.95。 ステージ 2・3 は数ではなく HP（×2.2 / ×3.5）で強く。 ボスの HP は `BOSS_MOVES.hpMul` を 1 にして最終値 12,000 / 45,000 / 100,000 を `ENEMY_SPECS` に（60,000 / 90,000 / 90,000 から）。 木の段ごとの効き目を上げ（HP 6%・被ダメ −4%・攻撃 5%・CD −3%）、 得意武器は土台 50% ＋ 段 15%。 店は同じ札を続けて買え、 値段の表は 15 / 20 / 30 / … / 3,300。 EASY のステージ 2 は攻撃 ×1.7・ボス ×0.6（ボスの実体 HP は 180 / 1,440 のまま）。 机上 sim と Playwright の自動プレイを `tools/` に

### Changed — SPEC-162 (= Extensions and CE Carry Over Between Stages, Extension Levels Go to 15 (Rank Up Every 3 Levels, the Old Max Is Level 10, Levels 11–15 Go Beyond, LL at 16), and the Shop Price Table Spans 15 Levels) — merged in #202
- **装備と CE のステージ間の引き継ぎ・エクステンション 15 段階** (`js/ext-level.js` + `js/battle/index.js` + `js/battle/stage-transition.js` + `js/extensions.js` + `js/battle/extensions-as-weapons.js` + `js/battle/buffs.js` + `js/battle/shop-logic.js` + `js/constants.js`): 装備と CE はステージをまたいで残る（同じステージのやり直しは入ったときに戻す）。 レベルは 15 段（3 段ごとにランク。 Lv.10 が今までの Lv.5、 Lv.11〜15 はその先、 LL は 16）。 店の値段は 15 段の表、 ギフト券はランクで、 仕込みは 1 段 = 2 Lv

### Changed — SPEC-161 (= The Skill Tree Opened From the Stage-Clear Screen Gets a "Next Node" Button in the Same Spot as "Revive", Going Straight to the Next Stage Without Returning to the Stage-Clear Screen) — merged in #201
- **ステージクリアから開いた木に「次のノードに挑む」** (`js/skill-tree.js` + `js/battle/stage-transition.js`): REVIVE から開いたときの「復活する」と同じ場所に置き、 押すとステージクリアの画面に戻らずそのまま次のステージへ

### Changed — SPEC-160 (= On the Second Death Onward the REVIVE Screen Opens Straight Away and Mine Encourages From the Bottom Dock (Icon and Bubble) Before the Advice, With No Extra Screen) — merged in #200
- **2 回目からは REVIVE の画面の下でマインちゃんが励ます** (`js/battle/gameover.js`): 王妃の黄金時計の説明（全身）は初回だけのまま、 2 回目からは画面を増やさず、 REVIVE の画面の下の帯（アイコンと吹き出し）で「惜しかったね…」「頑張ったね！…」「まだまだこれから！…」を順に言ってから、 おすすめや入口の案内。 EASY もレッスンを見終えた 2 回目から同じ

### Changed — SPEC-159 (= Fourth Batch of Mine's Recordings — 89 WAVs Matched to the Line Script, 32 New Voices Converted to MP3 (Existing Voices Kept for the 57 Duplicates), Wired to the Mission, Revive, Advice, Lessons, Telops, Boss Warning and EASY Stage Line, and the Originals Removed) — merged in #199
- **マインちゃんの 4 回目の録音（89 本）を取り込み** (`assets/voice/mine/` + `js/voice-lines.js` + `tools/voice/build.mjs` + `js/navi.js` + `js/battle/missions.js` + `js/result-telop.js`): 既存のボイスと同じ 57 本は既存を優先して捨て、 新しい 32 本（ミッション・復活・木から戻ったとき・EASY のすすめ・レッスン 15・おすすめ 6・EASY のステージ・ボスの予告・テロップ 3）を MP3 にして登録。 録音で言い回しが変わった 8 行は字幕を合わせた。 元の WAV と TXT は消した

### Changed — SPEC-158 (= Stage-Clear Screen Rebuilt Like REVIVE (Small Stats Line, Big GUM and Gold Dust, Breakdown Under "Details" or in the Left Column on PC), a Victory Jingle When the NODE CLEAR Band Appears, Two Columns Decided by the Card's Available Width So the Open Chat Dock Makes Three Clean Columns, and #ポチゲー in the X Post Body) — merged in #198
- **ステージクリアの画面を REVIVE と同じ組み立てに・勝利の SE・ドックと 3 列・X の #ポチゲー** (`index.html` + `js/battle/stage-transition.js` + `css/result-ui.css` + `css/components.css` + `js/share-x.js`): 時間・撃破・レベルは 1 行の小さな字、 GUM とゴールドダストは大きく、 内訳と CE の振り先は「くわしく」（PC では左の列）。 NODE CLEAR の帯が出る瞬間に勝利のジングル。 2 列にするかは窓ではなく札の置き場の幅で決める（チャットのドックが開いていればデータ・結果・チャットの 3 列）。 X の投稿の本文に #ポチゲー

### Changed — SPEC-157 (= Bulk Unlock of Every Claimable Skill Cheapest First With a Gold Dust Toggle, a Yellow Frame Around the Selected Node, the "Available Skills" Button Selecting the Node, and No Recommended Upgrade Until the Root Is Owned) — merged in #197
- **木の一括解放・選んだ節の黄色い枠・「解放可能なスキル ▶」** (`js/skill-bulk.js` + `js/skill-tree.js` + `css/skill-tree.css` + `js/battle/revive-picks.js`): 何も選んでいないときの欄に「{n} 個を一括解放（GUM …）」と「ゴールドダストも使う」の切り替え（安い順に、 買えなくなるまで）。 選んだ節は黄色い枠（盤の clip-path の外に）。 「解放できます ▶」は「解放可能なスキル ▶」に（押すとその節を選ぶ）。 REVIVE の画面のおすすめは根を取ってから（初回は「スキルツリーへ」から）。 SPEC-156 の頭に出ていた "null" を直す

### Changed — SPEC-156 (= The Skill Tree and the Result Screen Shrink by the Width of the Chat Dock, With a Button in the Tree Header to Collapse or Expand the Chat) — merged in #196
- **チャットのドックのぶん、 木と結果の画面を狭める** (`js/chat-dock.js` + `js/platform.js` + `js/skill-tree.js` + `css/skill-tree.css` + `css/components.css`): PC で右に固定のチャット（SDK のドック・320 px）が木の右の列に重なっていた。 ドックが見えているあいだだけ `--chat-dock: 320px` を置き、 スキルツリーと結果・REVIVE の画面を `right` で避ける。 木の広い画面の判定もドックを引いた幅で。 木の頭に「チャットをたたむ／ひらく」のボタン

### Changed — SPEC-155 (= Recommended Upgrades Bought in One Tap on the Revive Screen, a Two-Column Revive Screen on PC, the Revive Explanation Only Once, the Clock Icon Kept on One Line, Camera Centered Before the First Frame After Reviving, and the Line Script With Variables Expanded Into Real Words) — merged in #194
- **復活の画面のおすすめの強化・PC の 2 列・説明は初回だけ** (`js/battle/revive-picks.js` + `js/battle/gameover.js` + `css/result-ui.css` + `tools/voice/lines-csv.mjs`): REVIVE の画面に「おすすめの強化」を 3 つまで（倒れた理由のおすすめ → 安い順。 根をまだなら根だけ）。 木へ行かずにその場で強化できる。 PC（980 px 以上）では GUM の内訳と分析を左の列に出す。 復活のしかたの説明（マインちゃんの全身と時計）は初回だけで、 2 回目からは REVIVE の画面へ直行。 「復活する」の時計の絵は木のボタンと同じ並べ方で 1 行に。 復活の直後にステージの外が映っていたのを直す（カメラを最初のコマから自分に）。 台本の CSV は `{stage}` などを実際の語に展開（89 行）

### Changed — SPEC-154 (= Lessons as the Top Comm Bubble With a Cursor (No Cut-Ins, Game Keeps Running), EASY Cut to Two Stages, Shop Gauge Fixed on Stages 2/3, Skill Tree Reachable From the Stage-Clear Screen Once Awakened, and the Boss Chest Turning Into the Gold Dust Icon)
- **レッスンは止めずに画面の上で・EASY は 2 ステージ** (`js/lesson.js` + `js/lesson-cursor.js` + `js/easy.js` + `js/battle/shop-logic.js`): EASY のレッスンは真ん中のカットインをやめ、 初めてのひとことと同じ画面の上の通信窓（止まっている画面では下の帯・木では木の上）で話す。 CE・店のゲージ・ボスの赤いエリア・レアにはカーソル（輪と指）。 EASY は 2 ステージ（ステージ 2 が負ける設計）。 ステージ 2・3 で 0 のままだった店のゲージを直す。 根を取ってあればステージ 1 のクリア画面から木へ。 ボスの宝箱は開くとゴールドダストの絵に

### Changed — SPEC-153 (= EASY Stage Line in Seconds, Compact Revive Screen That Emphasizes GUM and Gold Dust, Shake Edge Fix, Mine's Boss Warning, Boss Chest Opening for Gold Dust, No Achievements in EASY, MCH Warrior Only in EASY With Billy the Kid as the Clear Reward, and the One-Column Line Script) — merged in #192
- **EASY の仕上げ・復活の画面の圧縮・ボスの宝箱** (`js/battle/boss-chest.js` + `js/hero-unlock.js` + `js/navi.js` + `js/battle/render.js`): EASY のステージ 1 の告げ声は「15 秒でボスが来るよ」。 復活の画面は時間・撃破・レベルを 1 行にして GUM とゴールドダストを大きく、 内訳と分析は「くわしく」に畳む（スクロール無しで「復活する」まで）。 被弾の揺れで画面の縁に暗い層のずれが見えていたのを直す。 ボスの予告でマインちゃんが「中央の赤いエリアにボスが来るよ！」。 ボスを倒すと宝箱が落ちてきて、 開けるとゴールドダスト（ここで足す）。 EASY ではアチーブメントを送らない。 EASY は MCHウォーリアーだけで、 クリアするとビリー・ザ・キッドが仲間に（前から遊んでいた人はそのまま）。 マインちゃんの日本語のセリフを `docs/voice/script-mine.csv` に（`node tools/voice/lines-csv.mjs`）。 切り出した描画の関数が局所変数を参照していて自分より上の層が描けていなかったのを直す

### Changed — SPEC-152 (= Revive Polish — Stay Dark Until the Pixels Rain In, Skill Tree Not Dimmed by the Vortex, No Opening Shop in EASY (Opening Shop Becomes the "Early Opening" Node), and the Frozen Screen-Shake Offset) — merged in #191
- **復活の仕上げ・開幕の店は節に・揺れの残り** (`js/battle/revive-fx.js` + `js/battle/shop-logic.js` + `js/skill-data.js` + `js/battle/fx.js`): 「復活する」のあと粒子が吸い込まれ終わって降りこみ始めるまで黒画面のまま。 スキルツリーを開いているあいだ渦を隠す（木が半透明に見えていた）。 EASY のステージ 2・3 の開幕の店をやめ、 NORMAL の開幕の店は節「先行オープン」（強化の目利き・150 GUM）で開く（無ければ 0:10 から。 RTA は今までどおり）。 止まっているあいだは被弾の揺れを 0 に（暗い層がずれたまま残っていた）

### Changed — SPEC-151 (= Revive v2 — Slow Damage SE Instead of the Lose Jingle, Pixels Gather Into a Spinning Spindle Vortex, Mine Appears Full-Body With the Golden Watch, Translucent Result Over the Vortex, Sink on Revive, Pixels Rain Down Into the Hero on the Stage; Lesson Voice No Longer Overlaps the Stage Call) — merged in #189
- **復活の演出 v2** (`js/battle/revive-fx.js` + `js/battle/gameover.js`): 倒れたときは lose のジングルを鳴らさず、 ダメージの SE をゆっくり。 粒子は舞い上がったあと画面の真ん中の紡錘の渦に集まって回り続け、 マインちゃんが全身で王妃の黄金時計の絵とともに「復活させてあげる」。 言い終えたら半透明の結果の画面が渦の上に。 「復活する」で渦が下へ吸い込まれ、 ステージの真ん中に上から粒子が降りこんでヒーローの姿になる。 EASY のレッスンは、 ステージの告げ声が終わってから出る（声を重ねない）

### Changed — SPEC-150 (= Revive Instead of Retry — Hero Dissolves Into Pixels on Defeat, Mine Offers the Golden Watch of the Queen, Strengthen in the Skill Tree, Then the Pixels Gather Back and the Hero Revives) — merged in #188
- **「やり直し」ではなく「復活」** (`js/battle/revive-fx.js` + `js/battle/gameover.js` + `js/battle/render.js`): 倒れるとヒーローが 32×32 の粒子になって風に舞い上がり、 半透明の結果の画面（見出し「力尽きた……」/ REVIVE）の上を漂う。 マインちゃんが「王妃の黄金時計のチカラで復活させてあげる」→ スキルツリーで強化 → 「復活する」（王妃の黄金時計 5111 の絵つき）で粒子がフィールドの真ん中に集まり、 閃光と「REVIVE!」と復活の SE のあとステージ 1 から再開。 木の「もう一度挑む」も「復活する」に

### Changed — SPEC-149 (= EASY Tuning (Enemies ×1/3, Stage 1 Survivable Without Moving, Stage 2 Not), Lesson Voice Cut on Boss Kill, and Confetti on Clear) — merged in #188
- **EASY の釣り合い直し・レッスンのボイスの中断・クリアの紙吹雪** (`js/easy.js` + `js/confetti.js` + `js/battle/stage-transition.js` + `js/battle/activity-report.js`): EASY の敵を 1/3 にし、 ステージ 1 は動かなくても倒れず、 ステージ 2 は動かないと倒れる。 説明の途中でボスを倒したらボイスを切ってクリアの SE。 ステージクリアと全クリアで紙吹雪（マイクリの金宝箱の演出の値のまま: 120 粒・12 色）

### Added — SPEC-148 (= Defeat Analysis — Damage Taken by Source, DPS and Damage Dealt per Weapon, Comparison With the Previous Defeat and Personal Best, and Mine's Skill Suggestions) — merged in #187
- **負けた理由の分析** (`js/battle/run-stats.js` + `js/battle/analysis-ui.js` + `js/battle/damage.js` + `js/battle/hurt.js`): 倒れた画面と全クリアの画面に、 被ダメの内訳（接触 / 弾 / ボス / 仕掛け）・とどめ（敵の名前）・生存 / DPS / 撃破/分 / 被ダメ/分 / 回復の表（今回・前回の敗北（クリアなら前回のクリア）・自己ベストと ▲▼）・武器ごとの与ダメ（ボスへの与ダメも）を出す。 記録は `mcs.runlog.v1`（ヒーロー × モード）。 倒れたときは被ダメの内訳からマインちゃんが節を 1 つすすめ、 節のボタンでその節を選んだ状態でスキルツリーが開く

### Added — SPEC-147 (= EASY Mode — A Guided 3-Stage Run for First-Timers (Short Stages, Mine's Voiced Lessons, Designed Loss on Stage 3, Skill Tree Awakening, Then NORMAL))
- **EASY（初めての人のための短い 3 ステージ）** (`js/easy.js` + `js/lesson.js` + `js/mode-select.js` + `js/battle/*`): モード選択に EASY を足し、 初めての人にはマインちゃんがすすめる。 NORMAL は EASY をクリアするまでロック（遊んだことのある人はそのまま）。 ボスは 0:15 / 0:30 / 0:45、 店はステージ 1 から。 止めて読み上げるレッスン 16 本（1 回ずつ。 設定の「もう一度聞く」で戻る。 ボイスは `lesson.*`、 台本は `docs/voice/script-lessons.csv`）。 ヒーローはスキルツリーの根を取るまで ×0.6 で、 ステージ 3 で倒れたら木へ → 根で元の強さに戻って再挑戦。 ステージ 3 のボスが出た瞬間に雷鼓が落ちる。 EASY では実績・総合スコア・RTA・ステージの記録を送らない。 クリアしたら NORMAL へ誘う。 SPEC-146 の「初回はショップなし」は取り下げ（T0 と木からの再挑戦は残す）

### Fixed — SPEC-146 (= First Run for New Players — Threat Stays at T0, Level-Ups Instead of the Shop, and "Try Again" Straight From the Skill Tree After a Defeat) — merged in #184
- **初めての人の最初の挑戦** (`js/battle/index.js` + `js/battle/threat.js` + `js/battle/gameover.js` + `js/skill-tree.js`): 1 回目の挑戦（`meta.runs === 0`）は脅威の段階を上げず、 ショップを出さずにレベルアップで強くなる（ショップは 2 回目から）。 倒れたあと、 スキルツリーから「もう一度挑む」へすぐ行ける。 自動プレイでステージ 1 のクリアが 0% → 63%

### Changed — SPEC-145 (= Per-Extension Bargain and Prep Nodes Extend Straight From Each Mastery — Weapons in Rows Above Attack, Buff Bargains in a U Beside Treasure) — merged in #183
- **エクステ別の目利き・仕込みを極意の先にまっすぐ** (`js/skill-data.js`): 武器は「極意 → 目利き → 仕込み」、 強化は「目利き → 仕込み」と、 それぞれの節の先に一直線に並べ直す。 入口は攻撃の「長い腕」・財宝の「早い宝箱」へ

### Changed — SPEC-144 (= Favored Weapon as an Explicit Chance (20/40/60%) and Colored Numbers and Terms in Skill Details and Mission Text) — merged in #182
- **得意武器を確率で・説明の色分け** (`js/battle/levelup.js` + `js/rich-text.js`): 得意武器は札が並ぶたびに 20% / 40% / 60% の確率で初期武器が必ず並ぶ形にして、 説明に確率を書く。 スキルツリーの詳しい欄とミッションの説明で、 数字は金・用語は水色・「」の中は白の太字に

### Added — SPEC-143 (= Mine Suggests Posting on X After Clearing Stage 1 — Post Button Opens X With #MyCryptoGames and the Game URL, 100 GUM Once) — merged in #181
- **X での投稿のおすすめ** (`js/share-x.js`): ステージ 1 のクリアでマインちゃんが X での宣伝をすすめる。 投稿ボタンで X を開き（#MyCryptoGames とゲームの URL 入り）、 100 GUM（1 回だけ）

### Changed — SPEC-142 (= Resume With "Ready → Go!" Instead of a 3-2-1 Countdown (0.8 s Pause, Go! Shown While Playing)) — merged in #180
- **再開は Ready → Go!** (`js/battle/resume-countdown.js`): 3・2・1（3 秒）をやめ、 Ready で 0.8 秒止めて、 Go! が出た瞬間に動き出す（テンポが遅いという声に応えて）

### Changed — SPEC-141 (= Helper Items On Top of the Horde and Off-Screen Item Pointers With Icons) — merged in #179
- **お助けアイテムを最前面に・画面の外の矢印** (`js/battle/render.js`): アイテムとマジックカードを敵の大群より上に描く。 画面の外にあるものは、 その向きの縁に矢印と絵の丸を出す（近い順に 8 つ）

### Added — SPEC-140 (= Combined Robot Helper Item — Unlocked in the Skill Tree, Drops From Pots and Chests, Invincibility With Rainbow Glow and Its Own BGM; Rank Raises Rarity and Duration) — merged in #178
- **お助けアイテム「合体ロボ」** (`js/battle/field.js` + `js/perks.js` + `js/skill-data.js` + `js/battle/render.js`): スキルツリーで解放すると壺・宝箱から出る。 拾うと無敵（段で 3〜8 秒・絵が Common → Legendary）。 無敵のあいだは虹色に光り、 BGM が替わる

### Added — SPEC-139 (= Skill Tree Extension Nodes — Favored Weapon (Starting Weapon Shows Up More), Per-Extension Start Level (Prep), Weapon Price Cuts) — merged in #177
- **スキルツリー：得意武器・仕込み・武器の目利き** (`js/skill-data.js` + `js/perks.js` + `js/battle/levelup.js`): 初期武器が出やすくなる「得意武器」、 エクステ別に最初から Lv ＋1 になる「仕込み」（21 枚・値段は Lv.1 のまま）、 武器のショップの値引き「目利き」（10 枚）を足す（32 節）

### Added — SPEC-138 (= Shadow Takeda Shingen Mission — Wind (Faster Enemies), Forest (Silence), Fire (More Enemies), Mountain (No Movement), Widening by Star) — merged in #176
- **シャドー武田信玄のミッション「風林火山」** (`js/battle/missions.js` + `js/audio.js` + `js/battle/player.js`): 風（敵の足 ×1.4）・林（BGM と効果音が消える）・火（敵の湧き ×3）・山（動けない）。 ★1 風林・★2 風林火・★3 風林火山がすべて同時に効く

### Changed — SPEC-137 (= Mission Difficulty Stars ★1–★3 — Stricter Rules and Richer Rewards, Gift Tickets From ★2, Star Colors, White Fog, Mine's First-Mission Guide) — merged in #175
- **ミッションの難易度 ★1〜★3** (`js/battle/missions.js` + `css/missions.css`): 持ちかけで★を選ぶ。 ★で条件が厳しく、 ごほうびが豪華に（ギフト券は ★2 から、 ★1 は CE）。 ★で帯と幕の色が変わる。 ジャック・ザ・リッパーの霧を白く（★3 はほとんど見えない）。 初めてのミッションでマインちゃんが説明する

### Changed — SPEC-136 (= GUM Breakdown With Formulas — Time, Kills, Stage Clear, Level, Leftover Gift Tickets Converted to GUM) — merged in #174
- **GUM の内訳（遊んだぶんが GUM に）** (`js/meta.js` + `js/meta-ui.js` + 結果の 3 画面): GUM を「生存時間 1/秒・撃破 20 体で 1・ステージクリア 50 × 番号・到達レベル 5/Lv・残ったギフト券 30/枚」の式に。 結果の画面に式つきの内訳を出す。 挑戦の終わりに残ったギフト券は GUM に換わる

### Changed — SPEC-135 (= Skill Tree Screen Split From MyCryptoWorkshop — 860px Breakpoint, 340px Side Panel on PC, Compact 46dvh Panel on Phones) — merged in #173
- **スキルツリーの画面の分け方（Workshop の作り）** (`css/skill-tree.css` + `js/skill-tree.js`): 860px で分け、PC は右に 340px の欄、狭い画面は下に 46% までの欄（詳しい欄を小さく）。選ぶたびに欄の先頭へ

### Changed — SPEC-134 (= Skill Tree Interaction From MyCryptoWorkshop — Pan on Window, Pinch/Wheel About a Point, Zoom Limits, Minimap, Branch Jump, Overview) — merged in #171
- **スキルツリーの動かし方（Workshop の作り）** (`js/skill-tree.js` + `css/skill-tree.css`): ピンチは指の中点・ホイールはカーソルを軸に、ズームの下限は木全体が収まる倍率。ミニマップ（押す・なぞると移動）、道のタブでその道の真ん中へ、「全体」ボタン

### Changed — SPEC-133 (= Skill Tree on an Integer Grid (Ported From MyCryptoWorkshop) — Branches by Direction, requires, Hero-Gated Weapon Mastery) — merged in #169
- **スキルツリーをマス目に置く** (`js/skill-data.js` + `js/skill-logic.js` + `js/skill-tree.js`): MyCryptoWorkshop の仕組み。道を方向ごとに分け、線は親から子へまっすぐ。武器の極意は「そのヒーローを仲間にしていること」が条件で 1 段目は無料（本作のヒーローは数珠つなぎ・ほかのタイトルは分岐）。奥義はたどり着くまで見せない

### Changed — SPEC-132 (= Stage Clear Grants GUM and Links to the Skill Tree; the Tree's Back Button Returns to Where You Came From (Bottom-Right)) — merged in #167
- **ステージクリアのたびにスキルツリーへ** (`js/battle/stage-transition.js` + `js/skill-tree.js` + `js/meta.js`): ステージクリアで GUM（50 × ステージ ＋ 撃破 15 体ごとに 1）。クリアの画面に「スキルツリーへ」。木の「戻る」は右下に移し、開いた元の画面に戻る

### Changed — SPEC-131 (= More GUM (Mission Clear Bonus, Kill Bonus) and 21 Extension-Specific Skill Tree Panels) — merged in #166
- **GUM を稼ぎやすく・エクステ別のパネル 21 枚** (`js/skill-data.js` + `js/meta.js` + `js/battle/missions.js`): ミッション達成で確定 GUM（重さ × ステージ）、撃破 15 体ごとに GUM ＋1。武器 10 種の「極意」（威力 ＋5% / 段）と強化 11 種の「目利き」（ショップの値段 −6% / 段）

### Changed — SPEC-130 (= Choose Gift Tickets or CE Per Purchase — "Pay With Gift Tickets First" Checkbox, Remembered) — merged in #165
- **ギフト券か CE かを選べる** (`js/battle/shop.js`): 「ギフト券支払いを優先」のチェックボックス（既定オン・次も覚えておく）。オンなら券で買える品はどれも券で、オフなら CE で払って券を貯められる

### Fixed — SPEC-129 (= Fix Stage 3 Freeze When the Trojan Horse Appears; Keep the Battle Loop Alive Through a Frame Error) — merged in #164
- **ステージ 3 で止まる不具合を直した** (`js/battle/gimmicks.js` + `js/battle/index.js`): トロイの木馬が出ると例外で止まっていた（import 漏れ）。1 コマで例外が出ても戦闘のループが止まらないようにし、やり直しで真っ暗になるのも直した

### Changed — SPEC-128 (= Signature Skill Goes to Lv.15; Leftover CE Flows Into It at Stage End Instead of Carrying Over (Gift Tickets Still Carry)) — merged in #163
- **固有スキルを 15 段に・残った CE は固有スキルへ** (`js/battle/signature.js` + `js/battle/shop.js` + `js/battle/stage-transition.js`): Lv.11〜15 を足した（24,000〜120,000 CE）。ステージの終わりに財布の CE を固有スキルへ自動で振り、端数は次の段への積み立てに。CE は持ち越さず、ギフト券は持ち越す

### Changed — SPEC-127 (= Gift Tickets Needed Scale With Rarity — Common/Uncommon 1, Rare 2, Epic 3, Legendary 5) — merged in #162
- **ギフト券の枚数に傾斜** (`js/constants.js` + `js/battle/shop.js`): Common・Uncommon 1 枚、Rare 2 枚、Epic 3 枚、Legendary 5 枚（Legendary も券で買える）。値札に枚数を出す。5 枚並ぶ店で説明が 2 行で切れていたのも直した

### Changed — SPEC-126 (= Wording — Replace "ただ" With "無料" (Shop Reroll, Gift Ticket, Merchant Line, Help)) — merged in #161
- **「ただ」を「無料」に** (`data/i18n/ui.json`): ショップのリロール「リロール（無料）」、ギフト券の説明、ヴァスコ・ダ・ガマのひとこと、遊び方

### Changed — SPEC-125 (= Mission Rewards Become a Choice of Three — Gift Ticket, a Giver-Themed Boon, or Healing — After a Line From the Giver) — merged in #160
- **ミッションのごほうびを 3 つから選ぶ** (`js/battle/missions.js` + `css/missions.css`): 達成すると出し手がひとこと言い、ギフト券・力添え（出し手で変わる一時的な強化かお助けアイテム）・HP 回復から 1 つ選ぶ。大きさはミッションの重さで変わる

### Fixed — SPEC-124 (= Closing Hero Select Without Picking Returns to Mode Select (Was Stuck on an Empty Battle Screen)) — merged in #159
- **ヒーロー選択を ✕ で閉じると進めなくなる不具合を直した** (`js/main.js`): 選ばずに閉じたら（✕・背景・Esc）モード選択へ戻す

### Changed — SPEC-123 (= Signature Skill Goes to Lv.10 With Steep Prices; Extensions Rare 500 / Epic 2,000 / Legendary 10,000) — merged in #158
- **固有スキルを 10 段に、エクステの値段に傾斜を** (`js/battle/signature.js` + `js/constants.js`): 固有スキルは Lv.10 まで（Lv.2〜10 で 40〜16,000 CE）。エクステは Rare 500 / Epic 2,000 / Legendary 10,000 / LL 20,000 CE

### Changed — SPEC-122 (= Shop Prices Tuned So a CE-Maxed, Efficient Run Just Maxes Everything by the 6th Shop — Lv.4 300 / Lv.5 1500 / LL 3000) — merged in #157
- **値段を「CE のスキル最大・取りこぼしなしで 6 回目の店にぎりぎり全部最大」に** (`js/constants.js`): 行き先 Lv.4 / Lv.5 / LL を 300 / 1,500 / 3,000 CE に（SPEC-121 の 800 / 4,000 / 10,000 から）。ブラウザでステージ 1 を通して測った

### Changed — SPEC-121 (= Shop Prices Jump at Epic — Lv.4 800 / Lv.5 4000 / LL 10000 CE) — merged in #156
- **Epic から値段を一気に** (`js/constants.js`): 行き先 Lv.1〜5 を 15 / 30 / 80 / 800 / 4,000、LL を 10,000 CE に（前は 15 / 25 / 40 / 60 / 90 / 150）。4 回目の店で買い占めできていたため

### Changed — SPEC-120 (= Shop Corner Icons — Lock (Top-Right) and Two-Tap Ban (Top-Left), Full Descriptions, Integer Heal, Reroll Refills Sold Slots) — merged in #154
- **ショップの取り置き・お断りを札の角に** (`js/battle/shop.js` + `css/shop.css`): 右上の 🔓 で取り置き（🔒 と枠線）、左上の ✕ は 2 回押しでお断り。説明は削らず全文、来店の回復は整数、リロールは売れた枠も補充。お断りが効いていなかった不具合を直した

### Changed — SPEC-119 (= Shop Fits One Screen on Phones — Equipped + Wallet on One Row, Boss Count Beside the Merchant, Compact Cards) — merged in #152
- **スマホのショップを 1 画面に** (`css/shop.css` + `index.html`): 装備中と手持ちの CE を 1 行（8:2）に、「（あと◯回でボス）」を商人の名前の横に。札を低くし、5 枚は 3 列。スクロールなしで収まる

### Fixed — SPEC-118 (= Skill Tree Wording for the Shop (XP → CE, Head Start / Pass Reward / Prodigy) and Unclipped Title Badge) — merged in #150
- **スキルツリーの文を CE に** (`js/skill-data.js` + `js/perks.js`): 「経験値」→「拾う CE」、先手・見送りの礼・天才の説明をショップの言葉に。タイトルのスキルツリーの数の札と NEW が欠けていたのを直した

### Changed — SPEC-117 (= Shop Goes Live — Header Countdown Bar with the Next Merchant Walking In, HP Heal on Each Shop Visit, Shop On by Default (RTA Keeps Level-Ups)) — merged in #149
- **ショップを本番に** (`js/battle/shop.js` + `js/battle/shop-logic.js`): ショップが既定で ON（RTA は今までどおりレベルアップ）。ヘッダーに「次の店まで」の帯（次に来る商人が左から右へ歩き、残り 10 秒で金色に脈打つ）。来店で最大 HP の 1 割が戻る

### Added — SPEC-116 (= Mine Guides to the Skill Tree After a Defeat — First-Time Lead-In, Three Rotating Lines, Tree Intro; Voice Script) — merged in #146
- **倒れたらマインちゃんがスキルツリーへ誘う** (`js/battle/gameover.js` + `js/navi.js`): 初回は「スキルツリーへ」を押すよう誘い、木では強化のしかたと「ずっと引き継がれる＝遊ぶほど強くなる」ことを説明。2 回目からは 3 つのひとことを順に。ボイスの台本は `docs/voice/script-added2.csv`
- **ボイス 13 本** (`assets/voice/mine/` + `js/voice-lines.js`): 倒れたときのひとことと、スキルツリーの案内をフルボイスに。スキルツリーの文の「節」は「スキル」に
- **ボイスの録り直しと最初の店の説明のボイス** (`assets/voice/mine/`): 「緑に光っているのが強化できるスキルだよ」に差し替え、最初の店の説明（SPEC-115）にボイス。元の WAV・TXT は外した

### Changed — SPEC-115 (= Shop Onboarding — First Shop Explains CE and Gives One Free Item; Countdown to the Next Shop) — merged in #145
- **最初の店のサービスと次の店までの秒（`?shop=1` のときだけ）** (`js/battle/shop.js`): 最初の店でマインちゃんが「CE を集めて買う」ことを説明し、1 品ただ。2 回目からは戦場の右上に「ショップまで ◯ 秒」

### Fixed — SPEC-114 (= Sound Effects on Web Audio — Fix SEs (Defeat Jingle, Shop Purchases) Going Silent After Long Fights) — merged in #144
- **SE が鳴らなくなる不具合** (`js/audio.js`): 鳴らすたびに `<audio>` を作っていたため、長い戦闘のあとブラウザの上限に当たり、敗北のジングルやショップで買ったときの音が鳴らなくなっていた。SE を Web Audio で鳴らすようにした

### Added — SPEC-112 (= Missions — Shadow Heroes Offer Mid-Wave Challenges (Accept / Decline), Hero-Themed Effects, Rewards That Feed the Shop) — merged in #151
- **ミッション** (`js/battle/missions.js` + `css/missions.css`): ウェーブの途中にシャドーヒーロー 10 人がミッションを持ちかける（人中に呂布あり・霧の夜・三段撃ち・女王の威光・不老不死の探求・東方遠征・四面楚歌・白衣の誓い・不可能の文字はない・乱世の奸雄）。受けるか断るかを選び、生き残れば CE・ギフト券・固有スキル ＋1 段・お断り ＋1 回。失敗しても罰は無い

### Changed — SPEC-111 (= RTA Uses the Shop Too (Same Regulation v4) — Shop and Missions in Every Mode) — merged in #153
- **RTA でもショップ** (`js/battle/index.js`): RTA もレベルアップではなくショップで遊ぶ（ミッションも出る）。レギュレーションは v4 のまま

### Added — SPEC-110 (= Signature Skill Upgrade — A Permanent Shop Card (Lv.1 → Lv.5) Kept Across Stages) — merged in #143
- **固有スキルの強化（`?shop=1` のときだけ）** (`js/battle/signature.js` + `js/battle/shop.js`): ショップに常設の札。CE で Lv.1 → Lv.5 に上げると、10 人それぞれの固有スキルが伸びる（クリプトスラッシュの威力 ×3・テスラコイルの連鎖 7 体・幻の生存者は 2 度耐える など）。挑戦のあいだステージをまたいで残る

### Added — SPEC-109 (= Shop — Buy Extensions with CE from Merchant Shadow Heroes (Hold, Ban, Reroll, Gift Tickets) behind ?shop=1) — merged in #142
- **ショップ（`?shop=1` のときだけ）** (`js/battle/shop.js` + `js/battle/shop-logic.js` + `css/shop.css`): レベルアップの代わりに一定時間ごとに店が開き、拾った CE で品を買う。店主は商人のシャドーヒーロー 6 人（半額・5 枚・強化が多い・新しい品が多い・リロール 1 回ただ・海賊の値段）。取り置き・お断り（1 挑戦 3 回）・リロール（ただの回数のあとは CE）。マジックカードはギフト券に
- **クリプトスラッシュ** (`js/battle/gems.js`): レベルアップのたびに出るはずの一撃が出ていなかったのを直した

### Added — SPEC-108 (= Crown Series — A Buff Extension That Raises the CE You Pick Up) — merged in #141
- **クラウンシリーズ** (`data/extensions.json` + `js/battle/buffs.js` + `js/battle/gems.js`): 強化の 11 種目。クラウン → エリートクラウン → ウィズダムクラウン → 宝冠 → 冕冠 で、拾う CE が ×1.15〜×2.0

### Added — SPEC-107 (= Threat Tiers — Stronger Enemy Types Join as Stage Kills Rise; Stronger Enemies Drop More CE) — merged in #140
- **敵の段階と新しい 5 つの型** (`js/battle/threat.js` + `js/battle/enemies.js` + `js/battle/render.js`): そのステージの撃破数（150・400・800・1,500）で、巨大・疾走・連射（5 方向）・横断（一直線に横切る列）・精鋭（金）が混じる。強い型ほど CE が多い（×2〜×10）。段階が上がると上部に「敵が強くなった」

### Changed — SPEC-106 (= LL Unlock — The LL Rank-Up Appears Only After Clearing All Stages With That Hero) — merged in #139
- **LL の解放条件** (`js/meta.js` + `js/battle/levelup.js` + `js/main.js` + `js/battle/activity-report.js`): LL ランクアップは、そのヒーローで全ステージをクリアしたことがあるときだけ（モードは問わない）。ヒーローの選択画面に条件、初めて全クリアしたら活動レポートで「LL 解放！」

### Added — SPEC-105 (= Kill Milestones — A Big Banner at 100 / 250 / 500 / 1,000 Kills Without Stopping Play) — merged in #138
- **撃破数の節目の演出** (`js/battle/milestones.js` + `index.html` + `css/battle-ui.css`): 通算 100・250・500・1,000…体で、画面の上に大きな「1,000 体撃破！」。遊びは止めない

### Added — SPEC-104 (= Resume Countdown — 3 Seconds Before Play Resumes After Any Pausing Screen) — merged in #137
- **再開の 3 秒カウントダウン** (`js/battle/resume-countdown.js` + `js/battle/index.js` + `index.html` + `css/battle-ui.css`): レベルアップ・メニュー・設定などを閉じたら「再開まで 3・2・1」を出し、数え終えてから動き出す（戦況が分からないまま倒されないように）

### Changed — SPEC-103 (= v1.6 Shop & Missions — Buy Skills with CE, Merchant Shadow Heroes, Signature Upgrades, Missions, Enemy Tiers, Kill Milestones (Design & Roadmap))
- **v1.6 の設計とロードマップ（下書き）** (`docs/specs/SPEC-103-shop-mission-roadmap.md`): ウェーブごとのショップ（CE で買う・商人のシャドーヒーロー・取り置きとお断り）、固有スキルの強化、LL の解放条件、クラウンシリーズ、ミッション、敵の段階と新しい型、撃破数の節目の演出。作者の確認待ち

### Changed — SPEC-102 (= CE Suction — Crystals Fly Into the Hero Instead of Vanishing)
- **CE がヒーローに吸い込まれるようにした** (`js/battle/absorb.js` + `js/battle/gems.js` + `js/battle/render.js` + `js/audio.js`): 拾える範囲に入った CE は、 その場で消えずにヒーローへ飛んでいき（最初はゆっくり、 だんだん速く。 小さくなりながら光の尾を引く）、 届いた瞬間に経験値が入る。 続けて届くと音が少しずつ高くなる。 棒磁石は画面の CE をまとめて吸い込む。 「演出を減らす」ではいままでどおりその場で拾う
- **テスト** (`tests/absorb.test.mjs`): 届くまでの時間・加速・ヒーローが動いても届くこと・音の高さ、 tickGems の流れ（届いてから経験値・棒磁石・演出を減らす）

### Added — SPEC-101 (= LL Rank-Up — The Hero's Own Weapon Can Go Beyond Legendary)
- **初期武器の LL ランクアップ** (`data/extensions.json` の `ll` + `js/battle/levelup.js` + `js/battle/extensions-as-weapons.js` + `js/extensions.js`): ヒーローの初期武器が Lv.5 になると、 レベルアップの 1 枚目に虹色の「LL ランクアップ」の札。 10 系列すべてが自分の LL 版（真・MCHブレード・モデル２・真・赤目四十八滝・真・メギド・真・アゾット・レスター手稿・真・ミョルニル・真・ジュエルパロット・真・絶対零度ゴールデンスノーマン・真・自由のホーキ）を持つ
- **壊れ性能** (`js/battle/ll.js` + `js/battle/archetypes.js`): 数・ダメージ・貫通・大きさを大きく上げ、 真・MCHブレードは周り一帯への一撃、 真・ミョルニルは雷、 真・絶対零度ゴールデンスノーマンは凍らせる
- **見せ方**: 選んだ瞬間に LL の品の絵を大きく出す。 ヒーローの選択画面に「Lv.5 のあと LL：◯◯」。 装備中の帯は「LL」
- **テスト** (`tests/ll-rank-up.test.mjs`): 10 系列の LL 版・Lv.5 より強いこと・札が出る条件・雷の的

### Added — SPEC-100 (= Hero Signature Skills — Same Stage, a Different Game for Each Hero)
- **ヒーローごとの固有スキル** (`js/battle/signature.js` ほか): 名前は MCH のパッシブスキル名。 クリプトスラッシュ（レベルアップで周りをなぎ払う）・ワンホールショット（同じ敵ほど痛い）・忍術・毒霧（走った跡に霧）・ランゲルライン（近いほど痛い）・テスラコイル（連鎖する雷）・テトラクテュス（4 回目ごとに 2 段）・虎痴（HP が減るほど強く速く）・女王直属海賊（拾うと速く広く）・幻の生存者（1 ステージに 1 度、 倒れない）・李氏朝鮮、宮廷医女（少しずつ回復・回復アイテム倍）
- **ヒーローの選択画面に固有スキルの名前と説明** (`js/main.js` + `index.html` + `data/heroes.json` の `passive`)
- **テスト** (`tests/signature.test.mjs`): 倍率の計算・テスラの的・10 人それぞれの効き目

### Added — SPEC-099 (= Hero Select — Radar Chart of Each Hero's Strengths)
- **ヒーローの選択画面にレーダーチャート** (`js/hero-radar.js` + `js/main.js` + `index.html` + `css/components.css` + `css/chars.css`): 体力・攻撃・連射・速さ・射程の 5 軸を、 10 人の中での位置（1〜5 の 5 段）で。 軸の横に生の値。 属性の色で塗り、 前の挑戦で使ったヒーローの形を点線で重ねる。 ロック中のヒーローも見られる。 戦闘と同じ式（`js/hero-stats.js`）から
- **テスト** (`tests/hero-radar.test.mjs`): 5 段の計算・戦闘と同じ式・射程の取り方・SVG と読み上げの文

### Added — SPEC-098 (= Hero Unlock by bearko.games Achievements — 2 Starters, 4 in Survivor, 4 in Other Titles)
- **ヒーローをアチーブメントで解放するようにした** (`js/hero-unlock.js` + `js/platform.js`): 最初はブレード（MCHウォーリアー）とリボルバー（ビリー・ザ・キッド）の 2 人。 本作のアチーブメントで 4 人（霧隠才蔵・アナスタシア・ジャックザリッパー・ニコラ・テスラ）、 ほかのタイトルのアチーブメントで 4 人（Education でピタゴラス・Workshop で大長今・Fortress で許褚・Factory でフランシス・ドレーク）。 bearko.games から読み、 この端末にも覚える。 本作の 4 人は通信できなくても解放される
- **ロック中のヒーローの見せ方** (`js/main.js` + `index.html` + `css/components.css`): 影絵と 🔒、 押すと「どのタイトルの、 どのアチーブメントで仲間になるか」と、 ほかのタイトルなら「このゲームを遊ぶ ↗」。 見出しの右に「解放 n / 10」
- **タイトルに「次の仲間」**: いちばん近い 1 人と、 その条件
- **解放の知らせ**: 「◯◯ が仲間になった！」をどの画面でも上に出し、 専用の短いファンファーレ（knight.mp3）を鳴らす
- **テスト** (`tests/hero-unlock.test.mjs`): 2 ＋ 4 ＋ 4 の割り当て・解放の判定・次の仲間の順・覚える・SDK が無いとき

### Changed — SPEC-097 (= Hero Roster v2 — 10 Heroes Matched to Their Weapons, 4 Weapon Series Replaced, PHY/INT Take Effect)
- **ヒーローの顔ぶれを武器に合わせて組み直した** (`data/heroes.json` + `js/constants.js`): MCHウォーリアー＝ブレード、 ビリー・ザ・キッド＝リボルバー、 霧隠才蔵＝手裏剣、 アナスタシア＝雪だるま、 ジャックザリッパー＝ナイフ、 ニコラ・テスラ＝レーザーガン、 ピタゴラス＝ブック、 大長今＝ホーキ、 許褚＝マレット、 フランシス・ドレーク＝パロット
- **武器の 4 系列を、 LL 版のある系列に差し替えた** (`data/extensions.json`): アックス → マレット、 モアイ → パロット、 ピエロ → 雪だるま、 パンジャンドラム → ホーキ。 攻撃の型と数値はそのまま。 雪だるまは氷の色で、 置いたときの範囲も系列の色で描く
- **PHY と INT が効くようにした** (`js/hero-stats.js` + `js/battle/weapons.js`): PHY は武器のダメージ（×0.88〜×1.13）、 INT は武器の間隔（×1.09〜×0.90）
- **ヒーローの札に初期武器** (`js/main.js` + `css/components.css`): 札の左上に武器のアイコンと系列の名前（狭い画面はアイコンだけ）
- **マインちゃんのひとこと** (`data/i18n/ui.json` + `js/navi.js` + `assets/voice/mine/` + `tools/voice/build.mjs`): 10 人ぶん書き直し、 新しい 9 人のボイスを足した（許褚は録り直し）。 追加の録音は `--added` で変換する
- **テスト** (`tests/hero-roster.test.mjs` ほか): 組み合わせ・差し替えた系列・PHY / INT の式

### Added — SPEC-096 (= bearko.games Achievements — 14 IDs for the Hero Book and Extensions (Platform SPEC-008))
- **bearko.games のアチーブメントを 12 個足した** (`js/platform.js` + `js/main.js` + `js/battle/stage-transition.js` + `js/battle/index.js` + `js/battle/field.js`): 共通基盤のトロフィーがアチーブメント（ヒーロー名鑑・エクステンション）に組み直されたのに合わせ、 ステージ 2 のクリア・ステージ 3 到達・ファオ撃破・ボス 3 体撃破の全クリア・RTA 完走・ABSOLUTE ×2.0 以上の全クリア・宝箱を初めて開ける（その場で）と、 スキルツリーの覚醒・節 5 つ・奥義・初めてのボス撃破・挑戦 10 回（セーブから。 起動時にも）を送る。 1 つずつ順に、 同じ起動で同じものは 1 度だけ
- **テスト** (`tests/platform.test.mjs`): 条件 → ID の対応と、 送る列（順に送る・2 度送らない・SDK がなくても止まらない）

### Security — SPEC-095 (= Ranking API URL Hardening — GAS Web App Only, No Hash Override) — merged in #125
- **ランキングの送り先を固くした** (`js/ranking-client.js` + `js/ranking-ui.js`): `#api=` のリンクで送り先を書き換える機能をやめ、 送り先は Google Apps Script のウェブアプリの URL だけを受け付ける。 GAS のサンプルに、 名前の数式インジェクション対策

### Changed — SPEC-094 (= Skill Tree Detail UI — Workshop-style Detail, 3D Gradient Buttons, Reset Moved Out of Reach, Zoom Tools) — merged in #124
- **スキルツリーの詳しい欄** (`js/skill-tree.js` + `css/skill-tree.css`): Workshop の作りに寄せた。大きなアイコン・段の目盛り・条件の ✓／✗・「前 → 後」の変化の一覧。解放は金、強化は緑の立体のグラデーションのボタン。幅 900px 以上は右の列に詳しい欄といまの効果を並べる
- **操作の置き場所**: 「中心へ」と −／＋ は木の左下。「作り直す」は押しやすい右下から外し、いまの効果の欄のいちばん下に小さなリンクで（押すと確かめる）

### Changed — SPEC-093 (= Skill Tree UX — Tighter Layout, Current-Effect Panel, First-Time Guide by Mine, Per-Screen Lines) — merged in #123
- **スキルツリーを詰めた** (`js/skill-data.js`): 節と節の距離をほぼ半分に（木の半径 832px → 約 470px）。 1 画面に見える節が増える。 節の大きさはそのまま
- **いまの効果の欄** (`js/skill-tree.js` + `js/perks.js` + `css/skill-tree.css`): 木の右に、 スキルツリーで足されている数値（攻撃 ＋9%・CD −4% など）。 節を選ぶと買ったあとの値（＋9% → ＋12%）。 狭い画面は右上の札で開け閉め
- **初回の案内** (`js/skill-logic.js` + `js/navi.js`): 根を取るまで、 タイトルと結果の画面の入口が脈打ち「NEW」。 マインちゃんがタイトルで入口を教え、 木の中では「ここを 2 回！」で根 → 最初の節を指し示す
- **画面ごとのセリフ** (`js/battle/gameover.js`): 結果の画面から「スキルツリーへ」で移るとき、 タイトルのセリフ（ボイス）を流さず、 木のセリフを言う。 木を閉じたらタイトルのセリフ

### Added — SPEC-092 (= Shared Player Avatar — Entry in Settings (Platform SPEC-005)) — merged in #122
- **bearko.games 共通のアイコンへの入口** (`js/platform.js` + `js/settings-ui.js` + `index.html` + `data/i18n/ui.json`): 設定に「🙂 アイコン — 変える」。 押すと共通基盤の選ぶ窓（SDK 1.7.0）が開き、 すべてのゲームとチャットで同じ絵になる。 SDK が読めていないときは行を出さない

### Added — SPEC-091 (= Global Chat Placement — Show on Title and Results, Hide During Battle (Platform SPEC-004)) — merged in #121
- **全体チャットの置き場所** (`js/platform.js` + `js/main.js` + `js/menu.js` + `js/battle/index.js` + `js/battle/gameover.js` + `js/battle/activity-report.js`): 共通基盤の全体チャット（SPEC-004・SDK 1.6.0）の 💬 を右上に置き、 タイトル・難易度・ヒーロー選択・結果の画面で出して、 戦闘中と読み込みの画面では隠す。 SDK がない・古いときは何もしない

### Added — SPEC-090 (= Skill Tree — Permanent Upgrades Bought with GUM (from Score) and Gold Dust (from Bosses)) — merged in #114
- **GUM とゴールドダスト** (`js/meta.js` + `js/meta-ui.js` + `js/battle/stage-transition.js` + `js/battle/gameover.js` + `js/battle/activity-report.js`): 挑戦が終わるたび（全クリア・敗北）、 活動レポートと同じ式のスコアから GUM ＝ √スコア ÷ 2（最低 5）。 ボスを倒すとステージ 1/2/3 で 1/2/3 のゴールドダスト。 結果の画面（ステージクリア・ゲームオーバー・活動レポート）に数え上げで出す。 `localStorage["mcs.meta.v1"]` に貯まる（ツリーは SPEC-090b）
- **スキルツリーの画面** (`js/skill-data.js` + `js/skill-logic.js` + `js/skill-tree.js` + `css/skill-tree.css`): 根から 6 本の道（生存・攻撃・機動・成長・財宝・ボス）が放射状に伸びる木。 36 節 ＋ 根。 つまんで動かす・2 本指で拡大縮小・ホイールで拡大、 押すと選ぶ・2 度押しで買う。 根（0 GUM）を取ると 1 段目が飛び出す。 奥義はその道の節を 4 つ取ると買える（GUM ＋ ゴールドダスト）。 「作り直す」で全額戻してやり直せる。 入口はタイトルの「スキルツリー」（1 回も遊んでいなければ出さない。 買える節があれば数の札）と、 ゲームオーバー・活動レポートの「スキルツリーへ」。 効果は SPEC-090c で
- **スキルツリーの効果** (`js/perks.js` + `js/battle/hurt.js` + `js/battle/buffs.js` + 戦闘の各所): 取った節が挑戦に効く。 最大 HP・攻撃・CD・範囲・貫通・弾数・速さ・拾う範囲・無敵時間・経験値・リロール・開始レベル・枠・スキップの回復・GUM・壺・宝箱・レアの間隔・パンケーキ・不死鳥・雷鼓・ボス戦の宝箱・予告・対ボスのダメージ。 強化エクステンションはツリーの土台に掛かる。 自分が受けるダメージを `hurt.js` の 1 か所に集めた。 RTA では効かない。 ヒーロー選択に、 いま効いているものを 1 行。 「壁ぎわ」は「逃げ足」（無敵時間のあいだ速い）に差し替え
- **釣り合いの実測**（SPEC-090d）: 自動プレイでツリーを空 / 半分 / 全部にして測った（§3.5）。 全部で bot の生存が 1.4 倍、 3 回に 1 回ステージ 1 を抜ける。 費用と効果は変えない

### Fixed — SPEC-089 (= Stage Intro Band — PC Layout (Centered Content, 192px Hero)) — merged in #117
- **PC でステージの始まりの帯のレイアウトを直す** (`css/chars.css`): 960px 以上では帯の中身を真ん中の 560px に寄せ、 ヒーローを 192px（64 の 3 倍）にした。 1280px で文字とヒーローがおよそ 740px 離れ、 ヒーローが端に小さく立っていた。 スマホの並びと動きは変えない

### Changed — SPEC-088 (= First Play Is NORMAL Only — ABSOLUTE and RTA Locked Until One Run Ends) — merged in #116
- **初プレイは NORMAL だけ** (`js/played.js` + `js/mode-select.js` + `js/battle/gameover.js` + `js/battle/activity-report.js` + `index.html` + `css/components.css`): この端末で 1 回も挑戦を終えていないあいだ、 ABSOLUTE と RTA の札を薄くして押せなくし、 「🔒 NORMAL を 1 回遊ぶと選べるようになる」 の 1 行を出す。 クリアかゲームオーバーで `mcs.played` に記録し、 次にモード選択を開いたときから選べる

### Added — SPEC-087 (= Level-up Screen — Equipped Strip and "Rank Up" Highlight on Owned Candidates) — merged in #115
- **強化画面に「装備中」の帯と「ランクアップ」の印** (`js/battle/levelup.js` + `index.html` + `css/components.css` + `css/battle-ui.css`): 3 枚の札の上に、 持っている武器と強化を絵と Lv（Lv.5 は MAX）で並べ、 上限までの空き枠を点線で見せる。 持っているものが上がる札は、 アイコンの上の金の帯「ランクアップ」（次で Lv.5 なら「ランクアップ MAX」）と金の縁で目立たせる。 NEW の札はいままでどおり

### Changed — SPEC-086 (= Hero Select Preview — Fewer Enemies (1 / 2 / 3 Every 2 Seconds)) — merged in #110
- **ヒーロー選択のプレビューの敵を減らす** (`js/hero-preview.js`): いちばん弱い雑魚を、 2 秒ごとに Common 1 体・Uncommon 2 体・Rare 3 体だけ出す（いままでは 9 体をいつも保っていた）

### Added — SPEC-085 (= Mine Full Voice — Title Call, Every Line Voiced, Voice Volume) — merged in #111
- **マインちゃんのフルボイス** (`js/voice.js` + `js/voice-lines.js` + `assets/voice/mine/` + `js/navi.js` + `js/main.js` + `js/settings.js`): 全セリフ（35 本）にボイス。 ロゴ画面を押すとタイトルコール「マイクリプト サバイバー！」。 設定に「ボイス」の音量。 ヒーローを選んだときのセリフを、 ヒーローごとの紹介に変えた

### Fixed — SPEC-084 (= Gentler Early Swarm — the Spawn Ramp Starts Slow, Recycling Only Before the Boss) — merged in #106
- **序盤の湧きを v1.2 並みに戻す** (`js/battle/horde.js` + `js/battle/enemies.js` + `js/constants.js`): SPEC-078 で、 湧きがはじめからまっすぐ速まり（ステージ 1 の 1:00 で 2.6 倍）、 置いていった敵もすぐ前に現れなおしていた。 速まりと密度の目標を、 はじめはゆるく、 ボスの前に急に上がる形にし、 寄せ直しはボスの前（2:50 ごろから）だけにした。 ボスの直前の濃さは変えない

### Added — SPEC-083 (= Hero Select — Preview of the Starting Weapon (Common → Uncommon → Rare)) — merged in #104
- **ヒーロー選択で武器のプレビュー** (`js/hero-preview.js` + `index.html` + `css/chars.css` + `js/main.js`): 選んで 1 秒たつと、 見せ場でヒーローが最初の武器で戦う。 Common → Uncommon → Rare を 3 秒ずつ（左上にレアリティと武器の名前）。 流し終えると大きな絵に戻り、 3 秒してまた流す。 本番の武器のコードを別の小さな戦場で動かす（撃破数・CE・効果音には触れない）

### Changed — SPEC-082 (= Measure v1.3 on New Versions — Total Score balance 3 and RTA v4) — merged in #112
- **v1.3 を新しい版で計る** (`js/platform.js` + `index.html`): 総合スコアに `balance: 3` を送る（共通基盤が 1/560 で割る。 ふつうの全クリア約 280 万点 → 5,000）。 RTA は `survivor-normal-v4`・`survivor-absolute-2x-v4` で計る（最短時間は v3 と同じ）。 古い記録は古い版のまま

### Added — SPEC-081 (= Boss Chests — Golden Moai Chests in the Arena with Magic Cards and Helper Items) — merged in #109
- **ボス戦の宝箱** (`js/battle/field.js` + `js/constants.js`): ボスが出て 6 秒たつと、 枠の中にゴールデンモアイの宝箱が出る（14 秒ごと・2 つまで）。 壊すとマジックカード（その場でレベルアップ）・パンケーキ・雷鼓・棒磁石のどれかと CE。 マジックカードが出るのはボス戦の宝箱だけ。 懐中時計は出ない

### Changed — SPEC-080 (= Stronger Bosses — More HP, a Telegraphed Charge, Slam, Burst and Spiral) — merged in #108
- **ボスを強く** (`js/battle/boss-moves.js` + `js/battle/boss-moves-render.js` + `js/battle/enemies.js`): HP を 20 / 20 / 15 倍にし、 予告つきの型を足した。 突進（自分のほうへ赤い通り道が伸び、 向きが固まってから枠の縁まで走る）・叩きつけ（赤い円が満ちたら衝撃）・放射・渦。 HP が半分を切ると型が速く来る

### Changed — SPEC-079 (= Boss Arena — Swarm Vanishes, a 1/4 Ring Closes In, Boss Spawns at the Center) — merged in #107
- **ボスはステージの真ん中に** (`js/battle/arena.js` + `js/battle/arena-render.js` + `js/battle/enemies.js`): 予告のあいだ、出る場所に赤い丸（と、これから閉じる枠の点線）。画面の外なら縁に赤い矢印
- **ボスが出るとほかの敵が消える** (`js/battle/enemies.js`): 撃破に数えず CE も落とさない（落ちている CE は残る）。ボス戦のあいだは敵が湧かない
- **ボス戦の枠** (`js/battle/arena.js` + `js/battle/player.js` + `js/battle/gimmicks.js`): ステージの真ん中に 1/4 の広さの枠が閉じてくる。外は暗く、縁は赤く光る。カメラも枠の中を映す

### Changed — SPEC-078 (= Dense Swarm — the Screen Fills Before the Boss (50% / 75% / 90%)) — merged in #105
- **敵の湧きを大幅に** (`js/battle/horde.js` + `js/battle/enemies.js` + `js/constants.js`): 大群をどのステージにも（湧きが 12〜20 倍まで速まり、 群れが押し寄せる）。 画面の敵の密度を、 時刻ごとの目標まで足し続ける（強い武器でまとめて倒しても、 すぐ埋め戻す）。 置いていかれた敵は画面のすぐ外へ寄せ直す。 出ていられる敵は 320 / 440 / 600。 ボスの直前に画面のおよそ 50% / 75% / 90% が敵で埋まる

### Changed — SPEC-077 (= Bigger Characters and a Subtle Hit Disc) — merged in #103
- **キャラを大きく** (`js/constants.js` + `js/battle/index.js` + `js/battle/enemies.js`): 自分・雑魚は 1.4 倍、ボスは 1.2 倍（絵も当たりも）。視界はそのまま
- **当たりの円を薄く** (`js/battle/sprites.js` + `js/battle/render.js`): 円の切り抜きと黒い縁をやめ、絵を大きく描き、足もとに薄い円（自分はシアン、撃ってくる敵は赤い縁）。自分は動く向きへ少し傾いて弾む

### Changed — SPEC-076 (= Treasure Chest Art — Golden Moai of Treasure) — merged in #102
- **宝箱の絵をゴールデンモアイに** (`js/constants.js` + `js/battle/render.js`): 1165 オルゴール → 5106 財宝ゴールデンモアイ（作者の指定）

### Changed — SPEC-075 (= Abacus Beads — Spheroidal Graphite Art and Rows in Any Direction) — merged in #101
- **そろばんの珠の絵** (`js/battle/gimmicks.js` + `js/battle/gimmicks-render.js`): 5042 球状黒鉛（グラファイトの Legendary）にし、転がって回る
- **珠の列の向き** (`js/battle/gimmicks.js` + `js/battle/gimmicks-render.js`): 横だけでなく縦にも、1:30 からは斜めにも走る（最初の列は横）。予告の帯と矢印も列の向きに

### Changed — SPEC-074 (= Treasure Chest Uses an MCH Extension Art (Music Box)) — merged in #100
- **宝箱の絵** (`js/constants.js` + `js/battle/render.js`): 手描きの金の宝箱の形をやめ、マイクリのエクステンション 1165 オルゴール（木の箱）にした。絵を読み込むまでは金の宝箱の形

### Changed — SPEC-073 (= Panjandrum Spins While Rolling Toward Enemies) — merged in #99
- **パンジャンドラムが回りながら進む** (`js/battle/archetypes.js` + `js/battle/projectiles.js` + `js/battle/render.js`): 転がるように回る（右へは時計回り、左へは反時計回り。1 秒に約 1.6 回転）。当たりや速さは変えない

### Changed — SPEC-072 (= Level-up — Skip on the Left (Muted), Reroll on the Right (Prominent)) — merged in #98
- **レベルアップのボタン** (`index.html` + `css/components.css`): 左にスキップ（灰色で控えめ）、右にリロール（金で目立つ）。スマホで右を押しがちなので、誤ってスキップしにくくする

### Changed — SPEC-071 (= Boss Warning 10s Ahead and Countdown at the Right Edge in RTA) — merged in #97
- **ボスの予告を 10 秒前に** (`js/constants.js`): 30 秒前 → 10 秒前（3:50 に予告、0:10 から数える）
- **RTA ではカウントダウンを右端に** (`js/battle/fx.js` + `css/battle-ui.css`): たたんだ帯を右端に縦積みにし、上の真ん中の RTA の時計と重ねない

### Changed — SPEC-070 (= Logo Remake — Transparent, Centered Stack) — merged in #96
- **ロゴの作り直し** (`assets/logo.png` + `css/layout.css`): 暗い四角の帯をやめ、背景の透けたロゴを縦に積んで中央にそろえた（エンブレム・MYCRYPTO・SURVIVORS・点線）。縦の短い画面では小さく
- **ロゴの元** (`tools/logo/logo.html` + `tools/logo/emblem.png`): HTML から書き出して作り直せる

### Changed — SPEC-069 (= Screen BGM (Title craft.mp3), Tap-to-start Gate and Reliable Sound Start) — merged in #95
- **画面ごとの BGM** (`js/constants.js` + `js/ui-sound.js` + `js/main.js` + `js/mode-select.js` + `js/menu.js` + `js/battle/gameover.js`): タイトルは craft.mp3、モード選択・ヒーロー選択は land.mp3。曲は押した操作の中で替える
- **「タップしてはじめる」** (`index.html` + `js/main.js` + `css/layout.css`): ブラウザが音を止めたときだけ、読み込みのあとに 1 回タップを挟み、タイトルで最初から BGM を鳴らす
- **音の鳴らし始めの見直し** (`js/audio.js` + `js/ui-sound.js`): BGM の要素を使い回し、止められたら次の操作（指を離した・クリック・キー）で鳴らし直す。iOS で BGM が始まらないおそれをなくす
- **ボタンの音を大きく** (`js/ui-sound.js`): crash.mp3 の音量 0.45 → 1.0（元の音が小さく、BGM に埋もれていた）

### Added — SPEC-068 (= Mine's First-time Tips) — merged in #94
- **マインちゃんの「初めて」のひとこと** (`js/navi-tips.js` + `js/battle/field.js` + `js/battle/magic-cards.js` + `js/battle/gimmicks.js` + `js/battle/enemy-shots.js`): 初めて拾ったアイテム・初めて動いた仕掛け・初めて狙ってきた撃つ敵で、画面の上でひとこと補足する。端末に覚えて、次からは黙る
- **設定「マインちゃんの補足」** (`index.html` + `js/settings-ui.js`): 「もう一度聞く」で、また初めてのときに話す

### Changed — SPEC-067 (= Level-up Reroll Without Repeats and Skip) — merged in #93
- **リロールで同じものを続けて出さない** (`js/battle/levelup.js`): そのレベルアップで出したものは、候補が足りるかぎり出さない
- **スキップ（取得しない）** (`js/battle/levelup.js` + `index.html` + `css/components.css`): どれも要らなければ、取らずに閉じられる

### Changed — SPEC-066 (= Measure v1.2 on New Versions — Total Score v4 (balance 2) and RTA v3) — merged in #92
- **v1.2 を新しい版で計る** (`js/platform.js` + `index.html`): 総合スコアに `balance: 2` を送る（共通基盤の v4 が、ふつうの全クリアを 5,000 にそろえる係数 60 で割る）。RTA は `survivor-normal-v3`・`survivor-absolute-2x-v3` で計る

### Changed — SPEC-065 (= Troy Horde and Faster Leveling — Flood, Packs, Separation, Sprite Cache) — merged in #91
- **トロイの大群** (`js/battle/horde.js` 新規 + `js/battle/enemies.js` + `js/constants.js`): 1:30 から湧きが速まり（3:30 で 6 倍）、2:30 から 8 秒ごとに 24 体の群れが 1 方向から押し寄せる。出ていられる敵はトロイだけ 320 体に
- **敵どうしを押し分ける** (`js/battle/horde.js`): 群れが 1 点に固まらず、まわりを取り囲んで画面を埋める
- **レベルアップが約 2 倍速く** (`js/constants.js`): 次のレベルまでの経験値の伸びを 1.3 倍 → 1.2 倍に
- **描画を軽く** (`js/battle/sprites.js`): 円で切り抜いた敵の絵を使い回す
- **遊び方の誤りを直した** (`data/i18n/ui.json` + `index.html`): Lv と武器はステージごとに 1 から

### Added — SPEC-064 (= Stage Gimmicks — Abacus Beads, Hollerith Punch Cards, Trojan Horse) — merged in #90
- **ステージごとの仕掛け** (`js/battle/gimmicks.js`・`js/battle/gimmicks-render.js` 新規 + `js/battle/enemies.js` + `js/battle/damage.js` + `js/battle/render.js`): アバカスは予告のあと珠の列が横切る（敵もはじく）、ホレリスは床にパンチの穴（1 つは自分の足もと）、トロイは木馬が現れて 9 秒後に敵の群れを吐き出す（開く前に壊すと宝箱の中身）

### Added — SPEC-063 (= Thunder Drum — Helper Item That Clears Every Enemy on Screen) — merged in #89
- **雷鼓（画面の敵を一掃）** (`js/battle/field.js` + `js/battle/fx.js` + `js/constants.js` + `js/battle/render.js`): 壺・宝箱から出るお助けアイテム。拾うと画面に映っている敵すべてに雷が落ちて倒れ（経験値も落ちる）、ボスには最大 HP の 20%。画面の中の敵の弾も消える

### Added — SPEC-062 (= Shooter Enemies — Keep Distance and Fire Telegraphed Shots) — merged in #88
- **離れたところから撃ってくる敵** (`js/battle/enemy-shots.js` 新規 + `js/battle/enemies.js` + `js/constants.js` + `js/battle/render.js`): 赤い縁の敵が、画面の中で距離を保って横へ回り、赤い点線で狙ってから撃ってくる（狙って 1 発・3 方向の 2 種）。ステージが進むほど多く早く出る

### Added — SPEC-061 (= Boss Countdown — From the Warning to the Boss Spawn) — merged in #87
- **ボスが出るまでのカウントダウン** (`js/battle/fx.js` + `js/battle/enemies.js` + `index.html` + `css/battle-ui.css`): 「ボス接近」の帯に残りの秒（0:30 → 0:01）を出し、予告のあとは上の小さな帯で数え続ける。最後の 5 秒は真ん中に大きな数字

### Added — SPEC-060 (= Menu Sound — Menu BGM and Button Click SE) — merged in #86
- **ボタンの音** (`js/ui-sound.js` 新規 + `js/constants.js`): ボタンとスイッチを押すと `crash.mp3` が鳴る。レベルアップのカードと冒険を始めるは、いままでどおり自分の音だけ
- **メニューの BGM** (`js/ui-sound.js` + `js/audio.js` + `js/menu.js` + `js/battle/gameover.js` + `js/battle/activity-report.js`): タイトル・モード選択・ヒーロー選択に `land.mp3`。タイトルでは最初に触ったときに始まる。ゲームオーバー・活動レポートはジングルが鳴り終わってから流れる

### Changed — SPEC-059 (= Navi Dock — Dedicated Band for Mine on Mode Select and Hero Select) — merged in #85
- **マインちゃんの通信の帯** (`js/navi.js` + `css/chars.css`): モード選択とヒーロー選択で、顔のアイコンとセリフを画面の下の専用の帯に出す。カード・ボタンと重ならず、ヒーロー選択の大きなヒーローの絵には重ねない
- **ヒーロー選択のカード** (`css/chars.css`): 低い画面でもヒーローの絵が潰れない。はみ出すぶんはカードの中でスクロールし、「冒険を始める」は下に貼りつく。広い画面では帯をカードの左下に置く
- **案内役の名前をマインちゃんに** (`data/i18n/ui.json` ほか): 自己紹介・コメント・ドキュメントの「アイン」を直した
- **デザイン憲章 14.4** (`docs/charters/DESIGN_CHARTER.md`): 操作する画面では案内役を専用の帯に出す・ヒーローの見せ場に重ねない

### Changed — SPEC-058 (= Result & Menu UI — Result Telop, Result Tiles, Activity Report, Menu, Settings, Ranking, Help) — merged in #83
- **結果のテロップ** (`js/result-telop.js` 新規 + `css/result-ui.css` 新規): ステージクリア・全クリア・倒れたときに、斜めの帯（MCH の勝敗のカットインの写し）が飛びこみ、帯の上にヒーロー、下にナビのマインちゃんが重なって反応する。押すと飛ばせる
- **パネルが光の線から開く** (`css/node.css`): 全モーダルが、端末の電源が入るように縦に開く
- **結果の中身を端末に** (`css/result-ui.css`): 数字のタイルが 1 枚ずつ起き上がる。ステージの節はノードの鎖、次のステージは NEXT の札。活動レポートはヒーローの帯・番号の付いたステージのカード・光が走るスコア
- **メニュー・設定・ランキング・遊び方** (`css/result-ui.css` + `js/settings-ui.js`): 行に番号が付き、1 行ずつ入ってくる。音量のつまみは金で埋まる 10 マスの帯と菱形の頭。ランキングの上位 3 つは金・銀・銅の札
- **デザイン憲章を改訂** (`docs/charters/DESIGN_CHARTER.md`): 14.1（角丸の例外）・14.5（パネルの開き方・結果のテロップ・行の入り方）

### Changed — SPEC-057 (= Battle UI — HUD, Card Deal, Boss Cut-in, Damage Numbers, Background Saturation) — merged in #82
- **戦闘の HUD を端末の帯に** (`css/battle-ui.css` 新規 + `index.html` + `js/survival.js`): HP は 10 マスに区切り、減ったぶんを白い残像が遅れて追う。30% 以下で脈打つ。XP のバーに光が走る
- **レベルアップのカードを配る** (`js/battle/levelup.js`): 1 枚ずつめくれて出て、選んだカードが光ってから閉じる（二度押しで 2 枚取らない）
- **ボスのカットイン** (`js/battle/fx.js` + `index.html`): 予告は警告色の縞。出た瞬間に斜めの帯にボスの絵と名前、ナビのマインちゃんが一言
- **数字と拾得の手ざわり** (`js/battle/damage.js` + `js/battle/render.js` + `js/battle/field.js`): 大きいダメージほど数字が大きく弾む。宝箱・壺・回復・磁石・懐中時計で粒と文字が出る
- **戦場の背景の彩度を落とす** (`js/battle/render.js`): UI と敵がいちばん鮮やかに見えるように（憲章 14 章の色の優先度）

### Added — SPEC-056 (= Navigator Mine and Hero Layering — Speaking Navi, Hero Showcase, Stage Telop) — merged in #81
- **ナビのマインちゃん** (`js/navi.js` + `css/chars.css` 新規): タイトル・モード選択・ヒーロー選択・ステージの始まりで喋る案内役。吹き出し（通信窓）はセリフの量で伸び縮みし、1 文字ずつ出る。口が動き、言い終えるとポーズが変わり、瞬きする。吹き出しを押すとめくれて次のセリフへ、マインちゃんを押すと反応する。ヒーロー選択と戦闘では、ボタンや戦場を隠さない通信窓（顔の小窓）
- **ヒーロー選択に大きなドット絵** (`js/main.js` + `index.html`): 選んだヒーローを 3〜4 倍で出し、名前の大きな文字をその裏に重ねる。選ぶたびに構図が変わる
- **ステージの始まりの帯の手前にヒーロー** (`js/battle/index.js` + `index.html`)

### Changed — SPEC-055 (= Node Terminal Design Language — Panels, Living Backgrounds, Wipe Transitions) — merged in #80
- **デザイン言語「ノード端末」** (`css/node.css` 新規 + `index.html`): 全モーダルとモード選択のカードを、角を切った筐体（縁は金 → シアンの光・面は走査線）に。ボタンは角を切ったキーで、触れると光が横切る。見出しに英字の小見出し
- **止まらない背景** (`css/node.css`): モーダルとタイトルの背景で、ブロックの格子が流れ、粒が漂い、パネルの縁を光が走る
- **画面の切り替えのワイプ** (`js/transition.js` 新規 + `js/main.js` + `js/mode-select.js`): タイトル → モード選択 → ヒーロー選択 → 戦闘を、斜めの筐体が横切るワイプ（640ms）で
- **「演出を減らす」を CSS にも** (`js/motion.js`): 常に動く演出とワイプを止める
- **デザイン憲章を改訂** (`docs/charters/DESIGN_CHARTER.md`): 14 章「ノード端末」（質感・生きている・色の優先度・キャラとの重なり・動き）、9 章の動きの長さ

### Added — SPEC-054 (= RTA Pocket Watch — 2x Game Speed for 10 Seconds (RTA only)) — merged in #79
- **RTA の懐中時計** (`js/battle/field.js` + `js/battle/index.js` + `js/battle/render.js` + `js/constants.js`): RTA のときだけ宝箱から出て、拾うと 10 秒間ゲーム全体が 2 倍速（続けて拾うと延びる）。右上に残り時間
- **RTA は懐中時計ありのレギュレーションで計る** (`js/platform.js` + `index.html`): `survivor-normal-v2`・`survivor-absolute-2x-v2`。懐中時計なしの記録は共通基盤に残る

### Added — SPEC-053 (= Field — Buildings, Pots, Chests and Helper Items (Bar Magnet / Pancake)) — merged in #78
- **建物** (`js/battle/field.js` + `js/battle/field-geom.js` + `js/constants.js`): 各ステージに 4 つ（持ち運びハウス・お城）。自分・敵は通れず、弾は消え、レーザーは手前で止まる
- **壺と宝箱** (`js/battle/field.js` + `js/battle/damage.js` + `js/battle/enemies.js` + `js/battle/archetypes.js`): どの武器でも壊せる。壺はいつもあり、宝箱は 1 ステージ 4 つ（0:30・1:30・2:30・3:30）。撃破数には数えない。画面の外の宝箱は縁の矢印で分かる
- **お助けアイテム** (`js/battle/field.js` + `js/battle/gems.js` + `js/battle/render.js`): 棒磁石（落ちているジェムを全部吸い寄せる）・パンケーキ（HP を 30% 回復）
- **遊び方** (`index.html` + `data/i18n/ui.json`): 壺・宝箱・アイテム・建物の 2 行

### Changed — SPEC-052 (= Result Screen — Toasts on Top, Back to Title / Portal, Player Name from bearko.games) — merged in #77
- **共通基盤の通知を画面の上に** (`js/platform.js` + `js/battle/index.js`): トロフィー・RTA 記録・自己ベストの通知が、クリア画面のボタンに重ならない（SDK 1.5.0 の `setToastPosition`）
- **活動レポートに「タイトルに戻る」** (`js/battle/activity-report.js` + `js/battle/gameover.js` + `index.html`)。RTA のときは活動レポートとゲームオーバーに「bearko.games に戻る」も
- **ランキングの名前の既定** (`js/platform.js` + `js/ranking-client.js`): ログイン中の bearko.games の表示名 → 前に送った名前 → 空。"anonymous" は既定にしない

### Changed — SPEC-051 (= bearko.games Platform score — send the difficulty name, not the multiplier) — merged in #76
- **総合スコアに送る難易度を名前と設定に** (`js/platform.js` + `js/battle/activity-report.js`): ゲームが計算した倍率ではなく、難易度の名前（`normal` / `absolute`）と ABSOLUTE の 4 軸を送る。係数は bearko.games 共通基盤が決める（点は今と同じ）

### Added — SPEC-050 (= bearko.games Platform — link to the overall ranking) — merged in #74
- **bearko.games の総合ランキングへの導線** (`index.html` + `js/ranking-ui.js`): ランキングのモーダルに「bearko.games の総合ランキング ↗」を置く。新しいタブで共通基盤の Survivor のランキングが開く。前からのランキングはそのまま

### Added — SPEC-048 (= bearko.games Platform RTA — ABSOLUTE ×2.0) — merged in #71
- **RTA に ABSOLUTE ×2.0 を追加** (`js/mode-select.js` + `js/platform.js` + `js/battle/index.js` + `index.html`): RTA の card の「ABSOLUTE ×2.0 で RTA」で、4 軸すべて ×2.0 に固定したルールの全 3 ステージを計る（共通基盤のレギュレーション `survivor-absolute-2x`）。ランキングへのリンクも置く
- **総合スコアの倍率の上限 2.0**（共通基盤の計算式 v2）: ABSOLUTE の倍率は総合スコアには 2.0 まで効く。ゲーム内の活動レポート・ランキングのスコアは今までどおり

## [1.0.0] — 2026-10-16

最初の公開版。全 3 ステージのサバイバー系アクション、NORMAL / ABSOLUTE / RTA、ランキング、bearko.games 共通基盤（トロフィー・RTA・総合スコア）。v1.0 の仕上げとして、遊び方・UI の土台・設定・戦闘の手ごたえ・結果の見せ方を入れた（SPEC-042〜047）。

### Added — SPEC-047 (= v1.0 Release — Version, Changelog Releases, Icons, Manifest, OGP) — merged in #65
- **v1.0.0** (`js/constants.js`): `APP_VERSION` を 1.0.0 に
- **変更履歴を公開版で区切る** (`tools/build-changelog.mjs` + `docs/changelog/RELEASES.json` 新規): `upTo` 以下の断片をその版の見出しの下に
- **アイコンと manifest** (`assets/icons/` + `manifest.json` 新規 + `index.html`): ロゴの紋章のファビコン・apple-touch-icon・192/512px（maskable）。ホーム画面に追加できる。雪山の絵文字 🏔️ のファビコンをやめる
- **OGP** (`index.html`): 画像を絶対 URL に、説明を日本語の今のゲームに、`og:url`・`description`
- **ランキングの既定の絞り込みを「全バージョン」に** (`js/ranking-ui.js` + `index.html`): 版を上げてもランキングが空に見えないように

### Changed — SPEC-046 (= Result Reveal — Stage Intro, Stage Clear, Game Over, Activity Report) — merged in #64
- **結果の見せ方** (`js/reveal.js` 新規 + `js/battle/stage-transition.js` + `js/battle/gameover.js` + `js/battle/activity-report.js` + `index.html` + `css/components.css`):
  - ステージの始まりに「STAGE n / ステージ名」の帯（1.6 秒、遊びは止めない）
  - ステージクリア：金の枠、進み具合の ●●○、そのステージの ⏱ 時間・💀 撃破・Lv のタイル（撃破数をカウントアップ）
  - ゲームオーバー：「ステージ n / 3 で力尽きた — ステージ名」、⏱・💀・Lv のタイル
  - 活動レポート：金の枠、ヒーロー → ステージ → 合計の順に出し、スコアを 0 から数え上げる
  - 演出は 0.8 秒以内、画面を押すと最後の状態まで飛ぶ。演出を減らす / reduced-motion では最初から最後の状態
  - メニュー・ランキングを金の枠に（失敗の赤はゲームオーバーだけ）
- **テスト** (`tests/reveal.test.mjs`): カウントアップの値

### Added — SPEC-045 (= Battle Feel — Shake, Hurt Flash, Kill Burst, Boss Warning, Kill Counter) — merged in #63
- **戦闘の手ごたえ** (`js/battle/fx.js` 新規 + `js/battle/render.js` + `js/battle/damage.js` + `js/battle/enemies.js` + `js/battle/boss-attack.js`):
  - 敵に当たると一瞬白く光る。倒すと敵の色の粒が散り（雑魚 6・レア 14・ボス 32、同時に 240 粒まで）、撃破音
  - 被弾で画面の縁が赤く光り、小さく揺れる（ボスの攻撃は大きく）。スマホは短く震える
  - HP 30% 以下のあいだ、画面の縁がうっすら赤く脈打つ
  - ボスを倒すと大きく揺れて白く光る
  - ボスが出る 30 秒前（3:30）に「⚠ WARNING ボス接近」の帯と音
- **HUD に撃破数** (`index.html` + `js/survival.js`): 💀 n。増えると小さく弾む。被弾・撃破のときは HP の帯と撃破数をすぐ描き直す（1 秒の tick を待たない）
- **演出を減らす / reduced-motion** : 揺れ・粒・閃光・震えを止め、被弾と HP 低下は動かない薄い縁だけ出す
- **テスト** (`tests/fx.test.mjs`): 粒の数・上限・減衰

### Added — SPEC-044 (= Settings — BGM/SE Volume, Reduce Effects, Language, Auto-Pause on Tab Switch) — merged in #62
- **設定を追加** (`js/settings.js` + `js/settings-ui.js` 新規 + `index.html` + `css/components.css`):
  - タイトル・メニュー・戦闘中ヘッダーの ⚙ から開く。BGM と効果音の音量（0% ＝ OFF）、演出を減らす、言語
  - `mcs.settings` に保存。100% で今までと同じ音量。BGM が 0% のときは読み込まない
  - 戦闘中ヘッダーの「JP/EN」は ⚙ に置き換え（言語は設定とタイトルで切り替え）
- **音** (`js/audio.js`): 音量は「呼び出し側 × 設定」。SE はパスごとに 1 つ読み込んで `cloneNode()` で鳴らす
- **タブを離れたら一時停止** (`js/main.js`): 戦闘中ならメニューを開いて止め、BGM も止める。戻ると BGM を再開
- **演出を減らす** (`js/motion.js`): `prefersReducedMotion()` が OS の設定か「演出を減らす」で true
- **テスト** (`tests/settings.test.mjs`): 設定の正規化と音量の掛け算

### Changed — SPEC-043 (= UI Foundation — Tokens, Fonts, Buttons, Modals, Safe Area, Reduced Motion) — merged in #61
- **UI の土台をそろえる** (`css/base.css` + `css/components.css` + `css/layout.css` + `css/responsive.css` + `index.html`):
  - `:root` に角・余白・文字・フォント・z-index・動き・safe-area のトークン。使っていない `--temp` `--food` などを削除
  - 見出しに Dela Gothic One、数字（HUD・モードの倍率）に Chakra Petch（DeckBattle と同じ組み合わせ）
  - ボタンとカードに押した感じ（縮む）。hover はマウスの端末だけ。`focus-visible` の枠、タップのハイライトを消す
  - 全モーダルを safe-area の内側に。高さがはみ出すときはカードの中だけスクロール
  - `prefers-reduced-motion` を全体に（`js/motion.js` の `prefersReducedMotion()` を新設）
- **戦闘の画面を広く** : ヘッダーを 36px のボタンに詰め、スマホではタイトル名を隠してヒーロー名を 1 行に。XP を HUD の下端の細い帯にして HUD を 1 段に（390×844 でヘッダー＋HUD 117px → 81px）
- **ヒーロー選択** : 名前を 2 行まで出す（「コナン・ドイル」「ピタゴラス」が切れていた）
- **タイトル** : ステージ 1 の背景をゆっくり動かして敷く
- **モーダルの操作** (`js/modal-a11y.js` 新規): メニュー・ランキングを Esc で閉じる。キーボードで開いたときは最初のボタンにフォーカス
- **テスト** (`tests/modal-a11y.test.mjs`): Esc で押すボタンの選び方

### Changed — SPEC-042 (= How to Play — Help Rewrite + First-Run Coach Hint) — merged in #60
- **遊び方のヘルプを今のゲームに書き直し** (`index.html` + `data/i18n/ui.json` + `js/main.js` + `css/components.css`):
  - 旧テーマ（雪山サバイバル・資源管理）の文言を消し、操作・ステージ・強くなり方・モードの 4 つの節に（ja/en）
  - タイトル画面に「遊び方」ボタン。ヘルプはタイトルやモーダルの上にも出る。✕・閉じる・背景・Esc で閉じる
- **はじめての操作ガイド** (`js/battle/coach.js` 新規 + `js/battle/index.js`):
  - 初回のステージ 1 だけ、戦闘の上に「ドラッグで移動／攻撃は自動」→「ジェムで Lv アップ」の帯を出す。遊びは止めない
  - 見終えたら `mcs.coachSeen` を保存し、2 回目からは出ない
- **テスト** (`tests/coach.test.mjs`): ガイドの進み方（純関数 `nextCoach`）

### Added — SPEC-041 (= bearko.games Platform Total Score) — merged in #50
- **bearko.games 共通基盤の総合スコアに参加** (`js/platform.js` + `js/battle/activity-report.js` + `js/battle/gameover.js` + `js/menu.js` + `js/battle/index.js`):
  - 全クリア・倒れた・タイトルに戻ったときに 1 回の挑戦の成績を送る（計算は共通基盤。自己ベスト更新の通知は SDK が出す）
  - ゲームオーバーからの再走で、前の挑戦のステージ記録が残っていたのを直す

### Added — SPEC-040 (= bearko.games Platform RTA) — merged in #49
- **bearko.games 共通基盤の RTA に参加** (`js/platform.js` + `js/mode-select.js` + `js/battle/index.js` + `js/battle/stage-transition.js` + `js/battle/gameover.js` + `js/menu.js` + `index.html`):
  - モード選択画面に「RTA」の card を追加。「RTA で始める」で NORMAL のルールのまま、ステージ 1 の開始から全 3 ステージクリアまでの時間を計る
  - ステージを終えるたびに区間タイム、クリアで公式タイムを通知（共通基盤の SDK が出す）。倒れる・タイトルに戻ると計測は中断
  - 記録は bearko.games の RTA ランキングとマイページに載る。未ログインでも計測でき、ログインするとランキングに載る

### Added — SPEC-039 (= bearko.games Platform Trophies) — merged in #48
- **bearko.games 共通基盤のトロフィーに参加** (`js/platform.js` + `js/battle/stage-transition.js` + `index.html`):
  - 最初のステージを終えると `survivor.stage1`（スノーフォール）、全 3 ステージクリアで `survivor.clear`（幻の生存者）
  - 未ログインでも獲得でき、ログインするとまとめて登録（通知とログイン案内は共通基盤の SDK が出す）
  - SDK が読めなくても何もしない（ゲームの進行は変わらない）

### Changed — SPEC-038 (= Activity Report Icon Layout + Anonymous Default Name) — merged in #47
- **活動レポートをアイコン中心レイアウトに刷新** (`js/battle/activity-report.js` + `index.html`):
  - ヒーロー: **ポートレート (= 56px 円形)** + 名前 + 派閥カラーボーダー
  - ステージ: 旧 table → **カード式** (`<div class="report-stage">` × N)、 head に ステージ名 + (⏱ 時間 / 💀 撃破 / Lv.N)
  - 取得 ext: **38px タイル** (= `extTierImg` アイコン + 右下 Lv バッジ) を flex-wrap で並べる、 名前は hover tooltip のみ
  - 総合スタッツ: meta row (= 🏷️ レギュ / ⏱ 総時間 / 💀 総撃破) + **巨大スコア** (= clamp 2.6〜4rem、 `toLocaleString()` で 3 桁区切り) + "SCORE" ラベル
- **ランキング名のデフォルトを "anonymous" に** (`js/ranking-client.js`):
  - `DEFAULT_PLAYER_NAME = "anonymous"` を新設、 `getPlayerName()` で localStorage 未設定時に fallback
  - 名前欄が空のまま 「ランキングに送信」 を押しても 「anonymous」 で送信できる
- **ランキング表のスコア列強調** (`css/components.css`): `.ranking-table .ranking-score` を `font-size: 1.05rem; font-weight: 900; tabular-nums` に
- **i18n** (`data/i18n/ui.json`): `report.scoreLabel` (= "SCORE") を追加
- **CSS** (`css/components.css`): `.report-hero__inner` (= 派閥カラーボーダー) / `.report-hero__portrait` (= 56px 円形) / `.report-stage*` 一式 / `.report-ext` (= 38px タイル) / `.report-ext__lv` (= 右下バッジ) / `.report-meta-row` / `.report-score-big` (= clamp + drop-shadow + tabular-nums) / `.report-score-label` (= letter-spacing 0.3em) を新規追加。 mobile (< 480px) で 48px / 34px / 0.95rem に縮小

### Added — SPEC-037 (= Game Modes — NORMAL / ABSOLUTE Regulation) — merged in #46
- **ゲームモード選択画面** (`index.html` + `js/mode-select.js` 新規): タイトル → **NORMAL / ABSOLUTE 選択** → ヒーロー選択 の 3 段遷移。 各モードカードに 「これで始める」 ボタン + バックボタン
- **ABSOLUTE レギュレーション** (`js/state.js` + `js/constants.js`):
  - `state.regulation` (= "NORMAL" | "ABSOLUTE")、 `state.absolute = { spawnMul, hpMul, dmgMul, speedMul }`
  - 4 軸を **0.5〜5.0** (= 0.25 step) で個別調整、 スライダー UI でリアルタイム反映 (= 全軸 5× で score mul 5.0)
  - `computeRegulationMul(regulation, absolute)` = 4 軸の算術平均 (= NORMAL は常に 1.0)
- **雑魚への倍率適用** (`js/battle/enemies.js`):
  - spawn 間隔: `ENEMY_SPAWN_INTERVAL_MS / state.absolute.spawnMul` (= mul=2 で 2× 出現)
  - hp / dmg / speed に `state.absolute.{hpMul, dmgMul, speedMul}` を乗算
  - ボスは ABSOLUTE 倍率を **受けない** (= 絶対値維持)
- **スコア倍率** (`js/battle/activity-report.js` + `js/battle/gameover.js`):
  - 最終スコア = `computeScore(run) × regulationMul` で計算、 ranking 送信
  - 活動レポートにレギュ表示 (= 「レギュレーション: ABSOLUTE ×1.50」 行追加)
- **ランキング拡張** (`js/ranking-ui.js` + `index.html`):
  - レギュレーションフィルタ追加 (= 全 / NORMAL / ABSOLUTE)
  - 表に **レギュ列** を追加 (= NORMAL / `ABS ×1.50` 短縮形)
- **GAS バックエンド** (`tools/gas-ranking.gs`):
  - HEADERS に `regulation` / `regulationMul` を追加
  - `doGet` に `?regulation=...` フィルタ
  - `seedSampleData` の dummy が交互に NORMAL / ABSOLUTE (= 1.0..2.0 ランダム mul)
- **Game Over の 2 ボタン化** (`index.html` + `js/battle/gameover.js`):
  - 旧 「リトライ」 → 「今のレギュレーションで再走」 にラベル変更 + 挙動維持
  - 「タイトルに戻る」 を新設 (= 戦闘停止 + state リセット + titleScreen 表示)
- **i18n** (`data/i18n/ui.json`): `mode.*` 7 / `absolute.axis.*` 4 / `report.regulation` / `ranking.col.reg` / `ranking.reg.*` 3 / `gameover.toTitle` / `gameover.retryCurrent`
- **CSS** (`css/components.css`): `.mode-select` / `.mode-card*` / `.abs-slider*` / `.gameover-modal__choices` 一式

### Added — SPEC-036 (= GAS Sample Data Seed + Re-apply Default API URL) — merged in #44
- **GAS シード関数 3 種** (`tools/gas-ranking.gs`):
  - `seedSampleData()` = `ranking` シートをリセット → ヘッダー + 12 件のダミーデータ投入 (= 推奨)
  - `appendSampleData()` = 既存行を残して 12 件追記
  - `clearAllRankings()` = ヘッダー残し全データ削除
  - サンプル: player 12 種 (= JA/EN 混成) × hero 10 種、 score 30000→8000 グラデ、 timestamp 7 時間ずつ過去
- **`_DEFAULT_API_URL_ENC` 再適用** (`js/ranking-client.js`): SPEC-035 PR #43 マージ時に commit 漏れしていた default GAS URL の base64 埋込を復活
- **`docs/process/RANKING_SETUP.md`**: 8 章 「テスト用サンプルデータ投入」 を新設 (= 3 関数の表 + 実行手順 + サンプル内訳)、 旧 「削除 / リセット」 「参考リンク」 を 9 / 10 にずらして `clearAllRankings()` を案内

### Added — SPEC-035 (= Ranking — GAS Backend + UI) — merged in #43
- **GAS バックエンドスクリプト** `tools/gas-ranking.gs` 新規 (= `doPost` 追記 + `doGet` top N、 `ranking` シート自動作成、 score 降順 / version 絞込)
- **デプロイ手順書** `docs/process/RANKING_SETUP.md` 新規 (= Spreadsheet 新規 → Apps Script 貼付 → ウェブアプリデプロイ → URL 投入の 5 分手順、 不正対策 hints + 再デプロイ + 削除手順)
- **`js/ranking-ui.js`** 新規: ランキングモーダル制御、 `installRankingUI` を `init()` から呼出、 `openRanking()` / `closeRanking()` で pause/resume、 fetch + table render + filter (= 全 / 現バージョン)
- **URL ブートストラップ**: `?#api=base64(URL)` 付き URL を踏むと自動で `localStorage` 保存 + hash 消去
- **タイトル画面**: `#btnTitleRanking` 追加 (= "Press to Start" の下)
- **一時停止メニュー** (`js/menu.js` + `index.html`): `#pauseMenuRanking` を 4 つめのボタンとして追加、 click で `import("./ranking-ui.js").openRanking()` を呼出
- **ランキングモーダル** `#rankingModal` (= 既存 `.gameover-modal` 流用 + `.ranking-card`):
  - フィルタ select (= 全 / 現バージョン)
  - 更新ボタン
  - 5 列 table (= # / プレイヤー / スコア / 撃破 / 時間)
  - 状態メッセージ + URL 未設定時の入力欄 + 保存ボタン
- **活動レポート連携** (`js/battle/activity-report.js` + `index.html`): 送信成功時に `#activityReportViewRanking` (= 「ランキングを見る」 ボタン) が現れ、 click で `openRanking()`
- **i18n** (`data/i18n/ui.json`): `ranking.*` 17 キー + `menu.ranking` 追加 (= title / openTitle / refresh / loading / empty / loadFail / needUrl / urlInvalid / urlSaved / urlPlaceholder / configLabel / saveUrl / filter.{all,current} / col.{rank,player,score,kills,time})
- **CSS** (`css/components.css`): `.ranking-card` / `.ranking-toolbar` / `.ranking-filter` / `.ranking-table*` / `.ranking-msg` / `.ranking-config*` / `.ranking-close` / `.title-screen__ranking` + mobile breakpoint

### Changed — SPEC-034 (= Rare Size + Weapon Growth × 2 + Reroll 3 + Pause Menu) — merged in #42
- **レアエネミーサイズ × 1.5** (`js/constants.js` ENEMY_SPECS): 147 radius 14→21、 170 radius 21→32、 396 radius 13→20、 407 radius 16→24
- **武器サイズ拡大率 × 4 強化** (`js/constants.js`): `WEAPON_SIZE_GROWTH_PER_LEVEL` `0.06` → **`0.25`** (= Lv.5 で Lv.1 の 2 倍、 アイコン + 当たり判定 + ビーム厚 + 爆弾アイコン 全てに反映)
- **リロール回数 +1** (`js/constants.js`): `REROLL_PER_BATTLE` `2` → **`3`**
- **ヘッダーメニュー (一時停止)** (`index.html` + `js/menu.js` 新規 + `js/main.js`):
  - `<header.header__right>` に `☰` ボタン (`#btnMenuOpen`) を追加
  - `#pauseMenuModal` (= 3 ボタンモーダル): 「ステージをはじめからやり直す」 / 「タイトルに戻る」 / 「閉じる」
  - `installMenu()` を `init()` から呼出、 open で `pauseTime` / close で `resumeTime`
  - **やり直す**: state.run の現ステージ snapshot を除去 → totals 再計算 → `startBattle(state.ownedHero)` で武器 / Lv / HP / 撃破数 0 リセット (= currentStageIdx 維持)
  - **タイトルに戻る**: 全 modal close → `stopBattle` + `stopBgm` → state.ownedHero / state.run / currentStageIdx / stats を全リセット → `#app` を隠して `#titleScreen` に戻る
  - **閉じる**: modal を閉じて `resumeTime` のみ
- `data/i18n/ui.json`: `menu.title` / `menu.restart` / `menu.toTitle` / `menu.close`
- `css/components.css`: `.pause-menu__card` (= max-width 360px) + `.pause-menu__buttons` (= flex column、 gap 0.5rem)

### Added — SPEC-033 (= Rare Enemies + Magic Card + Activity Report + Stage 2/3 Boss Clear Fix) — merged in #41
- **ステージ 2 / 3 のボス撃破クリア修正**: `js/battle/damage.js` の `e.enemyId === BOSS_ENEMY_ID` (= ヨシュカ id 171 のみ) を `e.isBoss` 参照に変更 → ファオ / yamap 撃破でも即座に `bossDefeated` フラグ → ステージ遷移 / 活動レポートが発火
- **レアエネミー 4 種** (`data/enemies.json` + `js/constants.js` ENEMY_SPECS): 147 (クリーパー) / 170 (バイトバンディット) / 396 (ラビット) / 407 (ラブレター) の フラペチーノ ドッピオ。 hp 約 2× 相当、 `isRare: true` フラグ
- **レアスポーン**: `RARE_ENEMY_IDS` / `RARE_SPAWN_INTERVAL_MS=60000`、 `tickEnemies` で 1 分に 1 回ランダムスポーン (= 開幕 1 分は猶予)
- **マジックカード:光輝** (= ext 5178): レア撃破時に CE gem と一緒にドロップ、 取得で即時 LV up (= state.xp は減らさない、 既得 CE 持ち越し)
  - `js/battle/magic-cards.js` 新規: `spawnMagicCard` / `tickMagicCards` / `triggerLevelUpPick(picked)` 連鎖
  - `js/battle/sprites.js`: `getMagicCardSprite()`
  - `js/battle/render.js`: gem 描画直後にマジックカードを 32px + 光彩オーラで描画
- **活動レポートモーダル** (`#activityReportModal` + `js/battle/activity-report.js`): 全ステージ clear で `triggerGameOver("clear")` の代わりに発火
  - hero 名 / 各ステージ行 (= ステージ名 / 時間 / 撃破 / Lv / 取得 ext と Lv) / 総時間 / 総撃破 / スコア
  - スコア式: `kills*100 + bestLevel*500 + uniqueExt*300 + max(0, 60000 - totalSec*50) + 5000`
  - ranking 送信 + リトライボタン
- **per-stage snapshot**: `state.run = { stages, totalKills, totalElapsedMs }`、 `triggerStageEndOrTransition` 冒頭で snapshot を push (= `startBattle` の reset 前)
- `js/state.js`: `state.battle.magicCards` / `lastRareSpawnMs` / `state.run.*`
- `js/main.js`: `applyHeroPick` で `state.run` 初期化
- `js/battle/index.js`: `tickMagicCards` 配線、 `startBattle` で magicCards / lastRareSpawnMs リセット
- `data/i18n/ui.json`: `report.title` / `report.hero` / `report.totalTime` / `report.totalKills` / `report.score` / `report.col.*` (5 列)
- `css/components.css`: `.report-card` / `.report-hero` / `.report-stages` / `.report-totals` + mobile breakpoint

### Changed — SPEC-032 (= Changelog Fragments + Auto-Generated SPEC-INDEX) — merged in #40
- **`tools/build-spec-index.mjs`** 新規 (= 純 Node ESM、 依存なし)。 全 `docs/specs/SPEC-*.md` の YAML frontmatter から `SPEC-INDEX.md` の表を再生成
- **`tools/build-changelog.mjs`** 新規。 `docs/changelog/SPEC-NNN.md` (= bullet fragment) + SPEC frontmatter から `CHANGELOG.md` の `[Unreleased]` 区間を再生成
- 全 31 既存 SPEC に YAML frontmatter (= `id` / `title` / `status` / `pr` / `phase` / `kind`) を追加
- `[Unreleased]` の 30 SPEC エントリを `docs/changelog/SPEC-002.md` ~ `SPEC-031.md` に分割
- `docs/specs/SPEC-INDEX.md` の表を `<!-- BEGIN AUTO-INDEX -->` ... `<!-- END AUTO-INDEX -->` マーカー間に変更
- `CHANGELOG.md` の `[Unreleased]` を `<!-- BEGIN AUTO-UNRELEASED -->` ... `<!-- END AUTO-UNRELEASED -->` マーカー間に変更
- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` 11 章を新設 (= 新ワークフロー + 自動生成手順)
- `CLAUDE.md` 「作業の進め方」 に **触る / 触らないファイル** 表を追加

### Changed — SPEC-031 (= Pierce + LaserGun Fix + Pierrot AoE + Horse Tune + Gunbai + Header Date Removal) — merged in #39
- **Pierce 機構**: `_spawnProjectile` opts に `pierce`、 entity に `pierceLeft` + `hitIds` (Set)。 `tickProjectiles` 衝突で同 frame / 同弾の重複を防ぎつつ pierce > 0 中は次の敵もチェック。 `moaiDrop` は Gunbai 影響を受けない (= shockwave 多重防止)
- **Panjandrum tier に `pierce`**: 1 / 2 / 3 / 4 / 5 を追加 (= Lv.1 で 2 体目消滅、 Lv.5 で 6 体目消滅)
- **Gunbai 系列 (extId 20)** 新規: archetype `pierceUp`、 `state.buffs.pierceBonus` を加算、 tier magnitude 1 / 2 / 3 / 4 / 5。 MCH 1037 / 2037 / 3037 / 4037 / 5037
- **LaserGun 丸め損対策**: beam に `dmgAccum` / `lastHitMs` を持たせ、 `BEAM_HIT_INTERVAL_MS=250` ごとに整数 dmg を dispatch。 `tickBeams(dt, nowMs)` シグネチャ更新
- **Pierrot AoE 可視化**: 爆発半径を赤の半透明 fill (`#e76060` α=0.22-0.32) + 赤系 stroke (`#ff8a8a`) で表示、 fuse 後半で点滅
- **Horse 強化**: tier magnitude を `0.95/0.9/0.84/0.78/0.72` → **`0.85/0.7/0.55/0.4/0.3`**
- **ヘッダー日付削除**: `<div class="header__center">` (= `#dateLabel`) を `index.html` から撤去。 `renderHeader` は `if(el)` ガード済で no-op 残置
- `docs/specs/SPEC-031-pierce-and-tweaks.md` 新規
- `docs/specs/SPEC-INDEX.md`: SPEC-030 を `#38 (merged)` に flip、 SPEC-031 を Implementing 登録

### Added — SPEC-030 (= Three-Stage System (= node : アバカス / ホレリス / トロイ + ファオ / yamap ボス)) — merged in #38
- 3 ステージ制を導入 (= **node : アバカス → ホレリス → トロイ** を順番に踏破、 ヒーロー引継ぎ / 武器リセット)
- `data/enemies.json`: id **373** (覚醒魔王ファオ) と **1189** (yamap) を追加
- `js/constants.js`:
  - `STAGE_TABLE`: 3 ステージ × `bgPath` / `bossEnemyId` / `bossAttack` / `enemyHpMul` / `enemyDmgMul` / `xpMul` / `spawnIntervalMul`
  - `ENEMY_SPECS` に boss 373 / 1189 を追加
  - ファオ攻撃: `FAO_FIRE_INTERVAL_MS=2200` / `FAO_BULLETS=6` / `FAO_PROJ_*`
  - yamap 周回: `YAMAP_ORBIT_COUNT=8` / `YAMAP_ORBIT_RADIUS=110` / `YAMAP_ORBIT_*`
- `js/state.js`: `state.currentStageIdx`、 `state.battle.bossProjectiles` / `bossOrbits` / `bossLastFireMs`
- `js/battle/enemies.js`:
  - `tickEnemies` で stage 別の boss id / `spawnIntervalMul` を反映、 boss 撃破 / 5 分耐久で `triggerStageEndOrTransition` に委譲
  - `spawnEnemyAtRing` で雑魚 hp/dmg/xp を `enemyHpMul / enemyDmgMul / xpMul` で乗算、 boss は絶対値 + `bossAttack` / `bossAttackExtId` を entity に持たせる
- `js/battle/boss-attack.js` 新規:
  - `tickBossAttack(dt, nowMs)` が ファオ放射 (= ext 5055 アイコン、 6 発周期) と yamap 周回 (= ext 5002、 8 個常時等間隔) を一括処理
  - プレイヤー衝突は既存 `contactCooldownMs` throttle を共有、 yamap orbit は同 orbit から 600ms 再ヒット throttle
  - 死亡したボスに紐づく entity を `_purgeOrphanedEntities` で掃除
- `js/battle/stage-transition.js` 新規:
  - `triggerStageEndOrTransition()` が最終ステージなら既存 `triggerGameOver("clear")` に委譲、 それ以外は `#stageTransitionModal` を開く
  - 「次のステージへ」 click で `state.currentStageIdx++` + `startBattle(state.ownedHero)` 再呼出
- `js/battle/sprites.js`: `getBackgroundSprite()` を `STAGE_TABLE[currentStageIdx].bgPath` 由来に変更
- `js/battle/render.js`: `bossProjectiles` (= 進行方向 rotate) と `bossOrbits` (= angle + π/2 接線方向) を icon 描画
- `js/battle/index.js`:
  - `tickBossAttack` を RAF ループに配線
  - `startBattle` で `bossProjectiles` / `bossOrbits` を 0 リセット
- `js/main.js`: `applyHeroPick` で `state.currentStageIdx = 0`
- `js/battle/gameover.js`: `applyRetry` で `state.currentStageIdx = 0` (= リトライは常にステージ 1 から)
- `index.html`: `#stageTransitionModal` 追加 (= 既存 `.gameover-modal` クラス流用)
- `data/i18n/ui.json`: `stage.clearTitle` / `stage.proceed` / `stage.proceedNext` / `stage.akabasu` / `stage.horeris` / `stage.troy`
- `docs/specs/SPEC-030-three-stage-system.md` 新規
- `docs/specs/SPEC-INDEX.md`: SPEC-029 を `#36 (merged)` に flip、 SPEC-030 を Implementing 登録

### Added — SPEC-029 (= Logo Image + OG Thumbnail (= タイトル/スプラッシュ画像化 + X/OGP サムネ)) — merged in #36
- `assets/logo.png` 追加 (= 2200×640、 タイトル / スプラッシュ用バナーロゴ)
- `assets/og-image.png` 追加 (= 1280×720、 X / Twitter / Discord プレビュー用)
- `index.html`: splash / title のテキストを `<img src="assets/logo.png">` 化、 OGP `og:image` を `assets/og-image.png` + `width`/`height` + `twitter:image`
- `css/layout.css`: `.splash__logo` / `.title-screen__logo` を画像ロゴ向けに再設計
- `docs/specs/SPEC-029-logo-and-og-image.md` 新規

### Changed — SPEC-028 (= Orbit Redistribution + Per-Level Size Growth (= Book/Blade 等間隔 + tier icon swap + Lv 連動拡大)) — merged in #35
- `js/constants.js`: `WEAPON_SIZE_GROWTH_PER_LEVEL = 0.06` (= Lv 連動の当たり / icon サイズ倍率、 Lv.5 で +24%)
- `js/battle/archetypes.js`:
  - `_levelSizeMul(w)` 新規 (= 1 + GROWTH × (level - 1))
  - `ensureOrbits` 全面リファクタ — 個数変化時に既存 + 新規を **等間隔で再配置** (= 2/3/4/5/6 → 180°/120°/90°/72°/60°)、 毎 frame で iconId / radius / iconSize / dmg / color を現 weapon spec から再書込 (= レベルアップ即時反映 + tier icon swap)
  - 全 fireXxx + fireHoming で `iconSize` / 投射体 `r` / Pierrot bomb iconSize / LaserGun beam thick に lvMul を乗算
- `js/battle/render.js`: bomb 描画で iconSize を bomb entity から (= `b.iconSize ?? 26`) 読む
- `docs/specs/SPEC-028-orbit-redistribute-and-size-growth.md` 新規
- `docs/specs/SPEC-INDEX.md`: SPEC-027 を `#34 (merged)` に flip、 SPEC-028 を Implementing 登録

### Changed — SPEC-027 (= Clear Title on Win Conditions (= ボス撃破 / 5 分耐久 で 「クリア!」 表記)) — merged in #34
- `data/i18n/ui.json`: `gameover.titleClear` 追加 (= 「クリア!」 / 「Clear!」)
- `js/battle/gameover.js`: `triggerGameOver(reason)` で `state.lastRunStats.reason` を保存、 `_renderGameOverModal` で reason="clear" のときタイトルを `gameover.titleClear` に差し替え
- `docs/specs/SPEC-027-clear-title-on-win.md` 新規
- `docs/specs/SPEC-INDEX.md`: SPEC-026 を `#33 (merged)` に flip、 SPEC-027 を Implementing 登録

### Added — SPEC-026 (= Balance Tuning + Bounded Stage with Background (= XP / Gyoku / 1001.png + dim overlay)) — merged in #33
- `js/constants.js`:
  - `XP_TO_NEXT_INITIAL` `5` → **4**、 `XP_TO_NEXT_GROWTH` `1.5` → **1.3** (= レベルアップ頻度 UP)
  - `ENEMY_SPECS` 各 entry に `xpValue` を追加 (= 1 / 2 / 4 / 7 / 60、 強敵ほど多)
  - `WORLD_W = 1000` / `WORLD_H = 1500` / `BG_IMAGE_PATH = "Image/Backgrounds/1001.png"` / `BG_OVERLAY_COLOR = "rgba(0,0,0,0.45)"`
- `data/extensions.json`: Gyoku tierParams `1.2/1.4/1.65/1.95/2.3` → **`1.4/1.8/2.3/2.9/3.6`** (= 0 起点増分の倍化)
- `js/battle/enemies.js`: `spawnEnemyAtRing` で `enemy.xpValue = spec.xpValue ?? 1` を持たせ、 spawn 座標を world 端でクランプ
- `js/battle/damage.js`: 撃破時 `spawnGem(e.x, e.y, e.xpValue ?? 1)` で個別 XP 値を渡す
- `js/battle/player.js`: `tickPlayer` 末尾で player 座標を world 端でクランプ、 `centerCameraOnPlayer` で camera を world 内に固定 (= viewport ≥ world は中央寄せ、 < world は端で停止)
- `js/battle/sprites.js`: `getBackgroundSprite()` 新規 export
- `js/battle/render.js`: 冒頭で `_drawBackground` (= bg 画像 + overlay) を実行、 viewport / stage 矩形の AABB 交差で clip
- `js/battle/index.js`: `startBattle` で `getBackgroundSprite()` を preload
- `docs/specs/SPEC-026-balance-and-stage-bg.md` 新規 (= 設計 + 受入基準)
- `docs/specs/SPEC-INDEX.md`: SPEC-025 を `#32 (merged)` に flip、 SPEC-026 を Implementing 登録

### Fixed — SPEC-025 (= Fix Audio Paths (= MCH カタログ実体に整合、 404 → 200)) — merged in #32
- `js/constants.js`: SFX 9 件 + `BGM_BATTLE` のパスを MCH 実体に合わせて修正 (= 全 10 件 404 → 200)
  - `BGM_BATTLE` `Audio/SE/pvp.mp3` → **`Audio/BGM/pvp.mp3`**
  - `HERO_PICK` / `GEM_PICKUP` / `LEVEL_UP` / `PICK_WEAPON` を `Audio/SE/Actions/` 配下へ
  - `PLAYER_DAMAGED` / `PICK_BUFF` / `PICK_HEAL` を `Audio/SE/Battle/` 配下へ
  - `GAME_OVER_LOSE` / `GAME_OVER_CLEAR` を `Audio/SE/Jingles/` 配下へ
- `docs/specs/SPEC-025-fix-audio-paths.md` 新規 (= MCH 実構造表 + 旧→新パス対応表)
- `docs/specs/SPEC-INDEX.md`: SPEC-024 を `#31 (merged)` に flip、 SPEC-025 を Implementing 登録

### Added — SPEC-024 (= Picker Card Category Label + Lv.1 Effect Audit (= Oriflamme +0 → +1)) — merged in #31
- `docs/specs/SPEC-024-picker-card-category-and-lv1-fix.md` 新規 (= ピッカーカード上端にカテゴリ見出し追加、 全 19 系列 Lv.1 効果監査、 Oriflamme Lv.1 magnitude 0 → 1)
- `js/battle/levelup.js`: `renderLevelUpModal` で各カード先頭に `.levelup-card__cat` を挿入 (= weapon → 「武器エクステ」、 buff → 「強化エクステ」)
- `data/i18n/ui.json`: `levelup.cat.weapon` / `levelup.cat.buff` 追加
- `css/components.css`: `.levelup-card__cat` スタイル (= weapon = 赤系、 buff = 緑系)、 mobile breakpoint 対応
- `data/extensions.json`: Oriflamme tierParams を `0/1/1/2/3` → `1/1/2/2/3` に補正 (= Lv.1 ゼロ効果解消、 Lv.5 ceiling +3 維持)
- `docs/specs/SPEC-INDEX.md`: SPEC-023 を `#29 (merged)` に flip、 SPEC-024 を Implementing 登録

### Added — SPEC-023 (= Picker Stock Limit (= 武器 5 / 強化 5) + Reroll (= 1戦 2回)) — merged in #29
- `docs/specs/SPEC-023-picker-stock-and-reroll.md` 新規 (= 武器 5 / 強化 5 のストック上限 + 1 戦 2 回のリロール)
- `js/constants.js`: `STOCK_LIMIT_WEAPON=5` / `STOCK_LIMIT_BUFF=5` / `REROLL_PER_BATTLE=2`
- `js/state.js`: `state.battle.rerollsLeft`
- `js/battle/index.js`: startBattle で `rerollsLeft = REROLL_PER_BATTLE`
- `js/battle/levelup.js`: `_samplePicks` でカテゴリ別 stock 上限を判定 + `rerollPicks()` 新規 export
- `index.html`: levelup モーダル末尾に `#levelUpReroll` ボタン追加
- `data/i18n/ui.json`: `levelup.reroll` (= 「リロール (残 {n})」) / `levelup.rerollNone`
- `css/components.css`: `.levelup-modal__reroll`

### Added — SPEC-022 (= Enemy Variety + Time-Based Waves + Deep Yoshka Boss) — merged in #28
- `docs/specs/SPEC-022-enemy-variety-and-boss.md` 新規 (= 5 分間ステージ / 1 分ごとに敵 pool 拡張 / 4 分でボス出現 / 5 分 or ボス撃破でクリア)
- `js/constants.js`: `STAGE_DURATION_MS=300000` / `BOSS_SPAWN_AT_MS=240000` / `BOSS_ENEMY_ID=171` / `WAVE_TABLE` / `ENEMY_SPECS` (= 各敵に hp/dmg/speed/radius)
- `js/state.js`: `state.battle.stageElapsedMs` / `bossSpawned` / `bossDefeated`
- `data/enemies.json`: ディープ・ヨシュカ (= id 171) を追加
- `js/battle/enemies.js`: tickEnemies が wave 切替 + boss spawn + クリア判定、 spawnEnemyAtRing が enemyId 引数を取り個別 spec を使う
- `js/battle/sprites.js`: `getEnemySprite(enemyId)` 新規
- `js/battle/render.js`: enemy ごとに sprite を引き当て (= per-enemy 画像)
- `js/battle/damage.js`: ボス撃破時に `bossDefeated=true` (= clear trigger)
- `js/battle/index.js`: startBattle で stage timing reset

### Added — SPEC-021 (= Per-Tier Extension Icons + Names (= MCH 公式準拠、 1xxx → 5xxx)) — merged in #25
- `docs/specs/SPEC-021-per-tier-icons-and-names.md` 新規 (= MCH 公式の +1000 ルールで 19 系列 × 5 tier の icon と名前を完全準拠)
- `data/extensions.json`: 全 19 entry に `tierIconIds[5]` 追加 + `tierNames[5]` を MCH 公式名で上書き (= 95/95 hit)
- `js/extensions.js`: `extTierImg(ext, level)` 新規 export (= ext.tierIconIds[level-1] → URL)
- `js/battle/extensions-as-weapons.js`: weaponFromExt が iconId / projectileIconId に **現 tier の icon** を採用
- `js/main.js`: hero 詳細パネルで `extTierImg(ext, 1)` (= 開始時 = Common icon)
- `js/battle/levelup.js`: カード icon に `extTierImg(opt.ext, opt.nextLevel)` (= ピック後の見た目をプレビュー)
- 戦闘中の投射体 / 周回 / bomb は LV up と同時に新 tier の icon に切替

### Added — SPEC-020 (= Extension Icon Fix (= ユーザー指定 MCH ID で全系列を完全一致)) — merged in #24
- `docs/specs/SPEC-020-fix-icons-with-user-mapping.md` 新規 (= ユーザー指定の MCH Common id で 10 系列 + Knife を完全一致 icon に修正)
- `data/extensions.json`: 11 entry の `iconId` 更新
  - Panjandrum 1023→**1153** (Wooden Panjandrum) / Moai 1018→**1106** / Shuriken 1014→**1124** / LaserGun 1002→**1130** (Raygun) / Knife 1028→**1048** / Pierrot 1032→**1063** / Ramen 1030→**1154** / Apple 1033→**1159** / Oriflamme 1016→**1140** / Specimen 1019→**1169** / Gyoku 1009→**1098** (Orb)
- 残り 8 系列 (Revolver/Book/Axe/Blade/Armor/Boots/Horse/Shield) は SPEC-018 で既に完全一致のため変更なし
- `docs/specs/SPEC-INDEX.md`: SPEC-019 を Done (= #23 merged) に flip、 SPEC-020 を Implementing 登録

### Added — SPEC-019 (= 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon) — merged in #23
**Added Phase 0 (= 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon spec)**
- `docs/specs/SPEC-019-new-buffs-revolver-blade-gem.md` 新規 (= 液浸標本 attackRangeUp + ギョク pickupRangeUp の 2 buff 追加 / Revolver の projectileIconId=null + Lv.1 弾数 1 / Blade orbit を Book の半分以下に / 経験値 gem アイコンを Image/Icons/ce.png に差し替え)
- `docs/specs/SPEC-INDEX.md`: SPEC-018 を `#21 (merged)` に flip、 SPEC-019 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `GEM_ICON_PATH = "Image/Icons/ce.png"`
- `js/state.js`: `state.buffs.rangeMul = 1` / `state.buffs.pickupMul = 1` 追加
- `js/battle/buffs.js`: `attackRangeUp` / `pickupRangeUp` archetype を switch + `resetBuffs` で初期化
- `js/battle/extensions-as-weapons.js`: weapon spec に `projectileIconId` を伝播
- `js/battle/archetypes.js`: 各 fireXxx で range / orbitR / len / radius / aoeR に `rangeMul` を乗算、 投射体 iconId は `w.projectileIconId` を優先参照
- `js/battle/gems.js`: `tickGems` で pickup 半径 = `GEM_PICKUP_RADIUS * pickupMul`
- `js/battle/sprites.js`: `getGemSprite()` 追加
- `js/battle/render.js`: gem 描画を `drawSpriteCircular(getGemSprite(), ...)`、 fallback 既存ダイヤ
- `data/extensions.json`:
  - extId 18 (Specimen / 液浸標本 / attackRangeUp) 追加
  - extId 19 (Gyoku / ギョク / pickupRangeUp) 追加
  - Revolver: `projectileIconId: null` + tierParams.bullets を 1/2/3/4/6 に
  - Blade: tierParams.orbitR を 32/34/36/38/40 に

### Added — SPEC-018 (= Extension Icon Mapping Fix (= 名前と icon の不一致解消)) — merged in #21
**Added Phase 0 / Phase 1 (= Extension Icon Mapping Fix) — merged in #21**

### Added — SPEC-017 (= Sound Effects + BGM Wiring) — merged in #19
**Added Phase 0 (= Sound Effects + BGM Wiring spec)**
- `docs/specs/SPEC-017-audio-and-bgm.md` 新規 (= タイトル click → tooldev、 戦闘 BGM pvp loop、 被弾 1_single_damage、 gem 拾得 crash、 LV up open_treasure、 武器 pick insp、 buff (回復以外) 4_buff、 回復 (Armor/Ramen) 3_heal_resurrection、 lose / win)
- `docs/specs/SPEC-INDEX.md`: SPEC-013〜SPEC-016 を Done (= マージ済 #15-#18) に flip、 SPEC-017 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `SFX.*` 9 パス + `BGM_BATTLE` 追加
- `js/audio.js`: `unlockAudio()` を新規 export (= 初回 user gesture で autoplay policy 解除)
- `js/main.js`: dismissTitle で `unlockAudio()`、 applyHeroPick で `tooldev.mp3`
- `js/battle/index.js`: startBattle 末尾で `pvp.mp3` BGM
- `js/battle/enemies.js`: 被弾時 `1_single_damage.mp3` (= 200ms throttle)
- `js/battle/gems.js`: 拾得時 `crash.mp3` (= 80ms throttle)
- `js/battle/levelup.js`: open 時 `open_treasure.mp3`、 applyPick で weapon=insp / heal=3_heal / その他 buff=4_buff
- `js/battle/gameover.js`: triggerGameOver(reason) で BGM 停止 + lose / win 分岐

### Added — SPEC-016 (= HP Bars + Damage Numbers + Hit Freeze) — merged in #18
**Added Phase 0 (= HP Bars + Damage Numbers + Hit Freeze spec)**
- `docs/specs/SPEC-016-hp-bars-and-damage-feedback.md` 新規 (= player + enemy アイコン下に HP バー、 満タン非表示、 数値なし、 ダメージ数字 floater、 hit freeze 100ms)

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `DAMAGE_NUMBER_*` / `HIT_FREEZE_MS` / `HP_BAR_*`
- `js/battle/damage.js` 新規 (= `hitEnemy(enemy, dmg)` / `pushDamageNumber` / `tickDamageNumbers`)
- `js/state.js`: `state.battle.damageNumbers` 追加、 enemy entity に `hitFreezeMs`
- 全 damage path (= projectiles.js / archetypes.js orbits/bombs/shockwaves) を `hitEnemy` 経由に
- `js/battle/enemies.js`: `hitFreezeMs > 0` で移動停止、 spawn で 0 初期化、 player 被ダメ時に pushDamageNumber
- `js/battle/index.js` _loop: `tickDamageNumbers` 配線、 startBattle で reset
- `js/battle/render.js`: `_drawHpBar` (= 満タン非表示 + 緑/黄/赤 ratio 色)、 ダメージ数字を fillText + strokeText で描画

### Added — SPEC-015 (= Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave) — merged in #17
**Added Phase 0 (= Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave spec)**
- `docs/specs/SPEC-015-ext-visuals-balance-moai.md` 新規 (= 投射体/周回/爆弾を icon 描画 + Knife 45° offset + 武器威力底上げ + Moai 追従 + 着弾衝撃波)

**Planned Phase 1 (= 実装)**
- `js/battle/sprites.js` 拡張: `getExtSprite(extOrId)` + `drawSpriteRotated(ctx, entry, cx, cy, size, angle)`
- `js/battle/extensions-as-weapons.js`: weapon spec に iconId を含める
- `js/battle/archetypes.js`: 各 fireXxx で iconId / iconRotOffset を渡す、 Knife は π/4、 Moai に moaiTargetId / moaiAoeR / moaiAoeDmg
- `js/battle/projectiles.js`: kind="moaiDrop" の x 追従 + 着弾時 shockwave spawn
- `js/state.js`: `state.battle.shockwaves` 追加
- `js/battle/index.js` _loop: tickShockwaves 配線
- `js/battle/render.js`: projectiles / orbits / bombs を icon 描画化、 shockwave ring 描画
- `data/extensions.json`: 全武器の Lv.1 dmg 底上げ (= Knife/Revolver/Axe 30、 Moai/Pierrot 25-35、 Panjandrum 60、 等)

### Added — SPEC-014 (= Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation) — merged in #16
**Added Phase 0 (= Hero Selection Detail Panel + Per-Hero HP/Speed spec)**
- `docs/specs/SPEC-014-hero-detail-panel.md` 新規 (= ヒーロー選択モーダル上部に詳細パネル / hero.stats から HP 上限・移動速度を派生 / 担当 extension のアイコン+効果説明を表示)
- `docs/specs/SPEC-INDEX.md`: SPEC-013 を `#15 (open)`、 SPEC-014 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `HERO_HP_BASE` / `HERO_HP_PER_STAT` / `HERO_SPEED_BASE` / `HERO_SPEED_PER_AGI`
- `js/battle/index.js` `startBattle`: hero.stats から maxHp / speed を派生
- `index.html`: `<div id="heroDetail">` を hero modal 内 grid 直前に追加
- `js/main.js`: `renderHeroDetail(heroId)` を pickHero / openHeroSelectModal / onLangChange から呼出
- `data/i18n/ui.json`: `hero.detail.placeholder` / `hp` / `speed` / `starterWeapon`
- `css/components.css`: `.hero-detail*` 一式

### Added — SPEC-013 (= Hero Starter Weapon (= Lv.1 固定割当) + Picker Rules (= 重複なし / weapon ≥ 1)) — merged in #15
**Added Phase 0 (= Hero Starter Weapon + Picker Rules spec)**
- `docs/specs/SPEC-013-hero-starter-weapon-and-picker-rules.md` 新規 (= 各ヒーローに固定の starter 武器を Lv.1 で装備 / starter pick モーダル撤去 / Level up picker で同系列重複禁止 / Level up picker に最低 1 weapon 枠を保証)
- `docs/specs/SPEC-INDEX.md`: SPEC-012 を `#13 (open, also bundled in re-stack PR #14)` に、 SPEC-013 を Implementing 登録
- 10 ヒーロー × 10 武器の 1:1 mapping を確定 (= キャラクター性に寄せた配置)

**Planned Phase 1 (= 実装)**
- `js/constants.js` に `HERO_STARTING_WEAPON` (= heroId → weapon extId) と `HERO_STARTING_WEAPON_DEFAULT = 1` 追加
- `js/battle/index.js` `startBattle`: `triggerStarterPick()` 呼出を削除、 代わりに hero の starter weapon を `state.ownedExtensions` に push + `rebuildWeaponsFromOwned()`
- `js/battle/levelup.js` `_samplePicks`: 重複防止 (= Set で usedIds 管理)、 最低 1 weapon (= weaponPool が空でない限り 1 つ確実に含める)、 結果を最終 shuffle で表示順ランダム化

### Added — SPEC-012 (= 10 Weapon Archetype Behaviors (= radial / orbit / beam / placement / etc)) — merged in #13
**Added Phase 0 (= 10 Weapon Archetype Behaviors spec)**
- `docs/specs/SPEC-012-weapon-archetypes.md` 新規 (= 武器 10 系列の固有挙動を archetype.js で実装、 新 entity orbits/beams/bombs を追加、 Oriflamme bulletCountBonus を全 archetype に反映)
- `docs/specs/SPEC-INDEX.md`: SPEC-011 を `#12 (open)`、 SPEC-012 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/state.js`: `state.battle.orbits` / `beams` / `bombs` を追加、 startBattle で reset
- `js/battle/archetypes.js` 新規 (= fireRadial / fireBigHoming / fireDropTarget / fireStack / fireBeam / fireDiagonal / fireRandomRadial / firePlaceBomb / fireHoming + ensureOrbits + tickOrbits + tickBeams + tickBombs + tickHomingProjectiles)
- `js/battle/weapons.js`: archetype dispatcher 化
- `js/battle/projectiles.js`: targetId フィールド対応 (= bigHoming の追従)
- `js/battle/index.js` _loop: tickHomingProjectiles → tickProjectiles → tickOrbits → tickBeams → tickBombs の順で配線
- `js/battle/render.js`: orbits / beams / bombs の描画追加

### Added — SPEC-011 (= Extension Schema Overhaul (17 系列 × 5 段階) + Buff Archetype) — merged in #12
**Added Phase 0 (= Extension Schema Overhaul 17×5 + Buff Archetype spec)**
- `docs/specs/SPEC-011-extension-tiers-and-buffs.md` 新規 (= 武器 10 系列 + 強化 7 系列 × 5 段階レアリティ。 ピックで tier 昇格 = 名前/スキル名/効果説明が変化。 Buff 7 種が即時効果。 武器固有挙動は SPEC-012 で扱う)
- `docs/specs/SPEC-INDEX.md`: SPEC-010 を `#11 (open)`、 SPEC-011 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `data/extensions.json` v2: 17 系列 × tierNames[5] / skillName / skillDescTpl / tierParams[5] / archetype / category
- `js/extensions.js`: ローダ更新、 `getTierName(ext, level, lang)` / `getSkillDesc(ext, level, lang)` / `getCategory(ext)` 追加
- `js/state.js`: `state.buffs = {hpMaxBonus, regenPerSec, speedMul, cdMul, dmgTakenMul, dmgMul, bulletCountBonus}`、 startBattle で reset
- `js/battle/buffs.js` 新規 (= applyBuff(extId, level) / tickRegen(dt))
- `js/battle/extensions-as-weapons.js`: weaponFromExt を tier params 駆動に
- `js/battle/levelup.js`: applyPick で weapon vs buff 分岐、 カード DOM に tier name / skill name / skill desc / icon を表示
- `js/battle/index.js`: RAF ループに tickRegen 追加、 startBattle で state.buffs reset
- `js/battle/player.js`: speedMul 適用
- `js/battle/weapons.js`: cdMul / dmgMul 適用
- `js/battle/enemies.js`: dmgTakenMul 適用

### Added — SPEC-010 (= Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card) — merged in #11
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

### Added — SPEC-009 (= Game Over + Retry + Ranking Submit (= MVP 完了、 死んだら終わる + もう 1 回)) — merged in #10
**Added Phase 0 (= Game Over + Retry + Ranking Submit spec)**
- `docs/specs/SPEC-009-game-over.md` 新規 (= HP 0 で Game Over モーダル + 経過時間 / Lv / 撃破数 表示 + プレイヤー名入力 + 既存 submitScore() 経由でランキング送信 + リトライボタン)
- `docs/specs/SPEC-INDEX.md`: SPEC-008 を `#9 (open)` に、 SPEC-009 を Implementing 登録
- これにより survivor-like MVP 完了 (= 「死んだら終わる」 + 「もう 1 回」)

**Planned Phase 1 (= 実装)**
- `js/state.js`: `state.killCount` / `state.battle.gameOver` / `state.lastRunStats` 追加
- `js/battle/projectiles.js`: 敵撃破時 `state.killCount++`
- `js/battle/enemies.js`: 接触ダメージ後 HP <= 0 で `triggerGameOver()`
- `js/battle/gameover.js` 新規 (= triggerGameOver / applyRetry / モーダル制御 / submit / lang change)
- `js/battle/index.js`: startBattle で killCount / gameOver / lastRunStats を reset
- `index.html`: `#gameOverModal` 追加
- `data/i18n/ui.json`: `gameover.*` 11 キー追加
- `css/components.css`: `.gameover-modal*` / `.gameover-form*` / `.gameover-stat`

### Added — SPEC-008 (= Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化)) — merged in #9
**Added Phase 0 (= Extensions as Weapons + Level-Up Picker Modal spec)**
- `docs/specs/SPEC-008-extensions-as-weapons.md` 新規 (= 仮 shockwave 撤去 + EXT_ROSTER を投射体武器化 + Level up モーダル + 3 択ピック + starter pick + ext.stats 由来の dmg/cd/range/projSpeed)
- `docs/specs/SPEC-INDEX.md`: SPEC-007 を `#8 (open)` に、 SPEC-008 を Implementing 登録

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `EXT_MAX_LEVEL=5` / `PROJECTILE_LIFE_MS=1500` / `PROJECTILE_RADIUS=5` / `PICK_OPTIONS_COUNT=3` / `SERIES_COLOR` map 追加、 `SHOCKWAVE_*` 撤去
- `js/state.js`: `state.ownedExtensions=[]` / `state.pendingPickOptions=[]` / `state.pendingPickIsStarter=false` / `state.battle.projectiles=[]` 追加、 `state.battle.shockwaveAnims` 撤去
- `js/battle/extensions-as-weapons.js` 新規 (= weaponFromExt + rebuildWeaponsFromOwned)
- `js/battle/weapons.js` 全面改修 (= shockwave 撤去、 nearest enemy ホーミング投射体 spawn)
- `js/battle/projectiles.js` 新規 (= tickProjectiles で移動 + 衝突 + 寿命)
- `js/battle/levelup.js` 新規 (= triggerLevelUpPick / triggerStarterPick / sample / applyPick / open/close modal)
- `js/battle/gems.js`: tickGems の level up loop で triggerLevelUpPick(n) 呼出
- `js/battle/index.js`: startBattle 末尾で triggerStarterPick、 RAF ループに tickProjectiles 追加、 tickShockwaveAnims 撤去
- `js/battle/render.js`: projectiles 描画追加、 shockwaveAnims 描画撤去
- `index.html`: `#levelUpModal` + `#levelUpGrid` 追加
- `data/i18n/ui.json`: `levelup.title` / `levelup.sub` / `levelup.starter` / `ext.new` 追加
- `css/components.css`: `.levelup-modal*` / `.levelup-card*` 追加

### Added — SPEC-007 (= Enemies + Hardcoded Weapon + XP Gems + Level Trigger (= VS core loop 完成)) — merged in #8
**Added Phase 0 (= Enemies + Hardcoded Weapon + XP Gems + Level Trigger spec)**
- `docs/specs/SPEC-007-enemies-and-xp.md` 新規 (= 敵スポーン waves + 追跡 AI + 接触ダメージ + 仮 hardcoded shockwave 武器 + 撃破時 XP gem ドロップ + 拾う + level up trigger、 VS core loop の完成形)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を `#7 (open)` に、 SPEC-007 を Implementing 登録
- 武器を Extension に置き換える次段は SPEC-008 (= level up モーダル + extension picker)、 Game Over は SPEC-009

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `ENEMY_*` / `CONTACT_COOLDOWN_MS` / `GEM_*` / `SHOCKWAVE_VISUAL_*` / `XP_TO_NEXT_GROWTH` / `MAX_ENEMIES` 追加
- `js/state.js`: `state.battle` に `enemies` / `gems` / `shockwaveAnims` / `weapons` / `nextEntityId` / `lastEnemySpawnMs` / `contactCooldownMs` 追加
- `js/battle/enemies.js` 新規 (= tickEnemies + spawnEnemyAtRing + 接触ダメージ throttle)
- `js/battle/weapons.js` 新規 (= shockwave 自動発射 + 範囲ダメージ + アニメ tick)
- `js/battle/gems.js` 新規 (= spawnGem + tickGems + level up loop)
- `js/battle/index.js` 改修 (= startBattle で各 entity reset + RAF ループに新規 tick 追加)
- `js/battle/render.js` 改修 (= shockwave / gem / enemy 描画追加、 viewport カリング)

### Added — SPEC-006 (= Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従)) — merged in #7
**Added Phase 0 (= Battle Stage Scaffold spec)**
- `docs/specs/SPEC-006-battle-scaffold.md` 新規 (= canvas + プレイヤー移動 WASD/矢印/仮想ジョイスティック + カメラ追従 + 背景グリッド + DPR 対応 + RAF ループ + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md`: SPEC-006 を Implementing 登録 (= SPEC-005 にスタック)

**Planned Phase 1 (= 実装)**
- `js/constants.js`: `BATTLE_GRID_SIZE` / `PLAYER_RADIUS` / `PLAYER_SPEED_PX_S` / `JOYSTICK_RADIUS` / `JOYSTICK_DEADZONE` 追加
- `js/state.js`: `state.battle = { active, player, camera, viewport }` 追加
- `js/battle/index.js` 新規 (= startBattle / stopBattle / RAF ループ / resize)
- `js/battle/input.js` 新規 (= keyboard + 仮想ジョイスティック → unit vector)
- `js/battle/player.js` 新規 (= tickPlayer)
- `js/battle/render.js` 新規 (= clear / グリッド / プレイヤー描画)
- `index.html`: `<canvas id="battleCanvas">` + `<div id="joystick">` を `.stage` 内に追加、 `stage.placeholder` 撤去
- `data/i18n/ui.json`: `stage.placeholder` 削除
- `css/layout.css`: `.stage` flex 配置 + canvas full-fill
- `css/components.css`: `.battle-canvas` / `.joystick` / `.joystick__base` / `.joystick__stick`
- `js/main.js`: `applyHeroPick` 末尾で `startBattle(state.ownedHero)`

### Added — SPEC-005 (= VS HUD slim (= HP のみ + XP + Lv、 体温/食料 撤去、 サバイバー系アクション方向に転換)) — merged in #6
**Added Phase 0 (= VS HUD slim spec)**
- `docs/specs/SPEC-005-vs-hud-slim.md` 新規 (= 体温/食料 を撤去し HP のみ + XP バー + Lv 表示 + 経過時間 mm:ss、 サバイバー系アクションライクへの方向転換 prep)
- `docs/specs/SPEC-INDEX.md`: SPEC-004 を Done (#5) に flip、 SPEC-005 を Implementing として登録

**Planned Phase 1 (= 実装)**
- `js/state.js` から `state.day` / `state.stats.temp,food` / `state.statsMax.temp,food` を撤去、 `state.level=1` / `state.xp=0` / `state.xpToNext=5` / `state.elapsedTicks=0` を追加
- `js/constants.js`: `STATS_INITIAL` / `STATS_MAX` から temp/food を撤去、 `STATS_DECAY_PER_TICK.hp=0` (= idle decay 廃止)、 `XP_INITIAL` / `XP_TO_NEXT_INITIAL` / `LEVEL_INITIAL` 追加
- `js/survival.js`: `STAT_KEYS=["hp"]`、 `renderHud` を Level/Elapsed/HP/XP 4 セルに改修、 `formatElapsed` export
- `js/main.js`: `onTick` に `state.elapsedTicks++` 追加、 `advanceWeek` から `state.day++` 削除
- `index.html` HUD: `#hudLevel` + `#hudElapsed` + `#hudHp` + `#hudXp` (= temp/food 撤去)
- `data/i18n/ui.json`: `hud.level` / `hud.stats.xp` 追加、 `hud.day` / `hud.stats.temp` / `hud.stats.food` 撤去
- `css/base.css`: `--xp` 黄色変数追加
- `css/components.css`: `.hud__level` / `.hud__elapsed` / `.hud__bar[data-stat="xp"]` 追加、 temp/food 用セレクタ撤去

### Added — SPEC-004 (= Survival HUD (= Day N + HP / 体温 / 食料 + tick decay)) — merged in #5
**Added Phase 0 (= Survival HUD spec)**
- `docs/specs/SPEC-004-survival-hud.md` 新規作成 (= Day N + HP/体温/食料 の 3 スタッツ + 1 tick = 1 sec の線形 decay + pauseFlags 連動)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-002 / SPEC-003 を Done に flip、 PR 番号も #2 / #4 で正、 SPEC-004 を Implementing として登録)

**Planned Phase 1 (= 実装)**
- `js/state.js` に `state.day` (= 1 開始) と `state.stats` / `state.statsMax` (= `{hp, temp, food}`) を追加
- `js/constants.js` に `STATS_INITIAL` / `STATS_MAX` / `STATS_DECAY_PER_TICK` を追加
- `js/survival.js` 新規 (= `tickStatsDecay` / `clampStats` / `getStatRatio` / `renderHud`)
- `js/main.js` の `onTick` に `tickStatsDecay()` + `renderHud()` 呼出を追加、 `advanceWeek` に `state.day++` を追加
- `index.html` の `<header>` と `<section.stage>` の間に `<section class="hud" id="hud">` を新設 (= Day + 3 bar)
- `data/i18n/ui.json` に `hud.day` / `hud.stats.{hp,temp,food}` を追加
- `css/base.css` に `--hp` / `--temp` / `--food` の 3 色変数追加、 `css/components.css` に `.hud` / `.hud__bar` 系を追加、 `css/responsive.css` で 640px 未満の折り返し対応

### Added — SPEC-003 (= MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備)) — merged in #4
**Added Phase 0 (= MCH IP Data Sources spec)**
- `docs/specs/SPEC-003-mch-data-sources.md` 新規作成 (= ASSET_BASE を bearko/mycryptoheroes に切替、 heroes/extensions/enemies 3 種データ層を先行整備、 MCH 5 派閥 GENBU/SUZAKU/BYAKKO/SEIRYU/KOURYU カラー追加)
- `docs/specs/SPEC-INDEX.md` に SPEC-003 を Implementing として登録 (= SPEC-002 ブランチにスタック)

**Planned Phase 1 (= 実装)**
- `js/constants.js` の `ASSET_BASE` を `bearko/mycryptoheroes/main/` に切替
- `data/heroes.json` を v2 に更新 (= MCH 公式 ID 1001-2013 から 10 体 curated, faction フィールド導入)
- `data/extensions.json` 新規 (= 10 件 curated, version 1)
- `data/enemies.json` 新規 (= 10 件 curated, version 1)
- `js/heroes.js` を MCH スキーマに改修 (= `factionEmoji` 追加、 `localizedHeroBlurb` 撤去)
- `js/extensions.js` / `js/enemies.js` 新規 (= 同じ loader パターン)
- `js/main.js` の hero modal を MCH 駆動に、 init() で extensions/enemies も並行 fetch
- `data/i18n/ui.json` に `hero.faction.*` 5 派閥追加、 `hero.element.*` 撤去
- `css/base.css` に 5 派閥 CSS 変数追加、 `css/components.css` の hero-tile / header__hero-badge を `data-faction` 駆動に

### Added — SPEC-002 (= Hero Roster (= heroes.json + 10 体実データ + state.ownedHero)) — merged in #2
**Added Phase 0 (= Hero Roster spec)**
- `docs/specs/SPEC-002-hero-roster.md` 新規作成 (= heroes.json スキーマ / 10 体ロスター / loadHeroes / state.ownedHero / 元素 + レアリティ色帯 + onerror フォールバック)
- `docs/specs/SPEC-INDEX.md` を更新 (= SPEC-001 を Done, SPEC-002 を Implementing として登録)

**Changed Phase 1 (= 実装)**
- `data/heroes.json` (= version 1, 10 体 placeholder) の追加 (= SPEC-003 で v2 に上書き)
- `js/data-loader.js` の `loadJson` 経由で `loadHeroes()` を main.js から呼ぶ
- `js/state.js` に `state.ownedHero` 追加、 `pendingHeroPick` を heroId ベースに
- `index.html` ヘッダーに `#ownedHeroBadge`、 ヒーロー選択モーダルのタイル構造を実データ駆動に
- `data/i18n/ui.json` に `hero.element.*` / `hero.rarity.*` / `hero.select.imgAlt` を追加 (= `hero.element.*` は SPEC-003 で `hero.faction.*` に置換)
- `css/components.css` の `.hero-tile` を画像 + meta に再構成、 element / rarity の色付けを追加
<!-- END AUTO-UNRELEASED -->

## [SPEC-001] — 2026-05-09 (PR #1 merged as `b3f5e93`)

### Added — Phase 0 (= Charter / 文書)
- `docs/charters/PROJECT_CHARTER.md` を MyCryptoSurvivor 用に書き換え
- `docs/specs/SPEC-INDEX.md` 新規作成 (= SPEC 一覧表)
- `docs/specs/SPEC-001-phase-1-bootstrap.md` 新規作成 (= Charter / 識別子置換 / Day 1 ヒーロー選択 mock)
- `README.md` を MyCryptoSurvivor 用に書き換え

### Changed — Phase 1 (= 識別子と Day 1 mock)
- `js/constants.js` — `LS_PREFIX` を `"mcs"` に確定、 `ASSET_BASE` を `bearko/MyCryptoSurvivor-assets` に確定
- `index.html` — `<title>` / OGP / splash / title をプロジェクト名に置換、 ヒーロー選択モーダル mock 追加
- `js/main.js` — Press to Start で `openHeroSelectModal()` を呼ぶ、 タイル選択 / 確定の handler
- `js/state.js` — `state.pendingHeroPick` を追加 (= UI 状態のみ)
- `data/i18n/ui.json` — タイトル / ヒーロー選択 関連文字列を追加
- `css/components.css` — ヒーロー選択モーダル / タイル grid のスタイル

## [Bootstrap] — 2026-05-09

`bearko/mycryptotemplate` v0.1.0 を初期コミットとして取り込み。
`docs/lessons-learned/MCT-MCF-KPT.md` などテンプレート時点の文書を全継承。

[Unreleased]: https://github.com/bearko/MyCryptoSurvivor/compare/main...feat/spec-002-hero-roster
