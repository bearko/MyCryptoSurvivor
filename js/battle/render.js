// ============================================================
// battle/render.js — clear + grid + bombs + beams + projectiles + gems + enemies + orbits + player
// (= SPEC-006 / SPEC-007 / SPEC-008 / SPEC-010 / SPEC-012)
// ============================================================

import { state } from "../state.js";
import {
  BATTLE_GRID_SIZE,
  HP_BAR_WIDTH, HP_BAR_HEIGHT,
  HP_BAR_PLAYER_WIDTH, HP_BAR_PLAYER_HEIGHT,
  DAMAGE_NUMBER_LIFE_MS,
  WORLD_W, WORLD_H, BG_OVERLAY_COLOR,
  POT_EXT_ID, CHEST_EXT_ID, MAGNET_EXT_ID, HEAL_EXT_ID, WATCH_EXT_ID, THUNDER_EXT_ID, WATCH_SPEED, ITEM_ICON_SIZE, CHEST_SHAPE_PATHS, CHAR_SPRITE_RATIO,
} from "../constants.js";
import {
  drawSpriteCircular, drawSpriteRotated, drawSprite, drawHitDisc,
  getExtSprite, getGemSprite, getEnemySprite, getBackgroundSprite,
  getMagicCardSprite,
} from "./sprites.js";
import { shakeOffset, renderFxWorld, renderFxScreen } from "./fx.js";
import { renderArenaWorld, renderBossMarkerPointer } from "./arena-render.js";
import { renderBossMovesWorld } from "./boss-moves-render.js";
import { renderGimmicksUnder, renderGimmicksOver, drawTrojan } from "./gimmicks-render.js";

/** SPEC-057: ダメージ数字の文字の大きさ (= size ごと) */
export const DAMAGE_FONT_PX = { "": 14, lg: 18, xl: 24 };
/** SPEC-057: 出た瞬間に跳ねる (= 0〜140ms で 1.6 倍 → 1 倍。 純関数) */
export function damagePopScale(ageMs) {
  if (!(ageMs < 140)) return 1;
  return 1 + 0.6 * (1 - Math.max(0, ageMs) / 140);
}
/** SPEC-057: 戦場の背景の彩度をどれだけ落とすか (= UI と敵を先に目に入れる。 色の優先度) */
export const BG_DESATURATE = 0.45;

/** SPEC-062: 撃つ前に狙う線 (= 撃つ向きに、 点滅する赤い破線。 3 方向なら 3 本) */
function _drawAimLines(ctx, e, sx, sy, nowMs) {
  const angles = e.shot?.pattern === "spread3" ? [e.aimAngle - 0.28, e.aimAngle, e.aimAngle + 0.28] : [e.aimAngle];
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.35 * Math.abs(Math.sin(nowMs / 60));
  ctx.strokeStyle = "#ff5a6a";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  for (const a of angles) {
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * (e.r + 4), sy + Math.sin(a) * (e.r + 4));
    ctx.lineTo(sx + Math.cos(a) * (e.r + 150), sy + Math.sin(a) * (e.r + 150));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(sx, sy, e.r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * 1 frame 描画。 ctx は dpr 反映済の transform で渡される前提。
 */
export function renderBattle(ctx, nowMs = 0) {
  const { player, camera, viewport, enemies, gems, projectiles, orbits, beams, bombs, shockwaves, damageNumbers, bossProjectiles, bossOrbits, magicCards } = state.battle;
  const enemyShots = state.battle.enemyShots ?? [];   // SPEC-062
  const w = viewport.w, h = viewport.h;
  if (w <= 0 || h <= 0) return;

  // SPEC-026: ステージ外は黒、 ステージ内は背景画像 + 半透明ダーク overlay
  ctx.fillStyle = "#0e0c14";
  ctx.fillRect(0, 0, w, h);
  // SPEC-045: 揺れ (= 世界の描画をずらす。 画面の縁と数字の後で戻す)
  const shk = shakeOffset();
  ctx.save();
  ctx.translate(shk.x, shk.y);
  _drawBackground(ctx, camera, w, h);

  // グリッド (= ステージ全体に薄く重ねて方向感覚補助)
  _drawGrid(ctx, camera, w, h);

  // SPEC-053: 建物 (= 足もとに影を落として、 通れないことを見せる)
  _drawObstacles(ctx, camera, w, h);

  // SPEC-079: ボスの出る場所 (= 予告の赤い丸) と、 ボス戦の枠
  renderArenaWorld(ctx, camera, w, h, nowMs);
  // SPEC-080: ボスの型の予告 (= 突進の通り道・叩きつけの円。 敵より下)
  renderBossMovesWorld(ctx, camera, w, h, nowMs);

  // SPEC-012 / SPEC-015 / SPEC-031: bombs (= 赤い半透明円で当たり判定を可視化 + icon + 点滅)
  for (const b of bombs) {
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const R = b.radius;
    if (sx + R < 0 || sx - R > w || sy + R < 0 || sy - R > h) continue;
    const t = b.age / b.fuseMs;
    // SPEC-031: AoE 範囲を赤の半透明 fill で表示 (= 着弾前に視認できる)、 fuse 後半で点滅濃度 UP
    const fillAlpha = (t > 0.7 ? 0.32 : 0.22) + (t > 0.7 ? 0.08 * Math.abs(Math.sin(b.age / 60)) : 0);
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = "#e76060";
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#ff8a8a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, Math.PI * 2);
    ctx.stroke();
    // 中央のアイコン (= 既存挙動)
    const blink = t > 0.7 ? 0.4 + 0.6 * Math.abs(Math.sin(b.age / 60)) : 0.85;
    ctx.globalAlpha = blink;
    let drew = false;
    if (b.iconId != null) {
      // SPEC-028: bomb の icon サイズも武器レベル由来 (= b.iconSize、 fallback 26)
      drew = drawSpriteRotated(ctx, getExtSprite(b.iconId), sx, sy, b.iconSize ?? 26, 0);
    }
    if (!drew) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // SPEC-012: beams (= 太い線、 age で alpha fade out)
  for (const beam of beams) {
    const sx0 = beam.x - camera.x;
    const sy0 = beam.y - camera.y;
    const len = beam.hitLen ?? beam.len;   // SPEC-053: 建物で止まる
    const sx1 = sx0 + beam.dirX * len;
    const sy1 = sy0 + beam.dirY * len;
    const t = beam.age / beam.life;
    ctx.globalAlpha = Math.max(0.25, 1 - t);
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
    // 薄いコアグロー
    ctx.globalAlpha = Math.max(0.15, 0.6 - t);
    ctx.lineWidth = beam.thick * 2;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
  }

  // gems (= SPEC-019: MCH の CE icon、 fallback で従来の黄ダイヤ)
  const gemSprite = getGemSprite();
  for (const g of gems) {
    const sx = g.x - camera.x;
    const sy = g.y - camera.y;
    const drawR = g.r * 1.6;   // ce.png は丸い MCH エンブレム、 ダイヤより大きめに
    if (sx < -drawR || sx > w + drawR || sy < -drawR || sy > h + drawR) continue;
    const drew = drawSpriteCircular(ctx, gemSprite, sx, sy, drawR);
    if (!drew) {
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.moveTo(sx,        sy - g.r);
      ctx.lineTo(sx + g.r,  sy);
      ctx.lineTo(sx,        sy + g.r);
      ctx.lineTo(sx - g.r,  sy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // SPEC-033: magic cards (= ext 5178 アイコン、 ふわっと光る)
  if (magicCards && magicCards.length) {
    const mcSprite = getMagicCardSprite();
    for (const c of magicCards) {
      const sx = c.x - camera.x;
      const sy = c.y - camera.y;
      const size = 32;
      if (sx + size < 0 || sx - size > w || sy + size < 0 || sy - size > h) continue;
      // 光彩オーラ
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#fff7c2";
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const drew = drawSpriteRotated(ctx, mcSprite, sx, sy, size, 0);
      if (!drew) {
        ctx.fillStyle = "#f0c14b";
        ctx.beginPath();
        ctx.arc(sx, sy, c.r ?? 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // SPEC-053: お助けアイテム (= ふわっと上下に揺れる)
  _drawItems(ctx, camera, w, h, nowMs);

  // SPEC-015: projectiles を extension icon で描画 (= 進行方向に rotate、 系列ごと iconRotOffset)
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    const halfSize = (p.iconSize ?? 18) / 2;
    if (sx + halfSize < 0 || sx - halfSize > w || sy + halfSize < 0 || sy - halfSize > h) continue;
    let drew = false;
    if (p.iconId != null) {
      const sp = getExtSprite(p.iconId);
      // SPEC-073: 回る弾 (= パンジャンドラム) は転がった角度、 それ以外は進む向き
      const angle = p.spin ? (p.rot ?? 0) : Math.atan2(p.vy, p.vx) + (p.iconRotOffset ?? 0);
      drew = drawSpriteRotated(ctx, sp, sx, sy, p.iconSize ?? 18, angle);
    }
    if (!drew) {
      // fallback: 単色円
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.r >= 10) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // SPEC-015: shockwaves (= Moai 着弾の AoE ring、 r0 → r1 に成長、 alpha fade)
  for (const s of shockwaves) {
    const sx = s.x - camera.x;
    const sy = s.y - camera.y;
    const t = s.age / s.life;
    const r = s.r0 + (s.r1 - s.r0) * t;
    if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    // 内側のソフトリング
    ctx.globalAlpha = Math.max(0, 0.5 - t * 0.5);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // SPEC-064: ステージの仕掛け (= 珠の列の予告・レール、 パンチの印・穴。 敵より下)
  renderGimmicksUnder(ctx, camera, w, h, nowMs);

  // SPEC-010: enemies (sprite で円形クリップ、 fallback は単色円)
  // SPEC-016: アイコン下に HP バー (= 満タン非表示)
  // SPEC-022: enemyId 別 sprite を引き当て、 fallback で default
  for (const e of enemies) {
    const sx = e.x - camera.x;
    const sy = e.y - camera.y;
    if (sx + e.r < 0 || sx - e.r > w || sy + e.r < 0 || sy - e.r > h) continue;
    if (e.isProp) { _drawProp(ctx, e, sx, sy); continue; }   // SPEC-053: 壺・宝箱
    if (e.behavior === "trojan") {   // SPEC-064: トロイの木馬
      drawTrojan(ctx, e, sx, sy, nowMs);
      if (e.hp < e.hpMax) _drawHpBar(ctx, sx, sy + e.r + 6, HP_BAR_WIDTH * 2, HP_BAR_HEIGHT + 1, e.hp / e.hpMax);
      continue;
    }
    const sp = (e.enemyId != null)
      ? (getEnemySprite(e.enemyId) || state.battle.defaultEnemySprite)
      : state.battle.defaultEnemySprite;
    // SPEC-077: 足もとに当たりの目安の薄い円 (= 太い黒い縁はやめた)、 その上に絵を切り抜かずに大きく。 少し弾ませる
    // SPEC-062: 撃ってくる敵は赤い縁 (= 突っこんでくる敵と見分ける)
    const isShooter = e.behavior === "shooter";
    drawHitDisc(ctx, sx, sy, e.r, e.isBoss ? "boss" : (isShooter ? "shooter" : (e.isRare ? "rare" : "enemy")));
    const bob = e.isBoss ? 0 : Math.sin(nowMs / 140 + e.id) * e.r * 0.06;
    const shx = e.isBoss ? (e.mv?.shake ?? 0) : 0;   // SPEC-080: 予備動作で震える
    const drew = drawSprite(ctx, sp, sx + shx, sy - e.r * 0.12 + bob, e.r * CHAR_SPRITE_RATIO);
    if (!drew) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isShooter && e.aiming) _drawAimLines(ctx, e, sx, sy, nowMs);
    // SPEC-045: 当たった瞬間に白く光る
    if ((e.hitFlashMs ?? 0) > 0) {
      ctx.globalAlpha = 0.55 * (e.hitFlashMs / 80);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // HP バー (= 満タン以外で表示)
    if (e.hp < e.hpMax) {
      _drawHpBar(ctx, sx, sy + e.r + 4, HP_BAR_WIDTH, HP_BAR_HEIGHT, e.hp / e.hpMax);
    }
  }

  // SPEC-012 / SPEC-015: orbits (= Book / Blade、 icon を公転接線方向に回転して描画)
  for (const o of orbits) {
    const sx = (o.x ?? player.x + Math.cos(o.angle) * o.r) - camera.x;
    const sy = (o.y ?? player.y + Math.sin(o.angle) * o.r) - camera.y;
    const sz = o.iconSize ?? 22;
    if (sx + sz < 0 || sx - sz > w || sy + sz < 0 || sy - sz > h) continue;
    let drew = false;
    if (o.iconId != null) {
      // 公転接線方向 = angle + π/2 (= 進行方向を向く)
      const angle = o.angle + Math.PI / 2;
      drew = drawSpriteRotated(ctx, getExtSprite(o.iconId), sx, sy, sz, angle);
    }
    if (!drew) {
      // fallback (= 既存の単色円 / 棒)
      const rad = o.radius ?? 10;
      if (o.kind === "orbitClose") {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(o.angle);
        ctx.fillStyle = o.color;
        ctx.fillRect(-rad, -2, rad * 2, 4);
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-rad, -2, rad * 2, 4);
        ctx.restore();
      } else {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // SPEC-062: 撃ってくる敵の弾 (= 赤い光の玉と、 短い尾)
  for (const p of enemyShots) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx + 16 < 0 || sx - 16 > w || sy + 16 < 0 || sy - 16 > h) continue;
    ctx.strokeStyle = "rgba(255, 90, 106, 0.45)";
    ctx.lineWidth = p.r * 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - p.vx * 0.06, sy - p.vy * 0.06);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(255, 70, 90, 0.4)";
    ctx.beginPath();
    ctx.arc(sx, sy, p.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd6dc";
    ctx.beginPath();
    ctx.arc(sx, sy, p.r - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // SPEC-030: boss projectiles (= ファオ放射) を icon 描画
  for (const p of bossProjectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    const half = (p.iconSize ?? 28) / 2;
    if (sx + half < 0 || sx - half > w || sy + half < 0 || sy - half > h) continue;
    const angle = Math.atan2(p.vy, p.vx);
    const drew = drawSpriteRotated(ctx, getExtSprite(p.iconId), sx, sy, p.iconSize ?? 28, angle);
    if (!drew) {
      ctx.fillStyle = "#ff7676";
      ctx.beginPath();
      ctx.arc(sx, sy, p.r ?? 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // SPEC-030: boss orbits (= yamap 周回) — 接線方向に rotate
  for (const o of bossOrbits) {
    const sx = o.x - camera.x;
    const sy = o.y - camera.y;
    const half = (o.iconSize ?? 28) / 2;
    if (sx + half < 0 || sx - half > w || sy + half < 0 || sy - half > h) continue;
    const angle = o.angle + Math.PI / 2;
    const drew = drawSpriteRotated(ctx, getExtSprite(o.iconId), sx, sy, o.iconSize ?? 28, angle);
    if (!drew) {
      ctx.fillStyle = "#d4d4dc";
      ctx.beginPath();
      ctx.arc(sx, sy, o.hitR ?? 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // SPEC-010: player (sprite で円形クリップ、 fallback は単色円)
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  // SPEC-077: 足もとにシアンの薄い円 (= 当たりの目安)。 絵は切り抜かずに大きく、 動く向きへ少し傾けて弾ませる
  drawHitDisc(ctx, px, py, player.r, "hero");
  const lean = (player.face ?? 0) * 0.14;
  const hop = player.moving ? Math.abs(Math.sin((player.walkT ?? 0) * 11)) * player.r * 0.16 : Math.sin(nowMs / 420) * player.r * 0.03;
  const sp = state.battle.playerSprite;
  let drewPlayer = false;
  if (sp && sp.ready && !sp.failed) {
    ctx.save();
    ctx.translate(px, py + player.r * 0.55);   // 足もとを軸に傾ける
    ctx.rotate(lean);
    drewPlayer = drawSprite(ctx, sp, 0, -player.r * 0.55 - player.r * 0.12 - hop, player.r * CHAR_SPRITE_RATIO);
    ctx.restore();
  }
  if (!drewPlayer) {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, py, player.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // SPEC-016: プレイヤー HP バー (= 満タン以外)
  if (state.stats.hp < state.statsMax.hp) {
    _drawHpBar(ctx, px, py + player.r + 5,
               HP_BAR_PLAYER_WIDTH, HP_BAR_PLAYER_HEIGHT,
               state.stats.hp / state.statsMax.hp);
  }

  // SPEC-064: そろばんの珠 (= 敵より上)
  renderGimmicksOver(ctx, camera, w, h);

  // SPEC-045: 撃破の粒
  renderFxWorld(ctx, camera, w, h);

  // SPEC-016: ダメージ数字 floater (= 一番上の layer)
  // SPEC-057: 大きいものほど大きく (= size)、 出た瞬間に跳ねる (= 1.6 倍 → 1 倍)
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const d of damageNumbers) {
    const dx = d.x - camera.x;
    const dy = d.y - camera.y;
    if (dx < -60 || dx > w + 60 || dy < -40 || dy > h + 40) continue;
    const t = d.age / d.life;
    const a = Math.max(0, 1 - t);
    const base = DAMAGE_FONT_PX[d.size] ?? DAMAGE_FONT_PX[""];
    const px = Math.round(base * damagePopScale(d.age));
    ctx.font = `700 ${px}px 'Chakra Petch', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.globalAlpha = a;
    ctx.lineWidth = d.size ? 4 : 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeText(d.value, dx, dy);
    ctx.fillStyle = d.color;
    ctx.fillText(d.value, dx, dy);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // SPEC-053: 画面の外の宝箱の向き (= 縁に小さな矢印)
  _drawChestPointers(ctx, camera, w, h, enemies);
  renderBossMarkerPointer(ctx, camera, w, h);   // SPEC-079
  // SPEC-054: 懐中時計の 2 倍速の残り
  _drawFastForward(ctx, w);

  // SPEC-045: 画面の縁の赤 (= 被弾・HP 低下) と閃光。 揺らさない
  renderFxScreen(ctx, w, h, nowMs);
}

// ============================================================
// SPEC-053: 建物・壺・宝箱・お助けアイテム
// ============================================================
const ITEM_EXT_ID = { heal: HEAL_EXT_ID, magnet: MAGNET_EXT_ID, watch: WATCH_EXT_ID, thunder: THUNDER_EXT_ID };   // SPEC-063: 雷鼓

/** アイテムの絵の ID */
export function itemExtId(kind) {
  return ITEM_EXT_ID[kind] ?? null;
}

function _drawObstacles(ctx, camera, w, h) {
  for (const o of state.battle.obstacles ?? []) {
    const sx = o.x - camera.x;
    const sy = o.y - camera.y;
    const half = o.size / 2;
    if (sx + half < 0 || sx - half > w || sy + half < 0 || sy - half > h) continue;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(sx, sy + half * 0.78, half * 0.85, half * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const drew = drawSpriteRotated(ctx, getExtSprite(o.extId), sx, sy, o.size, 0);
    if (!drew) {
      const s = o.size * 0.8;
      ctx.fillStyle = "#5b4a6e";
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
    }
  }
}

function _drawProp(ctx, e, sx, sy) {
  const chest = e.propKind === "chest";
  const size = e.r * 2.4;   // SPEC-076: ゴールデンモアイの絵は壺と同じく枠いっぱい
  if (chest) {
    // 宝箱は光らせて目立たせる
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#fff1a8";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // SPEC-074: 宝箱もエクステンションの絵 (= 読み込むまでは金の宝箱の形)
  const drew = drawSpriteRotated(ctx, getExtSprite(chest ? CHEST_EXT_ID : POT_EXT_ID), sx, sy, size, 0)
    || (chest && _drawChestShape(ctx, sx, sy, size));
  if (!drew) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if ((e.hitFlashMs ?? 0) > 0) {
    ctx.globalAlpha = 0.5 * (e.hitFlashMs / 80);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (chest && e.hp < e.hpMax) _drawHpBar(ctx, sx, sy + e.r + 6, HP_BAR_WIDTH, HP_BAR_HEIGHT, e.hp / e.hpMax);
}

let _chestPaths = null;
/** 宝箱の形 (= 64x64 の SVG の path) を金色に塗る。 Path2D がなければ false */
function _drawChestShape(ctx, cx, cy, size) {
  if (typeof Path2D === "undefined") return false;
  if (!_chestPaths) _chestPaths = CHEST_SHAPE_PATHS.map((d) => new Path2D(d));
  const k = size / 64;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  ctx.lineWidth = 3 / k;
  ctx.strokeStyle = "#5a3a10";
  ctx.fillStyle = "#f0c14b";
  for (const p of _chestPaths) { ctx.stroke(p); ctx.fill(p); }
  ctx.restore();
  return true;
}

function _drawItems(ctx, camera, w, h, nowMs) {
  for (const it of state.battle.items ?? []) {
    const sx = it.x - camera.x;
    const sy = it.y - camera.y + Math.sin(nowMs / 260 + it.id) * 3;
    const size = ITEM_ICON_SIZE;
    if (sx + size < 0 || sx - size > w || sy + size < 0 || sy - size > h) continue;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = it.kind === "heal" ? "#b8f5c0" : (it.kind === "watch" ? "#ffe39a" : (it.kind === "thunder" ? "#fff3a0" : "#cfe3ff"));
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const drew = drawSpriteRotated(ctx, getExtSprite(itemExtId(it.kind)), sx, sy, size, 0);
    if (!drew) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, it.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function _drawFastForward(ctx, w) {
  const left = state.battle.fastForwardMs ?? 0;
  if (left <= 0) return;
  const text = `⏩ ×${WATCH_SPEED}  ${(left / 1000).toFixed(1)}s`;
  ctx.font = "700 13px 'Chakra Petch', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.strokeText(text, w - 10, 10);
  ctx.fillStyle = "#ffe39a";
  ctx.fillText(text, w - 10, 10);
}

function _drawChestPointers(ctx, camera, w, h, enemies) {
  const cx = w / 2, cy = h / 2;
  for (const e of enemies) {
    const isTrojan = e.behavior === "trojan";   // SPEC-064: 木馬も (= 赤)
    if (e.propKind !== "chest" && !isTrojan) continue;
    const sx = e.x - camera.x, sy = e.y - camera.y;
    if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) continue;
    const a = Math.atan2(sy - cy, sx - cx);
    // 画面の縁 (= 内側 18px) と、 中心から宝箱への線の交点
    const m = 18;
    const kx = Math.abs(Math.cos(a)) > 1e-6 ? (w / 2 - m) / Math.abs(Math.cos(a)) : Infinity;
    const ky = Math.abs(Math.sin(a)) > 1e-6 ? (h / 2 - m) / Math.abs(Math.sin(a)) : Infinity;
    const k = Math.min(kx, ky);
    const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(a);
    ctx.fillStyle = isTrojan ? "#ff7676" : "#f0c14b";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * SPEC-016: HP バー描画 (= ratio 0..1)。 cx は中央 x、 cy は上端 y。
 * 緑 / 黄 / 赤の 3 段階で 「あと何発で倒せるか」 を直感的に。
 */
function _drawHpBar(ctx, cx, cy, w, h, ratio) {
  const r = Math.max(0, Math.min(1, ratio));
  const x = cx - w / 2;
  // 背景
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x - 1, cy - 1, w + 2, h + 2);
  // 残量
  let color = "#5ecf8a";    // 緑 (60% 超)
  if (r < 0.6) color = "#f0c14b";   // 黄 (60% 以下)
  if (r < 0.3) color = "#e76060";   // 赤 (30% 以下)
  ctx.fillStyle = color;
  ctx.fillRect(x, cy, w * r, h);
}

/**
 * SPEC-026: 世界中心 (0,0) を中心に WORLD_W x WORLD_H の領域へ背景画像を 1 枚だけ描画、
 * その上に BG_OVERLAY_COLOR を被せて暗色の敵を視認しやすくする。
 * 画像未読込なら overlay だけ被せる (= 結果は暗色面でも fallback として成立)。
 */
function _drawBackground(ctx, camera, w, h) {
  const x = -WORLD_W / 2 - camera.x;
  const y = -WORLD_H / 2 - camera.y;
  // viewport と stage 矩形の交差で clip 描画
  const sx = Math.max(0, x);
  const sy = Math.max(0, y);
  const ex = Math.min(w, x + WORLD_W);
  const ey = Math.min(h, y + WORLD_H);
  if (ex <= sx || ey <= sy) return;
  const bg = getBackgroundSprite();
  if (bg && bg.ready && !bg.failed) {
    ctx.drawImage(bg.img, x, y, WORLD_W, WORLD_H);
    // SPEC-057: 背景の彩度を落とす (= 灰色を saturation で重ねる。 Safari でも効く合成)
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.globalAlpha = BG_DESATURATE;
    ctx.fillStyle = "#808080";
    ctx.fillRect(sx, sy, ex - sx, ey - sy);
    ctx.restore();
  }
  // 半透明ダーク overlay (= 背景があっても無くても dim する)
  ctx.fillStyle = BG_OVERLAY_COLOR;
  ctx.fillRect(sx, sy, ex - sx, ey - sy);
}

function _drawGrid(ctx, camera, w, h) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  const G = BATTLE_GRID_SIZE;
  const startX = -(((camera.x % G) + G) % G);
  const startY = -(((camera.y % G) + G) % G);
  ctx.beginPath();
  for (let x = startX; x < w; x += G) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = startY; y < h; y += G) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}
