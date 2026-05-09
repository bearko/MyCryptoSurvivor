// ============================================================
// battle/weapons.js — archetype dispatcher (= SPEC-008 / SPEC-011 / SPEC-012)
// ============================================================
//
// 各 weapon の archetype に応じて archetypes.js の spawn 関数に dispatch する。
// 持続系 (= orbit / orbitClose) は cd を使わず ensureOrbits で desired count 維持。
// state.buffs.cdMul / dmgMul / bulletCountBonus を一括で渡す。

import { state } from "../state.js";
import * as A from "./archetypes.js";

export function tickWeapons(_dt, nowMs) {
  const b = state.battle;
  const cdMul       = state.buffs?.cdMul            ?? 1;
  const dmgMul      = state.buffs?.dmgMul           ?? 1;
  const bulletBonus = state.buffs?.bulletCountBonus ?? 0;

  for (const w of b.weapons) {
    // 持続系 = cd を使わない
    if (w.archetype === "orbit" || w.archetype === "orbitClose") {
      A.ensureOrbits(w, dmgMul, bulletBonus);
      continue;
    }
    const cd = w.cdMs * cdMul;
    if (nowMs - w.lastFireMs < cd) continue;
    w.lastFireMs = nowMs;
    switch (w.archetype) {
      case "radial":       A.fireRadial(w, dmgMul, bulletBonus); break;
      case "bigHoming":    A.fireBigHoming(w, dmgMul, bulletBonus); break;
      case "dropTarget":   A.fireDropTarget(w, dmgMul, bulletBonus); break;
      case "stack":        A.fireStack(w, dmgMul, bulletBonus); break;
      case "beam":         A.fireBeam(w, dmgMul, bulletBonus); break;
      case "diagonal":     A.fireDiagonal(w, dmgMul, bulletBonus); break;
      case "randomRadial": A.fireRandomRadial(w, dmgMul, bulletBonus); break;
      case "placeBomb":    A.firePlaceBomb(w, dmgMul, bulletBonus); break;
      default:             A.fireHoming(w, dmgMul); break;
    }
  }
}
