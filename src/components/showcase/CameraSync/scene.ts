/* The small isometric scene above the lanes: the C board (IMU, trigger pin), the trigger line, the industrial camera, the host.
   Returns SVG markup for a viewBox of SCENE_W x SCENE_H. Everything that lights up is read from the Show state at the view
   time: the trigger edge, the exposure (lens ring and light cone, a bar that fills over E), the image leaving the camera
   (a packet running down the USB cable for the readout time) and the SyncEvent running to the host. Tokens only. */
import type { Show } from './show.ts';
import type { Exp } from './sim.ts';

export const SCENE_VB = '28 8 440 150';
const C30 = 0.866, S30 = 0.5;
type V = [number, number];
type P3 = (x: number, y: number, z: number) => V;
const n2 = (v: number): string => String(Math.round(v * 10) / 10);
const pts = (a: V[]): string => a.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ');
const mk = (ox: number, oy: number): P3 => (x, y, z) => [ox + (x - y) * C30, oy + (x + y) * S30 - z];

interface BoxStyle { top: string; left: string; right: string }
/** an axis-aligned box in iso space: x right-down, y left-down, z up. Shows the top, the x=max face (right) and the y=max face (left) */
function box(p: P3, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, st: BoxStyle): string {
  const s = 'stroke:var(--ink);stroke-width:1;stroke-linejoin:round';
  return `<polygon points="${pts([p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)])}" style="fill:${st.right};${s}"/>`
    + `<polygon points="${pts([p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1)])}" style="fill:${st.left};${s}"/>`
    + `<polygon points="${pts([p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)])}" style="fill:${st.top};${s}"/>`;
}
const quad = (p: P3, x0: number, y0: number, x1: number, y1: number, z: number, style: string): string =>
  `<polygon points="${pts([p(x0, y0, z), p(x1, y0, z), p(x1, y1, z), p(x0, y1, z)])}" style="${style}"/>`;
const ell = (c: V, rx: number, ry: number, style: string): string => `<ellipse cx="${n2(c[0])}" cy="${n2(c[1])}" rx="${n2(rx)}" ry="${n2(ry)}" style="${style}"/>`;
const txt = (s: string, x: number, y: number, o: { w?: number; fill?: string; anchor?: string; mono?: boolean; size?: number } = {}): string =>
  `<text x="${n2(x)}" y="${n2(y)}" text-anchor="${o.anchor || 'start'}" style="fill:${o.fill || 'var(--ink)'};font:${o.w || 400} ${o.size || 12}px ${o.mono ? 'var(--font-mono)' : 'var(--font-sans)'}">${s}</text>`;

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const GLOW = 3000;                                   // us a trigger edge stays lit

export function drawScene(S: Show): string {
  const B = S.B, known = Math.min(S.tau, B.now), tune = S.mode === 'tune';
  const pb = mk(78, 78), pc = mk(262, 112), ph = mk(404, 52);
  const out: string[] = [];
  const faces: BoxStyle = { top: 'var(--paper-raised)', left: 'var(--paper-sunken)', right: 'var(--paper-sunken)' };

  // ---- what is lit now
  let trig = 0, expo: Exp | null = null, expoProg = 0;
  const imgs: number[] = [], syncs: number[] = [];
  for (let i = B.exps.length - 1; i >= 0 && i >= B.exps.length - 6; i--) {
    const q = B.exps[i];
    if (q.tCb > known) continue;
    trig = Math.max(trig, clamp(1 - (known - q.tCb) / GLOW, 0, 1));
    const arr = Math.max(q.ev.tArr, q.tCb + 400);
    if (known < arr) syncs.push(clamp((known - q.tCb) / (arr - q.tCb), 0, 1));
    if (q.t0 <= known && known < q.t1 && !expo) { expo = q; expoProg = clamp((known - q.t0) / q.E, 0, 1); }
    if (!q.drop && known >= q.t1 && known < q.tImg) imgs.push(clamp((known - q.t1) / (q.tImg - q.t1), 0, 1));
  }
  const stopped = B.sm.state === 'STOPPED';

  // ---- floor grid (a quiet reference)
  const g = mk(236, 70);
  for (let i = -3; i <= 9; i++) {
    const a = g(i * 28, -140, 0), b = g(i * 28, 260, 0);
    out.push(`<line x1="${n2(a[0])}" y1="${n2(a[1])}" x2="${n2(b[0])}" y2="${n2(b[1])}" style="stroke:var(--line);stroke-width:1;opacity:.45"/>`);
  }
  for (let j = -5; j <= 9; j++) {
    const a = g(-84, j * 28, 0), b = g(252, j * 28, 0);
    out.push(`<line x1="${n2(a[0])}" y1="${n2(a[1])}" x2="${n2(b[0])}" y2="${n2(b[1])}" style="stroke:var(--line);stroke-width:1;opacity:.45"/>`);
  }

  // ---- cables
  const trigA = pb(72, 20, 9), trigB = pc(24, 52, 22);                       // C board trigger pin -> camera I/O
  const trigPath = `M${n2(trigA[0])} ${n2(trigA[1])}C${n2(trigA[0] + 34)} ${n2(trigA[1] + 4)} ${n2(trigB[0] - 36)} ${n2(trigB[1] + 16)} ${n2(trigB[0])} ${n2(trigB[1])}`;
  const syncA = pb(40, 0, 9), syncB = ph(22, 40, 4);                          // C board USB -> host
  const syncPath = `M${n2(syncA[0])} ${n2(syncA[1])}C${n2(syncA[0] + 10)} ${n2(syncA[1] - 48)} ${n2(syncB[0] - 60)} ${n2(syncB[1] - 6)} ${n2(syncB[0])} ${n2(syncB[1])}`;
  const imgA = pc(0, 8, 8), imgB = ph(30, 40, 3);                              // camera USB 3 -> host
  const imgPath = `M${n2(imgA[0])} ${n2(imgA[1])}C${n2(imgA[0] + 8)} ${n2(imgA[1] - 22)} ${n2(imgB[0] - 70)} ${n2(imgB[1] + 40)} ${n2(imgB[0])} ${n2(imgB[1])}`;
  const cable = (d: string): string => `<path d="${d}" style="fill:none;stroke:var(--line-strong);stroke-width:2.5;stroke-linecap:round"/>`;
  const packet = (d: string, f: number, color: string, len: number): string =>
    `<path d="${d}" pathLength="1" style="fill:none;stroke:${color};stroke-width:5;stroke-dasharray:${len} 2;stroke-dashoffset:${-(f * (1 + len) - len)}"/>`;
  out.push(cable(syncPath), cable(imgPath));
  for (const f of syncs) out.push(packet(syncPath, f, 'var(--ch3)', 0.1));
  for (const f of imgs) out.push(packet(imgPath, f, 'var(--ch1)', 0.14));

  // ---- host (a mini PC)
  out.push(box(ph, 0, 0, 0, 56, 40, 12, faces));
  out.push(quad(ph, 6, 6, 50, 34, 12, 'fill:var(--paper-sunken);stroke:var(--ink);stroke-width:1'));
  for (let i = 0; i < 4; i++) out.push(quad(ph, 10 + i * 10, 10, 15 + i * 10, 30, 12.2, 'fill:none;stroke:var(--line-strong);stroke-width:1'));
  const hl = ph(28, 42, 0);
  out.push(txt('上位机', hl[0] - 4, hl[1] + 24, { w: 700 }));

  // ---- C board
  out.push(box(pb, 0, 0, 0, 74, 48, 7, faces));
  out.push(quad(pb, 5, 5, 69, 43, 7, 'fill:none;stroke:var(--line-strong);stroke-width:1'));
  out.push(box(pb, 12, 12, 7, 32, 32, 12, faces));                                       // MCU
  out.push(box(pb, 42, 10, 7, 58, 22, 10, faces));                                       // IMU
  const il = pb(50, 16, 10);
  out.push(txt('IMU', il[0] - 9, il[1] - 4, { mono: true, w: 700, size: 10 }));
  out.push(quad(pb, 12, 34, 22, 42, 7.2, 'fill:var(--team-accent,var(--ink));stroke:var(--ink);stroke-width:1'));       // the team's light on the board
  out.push(quad(pb, 66, 16, 70, 24, 7.2, `fill:${trig > 0.02 ? 'var(--ch2)' : 'var(--paper-raised)'};stroke:var(--ink);stroke-width:1`));   // trigger pin
  const bl = pb(0, 52, 0);
  out.push(txt('C 板', bl[0] - 30, bl[1] + 14, { w: 700 }));

  // ---- trigger line, lit by the edge
  out.push(`<path d="${trigPath}" style="fill:none;stroke:var(--ink);stroke-width:2.5;stroke-linecap:round"/>`);
  if (trig > 0.02) out.push(`<path d="${trigPath}" style="fill:none;stroke:var(--ch2);stroke-width:5;stroke-linecap:round;opacity:${n2(trig)}"/>`);

  // ---- camera: bracket, body, lens barrel (stacked rings)
  out.push(box(pc, -6, -8, -5, 54, 56, 0, faces));
  out.push(box(pc, 0, 0, 0, 40, 48, 38, faces));
  out.push(quad(pc, 6, 6, 34, 42, 38, 'fill:none;stroke:var(--line-strong);stroke-width:1'));
  const lensC = (x: number): V => pc(x, 24, 21);
  const R = 15;
  [40, 46, 52, 58, 64, 70].forEach((x, i) => out.push(ell(lensC(x), (R - (i > 3 ? 2 : 0)) * 0.5 + 0.2, R - (i > 3 ? 2 : 0), `fill:${i % 2 ? 'var(--paper-sunken)' : 'var(--paper-raised)'};stroke:var(--ink);stroke-width:1`)));
  const front = lensC(70), active = !!expo || (tune && !!S.tune);
  out.push(ell(front, 5, 10, `fill:${active ? 'var(--ch1)' : 'var(--paper-sunken)'};fill-opacity:${active ? 0.55 : 1};stroke:var(--ink);stroke-width:1`));
  if (active) {
    out.push(ell(front, 8.5, 16, 'fill:none;stroke:var(--ch1);stroke-width:3'));
    for (let i = -1; i <= 1; i++) out.push(`<line x1="${n2(front[0] + 34)}" y1="${n2(front[1] + 17 + i * 22)}" x2="${n2(front[0] + 12)}" y2="${n2(front[1] + 6 + i * 6)}" style="stroke:var(--ch1);stroke-width:1.5;stroke-dasharray:4 3"/>`);
  }
  const cl = pc(10, 56, 0), bx = cl[0] - 52, by = cl[1] + 30;
  out.push(txt('工业相机', bx - 12, cl[1] + 22, { w: 700 }));
  out.push(`<rect x="${n2(bx)}" y="${n2(by)}" width="64" height="6" style="fill:var(--paper-sunken);stroke:var(--line-strong);stroke-width:1"/>`);
  if (expo) out.push(`<rect x="${n2(bx)}" y="${n2(by)}" width="${n2(64 * expoProg)}" height="6" style="fill:var(--ch1)"/>`);
  out.push(txt(expo ? `曝光 k${(expo as Exp).k}` : stopped ? 'STOP' : `${S.hz} Hz`, bx + 70, by + 7, { mono: true, size: 11, fill: 'var(--ink-muted)' }));
  return `<g transform="translate(0,-24)">${out.join('')}</g>`;
}
