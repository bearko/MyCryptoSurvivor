// ============================================================
// audio.js — BGM / SE
// ============================================================
//
// SPEC-044: 音量は「呼び出し側の音量 × 設定 (= settings.js)」。 0 なら鳴らさない。
// SE は Web Audio (= AudioContext に読み込んだ音を、 鳴らすたびに BufferSource で重ねる)。
//   以前は鳴らすたびに <audio> を cloneNode() していたが、 ブラウザには 1 ページで作れる <audio> の数に上限があり
//   (= Chrome は "too many WebMediaPlayers"。 スマホはさらに少ない)、 長い戦闘で上限に当たると、
//   そのあとの SE (= 敗北のジングル・ショップで買ったときの音) がすべて鳴らなくなっていた。
//   Web Audio が使えないときだけ、 パスごとに 4 つまでの <audio> を使い回す。
// SPEC-069: BGM の要素は 1 つを使い回し、 曲を替えるときは src だけ替える
//   (= iOS は操作の中で鳴らした要素なら、 あとから操作の外で曲を替えても鳴らせる)。
//   ブラウザに止められた (= NotAllowedError) ときは覚えておき、 次の操作で鳴らし直す (= retryBgm)。

import { audioUrl, SFX } from "./constants.js";
import { getSettings, mixVolume, onSettingsChange } from "./settings.js";

let _bgm = null;            // BGM の要素 (= 1 つを使い回す。 SPEC-069)
let _bgmSrc = null;         // _bgm にいま入っている曲
let _bgmBlocked = false;    // ブラウザに止められた (= 次の操作で鳴らし直す。 SPEC-069)
let _bgmPath = null;        // 今かけたい BGM (= 設定が 0 で止めていても覚えておく)
let _bgmBase = 0.32;        // 呼び出し側の音量
let _bgmSuspended = false;  // タブを離れて止めている
const _seThrottle = new Map();
const _sePool = new Map();     // Web Audio が使えないとき: パス → <audio> の配列 (= 使い回す)
const SE_POOL_MAX = 4;         // 1 つのパスで同時に鳴らせる数 (= <audio> の数の上限を超えない)
let _audioUnlocked = false;
let _ctx = null;               // Web Audio (= 最初の操作の中で作る。 iOS は操作の中でないと鳴らない)
const _buffers = new Map();    // パス → 読み込んだ音 (= AudioBuffer)
const _loading = new Map();    // パス → 読み込み中の Promise
const _voices = [];            // いま鳴っている SE (= 古い順)
const SE_VOICES_MAX = 32;      // 重なりすぎたら、 いちばん古い音を止めて新しい音を鳴らす (= 敗北のジングルを取りこぼさない)
const SE_LATE_MS = 600;        // 読み込みがこれより遅れたら鳴らさない (= 遅れて鳴ると何の音か分からない)

function _audioCtx() {
  if (_ctx) return _ctx;
  const C = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!C) return null;
  try { _ctx = new C(); } catch (_) { _ctx = null; }
  return _ctx;
}

/** SE を読み込んでおく (= 最初に鳴らすときに待たない) */
export function preloadSe(paths = Object.values(SFX)) {
  for (const p of new Set(paths)) _loadBuffer(p);
}

function _loadBuffer(relPath) {
  const ctx = _ctx;
  if (!ctx || typeof fetch !== "function") return Promise.resolve(null);
  if (_buffers.has(relPath)) return Promise.resolve(_buffers.get(relPath));
  if (_loading.has(relPath)) return _loading.get(relPath);
  const pr = fetch(audioUrl(relPath))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then((buf) => { _buffers.set(relPath, buf); return buf; })
    .catch(() => null)
    .finally(() => _loading.delete(relPath));
  _loading.set(relPath, pr);
  return pr;
}

function _playBuffer(buf, vol, rate) {
  const ctx = _ctx;
  if (!ctx || !buf) return;
  while (_voices.length >= SE_VOICES_MAX) {
    const old = _voices.shift();
    try { old.stop(); } catch (_) {}
  }
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (rate !== 1) src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(ctx.destination);
    _voices.push(src);
    src.onended = () => {
      const i = _voices.indexOf(src);
      if (i >= 0) _voices.splice(i, 1);
      try { src.disconnect(); gain.disconnect(); } catch (_) {}
    };
    src.start(0);
  } catch (_) {}
}

/** Web Audio が使えないとき: パスごとに 4 つまでの <audio> を使い回す (= 鳴り終わったものを鳴らし直す) */
function _playElement(relPath, vol, rate) {
  if (typeof Audio === "undefined") return;
  let pool = _sePool.get(relPath);
  if (!pool) { pool = []; _sePool.set(relPath, pool); }
  let a = pool.find((x) => x.paused || x.ended);
  if (!a) {
    if (pool.length >= SE_POOL_MAX) return;   // 全部鳴っている (= 捨てる。 要素を増やさない)
    a = new Audio(audioUrl(relPath));
    a.preload = "auto";
    pool.push(a);
  }
  try {
    a.currentTime = 0;
    a.volume = vol;
    // SPEC-102: 音の高さを変えるとき (= CE が続けて届く「じゃらじゃら」)
    a.preservesPitch = rate === 1;
    a.playbackRate = rate;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {}
}

/**
 * SPEC-017: 初回 user gesture (= Press Start click) で audio policy を解除する。
 * dummy <audio> を一度 play しておくと、 mobile Safari の autoplay 制限が緩む。
 * 既に解除済なら no-op。
 */
export function unlockAudio() {
  // Web Audio: 操作の中で作って、 止まっていれば動かす (= iOS は電話や別のアプリで止められることがある)
  const ctx = _audioCtx();
  if (ctx && ctx.state !== "running") { try { ctx.resume?.().catch?.(() => {}); } catch (_) {} }
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  // iOS: 本体の消音スイッチで Web Audio だけ消えないように (= BGM の <audio> と同じ扱い。 Safari 17 から)
  try { if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "playback"; } catch (_) {}
  if (ctx) preloadSe();
  try {
    const a = new Audio();
    a.muted = true;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {}
}

function _bgmVolume() {
  return mixVolume(_bgmBase, getSettings().bgm);
}

/** 鳴らす。 止められたら覚えておく (= 戻り値は play() の Promise。 鳴らさなかったら null) */
function _tryPlay() {
  const el = _bgm;
  let p;
  try {
    p = el.play();
  } catch (_) {
    _bgmBlocked = true;
    return null;
  }
  _bgmBlocked = false;
  if (p && typeof p.then === "function") {
    p.catch((e) => { if (_bgm === el && e?.name === "NotAllowedError") _bgmBlocked = true; });
    return p;
  }
  return null;
}

function _playBgmElement() {
  if (!_bgmPath || _bgmSuspended) return null;
  const vol = _bgmVolume();
  if (vol <= 0) return null;   // 0% のときは読み込みもしない
  try {
    if (!_bgm) {
      _bgm = new Audio();
      _bgm.loop = true;
    }
    if (_bgmSrc !== _bgmPath) {
      _bgm.src = audioUrl(_bgmPath);   // 曲を替える (= 同じ要素のまま)
      _bgmSrc = _bgmPath;
    }
    _bgm.volume = vol;
    _bgm.muted = _silent;   // SPEC-138
    return _tryPlay();
  } catch (_) {
    return null;
  }
}

/**
 * BGM を切り替える (= 頭から)。 ブラウザが止めたら、 次の操作で鳴らし直す (= SPEC-069)
 * @param {string} relPath - "Audio/BGM/land.mp3" 等
 * @param {number} volume - 0.0 〜 1.0 (= 設定 100% のときの音量)
 * @returns {Promise|null} play() の Promise (= 設定が 0 などで鳴らさなかったら null)
 */
export function startBgm(relPath, volume = 0.32) {
  stopBgm();
  _bgmPath = relPath;
  _bgmBase = volume;
  return _playBgmElement();
}

/** ブラウザに止められていて、 まだ鳴らせていない (= SPEC-069) */
export function isBgmBlocked() {
  return _bgmBlocked && !!_bgmPath;
}

/** 止められていたら、 鳴らし直す (= 操作のたびに呼ぶ。 SPEC-069) */
export function retryBgm() {
  if (!isBgmBlocked()) return null;
  return _playBgmElement();
}

/** いまかけたい BGM のパス (= 設定が 0 で止めていても覚えている。 SPEC-060) */
export function currentBgmPath() {
  return _bgmPath;
}

export function stopBgm() {
  _bgmPath = null;
  _bgmBlocked = false;
  if (_bgm) {
    try { _bgm.pause(); _bgm.currentTime = 0; } catch (_) {}
  }
}

export function setBgmVolume(v) {
  _bgmBase = Math.max(0, Math.min(1, v));
  applyAudioSettings();
}

/** SPEC-044: 設定が変わったら、 鳴っている BGM の音量を直す (= 0 なら止め、 0 から上げたら鳴らし直す) */
export function applyAudioSettings() {
  const vol = _bgmVolume();
  if (vol <= 0 || !_bgmPath) {
    if (_bgm) { try { _bgm.pause(); } catch (_) {} }
    return;
  }
  if (_bgm && !_bgm.paused && _bgmSrc === _bgmPath) {
    _bgm.volume = vol;
    return;
  }
  _playBgmElement();
}

/** SPEC-044: タブを離れたら止め、 戻ったら再開する */
export function suspendBgm() {
  _bgmSuspended = true;
  if (_bgm) { try { _bgm.pause(); } catch (_) {} }
}
export function resumeBgm() {
  if (!_bgmSuspended) return;
  _bgmSuspended = false;
  applyAudioSettings();
}

onSettingsChange(() => applyAudioSettings());

let _seMuted = false;
let _silent = false;   // SPEC-138: ミッション (= 信玄の「林」) で BGM と効果音を消している
/** SPEC-138: ミッションのあいだ BGM と効果音を消す (= 曲は止めずに音だけ消し、 終われば続きから) */
export function setMissionSilence(on) {
  on = !!on;
  if (on === _silent) return;
  _silent = on;
  if (_bgm) { try { _bgm.muted = on; } catch (_) {} }
}
export function isMissionSilent() { return _silent; }
/** SPEC-083: 効果音を止める (= ヒーロー選択の武器のプレビューは音を出さない) */
export function setSeMuted(on) {
  _seMuted = !!on;
}

/**
 * SE 再生 (= throttle 付き)
 * @param {string} relPath - "Audio/se_click.mp3" 等
 * @param {number} throttleMs - 連発防止 (default 80ms)
 * @param {number} volume - 0.0 〜 1.0 (= 設定 100% のときの音量)
 * @param {number} rate - 再生の速さ (= 音の高さ。 1 がそのまま)
 */
export function playSe(relPath, throttleMs = 80, volume = 0.5, rate = 1) {
  if (_seMuted || _silent) return;
  const vol = mixVolume(volume, getSettings().se);
  if (vol <= 0) return;
  const now = Date.now();
  const last = _seThrottle.get(relPath) || 0;
  if (now - last < throttleMs) return;
  _seThrottle.set(relPath, now);
  const ctx = _ctx;
  if (ctx && ctx.state === "running") {
    const buf = _buffers.get(relPath);
    if (buf) { _playBuffer(buf, vol, rate); return; }
    // まだ読み込めていない: 読み込めたら鳴らす (= 遅すぎたら捨てる)。 読めなければ <audio> で
    _loadBuffer(relPath).then((b) => {
      if (_seMuted) return;
      if (b) { if (Date.now() - now <= SE_LATE_MS) _playBuffer(b, vol, rate); }
      else _playElement(relPath, vol, rate);
    });
    return;
  }
  _playElement(relPath, vol, rate);
}
