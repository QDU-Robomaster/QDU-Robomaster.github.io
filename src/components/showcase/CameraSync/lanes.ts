/* The four lanes on one time axis, drawn on a 2D canvas: IMU samples, trigger line, exposure bar, host (SyncEvent, image, pairing).
   Reads the Show state; clips everything to the view time (nothing is drawn that has not happened yet). Colours come from the
   page's tokens (see readColors), so both themes work without any literal colour here. */
import { OP, SETTLE, TOL, tImu } from './sim.ts';
import type { Exp, HostEv, Pair } from './sim.ts';
import type { Show } from './show.ts';
import type { SvgCtx } from './svgctx.ts';

export interface Colors {
  ink: string; muted: string; line: string; lineStrong: string; paper: string; raised: string; sunken: string; onInk: string;
  ch0: string; ch1: string; ch2: string; ch3: string; hot: string; mono: string; sans: string;
}
export interface Layout { W: number; narrow: boolean }

const LANES = { imu: 42, trg: 32, exp: 34, host: 58, axis: 18, gap: 2 } as const;
export const CANVAS_H = LANES.imu + LANES.trg + LANES.exp + LANES.host + LANES.axis + LANES.gap * 3;
const laneY = () => {
  const imu = 0, trg = imu + LANES.imu + LANES.gap, exp = trg + LANES.trg + LANES.gap, host = exp + LANES.exp + LANES.gap, axis = host + LANES.host + LANES.gap;
  return { imu, trg, exp, host, axis };
};

/** read the tokens the drawing needs from the element (re-read when the theme changes) */
export function readColors(): Colors {
  // CSS values, resolved by the browser inside the SVG: a theme switch needs no redraw
  const v = (n: string): string => `var(${n})`;
  return {
    ink: v('--ink'), muted: v('--ink-muted'), line: v('--line'), lineStrong: v('--line-strong'), paper: v('--paper'),
    raised: v('--paper-raised'), sunken: v('--paper-sunken'), onInk: v('--on-ink'),
    ch0: v('--ch0'), ch1: v('--ch1'), ch2: v('--ch2'), ch3: v('--ch3'),
    hot: v('--ch2'),                                            // the pairing: data channel 2, so it stays apart from the cyan exposure and the team teal
    mono: 'var(--font-mono)', sans: 'var(--font-sans)',
  };
}

const nice = (us: number): number => { const e = Math.pow(10, Math.floor(Math.log10(us))), m = us / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

export function drawLanes(g: SvgCtx, S: Show, C: Colors, L: Layout): void {
  const { W, narrow } = L, B = S.B, Y = laneY();
  const gx = narrow ? 50 : 96, pr = 8, pw = W - gx - pr;
  const [w0, w1] = S.window(), span = w1 - w0, X = (t: number): number => gx + (t - w0) / span * pw;
  const pxMs = pw / span * 1000, known = S.known, tau = S.tau;
  const tune = S.tune ? S.tunePreview() : null, mode = S.mode;
  const cur = mode === 'tune' ? null : S.currentPair();
  const curX = cur ? cur.x : null;
  const F12 = '12px ' + C.sans, F12B = '700 12px ' + C.sans, M12 = '12px ' + C.mono, M12B = '700 12px ' + C.mono;

  g.clearRect(0, 0, W, CANVAS_H);
  const text = (s: string, x: number, y: number, font: string, color: string, align: 'left' | 'center' | 'right' = 'left'): void => {
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  };
  const diamond = (x: number, y: number, r: number, color: string, fill: boolean, dash = false): void => {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
    if (fill) { g.fillStyle = color; g.fill(); } else { g.strokeStyle = color; g.lineWidth = 1.5; g.setLineDash(dash ? [2, 2] : []); g.stroke(); g.setLineDash([]); }
  };
  const square = (x: number, y: number, r: number, color: string, fill: boolean, dash = false): void => {
    if (fill) { g.fillStyle = color; g.fillRect(x - r, y - r, 2 * r, 2 * r); } else { g.strokeStyle = color; g.lineWidth = 1.5; g.setLineDash(dash ? [2, 2] : []); g.strokeRect(x - r + .5, y - r + .5, 2 * r - 1, 2 * r - 1); g.setLineDash([]); }
  };
  const isCur = (q: Exp): boolean => !!curX && curX === q;
  const isTune = (q: Exp): boolean => !!tune && q.ts === tune.ts;

  // ---- lane names and backgrounds
  const names: Array<[string, number, number, string]> = [
    [narrow ? 'IMU' : 'IMU 1 kHz', Y.imu, LANES.imu, C.ch0], [narrow ? '触发' : '触发线', Y.trg, LANES.trg, C.ink],
    [narrow ? '曝光' : '曝光 E', Y.exp, LANES.exp, C.ch1], ['上位机', Y.host, LANES.host, C.ink],
  ];
  const R1 = Y.host + 21, R2 = Y.host + 45;                                                  // host rows: SyncEvent / image
  for (const [n, y, h, col] of names) {
    g.fillStyle = C.sunken; g.fillRect(gx, y, pw, h);
    g.fillStyle = col; g.fillRect(0, y + h / 2 - 4, 4, 8);
    if (y === Y.host) {
      text(n, 9, narrow ? R1 + 4 : Y.host + 18, F12B, C.ink);
      text(narrow ? '图像' : 'SyncEvent', 9, narrow ? R2 + 4 : R1 + 12, F12, C.muted);
      if (!narrow) text('图像', 9, R2 + 4, F12, C.muted);
    } else text(n, 9, y + h / 2 + 4, F12B, C.ink);
  }
  g.save(); g.beginPath(); g.rect(gx, 0, pw, Y.axis + LANES.axis); g.clip();

  // ---- grid and axis, origin = the newest trigger (or the frame the view is about)
  const org = mode === 'tune' && S.tune ? S.tune.ts : mode === 'hold' && S.focus ? S.focus.ts : (() => { for (let i = B.exps.length - 1; i >= 0; i--) if (B.exps[i].t0 <= known) return B.exps[i].ts; return tau; })();
  const div = nice(span / 10);
  g.strokeStyle = C.line; g.lineWidth = 1;
  const j0 = Math.ceil((w0 - org) / div), j1 = Math.floor((w1 - org) / div);
  for (let j = j0; j <= j1; j++) {
    const x = Math.round(X(org + j * div)) + .5;
    g.globalAlpha = .9; g.beginPath(); g.moveTo(x, Y.imu); g.lineTo(x, Y.axis + 4); g.stroke(); g.globalAlpha = 1;
    const ms = j * div / 1000;
    text(ms === 0 ? '0' : (ms > 0 ? '+' : '−') + Math.abs(ms).toFixed(div < 1000 ? 1 : 0), x, Y.axis + 14, M12, ms === 0 ? C.ink : C.muted, 'center');
  }

  // ---- lane 1: IMU samples
  const tickTop = Y.imu + 16, tickBot = Y.imu + LANES.imu - 13;
  const mA = Math.max(B.sampleAt(w0) - 1, 0), mB = Math.min(B.sampleAt(w1) + 1, B.sampleAt(known));
  const pxTick = pxMs;                                                                       // 1 sample = 1 ms
  const step = [5, 10, 20, 50].find(s => s * pxTick >= 46) || 100;
  const tuneN = tune && tune.n !== null ? tune.n : -1, curN = cur ? cur.n : -1;
  const edgeN = (m: number): boolean => B.expByN.has(m);
  // tolerance window around the midpoint of the pair in view
  const tolMid = tune ? tune.tMid : cur && cur.tPair <= tau ? cur.tMid : null;
  if (tolMid !== null) {
    const a = X(tolMid - TOL), b = X(tolMid + TOL);
    g.fillStyle = C.hot; g.globalAlpha = .16; g.fillRect(a, Y.imu, b - a, LANES.imu); g.globalAlpha = .8;
    g.strokeStyle = C.hot; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(a + .5, Y.imu); g.lineTo(a + .5, Y.imu + LANES.imu); g.moveTo(b - .5, Y.imu); g.lineTo(b - .5, Y.imu + LANES.imu); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }
  g.font = M12; const lw = g.measureText('48000').width;
  const hotXs = [curN, tuneN].filter(m => m >= 0).map(m => X(tImu(m)));
  for (let m = mA; m <= mB; m++) {
    const t = tImu(m); if (t > known) continue;
    const x = Math.round(X(t)) + .5, hot = m === curN || m === tuneN, edge = edgeN(m);
    if (x < gx - 2 || x > gx + pw + 2) continue;
    g.strokeStyle = hot ? C.hot : C.ch0; g.lineWidth = hot ? 3 : edge ? 2 : 1;
    g.beginPath(); g.moveTo(x, edge || hot ? tickTop - 4 : tickTop); g.lineTo(x, tickBot); g.stroke();
    if (hot) text('#' + m, x, Y.imu + 11, M12B, C.ink, 'center');
    else if (m % step === 0 && !hotXs.some(h => Math.abs(h - x) < 50) && x - lw / 2 > gx && x + lw / 2 < gx + pw) text(String(m), x, Y.imu + 11, M12, C.muted, 'center');
    const c = B.count(m);
    if (c.c > 0 && (pxTick >= 22 || c.edge || c.c % 10 === 0 && pxTick >= 12)) text(String(c.c), x, Y.imu + LANES.imu - 3, c.edge ? M12B : M12, c.edge ? C.ink : C.muted, 'center');
  }

  // ---- lane 2: trigger line level (GPIO), straight from the recorded writes
  const yLow = Y.trg + LANES.trg - 8, yHigh = Y.trg + 8, gp = B.gpio;
  g.strokeStyle = C.ink; g.lineWidth = 2; g.lineJoin = 'miter'; g.beginPath();
  let lvl = 0, started = false, lo = 0, hi = gp.length - 1, i0 = 0;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (gp[mid][0] < w0) { i0 = mid + 1; lo = mid + 1; } else hi = mid - 1; }   // first write inside the window
  if (i0 > 0) lvl = gp[i0 - 1][1];
  for (let i = i0; i < gp.length; i++) {
    const [t, lv] = gp[i]; if (t > known) break;
    if (!started) { g.moveTo(gx - 2, lvl ? yHigh : yLow); started = true; }
    const x = X(t); g.lineTo(x, lvl ? yHigh : yLow); g.lineTo(x, lv ? yHigh : yLow); lvl = lv;
  }
  if (!started) g.moveTo(gx - 2, lvl ? yHigh : yLow);
  g.lineTo(X(known), lvl ? yHigh : yLow); g.stroke();
  for (let i = B.exps.length - 1; i >= 0; i--) {
    const q = B.exps[i]; if (q.tCb < w0 - 3000) break; if (q.tCb > known) continue;
    const x = X(q.tCb) + pxMs + 5;
    if (x > gx && x < gx + pw - 20) text('k' + q.k, x, Y.trg + LANES.trg / 2 + 4, isCur(q) || isTune(q) ? M12B : M12, isCur(q) || isTune(q) ? C.ink : C.muted);
  }
  if (B.sm.state === 'STOPPED') text('STOP：不触发', Math.min(X(known), gx + pw) - 6, Y.trg + LANES.trg / 2 + 4, M12, C.muted, 'right');

  // ---- lane 3: exposure bars (from the edge, width E) and midpoints
  const ey0 = Y.exp + 8, ey1 = Y.exp + LANES.exp - 8, bars: Exp[] = [];
  for (let i = B.exps.length - 1; i >= 0; i--) { const q = B.exps[i]; if (q.t1 < w0 - 12000) break; if (q.t0 <= known && q.t0 <= w1) bars.push(q); }
  const labelW = (s: string): number => { g.font = M12; return g.measureText(s).width; };
  for (const q of bars) {
    if (isTune(q)) continue;
    const a = X(q.t0), b = X(Math.min(q.t1, known)), hot = isCur(q), col = hot ? C.hot : C.ch1;
    g.fillStyle = col; g.globalAlpha = hot ? .28 : .16; g.fillRect(a, ey0, Math.max(1, b - a), ey1 - ey0); g.globalAlpha = 1;
    g.strokeStyle = col; g.lineWidth = hot ? 1.5 : 1; g.strokeRect(a + .5, ey0 + .5, Math.max(1, b - a - 1), ey1 - ey0 - 1);
    const done = known >= q.t0 + q.E / 2;
    if (done) { const mx = Math.round(X(q.t0 + q.E / 2)) + .5; g.strokeStyle = hot ? C.hot : C.ink; g.lineWidth = hot ? 2 : 1.5; g.beginPath(); g.moveTo(mx, ey0 - 3); g.lineTo(mx, ey1 + 3); g.stroke(); }
    drawE(q.t0, q.E, q.period, hot, done);
  }
  function drawE(t0: number, E: number, period: number, hot: boolean, done: boolean): void {
    const full = 'E ' + (E / 1000).toFixed(1) + ' ms', short = (E / 1000).toFixed(1);
    const a = X(t0), end = X(t0 + E), mid = X(t0 + E / 2), col = hot ? C.ink : C.ink, ty = Y.exp + LANES.exp / 2 + 4;
    const wFull = labelW(full), wShort = labelW(short), lx = Math.max(a, gx) + 5;
    const room = Math.min(X(t0 + period), gx + pw) - end - 8;                               // free space between this bar and the next one
    if (done && mid - lx - 3 >= wFull) text(full, lx, ty, M12, col);
    else if (X(known) >= end && end + 6 >= gx) { if (room >= wFull) text(full, end + 6, ty, M12, col); else if (room >= wShort) text(short, end + 6, ty, M12, col); }
    if (hot && done && mid + 5 + labelW('中点') + 3 < end) text('中点', mid + 5, ty, F12B, C.ink);
  }
  if (tune) {                                                                                // the held frame, exposed with the slider's E
    const a = X(tune.t0), b = X(tune.t0 + tune.E);
    g.fillStyle = C.hot; g.globalAlpha = .26; g.fillRect(a, ey0, b - a, ey1 - ey0); g.globalAlpha = 1;
    g.strokeStyle = C.hot; g.lineWidth = 1.5; g.strokeRect(a + .5, ey0 + .5, b - a - 1, ey1 - ey0 - 1);
    const mx = Math.round(X(tune.tMid)) + .5; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, ey0 - 3); g.lineTo(mx, ey1 + 3); g.stroke();
    drawE(tune.t0, tune.E, S.period, true, true);
  }

  // ---- lane 4: host. Row 1: commands going down, ACKs, SyncEvents. Row 2: images. Pairing curves join the two by sequence.
  const hy = R1, iy = R2, hTop = Y.host + 11;
  for (const c of B.cmds) {
    if (c.tSend > known || c.tSend > w1 || (c.ack ? c.ack.tArr : c.tSend) + SETTLE < w0) continue;
    if (c.op === OP.STOP && c.ack && c.ack.tArr <= known) {                                  // 10 ms of gyro time before START
      const a = X(c.ack.ts), b = X(Math.min(c.ack.ts + SETTLE, known));
      g.fillStyle = C.muted; g.globalAlpha = .14; g.fillRect(a, hy - 7, b - a, 14); g.globalAlpha = 1;
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([3, 2]); g.strokeRect(a + .5, hy - 6.5, Math.max(1, b - a - 1), 13); g.setLineDash([]);
      if (b - a > 78) text('稳定 ' + SETTLE / 1000 + ' ms', (a + b) / 2, hy + 18, F12, C.muted, 'center');
    }
    const x = X(c.tSend);
    g.strokeStyle = C.ink; g.fillStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, hy - 12); g.lineTo(x, hy - 3); g.stroke();
    g.beginPath(); g.moveTo(x - 4, hy - 4); g.lineTo(x + 4, hy - 4); g.lineTo(x, hy + 3); g.closePath(); g.fill();
    text(c.op === OP.STOP ? 'STOP' : 'START ' + c.period / 1000 + ' ms', x + 6, hTop - 1, M12B, C.ink);
    if (c.ack && c.ack.tArr <= known) { const ax = X(c.ack.tArr); diamond(ax, hy, 5, C.ch3, true); text('ACK', ax + 8, hy + 18, M12B, C.ink); }
  }
  const seen = new Set<Exp>(bars);
  for (let i = B.exps.length - 1; i >= 0; i--) { const q = B.exps[i]; if (q.tImg < w0 - 2000 && q.ev.tArr < w0 - 2000) break; if (q.tCb <= known && q.tCb <= w1) seen.add(q); }
  const pairDraw: Array<() => void> = [];
  const showAll = pxMs >= 14;                                                                // room for a "k ↔ #n" label on every pair
  const curve = (ax: number, bx: number, color: string, w: number, alpha: number, dash: boolean): void => {
    g.strokeStyle = color; g.lineWidth = w; g.globalAlpha = alpha; g.setLineDash(dash ? [4, 3] : []);
    g.beginPath(); g.moveTo(ax, hy + 6); g.bezierCurveTo(ax, (hy + iy) / 2 + 4, bx, (hy + iy) / 2 - 4, bx, iy - 6); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  };
  const pairText = (sFull: string, bx: number, color: string): void => {
    const s = narrow ? sFull.slice(sFull.indexOf('#')) : sFull;
    g.font = M12B; const w = g.measureText(s).width;
    if (bx + 10 + w < gx + pw) text(s, bx + 10, iy + 4, M12B, color); else text(s, bx - 10, iy + 4, M12B, color, 'right');
  };
  for (const q of seen) {
    const ev: HostEv = q.ev, hot = isCur(q) || isTune(q), p = q.pair && q.pair.tPair <= tau ? q.pair : null, tuneQ = isTune(q);
    const ax = X(ev.tArr), lost = !!ev.missed && ev.missed.tPair <= tau;
    if (ev.tArr <= known && ax >= gx - 12 && ax <= gx + pw + 12) {
      if (lost) diamond(ax, hy, 5, C.ink, false, true); else diamond(ax, hy, hot ? 6 : 5, hot ? C.hot : C.ink, true);
      text('k' + q.k, ax, hTop - 1, hot ? M12B : M12, hot ? C.ink : lost ? C.ink : C.muted, 'center');
    }
    if (ev.tArr > known) continue;
    if (tuneQ && tune) {                                                                     // image of the held frame, E from the slider
      const bx = X(tune.tImg); square(bx, iy, 5, C.hot, false);
      curve(ax, bx, C.hot, 1.5, 1, true); pairText('k' + q.k + ' ↔ #' + (tune.n ?? '?'), bx, C.ink);
      continue;
    }
    if (q.drop) {
      if (known >= q.tImg) { const bx = X(q.tImg); square(bx, iy, 5, C.muted, false, true); text('无图', bx + 10, iy + 4, M12, C.muted); }
    } else if (q.tImg <= known) {
      const bx = X(q.tImg);
      square(bx, iy, hot ? 6 : 5, hot ? C.hot : q.released ? C.muted : C.ink, true);
      if (p) { pairDraw.push(() => { curve(ax, bx, hot ? C.hot : C.muted, hot ? 2 : 1, hot ? 1 : .6, false); if (hot || showAll) pairText('k' + p.k + ' ↔ #' + p.n, bx, hot ? C.ink : C.muted); }); }
      else if (!p) text('图像', bx + 10, iy + 4, hot ? M12B : M12, hot ? C.ink : C.muted);
    }
  }
  for (const f of pairDraw) f();
  // a thin line down from each trigger through the exposure to its SyncEvent: "the same instant"
  for (const q of seen) {
    if (q.tCb > known) continue;
    const x = Math.round(X(q.tCb)) + .5, hot = isCur(q) || isTune(q);
    g.strokeStyle = hot ? C.hot : C.muted; g.lineWidth = 1; g.globalAlpha = hot ? 1 : .55; g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(x, Y.trg + 6); g.lineTo(x, hy - 6); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }

  // ---- pair lines: exposure midpoint -> the nearest IMU sample (nothing is interpolated)
  const pairLine = (mxT: number, sT: number, color: string, w: number, prog: number, dash: boolean): void => {
    const mx = Math.round(X(mxT)) + .5, sx = Math.round(X(sT)) + .5, y0 = ey0 - 1, y1 = Y.imu + LANES.imu + 1, y2 = tickBot + 1;
    const len1 = y0 - y1, len2 = Math.hypot(sx - mx, y1 - y2), tot = len1 + len2, d = tot * prog;
    g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash ? [4, 3] : []); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(mx, y0);
    if (d <= len1) g.lineTo(mx, y0 - d); else { g.lineTo(mx, y1); const u = (d - len1) / (len2 || 1); g.lineTo(mx + (sx - mx) * u, y1 + (y2 - y1) * u); }
    g.stroke(); g.setLineDash([]);
    if (prog >= 1) { g.fillStyle = color; g.beginPath(); g.arc(sx, y2, w > 1.2 ? 3.5 : 2.5, 0, Math.PI * 2); g.fill(); }
  };
  for (let i = B.pairs.length - 1; i >= 0; i--) {
    const p: Pair = B.pairs[i]; if (p.tPair < w0 - 12000) break; if (p.tPair > tau || (cur && p === cur) || (tune && p.ts === tune.ts)) continue;
    pairLine(p.tMid, tImu(p.n), C.ink, 1, 1, false); g.globalAlpha = 1;
  }
  if (cur && cur.tPair <= tau) pairLine(cur.tMid, tImu(cur.n), C.hot, 2, S.mode === 'roll' ? clamp((tau - cur.tPair) / 1800, 0, 1) : 1, false);
  if (tune && tune.n !== null) pairLine(tune.tMid, tune.t, C.hot, 2, 1, false);

  // ---- "now": what lies to the right has not happened yet
  if (mode === 'roll') {
    const nx = Math.round(X(tau)) + .5;
    g.strokeStyle = C.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(nx, Y.imu); g.lineTo(nx, Y.axis + 4); g.stroke();
  }
  g.restore();

  // ---- axis caption (the slow-motion ratio is in the status text next to the buttons)
  text(narrow ? 'ms' : '相对触发 ms', 9, Y.axis + 14, F12, C.muted);
}
