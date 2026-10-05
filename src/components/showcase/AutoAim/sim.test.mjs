// node --test src/components/showcase/AutoAim/sim.test.mjs
// 估计器、弹道、瞄准、闸门、待机剧本、两种瞄法的对照。node 24 直接读 .ts（只用可擦除的类型语法）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from './sim.ts';

const { V, Sim, Duel } = C;
const TAU = 2 * Math.PI;

// 跑一轮待机，返回带相位的事件日志
function runCycles(seed, T, mode) {
  const S = new Sim(seed, mode), ev = [], log = S.log.bind(S);
  S.log = (type, o) => { ev.push(Object.assign({ t: S.t, u: S.phase, n: S.cycle, type }, o || {})); log(type, o); };
  S.advance(T);
  return { S, ev };
}
// 手动场景：目标在圈上以固定转速转，每 0.25 s 要求打一发
function volley(opt) {
  const S = new Sim(opt.seed || 7, opt.mode || 'pred');
  S.startCycle(1); S.manual(); S.cfg.lat = opt.lat || V.latency;
  S.A.wT = opt.spin * TAU; S.A.w = S.A.wT;
  S.advance(3);
  const h0 = S.stats.hits, s0 = S.stats.shots;
  for (let t = 3.25; t < 3 + opt.n * 0.25; t += 0.25) { S.advance(t); S.request(); }
  S.advance(3 + opt.n * 0.25 + 1);
  return { rate: (S.stats.hits - h0) / Math.max(1, S.stats.shots - s0), shots: S.stats.shots - s0 };
}

test('数值：4 m 飞行约 0.17 s；处理延迟分段合计 17.6 ms；板型和转速档', () => {
  const t = C.tof(4, 0);
  assert.ok(Math.abs(t - 0.17) < 0.002, `tof ${t}`);
  assert.ok(Math.abs(V.split.reduce((a, b) => a + b, 0) - 0.0176) < 1e-9);
  assert.equal(V.r1, 0.20); assert.equal(V.r2, 0.25); assert.equal(V.dz, 0.05);
  assert.deepEqual(V.spins, [0.5, 2.0, -1.2]);
});

test('弹道：解出的俯仰过目标高度；积分出的弹丸落点偏差小于 2 cm', () => {
  for (const [x, h] of [[2, -0.05], [4, -0.06], [6, 0.02]]) {
    const sol = C.solvePitch(x, h);
    const z = V.v0 * Math.sin(sol.pitch) * sol.t - 0.5 * V.g * sol.t * sol.t;
    assert.ok(Math.abs(z - h) < 1e-3, `analytic miss ${z - h} at ${x} m`);
    const s = { p: [0, 0, 0], v: [V.v0 * Math.cos(sol.pitch), 0, V.v0 * Math.sin(sol.pitch)] };
    let prev = s.p.slice();
    while (s.p[0] < x) { prev = s.p.slice(); C.shotStep(s, 0.0005); }
    const u = (x - prev[0]) / (s.p[0] - prev[0]), zz = prev[2] + (s.p[2] - prev[2]) * u;
    assert.ok(Math.abs(zz - h) < 0.02, `numeric miss ${(zz - h).toFixed(4)} m at ${x} m`);
  }
});

test('估计器：从一块板到整车（中心、转速、r1、r2、dz），误差椭圆收紧', () => {
  const S = new Sim(52);
  let first = null;
  for (let t = 0.01; t < 4.0; t += 0.01) {
    S.advance(t);
    if (!first && S.trk.x && S.trk.n <= 2) first = S.trk.ellipse()[0];
  }
  assert.ok(first > 0.2, `initial 1-sigma ${first}`);
  const x = S.trk.x, e = S.trk.ellipse();
  assert.ok(e[0] < 0.03, `converged 1-sigma ${e[0]}`);
  const cErr = Math.hypot(x[0] - S.A.c[0], x[1] - S.A.c[1]);
  assert.ok(cErr < 0.06, `centre error ${cErr}`);
  const r = [x[7], x[8]].sort((a, b) => a - b), dz = x[8] >= x[7] ? x[9] : -x[9];
  assert.ok(Math.abs(r[0] - V.r1) < 0.01 && Math.abs(r[1] - V.r2) < 0.01, `radii ${r}`);
  assert.ok(Math.abs(dz - V.dz) < 0.01, `dz ${dz}`);
  assert.ok(Math.abs(x[6] - S.A.w) / TAU < 0.06, `spin ${x[6] / TAU} vs ${S.A.w / TAU}`);
});

test('反向转：估计在几帧内跟上', () => {
  const S = new Sim(52);
  S.advance(11.0);
  const w0 = S.trk.x[6];
  S.advance(11.6);
  assert.ok(Math.sign(S.trk.x[6]) === -Math.sign(w0), 'spin sign follows the reversal');
  assert.ok(Math.abs(S.trk.x[6] - S.A.w) / TAU < 0.15, `spin after 0.6 s ${S.trk.x[6] / TAU} vs ${S.A.w / TAU}`);
});

test('时间预算：飞行时间迭代三次收敛', () => {
  const S = new Sim(52);
  S.advance(6);
  const P = C.plan(S.trk, V.latency + V.tGim, [0, 0, V.pivotH]);
  assert.equal(P.iters.length, 3);
  const t = P.iters.map((i) => i.tfly);
  assert.ok(Math.abs(t[2] - t[1]) < 0.001, `iterations ${t}`);
  assert.ok(Math.abs(t[1] - t[0]) > Math.abs(t[2] - t[1]), 'each iteration moves less');
  assert.ok(P.tfly > 0.12 && P.tfly < 0.25);
  const B = S.budget();
  assert.ok(Math.abs(B.delta - (V.latency + V.tGim + B.tfly)) < 1e-9);
});

test('命中率：预测打得中，看到哪瞄哪打不中', () => {
  for (const spin of [0.5, 1.2, 2.0]) {
    const p = volley({ spin, n: 40, mode: 'pred' }), s = volley({ spin, n: 40, mode: 'seen' });
    assert.ok(p.rate >= 0.85, `prediction ${spin} rev/s: ${p.rate}`);
    // 2 圈/s 时转 1/4 圈只要 0.125 s，和延迟差不多，下一块板常常正好转到原来的位置，瞎蒙也能中一些
    assert.ok(s.rate <= (spin > 1.5 ? 0.7 : 0.45), `seen ${spin} rev/s: ${s.rate}`);
    assert.ok(p.rate - s.rate >= (spin > 1.5 ? 0.25 : 0.45), `gap at ${spin} rev/s`);
  }
});

test('延迟补偿：60 ms 延迟下预测仍然稳，看到哪瞄哪更差', () => {
  const on = volley({ spin: 1.2, n: 40, lat: 0.06, mode: 'pred' }), off = volley({ spin: 1.2, n: 40, lat: 0.06, mode: 'seen' });
  assert.ok(on.rate >= 0.85, `compensated ${on.rate}`);
  assert.ok(off.rate <= 0.4, `uncompensated ${off.rate}`);
});

test('待机一轮：1.5 s 内发现，5 s 起开火，七步依次，11 s 反转', () => {
  const { ev, S } = runCycles(52, 13.05);
  const det = ev.find((e) => e.type === 'detect'), fire = ev.find((e) => e.type === 'fire');
  assert.ok(det && det.u > 0.02 && det.u < 1.5, `detect at ${det && det.u}`);
  assert.ok(fire && fire.u >= 5.0 && fire.u < 5.5, `first fire at ${fire && fire.u}`);
  assert.ok(ev.some((e) => e.type === 'reverse' && Math.abs(e.u - 11) < 0.01));
  assert.ok(S.stats.hits / S.stats.shots > 0.8, `hits ${S.stats.hits}/${S.stats.shots}`);
});

test('待机连续跑三轮：每轮都重新发现、不丢目标、转速档轮换', () => {
  const { ev } = runCycles(52, 3 * 13.1 + 0.2);
  const cyc = ev.filter((e) => e.type === 'cycle');
  assert.deepEqual(cyc.map((e) => e.v), [0, 1, 2, 0]);
  for (let n = 0; n < 3; n++) assert.ok(ev.some((e) => e.type === 'detect' && e.n === n), `detect in cycle ${n}`);
  assert.ok(!ev.some((e) => e.type === 'lost'), 'the track is never lost mid-cycle');
});

test('闸门四项：面可打、枪线与命中面一致、命令稳定、云台对齐；转面时会先关', () => {
  const S = new Sim(52, 'pred');
  S.startCycle(1); S.manual(); S.A.wT = 1.2 * TAU; S.A.w = S.A.wT; S.advance(3);
  let open = 0, closed = 0, whyFace = 0, whyOther = 0;
  for (let t = 3; t < 8; t += 0.002) {
    S.advance(t);
    if (S.gate.open) {
      open++;
      assert.ok(S.gate.ang < V.gateFace && S.gate.gim < V.gateGim && S.gate.sig < V.gateSigma && S.gate.cons, 'open implies all four checks');
    } else { closed++; if (S.gate.why === 'face') whyFace++; else whyOther++; }
  }
  assert.ok(open > 50 && closed > 50, `gate open ${open} closed ${closed}`);
  assert.ok(whyFace + whyOther === closed);
});

test('确定性：同样的种子、同样的状态', () => {
  const a = new Sim(3), b = new Sim(3);
  a.advance(20); b.advance(20);
  assert.deepEqual(a.trk.x, b.trk.x);
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.impacts.length, b.impacts.length);
});

test('对照：两台仿真的目标运动一模一样，只有瞄法不同；预测命中率明显高', () => {
  const D = new Duel(52);
  D.advance(13.05);
  assert.deepEqual(D.pred.A.c, D.seen.A.c);
  assert.equal(D.pred.A.th, D.seen.A.th);
  assert.equal(D.pred.cfg.mode, 'pred'); assert.equal(D.seen.cfg.mode, 'seen');
  const p = D.pred.rate(), s = D.seen.rate();
  assert.ok(p.n >= 6 && s.n >= 3, `shots pred ${p.n} seen ${s.n}`);
  assert.ok(p.hits / p.n >= 0.8, `pred ${p.hits}/${p.n}`);
  assert.ok(s.hits / s.n <= 0.6, `seen ${s.hits}/${s.n}`);
});

test('命中率窗口只留最近 V.win 发', () => {
  const D = new Duel(52);
  D.settle(1.2, 12);
  for (let i = 0; i < 6; i++) { D.advance(D.t + 1.5); for (let k = 0; k < 3; k++) D.request(); D.runOut(); }
  const r = D.pred.rate();
  assert.ok(r.n <= V.win && r.total > r.n, `window ${r.n} of ${r.total}`);
});

test('静帧：settle 之后两台都打过，落点标记还在，预测明显好于看到哪瞄哪', () => {
  const D = new Duel(52);
  D.settle(1.2, 8);
  const p = D.pred.rate(), s = D.seen.rate();
  assert.ok(p.n >= 6 && s.n >= 6, `n ${p.n}/${s.n}`);
  assert.ok(p.hits / p.n >= 0.8, `pred ${p.hits}/${p.n}`);
  assert.ok(s.hits / s.n <= 0.5, `seen ${s.hits}/${s.n}`);
  assert.ok(D.pred.impacts.length > 0 && D.seen.shots.length > 0);
});

test('拖动：抓住目标跟着走，放手后在这个距离上左右来回走；待机剧本停下', () => {
  const D = new Duel(52);
  D.advance(3);
  D.grab();
  assert.equal(D.pred.cfg.auto, false);
  D.moveTo(3.2, 0.5); D.advance(D.t + 0.4);
  assert.ok(Math.hypot(D.pred.A.c[0] - 3.2, D.pred.A.c[1] - 0.5) < 0.03, `follows ${D.pred.A.c}`);
  D.drop();
  const x0 = D.pred.A.c[0];
  let ymin = 9, ymax = -9;
  const T0 = D.t;
  for (let t = T0 + 0.1; t < T0 + 14; t += 0.1) { D.advance(t); ymin = Math.min(ymin, D.pred.A.c[1]); ymax = Math.max(ymax, D.pred.A.c[1]); assert.ok(Math.abs(D.pred.A.c[0] - x0) < 1e-6, 'range stays'); }
  assert.ok(ymin < -1.1 && ymax > 1.1, `shuttle spans ${ymin}..${ymax}`);
  // 估计在新位置上重新收敛
  assert.ok(D.pred.trk.x, 'tracking again');
});

test('转速滑块：目标转速跟着变，估计跟得上', () => {
  const D = new Duel(52);
  D.advance(6); D.setSpin(-1.8); D.advance(D.t + 2.0);
  const S = D.pred;
  assert.ok(Math.abs(S.A.w / TAU + 1.8) < 0.02, `truth ${S.A.w / TAU}`);
  assert.ok(Math.abs(S.trk.x[6] - S.A.w) / TAU < 0.2, `est ${S.trk.x[6] / TAU}`);
});

test('回到待机：目标开回巡逻圈，一轮从头开始，没有瞬移', () => {
  const D = new Duel(52);
  D.advance(4); D.grab(); D.moveTo(5.0, -1.0); D.advance(D.t + 0.3); D.drop(); D.advance(D.t + 3);
  const S = D.pred; let prev = S.A.c.slice(), maxJump = 0;
  D.resume();
  assert.equal(S.cfg.auto, true);
  const T1 = D.t;
  for (let t = T1 + 0.01; t < T1 + 15; t += 0.01) {
    D.advance(t); maxJump = Math.max(maxJump, Math.hypot(S.A.c[0] - prev[0], S.A.c[1] - prev[1])); prev = S.A.c.slice();
  }
  assert.ok(maxJump < 0.05, `no teleport, max step ${maxJump}`);
  assert.ok(S.events.some((e) => e.type === 'cycle'), 'a new cycle began');
});

test('跟踪器状态机：lost -> detecting -> tracking', () => {
  const S = new Sim(52);
  assert.equal(S.trackState(), 'lost');
  const seen = new Set();
  for (let t = 0.01; t < 3; t += 0.01) { S.advance(t); seen.add(S.trackState()); }
  assert.ok(seen.has('detecting') && seen.has('tracking'), [...seen].join());
});

test('开火按钮只是请求：闸门放行才发射，等了 1.2 s 没放行就取消这一发', () => {
  // 没有目标：闸门一直关，请求取消，什么都没打出去
  const S = new Sim(52, 'pred');
  S.g.psi = 2.5; S.g.cy = 2.5; S.manual(); S.request(); S.advance(0.5);
  assert.equal(S.stats.shots, 0, 'still waiting, nothing fired');
  S.advance(1.5);
  assert.equal(S.stats.shots, 0); assert.equal(S.req, 0);
  assert.ok(S.events.some((e) => e.type === 'dry'), 'dry event');
  assert.ok(S.t - S.lastDry < 1);
  // 有目标：手动模式下按钮发出的每一发，开火那一刻闸门都是开的
  const D = new Sim(52, 'pred'), fired = [], f0 = D.fire.bind(D);
  D.fire = (src) => { fired.push({ src, open: D.gate.open }); return f0(src); };
  D.startCycle(1); D.manual(); D.A.wT = 1.2 * TAU; D.A.w = D.A.wT; D.advance(2);
  for (let t = 2.2; t < 6; t += 0.2) { D.advance(t); D.request(); }
  D.advance(8);
  assert.ok(fired.length >= 6, `fired ${fired.length}`);
  assert.ok(fired.every((e) => e.open), 'every button shot went through an open gate');
});

// 拖动目标：t+Δ 的预测面中心和鼠标同向（抓住之前的巡逻速度不能把预测往反方向带）
test('拖动时预测面跟着手的方向走，停手后不过冲、不反向', () => {
  // 手每 0.15 s 一跳、共 0.6 s 拖 ±0.6 m，再停住 1 s。预测面中心对目标的偏移要和手同向（或接近零），停手 0.2 s 后回到目标附近
  let tested = 0;
  for (const dir of [1, -1]) for (const seed of [1, 2, 3, 5]) for (const T of [6, 9]) {
    const D = new Duel(seed), S = D.pred; D.advance(T);
    const c0 = S.A.c.slice(); D.grab();
    const t0 = D.t; let n = 0, wrong = 0, late = 0, lateN = 0, maxFlip = 0;
    while (D.t - t0 < 1.6) {
      const t = D.t - t0, dy = t < 0.6 ? Math.floor(t / 0.15 + 1) * 0.15 : 0.6;
      D.moveTo(c0[0] + 0.9 * dy * dir, c0[1] + 0.45 * dir * dy); D.advance(D.t + 0.03);
      const P = S.planCmd; if (!P || P.center || !P.faces) continue;
      const off = (dir * 0.45 * (P.faces.faces.reduce((a, f) => a + f.p[1], 0) / 4 - S.A.c[1]) + dir * 0.9 * (P.faces.faces.reduce((a, f) => a + f.p[0], 0) / 4 - S.A.c[0])) / 1.0;
      if (t < 0.7) { n++; if (off < -0.05) wrong++; } else if (t > 0.8) { lateN++; late = Math.max(late, Math.abs(off)); }
      maxFlip = Math.min(maxFlip, off);
    }
    tested++;
    assert.ok(wrong <= n * 0.1, `seed ${seed} T ${T} dir ${dir}: 拖动中预测面在手的反侧 ${wrong}/${n}`);
    assert.ok(lateN === 0 || late < 0.06, `seed ${seed} T ${T} dir ${dir}: 停手 0.2 s 后预测面离目标 ${late.toFixed(2)} m`);
  }
  assert.equal(tested, 16);
});
