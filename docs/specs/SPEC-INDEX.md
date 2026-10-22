# SPEC Index — MyCryptoSurvivor

各 SPEC は `docs/specs/SPEC-NNN-<topic>.md` に置く。 ステータスは
`Draft / InReview / Approved / Implementing / Done / Cancelled` のいずれか。

<!-- BEGIN AUTO-INDEX -->
| ID | タイトル | Status | Phase | 実装 PR |
|---|---|---|---|---|
| SPEC-001 | Phase 1 Bootstrap (= Charter / 識別子 / Day 1 ヒーロー選択 mock) | Done | Phase 0 / Phase 1 | #1 (merged) |
| SPEC-002 | Hero Roster (= heroes.json + 10 体実データ + state.ownedHero) | Done | Phase 0 / Phase 1 | #2 (merged) |
| SPEC-003 | MCH IP Data Sources (= bearko/mycryptoheroes 由来の heroes/extensions/enemies 先行整備) | Done | Phase 0 / Phase 1 | #4 (merged) |
| SPEC-004 | Survival HUD (= Day N + HP / 体温 / 食料 + tick decay) | Done | Phase 0 / Phase 1 | #5 (merged) |
| SPEC-005 | VS HUD slim (= HP のみ + XP + Lv、 体温/食料 撤去、 サバイバー系アクション方向に転換) | Done | Phase 0 / Phase 1 | #6 (merged) |
| SPEC-006 | Battle Stage Scaffold (= canvas + プレイヤー移動 WASD/joystick + カメラ追従) | Done | Phase 0 / Phase 1 | #7 (merged) |
| SPEC-007 | Enemies + Hardcoded Weapon + XP Gems + Level Trigger (= VS core loop 完成) | Done | Phase 0 / Phase 1 | #8 (merged) |
| SPEC-008 | Extensions as Weapons + Level-Up Picker Modal (= スキル = extension、 投射体武器化) | Done | Phase 0 / Phase 1 | #9 (merged) |
| SPEC-009 | Game Over + Retry + Ranking Submit (= MVP 完了、 死んだら終わる + もう 1 回) | Done | Phase 0 / Phase 1 | #10 (merged) |
| SPEC-010 | Mobile Viewport Fit + Hero/Enemy Sprites + Ext Icon/Effect in Level-up Card | Done | Phase 0 / Phase 1 | #11 (merged) |
| SPEC-011 | Extension Schema Overhaul (17 系列 × 5 段階) + Buff Archetype | Done | Phase 0 / Phase 1 | #12 (merged) |
| SPEC-012 | 10 Weapon Archetype Behaviors (= radial / orbit / beam / placement / etc) | Done | Phase 0 / Phase 1 | #13 (merged) |
| SPEC-013 | Hero Starter Weapon (= Lv.1 固定割当) + Picker Rules (= 重複なし / weapon ≥ 1) | Done | Phase 0 / Phase 1 | #15 (merged) |
| SPEC-014 | Hero Selection Detail Panel + Per-Hero HP/Speed Differentiation | Done | Phase 0 / Phase 1 | #16 (merged) |
| SPEC-015 | Extension Visual Icons + Weapon Balance + Moai Homing/Shockwave | Done | Phase 0 / Phase 1 | #17 (merged) |
| SPEC-016 | HP Bars + Damage Numbers + Hit Freeze | Done | Phase 0 / Phase 1 | #18 (merged) |
| SPEC-017 | Sound Effects + BGM Wiring | Done | Phase 0 / Phase 1 | #19 (merged) |
| SPEC-018 | Extension Icon Mapping Fix (= 名前と icon の不一致解消) | Done | Phase 0 / Phase 1 | #21 (merged) |
| SPEC-019 | 2 New Buff Series + Revolver/Blade Tweaks + XP Gem Icon | Done | Phase 0 / Phase 1 | #23 (merged) |
| SPEC-020 | Extension Icon Fix (= ユーザー指定 MCH ID で全系列を完全一致) | Done | Phase 0 / Phase 1 | #24 (merged) |
| SPEC-021 | Per-Tier Extension Icons + Names (= MCH 公式準拠、 1xxx → 5xxx) | Done | Phase 0 / Phase 1 | #25 (merged) |
| SPEC-022 | Enemy Variety + Time-Based Waves + Deep Yoshka Boss | Done | Phase 0 / Phase 1 | #28 (merged) |
| SPEC-023 | Picker Stock Limit (= 武器 5 / 強化 5) + Reroll (= 1戦 2回) | Done | Phase 0 / Phase 1 | #29 (merged) |
| SPEC-024 | Picker Card Category Label + Lv.1 Effect Audit (= Oriflamme +0 → +1) | Done | Phase 0 / Phase 1 | #31 (merged) |
| SPEC-025 | Fix Audio Paths (= MCH カタログ実体に整合、 404 → 200) | Done | Phase 0 / Phase 1 | #32 (merged) |
| SPEC-026 | Balance Tuning + Bounded Stage with Background (= XP / Gyoku / 1001.png + dim overlay) | Done | Phase 0 / Phase 1 | #33 (merged) |
| SPEC-027 | Clear Title on Win Conditions (= ボス撃破 / 5 分耐久 で 「クリア!」 表記) | Done | Phase 0 / Phase 1 | #34 (merged) |
| SPEC-028 | Orbit Redistribution + Per-Level Size Growth (= Book/Blade 等間隔 + tier icon swap + Lv 連動拡大) | Done | Phase 0 / Phase 1 | #35 (merged) |
| SPEC-029 | Logo Image + OG Thumbnail (= タイトル/スプラッシュ画像化 + X/OGP サムネ) | Done | Phase 0 / Phase 1 | #36 (merged) |
| SPEC-030 | Three-Stage System (= node : アバカス / ホレリス / トロイ + ファオ / yamap ボス) | Done | Phase 0 / Phase 1 | #38 (merged) |
| SPEC-031 | Pierce + LaserGun Fix + Pierrot AoE + Horse Tune + Gunbai + Header Date Removal | Done | Phase 0 / Phase 1 | #39 (merged) |
| SPEC-032 | Changelog Fragments + Auto-Generated SPEC-INDEX | Done | Phase 0 / Phase 1 | #40 (merged) |
| SPEC-033 | Rare Enemies + Magic Card + Activity Report + Stage 2/3 Boss Clear Fix | Done | Phase 0 / Phase 1 | #41 (merged) |
| SPEC-034 | Rare Size + Weapon Growth × 2 + Reroll 3 + Pause Menu | Done | Phase 0 / Phase 1 | #42 (merged) |
| SPEC-035 | Ranking — GAS Backend + UI | Done | Phase 0 / Phase 1 | #43 (merged) |
| SPEC-036 | GAS Sample Data Seed + Re-apply Default API URL | Done | Phase 0 / Phase 1 | #44 (merged) |
| SPEC-037 | Game Modes — NORMAL / ABSOLUTE Regulation | Done | Phase 0 / Phase 1 | #46 (merged) |
| SPEC-038 | Activity Report Icon Layout + Anonymous Default Name | Done | Phase 0 / Phase 1 | #47 (merged) |
| SPEC-039 | bearko.games Platform Trophies | Done | Phase 3 | #48 (merged) |
| SPEC-040 | bearko.games Platform RTA | Done | Phase 3 | #49 (merged) |
| SPEC-041 | bearko.games Platform Total Score | Done | Phase 3 | #50 (merged) |
| SPEC-042 | How to Play — Help Rewrite + First-Run Coach Hint | Done | v1.0 | #60 (merged) |
| SPEC-043 | UI Foundation — Tokens, Fonts, Buttons, Modals, Safe Area, Reduced Motion | Done | v1.0 | #61 (merged) |
| SPEC-044 | Settings — BGM/SE Volume, Reduce Effects, Language, Auto-Pause on Tab Switch | Done | v1.0 | #62 (merged) |
| SPEC-045 | Battle Feel — Shake, Hurt Flash, Kill Burst, Boss Warning, Kill Counter | Done | v1.0 | #63 (merged) |
| SPEC-046 | Result Reveal — Stage Intro, Stage Clear, Game Over, Activity Report | Done | v1.0 | #64 (merged) |
| SPEC-047 | v1.0 Release — Version, Changelog Releases, Icons, Manifest, OGP | Done | v1.0 | #65 (merged) |
| SPEC-048 | bearko.games Platform RTA — ABSOLUTE ×2.0 | Done | Phase 3 | #71 (merged) |
| SPEC-050 | bearko.games Platform — link to the overall ranking | Done | Phase 3 | #74 (merged) |
| SPEC-051 | bearko.games Platform score — send the difficulty name, not the multiplier | Done | Phase 3 | #76 (merged) |
| SPEC-052 | Result Screen — Toasts on Top, Back to Title / Portal, Player Name from bearko.games | Done | Phase 3 | #77 (merged) |
| SPEC-053 | Field — Buildings, Pots, Chests and Helper Items (Bar Magnet / Pancake) | Done | Phase 3 | #78 (merged) |
| SPEC-054 | RTA Pocket Watch — 2x Game Speed for 10 Seconds (RTA only) | Done | Phase 3 | #79 (merged) |
| SPEC-055 | Node Terminal Design Language — Panels, Living Backgrounds, Wipe Transitions | Done | v1.1 UI | #80 (merged) |
| SPEC-056 | Navigator Mine and Hero Layering — Speaking Navi, Hero Showcase, Stage Telop | Done | v1.1 UI | #81 (merged) |
| SPEC-057 | Battle UI — HUD, Card Deal, Boss Cut-in, Damage Numbers, Background Saturation | Done | v1.1 UI | #82 (merged) |
| SPEC-058 | Result & Menu UI — Result Telop, Result Tiles, Activity Report, Menu, Settings, Ranking, Help | Done | v1.1 UI | #83 (merged) |
| SPEC-059 | Navi Dock — Dedicated Band for Mine on Mode Select and Hero Select | Done | v1.1 UI | #85 (merged) |
| SPEC-060 | Menu Sound — Menu BGM and Button Click SE | Done | v1.1 UI | #86 (merged) |
| SPEC-061 | Boss Countdown — From the Warning to the Boss Spawn | Done | v1.2 Battle | #87 (merged) |
| SPEC-062 | Shooter Enemies — Keep Distance and Fire Telegraphed Shots | Done | v1.2 Battle | #88 (merged) |
| SPEC-063 | Thunder Drum — Helper Item That Clears Every Enemy on Screen | Done | v1.2 Battle | #89 (merged) |
| SPEC-064 | Stage Gimmicks — Abacus Beads, Hollerith Punch Cards, Trojan Horse | Done | v1.2 Battle | #90 (merged) |
| SPEC-065 | Troy Horde and Faster Leveling — Flood, Packs, Separation, Sprite Cache | Done | v1.2 Battle | #91 (merged) |
| SPEC-066 | Measure v1.2 on New Versions — Total Score v4 (balance 2) and RTA v3 | Done | v1.2 Battle | #92 (merged) |
| SPEC-067 | Level-up Reroll Without Repeats and Skip | Done | v1.2 Battle | #93 (merged) |
| SPEC-068 | Mine's First-time Tips | Done | v1.2 Battle | #94 (merged) |
| SPEC-069 | Screen BGM (Title craft.mp3), Tap-to-start Gate and Reliable Sound Start | Done | v1.2 UI | #95 (merged) |
| SPEC-070 | Logo Remake — Transparent, Centered Stack | Done | v1.2 UI | #96 (merged) |
| SPEC-071 | Boss Warning 10s Ahead and Countdown at the Right Edge in RTA | Done | v1.2 Battle | #97 (merged) |
| SPEC-072 | Level-up — Skip on the Left (Muted), Reroll on the Right (Prominent) | Done | v1.2 Battle | #98 (merged) |
| SPEC-073 | Panjandrum Spins While Rolling Toward Enemies | Done | v1.2 Battle | #99 (merged) |
| SPEC-074 | Treasure Chest Uses an MCH Extension Art (Music Box) | Done | v1.2 Battle | #100 (merged) |
| SPEC-075 | Abacus Beads — Spheroidal Graphite Art and Rows in Any Direction | Done | v1.2 Battle | #101 (merged) |
| SPEC-076 | Treasure Chest Art — Golden Moai of Treasure | Done | v1.2 Battle | #102 (merged) |
| SPEC-077 | Bigger Characters and a Subtle Hit Disc | Done | v1.3 Battle | #103 (merged) |
| SPEC-078 | Dense Swarm — the Screen Fills Before the Boss (50% / 75% / 90%) | Done | v1.3 Battle | #105 (merged) |
| SPEC-079 | Boss Arena — Swarm Vanishes, a 1/4 Ring Closes In, Boss Spawns at the Center | Done | v1.3 Battle | #107 (merged) |
| SPEC-080 | Stronger Bosses — More HP, a Telegraphed Charge, Slam, Burst and Spiral | Done | v1.3 Battle | #108 (merged) |
| SPEC-081 | Boss Chests — Golden Moai Chests in the Arena with Magic Cards and Helper Items | Done | v1.3 Battle | #109 (merged) |
| SPEC-082 | Measure v1.3 on New Versions — Total Score balance 3 and RTA v4 | Done | v1.3 Battle | #112 (merged) |
| SPEC-083 | Hero Select — Preview of the Starting Weapon (Common → Uncommon → Rare) | Done | v1.3 Menu | #104 (merged) |
| SPEC-084 | Gentler Early Swarm — the Spawn Ramp Starts Slow, Recycling Only Before the Boss | Done | v1.3 Battle | #106 (merged) |
| SPEC-085 | Mine Full Voice — Title Call, Every Line Voiced, Voice Volume | Done | v1.3 Menu | #111 (merged) |
| SPEC-086 | Hero Select Preview — Fewer Enemies (1 / 2 / 3 Every 2 Seconds) | Done | v1.3 Menu | #110 (merged) |
| SPEC-087 | Level-up Screen — Equipped Strip and "Rank Up" Highlight on Owned Candidates | Done | v1.3 Battle | #115 (merged) |
| SPEC-088 | First Play Is NORMAL Only — ABSOLUTE and RTA Locked Until One Run Ends | Done | v1.3 Menu | #116 (merged) |
| SPEC-089 | Stage Intro Band — PC Layout (Centered Content, 192px Hero) | Done | v1.3 Battle | #117 (merged) |
| SPEC-090 | Skill Tree — Permanent Upgrades Bought with GUM (from Score) and Gold Dust (from Bosses) | Done | v1.4 Meta | #114 (merged) |
| SPEC-091 | Global Chat Placement — Show on Title and Results, Hide During Battle (Platform SPEC-004) | Done | v1.4 Meta | #121 (merged) |
| SPEC-092 | Shared Player Avatar — Entry in Settings (Platform SPEC-005) | Done | v1.4 Meta | #122 (merged) |
| SPEC-093 | Skill Tree UX — Tighter Layout, Current-Effect Panel, First-Time Guide by Mine, Per-Screen Lines | Done | v1.4 Meta | #123 (merged) |
| SPEC-094 | Skill Tree Detail UI — Workshop-style Detail, 3D Gradient Buttons, Reset Moved Out of Reach, Zoom Tools | Done | v1.4 Meta | #124 (merged) |
| SPEC-095 | Ranking API URL Hardening — GAS Web App Only, No Hash Override | Done | v1.4 Meta | #125 (merged) |
| SPEC-096 | bearko.games Achievements — 14 IDs for the Hero Book and Extensions (Platform SPEC-008) | Implementing | v1.4 Meta | claude/achievement-system-overhaul-zzt7gf |
| SPEC-097 | Hero Roster v2 — 10 Heroes Matched to Their Weapons, 4 Weapon Series Replaced, PHY/INT Take Effect | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-098 | Hero Unlock by bearko.games Achievements — 2 Starters, 4 in Survivor, 4 in Other Titles | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-099 | Hero Select — Radar Chart of Each Hero's Strengths | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-100 | Hero Signature Skills — Same Stage, a Different Game for Each Hero | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-101 | LL Rank-Up — The Hero's Own Weapon Can Go Beyond Legendary | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-102 | CE Suction — Crystals Fly Into the Hero Instead of Vanishing | Implementing | v1.5 Heroes | claude/achievement-system-overhaul-zzt7gf |
| SPEC-103 | v1.6 Shop & Missions — Buy Skills with CE, Merchant Shadow Heroes, Signature Upgrades, Missions, Enemy Tiers, Kill Milestones (Design & Roadmap) | Accepted | v1.6 Shop | #135 (open) |
| SPEC-104 | Resume Countdown — 3 Seconds Before Play Resumes After Any Pausing Screen | Done | v1.6 Shop | #137 (merged) |
| SPEC-105 | Kill Milestones — A Big Banner at 100 / 250 / 500 / 1,000 Kills Without Stopping Play | Done | v1.6 Shop | #138 (merged) |
| SPEC-106 | LL Unlock — The LL Rank-Up Appears Only After Clearing All Stages With That Hero | Done | v1.6 Shop | #139 (merged) |
| SPEC-107 | Threat Tiers — Stronger Enemy Types Join as Stage Kills Rise; Stronger Enemies Drop More CE | Done | v1.6 Shop | #140 (merged) |
| SPEC-108 | Crown Series — A Buff Extension That Raises the CE You Pick Up | Done | v1.6 Shop | #141 (merged) |
| SPEC-109 | Shop — Buy Extensions with CE from Merchant Shadow Heroes (Hold, Ban, Reroll, Gift Tickets) behind ?shop=1 | Done | v1.6 Shop | #142 (merged) |
| SPEC-110 | Signature Skill Upgrade — A Permanent Shop Card (Lv.1 → Lv.5) Kept Across Stages | Done | v1.6 Shop | #143 (merged) |
| SPEC-111 | RTA Uses the Shop Too (Same Regulation v4) — Shop and Missions in Every Mode | Done | v1.6 Shop | #153 (merged) |
| SPEC-112 | Missions — Shadow Heroes Offer Mid-Wave Challenges (Accept / Decline), Hero-Themed Effects, Rewards That Feed the Shop | Done | v1.6 Shop | #151 (merged) |
| SPEC-114 | Sound Effects on Web Audio — Fix SEs (Defeat Jingle, Shop Purchases) Going Silent After Long Fights | Done | v1.6 Shop | #144 (merged) |
| SPEC-115 | Shop Onboarding — First Shop Explains CE and Gives One Free Item; Countdown to the Next Shop | Done | v1.6 Shop | #145 (merged) |
| SPEC-116 | Mine Guides to the Skill Tree After a Defeat — First-Time Lead-In, Three Rotating Lines, Tree Intro; Voice Script | Done | v1.6 Shop | #146 (merged) |
| SPEC-117 | Shop Goes Live — Header Countdown Bar with the Next Merchant Walking In, HP Heal on Each Shop Visit, Shop On by Default (RTA Keeps Level-Ups) | Done | v1.6 Shop | #149 (merged) |
| SPEC-118 | Skill Tree Wording for the Shop (XP → CE, Head Start / Pass Reward / Prodigy) and Unclipped Title Badge | Done | v1.6 Shop | #150 (merged) |
| SPEC-119 | Shop Fits One Screen on Phones — Equipped + Wallet on One Row, Boss Count Beside the Merchant, Compact Cards | Done | v1.6 Shop | #152 (merged) |
| SPEC-120 | Shop Corner Icons — Lock (Top-Right) and Two-Tap Ban (Top-Left), Full Descriptions, Integer Heal, Reroll Refills Sold Slots | Done | v1.6 Shop | #154 (merged) |
| SPEC-121 | Shop Prices Jump at Epic — Lv.4 800 / Lv.5 4000 / LL 10000 CE | Done | v1.6 Shop | #156 (merged) |
| SPEC-122 | Shop Prices Tuned So a CE-Maxed, Efficient Run Just Maxes Everything by the 6th Shop — Lv.4 300 / Lv.5 1500 / LL 3000 | Done | v1.6 Shop | #157 (merged) |
| SPEC-123 | Signature Skill Goes to Lv.10 With Steep Prices; Extensions Rare 500 / Epic 2,000 / Legendary 10,000 | Done | v1.6 Shop | #158 (merged) |
| SPEC-124 | Closing Hero Select Without Picking Returns to Mode Select (Was Stuck on an Empty Battle Screen) | Done | v1.6 Fix | #159 (merged) |
| SPEC-125 | Mission Rewards Become a Choice of Three — Gift Ticket, a Giver-Themed Boon, or Healing — After a Line From the Giver | Done | v1.6 Mission | #160 (merged) |
| SPEC-126 | Wording — Replace "ただ" With "無料" (Shop Reroll, Gift Ticket, Merchant Line, Help) | Done | v1.6 Shop | #161 (merged) |
| SPEC-127 | Gift Tickets Needed Scale With Rarity — Common/Uncommon 1, Rare 2, Epic 3, Legendary 5 | Done | v1.6 Shop | #162 (merged) |
| SPEC-128 | Signature Skill Goes to Lv.15; Leftover CE Flows Into It at Stage End Instead of Carrying Over (Gift Tickets Still Carry) | Done | v1.6 Shop | #163 (merged) |
| SPEC-129 | Fix Stage 3 Freeze When the Trojan Horse Appears; Keep the Battle Loop Alive Through a Frame Error | Done | v1.6 Fix | #164 (merged) |
| SPEC-130 | Choose Gift Tickets or CE Per Purchase — "Pay With Gift Tickets First" Checkbox, Remembered | Done | v1.6 Shop | #165 (merged) |
| SPEC-131 | More GUM (Mission Clear Bonus, Kill Bonus) and 21 Extension-Specific Skill Tree Panels | Done | v1.6 Skill Tree | #166 (merged) |
| SPEC-132 | Stage Clear Grants GUM and Links to the Skill Tree; the Tree's Back Button Returns to Where You Came From (Bottom-Right) | Done | v1.6 Skill Tree | #167 (merged) |
| SPEC-133 | Skill Tree on an Integer Grid (Ported From MyCryptoWorkshop) — Branches by Direction, requires, Hero-Gated Weapon Mastery | Done | v1.6 Skill Tree | #169 (merged) |
| SPEC-134 | Skill Tree Interaction From MyCryptoWorkshop — Pan on Window, Pinch/Wheel About a Point, Zoom Limits, Minimap, Branch Jump, Overview | Done | v1.6 Skill Tree | #171 (merged) |
| SPEC-135 | Skill Tree Screen Split From MyCryptoWorkshop — 860px Breakpoint, 340px Side Panel on PC, Compact 46dvh Panel on Phones | Done | v1.6 Skill Tree | #173 (merged) |
| SPEC-136 | GUM Breakdown With Formulas — Time, Kills, Stage Clear, Level, Leftover Gift Tickets Converted to GUM | Done | v1.6 Skill Tree | #174 (merged) |
| SPEC-137 | Mission Difficulty Stars ★1–★3 — Stricter Rules and Richer Rewards, Gift Tickets From ★2, Star Colors, White Fog, Mine's First-Mission Guide | Done | v1.6 Missions | #175 (merged) |
| SPEC-138 | Shadow Takeda Shingen Mission — Wind (Faster Enemies), Forest (Silence), Fire (More Enemies), Mountain (No Movement), Widening by Star | Done | v1.6 Missions | #176 (merged) |
| SPEC-139 | Skill Tree Extension Nodes — Favored Weapon (Starting Weapon Shows Up More), Per-Extension Start Level (Prep), Weapon Price Cuts | Done | v1.6 Skill Tree | #177 (merged) |
| SPEC-140 | Combined Robot Helper Item — Unlocked in the Skill Tree, Drops From Pots and Chests, Invincibility With Rainbow Glow and Its Own BGM; Rank Raises Rarity and Duration | Done | v1.6 Skill Tree | #178 (merged) |
| SPEC-141 | Helper Items On Top of the Horde and Off-Screen Item Pointers With Icons | Done | v1.6 Battle | #179 (merged) |
| SPEC-142 | Resume With "Ready → Go!" Instead of a 3-2-1 Countdown (0.8 s Pause, Go! Shown While Playing) | Done | v1.6 Battle | #180 (merged) |
| SPEC-143 | Mine Suggests Posting on X After Clearing Stage 1 — Post Button Opens X With #MyCryptoGames and the Game URL, 100 GUM Once | Done | v1.6 Growth | #181 (merged) |
| SPEC-144 | Favored Weapon as an Explicit Chance (20/40/60%) and Colored Numbers and Terms in Skill Details and Mission Text | Done | v1.6 Skill Tree | #182 (merged) |
| SPEC-145 | Per-Extension Bargain and Prep Nodes Extend Straight From Each Mastery — Weapons in Rows Above Attack, Buff Bargains in a U Beside Treasure | Done | v1.6 Skill Tree | #183 (merged) |
| SPEC-146 | First Run for New Players — Threat Stays at T0, Level-Ups Instead of the Shop, and "Try Again" Straight From the Skill Tree After a Defeat | Done | v1.6 Onboarding | #184 (merged) |
| SPEC-147 | EASY Mode — A Guided 3-Stage Run for First-Timers (Short Stages, Mine's Voiced Lessons, Designed Loss on Stage 3, Skill Tree Awakening, Then NORMAL) | Superseded | v1.7 Onboarding | #186 (open) |
| SPEC-148 | Defeat Analysis — Damage Taken by Source, DPS and Damage Dealt per Weapon, Comparison With the Previous Defeat and Personal Best, and Mine's Skill Suggestions | Done | v1.7 Onboarding | #187 (merged) |
| SPEC-149 | EASY Tuning (Enemies ×1/3, Stage 1 Survivable Without Moving, Stage 2 Not), Lesson Voice Cut on Boss Kill, and Confetti on Clear | Done | v1.7 Onboarding | #188 (merged) |
| SPEC-150 | Revive Instead of Retry — Hero Dissolves Into Pixels on Defeat, Mine Offers the Golden Watch of the Queen, Strengthen in the Skill Tree, Then the Pixels Gather Back and the Hero Revives | Done | v1.7 Onboarding | #188 (merged) |
| SPEC-151 | Revive v2 — Slow Damage SE Instead of the Lose Jingle, Pixels Gather Into a Spinning Spindle Vortex, Mine Appears Full-Body With the Golden Watch, Translucent Result Over the Vortex, Sink on Revive, Pixels Rain Down Into the Hero on the Stage; Lesson Voice No Longer Overlaps the Stage Call | Done | v1.7 Onboarding | #189 (merged) |
| SPEC-152 | Revive Polish — Stay Dark Until the Pixels Rain In, Skill Tree Not Dimmed by the Vortex, No Opening Shop in EASY (Opening Shop Becomes the "Early Opening" Node), and the Frozen Screen-Shake Offset | Done | v1.7 Onboarding | #191 (merged) |
| SPEC-153 | EASY Stage Line in Seconds, Compact Revive Screen That Emphasizes GUM and Gold Dust, Shake Edge Fix, Mine's Boss Warning, Boss Chest Opening for Gold Dust, No Achievements in EASY, MCH Warrior Only in EASY With Billy the Kid as the Clear Reward, and the One-Column Line Script | Done | v1.7 Onboarding | #192 (merged) |
| SPEC-154 | Lessons as the Top Comm Bubble With a Cursor (No Cut-Ins, Game Keeps Running), EASY Cut to Two Stages, Shop Gauge Fixed on Stages 2/3, Skill Tree Reachable From the Stage-Clear Screen Once Awakened, and the Boss Chest Turning Into the Gold Dust Icon | Superseded | v1.7 Onboarding | #193 (open) |
| SPEC-155 | Recommended Upgrades Bought in One Tap on the Revive Screen, a Two-Column Revive Screen on PC, the Revive Explanation Only Once, the Clock Icon Kept on One Line, Camera Centered Before the First Frame After Reviving, and the Line Script With Variables Expanded Into Real Words | Done | v1.7 Onboarding | #194 (merged) |
| SPEC-156 | The Skill Tree and the Result Screen Shrink by the Width of the Chat Dock, With a Button in the Tree Header to Collapse or Expand the Chat | Done | v1.7 Onboarding | #196 (merged) |
| SPEC-157 | Bulk Unlock of Every Claimable Skill Cheapest First With a Gold Dust Toggle, a Yellow Frame Around the Selected Node, the "Available Skills" Button Selecting the Node, and No Recommended Upgrade Until the Root Is Owned | Done | v1.7 Onboarding | #197 (merged) |
| SPEC-158 | Stage-Clear Screen Rebuilt Like REVIVE (Small Stats Line, Big GUM and Gold Dust, Breakdown Under "Details" or in the Left Column on PC), a Victory Jingle When the NODE CLEAR Band Appears, Two Columns Decided by the Card's Available Width So the Open Chat Dock Makes Three Clean Columns, and #ポチゲー in the X Post Body | Done | v1.7 Onboarding | #198 (merged) |
| SPEC-159 | Fourth Batch of Mine's Recordings — 89 WAVs Matched to the Line Script, 32 New Voices Converted to MP3 (Existing Voices Kept for the 57 Duplicates), Wired to the Mission, Revive, Advice, Lessons, Telops, Boss Warning and EASY Stage Line, and the Originals Removed | Done | v1.7 Onboarding | #199 (merged) |
| SPEC-160 | On the Second Death Onward the REVIVE Screen Opens Straight Away and Mine Encourages From the Bottom Dock (Icon and Bubble) Before the Advice, With No Extra Screen | Done | v1.7 Onboarding | #200 (merged) |
| SPEC-161 | The Skill Tree Opened From the Stage-Clear Screen Gets a "Next Node" Button in the Same Spot as "Revive", Going Straight to the Next Stage Without Returning to the Stage-Clear Screen | Done | v1.7 Onboarding | #201 (merged) |
| SPEC-162 | Extensions and CE Carry Over Between Stages, Extension Levels Go to 15 (Rank Up Every 3 Levels, the Old Max Is Level 10, Levels 11–15 Go Beyond, LL at 16), and the Shop Price Table Spans 15 Levels | Done | v1.8 Balance | #202 (merged) |
| SPEC-163 | Balance Pass Around the Expected DPS Curve — Gentler Spawn Flood and Density, HP-Based Stage Scaling for Carried-Over Gear, Bigger Bosses, Stronger Skill Tree Ranks, Repeat-Buy Shop Cards, a Desk Simulator and a Fast Autoplay Harness | Done | v1.8 Balance | #203 (merged) |
| SPEC-164 | EASY Guidance Gates — No Ring on the CE Lesson, Skill-Tree-Only Revive Before the Root, Root-First Skill Tree, and a Gentle Stage 2 (Harmless Mobs, Long Boss, Thunder Drum for Half) | Superseded | v1.8 Balance | #204 (open) |
| SPEC-165 | Story Mode — Five MCH Lands, 25 Short Stages That Teach One Element Each With a Forced Path, Shadow-Hero Trials as Mid-Bosses That Become NORMAL Mission Givers, Big Bosses Only at 3-5 and 5-5, Replacing EASY and Unlocking NORMAL at the End | Approved | v1.9 Story | #205 (open) |
<!-- END AUTO-INDEX -->

## 命名規則

- ファイル名: `SPEC-NNN-<kebab-topic>.md` (= 連番 3 桁 + 簡潔な topic)
- 連番は **欠番にしない** (= Cancelled も削除せず履歴として残す)
- Phase ラベルは SPEC タイトルに含める (= 実装フェーズが追える)

## 参考

- `docs/process/SPEC_DRIVEN_DEVELOPMENT.md` — Spec → Phase → PR の流れとテンプレート
- `docs/charters/PROJECT_CHARTER.md` — プロジェクトのゴール (= SPEC を起こすときの判断軸)

