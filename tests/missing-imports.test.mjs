// SPEC-129: 別のモジュールが export している関数を、 import せずに呼んでいないか (= 読み込みでは落ちず、 呼んだ瞬間に落ちる)。
// v1.4 で gimmicks.js の pushDamageNumber の import が消え、 ステージ 3 で木馬が出るたびに戦闘が止まっていた
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../js/", import.meta.url).pathname;
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : (f.endsWith(".js") ? [p] : []);
  });
}
const files = walk(ROOT);

/** コメントと文字列を消す (= 「pushDamageNumber(」 と書いた説明に引っかからないように) */
function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const exported = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) exported.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\(|async|function|[A-Za-z_$][\w$]*\s*=>)/g)) exported.add(m[1]);
}

/** そのファイルで使える名前 (= import・宣言・引数) */
function known(src) {
  const names = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (n) names.add(n);
    }
  }
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) names.add(m[1]);
  for (const m of src.matchAll(/(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+)([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  // 分割代入・引数 (= ざっくり。 漏れても「知らない名前」側に倒れるだけ)
  for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) for (const p of m[1].split(",")) { const n = p.split(":").pop().split("=")[0].trim(); if (n) names.add(n); }
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>|function\s*[\w$]*\s*\(([^()]*)\)/g)) for (const p of (m[1] ?? m[2] ?? "").split(",")) { const n = p.replace(/[{}[\]]/g, "").split("=")[0].trim(); if (n) names.add(n); }
  return names;
}

test("export された関数を import せずに呼んでいない (= 呼んだ瞬間に ReferenceError で戦闘が止まる)", () => {
  const missing = [];
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    const src = strip(raw);
    const have = known(raw);
    for (const name of exported) {
      if (have.has(name)) continue;
      const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}\\s*\\(`);
      if (re.test(src)) missing.push(`${f.replace(ROOT, "js/")}: ${name}`);
    }
  }
  assert.deepEqual(missing, []);
});
