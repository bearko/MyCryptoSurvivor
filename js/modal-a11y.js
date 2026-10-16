// ============================================================
// modal-a11y.js — モーダル共通の振る舞い (= SPEC-043)
// ============================================================
//
// - role="dialog" の hidden が外れたら、 中の最初の使えるボタンにフォーカス (= キーボードで続けて操作できる)。
//   最後の操作がキーボードのときだけ (= タッチでは動かさない)
// - data-esc-close="<button id>" を持つダイアログが開いていれば、 Esc でそのボタンを押す
//   (= メニュー・ランキングだけ。 結果・レベルアップは選ばないと進めないので付けない)
// ダイアログを開く / 閉じる処理 (= pauseTime / resumeTime の対) は各モジュールのまま触らない。

const FOCUSABLE = "button:not([disabled]):not(.hidden), [href], input:not([disabled]), select:not([disabled])";

/**
 * Esc で押すボタンの id を返す。 開いているダイアログのうち、 後ろ (= DOM で後ろ = 上に重なる) のものを優先。
 * @param {{escClose:string|null, open:boolean}[]} dialogs - DOM 順
 * @returns {string|null}
 */
export function escTarget(dialogs) {
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const d = dialogs[i];
    if (!d.open) continue;
    return d.escClose || null;   // 一番上に開いているものが Esc を受け付けないなら何もしない
  }
  return null;
}

function _isOpen(el) {
  return !el.classList.contains("hidden");
}

function _focusFirst(el) {
  const target = el.querySelector(FOCUSABLE);
  if (target && typeof target.focus === "function") {
    try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
  }
}

let _lastInput = "pointer";   // "keyboard" | "pointer"

export function installModalA11y(root = document) {
  const dialogs = Array.from(root.querySelectorAll('[role="dialog"]'));
  if (!dialogs.length) return;

  // タッチ・マウスで遊んでいる人には、 フォーカスを動かさない (= 枠やスクロールのちらつきを出さない)
  root.addEventListener("keydown", () => { _lastInput = "keyboard"; }, true);
  root.addEventListener("pointerdown", () => { _lastInput = "pointer"; }, true);

  const obs = new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target;
      const wasHidden = (r.oldValue || "").split(/\s+/).includes("hidden");
      if (wasHidden && _isOpen(el) && _lastInput === "keyboard") {
        // 中身を描き終えてからフォーカス (= levelup のカードは open 後に描かれる)
        requestAnimationFrame(() => { if (_isOpen(el)) _focusFirst(el); });
      }
    }
  });
  for (const el of dialogs) {
    obs.observe(el, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  }

  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const id = escTarget(dialogs.map((el) => ({
      escClose: el.getAttribute("data-esc-close"),
      open: _isOpen(el),
    })));
    if (!id) return;
    const btn = root.getElementById ? root.getElementById(id) : document.getElementById(id);
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });
}
