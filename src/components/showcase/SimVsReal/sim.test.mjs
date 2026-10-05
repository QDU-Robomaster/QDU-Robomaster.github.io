// SimVsReal 仿真内核的单测（sim.ts）。
// 要证明的是：同一份检测耗时，实车（100 Hz 相机 + 两槽帧池）丢帧，仿真（时钟等检测）一帧不丢、只是变慢；
// 暂停只停仿真时钟；步长大小不改变结果。
// run: node --test src/components/showcase/SimVsReal/sim.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from './sim.ts';

const run = (w, sec, cfg, dt = 0.004) => {
  for (let t = 0; t < sec - 1e-9; t += dt) S.stepWorld(w, Math.min(dt, sec - t), cfg);
  return w;
};
const fresh = (sec, extraMs, paused = false, dt) => run(S.createWorld(), sec, { extraMs, paused }, dt);

test('常量来自仓库：100 Hz 相机、两槽池、仿真触发 20000 us', () => {
  assert.equal(S.REAL_CAM_PERIOD_US, 10_000);
  assert.equal(S.SIM_TRIGGER_PERIOD_US, 20_000);
  assert.equal(S.POOL_SLOTS, 2);
});

test('检测不慢：实车 5 s 里每帧都处理，不丢', () => {
  const w = fresh(5, 0);
  assert.equal(w.real.shot, 500);
  assert.equal(w.real.dropped, 0);
  assert.ok(w.real.processed >= 499 && w.real.processed <= 500, `processed ${w.real.processed}`);
});

test('检测变慢到 30 ms：实车丢帧，比例贴着稳态模型 1 - 10/36', () => {
  const w = fresh(20, 30);
  const ratio = w.real.dropped / w.real.shot;
  assert.ok(w.real.dropped > 0);
  assert.ok(Math.abs(ratio - S.realDropModel(30)) < 0.02, `ratio ${ratio} vs ${S.realDropModel(30)}`);
  assert.ok(Math.abs(S.realDropModel(30) - (1 - 10 / 36)) < 1e-12);
});

test('丢帧的门槛正好是相机周期：检测 10 ms 不丢，10.001 ms 以上开始丢', () => {
  assert.equal(fresh(10, 4).real.dropped, 0); // 6 + 4 = 10 ms，和相机周期一样长
  const w = fresh(10, 5); // 11 ms
  assert.ok(w.real.dropped > 0);
});

test('帧账目守恒：出帧 = 已处理 + 丢帧 + 池里还在的', () => {
  for (const extra of [0, 4, 5, 12, 30]) {
    const w = fresh(7.3, extra);
    const held = w.real.slots.filter((s) => s.state !== 'free').length;
    assert.equal(w.real.shot, w.real.processed + w.real.dropped + held, `extra ${extra}`);
    assert.ok(held <= S.POOL_SLOTS);
  }
});

test('帧池不会超过两槽，检测器同一时刻只有一帧在算', () => {
  const w = S.createWorld();
  const cfg = { extraMs: 30, paused: false };
  for (let i = 0; i < 3000; i++) {
    S.stepWorld(w, 0.0037, cfg);
    const busy = w.real.slots.filter((s) => s.state === 'detecting').length;
    const used = w.real.slots.filter((s) => s.state !== 'free').length;
    assert.ok(busy <= 1);
    assert.ok(used <= S.POOL_SLOTS);
    assert.equal(busy === 1, w.real.detSlot >= 0);
  }
});

test('仿真一路任何检测耗时下都一帧不丢，每个触发的帧都处理到了', () => {
  for (const extra of [0, 7, 15, 30]) {
    const w = fresh(12, extra);
    assert.equal(w.sim.dropped, 0);
    const inflight = w.sim.detLeftUs > 0 ? 1 : 0;
    assert.equal(w.sim.seq, w.sim.processed + inflight, `extra ${extra}`);
    assert.ok(w.sim.ledger.every((v) => v === 1));
  }
});

test('仿真速率 = 触发周期 / (触发周期 + 检测耗时)，慢多少由检测决定', () => {
  for (const extra of [0, 4, 15, 30]) {
    const w = fresh(30, extra);
    const avg = w.sim.simUs / w.sim.wallUs;
    assert.ok(Math.abs(avg - S.simSpeedModel(extra)) < 0.01, `extra ${extra}: ${avg} vs ${S.simSpeedModel(extra)}`);
    assert.ok(Math.abs(w.sim.speed - S.simSpeedModel(extra)) < 0.05, `ema ${w.sim.speed}`);
  }
  assert.ok(Math.abs(S.simSpeedModel(0) - 20 / 26) < 1e-12);
  assert.ok(Math.abs(S.simSpeedModel(30) - 20 / 56) < 1e-12);
});

test('检测越慢，仿真等的时间占比越高；实车的墙钟不受影响', () => {
  const a = fresh(20, 0);
  const b = fresh(20, 30);
  assert.ok(b.sim.holdFrac > a.sim.holdFrac);
  assert.ok(b.sim.holdFrac > 0.6);
  assert.ok(Math.abs(a.real.nowUs - 20 * S.US) < 1);
  assert.ok(Math.abs(b.real.nowUs - 20 * S.US) < 1);
  assert.ok(b.sim.simUs < a.sim.simUs);
});

test('暂停：仿真时钟不动，实车照走，恢复后接着走，不补发帧', () => {
  const w = S.createWorld();
  run(w, 3, { extraMs: 0, paused: false });
  run(w, 0.2, { extraMs: 0, paused: true }); // 让正在算的那一帧收尾
  const simAt = w.sim.simUs;
  const procAt = w.sim.processed;
  const realAt = w.real.nowUs;
  run(w, 5, { extraMs: 0, paused: true });
  assert.equal(w.sim.simUs, simAt);
  assert.equal(w.sim.processed, procAt);
  assert.ok(Math.abs(w.real.nowUs - (realAt + 5 * S.US)) < 1);
  assert.ok(w.real.processed > 700); // 实车一直在出帧
  assert.ok(w.sim.speed < 0.02);
  run(w, 1, { extraMs: 0, paused: false });
  assert.ok(w.sim.simUs > simAt);
  // 恢复之后一秒内，仿真只推进了大约一秒 * 速率，没有把暂停的 5 s 补回来
  assert.ok(w.sim.simUs - simAt < 1 * S.US);
});

test('暂停不会把已经开始的检测悬在半空，也不会让仿真丢帧', () => {
  const w = S.createWorld();
  run(w, 1.017, { extraMs: 30, paused: false });
  const seq = w.sim.seq;
  run(w, 2, { extraMs: 30, paused: true });
  assert.equal(w.sim.detLeftUs, 0);
  assert.equal(w.sim.seq, seq);
  assert.equal(w.sim.seq, w.sim.processed);
  assert.equal(w.sim.dropped, 0);
});

test('步长无关：1 ms、16.7 ms、100 ms 三种步长得到相同的计数', () => {
  for (const extra of [0, 12, 30]) {
    const a = fresh(10, extra, false, 0.001);
    const b = fresh(10, extra, false, 1 / 60);
    const c = fresh(10, extra, false, 0.1);
    for (const w of [b, c]) {
      assert.ok(Math.abs(w.real.dropped - a.real.dropped) <= 1, `drop ${extra}`);
      assert.ok(Math.abs(w.real.processed - a.real.processed) <= 1, `proc ${extra}`);
      assert.ok(Math.abs(w.sim.processed - a.sim.processed) <= 1, `sim proc ${extra}`);
      assert.ok(Math.abs(w.sim.simUs - a.sim.simUs) < 1000, `sim t ${extra}`);
    }
  }
});

test('中途改滑块：正在算的这一帧不变，下一帧才用新耗时', () => {
  const w = S.createWorld();
  run(w, 0.0205, { extraMs: 0, paused: false }); // 实车第 2 帧刚进来，检测 6 ms
  const done0 = w.real.doneAtUs;
  S.stepWorld(w, 0.0001, { extraMs: 30, paused: false });
  assert.equal(w.real.doneAtUs, done0);
  run(w, 0.05, { extraMs: 30, paused: false });
  const gaps = [];
  let prev = null;
  // 之后完成时刻之间的间隔变成 36 ms
  const w2 = S.createWorld();
  const cfg = { extraMs: 30, paused: false };
  for (let i = 0; i < 400; i++) {
    const before = w2.real.processed;
    S.stepWorld(w2, 0.001, cfg);
    if (w2.real.processed > before) {
      if (prev !== null) gaps.push(w2.real.nowUs - prev);
      prev = w2.real.nowUs;
    }
  }
  assert.ok(gaps.length > 5);
  for (const g of gaps) assert.ok(Math.abs(g - 36_000) <= 1100, `gap ${g}`);
});

test('时钟单调，已处理帧的采集时间严格递增', () => {
  const w = S.createWorld();
  let r = 0;
  let s = 0;
  for (let i = 0; i < 2000; i++) {
    S.stepWorld(w, 0.0071, { extraMs: S.autoSweep(i * 0.0071), paused: i % 700 > 600 });
    assert.ok(w.real.nowUs >= r && w.sim.simUs >= s);
    r = w.real.nowUs;
    s = w.sim.simUs;
  }
  for (const h of [w.real.history, w.sim.history]) {
    assert.ok(h.length <= S.HISTORY);
    for (let i = 1; i < h.length; i++) assert.ok(h[i] > h[i - 1]);
  }
  assert.ok(w.real.ledger.length <= S.LEDGER && w.sim.ledger.length <= S.LEDGER);
});

test('帧带：慢检测下实车有 0（丢），仿真全是 1', () => {
  const w = fresh(3, 30);
  assert.ok(w.real.ledger.includes(0));
  assert.ok(w.sim.ledger.every((v) => v === 1));
  const ok = fresh(3, 0);
  assert.ok(ok.real.ledger.every((v) => v === 1));
});

test('灯条：检测在算时检测级是 1，没有新帧时下游级逐渐灭掉', () => {
  const w = S.createWorld();
  run(w, 0.5, { extraMs: 30, paused: false });
  // 暂停之后仿真侧下游不再有新帧
  run(w, 0.3, { extraMs: 30, paused: true });
  const l = S.lamps(w);
  assert.ok(l.sim[2] < 0.05 && l.sim[3] < 0.05, JSON.stringify(l.sim));
  assert.equal(l.sim[1] < 0.05, true);
  for (const x of [...l.real, ...l.sim]) assert.ok(x >= 0 && x <= 1);
  const busy = fresh(0.0105, 0); // 第一帧 10 ms 进来，检测 6 ms，到 16 ms 才完
  assert.ok(busy.real.detSlot >= 0);
  assert.equal(S.lamps(busy).real[1], 1);
  assert.ok(S.lamps(busy).real[0] > 0.9); // 刚进帧
});

test('settle：减少动态的静帧里，实车在丢帧、仿真时钟落后、仿真不丢', () => {
  const w = S.settle(24, false);
  assert.ok(w.real.dropped > 300);
  assert.equal(w.sim.dropped, 0);
  assert.ok(Math.abs(w.real.nowUs - 6 * S.US) < 1);
  assert.ok(w.sim.simUs < 0.5 * w.real.nowUs);
  const p = S.settle(24, true);
  assert.ok(Math.abs(p.real.nowUs - 6 * S.US) < 1);
  assert.ok(p.sim.simUs <= 3 * S.US * S.simSpeedModel(24) + 1000);
  assert.ok(p.sim.speed < 0.05);
});

test('自动演示：在 0..30 之间，整数毫秒，有基线段、有最高段，周期性', () => {
  let lo = 99;
  let hi = -1;
  for (let t = 0; t < S.AUTO_CYCLE_S; t += 0.05) {
    const v = S.autoSweep(t);
    assert.ok(Number.isInteger(v) && v >= 0 && v <= S.MAX_EXTRA_MS);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  assert.equal(lo, 0);
  assert.equal(hi, 30);
  assert.equal(S.autoSweep(1), 0);
  assert.equal(S.autoSweep(8), 30);
  assert.equal(S.autoSweep(2 + S.AUTO_CYCLE_S), S.autoSweep(2));
  assert.equal(S.autoSweep(-1), S.autoSweep(S.AUTO_CYCLE_S - 1));
});

test('目标：位置在画面里，是时间的纯函数，轨迹相邻帧不会跳', () => {
  for (let t = 0; t < 20; t += 0.01) {
    const p = S.targetPose(t);
    assert.ok(p.u > 0.1 && p.u < 0.9 && p.v > 0.4 && p.v < 0.7 && p.s > 0.8 && p.s < 1.2);
  }
  assert.deepEqual(S.targetPose(3.3), S.targetPose(3.3));
  const a = S.targetPose(1);
  const b = S.targetPose(1.02);
  assert.ok(Math.hypot(a.u - b.u, a.v - b.v) < 0.03);
});

test('装甲板：任何时刻至少看得到一块，且最正对的那块在 [0.707, 1]', () => {
  for (let yaw = 0; yaw < 20; yaw += 0.01) {
    const ps = S.visiblePlates(yaw);
    assert.ok(ps.length >= 1 && ps.length <= 2, `yaw ${yaw}`);
    const best = Math.max(...ps.map((p) => p.facing));
    assert.ok(best >= Math.SQRT1_2 - 1e-9 && best <= 1 + 1e-9);
    for (const p of ps) assert.ok(p.x >= -1 && p.x <= 1 && p.k >= 0 && p.k < 4);
  }
});
