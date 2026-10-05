/* View model of the CameraSync widget: owns the bench, the view time and the three interactions. Pure (no DOM), tested in
   show.test.mjs. The widget calls tick(dt) once per animation frame and reads the state to draw.

   Time: the bench runs in MCU microseconds. The view time `tau` follows it at a fixed slow-motion ratio (sim seconds per
   wall second); everything the lanes draw is clipped to tau. While something is pending (a lost frame being recognised, a
   100/20 Hz handshake) the ratio goes up, so a click is answered in a couple of seconds.
   Modes: roll = lanes scroll with the view time; tune = time held on the latest frame while the E slider is dragged, the lanes
   preview that frame with the new E; hold = the static frame of reduced motion (time does not run, interactions jump). */
import { DELAY, READ, SETTLE, TOL, makeBench, previewPair, pose } from './sim.ts';
import type { Bench, Pair } from './sim.ts';

export type Rate = 10000 | 50000;
export type Mode = 'roll' | 'tune' | 'hold';
export const E_MIN = 200, E_MAX = 9000, E_DEF = 5000, E_STEP = 100;
export const AUTO_E = [5000, 2000, 8000];       // while nobody touches anything, E steps through these every few frames
export const PRE = 2500, POST = 17500;          // anchored window around one trigger: [ts - PRE, ts + POST] (us)
const ROLL_NOW = 0.86;                          // where "now" sits in the rolling window

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

export const rollWidth = (P: number): number => clamp(3.4 * P, 34000, 66000);
export const normalRatio = (P: number): number => (P <= 10000 ? 1 / 180 : 1 / 70);           // sim s per wall s
export const busyRatio = (P: number): number => (P + 45000) / 2.5e6;

export interface Notice { ks: number[]; by: number; stride: number; until: number }
export interface Tune { E: number; ts: number; k: number }
export interface FilmCell { key: string; k: number; seq: number; n: number; E: number; tMid: number; gap: boolean; by: number }

export class Show {
  B: Bench;
  tau: number;
  wall = 0;
  ratio: number;
  rate: Rate = 10000;
  queued: Rate | 0 = 0;
  reduced: boolean;
  mode: Mode = 'roll';
  tune: Tune | null = null;
  tuneUntil: number | null = null;
  tuneSeen = 0;                                   // wall time of the last slider input
  focus: Pair | null = null;
  focusGap: number[] = [];
  notice: Notice | null = null;
  dropWant = 0; dropBase = 0; dropAt = 0;
  blend = 0;
  wRoll: number;
  anchor: [number, number] = [0, 1];
  E = E_DEF;
  auto: boolean;                                  // idle demo: E cycles by itself until the first interaction
  private autoI = 0; private autoSeen = 0;

  constructor(opts: { reduced?: boolean; auto?: boolean } = {}) {
    this.B = makeBench(10000);
    this.B.restart(0, this.B.now);
    this.B.advance(this.B.now + 130000);            // handshake and the first frames happen before the first paint
    this.tau = this.B.now;
    this.reduced = !!opts.reduced;
    this.auto = opts.auto !== false && !this.reduced;
    this.autoSeen = this.B.frames;
    this.wRoll = rollWidth(10000);
    this.ratio = normalRatio(10000);
    if (this.reduced) this.holdAt(null);
  }

  // ------------------------------------------------------------------ queries
  get period(): number { return this.B.host.req; }
  get hz(): number { return Math.round(1e6 / this.B.host.req); }
  get running(): boolean { return this.B.host.st === 'RUNNING'; }
  get known(): number { return Math.min(this.tau, this.B.now); }
  get busy(): boolean {
    const B = this.B, H = B.host;
    return H.st !== 'RUNNING' || (H.st === 'RUNNING' && !H.matched) || B.cam.dropNext > 0 || this.dropWant > 0 || this.queued !== 0;
  }
  /** newest paired frame whose pairing has happened by the view time */
  latestPair(): Pair | null {
    const P = this.B.pairs;
    for (let i = P.length - 1; i >= 0; i--) if (P[i].tPair <= this.tau) return P[i];
    return null;
  }
  /** the frame the readout and the highlight talk about */
  currentPair(): Pair | null { return this.mode === 'hold' ? this.focus : this.latestPair(); }
  /** the slow-motion ratio the clock is heading for (not the eased value, so the text does not flicker) */
  slowLabel(): string { return this.busy ? '快进 ×1/' + Math.round(1 / busyRatio(this.period)) : '慢放 ×1/' + Math.round(1 / normalRatio(this.rate)); }
  window(): [number, number] {
    const W = this.wRoll, r0 = this.tau - ROLL_NOW * W, r1 = r0 + W;
    if (this.blend <= 0) return [r0, r1];
    const b = smooth(this.blend), a = this.anchor;
    const c = lerp((r0 + r1) / 2, (a[0] + a[1]) / 2, b), w = Math.exp(lerp(Math.log(W), Math.log(a[1] - a[0]), b));
    return [c - w / 2, c + w / 2];
  }
  /** preview of the held frame with the slider's E (tune mode) */
  tunePreview(): null | { ts: number; t0: number; E: number; tMid: number; n: number | null; t: number; d: number; tImg: number } {
    if (!this.tune) return null;
    const { ts, E } = this.tune, q = previewPair(ts, E);
    return { ts, t0: ts + DELAY, E, tMid: q.tMid, n: q.n, t: q.t, d: q.d, tImg: ts + DELAY + E + READ };
  }

  // ------------------------------------------------------------------ time
  tick(dtIn: number): void {
    const dt = clamp(dtIn, 0, 0.1);
    this.wall += dt;
    if (this.reduced) return;
    if (this.mode === 'tune' && this.tuneUntil === null && this.wall - this.tuneSeen > 5) this.tuneUntil = this.wall;      // a lost pointer-up must not freeze time
    if (this.mode === 'tune' && this.tuneUntil !== null && this.wall >= this.tuneUntil) this.endTune();
    const B = this.B;
    if (this.mode === 'roll') {
      const target = this.busy ? busyRatio(this.period) : normalRatio(this.rate);
      this.ratio += (target - this.ratio) * (1 - Math.exp(-dt * 5));
      this.tau += this.ratio * dt * 1e6;
      B.advance(this.tau);
      this.afterAdvance();
    }
    const bt = this.mode === 'tune' ? 1 : 0;
    this.blend += clamp(bt - this.blend, -dt / 0.25, dt / 0.25);
    const wT = rollWidth(this.rate);
    this.wRoll = Math.exp(lerp(Math.log(this.wRoll), Math.log(wT), 1 - Math.exp(-dt * 6)));
    if (this.notice && this.wall > this.notice.until) this.notice = null;
  }
  private afterAdvance(): void {
    const B = this.B;
    if (this.auto && this.mode === 'roll' && B.host.st === 'RUNNING' && B.host.matched && B.frames - this.autoSeen >= 4) {
      this.autoSeen = B.frames; this.autoI = (this.autoI + 1) % AUTO_E.length; this.E = AUTO_E[this.autoI]; B.cam.E = this.E;
    }
    if (this.queued && B.host.st === 'RUNNING') {
      const q = this.queued; this.queued = 0;
      if (q !== B.host.period) B.restart(q, B.now);
    }
    if (this.dropWant > 0) {
      if (B.drops - this.dropBase >= this.dropWant) this.noteGap(this.wall + 7);
      else if (B.now - this.dropAt > 4 * this.period + 80000) { this.dropWant = 0; B.cam.dropNext = 0; }
    }
  }
  private noteGap(until: number): void {
    const m = this.B.miss[this.B.miss.length - 1];
    this.dropWant = 0;
    if (!m) return;
    const p = m.p;
    this.notice = { ks: p.miss.slice(), by: p.k, stride: p.stride, until };
  }
  private advanceUntil(pred: () => boolean, maxUs: number): boolean {
    const B = this.B, end = B.now + maxUs;
    while (B.now < end) { B.advance(B.now + 500); if (pred()) return true; }
    return pred();
  }

  // ------------------------------------------------------------------ hold (reduced motion): one frame, interactions jump
  /** hold on frame p (default: the newest pair); gap = the k that were lost just before it */
  private holdAt(p: Pair | null, gap: number[] = []): void {
    const q = p || this.B.pairs[this.B.pairs.length - 1] || null;
    if (!q) { this.mode = 'roll'; return; }
    this.mode = 'hold'; this.focus = q; this.focusGap = gap; this.tune = null; this.tuneUntil = null; this.blend = 1;
    const first = gap.length ? q.ts - (q.stride - 1) * q.period : q.ts;      // earliest lost frame, if any
    this.anchor = [first - PRE, q.ts + POST];
    this.tau = Math.max(q.tPair + 200, Math.min(this.B.now, q.ts + POST));
  }
  setReduced(r: boolean): void {
    if (r === this.reduced) return;
    this.reduced = r;
    if (r) { this.auto = false; this.endTuneNow(); this.holdAt(null); this.notice = null; }
    else { this.mode = 'roll'; this.focus = null; this.blend = 0; this.tau = this.B.now; this.wRoll = rollWidth(this.rate); }
  }

  // ------------------------------------------------------------------ interaction 1: exposure E
  setE(us: number): void {
    const E = clamp(Math.round(us / E_STEP) * E_STEP, E_MIN, E_MAX);
    this.E = E; this.B.cam.E = E; this.auto = false;
    this.notice = null;
    if (!this.tune) {
      const a = this.mode === 'hold' ? this.focus : (this.latestPair() || null);
      const ex = this.B.exps.length ? this.B.exps[this.B.exps.length - 1] : null;
      const ts = a ? a.ts : ex ? ex.ts : 0, k = a ? a.k : ex ? ex.k : 0;
      this.tune = { E, ts, k };
      this.mode = 'tune'; this.anchor = [ts - PRE, ts + POST];
      if (this.reduced) this.blend = 1;
    }
    this.tune.E = E; this.tuneUntil = null; this.tuneSeen = this.wall;
  }
  /** the slider was let go: keep the preview a moment (rolling), or play forward to a frame exposed with the new E (reduced) */
  releaseE(): void {
    if (!this.tune) return;
    if (this.reduced) { this.endTuneNow(); this.B.advance(this.B.now + 4 * this.period + 20000); this.holdAt(null); return; }
    this.tuneUntil = this.wall + 0.9;
  }
  private endTune(): void { this.mode = 'roll'; this.tune = null; this.tuneUntil = null; }
  private endTuneNow(): void { this.tune = null; this.tuneUntil = null; if (this.mode === 'tune') this.mode = this.reduced ? 'hold' : 'roll'; }

  // ------------------------------------------------------------------ interaction 2: the camera loses a frame
  dropNext(): void {
    const B = this.B;
    this.auto = false;
    this.endTuneNow();
    B.cam.dropNext++;
    if (this.dropWant === 0) { this.dropBase = B.drops; this.dropAt = B.now; }
    this.dropWant++; this.notice = null;
    if (this.reduced) {
      const want = this.dropBase + this.dropWant;
      this.advanceUntil(() => B.drops >= want, 6 * this.period + 60000);
      const m = B.miss[B.miss.length - 1];
      this.dropWant = 0; B.cam.dropNext = 0;
      if (m && B.drops >= want) {
        this.holdAt(m.p, m.p.miss);
        this.notice = { ks: m.p.miss.slice(), by: m.p.k, stride: m.p.stride, until: Infinity };
      }
    }
  }

  // ------------------------------------------------------------------ interaction 3: 100 Hz | 20 Hz
  setRate(P: Rate): void {
    const B = this.B;
    this.rate = P; this.auto = false; this.endTuneNow();
    if (this.reduced) {
      if (B.host.st === 'RUNNING' && B.host.period === P) return;
      B.restart(P, B.now);
      this.advanceUntil(() => B.host.st === 'RUNNING' && B.host.matched, 400000);
      B.advance(B.now + 4 * P + 20000);
      this.notice = null; this.holdAt(null);
      return;
    }
    this.mode = 'roll'; this.notice = null;
    if (B.host.st !== 'RUNNING') { this.queued = P; return; }
    if (P === B.host.period && !this.queued) return;
    this.queued = 0;
    if (P !== B.host.period) B.restart(P, B.now);
  }
}

// ============================================================================ film strip
/** the newest paired frames published by view time T (newest last), with a gap cell for every image the host found missing */
export function filmItems(B: Bench, T: number, limit: number): FilmCell[] {
  const list: FilmCell[] = [];
  for (let i = B.pairs.length - 1; i >= 0 && list.length < limit; i--) {
    const p = B.pairs[i]; if (p.tPair > T) continue;
    list.unshift({ key: p.seq + ':' + p.k, k: p.k, seq: p.seq, n: p.n, E: p.E, tMid: p.tMid, gap: false, by: p.k });
    for (let j = p.miss.length - 1; j >= 0 && list.length < limit; j--)
      list.unshift({ key: p.seq + ':' + p.miss[j] + 'm', k: p.miss[j], seq: p.seq, n: 0, E: 0, tMid: 0, gap: true, by: p.k });
  }
  return list;
}

// ============================================================================ readout
export const fmtMs = (us: number, d = 1): string => (us / 1000).toFixed(d);
const sgn = (v: number, d = 2): string => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);

export interface Readout { head: string; body: string; kind: 'pair' | 'tune' | 'gap' | 'sync' }

export function readout(S: Show): Readout {
  const B = S.B, H = B.host, Pms = fmtMs(S.rate, 0);
  if (S.mode === 'tune' && S.tune) {
    const q = S.tunePreview()!;
    return {
      kind: 'tune',
      head: `E ${fmtMs(q.E)} ms`,
      body: `中点在触发后 ${fmtMs(DELAY + q.E / 2, 2)} ms，最近的采样是 IMU #${q.n ?? '无'}，差 ${fmtMs(Math.abs(q.d), 2)} ms。SyncEvent 的时刻不变，图像约在触发后 ${fmtMs(DELAY + q.E + READ)} ms 到。`,
    };
  }
  if (H.st !== 'RUNNING') {
    if (H.st === 'WAIT_STOP_ACK') return { kind: 'sync', head: '发 STOP', body: `上位机先让 C 板停触发，等 STOP 的 ACK。随后改成 ${Pms} ms 一次。` };
    if (H.st === 'SETTLING') return { kind: 'sync', head: `稳定 ${fmtMs(SETTLE, 0)} ms`, body: `STOP 的 ACK 到了，再等 ${fmtMs(SETTLE, 0)} ms（按陀螺仪时间算）才发 START。` };
    return { kind: 'sync', head: `发 START，周期 ${Pms} ms`, body: '下一次 IMU 采样生效并回 ACK，第一个触发在 ACK 之后一个周期。' };
  }
  if (S.notice) {
    const ks = S.notice.ks.join('、'), n = S.notice.stride;
    return {
      kind: 'gap',
      head: `帧 ${ks} 缺图`,
      body: `帧 ${S.notice.by} 的图到了，和上一张图相隔 ${n} 个周期。按 trigger_sequence 数，帧 ${ks} 的 SyncEvent 到了、图没到，缺的就是它。`,
    };
  }
  if (S.dropWant > 0 || S.B.cam.dropNext > 0)
    return { kind: 'gap', head: '相机丢一帧', body: '下一次触发照常曝光，照常发 SyncEvent，只是图像不送出。上位机要等再下一张图到了，才看出少了一张。' };
  const p = S.currentPair();
  if (!p || !H.matched) return { kind: 'sync', head: `START 已确认，周期 ${fmtMs(H.period, 0)} ms`, body: '第一个触发在 ACK 之后一个周期；帧号从 1 重新数，第一张图到了才有配对。' };
  const ps = pose(p.n);
  return {
    kind: 'pair',
    head: `帧 ${p.k} 配 IMU #${p.n}`,
    body: `E ${fmtMs(p.E)} ms，中点 = 触发时间戳 + ${fmtMs(DELAY, 1)} ms + E/2 = ${sgn((DELAY + p.E / 2) / 1000, 2)} ms，取最近的一次采样，差 ${fmtMs(Math.abs(p.d), 2)} ms（限 ±${fmtMs(TOL)} ms，不插值）。姿态 yaw ${sgn(ps.yaw)}° pitch ${sgn(ps.pitch)}°。`,
  };
}
