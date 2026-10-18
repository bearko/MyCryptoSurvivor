// SPEC-095: ランキングの送り先は Google Apps Script のウェブアプリだけ
import { test } from "node:test";
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.atob ??= (s) => Buffer.from(s, "base64").toString("binary");
const { isRankingApiUrl, getRankingApiUrl, setRankingApiUrl } = await import("../js/ranking-client.js");
const { LS_RANKING_API_URL } = await import("../js/constants.js");

test("送り先は GAS のウェブアプリの URL だけ。 ほかは保存しない・読まない", () => {
  const def = getRankingApiUrl();
  assert.ok(isRankingApiUrl(def), "既定は GAS");
  assert.equal(isRankingApiUrl("https://evil.example/exec"), false);
  assert.equal(isRankingApiUrl("https://script.google.com.evil.example/macros/s/x/exec"), false);
  setRankingApiUrl("https://evil.example/exec");
  assert.equal(getRankingApiUrl(), def, "保存しない");
  store[LS_RANKING_API_URL] = "https://evil.example/exec";   // 以前に保存されたもの
  assert.equal(getRankingApiUrl(), def, "読まない");
  setRankingApiUrl("https://script.google.com/macros/s/AKfy-abc_123/exec");
  assert.equal(getRankingApiUrl(), "https://script.google.com/macros/s/AKfy-abc_123/exec");
});
