// SPEC-124: ヒーローを選ばずに閉じたら、 モード選択へ戻す (= 戦闘の画面がヒーローなしで残らない)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("✕・背景・Esc はモード選択へ戻す (= 閉じるだけにしない)", () => {
  assert.match(main, /#heroSelectClose"\)\?\.addEventListener\("click", cancelHeroSelect\)/);
  assert.match(main, /heroSelectModal"\) cancelHeroSelect\(\)/);
  const fn = main.slice(main.indexOf("function cancelHeroSelect"), main.indexOf("function renderHeroSelectModal"));
  assert.match(fn, /#app"\)\?\.classList\.add\("hidden"\)/);
  assert.match(fn, /showModeSelect\(\)/);
});
