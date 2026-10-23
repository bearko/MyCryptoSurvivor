// ============================================================
// ranking-client.js — Google Apps Script ランキング API
// ============================================================

import { LS_RANKING_API_URL, LS_PLAYER_NAME } from "./constants.js";
import { isTestMode } from "./team.js";   // SPEC-166

// ⚠ デプロイ後、 btoa("https://script.google.com/macros/s/.../exec") で base64 化して埋め込む
// SPEC-036: 本プロジェクト共通ランキング (= GAS Web App、 全員アクセス) を default URL に
const _DEFAULT_API_URL_ENC = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3a1hVRFlqbFk4dFVRSU1ubG44Vm9HejlIRDNTUjRHZEM0Q1hiRWZDdURKMUcxNUROczF3X1dKdTBRcHczc28taHptUS9leGVj";

function _decodeDefault() {
  try {
    if (!_DEFAULT_API_URL_ENC) return null;
    return typeof atob === "function" ? atob(_DEFAULT_API_URL_ENC) : null;
  } catch (e) { return null; }
}

/** 送り先として受け付ける URL (= Google Apps Script のウェブアプリだけ。 SPEC-095)。 純関数 */
export function isRankingApiUrl(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(url || "").trim());
}

export function getRankingApiUrl() {
  try {
    const v = localStorage.getItem(LS_RANKING_API_URL);
    if (v && isRankingApiUrl(v)) return v.trim();
  } catch (e) {}
  const def = _decodeDefault();
  return (def && def.trim()) ? def.trim() : null;
}

export function setRankingApiUrl(url) {
  try {
    if (!url || !url.trim()) localStorage.removeItem(LS_RANKING_API_URL);
    else if (isRankingApiUrl(url)) localStorage.setItem(LS_RANKING_API_URL, url.trim());
  } catch (e) {}
}

// SPEC-038 で未設定時は "anonymous" を返していたが、 SPEC-052 で空に変えた
// (= 既定の名前は platform.js の defaultPlayerName。 ログイン中なら bearko.games の名前)
const DEFAULT_PLAYER_NAME = "";

export function getPlayerName() {
  try {
    const v = localStorage.getItem(LS_PLAYER_NAME);
    return (v && v.trim()) ? v : DEFAULT_PLAYER_NAME;
  } catch (e) { return DEFAULT_PLAYER_NAME; }
}

export function setPlayerName(name) {
  try {
    const trimmed = (name || "").trim().slice(0, 30);
    if (!trimmed) localStorage.removeItem(LS_PLAYER_NAME);
    else localStorage.setItem(LS_PLAYER_NAME, trimmed);
  } catch (e) {}
}

/**
 * @param {Object} payload - { playerName, score, version, ... }
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function submitScore(payload) {
  if (isTestMode()) return { ok: false, skipped: "test" };   // SPEC-166: ?test=1 ではランキングに送らない
  const url = getRankingApiUrl();
  if (!url) return { ok: false, error: "ランキング API URL が未設定" };
  try {
    const body = { ...payload, timestamp: new Date().toISOString() };
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      // ↓ CORS preflight (= OPTIONS) 回避のために text/plain を使う
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => ({}));
    return { ok: !!data.ok, error: data.error };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/**
 * @param {{ regulation?: string, version?: string, limit?: number }} [opts]
 */
export async function fetchRanking(opts = {}) {
  const url = getRankingApiUrl();
  if (!url) return { ok: false, error: "ランキング API URL が未設定", ranking: [] };
  try {
    const params = new URLSearchParams();
    if (opts.regulation) params.set("regulation", opts.regulation);
    if (opts.version)    params.set("version", opts.version);
    if (opts.limit)      params.set("limit", String(opts.limit));
    const fullUrl = params.toString() ? `${url}?${params}` : url;
    const res = await fetch(fullUrl, { method: "GET", mode: "cors", cache: "no-cache" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, ranking: [] };
    const data = await res.json().catch(() => ({}));
    return { ok: !!data.ok, ranking: data.ranking || [], error: data.error };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), ranking: [] };
  }
}
