// SPEC-104: 中断する画面を閉じたら 3 秒数えてから再開
// 実行: node --test tests/resume-countdown.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
const { state, pauseTime, resumeTime } = await import("../js/state.js");
const { shouldCountdown, countdownNumber, tickResumeCountdown, resetResumeCountdown, isResumeCounting, RESUME_COUNTDOWN_MS } = await import("../js/battle/resume-countdown.js");

const frames = (from, to, step = 16) => { for (let t = from; t <= to; t += step) tickResumeCountdown(t); };

test("数えるかの判定と数字", () => {
  assert.equal(shouldCountdown({ active: true, elapsedMs: 5000, pausedMs: 1000 }), true);
  assert.equal(shouldCountdown({ active: true, elapsedMs: 200, pausedMs: 1000 }), false, "ステージの始まりは数えない");
  assert.equal(shouldCountdown({ active: true, elapsedMs: 5000, pausedMs: 50 }), false, "一瞬の止めは数えない");
  assert.equal(shouldCountdown({ active: false, elapsedMs: 5000, pausedMs: 1000 }), false);
  assert.deepEqual([3000, 2001, 2000, 1, 0].map(countdownNumber), [3, 3, 2, 1, 1]);
});

test("レベルアップを閉じると、 3 秒止まってから動き出す", () => {
  state.battle.active = true;
  state.battle.stageElapsedMs = 30000;
  state.pauseFlags = 0;
  resetResumeCountdown();
  frames(0, 100);
  pauseTime();                 // レベルアップを開く
  frames(116, 1100);
  resumeTime();                // 閉じる
  tickResumeCountdown(1116);
  assert.equal(isResumeCounting(), true, "数え始める");
  assert.equal(state.pauseFlags, 1, "数えるあいだは止まっている");
  frames(1132, 1116 + RESUME_COUNTDOWN_MS - 20);
  assert.equal(state.pauseFlags, 1);
  frames(1116 + RESUME_COUNTDOWN_MS, 1116 + RESUME_COUNTDOWN_MS + 32);
  assert.equal(isResumeCounting(), false);
  assert.equal(state.pauseFlags, 0, "数え終えたら動く");
});

test("数えているあいだにメニューが開いたら、 閉じてから数え直す。 タブを離れたときも", () => {
  state.battle.active = true;
  state.battle.stageElapsedMs = 30000;
  state.pauseFlags = 0;
  resetResumeCountdown();
  frames(0, 32);
  pauseTime(); frames(48, 600); resumeTime();
  tickResumeCountdown(616);
  frames(632, 2000);
  pauseTime();                 // メニュー
  frames(2016, 5000);
  resumeTime();                // メニューを閉じる
  tickResumeCountdown(5016);
  frames(5032, 5016 + RESUME_COUNTDOWN_MS - 40);
  assert.equal(state.pauseFlags, 1, "閉じてから 3 秒は止まったまま");
  tickResumeCountdown(9000 + 5000);   // タブを離れていた (= 間が空いた)
  assert.equal(state.pauseFlags, 1, "戻ってきたら数え直す");
  frames(14016, 14016 + RESUME_COUNTDOWN_MS + 32);
  assert.equal(state.pauseFlags, 0);
});

test("ステージの始まり・戦闘の終わりでは、 数えている止めを外す", () => {
  state.battle.active = true;
  state.battle.stageElapsedMs = 30000;
  state.pauseFlags = 0;
  resetResumeCountdown();
  frames(0, 32);
  pauseTime(); frames(48, 600); resumeTime(); tickResumeCountdown(616);
  assert.equal(state.pauseFlags, 1);
  resetResumeCountdown({ release: true });
  assert.equal(state.pauseFlags, 0);
  pauseTime(); frames(700, 1300); resumeTime(); tickResumeCountdown(1316);
  state.battle.active = false;
  tickResumeCountdown(1332);
  assert.equal(state.pauseFlags, 0, "戦闘が終わったら外す");
  assert.equal(isResumeCounting(), false);
});
