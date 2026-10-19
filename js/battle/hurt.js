// ============================================================
// battle/hurt.js — 自分が受けるダメージの 1 か所 (= SPEC-090c)
// ============================================================
//
// 体当たり・ボスの技と弾・撃ってくる敵の弾・仕掛け、 どれもここを通る。
// 被弾の間隔 (= 無敵時間) は共通で、 スキルツリーの「受け身」で伸びる。
// HP が 0 になったら、 「不死鳥」を持っていて 1 回の挑戦でまだ使っていなければ 50% で立ち上がる。

import { state } from "../state.js";
import { SFX } from "../constants.js";
import { pushDamageNumber } from "./damage.js";
import { playSe } from "../audio.js";
import { fxPlayerHurt, fxBurst } from "./fx.js";
import { triggerGameOver } from "./gameover.js";
import { contactCooldownMs, bossDmgTakenMul, perk, PHOENIX_HP_RATIO, PHOENIX_IFRAME_MS } from "../perks.js";
import { sigTryPhantom } from "./signature.js";   // SPEC-100

/**
 * @param {number} raw   元のダメージ (= 強化の被ダメ倍率はここで掛ける)
 * @param {{boss?: boolean, shake?: boolean}} opt  boss: ボスの攻撃 (= 竜殺しが効く)。 shake: 大きく揺らす
 * @returns {boolean} 受けたら true (= 無敵時間の中なら false)
 */
export function hurtPlayer(raw, { boss = false, shake = boss } = {}) {
  const b = state.battle;
  if (b.gameOver || b.contactCooldownMs > 0) return false;
  let taken = raw * (state.buffs?.dmgTakenMul ?? 1);
  if (boss) taken *= bossDmgTakenMul();
  const takenInt = Math.max(1, Math.round(taken));
  state.stats.hp = Math.max(0, state.stats.hp - takenInt);
  b.contactCooldownMs = contactCooldownMs();
  pushDamageNumber(b.player.x, b.player.y - b.player.r - 4, takenInt, "#ff7676");
  playSe(SFX.PLAYER_DAMAGED, 200, 0.55);
  fxPlayerHurt(shake);
  // SPEC-100: 幻の生存者 (= アナスタシア。 1 ステージに 1 度) が先、 次に不死鳥 (= 1 回の挑戦に 1 度)
  if (state.stats.hp <= 0 && !b.gameOver && !tryPhantom() && !tryPhoenix()) triggerGameOver();
  return true;
}

/** SPEC-100: 幻の生存者 (= 倒れる一撃を 1 ステージに 1 度だけ HP 1 で耐え、 数秒消える) */
function tryPhantom() {
  if (!sigTryPhantom()) return false;
  const b = state.battle;
  pushDamageNumber(b.player.x, b.player.y - b.player.r - 18, "1", "#bfe6ff", "lg");
  fxBurst(b.player.x, b.player.y, "#bfe6ff", 18, 220);
  playSe(SFX.PICK_HEAL, 0, 0.7);
  return true;
}

/** 不死鳥: 1 回の挑戦に 1 度だけ、 倒れずに 50% 回復 (= 使ったら b.phoenixUsed) */
function tryPhoenix() {
  const b = state.battle;
  if (!perk("phoenix") || b.phoenixUsed) return false;
  b.phoenixUsed = true;
  const hp = Math.max(1, Math.round(state.statsMax.hp * PHOENIX_HP_RATIO));
  state.stats.hp = hp;
  b.contactCooldownMs = PHOENIX_IFRAME_MS;
  pushDamageNumber(b.player.x, b.player.y - b.player.r - 18, `+${hp}`, "#9ef0b0", "lg");
  fxBurst(b.player.x, b.player.y, "#ffd56a", 18, 220);
  playSe(SFX.PICK_HEAL, 0, 0.7);
  return true;
}
