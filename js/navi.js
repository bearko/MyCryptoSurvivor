// ============================================================
// navi.js — ナビのマインちゃん (= SPEC-056。 喋る案内役。 SPEC-059 で名前と置き場所を見直し)
// ============================================================
//
// - 吹き出しはセリフの量に合わせて伸び縮みし (= ばねで)、 1 文字ずつ出る。 システムの表示ではなく、 キャラが喋っている
// - 喋っているあいだは口が動き (= talk のコマ)、 言い終えるとそのセリフのポーズになり、 待っているあいだは瞬きする
// - 吹き出しを押すと次のセリフへ (= ページをめくるように)。 マインちゃんを押すと反応する
// - 置き場所 (= data-place) は title / mode / hero / battle。
//   mode と hero は「通信の帯」 (= 画面の下の専用の帯に、 顔のアイコンとセリフ)。 ほかの UI と重ねない。
//     ヒーロー選択の大きなヒーローの絵 (= 見せ場) には重ねない (SPEC-059)
//   battle は「通信窓」 (= 顔だけの小窓と吹き出し)。 戦場を隠さない。 押せない
// 絵は mycryptoheroes の Image/Characters/navi_ain_*.png (= 96x128)。 2 倍 (= 整数倍) で出す。
// pauseTime には触らない。

import { img } from "./constants.js";
import { t, tpl } from "./i18n.js";
import { prefersReducedMotion } from "./motion.js";
import { playVoice, voiceMs, hasVoice } from "./voice.js";

/** コマ (= ファイル名の navi_ain_ のあと) */
export const NAVI_FRAMES = {
  idle:  ["11_idle", "12_blink", "13_blink"],
  talk:  ["speak_00_talk", "speak_01_talk"],
  cross: ["cross_01_smile", "cross_02_blink", "cross_03_blink"],
  crossTalk: ["cross_00_talk", "cross_01_smile"],
  greet: ["greeting_00_greet_sparkle", "greeting_01_greet_sparkle", "greeting_02_greet", "greeting_03_greet", "greeting_04_greet", "greeting_05_greet"],
};
/** セリフを言い終えたときのポーズ */
export const NAVI_POSES = {
  pointer: "00_pointer_up", cross: "01_arms_crossed", hooray: "02_both_arms_up", wave: "03_wave",
  shy: "04_hands_to_face", wink: "05_wink", smile: "06_smile", sparkle: "08_sparkle",
  cry: "09_cry", teary: "10_teary",
};
export const NAVI_TYPE_MS = 28;      // 1 文字の間隔
export const NAVI_TALK_FRAME_MS = 130;

export function naviFrameUrl(name) {
  return img(`Image/Characters/navi_ain_${name}.png`);
}

/**
 * 場面ごとのセリフ (= 純関数。 tests/navi.test.mjs)。 { key, vars, pose, mood, voice } の配列
 *   ctx: { heroId, heroName, weaponName, stageName, stageIdx, stageCount, rta, n (= 反応の番号) }
 *   voice: マインちゃんのボイスの名前 (= SPEC-085。 js/voice-lines.js)
 */
export function naviLines(scene, ctx = {}) {
  switch (scene) {
    case "title":
      return [
        { key: "navi.title.1", pose: "sparkle", mood: "greet", voice: "title.1" },
        { key: "navi.title.2", pose: "pointer", voice: "title.2" },
      ];
    case "titleTap": {
      const list = [
        { key: "navi.tap.1", pose: "wink", voice: "tap.1" },
        { key: "navi.tap.2", pose: "sparkle", voice: "tap.2" },
        { key: "navi.tap.3", pose: "shy", voice: "tap.3" },
        { key: "navi.tap.4", pose: "pointer", voice: "tap.4" },
      ];
      return [list[Math.abs(ctx.n | 0) % list.length]];
    }
    case "mode":
      return [
        { key: "navi.mode.1", pose: "cross", mood: "cross", voice: "mode.1" },
        { key: "navi.mode.2", pose: "pointer", voice: "mode.2" },
      ];
    case "hero":
      return [{ key: "navi.hero.open", pose: "hooray", voice: "hero.open" }];
    case "heroPick": {
      const poses = ["sparkle", "wink", "smile", "hooray"];
      const pose = poses[Math.abs(ctx.n | 0) % poses.length];
      // SPEC-085: ヒーローごとの紹介 (= ボイスつき)。 ボイスのないヒーローは、 いままでのひな形
      const voice = `hero.${ctx.heroId}`;
      if (hasVoice(voice)) return [{ key: `navi.hero.pick.${ctx.heroId}`, pose, voice }];
      return [{ key: "navi.hero.pick", vars: { name: ctx.heroName ?? "", weapon: ctx.weaponName ?? "" }, pose }];
    }
    case "boss":
      return [{ key: "navi.boss", pose: "cross", mood: "cross", voice: "boss" }];
    case "stage": {
      const i = ctx.stageIdx | 0;
      const last = (ctx.stageCount | 0) > 0 && i === ctx.stageCount - 1;
      const key = i === 0 ? "navi.stage.first" : (last ? "navi.stage.last" : "navi.stage.next");
      const voice = `stage.${i + 1}`;   // SPEC-085: ステージの名前ごとのボイス
      const lines = [{ key, vars: { stage: ctx.stageName ?? "" }, pose: last ? "hooray" : "pointer", voice: hasVoice(voice) ? voice : null }];
      if (i === 0 && ctx.rta) lines.push({ key: "navi.stage.rta", pose: "wink", voice: "stage.rta" });
      return lines;
    }
    case "tip": {
      // SPEC-068: 初めてのアイテム・仕掛け・敵のひとこと。 key は navi-tips.js の TIP_KEYS
      const key = String(ctx.key ?? "");
      if (!key) return [];
      const pose = key.startsWith("item.") ? "sparkle" : (key === "gimmick.trojan" ? "cross" : "pointer");
      return [{ key: `navi.tip.${key}`, pose, voice: `tip.${key}` }];
    }
    default:
      return [];
  }
}

// ------------------------------------------------------------ DOM
let _el = null, _img = null, _bubble = null, _text = null, _measure = null;
let _lines = [], _idx = 0, _typing = null, _anim = null, _hideTimer = null;
let _mood = "normal", _tapN = 0, _onTapNavi = null, _quietMs = 0, _quietTimer = null;

function _ensure() {
  if (_el || typeof document === "undefined") return _el;
  _el = document.createElement("div");
  _el.className = "navi hidden";
  _el.id = "navi";
  _el.innerHTML =
    '<button type="button" class="navi__bubble" aria-live="polite"><span class="navi__name" aria-hidden="true">NAVI // MINE</span><span class="navi__text"></span><span class="navi__next" aria-hidden="true">▼</span></button>' +
    '<button type="button" class="navi__body" aria-label="Mine"><img class="navi__img" alt="" draggable="false" /></button>' +
    '<span class="navi__measure" aria-hidden="true"></span>';
  _img = _el.querySelector(".navi__img");
  _bubble = _el.querySelector(".navi__bubble");
  _text = _el.querySelector(".navi__text");
  _measure = _el.querySelector(".navi__measure");
  _bubble.addEventListener("click", _onBubble);
  _el.querySelector(".navi__body").addEventListener("click", () => {
    // たたんだ吹き出しは、 マインちゃんを押すとまた開く
    if (_el.classList.contains("navi--quiet")) { _unquiet(); return; }
    _tapN += 1;
    if (_onTapNavi) _onTapNavi(_tapN);
  });
  document.body.appendChild(_el);
  // 絵を先に読む (= コマの切り替えでちらつかない)
  const all = new Set([...Object.values(NAVI_FRAMES).flat(), ...Object.values(NAVI_POSES)]);
  for (const f of all) { const im = new Image(); im.src = naviFrameUrl(f); }
  return _el;
}

function _setFrame(name) { if (_img) _img.src = naviFrameUrl(name); }

/** 言い終えて少したったら吹き出しをたたむ (= 下のボタンを隠したままにしない。 quietMs を渡した場所だけ) */
function _scheduleQuiet() {
  clearTimeout(_quietTimer);
  if (_quietMs > 0) _quietTimer = setTimeout(() => _el?.classList.add("navi--quiet"), _quietMs);
}
function _unquiet() {
  clearTimeout(_quietTimer);
  _el?.classList.remove("navi--quiet");
  _scheduleQuiet();
}

function _stopAnim() { clearTimeout(_anim); _anim = null; }

/** 待っているあいだ: 瞬き (= ときどき 2 コマ) */
function _idle(pose) {
  _stopAnim();
  const base = pose ? NAVI_POSES[pose] : (_mood === "cross" ? NAVI_FRAMES.cross[0] : NAVI_FRAMES.idle[0]);
  _setFrame(base);
  if (prefersReducedMotion()) return;
  const blinks = pose ? null : (_mood === "cross" ? NAVI_FRAMES.cross.slice(1) : NAVI_FRAMES.idle.slice(1));
  const loop = () => {
    _anim = setTimeout(() => {
      if (blinks) {
        _setFrame(blinks[0]);
        _anim = setTimeout(() => { _setFrame(blinks[1]); _anim = setTimeout(() => { _setFrame(base); loop(); }, 70); }, 70);
      } else {
        // ポーズのまま少し保ってから、 ふだんの待機に戻る
        _idle(null);
      }
    }, pose ? 1600 : 2600 + Math.random() * 1800);
  };
  loop();
}

function _talk() {
  _stopAnim();
  const frames = _mood === "cross" ? NAVI_FRAMES.crossTalk : NAVI_FRAMES.talk;
  let i = 0;
  const step = () => { _setFrame(frames[i % frames.length]); i += 1; _anim = setTimeout(step, NAVI_TALK_FRAME_MS); };
  step();
}

function _greet(then) {
  _stopAnim();
  let i = 0;
  const step = () => {
    if (i >= NAVI_FRAMES.greet.length) { then(); return; }
    _setFrame(NAVI_FRAMES.greet[i]); i += 1;
    _anim = setTimeout(step, 110);
  };
  step();
}

/** 吹き出しの大きさを、 セリフが収まる大きさへ (= CSS がばねで追う)。 通信の帯は大きさが決まっているので測らない */
function _fitBubble(text) {
  if (_el.classList.contains("navi--dock")) {
    _bubble.style.width = "";
    _bubble.style.height = "";
    return;
  }
  _measure.textContent = text;
  const r = _measure.getBoundingClientRect();
  _bubble.style.width = `${Math.ceil(r.width) + 2}px`;
  _bubble.style.height = `${Math.ceil(r.height) + 2}px`;
}

function _showLine(i, { turn = false } = {}) {
  const line = _lines[i];
  if (!line) return;
  if (line.voice) playVoice(line.voice);   // SPEC-085: 吹き出しが出たら、 そのセリフのボイス (= 前のボイスは止まる)
  const text = tpl(t(line.key, line.key), line.vars ?? {});
  _mood = line.mood === "cross" ? "cross" : "normal";
  clearInterval(_typing);
  _bubble.classList.toggle("navi__bubble--more", i < _lines.length - 1);
  if (turn && !prefersReducedMotion()) {
    _bubble.classList.remove("navi__bubble--turn");
    void _bubble.offsetWidth;
    _bubble.classList.add("navi__bubble--turn");
  }
  _fitBubble(text);
  const finish = () => {
    clearInterval(_typing); _typing = null;
    _text.textContent = text;
    _bubble.classList.add("navi__bubble--done");
    _idle(line.pose);
    _scheduleQuiet();
  };
  _bubble.classList.remove("navi__bubble--done");
  if (prefersReducedMotion()) { finish(); return; }
  const start = () => {
    _talk();
    let n = 0;
    _text.textContent = "";
    _typing = setInterval(() => {
      n += 1;
      _text.textContent = text.slice(0, n);
      if (n >= text.length) finish();
    }, NAVI_TYPE_MS);
  };
  if (line.mood === "greet") _greet(start);
  else start();
}

function _onBubble() {
  if (_typing) {
    // 途中で押したら、 その行を最後まで出す
    const line = _lines[_idx];
    clearInterval(_typing); _typing = null;
    _text.textContent = tpl(t(line.key, line.key), line.vars ?? {});
    _bubble.classList.add("navi__bubble--done");
    _idle(line.pose);
    _scheduleQuiet();
    return;
  }
  if (_idx < _lines.length - 1) {
    _idx += 1;
    _showLine(_idx, { turn: true });
  }
}

/** 通信の帯 (= 画面の下の専用の帯。 ほかの UI と重ねない) にする置き場所 (SPEC-059) */
export const NAVI_DOCK_PLACES = ["mode", "hero"];
/** 通信窓 (= 顔だけの小窓) にする置き場所 */
export const NAVI_COMM_PLACES = ["battle"];

/**
 * セリフを言わせる。 place は置き場所 (= CSS)。 autoHideMs を渡すと、 言い終えてその時間で消える (= 戦闘)。
 * host: その要素の中に置く (= ヒーロー選択の大きな絵の左上)。 top: 画面の上からの位置 (= 戦闘で HUD の下)
 * quietMs: 言い終えてその時間で吹き出しをたたむ (= 下のボタンを隠したままにしない)
 * onTapNavi: マインちゃんを押したときに呼ぶ (= 反応のセリフを出す)
 */
export function naviSay(lines, { place = "title", autoHideMs = 0, onTapNavi = null, host = null, top = null, quietMs = 0 } = {}) {
  if (!_ensure() || !lines || lines.length === 0) return;
  clearTimeout(_hideTimer);
  clearTimeout(_quietTimer);
  _el.classList.remove("navi--quiet");
  _quietMs = quietMs;
  _onTapNavi = onTapNavi;
  const parent = host || document.body;
  if (_el.parentNode !== parent) {
    parent.appendChild(_el);
    _el.classList.add("hidden");   // 置き場所が変わったら、 出てくる動きから
  }
  // 帯と、 それ以外 (= 全身・小窓) を行き来したら、 出てくる動きから (= 同じ帯の中で場面が変わるだけなら続けて喋る)
  const isDock = NAVI_DOCK_PLACES.includes(place);
  const kindChanged = _el.classList.contains("navi--dock") !== isDock || (!isDock && _el.dataset.place !== place);
  _el.dataset.place = place;
  _el.classList.toggle("navi--dock", isDock);
  _el.classList.toggle("navi--comm", NAVI_COMM_PLACES.includes(place));
  _el.style.top = top == null ? "" : `${Math.round(top)}px`;
  const wasHidden = _el.classList.contains("hidden");
  _el.classList.remove("hidden", "navi--out");
  if (wasHidden || kindChanged) { _el.classList.remove("navi--in"); void _el.offsetWidth; _el.classList.add("navi--in"); }
  _lines = lines;
  _idx = 0;
  _showLine(0, { turn: !wasHidden && !kindChanged });
  if (autoHideMs > 0) {
    // SPEC-085: ボイスのほうが長ければ、 言い終えるまで待つ
    const total = lines.reduce((a, l) => a + Math.max(tpl(t(l.key, l.key), l.vars ?? {}).length * NAVI_TYPE_MS, voiceMs(l.voice)), 0) + autoHideMs;
    _hideTimer = setTimeout(naviHide, total);
  }
}

/** いま出ているか (= 引っこむ途中は出ていないとみなす。 SPEC-068 の補足が前のセリフを消さないため) */
export function naviIsShown() {
  return !!_el && !_el.classList.contains("hidden") && !_el.classList.contains("navi--out");
}

/** 引っこめる */
export function naviHide() {
  if (!_el || _el.classList.contains("hidden")) return;
  clearTimeout(_hideTimer);
  clearInterval(_typing); _typing = null;
  _stopAnim();
  if (prefersReducedMotion()) { _el.classList.add("hidden"); return; }
  _el.classList.add("navi--out");
  _hideTimer = setTimeout(() => { _el.classList.add("hidden"); _el.classList.remove("navi--out"); }, 260);
}

/** タイトルのマインちゃん (= あいさつ。 押すと反応する)。 greet: あいさつの動きから始めるか */
export function naviTitle({ greet = true } = {}) {
  const onTapNavi = (n) => naviSay(naviLines("titleTap", { n }), { place: "title", onTapNavi });
  naviSay(greet ? naviLines("title") : naviLines("titleTap", { n: 0 }), { place: "title", onTapNavi });
}
