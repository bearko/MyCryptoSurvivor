// ============================================================
// battle/sprites.js — 画像プリロード + 円形クリップ描画 (= SPEC-010)
// ============================================================
//
// MCH の hero / enemy / extension PNG を Image() で先読みして、
// 描画時は既読なら drawImage、 未読 / 失敗なら呼出側で fallback (= 単色円)。

import { heroImg } from "../heroes.js";
import { enemyImg, ENEMY_ROSTER } from "../enemies.js";
import { extImg } from "../extensions.js";
import { img, GEM_ICON_PATH, BG_IMAGE_PATH, STAGE_TABLE } from "../constants.js";
import { state } from "../state.js";

const _imageCache = new Map();   // url -> {img, ready, failed}

function _loadImage(url) {
  let entry = _imageCache.get(url);
  if (entry) return entry;
  const img = new Image();
  // raw.githubusercontent.com は CORS 公開、 anonymous で OK
  img.crossOrigin = "anonymous";
  entry = { img, ready: false, failed: false };
  img.onload  = () => { entry.ready = true; };
  img.onerror = () => { entry.failed = true; };
  img.src = url;
  _imageCache.set(url, entry);
  return entry;
}

/**
 * 選択ヒーローの sprite entry を返す (= preload 済 or これから load)。
 */
export function getHeroSprite(hero) {
  if (!hero || hero.heroId == null) return null;
  return _loadImage(heroImg(hero.heroId));
}

/**
 * デフォルト敵 sprite (= ENEMY_ROSTER[0])。 enemyId 不明時の fallback。
 */
export function getDefaultEnemySprite() {
  const e = ENEMY_ROSTER[0];
  if (!e) return null;
  return _loadImage(enemyImg(e.enemyId));
}

/**
 * SPEC-022: enemyId 別の sprite (= preload + cache)。
 */
export function getEnemySprite(enemyId) {
  if (enemyId == null) return null;
  return _loadImage(enemyImg(enemyId));
}

/**
 * 円形クリップして画像を描画。 まだ読込中 or 失敗なら false を返し、
 * 呼出側に fallback 描画 (= 単色円) を任せる。
 */
export function drawSpriteCircular(ctx, entry, cx, cy, r) {
  if (!entry || !entry.ready || entry.failed) return false;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(entry.img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  return true;
}

/**
 * SPEC-019: 経験値 gem のアイコン (= MCH 公式 CE icon)。
 */
export function getGemSprite() {
  return _loadImage(img(GEM_ICON_PATH));
}

/**
 * SPEC-026 / SPEC-030: 現ステージの背景 (= STAGE_TABLE[currentStageIdx].bgPath、 fallback で BG_IMAGE_PATH)。
 */
export function getBackgroundSprite() {
  const idx   = state.currentStageIdx ?? 0;
  const stage = STAGE_TABLE[idx];
  const path  = stage?.bgPath ?? BG_IMAGE_PATH;
  return _loadImage(img(path));
}

/**
 * SPEC-015: extension entry / id から sprite entry を取得 (= preload + cache)。
 */
export function getExtSprite(extOrId) {
  if (extOrId == null) return null;
  const id = (typeof extOrId === "object")
    ? (extOrId.iconId ?? extOrId.extId)
    : extOrId;
  if (id == null) return null;
  return _loadImage(extImg(id));
}

/**
 * SPEC-015: 中心 (cx, cy) を軸に angle 回転させて size × size で描画。
 * ready で無いか failed なら false を返し、 呼出側に fallback (= 円) を任せる。
 */
export function drawSpriteRotated(ctx, entry, cx, cy, size, angle) {
  if (!entry || !entry.ready || entry.failed) return false;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const half = size / 2;
  ctx.drawImage(entry.img, -half, -half, size, size);
  ctx.restore();
  return true;
}
