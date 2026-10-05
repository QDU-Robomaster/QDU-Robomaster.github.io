/* CameraSync / CameraFrameSync simulation core. Pure: no DOM, no timers; `node --test sim.test.mjs` runs it.
   Ported from the old showcase page (beat 4-4, Sim44); the mechanism is unchanged and follows the team's source:
   - MCU: CameraSync (CameraSyncStateMachine.hpp) runs inside the IMU topic callback. It advances a phase by the IMU
     timestamps; the first sample that reaches the trigger period (10000 us at 1 kHz = every 10th sample) drives the GPIO
     active and publishes SyncEvent{seq, FRAME, level, period, trigger_sequence} stamped with that sample's timestamp; the next
     IMU sample releases the pin (pulse = one sample period). STOP / START take effect at the next IMU sample and are ACKed
     with the same 12-byte SyncEvent; START restarts trigger_sequence at 1, first edge one full period after the ACK.
   - Transport: SharedTopic packet (16 B header: 0x5A, 24-bit length, topic-name CRC32, 48-bit us timestamp, version, CRC8;
     payload; tail CRC8); LibXR CRC8 = poly 0x8C reflected, init 0xFF; CRC32 = 0xEDB88320, init 0xFFFFFFFF, no final xor.
   - Host: CameraFrameSync: WAIT_STOP_ACK -> SETTLING (10 ms of gyro time) -> WAIT_START_ACK -> RUNNING. FRAME events go to a
     FIFO; the first image after START pairs with the first edge, later ones by stride = round(camera gap / period)
     (tolerance max(1500 us, period / 4)); older edges are skipped (the camera lost that image). The IMU sample used is the
     one nearest to trigger timestamp + offset_us within 500 us (offset = trigger-to-exposure delay + E / 2); no interpolation.
   The bench is event driven and deterministic: advance(t) runs every event up to t. */

// ============================================================================ wire types
export const OP = { STOP: 0, START: 1, FRAME: 2 } as const;
export const OPN = ['STOP_TRIGGER', 'START_TRIGGER', 'FRAME_TRIGGER'] as const;

export interface Cmd { op: number; level: number; seq: number; reserved: number; period: number }
export interface SyncEv { seq: number; op: number; level: number; reserved: number; period: number; k: number }
export interface Emitted { ev: SyncEv; ts: number; replay?: boolean }
export interface Act { gpio: number[]; events: Emitted[] }
const acts = (): Act => ({ gpio: [], events: [] });

// ============================================================================ MCU: CameraSyncDetail::StateMachine, line by line
// (uint64 timestamps as JS numbers, uint32 sequence wraps with >>> 0)
export class SyncSM {
  period: number; phase: number; lastTs: number; level: number; startSeq: number; k: number;
  phaseInit: boolean; pulse: boolean; pendingReady: boolean; pending: Cmd | null; state: string;
  last: { cmd: Cmd; ev: SyncEv; ts: number } | null;
  constructor(period: number) {
    this.period = period === 0 ? 1 : period; this.phase = 0; this.lastTs = 0; this.level = 1; this.startSeq = 0; this.k = 0;
    this.phaseInit = false; this.pulse = false; this.pendingReady = false; this.pending = null; this.state = 'RUNNING'; this.last = null;
  }
  static same(a: { op: number; seq: number }, b: { op: number; seq: number }): boolean { return a.op === b.op && a.seq === b.seq; }
  static valid(c: Cmd): boolean {
    if (c.level > 1 || c.seq === 0 || c.reserved !== 0) return false;
    if (c.op === OP.STOP) return c.period === 0;
    if (c.op === OP.START) return c.period !== 0;
    return false;
  }
  allowed(op: number): boolean { return op === OP.STOP ? true : op === OP.START ? this.state === 'STOPPED' : false; }
  onCommand(c: Cmd): Act {
    const A = acts();
    if (this.pendingReady && this.pending && SyncSM.same(this.pending, c)) return A;
    if (this.last && SyncSM.same(this.last.cmd, c)) { A.events.push({ ev: this.last.ev, ts: this.last.ts, replay: true }); return A; }
    if (!SyncSM.valid(c) || this.pendingReady || !this.allowed(c.op)) return A;
    this.pending = Object.assign({}, c); this.pendingReady = true; return A;
  }
  onImu(ts: number): Act {
    const A = acts();
    if (this.pulse) { this.pulse = false; A.gpio.push(this.level ? 0 : 1); }                 // FinishPulse
    if (this.pendingReady && this.pending) {
      const c = this.pending; this.pendingReady = false;
      if (c.op === OP.STOP) this.stop(c, ts, A); else if (c.op === OP.START) this.start(c, ts, A);
      return A;
    }
    if (this.state === 'STOPPED') return A;
    if (!this.phaseInit || ts < this.lastTs) { this.rebase(ts); return A; }
    const el = ts - this.lastTs; this.lastTs = ts;
    const until = this.period - this.phase;
    if (el < until) { this.phase += el; return A; }
    this.phase = (el - until) % this.period;
    A.gpio.push(this.level); this.pulse = true; this.k = (this.k + 1) >>> 0;                  // EmitFrameTrigger
    A.events.push({ ev: { seq: this.startSeq, op: OP.FRAME, level: this.level, reserved: 0, period: this.period, k: this.k }, ts });
    return A;
  }
  rebase(ts: number): void { this.phaseInit = true; this.lastTs = ts; this.phase = 0; }
  stop(c: Cmd, ts: number, A: Act): void {
    this.level = c.level; this.state = 'STOPPED'; this.phaseInit = false; this.phase = 0; this.pulse = false; A.gpio.push(this.level ? 0 : 1);
    const ev: SyncEv = { seq: c.seq, op: OP.STOP, level: this.level, reserved: 0, period: 0, k: this.k };
    A.events.push({ ev, ts }); this.last = { cmd: Object.assign({}, c), ev, ts };
  }
  start(c: Cmd, ts: number, A: Act): void {
    this.level = c.level; this.period = c.period; this.startSeq = c.seq; this.k = 0; this.state = 'RUNNING'; this.pulse = false; this.rebase(ts); A.gpio.push(this.level ? 0 : 1);
    const ev: SyncEv = { seq: c.seq, op: OP.START, level: this.level, reserved: 0, period: this.period, k: 0 };
    A.events.push({ ev, ts }); this.last = { cmd: Object.assign({}, c), ev, ts };
  }
}

// ============================================================================ host: CameraFrameSyncCore (gap tolerance, stride, nearest sample)
export const Core = {
  gapTol: (P: number): number => Math.max(1500, Math.floor(P / 4)),
  stride(gap: number, P: number, max: number): number {
    if (!P || !max) return 0;
    const s = Math.floor((gap + Math.floor(P / 2)) / P);
    if (s === 0 || s > max) return 0;
    return Math.abs(gap - P * s) <= Core.gapTol(P) ? s : 0;
  },
  // list: [{t}] oldest first; scanned newest first with the early break of FindBySensorTimestamp
  nearest<T extends { t: number }>(list: T[], target: number, tol: number): T | null {
    let best: T | null = null, err = Infinity;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i], e = Math.abs(s.t - target);
      if (e < err) { best = s; err = e; }
      if (s.t < target && target - s.t > tol) break;
    }
    return best && err <= tol ? best : null;
  },
};

// ============================================================================ LibXR CRC8 / CRC32 and the SharedTopic packet
const CRC8T = new Uint8Array(256), CRC32T = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let a = i; for (let j = 0; j < 8; j++) a = a & 1 ? (a >>> 1) ^ 0x8c : a >>> 1; CRC8T[i] = a;
  let b = i; for (let j = 0; j < 8; j++) b = b & 1 ? (b >>> 1) ^ 0xEDB88320 : b >>> 1; CRC32T[i] = b >>> 0;
}
export const crc8 = (u8: ArrayLike<number>, n: number): number => { let c = 0xff; for (let i = 0; i < n; i++) c = CRC8T[(c ^ u8[i]) & 0xff]; return c; };
export const crc32 = (str: string): number => { let c = 0xffffffff; for (let i = 0; i < str.length; i++) c = (CRC32T[(c ^ str.charCodeAt(i)) & 0xff] ^ (c >>> 8)) >>> 0; return c >>> 0; };
const u32le = (v: number): number[] => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
export const eventBytes = (e: SyncEv): number[] => [e.seq & 255, e.op, e.level, e.reserved || 0, ...u32le(e.period), ...u32le(e.k)];
export const commandBytes = (c: Cmd): number[] => [c.op, c.level, c.seq & 255, c.reserved || 0, ...u32le(c.period)];
export function pack(topic: string, ts: number, payload: number[]): Uint8Array {
  const n = payload.length, b = new Uint8Array(17 + n);
  b[0] = 0x5A; b[1] = n & 255; b[2] = (n >>> 8) & 255; b[3] = (n >>> 16) & 255;
  const c = crc32(topic); b[4] = c & 255; b[5] = (c >>> 8) & 255; b[6] = (c >>> 16) & 255; b[7] = (c >>> 24) & 255;
  let t = Math.round(ts); for (let i = 0; i < 6; i++) { b[8 + i] = t % 256; t = Math.floor(t / 256); }
  b[14] = 0x01; b[15] = crc8(b, 15); for (let i = 0; i < n; i++) b[16 + i] = payload[i]; b[16 + n] = crc8(b, 16 + n);
  return b;
}

// ============================================================================ bench: IMU, MCU, USB, camera, host
// IMU samples every 1000 us (MCU time base); the IMU callback runs ~80 us after the sample (SPI read); the camera starts
// exposing ~20 us after the edge; readout + USB3 ~5.1 ms after the exposure; SharedTopic over USB ~0.3 ms one way.
export const IMU_P = 1000, CB = 80, CAM_LAT = 20, DELAY = CB + CAM_LAT, READ = 5100, PROC = 40, SETTLE = 10000, N0 = 48000, TOL = 500;
const hsh = (a: number, b: number): number => {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16; return (h >>> 0) / 4294967296;
};
export const T_OFF = 317;
export const tImu = (m: number): number => m * IMU_P + T_OFF;                              // sensor timestamp (us, MCU clock)
export const cbOf = (m: number): number => CB + Math.round((hsh(m, 17) - .5) * 14);        // callback latency varies a little
const usb = (a: number, b: number): number => 280 + Math.round(hsh(a, b) * 50);
export const omega = (m: number): number[] => {
  const t = m / 1000;
  return [.021 * Math.sin(t * 2.1 + 1) + .008 * Math.sin(t * 7.3) + .004 * (hsh(m, 3) - .5),
    -.016 * Math.sin(t * 1.3 + .4) + .009 * Math.sin(t * 5.9 + 2) + .004 * (hsh(m, 4) - .5),
    .034 * Math.sin(t * .9 + 2.2) + .012 * Math.sin(t * 3.7) + .004 * (hsh(m, 5) - .5)];
};
// gimbal attitude of IMU sample m, degrees (what the host reads off the paired sample)
export const pose = (m: number): { yaw: number; pitch: number } => {
  const t = m / 1000;
  return {
    yaw: 14 * Math.sin(t * .9 + .4) + 3.2 * Math.sin(t * 3.1) + (hsh(m, 7) - .5) * .06,
    pitch: -4 + 5 * Math.sin(t * 1.3 + 2) + 1.1 * Math.sin(t * 4.7) + (hsh(m, 8) - .5) * .06,
  };
};

export interface HostEv extends SyncEv {
  ts: number; tPub: number; tArr: number; m: number; replay: boolean;
  x?: Exp; host?: string; hostT?: number; missed?: Pair; pair?: Pair;
}
export interface Exp {
  k: number; seq: number; n: number; ts: number; tCb: number; t0: number; E: number; t1: number; tImg: number; camTs: number;
  drop: boolean; ev: HostEv; period: number; pair?: Pair; arr?: number; released?: boolean;
}
export interface Pair {
  k: number; seq: number; n: number; ts: number; tMid: number; d: number; stride: number; miss: number[]; tPair: number;
  E: number; camTs: number; x: Exp; ev: HostEv; period: number;
}
export interface CmdRec extends Cmd { tSend: number; tArr: number; tMcu?: number; tApply?: number; applyM?: number; ack?: HostEv; tAck?: number }
export interface Miss { k: number; seq: number; ts: number; ev: HostEv; p: Pair }
export interface PLog { m: number; kind: 'edge' | 'stop' | 'start'; period: number }
type Queued =
  | { t: number; kind: 'ev'; ev: HostEv }
  | { t: number; kind: 'img'; x: Exp }
  | { t: number; kind: 'cmd'; c: CmdRec }
  | { t: number; kind: 'settled'; m: number };
export interface Host {
  st: string; seq: number; period: number; req: number; startSeq: number; trig: HostEv[]; imgs: Exp[]; matched: boolean;
  lastCam: number; lastK: number; recv: number; valid: boolean; cmd: CmdRec | null; settleAt: number; settleQ: boolean; settledT?: number;
}
export interface Bench {
  now: number; nNext: number; sm: SyncSM; gpio: Array<[number, number]>; evs: HostEv[]; cmds: CmdRec[]; exps: Exp[]; pairs: Pair[];
  miss: Miss[]; Q: Queued[]; plog: PLog[]; expByN: Map<number, Exp>;
  cam: { E: number; drop: Set<number>; dropNext: number };
  frames: number; drops: number; released: number; host: Host;
  imuAt(m: number): { m: number; t: number; w: number[] };
  restart(period?: number, t?: number): void;
  advance(t: number): void;
  peekEdges(count: number): Array<{ m: number; ts: number; tCb: number }>;
  lastSample(t: number): number;
  sampleAt(t: number): number;
  count(m: number): { c: number; P: number; stopped?: boolean; edge?: boolean };
}

export function makeBench(period?: number): Bench {
  const B = {
    now: tImu(N0) - 1, nNext: N0, sm: new SyncSM(period || 10000), gpio: [[tImu(N0) - 1, 0]], evs: [], cmds: [], exps: [], pairs: [], miss: [], Q: [], plog: [],
    expByN: new Map(), cam: { E: 5000, drop: new Set(), dropNext: 0 }, frames: 0, drops: 0, released: 0,
    host: { st: 'IDLE', seq: 0, period: period || 10000, req: period || 10000, startSeq: 0, trig: [], imgs: [], matched: false, lastCam: 0, lastK: 0, recv: 0, valid: false, cmd: null, settleAt: 0, settleQ: false },
  } as unknown as Bench;
  const push = (e: Queued): void => { let i = B.Q.length; while (i > 0 && B.Q[i - 1].t > e.t) i--; B.Q.splice(i, 0, e); };
  const camTs = (t0: number, k: number): number => 7300000 + t0 * (1 + 23e-6) + (hsh(k, 11) - .5) * 4;   // camera clock domain (own offset and drift)
  B.imuAt = m => ({ m, t: tImu(m), w: omega(m) });
  function publish(e: Emitted, t: number, m: number): void {
    const ev = Object.assign({ ts: e.ts, tPub: t, tArr: t + usb(m, e.ev.op * 7 + 2), m, replay: !!e.replay }, e.ev) as HostEv;
    B.evs.push(ev); push({ t: ev.tArr, kind: 'ev', ev });
    if (ev.op === OP.FRAME) {
      const E = B.cam.E, t0 = t + CAM_LAT; let drop = false;
      if (B.cam.drop.has(m)) { drop = true; B.cam.drop.delete(m); } else if (B.cam.dropNext > 0) { drop = true; B.cam.dropNext--; }
      const x: Exp = { k: ev.k, seq: ev.seq, n: m, ts: ev.ts, tCb: t, t0, E, t1: t0 + E, tImg: t0 + E + READ + Math.round((hsh(ev.k, 13) - .5) * 80), camTs: camTs(t0, ev.k), drop, ev, period: ev.period };
      ev.x = x; B.exps.push(x); B.expByN.set(m, x); if (!drop) push({ t: x.tImg, kind: 'img', x });
    } else if (!e.replay) {
      const c = B.cmds.find(q => q.op === ev.op && q.seq === ev.seq && q.tApply === undefined);
      if (c) { c.tApply = t; c.applyM = m; c.ack = ev; }
    }
  }
  function imu(m: number): void {
    const ts = tImu(m), t = ts + cbOf(m), A = B.sm.onImu(ts);
    for (const lv of A.gpio) if (B.gpio[B.gpio.length - 1][1] !== lv) B.gpio.push([t, lv]);
    for (const e of A.events) {
      publish(e, t, m);
      B.plog.push({ m, kind: e.ev.op === OP.FRAME ? 'edge' : e.ev.op === OP.STOP ? 'stop' : 'start', period: e.ev.op === OP.START ? e.ev.period : B.sm.period });
    }
    if (!B.plog.length) B.plog.push({ m, kind: 'start', period: B.sm.period });           // power-up: the first sample sets the phase
    const H = B.host; if (H.st === 'SETTLING' && !H.settleQ && ts >= H.settleAt) { H.settleQ = true; push({ t: t + usb(m, 5), kind: 'settled', m }); }
  }
  function send(op: number, t: number): void {
    const H = B.host; H.seq = (H.seq % 255) + 1;
    const c: CmdRec = { op, level: 1, seq: H.seq, reserved: 0, period: op === OP.START ? H.req : 0, tSend: t, tArr: t + usb(H.seq, 9) };
    B.cmds.push(c); H.cmd = c; push({ t: c.tArr, kind: 'cmd', c });
  }
  function resetMatch(): void { const H = B.host; H.trig.length = 0; H.imgs.length = 0; H.valid = false; H.recv = 0; H.matched = false; H.lastCam = 0; H.lastK = 0; }
  B.restart = function (p, t) { const H = B.host; if (p) H.req = p; H.st = 'WAIT_STOP_ACK'; resetMatch(); send(OP.STOP, t === undefined ? B.now : t); };
  function hostEv(ev: HostEv, t: number): void {
    const H = B.host; ev.hostT = t;
    if (ev.op === OP.STOP && H.st === 'WAIT_STOP_ACK' && H.cmd && H.cmd.op === OP.STOP && ev.seq === H.cmd.seq) {
      H.cmd.tAck = t; H.cmd = null; resetMatch(); H.st = 'SETTLING'; H.settleAt = ev.ts + SETTLE; H.settleQ = false; ev.host = 'ack'; return;
    }
    if (ev.op === OP.START && H.st === 'WAIT_START_ACK' && H.cmd && H.cmd.op === OP.START && ev.seq === H.cmd.seq) {
      H.cmd.tAck = t; H.startSeq = ev.seq; H.period = ev.period; H.cmd = null; resetMatch(); H.st = 'RUNNING'; ev.host = 'ack'; return;
    }
    if (ev.op !== OP.FRAME || H.st !== 'RUNNING') { ev.host = 'idle'; return; }
    const expect = H.valid ? H.recv + 1 : 1;
    if (ev.seq !== H.startSeq || ev.k !== expect || ev.period !== H.period) { ev.host = 'mismatch'; B.restart(0, t); return; }
    H.trig.push(ev); H.valid = true; H.recv = ev.k; ev.host = 'fifo';
  }
  function hostImg(x: Exp, t: number): void {
    const H = B.host; x.arr = t;
    if (H.st !== 'RUNNING') { x.released = true; B.released++; return; }
    H.imgs.push(x); match(t);
  }
  function match(t: number): void {
    const H = B.host;
    while (H.imgs.length && H.trig.length) {
      const img = H.imgs[0]; let target: number, stride = 1;
      if (!H.matched) target = H.trig[0].k;
      else { stride = Core.stride(Math.round(img.camTs - H.lastCam), H.period, 128); if (!stride) { B.restart(0, t); return; } target = H.lastK + stride; }
      let j = 0; while (j < H.trig.length && H.trig[j].k < target) j++;
      const tr = H.trig[j]; if (!tr) return;                                               // the target edge has not arrived yet: wait
      if (tr.k !== target) { B.restart(0, t); return; }
      const skipped = H.trig.splice(0, j);
      const tMid = tr.ts + DELAY + img.E / 2, mc = Math.round((tMid - T_OFF) / IMU_P), hist: Array<{ m: number; t: number }> = [];
      for (let m = mc - 2; m <= mc + 2; m++) if (tImu(m) + cbOf(m) + 300 <= t) hist.push({ m, t: tImu(m) });
      const s = Core.nearest(hist, tMid, TOL); if (!s) { B.restart(0, t); return; }
      const p: Pair = { k: tr.k, seq: tr.seq, n: s.m, ts: tr.ts, tMid, d: s.t - tMid, stride, miss: skipped.map(q => q.k), tPair: t + PROC, E: img.E, camTs: img.camTs, x: img, ev: tr, period: H.period };
      img.pair = p; tr.pair = p; B.pairs.push(p); B.frames++;
      for (const q of skipped) { q.missed = p; B.miss.push({ k: q.k, seq: q.seq, ts: q.ts, ev: q, p }); B.drops++; }
      H.matched = true; H.lastCam = img.camTs; H.lastK = tr.k; H.imgs.shift(); H.trig.shift();
    }
  }
  function run(e: Queued): void {
    const t = e.t;
    if (e.kind === 'ev') hostEv(e.ev, t);
    else if (e.kind === 'img') hostImg(e.x, t);
    else if (e.kind === 'cmd') { const A = B.sm.onCommand(e.c); e.c.tMcu = t; for (const r of A.events) publish(r, t, B.nNext); }
    else if (e.kind === 'settled') { const H = B.host; if (H.st === 'SETTLING') { H.st = 'WAIT_START_ACK'; H.settledT = t; send(OP.START, t); } }
  }
  B.advance = function (t) {
    for (;;) {
      const tI = tImu(B.nNext) + cbOf(B.nNext), tq = B.Q.length ? B.Q[0].t : Infinity, tn = Math.min(tI, tq);
      if (tn > t) break;
      B.now = tn; if (tI <= tq) imu(B.nNext++); else run(B.Q.shift() as Queued);
    }
    B.now = Math.max(B.now, t);
    if (B.exps.length > 3000) {
      B.exps.splice(0, B.exps.length - 1500); B.evs.splice(0, B.evs.length - 1500); B.pairs.splice(0, B.pairs.length - 1500);
      B.miss.splice(0, B.miss.length - 1500); B.cmds.splice(0, B.cmds.length - 1500); B.plog.splice(0, B.plog.length - 1500);
      B.gpio.splice(0, B.gpio.length - 3000);
      B.expByN = new Map(B.exps.map(x => [x.n, x]));
    }
  };
  // edges the MCU will emit next (for the director): walk the phase forward without touching the state machine
  B.peekEdges = function (count) {
    const S = B.sm, out: Array<{ m: number; ts: number; tCb: number }> = []; if (S.state !== 'RUNNING' || S.pendingReady) return out;
    let ph = S.phase, last = S.lastTs, init = S.phaseInit;
    for (let m = B.nNext; m < B.nNext + 400 && out.length < count; m++) {
      const ts = tImu(m);
      if (!init || ts < last) { init = true; last = ts; ph = 0; continue; }
      const el = ts - last; last = ts; const until = S.period - ph;
      if (el < until) { ph += el; continue; }
      ph = (el - until) % S.period; out.push({ m, ts, tCb: ts + cbOf(m) });
    }
    return out;
  };
  B.lastSample = t => { let m = Math.floor((t - CB - T_OFF) / IMU_P); while (tImu(m + 1) + cbOf(m + 1) <= t) m++; while (m > 0 && tImu(m) + cbOf(m) > t) m--; return m; };
  B.sampleAt = t => Math.round((t - T_OFF) / IMU_P);
  // CameraSync's phase in samples at sample m: 0 while stopped, the period count at an edge, else samples since the last edge / START
  B.count = m => {
    let lo = 0, hi = B.plog.length - 1, e: PLog | null = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (B.plog[mid].m <= m) { e = B.plog[mid]; lo = mid + 1; } else hi = mid - 1; }
    if (!e) return { c: 0, P: B.sm.period / IMU_P };
    const P = e.period / IMU_P; if (e.kind === 'stop') return { c: 0, P, stopped: true };
    if (e.m === m && e.kind === 'edge') return { c: P, P, edge: true };
    return { c: (m - e.m) % P, P };
  };
  return B;
}

// ============================================================================ preview: what the host would pick for a frame exposed with E
// Same rule as the bench's pairing (midpoint = trigger timestamp + DELAY + E / 2, nearest sample within TOL), without waiting for
// the image: the slider shows it before the next frame exists.
export function previewPair(ts: number, E: number): { tMid: number; n: number | null; t: number; d: number } {
  const tMid = ts + DELAY + E / 2, mc = Math.round((tMid - T_OFF) / IMU_P), hist: Array<{ m: number; t: number }> = [];
  for (let m = mc - 2; m <= mc + 2; m++) hist.push({ m, t: tImu(m) });
  const s = Core.nearest(hist, tMid, TOL);
  return s ? { tMid, n: s.m, t: s.t, d: s.t - tMid } : { tMid, n: null, t: NaN, d: NaN };
}

export const Sim44 = { OP, OPN, SyncSM, Core, crc8, crc32, pack, eventBytes, commandBytes, makeBench, tImu, IMU_P, CB, CAM_LAT, DELAY, READ, PROC, SETTLE, TOL };
