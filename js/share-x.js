// ============================================================
// share-x.js — ステージ 1 をクリアしたら、 マインちゃんが X での投稿をすすめる (= SPEC-143)
// ============================================================
//
// 「投稿」を押すと X の投稿画面を開き (= 文・#ポチゲー・#MyCryptoGames・ゲームの URL を入れた状態)、 100 GUM を渡す。
// 投稿したかは確かめられないので、 押した時点で渡す (= 作者の決定)。 GUM は 1 回だけ (= 端末に覚える)。
// 「あとで」なら次のステージ 1 のクリアでまた出す (= 3 回まで)。 RTA では出さない (= 走りを止めない)。
// ステージクリアの画面の上に重ねるだけで、 時間には触らない (= ステージクリアの画面がもう止めている)。

import { addRewards } from "./meta.js";
import { naviFrameUrl, NAVI_POSES } from "./navi.js";
import { t } from "./i18n.js";
import { playSe } from "./audio.js";
import { SFX } from "./constants.js";

export const SHARE_KEY = "mcs.shareX";
export const SHARE_GUM = 100;
export const SHARE_MAX_SKIPS = 3;
export const GAME_URL = "https://survivor.bearko.games/";
export const SHARE_TAG = "MyCryptoGames";
/** SPEC-158: 本文に入れる札 (= bearko.games のポータルが拾う条件。 作者の指定 2026-10-21) */
export const SHARE_BODY_TAG = "#ポチゲー";

/** X の投稿画面の URL (= 純関数)。 本文の末尾に #ポチゲー を足す (= 無ければ) */
export function shareUrl(text, url = GAME_URL, tag = SHARE_TAG) {
  const body = String(text ?? "").includes(SHARE_BODY_TAG) ? String(text ?? "") : `${String(text ?? "").trim()} ${SHARE_BODY_TAG}`.trim();
  const q = new URLSearchParams({ text: body, url, hashtags: tag });
  return `https://x.com/intent/tweet?${q.toString()}`;
}

/** 覚えていること (= 壊れていたら初めて) */
export function loadShare(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(SHARE_KEY) ?? "null");
    return { claimed: !!v?.claimed, skips: Math.max(0, v?.skips | 0) };
  } catch { return { claimed: false, skips: 0 }; }
}
export function saveShare(st, storage = globalThis.localStorage) {
  try { storage?.setItem(SHARE_KEY, JSON.stringify({ claimed: !!st.claimed, skips: st.skips | 0 })); } catch { /* 覚えられなくても遊べる */ }
}

/** 出すか (= 純関数。 ステージ 1・RTA でない・まだもらっていない・あとでが 3 回未満) */
export function shouldOfferShare(st, { stageIdx = 0, rta = false } = {}) {
  return (stageIdx | 0) === 0 && !rta && !st?.claimed && (st?.skips | 0) < SHARE_MAX_SKIPS;
}

let _wired = false;
let _st = null;

function _el(id) { return globalThis.document?.getElementById(id); }

/** 出す (= ステージクリアの画面から) */
export function openSharePrompt() {
  const root = _el("shareModal");
  if (!root) return false;
  _st = loadShare();
  _wire();
  const ain = _el("shareAin");
  if (ain) ain.src = naviFrameUrl(NAVI_POSES.wink);
  _el("shareLine").textContent = t("share.line", "ナイスクリア！面白かったらXでもこのゲームを宣伝してくれると嬉しいな！");
  _el("sharePost").classList.remove("hidden");
  _el("shareLater").textContent = t("share.later", "あとで");
  _el("shareGum").classList.remove("share-x__gum--got");
  _el("shareGum").textContent = t("share.reward", "投稿すると 100 GUM プレゼント！");
  root.classList.remove("hidden");
  return true;
}

export function closeSharePrompt() {
  _el("shareModal")?.classList.add("hidden");
}

/** 投稿 (= X を開いて GUM を渡す。 開くのは押した操作の中で) */
export function postShare() {
  if (!_st || _st.claimed) return;
  const text = t("share.text", "MyCryptoSurvivor でステージ 1 をクリア！ マイクリのヒーローで生き残るサバイバーゲーム");
  try { globalThis.open?.(shareUrl(text), "_blank", "noopener"); } catch { /* 開けなくても GUM は渡す */ }
  _st.claimed = true;
  saveShare(_st);
  addRewards({ gum: SHARE_GUM });
  playSe(SFX.LEVEL_UP, 100, 0.5);
  _el("sharePost").classList.add("hidden");
  _el("shareLine").textContent = t("share.thanks", "ありがとう！ みんなに届くといいな。");
  _el("shareGum").classList.add("share-x__gum--got");
  _el("shareGum").textContent = t("share.got", "GUM ＋100 を受け取ったよ");
  _el("shareLater").textContent = t("share.close", "とじる");
}

/** あとで (= 次のステージ 1 のクリアでまた出す。 3 回まで) */
export function laterShare() {
  if (_st && !_st.claimed) { _st.skips += 1; saveShare(_st); }
  closeSharePrompt();
}

function _wire() {
  if (_wired) return;
  _wired = true;
  _el("sharePost")?.addEventListener("click", postShare);
  _el("shareLater")?.addEventListener("click", laterShare);
}
