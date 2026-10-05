// Unit tests for the CameraSync simulation core (sim.ts).
// Part A ports CameraSync's own state-machine tests (tests/camera_sync_state_machine_test.cpp, master 8b79f8f) case by case.
// Part B checks the host side against CameraFrameSyncCore (stride, gap tolerance, nearest sample) and the packet encoder
// against LibXR's CRC8 / CRC32 definitions. Part C runs the whole bench: handshake, 100 Hz cadence, pairing, a lost frame.
// Part D covers what the widget adds on top: previewPair, pose.
// run: node --test "src/components/showcase/CameraSync/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from './sim.ts';

const { OP, SyncSM, Core } = S;
const Stop = (seq, level = 1) => ({ op: OP.STOP, level, seq, reserved: 0, period: 0 });
const Start = (seq, period, level = 1) => ({ op: OP.START, level, seq, reserved: 0, period });
function one(A, op, seq, level, period, k, ts, msg) {
  assert.equal(A.events.length, 1, msg + ' (one event)');
  const e = A.events[0];
  assert.deepEqual([e.ev.op, e.ev.seq, e.ev.level, e.ev.reserved, e.ev.period, e.ev.k, e.ts], [op, seq, level, 0, period, k, ts], msg);
}

// ---------------------------------------------------------------- A. CameraSync state machine (ported tests)
test('wire layout: 8 B command, 12 B event, operation values', () => {
  assert.equal(S.commandBytes(Start(2, 10000)).length, 8);
  assert.equal(S.eventBytes({ seq: 1, op: OP.FRAME, level: 1, reserved: 0, period: 10000, k: 7 }).length, 12);
  assert.deepEqual([OP.STOP, OP.START, OP.FRAME], [0, 1, 2]);
});
test('default period publishes every real edge', () => {
  const m = new SyncSM(10);
  assert.equal(m.onImu(100).events.length, 0);
  assert.equal(m.onImu(109).events.length, 0);
  let A = m.onImu(110); assert.deepEqual([...A.gpio], [1]); one(A, OP.FRAME, 0, 1, 10, 1, 110, 'default FRAME');
  A = m.onImu(111); assert.deepEqual([...A.gpio], [0]); assert.equal(A.events.length, 0);
  one(m.onImu(120), OP.FRAME, 0, 1, 10, 2, 120, 'second edge');
});
test('late sample does not synthesize missed edges', () => {
  const m = new SyncSM(10); m.onImu(100);
  let A = m.onImu(135); assert.deepEqual([...A.gpio], [1]); one(A, OP.FRAME, 0, 1, 10, 1, 135, 'one real edge'); assert.equal(m.phase, 5);
  A = m.onImu(145); assert.deepEqual([...A.gpio], [0, 1]); one(A, OP.FRAME, 0, 1, 10, 2, 145, 'no burst'); assert.equal(m.phase, 5);
});
test('timestamp rollback rebases phase', () => {
  const m = new SyncSM(10); m.onImu(100); m.onImu(105);
  const A = m.onImu(90); assert.equal(A.gpio.length + A.events.length, 0); assert.equal(m.phase, 0);
  assert.equal(m.onImu(99).events.length, 0);
  one(m.onImu(100), OP.FRAME, 0, 1, 10, 1, 100, 'after one full period');
});
test('STOP ACK carries the last real edge sequence', () => {
  const m = new SyncSM(10); m.onImu(100); m.onImu(110); m.onImu(111); m.onImu(120);
  const q = m.onCommand(Stop(7)); assert.equal(q.gpio.length + q.events.length, 0); assert.ok(m.pendingReady);
  const A = m.onImu(121); assert.equal(m.state, 'STOPPED'); assert.ok(!m.pulse); assert.equal(A.gpio[A.gpio.length - 1], 0);
  one(A, OP.STOP, 7, 1, 0, 2, 121, 'STOP ACK');
  const s = m.onImu(1000); assert.equal(s.gpio.length + s.events.length, 0);
});
test('STOP preempts an edge due on the same sample', () => {
  const m = new SyncSM(10); m.onImu(100); m.onCommand(Stop(3));
  one(m.onImu(110), OP.STOP, 3, 1, 0, 0, 110, 'STOP wins'); assert.equal(m.k, 0);
});
test('START uses a fresh timestamp phase and sequence', () => {
  const m = new SyncSM(10); m.onCommand(Stop(1, 0)); m.onImu(100);
  m.onCommand(Start(2, 7, 0));
  let A = m.onImu(200); assert.equal(m.state, 'RUNNING'); assert.deepEqual([...A.gpio], [1]); one(A, OP.START, 2, 0, 7, 0, 200, 'START ACK');
  A = m.onImu(206); assert.equal(A.gpio.length + A.events.length, 0);
  A = m.onImu(207); assert.deepEqual([...A.gpio], [0]); one(A, OP.FRAME, 2, 0, 7, 1, 207, 'first post-START edge');
});
test('START resets the previous run sequence', () => {
  const m = new SyncSM(10); m.onImu(100); m.onImu(110); m.onImu(120); m.onCommand(Stop(8));
  one(m.onImu(121), OP.STOP, 8, 1, 0, 2, 121, 'pre-START STOP');
  m.onCommand(Start(9, 5)); one(m.onImu(200), OP.START, 9, 1, 5, 0, 200, 'START resets');
  one(m.onImu(205), OP.FRAME, 9, 1, 5, 1, 205, 'restart at one');
});
test('duplicate commands replay the original ACK only', () => {
  const m = new SyncSM(10), stop = Stop(1), changed = Object.assign(Stop(1, 0), { period: 123 });
  m.onCommand(stop); m.onCommand(changed); one(m.onImu(100), OP.STOP, 1, 1, 0, 0, 100, 'pending keeps original');
  let A = m.onCommand(changed); assert.equal(A.gpio.length, 0); one(A, OP.STOP, 1, 1, 0, 0, 100, 'replay');
  const start = Start(2, 10), cs = Object.assign(Start(2, 7, 0), { reserved: 1 });
  m.onCommand(start); m.onCommand(cs); one(m.onImu(200), OP.START, 2, 1, 10, 0, 200, 'pending START keeps original');
  one(m.onImu(210), OP.FRAME, 2, 1, 10, 1, 210, 'frame');
  A = m.onCommand(cs); assert.equal(A.gpio.length, 0); one(A, OP.START, 2, 1, 10, 0, 200, 'FRAME does not replace the ACK');
});
test('invalid commands and states are ignored', () => {
  const m = new SyncSM(10);
  m.onCommand(Object.assign(Stop(1), { op: 0xff })); assert.ok(!m.pendingReady);
  m.onCommand(Object.assign(Stop(1), { op: OP.FRAME })); assert.ok(!m.pendingReady);
  m.onCommand(Stop(1, 2)); m.onCommand(Stop(0)); m.onCommand(Object.assign(Stop(1), { reserved: 1 })); m.onCommand(Object.assign(Stop(1), { period: 1 })); m.onCommand(Start(1, 0));
  assert.ok(!m.pendingReady);
  m.onCommand(Start(2, 10)); assert.ok(!m.pendingReady, 'START invalid while RUNNING');
  m.onCommand(Stop(3)); m.onCommand(Stop(4)); one(m.onImu(100), OP.STOP, 3, 1, 0, 0, 100, 'first pending only');
});
test('a previous retry does not block the next command', () => {
  const m = new SyncSM(10), stop = Stop(1); m.onCommand(stop); m.onImu(100);
  one(m.onCommand(stop), OP.STOP, 1, 1, 0, 0, 100, 'replay'); m.onCommand(Start(2, 8)); one(m.onImu(200), OP.START, 2, 1, 8, 0, 200, 'next command');
});
test('a fresh STOP recovers after a host restart', () => {
  const m = new SyncSM(10); m.onCommand(Stop(40, 0)); one(m.onImu(100), OP.STOP, 40, 0, 0, 0, 100, 'first host');
  m.onCommand(Stop(1, 1)); assert.ok(m.pendingReady);
  const A = m.onImu(200); assert.equal(m.state, 'STOPPED'); assert.deepEqual([...A.gpio], [0]); one(A, OP.STOP, 1, 1, 0, 0, 200, 'fresh STOP');
  m.onCommand(Start(2, 10)); one(m.onImu(300), OP.START, 2, 1, 10, 0, 300, 'START after fresh STOP');
});

// ---------------------------------------------------------------- B. host core and packet
test('stride and gap tolerance (CameraFrameSyncCore)', () => {
  assert.equal(Core.gapTol(10000), 2500); assert.equal(Core.gapTol(4000), 1500);
  assert.equal(Core.stride(10000, 10000, 128), 1); assert.equal(Core.stride(20003, 10000, 128), 2);
  assert.equal(Core.stride(12600, 10000, 128), 0, 'residual 2600 > 2500');
  assert.equal(Core.stride(4000, 10000, 128), 0, 'rounds to 0');
});
test('nearest sample within 500 us, ties to the newer one, no interpolation', () => {
  const hist = [0, 1000, 2000, 3000, 4000].map(t => ({ t }));
  assert.equal(Core.nearest(hist, 2600, 500).t, 3000);
  assert.equal(Core.nearest(hist, 2500, 500).t, 3000, 'tie: newest first, strict <');
  assert.equal(Core.nearest(hist, 4400, 500).t, 4000);
  assert.equal(Core.nearest(hist, 5600, 500), null);
});
test('LibXR CRC8 / CRC32 and the 17-byte packet overhead', () => {
  // LibXR CRC32: reflected 0xEDB88320, init 0xFFFFFFFF, no final xor = bitwise NOT of the usual CRC-32
  const std = s => { let c = 0xffffffff; for (const ch of s) { c ^= ch.charCodeAt(0); for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; } return (~c) >>> 0; };
  assert.equal(S.crc32('123456789'), (~std('123456789')) >>> 0);
  assert.equal(std('123456789'), 0xCBF43926);
  const p = S.pack('camera_sync_result', 48213000, S.eventBytes({ seq: 2, op: OP.FRAME, level: 1, reserved: 0, period: 10000, k: 214 }));
  assert.equal(p.length, 29); assert.equal(p[0], 0x5A); assert.equal(p[1], 12); assert.equal(p[14], 1);
  assert.equal(p[15], S.crc8(p, 15)); assert.equal(p[28], S.crc8(p, 28));
  let ts = 0; for (let i = 0; i < 6; i++) ts += p[8 + i] * 2 ** (8 * i); assert.equal(ts, 48213000);
  assert.deepEqual(Array.from(p.slice(16, 28)), [2, 2, 1, 0, 0x10, 0x27, 0, 0, 214, 0, 0, 0]);
});

// ---------------------------------------------------------------- C. the bench end to end
function running(B) { B.restart(0, B.now); B.advance(B.now + 120000); return B; }
test('handshake: STOP -> settle 10 ms -> START, first edge one period after the ACK, k restarts at 1', () => {
  const B = S.makeBench(10000); B.advance(B.now + 30000);
  assert.ok(B.sm.k > 0, 'power-up default run triggers');
  B.restart(0, B.now); B.advance(B.now + 40000);
  const [stop, start] = B.cmds.slice(-2);
  assert.equal(stop.op, OP.STOP); assert.equal(start.op, OP.START);
  const lastEdge = B.exps.filter(x => x.seq === 0 && x.tCb <= stop.tApply).pop();
  assert.equal(stop.ack.k, lastEdge.k, 'STOP ACK carries the last real edge');
  assert.ok(!B.exps.some(x => x.seq === 0 && x.tCb > stop.tApply), 'no edge after STOP');
  assert.ok(start.tSend >= stop.ack.ts + S.SETTLE, 'START only after 10 ms of gyro time');
  assert.equal(start.ack.k, 0); assert.equal(start.ack.period, 10000);
  const k1 = B.exps.find(x => x.seq === start.seq && x.k === 1);
  assert.equal(k1.ts - start.ack.ts, 10000, 'first edge a full period after the ACK timestamp');
  assert.equal(B.host.st, 'RUNNING');
});
test('100 Hz: an edge on every 10th IMU sample, pulse one sample wide, SyncEvent carries that sample timestamp', () => {
  const B = running(S.makeBench(10000));
  const xs = B.exps.filter(x => x.seq === B.host.startSeq);
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i].n - xs[i - 1].n, 10);
  for (const x of xs) { assert.equal(x.ev.ts, S.tImu(x.n)); }
  const g = B.gpio.slice(-40); for (let i = 1; i < g.length; i++) if (g[i - 1][1] === 1) assert.ok(Math.abs(g[i][0] - g[i - 1][0] - 1000) < 20, 'pulse ~1 ms');
});
test('pairing: the IMU sample nearest to trigger + delay + E/2, within 500 us', () => {
  for (const E of [2000, 5000, 8000]) {
    const B = S.makeBench(10000); B.cam.E = E; running(B);
    const ps = B.pairs.slice(-5); assert.ok(ps.length >= 5);
    for (const p of ps) {
      const mid = p.ts + S.DELAY + E / 2; assert.equal(p.tMid, mid); assert.ok(Math.abs(p.d) <= 500);
      for (const m of [p.n - 1, p.n + 1]) assert.ok(Math.abs(S.tImu(m) - mid) >= Math.abs(S.tImu(p.n) - mid));
    }
  }
});
test('a lost image: SyncEvents keep counting, the host sees stride 2 and names the missing k', () => {
  const B = running(S.makeBench(10000));
  const e = B.peekEdges(3)[1]; B.cam.drop.add(e.m); B.advance(B.now + 40000);
  const lost = B.exps.find(x => x.n === e.m); assert.ok(lost.drop);
  const p = B.pairs.find(q => q.miss.includes(lost.k)); assert.ok(p, 'detected');
  assert.equal(p.stride, 2); assert.equal(p.k, lost.k + 1); assert.equal(B.drops, 1);
  assert.equal(B.evs.filter(v => v.op === OP.FRAME && v.seq === lost.seq).map(v => v.k).includes(lost.k), true, 'the MCU still published k');
});
test('20 Hz: START with 50000 us, an edge every 50 samples', () => {
  const B = S.makeBench(10000); B.restart(50000, B.now); B.advance(B.now + 400000);
  const xs = B.exps.filter(x => x.seq === B.host.startSeq); assert.ok(xs.length > 4);
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i].n - xs[i - 1].n, 50);
  assert.equal(B.host.period, 50000);
});

// ---------------------------------------------------------------- D. what the widget adds
test('previewPair equals the bench pairing for the same E, and moves with E', () => {
  for (const E of [200, 1000, 2500, 5000, 7300, 9000]) {
    const B = S.makeBench(10000); B.cam.E = E; running(B);
    for (const p of B.pairs.slice(-4)) {
      const q = S.previewPair(p.ts, E);
      assert.equal(q.tMid, p.tMid); assert.equal(q.n, p.n); assert.equal(q.d, p.d);
    }
  }
  const a = S.previewPair(S.tImu(48510), 1000), b = S.previewPair(S.tImu(48510), 9000);
  assert.ok(b.tMid - a.tMid === 4000 && b.n - a.n === 4, 'E 1 -> 9 ms moves the midpoint by 4 ms and the sample by 4');
  for (let E = 200; E <= 9000; E += 100) assert.ok(Math.abs(S.previewPair(S.tImu(48500), E).d) <= S.TOL);
});
test('pose is a pure function of the sample index and changes between samples', () => {
  assert.deepEqual(S.pose(48512), S.pose(48512));
  assert.notDeepEqual(S.pose(48512), S.pose(48513));
  assert.ok(Math.abs(S.pose(48512).yaw - S.pose(48513).yaw) < .2, 'one sample apart is a small step');
});
test('peekEdges predicts the edges the state machine then emits', () => {
  const B = running(S.makeBench(10000));
  const peek = B.peekEdges(4), n0 = B.exps.length;
  B.advance(B.now + 60000);
  const got = B.exps.slice(n0, n0 + 4).map(x => x.n);
  assert.deepEqual(peek.map(e => e.m), got);
});
