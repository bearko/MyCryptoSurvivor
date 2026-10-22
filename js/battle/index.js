// ============================================================
// battle/index.js — 戦闘ステージ entry (= startBattle / RAF / resize)
// (= SPEC-006)
// ============================================================
//
// applyHeroPick から startBattle(hero) を呼ぶ。
// RAF ループは pauseFlags を見て update を skip するが、 描画は続ける。

import { tickResumeCountdown, resetResumeCountdown } from "./resume-countdown.js";   // SPEC-104
import { tickMilestones, resetMilestones } from "./milestones.js";   // SPEC-105
import { isShopMode, resetShopForStage, tickShop, hideShopBar } from "./shop.js";   // SPEC-109
import { resetMissionsForStage, tickMissions } from "./missions.js";   // SPEC-112
import { state } from "../state.js";
import {
  FACTION_COLOR, FACTION_COLOR_DEFAULT,
  PLAYER_RADIUS, PLAYER_SPEED_PX_S, CHAR_SCALE,
  XP_INITIAL, XP_TO_NEXT_INITIAL, LEVEL_INITIAL,
  STATS_INITIAL, STATS_MAX,
  HERO_STARTING_WEAPON, HERO_STARTING_WEAPON_DEFAULT,
} from "../constants.js";
import { getExt, getCategory } from "../extensions.js";
import { installInput, getInputVector } from "./input.js";
import { tickPlayer, centerCameraOnPlayer } from "./player.js";
import { tickEnemies, tickSeparation, setBossIncomingHook } from "./enemies.js";
import { tickWeapons } from "./weapons.js";
import { tickProjectiles } from "./projectiles.js";
import { tickGems } from "./gems.js";
import { tickMagicCards } from "./magic-cards.js";
import { resetField, tickField, tickRobot } from "./field.js";   // SPEC-140: 合体ロボ
import { rebuildWeaponsFromOwned } from "./extensions-as-weapons.js";
import { renderBattle } from "./render.js";
import { getHeroSprite, getDefaultEnemySprite, getBackgroundSprite } from "./sprites.js";
import { tickRegen, resetBuffs, applyBuff } from "./buffs.js";
import { perksForRun, perk, rerollsPerBattle, baseMaxHp, startLevelBonus } from "../perks.js";   // SPEC-090c / SPEC-139
import { getMeta } from "../meta.js";
import { triggerLevelUpPick } from "./levelup.js";
import {
  tickOrbits, tickBeams, tickBombs, tickHomingProjectiles,
  tickShockwaves,
} from "./archetypes.js";
import { tickDamageNumbers, hitEnemy } from "./damage.js";
import { tickBossAttack } from "./boss-attack.js";
import { tickEnemyShots } from "./enemy-shots.js";
import { resetGimmicks, tickGimmicks } from "./gimmicks.js";
import { resetArena, tickArena } from "./arena.js";
import { tickBossMoves } from "./boss-moves.js";
import { startCoachIfFirst, tickCoach, hideCoach } from "./coach.js";
import { resetFx, tickFx } from "./fx.js";
import { startBgm } from "../audio.js";
import { startRtaRun, rtaRegulationFor, placePlatformToasts, setChatVisible, reportStageStart } from "../platform.js";
import { BGM_BATTLE, STAGE_TABLE, WATCH_SPEED, EXT_MAX_LEVEL } from "../constants.js";
import { t, tpl } from "../i18n.js";
import { heroImg } from "../heroes.js";
import { heroMaxHp, heroSpeed, heroDmgMul, heroCdMul } from "../hero-stats.js";   // SPEC-097
import { resetSignature, tickSignature } from "./signature.js";   // SPEC-100
import { tickLLExtras } from "./ll.js";   // SPEC-101
import { naviSay, naviLines } from "../navi.js";
import { clearNaviTipQueue } from "../navi-tips.js";
import { isEasy, easyStage, easyHeroMul, stageCount } from "../easy.js";   // SPEC-147 / SPEC-154
import { newRunStats, tickRunStats } from "./run-stats.js";   // SPEC-148
import { tickLessons, clearLessons, showLesson } from "../lesson.js";   // SPEC-147
import { clearBossChest } from "./boss-chest.js";   // SPEC-153
import { isStory, storyStage, landOf, loadStory, mergeStartExt } from "../story.js";   // SPEC-165
import { resetStoryBattle, tickStoryBattle } from "./story-battle.js";   // SPEC-165

let _canvas = null;
let _ctx = null;
let _raf = 0;
let _lastMs = 0;
// SPEC-054: 懐中時計の 2 倍速で余分に進めたゲームの時間。 戦闘の時計 (= 武器の間隔・敵の出現) は 実時間 + これ
let _ffOffsetMs = 0;
let _installed = false;

/**
 * battle 開始。 hero faction で player 色を上書きしてスポーン。
 * 多重呼出は安全 (= idempotent: 既に active なら player 位置だけ reset)。
 */
/**
 * SPEC-162: 装備の引き継ぎ (= 純関数ではない: state.ownedExtensions と state.run.ownedAtStage を書く)
 *   ステージ 1: 空から。 新しいステージ: いまの装備のまま。 同じステージのやり直し (= メニュー): 入ったときの装備に戻す
 */
export function carryOwnedExtensions(idx) {
  const at = state.run.ownedAtStage;
  if (idx === 0) state.ownedExtensions = [];
  else if (at && at.idx === idx) state.ownedExtensions = at.owned.map((o) => ({ ...o }));
  state.run.ownedAtStage = { idx, owned: state.ownedExtensions.map((o) => ({ extId: o.extId, level: o.level })) };
}

export function startBattle(hero) {
  _ensureCanvas();
  if (!_canvas) {
    console.warn("[battle] #battleCanvas not found");
    return;
  }
  if (!_installed) {
    installInput(_canvas);
    window.addEventListener("resize", resizeCanvas);
    _installed = true;
  }

  // SPEC-091: 戦闘中は全体チャットの 💬 を隠す (= 結果の画面とタイトルで戻す)
  setChatVisible(false);
  // SPEC-040: RTA で始めた run は、 ステージ 1 の開始で計測を始める (= 再走も同じ。 前の計測は中断になる)
  // SPEC-048: レギュレーションは今のルールから決める (= NORMAL か ABSOLUTE ×2.0 固定)
  if (state.rtaMode && (state.currentStageIdx ?? 0) === 0) {
    const reg = rtaRegulationFor(state.regulation, state.absolute);
    if (reg) startRtaRun(reg);
  }
  // SPEC-096: ステージ 3 にたどり着いた (= 共通基盤のアチーブメント)。 SPEC-147: EASY は送らない
  if (!isEasy()) reportStageStart(state.currentStageIdx ?? 0, STAGE_TABLE.length);
  // SPEC-041: 新しい挑戦 (= ステージ 1) では、全ステージ通しの記録を空にして、総合スコアをまだ送っていない状態にする。
  // (= ゲームオーバーからの再走 applyRetry は state.run を空にしていなかったので、ここでそろえる)
  if ((state.currentStageIdx ?? 0) === 0) {
    state.run.stages.length = 0;
    state.run.totalKills = 0;
    state.run.totalElapsedMs = 0;
    state.run.scoreSent = false;
    state.run.missionGum = 0;   // SPEC-131
    state.run.missionClears = 0;   // SPEC-136: 内訳の「ミッション達成 n 回」
    // SPEC-146: 初めての人の最初の挑戦 (= まだ 1 回も挑戦を終えていない。 RTA は初回には選べないが、 念のため外す)
    state.run.firstRun = (getMeta().runs | 0) === 0 && !state.rtaMode;
    state.run.stats = newRunStats();   // SPEC-148: 負けた理由の分析 (= 1 回の挑戦を通して積む)
  }
  if (!state.run.stats) state.run.stats = newRunStats();

  const b = state.battle;
  // SPEC-090c: スキルツリーの効果 (= RTA では切る)。 不死鳥は 1 回の挑戦に 1 度
  state.perks = perksForRun(getMeta(), { rta: !!state.rtaMode });
  if ((state.currentStageIdx ?? 0) === 0) b.phoenixUsed = false;
  b.xpAcc = 0;
  b.player.x = 0;
  b.player.y = 0;
  b.player.r = Math.round(PLAYER_RADIUS * CHAR_SCALE);   // SPEC-077
  b.player.face = 0;   // SPEC-077: 傾き (= 動く向きへ少し傾ける)
  b.player.speed = PLAYER_SPEED_PX_S;
  b.player.color = FACTION_COLOR[hero?.faction] ?? FACTION_COLOR_DEFAULT;
  b.camera.x = 0;
  b.camera.y = 0;

  // SPEC-010: hero / 敵の sprite preload (= 描画は ready 待ち、 fallback は単色円)
  b.playerSprite       = getHeroSprite(hero);
  b.heroDissolved      = false;   // SPEC-150: 復活して戻ってきた
  b.defaultEnemySprite = getDefaultEnemySprite();
  getBackgroundSprite();   // SPEC-026: 背景画像 preload (= 戻り値は render 側で参照)

  // SPEC-007 / SPEC-008 / SPEC-009 / SPEC-012: 戦闘世界をクリーンに reset
  b.enemies.length     = 0;
  b.gems.length        = 0;
  b.projectiles.length = 0;
  b.orbits.length      = 0;     // SPEC-012
  b.beams.length       = 0;     // SPEC-012
  b.bombs.length       = 0;     // SPEC-012
  b.shockwaves.length  = 0;     // SPEC-015
  b.damageNumbers.length = 0;   // SPEC-016
  b.weapons            = [];                    // SPEC-008: starter pick で最初の武器が入る
  b.nextEntityId       = 1;
  b.lastEnemySpawnMs   = performance.now();
  b.spawnAcc           = 0;                     // SPEC-078: 湧く数の余り
  b.contactCooldownMs  = 0;
  b.gameOver           = false;                 // SPEC-009: 多重 trigger 防止 flag
  b.stageElapsedMs     = 0;                     // SPEC-022: ステージ経過リセット
  resetResumeCountdown({ release: true });     // SPEC-104: 新しいステージは数えずに始める
  resetMilestones(state.run.totalKills ?? 0);  // SPEC-105: 通算の撃破数の節目
  b.threatTier         = 0;                     // SPEC-107: 敵の段階はステージごと
  b.crossWarns         = [];
  b.nextCrossMs        = 0;
  b.bossSpawned        = false;                 // SPEC-022: ボス multi-spawn 防止
  b.bossDefeated       = false;                 // SPEC-022: ボス撃破フラグ
  b.bossChestOpen      = false;                 // SPEC-153: 宝箱を開けているあいだ
  b.bossChestDust      = null;
  b.fastForwardMs      = 0;                     // SPEC-054: 2 倍速はステージをまたがない
  _ffOffsetMs          = 0;
  b.rerollsLeft        = rerollsPerBattle();    // SPEC-023: picker リロール残数 (+ SPEC-090c 引き直し)
  // SPEC-030: ボス攻撃エンティティを毎戦リセット
  b.bossProjectiles    = b.bossProjectiles ?? [];
  b.bossOrbits         = b.bossOrbits      ?? [];
  b.bossProjectiles.length = 0;
  b.bossOrbits.length      = 0;
  // SPEC-062: 撃ってくる敵の弾と、 出す間隔の時計
  b.enemyShots         = b.enemyShots ?? [];
  b.enemyShots.length  = 0;
  b.bossRings          = [];                    // SPEC-080: 叩きつけの衝撃の輪
  b.lastShooterSpawnMs = performance.now();
  b.nextPackMs         = 0;                     // SPEC-065: 大群の群れ
  // SPEC-033: マジックカード + レアエネミーカウンタも各ステージ開始でリセット
  b.magicCards         = b.magicCards ?? [];
  b.magicCards.length  = 0;
  b.lastRareSpawnMs    = performance.now();
  // SPEC-162: 装備はステージをまたいで残る (= ステージ 1 だけ空から。 同じステージのやり直しは入ったときの装備に戻す)
  carryOwnedExtensions(state.currentStageIdx ?? 0);
  if (isStory()) state.ownedExtensions = mergeStartExt(loadStory().loadout?.owned ?? [], storyStage()?.startExt ?? []);   // SPEC-165: 覚えている持ち物 ＋ レシピの開始装備 (= 作者 2026-10-22: 装備はストーリーのあいだ残る。 空ならヒーローの初期武器)
  state.killCount       = 0;                    // SPEC-009: 撃破カウンタ
  state.lastRunStats    = null;                 // SPEC-009: snapshot
  resetBuffs();                                 // SPEC-011: 強化系列の効果リセット (= 引き継いだ強化は下で掛け直す)
  resetField();                                 // SPEC-053: 建物・壺・アイテム (= プレイヤーを (0, 0) に置いたあと)
  resetGimmicks();                              // SPEC-064: ステージの仕掛け
  resetArena();                                 // SPEC-079: ボス戦の枠を外す
  resetStoryBattle();                           // SPEC-165: ストーリーの進み (= クリア条件・目印・一言)

  // SPEC-014: hero.stats.hp / agi から HP 上限と移動速度を派生 (= hero ごとに性能差)
  // SPEC-147: EASY は根 (= サバイバーの覚醒) を取るまで弱い (= HP と攻撃 ×0.6。 根で ×1.0 に戻る)
  const ezMul        = easyHeroMul(getMeta());
  const maxHp        = Math.round(baseMaxHp(heroMaxHp(hero)) * ezMul * (storyStage()?.heroMul?.hp ?? 1));   // SPEC-090c: 頑丈なからだ・鉄壁。 SPEC-165: 試練では HP を多く
  state.statsMax.hp  = maxHp;
  b.baseMaxHp        = maxHp;   // SPEC-090c: アーマーはこれに足す (= buffs.js)
  state.stats.hp     = maxHp;
  b.player.speed     = heroSpeed(hero);
  // SPEC-097: PHY は武器のダメージに、 INT は武器の間隔に効く (= weapons.js が掛ける)
  b.heroDmgMul       = heroDmgMul(hero) * ezMul;   // SPEC-147
  b.heroCdMul        = heroCdMul(hero);
  resetSignature(hero);   // SPEC-100: 固有スキル
  state.xp           = XP_INITIAL;
  state.xpToNext     = XP_TO_NEXT_INITIAL;
  state.level        = LEVEL_INITIAL;
  state.elapsedTicks = 0;

  // SPEC-013: ヒーローに固定の starter weapon を Lv.1 で装備 (= starter pick モーダルは廃止)
  const starterId  = HERO_STARTING_WEAPON[hero?.heroId] ?? HERO_STARTING_WEAPON_DEFAULT;
  const starterExt = getExt(starterId);
  b.starterExtId   = starterId;   // SPEC-101: この武器だけ LL まで上がる
  b.llFx           = [];
  if (starterExt && getCategory(starterExt) === "weapon") {
    if (!state.ownedExtensions.some((o) => String(o.extId) === String(starterId))) {
      state.ownedExtensions.push({ extId: starterId, level: Math.min(EXT_MAX_LEVEL, 1 + startLevelBonus(starterId)) });   // SPEC-139: 仕込み
    }
    // SPEC-162: 引き継いだ強化の効き目を掛け直す (= 武器は組み直し)
    for (const o of state.ownedExtensions) if (getCategory(getExt(o.extId)) === "buff") applyBuff(o.extId, o.level);
    rebuildWeaponsFromOwned();
  } else {
    console.warn("[battle] starter weapon not found for hero",
                 hero?.heroId, "→ extId", starterId);
  }

  b.active = true;
  resetFx();             // SPEC-045: 揺れ・粒・予告をステージごとに作り直す
  if (!isEasy()) startCoachIfFirst();   // SPEC-042: 初回のステージ 1 だけ操作ガイド (= SPEC-147: EASY はレッスンで説明する)
  // SPEC-147: EASY の時刻 (= レッスンが読む)
  const ez = easyStage();
  b.easyBossAtMs = ez?.bossAtMs ?? null;
  b.easyWarnMs = ez?.warnMs ?? null;
  b.easyShopTimes = ez?.shopTimesMs ?? null;
  b.easyRareDone = false;
  // SPEC-090c: 先手 (= 始まってすぐ選ぶ。 各ステージの始まりに。 経験値の梯子は進めない)
  // SPEC-109: ショップで遊ぶときは CE に読み替える (= resetShopForStage)
  // SPEC-111: RTA でもショップ (= 作者の決定 2026-10-20。 RTA の記録は作者のものだけなので、 レギュレーションの版は分けない)
  // SPEC-147: 初めての人は EASY で遊び方を覚えるので、 ショップはステージ 1 から (= SPEC-146 の「初回はショップなし」は外した)
  if (isShopMode()) {
    const s = resetShopForStage(state.currentStageIdx ?? 0);
    const lo = isStory() ? loadStory().loadout : null;   // SPEC-165: 財布と固有スキルの段もストーリーのあいだ残る (= タイトルに戻っても)
    if (lo) { s.ce = lo.ce; s.sigLevel = lo.sigLevel; s.sigCe = lo.sigCe; }
  } else {
    state.shop = null;
    hideShopBar();
    const headStart = perk("startLevels");
    if (headStart > 0) { state.level += headStart; triggerLevelUpPick(headStart); }
  }
  resetMissionsForStage(!!state.shop);   // SPEC-112: ミッションはショップで遊ぶときだけ

  resizeCanvas();
  centerCameraOnPlayer();   // SPEC-155: 最初のコマから自分を真ん中に (= 止めたまま降りこむ復活で、 ステージの外が映っていた)
  _showStageIntro();     // SPEC-046: 「STAGE n / ステージ名」の帯
  // SPEC-153: ボスの予告が出たら、 マインちゃんが「中央の赤いエリアにボスが来るよ！」 (= EASY のステージ 1 ではレッスンが同じことを言う)
  setBossIncomingHook(() => {
    if (isStory()) return;   // SPEC-165: ストーリーはレシピの一言 (= bossWarn) が言う
    if (showLesson("s1.boss")) return;
    naviSay(naviLines("bossWarn"), { place: "battle", autoHideMs: 1800, top: _commTop() });
  });
  resizeCanvas();
  _placeToasts();        // SPEC-052: 通知は HUD (と RTA の時計) の下に出す
  _lastMs = performance.now();
  if (!_raf) _raf = requestAnimationFrame(_loop);

  // SPEC-017: 戦闘 BGM (= retry でも startBgm 内 stopBgm が掛かるので 1 トラックに収束)
  startBgm(BGM_BATTLE, 0.32);
}

/** SPEC-056: 戦闘の通信窓は HUD の下 (= RTA なら時計のさらに下) */
function _commTop() {
  const hud = document.getElementById("hud");
  const bottom = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
  return bottom + (state.rtaMode ? 40 : 8);
}

/** SPEC-052: 共通基盤の通知を画面の上、 HUD の下 (= RTA なら時計のさらに下) に置く */
function _placeToasts() {
  const hud = document.getElementById("hud");
  const bottom = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
  placePlatformToasts(bottom > 0 ? bottom + (state.rtaMode ? 40 : 8) : 0);
}

/** SPEC-046: ステージの始まりの帯。 CSS のアニメーションで 2.2 秒出て消える (= 遊びは止めない。 SPEC-056 で延ばした) */
function _showStageIntro() {
  const el = document.getElementById("stageIntro");
  if (!el) return;
  const idx = state.currentStageIdx ?? 0;
  const stage = STAGE_TABLE[idx];
  const no = document.getElementById("stageIntroNo");
  const name = document.getElementById("stageIntroName");
  const story = storyStage();   // SPEC-165: 「1-2」とランドの名前
  if (no) no.textContent = story ? story.id : tpl(t("stage.introNo", "STAGE {n}"), { n: String(idx + 1) });
  if (name) name.textContent = story ? `${t(`story.land.${landOf(story.id).id}`, "")}  ${t(`story.${story.id}.name`, "")}` : (stage ? t(stage.nameKey, stage.nameKey) : "");
  // SPEC-056: 帯の手前にヒーロー
  const heroEl = document.getElementById("stageIntroHero");
  if (heroEl && state.ownedHero) heroEl.src = heroImg(state.ownedHero.heroId);
  el.classList.remove("hidden", "stage-intro--in");
  void el.offsetWidth;
  el.classList.add("stage-intro--in");
  clearTimeout(_introTimer);
  _introTimer = setTimeout(() => el.classList.add("hidden"), 2300);
  // SPEC-056: マインちゃんがステージを告げる (= 戦闘では押せない。 言い終えると引っこむ)
  if (story) {   // SPEC-165: ステージの始まりの一言はレシピの文
    naviSay(naviLines("story", { key: story.lines?.intro ?? "" }), { place: "battle", autoHideMs: 2200, top: _commTop() });
    return;
  }
  naviSay(naviLines("stage", {
    stageIdx: idx, stageCount: stageCount(), rta: !!state.rtaMode,   // SPEC-154
    stageName: stage ? t(stage.nameKey, stage.nameKey) : "",
    bossSec: easyStage() ? Math.round(easyStage().bossAtMs / 1000) : null,   // SPEC-153
  }), { place: "battle", autoHideMs: 1600, top: _commTop() });
}
let _introTimer = 0;

export function stopBattle() {
  state.battle.active = false;
  hideCoach();   // SPEC-042
  clearNaviTipQueue();   // SPEC-068: 戦闘をやめたら、 話す予定のひとことは捨てる
  clearLessons();        // SPEC-147
  clearBossChest();      // SPEC-153
  if (_raf) {
    cancelAnimationFrame(_raf);
    _raf = 0;
  }
}

export function getBattle() { return state.battle; }

function _ensureCanvas() {
  if (_canvas) return;
  _canvas = document.getElementById("battleCanvas");
  if (_canvas) _ctx = _canvas.getContext("2d");
}

function resizeCanvas() {
  if (!_canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = _canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  _canvas.width  = Math.round(w * dpr);
  _canvas.height = Math.round(h * dpr);
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.battle.viewport.w = w;
  state.battle.viewport.h = h;
}

/** 1 回ぶんの戦闘の更新 (= SPEC-054 で 2 倍速のときは 1 コマで 2 回呼ぶ) */
function _step(dt, now) {
  const v = getInputVector();
  tickRunStats(state.run.stats, dt);   // SPEC-148: 生存時間 (= 止まっているあいだは呼ばれない)
  tickPlayer(dt, v);
  centerCameraOnPlayer();
  tickEnemies(dt, now);          // SPEC-007: スポーン + 追跡 + 接触ダメージ
  tickBossMoves(dt);             // SPEC-080: ボスの型 (= 突進・叩きつけ・放射・渦)
  tickGimmicks(dt);              // SPEC-064: ステージの仕掛け (= 珠の列・パンチカード・トロイの木馬)
  tickSeparation();              // SPEC-065: 敵どうしを押し分ける (= 群れが画面を埋める)
  tickArena(dt);                 // SPEC-079: ボス戦の枠 (= 自分・ボスを中に入れる)
  tickWeapons(dt, now);          // SPEC-008/012: archetype dispatcher
  tickHomingProjectiles(dt);     // SPEC-012: bigHoming の弾道補正
  tickProjectiles(dt);           // SPEC-008: 投射体の移動 + 衝突 + 寿命
  tickOrbits(dt, now);           // SPEC-012: Book / Blade の周回 + 衝突
  tickBeams(dt, now);            // SPEC-012/031: LaserGun の持続レーザー (= 250ms 累積 dispatch)
  tickBombs(dt);                 // SPEC-012: Pierrot の遅延爆発
  tickSignature(dt, (j, d) => hitEnemy(j, d, "sig"));   // SPEC-100: 固有スキル (= 毒霧・テスラコイル)。 SPEC-148: 出どころ
  tickLLExtras(dt, (j, d) => hitEnemy(j, d, "ll"));     // SPEC-101: 真・MCHブレードの一撃・真・ミョルニルの雷
  tickShockwaves(dt);            // SPEC-015: Moai 着弾の AoE 衝撃波
  tickBossAttack(dt, now);       // SPEC-030: ボス攻撃 (= ファオ放射 / yamap 周回) + 衝突
  tickEnemyShots(dt);            // SPEC-062: 撃ってくる敵の弾
  tickDamageNumbers(dt);         // SPEC-016: ダメージ数字 floater
  tickFx(dt);                    // SPEC-045: 揺れ・縁の赤・粒
  tickGems(dt);                  // SPEC-007: 拾う + level up trigger
  tickMagicCards(dt);            // SPEC-033: マジックカード (= 即時 LV up アイテム)
  tickField(dt);                 // SPEC-053: 壺・宝箱を出す + お助けアイテムを拾う
  tickStoryBattle();             // SPEC-165: ストーリーのクリア条件・ハート・一言
  tickRobot(dt);                 // SPEC-140: 合体ロボの無敵
  tickRegen(dt);                 // SPEC-011: Ramen 系列の HP regen
  tickCoach(dt, v.x !== 0 || v.y !== 0);   // SPEC-042: 操作ガイド
  tickMilestones(_commTop() + 64);          // SPEC-105: 撃破数の節目 (= 止めない)
  tickLessons();                            // SPEC-147: EASY のレッスン (= 店より先に止める)
  if (state.shop) tickShop();               // SPEC-109: 時刻になったら店を開く (= 時間を止める)
  if (state.mission) tickMissions();        // SPEC-112: ミッションの持ちかけ・残り時間・達成
  if (state.battle.contactCooldownMs > 0) {
    state.battle.contactCooldownMs -= dt * 1000;
  }
}

let _loopErrs = 0;
function _loop(now) {
  // SPEC-129: 次のコマを先に頼む。 1 コマでエラーが出ても、 戦闘のループが止まったままにならない
  // (= 以前は最後に頼んでいたので、 例外 1 回でループが死に、 やり直しても _raf が残っていて動き出さなかった)
  _raf = requestAnimationFrame(_loop);
  try {
    _frame(now);
  } catch (e) {
    if (_loopErrs++ < 5) console.error("[battle] frame error", e);
  }
}

function _frame(now) {
  const dt = Math.min(0.05, (now - _lastMs) / 1000);  // タブ復帰時の暴走を防ぐ
  _lastMs = now;
  tickResumeCountdown(now);   // SPEC-104: 中断する画面を閉じたら 3 秒数えてから再開

  // SPEC-054: 懐中時計の 2 倍速のあいだは 1 コマで 2 回進める (= 敵・自分・弾・ステージの時計すべて)。
  // 残り時間は実時間で減らす。 途中でレベルアップなどで止まったら、 そこで打ち切る
  const b = state.battle;
  const steps = (b.fastForwardMs ?? 0) > 0 ? WATCH_SPEED : 1;
  for (let i = 0; i < steps; i++) {
    if (!(b.active && state.pauseFlags === 0)) break;
    if (i > 0) _ffOffsetMs += dt * 1000;
    _step(dt, now + _ffOffsetMs);
  }
  if (steps > 1 && b.active && state.pauseFlags === 0) {
    b.fastForwardMs = Math.max(0, b.fastForwardMs - dt * 1000);
  }

  if (_ctx) renderBattle(_ctx, now);
}
