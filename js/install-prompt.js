// ============================================================
// install-prompt.js — ホーム画面に追加の案内 (= SPEC-178)
// ============================================================
//
// NORMAL を 1 回遊び終えてモード選択に戻ったとき、 スマホに 1 回だけ下からシートを出す。
// Android はブラウザの合図 (= beforeinstallprompt) があれば追加ボタン、 無ければメニューの手順。 iPhone / iPad は共有メニューの手順。
// 上半分は純関数 (= テストする)。

import { LS_PREFIX } from "./constants.js";
import { t } from "./i18n.js";
import { naviFrameUrl, poseFrame } from "./navi.js";
import { tutorialStepOf } from "./story.js";
import { reportTutorialStep } from "./platform.js";

/** 出したかの印 (= 1 回だけ。 「あとで」でも二度と出さない) */
export const LS_INSTALL_ASKED = `${LS_PREFIX}.installAsked`;

/**
 * 端末の種類 (= 案内の出し方)。 "prompt" = 追加ボタン (Android など、 合図をもらった) / "ios" = 共有メニューの手順 /
 * "android" = ブラウザのメニューの手順 / null = 出さない (= パソコン・すでにホーム画面から開いている)
 */
export function installKind({ ua = "", maxTouchPoints = 0, standalone = false, hasPrompt = false } = {}) {
  if (standalone) return null;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);   // iPadOS は Mac のふりをする
  if (ios) return "ios";
  const android = /Android/.test(ua);
  if (hasPrompt && (android || maxTouchPoints > 0)) return "prompt";
  if (android) return "android";
  return null;
}

/** 出すか (= NORMAL を遊び終えた・まだ聞いていない・スマホ) */
export function shouldOfferInstall({ played, asked, kind }) {
  return !!played && !asked && !!kind;
}

export function wasInstallAsked(storage = globalThis.localStorage) {
  try { return storage?.getItem(LS_INSTALL_ASKED) === "1"; } catch (_) { return true; }   // 読めないときは聞いたことにする (= 毎回出るよりよい)
}
function _markAsked(storage = globalThis.localStorage) {
  try { storage?.setItem(LS_INSTALL_ASKED, "1"); } catch (_) { /* 書けなくても遊べる */ }
}

// ---- 下半分: ブラウザ ----

let _deferred = null;   // beforeinstallprompt (= Android の追加の合図)

/** 起動のときに 1 回。 合図を取っておく (= ブラウザの帯は出さない) */
export function installInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); _deferred = e; });
  window.addEventListener("appinstalled", () => { _deferred = null; });
}

/** ホーム画面から開いていれば段 30 (= 共通基盤の init のあとに呼ぶ) */
export function reportHomeLaunch() {
  if (isStandalone()) reportTutorialStep(tutorialStepOf("home"));
}

export function isStandalone() {
  try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (_) { return false; }
}

function _kindHere() {
  return installKind({ ua: navigator.userAgent ?? "", maxTouchPoints: navigator.maxTouchPoints ?? 0, standalone: isStandalone(), hasPrompt: !!_deferred });
}

/** モード選択を開いたときに呼ぶ。 出したら true */
export function maybeOfferInstall({ played }) {
  const kind = _kindHere();
  if (!shouldOfferInstall({ played, asked: wasInstallAsked(), kind })) return false;
  _markAsked();
  reportTutorialStep(tutorialStepOf("a2hs"));
  _open(kind);
  return true;
}

function _$(id) { return document.getElementById(id); }
let _wired = false;

function _open(kind) {
  const el = _$("installSheet");
  if (!el) return;
  const face = _$("installFace"); if (face) face.src = naviFrameUrl(poseFrame("smile"));
  const steps = _$("installSteps");
  if (steps) {
    const lines = kind === "ios"
      ? [t("install.ios.1", "画面の下（iPad は上）の 共有ボタン □↑ を押す"), t("install.ios.2", "「ホーム画面に追加」を選ぶ")]
      : kind === "android" ? [t("install.android.1", "ブラウザのメニュー ⋮ を押す"), t("install.android.2", "「ホーム画面に追加」を選ぶ")] : [];
    steps.replaceChildren(...lines.map((s) => Object.assign(document.createElement("li"), { textContent: s })));
    steps.classList.toggle("hidden", !lines.length);
  }
  _$("installAdd")?.classList.toggle("hidden", kind !== "prompt");
  if (!_wired) {
    _wired = true;
    _$("installAdd")?.addEventListener("click", async () => {
      const e = _deferred; _deferred = null;
      _close();
      try { await e?.prompt(); } catch (_) { /* 断られた・出せなかった */ }
    });
    _$("installLater")?.addEventListener("click", _close);
    _$("installDim")?.addEventListener("click", _close);
  }
  el.classList.remove("hidden");
}
function _close() { _$("installSheet")?.classList.add("hidden"); }
