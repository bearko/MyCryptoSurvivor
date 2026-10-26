// ============================================================
// mode-select.js — ゲームモード選択画面 (= SPEC-037)
// ============================================================
//
// タイトル → Press to Start → modeSelectScreen → hero select の順で遷移。
// NORMAL: 全 4 軸 1.0×、 スコア倍率 1.00。
// ABSOLUTE: 4 軸を 0.5〜2.0 で 0.25 step で調整。 平均がスコア倍率。

import { state } from "./state.js";
import { isTestSite } from "./team.js";   // SPEC-166
import {
  ABSOLUTE_AXES, ABSOLUTE_SLIDER_MIN, ABSOLUTE_SLIDER_MAX,
  ABSOLUTE_SLIDER_STEP, ABSOLUTE_SLIDER_DEFAULT,
  REGULATION_NORMAL, REGULATION_ABSOLUTE,
  computeRegulationMul,
} from "./constants.js";
import { onLangChange, t } from "./i18n.js";
import { isRtaAvailable, RTA_ABSOLUTE_MUL } from "./platform.js";
import { playWipe } from "./transition.js";
import { naviTitle } from "./navi.js";
import { startTitleBgm } from "./ui-sound.js";
import { hasPlayed, isModeLocked } from "./played.js";
import { maybeOfferInstall } from "./install-prompt.js";   // SPEC-178
import { hasClearedEasy } from "./easy.js";   // SPEC-165: チュートリアル (= ストーリー 5-5) を終えた印
import { enterStory } from "./story-map.js";   // SPEC-165
import { loadStory, allStoryIds, storyAllCleared } from "./story.js";   // SPEC-165

let _wired   = false;
let _onPick  = null;   // (regulation) => void、 hero select に進む callback

function _$(id) { return document.getElementById(id); }

export function installModeSelect(onPickHandler) {
  _onPick = onPickHandler;
  _renderSliders();
  _wireOnce();
  _renderLabels();
  _renderMul();
}

export function showModeSelect() {
  _$("titleScreen")?.classList.add("hidden");
  // SPEC-040: RTA の card は共通基盤の SDK が読めたときだけ出す
  _$("modeCardRta")?.classList.toggle("hidden", !isRtaAvailable());
  _applyLocks();   // SPEC-088: 初プレイは NORMAL だけ (= 開くたびに見直す。 1 回遊び終えたら開く)
  _$("gameModeSelectScreen")?.classList.remove("hidden");
  _renderLabels();
  _renderMul();
  maybeOfferInstall({ played: hasPlayed() });   // SPEC-178: NORMAL を 1 回遊び終えたら、 スマホに 1 回だけ「ホーム画面に追加」
}

/** SPEC-088: ロックの札。 カードは見せたまま薄くし、 ボタン・スライダー・リンクを押せなくして、 開く条件を 1 行 */
const _LOCKABLE = [
  { mode: "NORMAL",   cardId: "modeCardNormal",   lockId: "modeCardNormalLock" },   // SPEC-165: ストーリーを最後までクリアするまで
  { mode: "ABSOLUTE", cardId: "modeCardAbsolute", lockId: "modeCardAbsoluteLock" },
  { mode: "RTA",      cardId: "modeCardRta",      lockId: "modeCardRtaLock" },
];

function _applyLocks() {
  const played = hasPlayed() || isTestSite();   // SPEC-166
  const easyCleared = tutorialDone();
  _$("modeCardStory")?.classList.toggle("mode-card--recommend", !played && !easyCleared);   // SPEC-165: 初めての人にはストーリーを光らせる
  for (const { mode, cardId, lockId } of _LOCKABLE) {
    const card = _$(cardId);
    if (!card) continue;
    const locked = isModeLocked(mode, played, easyCleared);
    card.classList.toggle("mode-card--locked", locked);
    card.setAttribute("aria-disabled", String(locked));
    card.querySelectorAll("button, input").forEach((el) => { el.disabled = locked; });
    card.querySelectorAll("a").forEach((a) => {
      if (locked) { a.setAttribute("aria-disabled", "true"); a.setAttribute("tabindex", "-1"); }
      else { a.removeAttribute("aria-disabled"); a.removeAttribute("tabindex"); }
    });
    _$(lockId)?.classList.toggle("hidden", !locked);
  }
}

/** SPEC-165: チュートリアルを終えたか (= ストーリー 5-5 のクリア (= mcs.easyCleared) か、 全 25 のクリア。 旧 EASY のクリアも同じ印) */
function tutorialDone() {
  if (isTestSite()) return true;   // SPEC-166: テスト用のサイトはモードを全部開く
  return hasClearedEasy() || storyAllCleared(loadStory());
}

export function hideModeSelect() {
  _$("gameModeSelectScreen")?.classList.add("hidden");
}

function _wireOnce() {
  if (_wired) return;
  _wired = true;

  _$("btnModeStory")?.addEventListener("click", () => { state.storyId = null; state.rtaMode = false; hideModeSelect(); enterStory(); });   // SPEC-165: プロローグをまだ通っていなければ、 説明なしでいきなり 1-0 (= ワイプは enterStory の側で 1 回だけ。 二重に掛けると内側が捨てられて真っ暗のまま止まった)
  _$("btnModeNormal")?.addEventListener("click", () => _pick(REGULATION_NORMAL));
  _$("btnModeAbsolute")?.addEventListener("click", () => _pick(REGULATION_ABSOLUTE));
  // SPEC-040: RTA は NORMAL のルール + rtaMode
  _$("btnModeRta")?.addEventListener("click", () => _pick(REGULATION_NORMAL, { rta: true }));
  // SPEC-048: ABSOLUTE の 4 軸をすべて ×2.0 に固定した RTA (= スライダーの値は使わない)
  _$("btnModeRtaAbs")?.addEventListener("click", () => {
    const m = RTA_ABSOLUTE_MUL;
    _pick(REGULATION_ABSOLUTE, { rta: true, absolute: { spawnMul: m, hpMul: m, dmgMul: m, speedMul: m } });
  });
  // 作者 2026-10-22: モード選択からもスキルツリーへ (= 閉じたらこの画面に戻る)
  _$("btnModeSkillTree")?.addEventListener("click", () => { import("./skill-tree.js").then((T) => T.openSkillTree({ returnTo: _$("gameModeSelectScreen") })); });
  _$("btnModeBack")?.addEventListener("click", () => {
    startTitleBgm();   // SPEC-069: タイトルの曲に戻す (= 押した操作の中で)
    // SPEC-055: ワイプで切り替える
    playWipe(() => {
      hideModeSelect();
      _$("titleScreen")?.classList.remove("hidden");
      naviTitle({ greet: false });   // SPEC-056
    });
  });
  onLangChange(() => {
    _renderLabels();
    _renderMul();
  });
}

/** SPEC-177: 「ここからが本番」の画面から NORMAL へ (= モード選択の NORMAL のボタンと同じ道) */
export function pickNormal() { _pick(REGULATION_NORMAL); }

function _pick(regulation, { rta = false, absolute = null } = {}) {
  // SPEC-088: 初プレイは NORMAL だけ (= ボタンは disabled にしてあるが、 ここでも止める)。 SPEC-165: NORMAL はストーリーのあと
  if (isModeLocked(rta ? "RTA" : regulation, hasPlayed() || isTestSite(), tutorialDone())) return;
  state.regulation = regulation;
  state.rtaMode = rta;
  state.storyId = null;      // SPEC-165
  if (regulation === REGULATION_NORMAL) {
    state.absolute = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  } else if (absolute) {
    state.absolute = { ...absolute };
  } else {
    // sliders から state に取り込み (= 既存値が入っているはず)
    state.absolute = _readSliders();
  }
  // SPEC-055: ワイプで覆ったところでヒーロー選択へ
  playWipe(() => {
    hideModeSelect();
    _$("postStoryScreen")?.classList.add("hidden");   // SPEC-177: 「ここからが本番」から来たとき
    if (typeof _onPick === "function") _onPick(regulation);
  }, { label: "SELECT // HERO" });
}

function _renderSliders() {
  const wrap = _$("absoluteSliders");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const axis of ABSOLUTE_AXES) {
    const row = document.createElement("label");
    row.className = "abs-slider";
    row.innerHTML =
      `<span class="abs-slider__label" data-axis="${axis.key}">${axis.key}</span>` +
      `<input type="range" class="abs-slider__range" data-axis="${axis.key}" ` +
      `min="${ABSOLUTE_SLIDER_MIN}" max="${ABSOLUTE_SLIDER_MAX}" step="${ABSOLUTE_SLIDER_STEP}" ` +
      `value="${state.absolute?.[axis.key] ?? ABSOLUTE_SLIDER_DEFAULT}" />` +
      `<span class="abs-slider__value" data-axis="${axis.key}">×${(state.absolute?.[axis.key] ?? ABSOLUTE_SLIDER_DEFAULT).toFixed(2)}</span>`;
    wrap.appendChild(row);
  }
  // change → state 反映 + mul 再計算 + label 更新
  wrap.querySelectorAll('input[type="range"]').forEach(inp => {
    inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      const ax = inp.dataset.axis;
      if (!state.absolute) state.absolute = {};
      state.absolute[ax] = v;
      const valEl = wrap.querySelector(`.abs-slider__value[data-axis="${ax}"]`);
      if (valEl) valEl.textContent = `×${v.toFixed(2)}`;
      _renderMul();
    });
  });
}

function _readSliders() {
  const out = { spawnMul: 1, hpMul: 1, dmgMul: 1, speedMul: 1 };
  document.querySelectorAll('#absoluteSliders input[type="range"]').forEach(inp => {
    const v = parseFloat(inp.value);
    out[inp.dataset.axis] = isNaN(v) ? 1 : v;
  });
  return out;
}

function _renderLabels() {
  const ti = _$("modeSelectTitle"); if (ti) ti.textContent = t("mode.title", "ゲームモード");
  const sb = _$("modeSelectSub");   if (sb) sb.textContent = t("mode.sub",   "難易度を選んで進む");
  const nd = _$("modeCardNormalDesc"); if (nd) nd.textContent = t("mode.normalDesc", "通常のバランス。 全 4 軸が 1.0×。 スコア倍率 1.00。");
  // SPEC-165: ストーリー (= クリア数も)
  const sn = _$("modeCardStoryName"); if (sn) sn.textContent = t("mode.storyName", "ストーリー（β）");
  const sd = _$("modeCardStoryDesc"); if (sd) sd.textContent = t("mode.storyDesc", "");
  const sm = _$("modeCardStoryMul");  if (sm) sm.textContent = t("mode.storyMul", "案内つき");
  const bS = _$("btnModeStory");      if (bS) bS.textContent = t("mode.startStory", "ストーリーを始める");
  const so = _$("modeCardStoryDone"); if (so) { const p = loadStory(); so.classList.toggle("hidden", p.cleared.length === 0); so.textContent = `✓ ${p.cleared.length} / ${allStoryIds().length}`; }
  const nl = _$("modeCardNormalLock"); if (nl) nl.textContent = t("mode.lockedNormal", "🔒 ストーリーを最後までクリアすると選べるようになる");
  const ad = _$("modeCardAbsoluteDesc"); if (ad) ad.textContent = t("mode.absoluteDesc", "難易度を 4 軸で自分でチューニング。 きつくするほどスコア倍率 UP、 楽にすると DOWN。");
  const bN = _$("btnModeNormal");    if (bN) bN.textContent = t("mode.startNormal", "これで始める");
  const bA = _$("btnModeAbsolute");  if (bA) bA.textContent = t("mode.startAbsolute", "これで始める");
  const bb = _$("btnModeBack");      if (bb) bb.textContent = t("mode.back", "タイトルに戻る");
  const rd = _$("modeCardRtaDesc");  if (rd) rd.textContent = t("mode.rtaDesc", "NORMAL か ABSOLUTE ×2.0（4 軸すべて固定）のルールで、 ステージ 1 の開始から全 3 ステージクリアまでの時間を計る。 宝箱から懐中時計（10 秒間 2 倍速）が出る。 15 分以上操作がないと参考記録。");
  const bR = _$("btnModeRta");       if (bR) bR.textContent = t("mode.startRta", "RTA で始める");
  const rl = _$("modeRtaRanking");   if (rl) rl.textContent = t("mode.rtaRanking", "RTA ランキング");
  // SPEC-048: ABSOLUTE ×2.0 の RTA
  const bRA = _$("btnModeRtaAbs");     if (bRA) bRA.textContent = t("mode.startRtaAbs", "ABSOLUTE ×2.0 で RTA");
  const rlA = _$("modeRtaRankingAbs"); if (rlA) rlA.textContent = t("mode.rtaRankingAbs", "RTA ランキング（ABSOLUTE ×2.0）");
  // SPEC-088: ロックの 1 行 (= ABSOLUTE と RTA で同じ文)
  document.querySelectorAll(".mode-card__lock:not(.mode-card__lock--easy)").forEach((el) => {
    el.textContent = t("mode.locked", "🔒 NORMAL を 1 回遊ぶと選べるようになる");
  });
  // slider のラベル
  document.querySelectorAll('#absoluteSliders .abs-slider__label').forEach(el => {
    const ax = el.dataset.axis;
    const k = ABSOLUTE_AXES.find(a => a.key === ax)?.labelKey;
    if (k) el.textContent = t(k, ax);
  });
}

function _renderMul() {
  const a = _readSliders();
  const absMul = computeRegulationMul(REGULATION_ABSOLUTE, a);
  const cardN = _$("modeCardNormalMul");   if (cardN) cardN.textContent = "×1.00";
  const cardA = _$("modeCardAbsoluteMul"); if (cardA) cardA.textContent = `×${absMul.toFixed(2)}`;
}
