// RobotLineup · iso: the drawing kit the robots are built from. Isometric view, flat facets, 1 px outlines.
// World axes of a robot: x forward, y to its right, z up. The camera looks from (+x, +y, +z), so the visible
// faces are the front (+x, lower right), the right side (+y, lower left) and the top. Every shape here is a plain
// SVG element: <polygon>, <path>, <g transform>. Parts that move are drawn again from their pose (frame()).
import React from 'react';
import styles from './styles.module.css';

export type V3 = [number, number, number];
export type P2 = [number, number];
export type Tf = (p: V3) => V3;

const C = Math.sqrt(3) / 2;
/** Screen scale of a circle of radius r in any plane: its ellipse has semi-axis r * K. */
export const K = Math.sqrt(1.5);
export const proj = (p: V3): P2 => [(p[0] - p[1]) * C, (p[0] + p[1]) * 0.5 - p[2]];
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString();
export const pts = (a: P2[]): string => a.map((q) => f1(q[0]) + ',' + f1(q[1])).join(' ');
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Facing the camera: the normal has a positive component along the view axis (1, 1, 1). */
const facing = (n: V3): number => n[0] + n[1] + n[2];

// ------------------------------------------------------------------------------------------ frames
export const ID: Tf = (p) => p;
/** A moving part: its local origin sits at o (in the parent's coordinates), then it pitches (about its y axis, up
 *  positive) and yaws (about z, to the right positive), and the parent's transform follows. */
export function frame(o: V3, yaw = 0, pitch = 0, parent: Tf = ID): Tf {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (p) => {
    const x1 = p[0] * cp - p[2] * sp, z1 = p[0] * sp + p[2] * cp;
    return parent([o[0] + x1 * cy - p[1] * sy, o[1] + x1 * sy + p[1] * cy, o[2] + z1]);
  };
}

// ------------------------------------------------------------------------------------------ tones
/** Materials. Each has three tones (H top, M left face, L right face) defined as CSS variables in styles.module.css. */
export type Mat = 'body' | 'dark' | 'metal' | 'rubber' | 'glass' | 'accent';
const LIGHT = unit([-0.25, 0.45, 0.85]);
export function level(n: V3): 'H' | 'M' | 'L' {
  const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  return d > 0.62 ? 'H' : d > 0.2 ? 'M' : 'L';
}
export const cls = (m: Mat, l: 'H' | 'M' | 'L'): string => `${styles.f} ${styles[m + l]}`;
const toneOf = (m: Mat, n: V3): string => cls(m, level(n));

// ------------------------------------------------------------------------------------------ box
const FACES: [V3, number[]][] = [
  [[1, 0, 0], [1, 3, 7, 5]], [[-1, 0, 0], [0, 4, 6, 2]],
  [[0, 1, 0], [2, 6, 7, 3]], [[0, -1, 0], [0, 1, 5, 4]],
  [[0, 0, 1], [4, 5, 7, 6]], [[0, 0, -1], [0, 2, 3, 1]],
];
/** A rectangular block: min corner p, size d = [length x, width y, height z]. Only the faces that face the camera
 *  are drawn. top: another material for the top face. */
export function Box({ tf, p, d, m, top }: { tf: Tf; p: V3; d: V3; m: Mat; top?: Mat }): JSX.Element {
  const V: V3[] = [];
  for (let i = 0; i < 8; i++) V.push(tf([p[0] + (i & 1) * d[0], p[1] + ((i >> 1) & 1) * d[1], p[2] + ((i >> 2) & 1) * d[2]]));
  const c: V3 = [p[0] + d[0] / 2, p[1] + d[1] / 2, p[2] + d[2] / 2];
  const wc = tf(c);
  const out: JSX.Element[] = [];
  FACES.forEach(([n, idx], i) => {
    const nw = sub(tf([c[0] + n[0], c[1] + n[1], c[2] + n[2]]), wc);
    if (facing(nw) <= 0.02) return;
    out.push(<polygon key={i} points={pts(idx.map((j) => proj(V[j])))} className={toneOf(top && n[2] === 1 ? top : m, nw)} />);
  });
  return <g>{out}</g>;
}

// ------------------------------------------------------------------------------------------ cylinder / cone
function hull(P: P2[]): P2[] {
  const a = P.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cr = (o: P2, u: P2, v: P2): number => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = a.length - 1; i >= 0; i--) { const q = a[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
const N = 18;
/** Circle of radius r around c (world) in the plane with unit normal ax. */
export function circle3(c: V3, ax: V3, r: number, n = N, phase = 0): V3[] {
  const h: V3 = Math.abs(ax[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const e1 = unit(cross(ax, h)), e2 = cross(ax, e1);
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = phase + (i / n) * Math.PI * 2, co = Math.cos(t) * r, si = Math.sin(t) * r;
    out.push([c[0] + e1[0] * co + e2[0] * si, c[1] + e1[1] * co + e2[1] * si, c[2] + e1[2] * co + e2[2] * si]);
  }
  return out;
}

/** A round bar or disc from a to b. strips: a light and a dark band along it (barrels, posts). */
export function Cyl({ tf, a, b, r, m, strips = true, r2, capM }: { tf: Tf; a: V3; b: V3; r: number; m: Mat; strips?: boolean; r2?: number; capM?: Mat }): JSX.Element {
  const A = tf(a), B = tf(b);
  const ax = unit(sub(B, A));
  const rb = r2 ?? r;
  const ca = circle3(A, ax, r), cb = circle3(B, ax, rb);
  const sil = hull(ca.concat(cb).map(proj));
  const out: JSX.Element[] = [<polygon key="s" points={pts(sil)} className={toneOf(m, [-0.3, 0.3, 0])} />];
  const a2 = proj(A), b2 = proj(B);
  const L = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
  const R = Math.max(r, rb) * K;
  if (strips && L > 3.2 * R) {
    const u: P2 = [(b2[0] - a2[0]) / L, (b2[1] - a2[1]) / L];
    let nn: P2 = [-u[1], u[0]];
    if (nn[0] * -0.4 + nn[1] * -0.9 < 0) nn = [-nn[0], -nn[1]];
    const band = (o1: number, o2: number, mm: 'H' | 'L', key: string): JSX.Element => {
      const i = R * 0.9;
      const w1 = r * K * o1, w2 = r * K * o2, v1 = rb * K * o1, v2 = rb * K * o2;
      const P: P2[] = [
        [a2[0] + u[0] * i + nn[0] * w1, a2[1] + u[1] * i + nn[1] * w1],
        [b2[0] - u[0] * i + nn[0] * v1, b2[1] - u[1] * i + nn[1] * v1],
        [b2[0] - u[0] * i + nn[0] * v2, b2[1] - u[1] * i + nn[1] * v2],
        [a2[0] + u[0] * i + nn[0] * w2, a2[1] + u[1] * i + nn[1] * w2],
      ];
      return <polygon key={key} points={pts(P)} className={`${styles.nf} ${styles[m + mm]}`} />;
    };
    out.push(band(0.18, 0.6, 'H', 'h'), band(-0.95, -0.4, 'L', 'l'));
  }
  // the end that faces the camera gets its cap
  const atB = facing(ax) > 0;
  const capN: V3 = atB ? ax : [-ax[0], -ax[1], -ax[2]];
  out.push(<polygon key="c" points={pts((atB ? cb : ca).map(proj))} className={toneOf(capM ?? m, capN)} />);
  return <g>{out}</g>;
}

/** A cone / pointed nose: base circle at a (radius r), tip at b. */
export function Cone({ tf, a, b, r, m }: { tf: Tf; a: V3; b: V3; r: number; m: Mat }): JSX.Element {
  const A = tf(a), B = tf(b);
  const ax = unit(sub(B, A));
  const P = circle3(A, ax, r).map(proj).concat([proj(B)]);
  return <polygon points={pts(hull(P))} className={toneOf(m, [-0.3, 0.3, 0])} />;
}

/** Flat polygon in the horizontal plane at height z (props, plates). */
export function Flat({ tf, P, z, m, cn }: { tf: Tf; P: [number, number][]; z: number; m: Mat; cn?: string }): JSX.Element {
  return <polygon points={pts(P.map((q) => proj(tf([q[0], q[1], z]))))} className={cn ?? cls(m, 'H')} />;
}

// ------------------------------------------------------------------------------------------ armour plate
/** A plate standing on a vertical face. c: centre (local), face: ground angle of its outward normal (0 = +x). Its
 *  inside is drawn in plate coordinates (x to the right, y down, origin at the centre, units = px). */
export function plateMatrix(tf: Tf, c: V3, face: number): { m: string; visible: boolean; nw: V3 } {
  const n: V3 = [Math.cos(face), Math.sin(face), 0];
  const u: V3 = [Math.sin(face), -Math.cos(face), 0];
  const wc = tf(c);
  const O = proj(wc);
  const ex = proj(tf([c[0] + u[0], c[1] + u[1], c[2]]));
  const ey = proj(tf([c[0], c[1], c[2] - 1]));
  const nw = sub(tf([c[0] + n[0], c[1] + n[1], c[2]]), wc);
  return {
    m: `matrix(${f1(ex[0] - O[0])} ${f1(ex[1] - O[1])} ${f1(ey[0] - O[0])} ${f1(ey[1] - O[1])} ${f1(O[0])} ${f1(O[1])})`,
    visible: facing(nw) > 0.05,
    nw,
  };
}

/** RoboMaster armour module: black plate, a light bar on each side, a sticker with the robot number between them.
 *  lit: light level (0 off, 1 on, above 1 a flash). */
export function Armor({ tf, c, face, no, lit, w = 34, h = 20 }: { tf: Tf; c: V3; face: number; no: string; lit: number; w?: number; h?: number }): JSX.Element | null {
  const { m, visible, nw } = plateMatrix(tf, c, face);
  if (!visible) return null;
  const on = Math.min(1, 0.14 + 0.86 * lit);
  const boost = Math.max(0, lit - 1.05);
  const barH = h * 0.78, barW = 3.4;
  const plateCls = toneOf('dark', nw);
  return (
    <g transform={m}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} className={plateCls} />
      {[-1, 1].map((s) => (
        <g key={s}>
          {boost > 0 ? <rect x={s * (w / 2 - 3.2) - barW / 2 - 1.6} y={-barH / 2 - 1.6} width={barW + 3.2} height={barH + 3.2} className={styles.glow} opacity={Math.min(0.5, boost * 0.5)} /> : null}
          <rect x={s * (w / 2 - 3.2) - barW / 2} y={-barH / 2} width={barW} height={barH} className={styles.bar} opacity={on} />
        </g>
      ))}
      <rect x={-5.5} y={-5.5} width={11} height={11} className={styles.sticker} />
      {no ? <text x={0} y={0.6} className={styles.no}>{no}</text> : null}
    </g>
  );
}

/** Anything drawn flat on a vertical face (vents, labels), in plate coordinates like Armor. */
export function Panel({ tf, c, face, children }: { tf: Tf; c: V3; face: number; children: React.ReactNode }): JSX.Element | null {
  const { m, visible } = plateMatrix(tf, c, face);
  return visible ? <g transform={m}>{children}</g> : null;
}

// ------------------------------------------------------------------------------------------ wheels
export type WheelKind = 'mecanum' | 'omni' | 'helm';
/** A wheel standing on its edge. c: centre, axle: ground angle of the axle (0 = along x), roll: rotation about it. */
export function Wheel({ tf, c, axle, r, t, roll, kind }: { tf: Tf; c: V3; axle: number; r: number; t: number; roll: number; kind: WheelKind }): JSX.Element {
  const a: V3 = [Math.cos(axle), Math.sin(axle), 0];
  const w: V3 = [-Math.sin(axle), Math.cos(axle), 0];
  const wc = tf(c);
  const aw = sub(tf([c[0] + a[0], c[1] + a[1], c[2] + a[2]]), wc);
  const side = facing(aw) >= 0 ? 1 : -1;
  const edgeOn = Math.abs(facing(aw)) < 0.14;
  const at = (s: number, rad: number, th: number): P2 =>
    proj(tf([c[0] + a[0] * s + rad * Math.cos(th) * w[0], c[1] + a[1] * s + rad * Math.cos(th) * w[1], c[2] + rad * Math.sin(th)]));
  const circ = (s: number, rad: number, n = 20): P2[] => Array.from({ length: n }, (_, i) => at(s, rad, (i / n) * Math.PI * 2));
  const sF = side * t / 2, sB = -side * t / 2;
  const out: JSX.Element[] = [];
  out.push(<polygon key="tire" points={pts(hull(circ(sF, r).concat(circ(sB, r))))} className={cls('rubber', 'L')} />);
  if (!edgeOn) {
    const th = (k: number): number => k + roll;
    out.push(<polygon key="face" points={pts(circ(sF, r))} className={cls('rubber', 'M')} />);
    if (kind === 'mecanum') {
      const n = 10;
      for (let k = 0; k < n; k++) {
        const t0 = th((k / n) * Math.PI * 2), s = 0.12;
        out.push(<polygon key={'r' + k} points={pts([at(sF, r * 0.6, t0 - s), at(sF, r * 0.6, t0 + s), at(sF, r * 0.97, t0 + s + 0.6), at(sF, r * 0.97, t0 - s + 0.6)])} className={cls('metal', 'M')} />);
      }
      out.push(<polygon key="hub" points={pts(circ(sF, r * 0.42, 14).map((_, i, A) => A[i]))} className={cls('dark', 'M')} />);
    } else if (kind === 'omni') {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const t0 = th((k / n) * Math.PI * 2);
        const P: P2[] = [];
        for (let j = 0; j < 7; j++) { const q = (j / 7) * Math.PI * 2; P.push(at(sF, r * 0.82 + Math.cos(q) * r * 0.1, t0 + Math.sin(q) * 0.2)); }
        out.push(<polygon key={'r' + k} points={pts(P)} className={cls('metal', 'M')} />);
      }
      out.push(<polygon key="ring" points={pts(circ(sF, r * 0.62, 18))} className={cls('dark', 'M')} />);
      for (let k = 0; k < 3; k++) {
        const t0 = th((k / 3) * Math.PI * 2);
        out.push(<polygon key={'s' + k} points={pts([at(sF, r * 0.08, t0 - 0.5), at(sF, r * 0.58, t0 - 0.2), at(sF, r * 0.58, t0 + 0.2), at(sF, r * 0.08, t0 + 0.5)])} className={cls('metal', 'L')} />);
      }
    } else {
      for (let k = 0; k < 16; k++) {
        const t0 = th((k / 16) * Math.PI * 2);
        const a0 = at(sF, r * 0.78, t0), b0 = at(sF, r * 0.96, t0);
        out.push(<line key={'t' + k} x1={f1(a0[0])} y1={f1(a0[1])} x2={f1(b0[0])} y2={f1(b0[1])} className={styles.tread} />);
      }
      out.push(<polygon key="rim" points={pts(circ(sF, r * 0.62, 18))} className={cls('metal', 'M')} />);
      out.push(<polygon key="hub" points={pts(circ(sF, r * 0.34, 12))} className={cls('dark', 'M')} />);
      for (let k = 0; k < 5; k++) {
        const q = at(sF, r * 0.48, th((k / 5) * Math.PI * 2));
        out.push(<circle key={'b' + k} cx={f1(q[0])} cy={f1(q[1])} r={1.3} className={styles.bolt} />);
      }
    }
  }
  return <g>{out}</g>;
}

// ------------------------------------------------------------------------------------------ small effects
/** Muzzle flash: a spiky star at the muzzle, pointing along dir (screen). k: 0..1. */
export function Flash({ at, dir, k }: { at: P2; dir: P2; k: number }): JSX.Element | null {
  if (k <= 0.05) return null;
  const ang = Math.atan2(dir[1], dir[0]) * 180 / Math.PI;
  const R = 12 + 30 * k, r = 4 + 4 * k;
  const P: P2[] = [];
  for (let i = 0; i < 12; i++) { const q = (i / 12) * Math.PI * 2; const rr = i % 2 ? r : (i % 4 === 0 ? R * 1.35 : R * 0.7); P.push([Math.cos(q) * rr, Math.sin(q) * rr]); }
  return (
    <g transform={`translate(${f1(at[0])} ${f1(at[1])}) rotate(${f1(ang)})`}>
      <polygon points={pts(P)} className={styles.flash} />
      <circle r={r * 0.9} className={styles.flashCore} />
    </g>
  );
}

/** Tracer of a bullet: a short streak and a dot, flying along dir (world, from tip) and sagging a little. */
export function Tracer({ tip, dir, age, big }: { tip: V3; dir: V3; age: number; big: boolean }): JSX.Element | null {
  const sp = big ? 620 : 760, g = 520;
  const at = (a: number): P2 => proj([tip[0] + dir[0] * sp * a, tip[1] + dir[1] * sp * a, tip[2] + dir[2] * sp * a - 0.5 * g * a * a]);
  const head = at(age), tail = at(Math.max(0, age - (big ? 0.05 : 0.04)));
  const fade = 1 - Math.min(1, Math.max(0, (age - 0.3) / 0.2));
  if (fade <= 0) return null;
  return (
    <g opacity={fade}>
      <line x1={f1(tail[0])} y1={f1(tail[1])} x2={f1(head[0])} y2={f1(head[1])} className={big ? styles.tracerBig : styles.tracer} />
      <circle cx={f1(head[0])} cy={f1(head[1])} r={big ? 3.4 : 2} className={styles.shot} />
    </g>
  );
}

/** Ground tile under a robot: a square of half-size hs around (cx, cy). */
export function Tile({ cx = 0, cy = 0, hs, tf = ID }: { cx?: number; cy?: number; hs: number; tf?: Tf }): JSX.Element {
  const P = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([a, b]) => proj(tf([cx + a * hs, cy + b * hs, 0])));
  const m = hs * 0.16;
  const corner = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([a, b]) => {
    const p0 = proj(tf([cx + a * hs, cy + b * (hs - m * 2), 0])), p1 = proj(tf([cx + a * hs, cy + b * hs, 0])), p2 = proj(tf([cx + a * (hs - m * 2), cy + b * hs, 0]));
    return `M${f1(p0[0])},${f1(p0[1])}L${f1(p1[0])},${f1(p1[1])}L${f1(p2[0])},${f1(p2[1])}`;
  }).join('');
  return (
    <g>
      <polygon points={pts(P)} className={styles.tile} />
      <path d={corner} className={styles.tileMark} />
    </g>
  );
}
