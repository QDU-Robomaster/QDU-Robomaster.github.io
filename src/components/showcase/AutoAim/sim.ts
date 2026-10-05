/* AutoAim · 纯逻辑：不碰 DOM，浏览器和 node 通用（node --test 直接读这个 .ts，只用可擦除的类型语法）。
 *
 * 讲的是 ArmorDetector → ArmorTracker → Aimer 这条链：
 *   相机每帧只看到一两块装甲板；整车 EKF 把它们拼成一台车（中心、速度、yaw、yaw 速度、radius_1、radius_2、dz）；
 *   Aimer 把处理延迟、云台到位和弹丸飞行加起来得到 Δ，飞行时间迭代三次；把四块板推到 t+Δ，取正对枪线的一块；
 *   开火闸门四项都过才放行。对照组"看到哪瞄哪"直接打最近一次检出的位置，什么都不预测。
 *
 * 坐标：米，原点在云台底座，x 朝靶场，y 向右，z 向上。
 * Duel 同时跑两台完全相同的仿真（同一段目标运动、同一套延迟），只有瞄法不同，命中率读数就是这两台各自的统计。
 */

export type V3 = [number, number, number];

const PI = Math.PI;
const TAU = 2 * PI;
const D2R = PI / 180;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const wrap = (a: number) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const add = (a: number[], b: number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: number[], b: number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: number[], k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: number[]): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const madd = (a: number[], b: number[], k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const smooth = (u: number) => u * u * (3 - 2 * u);

function rng(seed: number) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) { let u = 0; while (u === 0) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

// ------------------------------------------------------------------------------------------------ 数值
export const V = {
  latency: 0.0176,                    // 曝光中点 -> 云台指令：检测 14.2 + 跟踪 2.8 + 瞄准 0.6 ms
  split: [0.0142, 0.0028, 0.0006],
  tGim: 0.0214,                       // 指令 -> 云台到位
  v0: 25, kDrag: 0.030, g: 9.81,      // 弹速 25 m/s，二次阻力（4 m 飞行约 0.17 s）
  r1: 0.20, r2: 0.25, dz: 0.05,       // 两对装甲板的半径，以及第二对高出的 dz
  tilt: 15 * D2R, z1: 0.155,          // 装甲板后仰 15°，第一对板中心高 0.155 m
  panelW: 0.135, panelH: 0.125,       // 小装甲板 135 × 125 mm
  barH: 0.056, barX: 0.0615, barW: 0.010,   // 灯条长 56 mm，中心离板心 61.5 mm
  spins: [0.5, 2.0, -1.2],            // 待机三种转速：慢、快、反向（圈/s）
  camHz: 100, hfov: 28 * D2R, aspect: 0.56,
  period: 13.1, dist: 4,
  pivotH: 0.215, muzzle: 0.25, camOff: [0.0975, 0, 0.058] as V3,
  gateSigma: 0.030, gateGim: 0.028, gateFace: 40 * D2R,
  minDetect: 2,                       // 对应 cfg.tracker.min_detect_count 默认值
  step: 0.002,
  win: 24,                            // 命中率统计窗口（发）
};

// ------------------------------------------------------------------------------------------------ 云台与相机
export function gimbalXf(frame: string, p: number[], psi: number, phi: number): V3 {
  if (frame === 'base') return [p[0], p[1], p[2]];
  const cy = Math.cos(psi), sy = Math.sin(psi);
  let q = p;
  if (frame === 'pitch') {
    const cp = Math.cos(phi), sp = Math.sin(phi);
    q = [p[0] * cp - p[2] * sp, p[1], p[0] * sp + p[2] * cp + V.pivotH];
  }
  return [q[0] * cy - q[1] * sy, q[0] * sy + q[1] * cy, q[2]];
}
export function gimbalFrames(psi: number, phi: number) {
  const f: V3 = [Math.cos(phi) * Math.cos(psi), Math.cos(phi) * Math.sin(psi), Math.sin(phi)];
  const r = nrm([-f[1], f[0], 0]), u = cross(f, r), piv: V3 = [0, 0, V.pivotH];
  return { f, r, u, pivot: piv, cam: gimbalXf('pitch', V.camOff, psi, phi), muzzle: madd(piv, f, V.muzzle) };
}

// 一块装甲板：j = 0..3，th 是第 0 块的朝向；0/2 在 r1，1/3 在 r2 且高 dz；板面后仰 tilt
export function faceFrame(j: number, th: number, c: number[], r: number, z: number) {
  const ph = th + j * PI / 2, ct = Math.cos(V.tilt), st = Math.sin(V.tilt), cp = Math.cos(ph), sp = Math.sin(ph);
  return { j, ph, p: [c[0] + r * cp, c[1] + r * sp, z] as V3, n: [cp * ct, sp * ct, st] as V3, t: [-sp, cp, 0] as V3, u: [-cp * st, -sp * st, ct] as V3, r, z };
}
export type Face = ReturnType<typeof faceFrame>;

// 图像坐标：x 向右、y 向下，水平半视场归一到 [-1, 1]
export function camOf(g: { psi: number; phi: number }) {
  const F = gimbalFrames(g.psi, g.phi);
  return { o: F.cam, f: F.f, r: F.r, u: F.u, k: 1 / Math.tan(V.hfov / 2) };
}
export type Cam = ReturnType<typeof camOf>;
export function project(cam: Cam, p: number[]): V3 | null {
  const d = sub(p, cam.o), zc = dot(d, cam.f);
  if (zc < 0.05) return null;
  return [cam.k * dot(d, cam.r) / zc, -cam.k * dot(d, cam.u) / zc, zc];
}
// 灯条端点（左下、左上、右上、右下）：检测器输出的四个角点
export function barEnds(F: Face): V3[] {
  const h = V.barH / 2, w = V.barX;
  return [madd(madd(F.p, F.t, -w), F.u, -h), madd(madd(F.p, F.t, -w), F.u, h), madd(madd(F.p, F.t, w), F.u, h), madd(madd(F.p, F.t, w), F.u, -h)];
}

// ------------------------------------------------------------------------------------------------ 弹道
// Aimer 用的解析模型：水平二次阻力、竖直只算重力；弹丸本身带阻力积分，所以求解器略有偏差
export function tof(x: number, pitch: number) { const k = V.kDrag; return (Math.exp(k * x) - 1) / (k * V.v0 * Math.cos(pitch)); }
export function solvePitch(x: number, h: number) {
  let y = h, pitch = 0, t = 0;
  for (let i = 0; i < 8; i++) { pitch = Math.atan2(y, x); t = tof(x, pitch); const z = V.v0 * Math.sin(pitch) * t - 0.5 * V.g * t * t; y += h - z; }
  return { pitch, t };
}
export function shotStep(s: { p: number[]; v: number[] }, h: number) {
  const v = s.v, sp = len(v), k = V.kDrag;
  s.v = [v[0] - k * sp * v[0] * h, v[1] - k * sp * v[1] * h, v[2] - (k * sp * v[2] + V.g) * h];
  s.p = madd(s.p, s.v, h);
}

// ------------------------------------------------------------------------------------------------ 整车 EKF
// 状态 [xc, yc, zc, vx, vy, th, w, r1, r2, dz]：中心、速度、第 0 块板的 yaw、yaw 速度、两个半径、高度差
// 看到第 k 块板： p = c + r_k (cos(th + kπ/2), sin(..))，z = zc + dz（k 为奇数），yaw = th + kπ/2
const NX = 10;
const I10 = () => { const m: number[][] = []; for (let i = 0; i < NX; i++) { m.push(new Array(NX).fill(0)); m[i][i] = 1; } return m; };
function mm(A: number[][], B: number[][]) {
  const n = A.length, p = B[0].length, q = B.length, C: number[][] = [];
  for (let i = 0; i < n; i++) { const r = new Array(p).fill(0); for (let k = 0; k < q; k++) { const a = A[i][k]; if (a) for (let j = 0; j < p; j++) r[j] += a * B[k][j]; } C.push(r); }
  return C;
}
const tr = (A: number[][]) => A[0].map((_, j) => A.map((r) => r[j]));
function inv4(M: number[][]) {
  const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c] || 1e-12; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}

export class Tracker {
  x: number[] | null = null; P: number[][] | null = null;
  t = 0; seen = -1; born = -1; n = 0; who: string | null = null;
  constructor() { this.reset(); }
  reset() { this.x = null; this.P = null; this.t = 0; this.seen = -1; this.born = -1; this.n = 0; this.who = null; }
  init(m: { p: number[]; phi: number }, t: number, who: string) {
    const r0 = (V.r1 + V.r2) / 2;
    this.x = [m.p[0] - r0 * Math.cos(m.phi), m.p[1] - r0 * Math.sin(m.phi), m.p[2], 0, 0, m.phi, 0, r0, r0, 0];
    const s = [0.26, 0.26, 0.02, 1.2, 1.2, 0.12, 7, 0.05, 0.05, 0.04];
    this.P = I10(); for (let i = 0; i < NX; i++) this.P[i][i] = s[i] * s[i];
    this.t = t; this.seen = t; this.born = t; this.n = 1; this.who = who;
  }
  predict(t: number) {
    const dt = t - this.t; if (!this.x || !this.P || dt <= 0) return; const x = this.x;
    x[0] += x[3] * dt; x[1] += x[4] * dt; x[5] = wrap(x[5] + x[6] * dt);
    const F = I10(); F[0][3] = dt; F[1][4] = dt; F[5][6] = dt;
    const P = mm(mm(F, this.P), tr(F)), qa = 2.2 * 2.2, qw = 9 * 9, q4 = dt * dt * dt * dt / 4, q3 = dt * dt * dt / 2, q2 = dt * dt;
    P[0][0] += q4 * qa; P[0][3] += q3 * qa; P[3][0] += q3 * qa; P[3][3] += q2 * qa;
    P[1][1] += q4 * qa; P[1][4] += q3 * qa; P[4][1] += q3 * qa; P[4][4] += q2 * qa;
    P[5][5] += q4 * qw; P[5][6] += q3 * qw; P[6][5] += q3 * qw; P[6][6] += q2 * qw;
    P[2][2] += 1e-5 * dt; P[7][7] += 1e-6 * dt; P[8][8] += 1e-6 * dt; P[9][9] += 1e-6 * dt;
    this.P = P; this.t = t;
  }
  hOf(k: number) {
    const x = this.x as number[], odd = k % 2, r = odd ? x[8] : x[7], ph = x[5] + k * PI / 2, c = Math.cos(ph), s = Math.sin(ph);
    const z = [x[0] + r * c, x[1] + r * s, x[2] + (odd ? x[9] : 0), ph];
    const H = [new Array(NX).fill(0), new Array(NX).fill(0), new Array(NX).fill(0), new Array(NX).fill(0)];
    H[0][0] = 1; H[0][5] = -r * s; H[0][odd ? 8 : 7] = c;
    H[1][1] = 1; H[1][5] = r * c; H[1][odd ? 8 : 7] = s;
    H[2][2] = 1; if (odd) H[2][9] = 1;
    H[3][5] = 1;
    return { z, H };
  }
  // 观测的 yaw 属于哪一块板（取预测朝向最近的）
  assoc(phi: number, taken?: number[]) {
    const x = this.x as number[]; let best = -1, bd = 1e9;
    for (let k = 0; k < 4; k++) { if (taken && taken.includes(k)) continue; const d = Math.abs(wrap(phi - x[5] - k * PI / 2)); if (d < bd) { bd = d; best = k; } }
    return { k: best, d: bd };
  }
  update(m: { p: number[]; phi: number }, k: number, Rm: number[][]) {
    const { z, H } = this.hOf(k), y = [m.p[0] - z[0], m.p[1] - z[1], m.p[2] - z[2], wrap(m.phi - z[3])];
    const P0 = this.P as number[][], x = this.x as number[];
    const PHt = mm(P0, tr(H)), S = mm(H, PHt); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) S[i][j] += Rm[i][j];
    const Si = inv4(S), K = mm(PHt, Si);
    let d2 = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) d2 += y[i] * Si[i][j] * y[j];
    // 反转时 yaw 残差连着变大：放开转速协方差，估计在几帧内跟上
    if (Math.abs(y[3]) > 0.22) P0[6][6] += 16;
    for (let i = 0; i < NX; i++) { let s = 0; for (let j = 0; j < 4; j++) s += K[i][j] * y[j]; x[i] += s; }
    x[5] = wrap(x[5]);
    const KH = mm(K, H), IKH = I10(); for (let i = 0; i < NX; i++) for (let j = 0; j < NX; j++) IKH[i][j] -= KH[i][j];
    const P = mm(IKH, P0);
    for (let i = 0; i < NX; i++) for (let j = i + 1; j < NX; j++) { const a = (P[i][j] + P[j][i]) / 2; P[i][j] = P[j][i] = a; }
    this.P = P;
    x[7] = clamp(x[7], 0.1, 0.4); x[8] = clamp(x[8], 0.1, 0.4); x[9] = clamp(x[9], -0.15, 0.15);
    this.n++;
    return d2;
  }
  // τ 秒后的四块板（布局和真值一致）
  facesAt(tau: number) {
    const x = this.x as number[], c = [x[0] + x[3] * tau, x[1] + x[4] * tau], th = x[5] + x[6] * tau, out: Face[] = [];
    for (let k = 0; k < 4; k++) out.push(faceFrame(k, th, c, k % 2 ? x[8] : x[7], x[2] + (k % 2 ? x[9] : 0)));
    return { c: [c[0], c[1], x[2]] as V3, th, faces: out };
  }
  // 第 k 块板 τ 秒后沿垂直视线方向的 1σ 横向不确定度（m）
  sigmaAt(k: number, tau: number, los: number[]) {
    const x = this.x as number[], P = this.P as number[][], odd = k % 2, r = odd ? x[8] : x[7], ph = x[5] + x[6] * tau + k * PI / 2, c = Math.cos(ph), s = Math.sin(ph);
    const lat = [-los[1], los[0]];
    const J = new Array(NX).fill(0);
    J[0] = lat[0]; J[1] = lat[1]; J[3] = lat[0] * tau; J[4] = lat[1] * tau;
    const dp = -r * s * lat[0] + r * c * lat[1]; J[5] = dp; J[6] = dp * tau; J[odd ? 8 : 7] = c * lat[0] + s * lat[1];
    let v = 0; for (let i = 0; i < NX; i++) for (let j = 0; j < NX; j++) v += J[i] * P[i][j] * J[j];
    return Math.sqrt(Math.max(0, v));
  }
  // 中心协方差 (x, y) -> [a, b, 角] （1σ）
  ellipse(): [number, number, number] {
    const P = this.P as number[][];
    const a = P[0][0], b = P[0][1], d = P[1][1], tr_ = (a + d) / 2, det = a * d - b * b, q = Math.sqrt(Math.max(0, tr_ * tr_ - det));
    const l1 = tr_ + q, l2 = Math.max(0, tr_ - q), ang = Math.abs(b) < 1e-12 ? (a >= d ? 0 : PI / 2) : Math.atan2(l1 - a, b);
    return [Math.sqrt(l1), Math.sqrt(l2), ang];
  }
}

// ------------------------------------------------------------------------------------------------ Aimer：预测、选面、弹道
// tauLat：从状态时间戳到弹丸离膛；飞行时间迭代三次
export function plan(trk: Tracker, tauLat: number, piv: number[]) {
  const iters: { tau: number; tfly: number; k: number; p: V3; ang: number; c: V3; los: V3 }[] = [];
  let tfly = 0, sel: Face | null = null, P: ReturnType<Tracker['facesAt']> | null = null;
  const x6 = (trk.x as number[])[6];
  for (let i = 0; i < 3; i++) {
    const tau = tauLat + tfly, fa = trk.facesAt(tau), c = fa.c;
    const los = nrm([c[0] - piv[0], c[1] - piv[1], 0]);
    let best: Face | null = null, bs = -2;
    for (const F of fa.faces) { const to = nrm([piv[0] - F.p[0], piv[1] - F.p[1], 0]), s = F.n[0] * to[0] + F.n[1] * to[1]; if (s > bs) { bs = s; best = F; } }
    sel = best; P = fa;
    const b = best as Face, dx = b.p[0] - piv[0], dy = b.p[1] - piv[1], x = Math.hypot(dx, dy), sol = solvePitch(x - V.muzzle, b.p[2] - piv[2]);
    tfly = sol.t;
    iters.push({ tau, tfly, k: b.j, p: b.p, ang: Math.acos(clamp(bs, -1, 1)), c, los });
  }
  const s = sel as Face, Pf = P as ReturnType<Tracker['facesAt']>, last = iters[2], dx = s.p[0] - piv[0], dy = s.p[1] - piv[1], x = Math.hypot(dx, dy);
  const sol = solvePitch(x - V.muzzle, s.p[2] - piv[2]);
  // 转得太快就没法逐面跟：把 yaw 往"下一块板扫过枪线的位置"混
  const w = Math.abs(x6), lam = clamp((2.2 * TAU - w) / (0.9 * TAU), 0.22, 1);
  const cyaw = Math.atan2(Pf.c[1] - piv[1], Pf.c[0] - piv[0]), fyaw = Math.atan2(dy, dx);
  return { k: s.j, face: s, p: s.p, yaw: cyaw + lam * wrap(fyaw - cyaw), faceYaw: fyaw, pitch: sol.pitch, tfly: sol.t, tau: last.tau, iters, faces: Pf, lam, ang: last.ang, dist: x, center: false, seen: false } as Plan;
}
export type Plan = {
  k: number; face?: Face; p: V3; yaw: number; faceYaw: number; pitch: number; tfly: number; tau: number;
  iters: { tau: number; tfly: number; k: number; p: V3; ang: number; c: V3; los: V3 }[];
  faces?: ReturnType<Tracker['facesAt']>; lam?: number; ang: number; dist: number; center?: boolean; seen?: boolean;
};

// ------------------------------------------------------------------------------------------------ 路线
export type Route = { pts: number[][]; L: number[]; len: number; loop: boolean; speed: number; s: number; kind: 'lap' | 'shuttle' };
// 云台前方的椭圆，从最右端出发，13.1 s 一圈（正好是一轮待机）
export function lapRoute(D: number): Route {
  const a = 0.42, b = 1.1 * D / V.dist, cx = D + 0.08, cy = -0.3 * D / V.dist, N = 240, pts: number[][] = [];
  for (let i = 0; i <= N; i++) { const t = i / N * TAU; pts.push([cx + a * Math.sin(t), cy + b * Math.cos(t)]); }
  return pathRoute(pts, null, true, 'lap');
}
export function pathRoute(pts: number[][], speed: number | null, loop: boolean, kind: 'lap' | 'shuttle' = 'shuttle'): Route {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1], loop: !!loop, speed: speed || L[L.length - 1] / V.period, s: 0, kind };
}
export function routeAt(R: Route, s: number): [number, number] {
  if (R.len <= 1e-6) return [R.pts[0][0], R.pts[0][1]];
  if (R.loop) s = ((s % R.len) + R.len) % R.len; else { const m = ((s % (2 * R.len)) + 2 * R.len) % (2 * R.len); s = m <= R.len ? m : 2 * R.len - m; }
  let i = 1; while (i < R.L.length - 1 && R.L[i] < s) i++;
  const u = (s - R.L[i - 1]) / ((R.L[i] - R.L[i - 1]) || 1), a = R.pts[i - 1], b = R.pts[i];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}
// 每一轮从圈上的这个弧长开始（目标刚好在视野边缘），一圈 13.1 s，下一轮回到同一点
export const LAP_S0 = 0.35;
// 手动放下目标后：在这个距离上左右来回走（碰到两边折返）
export const SHUTTLE_Y = 1.25, SHUTTLE_SPEED = 0.55;
export function shuttleRoute(x: number, y: number, towardPositive: boolean): Route {
  const R = pathRoute([[x, -SHUTTLE_Y], [x, SHUTTLE_Y]], SHUTTLE_SPEED, false, 'shuttle');
  const yy = clamp(y, -SHUTTLE_Y, SHUTTLE_Y), a = yy + SHUTTLE_Y;
  R.s = towardPositive ? a : 2 * R.len - a;
  return R;
}

// ------------------------------------------------------------------------------------------------ 仿真
class Target {
  name: string; c: [number, number]; v: [number, number] = [0, 0]; th = 0; w = 0; wT = 0; lit = true;
  constructor(name: string, c: number[]) { this.name = name; this.c = [c[0], c[1]]; }
  faces(): Face[] { const o: Face[] = []; for (let j = 0; j < 4; j++) o.push(faceFrame(j, this.th, this.c, j % 2 ? V.r2 : V.r1, V.z1 + (j % 2 ? V.dz : 0))); return o; }
}

// 一轮待机的七步：0 发现 1 收敛 2 时间预算 3 预测并选面 4 跟随开火 5 换面 6 反转；最后 0.35 s 收队回位
export const STAGES = [0, 1.5, 3.5, 4.5, 5.0, 9.0, 11.0];
export const RELEASE = 12.75;

export type Mode = 'pred' | 'seen';

export class Sim {
  [k: string]: any;
  constructor(seed?: number, mode?: Mode) {
    this.rand = rng(seed || 52);
    this.cfg = { mode: mode || 'pred', lat: V.latency, dist: V.dist, spin: V.spins[0], auto: true };
    this.t = 0; this.h = V.step; this.k = 0; this.t0 = 0; this.base = 0;
    this.A = new Target('A', [V.dist, 1.1]);
    this.route = lapRoute(V.dist); this.held = null; this.blend = null;
    this.g = { psi: 0, phi: 0.02, dpsi: 0, dphi: 0, cy: 0, cp: 0.02, cdy: 0, cdp: 0 };
    this.trk = new Tracker(); this.pend = []; this.frame = null;
    this.shots = []; this.impacts = []; this.marks = []; this.events = [];
    this.gate = { open: false, why: 'nt', sig: 1, gim: 1, ang: 1, cons: true, cand: -1, eyaw: 0 };
    this.req = 0; this.reqT = 0; this.lastShot = -1; this.burst = 0; this.burstEnd = 0; this.autoFire = false;
    this.cycle = -1; this.phase = 0; this.rev = false; this.stage = 0; this.release = false; this.aimCenter = false;
    this.stats = { shots: 0, hits: 0 }; this.results = [] as number[];
    this.plan = null; this.planCmd = null; this.hist = []; this.yawHist = []; this.lostSince = undefined; this.lastCmd = null; this.lastImpact = null;
    this.lastDry = -1e9; this.dryWhy = '';
  }
  log(type: string, o?: object) { this.events.push(Object.assign({ t: this.t, type }, o || {})); if (this.events.length > 80) this.events.shift(); }
  // 处理延迟（检测、跟踪、瞄准）
  split() { const f = this.cfg.lat / V.latency; return V.split.map((x) => x * f); }
  home() { const c = [this.cfg.dist + 0.08, -0.63 * this.cfg.dist / V.dist]; return { psi: Math.atan2(c[1], c[0]), phi: solvePitch(Math.hypot(c[0], c[1]) - V.muzzle, V.z1 - V.pivotH).pitch }; }

  // ---- 待机剧本：没人碰的时候每 13.1 s 一轮
  scenario() {
    const tc = this.t - this.t0, n = Math.floor(tc / V.period + 1e-9), u = tc - n * V.period;
    this.phase = u;
    if (!this.cfg.auto) { this.autoFire = false; this.stage = -1; this.release = false; this.aimCenter = false; return; }
    if (n !== this.cycle) this.startCycle(n);
    let st = 0; while (st < 6 && u >= STAGES[st + 1]) st++;
    this.stage = st;
    if (u >= 11 && !this.rev) { this.rev = true; this.A.wT = -this.A.wT; this.log('reverse'); }
    this.aimCenter = u < 4.5;
    this.autoFire = u >= 5 && u < RELEASE;
    if (u >= RELEASE && !this.release) {
      this.release = true; this.trk.reset(); this.plan = null; this.planCmd = null; this.lostSince = undefined;
      const h = this.home(); this.g.cy = h.psi; this.g.cp = h.phi; this.g.cdy = 0; this.g.cdp = 0; this.log('release');
    }
  }
  startCycle(n: number) {
    const first = this.cycle < 0; this.cycle = n; this.rev = false; this.release = false;
    const v = (((n + this.base) % 3) + 3) % 3;
    this.cfg.spin = V.spins[v]; this.A.wT = V.spins[v] * TAU; if (first && this.t < 1e-9) this.A.w = this.A.wT;
    if (this.route.kind === 'lap') { this.route.s = LAP_S0; if (this.t < 1e-9 || !this.blend) this.A.c = routeAt(this.route, LAP_S0); }
    this.trk.reset(); this.frame = null; this.plan = null; this.planCmd = null; this.lostSince = undefined;
    const h = this.home(); this.g.cy = h.psi; this.g.cp = h.phi; this.g.cdy = 0; this.g.cdp = 0; this.req = 0; this.burst = 0;
    if (first && this.t < 1e-9) { this.g.psi = h.psi; this.g.phi = h.phi; }
    this.log('cycle', { n, v });
  }

  // ---- 真值：目标运动
  moveTruth(h: number) {
    const A = this.A;
    const dw = clamp(A.wT - A.w, -50 * h, 50 * h); A.w += dw; A.th = wrap(A.th + A.w * h);
    if (this.held) {
      const k = 1 - Math.exp(-h / 0.04), q: [number, number] = [A.c[0], A.c[1]];
      A.c = [q[0] + (this.held[0] - q[0]) * k, q[1] + (this.held[1] - q[1]) * k]; A.v = [(A.c[0] - q[0]) / h, (A.c[1] - q[1]) / h];
      return;
    }
    const R = this.route; R.s += R.speed * h;
    let p: [number, number] = routeAt(R, R.s);
    if (this.blend) {
      const b = this.blend; b.t += h; const k = smooth(clamp(b.t / b.dur, 0, 1));
      p = [b.from[0] + (p[0] - b.from[0]) * k, b.from[1] + (p[1] - b.from[1]) * k];
      if (b.t >= b.dur) this.blend = null;
    }
    A.v = [(p[0] - A.c[0]) / h, (p[1] - A.c[1]) / h]; A.c = p;
  }

  // ---- 曝光时刻 t 的一帧：哪些面能看到、在哪、带 PnP 噪声
  capture() {
    const cam = camOf(this.g), dets: any[] = [], R = this.rand, A = this.A;
    for (const F of A.faces()) {
      const to = sub(cam.o, F.p), dist = len(to), ca = dot(F.n, to) / dist;
      if (ca < 0.33) continue;
      const ends = barEnds(F).map((q) => project(cam, q));
      if (ends.some((e) => !e || Math.abs(e[0]) > 0.97 || Math.abs(e[1]) > V.aspect * 0.97)) continue;
      if (ca < 0.5 && R() < 0.4) continue;
      const los = nrm(sub(F.p, cam.o)), lat = nrm([-los[1], los[0], 0]);
      const sd = 0.012 * dist, sl = 0.005 + 0.0008 * dist, sz = 0.004;
      const p = madd(madd(madd(F.p, los, gauss(R) * sd), lat, gauss(R) * sl), [0, 0, 1], gauss(R) * sz);
      dets.push({ T: 'A', j: F.j, p, phi: wrap(F.ph + gauss(R) * 0.07), corners: (ends as V3[]).map((e) => [e[0] + gauss(R) * 0.0015, e[1] + gauss(R) * 0.0015]), ang: Math.acos(clamp(ca, -1, 1)), dist });
    }
    const snap = { A: { c: [A.c[0], A.c[1]], th: A.th }, g: { psi: this.g.psi, phi: this.g.phi } };
    this.pend.push({ t: this.t, tp: this.t + this.cfg.lat, dets, snap, split: this.split(), lat: this.cfg.lat, k: this.k++ });
  }

  // ---- 处理链跑完一帧：关联、EKF 更新
  process(fr: any) {
    const trk = this.trk, cam = camOf(fr.snap.g);
    fr.used = [];
    if (this.release) { fr.state = null; this.frame = fr; return; }
    if (trk.x) trk.predict(fr.t);
    let fresh = false;
    if (!trk.x) {
      if (fr.dets.length) {
        const best = fr.dets.reduce((a: any, b: any) => (a.ang < b.ang ? a : b));
        trk.init(best, fr.t, 'A'); fresh = true; this.log('detect');
        fr.used.push({ d: best, k: 0 });
      }
    } else {
      // 落在预测面附近的检测才算这台车的
      const pf = trk.facesAt(0).faces, gap = fr.t - trk.seen, gpos = 0.16 + 0.5 * Math.max(0, gap - 0.02);
      const mine = fr.dets.filter((d: any) => pf.some((F) => Math.hypot(F.p[0] - d.p[0], F.p[1] - d.p[1]) < gpos && Math.abs(wrap(F.ph - d.phi)) < 0.7));
      const taken: number[] = [];
      for (const d of mine.slice().sort((a: any, b: any) => a.ang - b.ang)) {
        const a = trk.assoc(d.phi, taken); if (a.k < 0 || a.d > 0.6) continue;
        taken.push(a.k); trk.update(d, a.k, Rmeas(d, cam)); fr.used.push({ d, k: a.k });
      }
      if (fr.used.length) { trk.seen = fr.t; if (this.lostSince !== undefined) { this.log('reacquire', { gap: fr.t - this.lostSince }); this.lostSince = undefined; } }
    }
    // 手推着目标走：EKF 的速度是个常速模型，手一动一停它会滞后、过冲，外推出来的面就会落在手的后面甚至反过来。
    // 拖动期间把估计的速度拉向手实际的速度（相当于把"手在推"当作已知输入），停手时速度随即归零，不再过冲。
    if (trk.x && this.held) { const A = this.A, x = trk.x, k = 0.5; x[3] += (clamp(A.v[0], -3, 3) - x[3]) * k; x[4] += (clamp(A.v[1], -3, 3) - x[4]) * k; }
    if (trk.x && !fresh && !fr.used.length && this.lostSince === undefined) { this.lostSince = fr.t; this.log('coast'); }
    if (trk.x && fr.t - trk.seen > 0.6) { trk.reset(); this.log('lost'); this.lostSince = undefined; }
    fr.state = trk.x ? { x: trk.x.slice(), t: trk.t, n: trk.n, ell: trk.ellipse() } : null;
    this.frame = fr;
    this.hist.push({ t: fr.t, c: trk.x ? [trk.x[0], trk.x[1]] : null }); if (this.hist.length > 240) this.hist.shift();
  }
  // ArmorTracker 的状态机：lost -> detecting -> tracking -> temp_lost
  trackState() {
    const trk = this.trk;
    if (!trk.x) return 'lost';
    if (this.lostSince !== undefined) return 'temp_lost';
    return trk.n >= V.minDetect ? 'tracking' : 'detecting';
  }

  // ---- Aimer：给云台的指令（提前 处理延迟 + 云台到位 + 飞行），以及现在能不能开火
  aim() {
    const trk = this.trk, piv = [0, 0, V.pivotH], fr = this.frame;
    if (this.cfg.mode === 'seen') {
      // 看到哪瞄哪：取最近一次检出里最正的一块，不做任何预测
      const used = fr && fr.used && fr.used.length ? fr.used.slice().sort((a: any, b: any) => a.d.ang - b.d.ang)[0].d : null;
      if (!used) { this.plan = null; this.planCmd = null; return; }
      const dx = used.p[0], dy = used.p[1], x = Math.hypot(dx, dy), sol = solvePitch(x - V.muzzle, used.p[2] - V.pivotH);
      const p = { k: used.j, p: used.p, yaw: Math.atan2(dy, dx), faceYaw: Math.atan2(dy, dx), pitch: sol.pitch, tfly: sol.t, tau: 0, iters: [], ang: used.ang, dist: x, seen: true };
      this.plan = p; this.planCmd = p; return;
    }
    if (!trk.x) { this.plan = null; this.planCmd = null; return; }
    const age = this.t - trk.t;
    if (this.aimCenter) {
      // 预测之前云台只管把估计的中心放在画面中间
      const fa = trk.facesAt(age), c = fa.c, x = Math.hypot(c[0], c[1]), sol = solvePitch(x - V.muzzle - 0.2, c[2] + 0.03 - V.pivotH);
      const p = { k: -1, p: c, yaw: Math.atan2(c[1], c[0]), faceYaw: Math.atan2(c[1], c[0]), pitch: sol.pitch, tfly: sol.t, tau: age, iters: [], ang: PI, dist: x, center: true, faces: fa };
      this.plan = p; this.planCmd = p; return;
    }
    this.planCmd = plan(trk, age + V.tGim, piv);
    this.plan = plan(trk, age, piv);
  }
  gimbalStep(h: number) {
    const g = this.g, P = this.planCmd;
    if (P) {
      const ny = P.yaw, np = P.pitch;
      if (this.lastCmd) { const k = 1 - Math.exp(-h / 0.03); g.cdy += (wrap(ny - this.lastCmd[0]) / h - g.cdy) * k; g.cdp += ((np - this.lastCmd[1]) / h - g.cdp) * k; }
      this.lastCmd = [ny, np]; g.cy = ny; g.cp = np;
    } else { this.lastCmd = null; g.cdy *= 0.9; g.cdp *= 0.9; }
    const W = 42, KP = W * W, KD = 2 * W, AM = 160, VM = 14;
    const ay = clamp(KP * wrap(g.cy - g.psi) + KD * (g.cdy - g.dpsi), -AM, AM), ap = clamp(KP * (g.cp - g.phi) + KD * (g.cdp - g.dphi), -AM, AM);
    g.dpsi = clamp(g.dpsi + ay * h, -VM, VM); g.dphi = clamp(g.dphi + ap * h, -VM, VM);
    g.psi = wrap(g.psi + g.dpsi * h); g.phi = clamp(g.phi + g.dphi * h, -0.3, 0.5);
  }
  // 开火闸门，对应 Aimer 的 is_fire：命中面可打、枪线与命中面一致、命令稳定、云台对齐
  gateStep() {
    const P = this.plan as Plan | null, trk = this.trk, G = this.gate;
    if (!P) { G.open = false; G.why = 'nt'; G.gim = 1; G.ang = 1; G.sig = 1; return; }
    if (P.center) { G.open = false; G.why = 'ctr'; G.gim = 0; G.ang = 0; return; }
    const eyaw = wrap(P.yaw - this.g.psi), ep = P.pitch - this.g.phi;
    // yaw 混合过之后，对准的是板本身：板扫过枪线的时刻放行
    const efy = wrap(P.faceYaw - this.g.psi);
    G.gim = Math.hypot(efy, ep) * P.dist; G.ang = P.ang; G.eyaw = eyaw;
    const okA = P.ang < V.gateFace;
    if (this.cfg.mode === 'seen') {
      G.sig = 0; G.cons = true; G.cand = P.k;
      const okG = G.gim < V.gateGim * 1.4;
      G.open = okG && okA; G.why = G.open ? '' : (!okG ? 'gim' : 'face');
      return;
    }
    const faces = (P.faces as { c: V3; faces: Face[] }).faces, los = nrm([(P.faces as any).c[0], (P.faces as any).c[1], 0]);
    G.sig = trk.sigmaAt(P.k, this.t - trk.t + P.tfly, los);
    // 枪线现在最接近哪块朝向我们的板；要和计划打的那块是同一块
    let cand = -1, ce = 1e9;
    for (const F of faces) {
      if (F.n[0] * (0 - F.p[0]) + F.n[1] * (0 - F.p[1]) <= 0) continue;
      const e = Math.abs(wrap(Math.atan2(F.p[1], F.p[0]) - this.g.psi)) * Math.hypot(F.p[0], F.p[1]);
      if (e < ce) { ce = e; cand = F.j; }
    }
    G.cand = cand; G.cons = cand === P.k;
    const okS = G.sig < V.gateSigma, okG = G.gim < V.gateGim;
    G.open = okS && okG && okA && G.cons && trk.n > 8;
    G.why = G.open ? '' : (!okS || trk.n <= 8 ? 'sig' : !okG ? 'gim' : !okA ? 'face' : 'cons');
  }
  fire(src: string) {
    const F = gimbalFrames(this.g.psi, this.g.phi), fr = this.frame;
    // 枪管散布 0.2°，弹速 ±0.3 m/s：同一个瞄法不会落在同一点
    const R = this.rand, e = 0.2 * D2R, dir = nrm(madd(madd(F.f, F.r, gauss(R) * e), F.u, gauss(R) * e));
    const P = this.plan as Plan | null, A = this.A;
    const s = {
      p: F.muzzle.slice() as V3, v: mul(dir, V.v0 + gauss(R) * 0.3), t0: this.t, trail: [] as V3[], alive: true, src, mode: this.cfg.mode, p0: F.muzzle.slice() as V3,
      aim: P ? (P.p.slice() as V3) : madd(F.muzzle, F.f, Math.hypot(A.c[0], A.c[1])), k: P ? P.k : -1,
      lat: fr ? { split: fr.split, tExp: fr.t, tProc: fr.tp, tFire: this.t } : null, planned: P ? { tfly: P.tfly, tau: P.tau } : null,
      end: 0, hit: null as any, rec: null as any,
    };
    this.shots.push(s); this.lastShot = this.t; this.stats.shots++;
    this.log('fire', { src });
    return s;
  }
  shootStep() {
    const G = this.gate;
    if (this.req > 0 && this.t - this.lastShot >= 0.08) {
      // 按钮只是请求：闸门放行才发射；等了 1.2 s 还没放行就取消这一发
      if (G.open) { this.fire('ui'); this.req--; this.reqT = this.t; }
      else if (this.t - this.reqT > 1.2) { this.req--; this.reqT = this.t; this.lastDry = this.t; this.dryWhy = G.why; this.log('dry', { why: G.why }); }
    } else if (this.autoFire && G.open && this.t - this.lastShot >= 0.08) {
      if (this.burst < 3) { this.fire('auto'); this.burst++; if (this.burst === 3) this.burstEnd = this.t; }
      else if (this.t - this.burstEnd > 0.55) this.burst = 0;
    }
  }
  request() { if (!this.req) this.reqT = this.t; this.req = Math.min(3, this.req + 1); }
  projectiles(h: number) {
    const A = this.A;
    for (const s of this.shots) {
      if (!s.alive) continue;
      const p0 = s.p.slice();
      shotStep(s, h); const p1 = s.p, d = sub(p1, p0);
      s.trail.push(p1.slice() as V3); if (s.trail.length > 60) s.trail.shift();
      let hit: any = null;
      if (Math.hypot(p1[0] - A.c[0], p1[1] - A.c[1]) <= 0.7) {
        for (const F of A.faces()) {
          const dn = dot(d, F.n); if (dn >= 0) continue;
          const u = dot(sub(F.p, p0), F.n) / dn; if (u < 0 || u > 1) continue;
          const q = madd(p0, d, u), a = dot(sub(q, F.p), F.t), b = dot(sub(q, F.p), F.u);
          if (Math.abs(a) <= V.panelW / 2 && Math.abs(b) <= V.panelH / 2) { hit = { kind: 'hit', j: F.j, a, b, q }; break; }
        }
        const rb = Math.hypot(p1[0] - A.c[0], p1[1] - A.c[1]);
        if (!hit && rb < 0.17 && p1[2] > 0.03 && p1[2] < 0.27) hit = { kind: 'body', q: p1.slice() };
      }
      if (!hit && (p1[2] <= 0 || Math.hypot(p1[0], p1[1]) > 11)) hit = { kind: 'miss', q: [p1[0], p1[1], Math.max(0, p1[2])] };
      if (hit) {
        s.alive = false; s.end = this.t; s.hit = hit;
        const rel = [hit.q[0] - A.c[0], hit.q[1] - A.c[1]];
        const rec = Object.assign({ t: this.t, tfly: this.t - s.t0, src: s.src, mode: s.mode, rel, th: A.th, id: this.stats.shots }, hit);
        s.rec = rec;
        this.impacts.push(rec); if (this.impacts.length > 12) this.impacts.shift();
        if (hit.kind === 'hit') { this.marks.push({ t: this.t, j: hit.j, a: hit.a, b: hit.b }); this.stats.hits++; }
        this.results.push(hit.kind === 'hit' ? 1 : 0); if (this.results.length > V.win) this.results.shift();
        this.lastImpact = rec; this.log(hit.kind, { src: s.src, j: hit.j });
      }
    }
    this.shots = this.shots.filter((s: any) => s.alive || this.t - s.end < 0.6);
    this.marks = this.marks.filter((m: any) => this.t - m.t < 1.5);
  }
  step() {
    const h = this.h;
    this.scenario();
    this.moveTruth(h);
    const tc = this.t + 1e-9;
    if (Math.floor(tc * V.camHz) !== Math.floor((tc - h) * V.camHz)) this.capture();
    while (this.pend.length && this.pend[0].tp <= this.t + 1e-9) this.process(this.pend.shift());
    this.aim();
    this.gimbalStep(h);
    this.gateStep();
    this.shootStep();
    this.projectiles(h);
    this.yawHist.push([this.t, this.g.psi]); if (this.yawHist.length > 200) this.yawHist.shift();
    this.t += h;
  }
  advance(T: number, maxSteps?: number) {
    let n = 0; const m = maxSteps || 1e9;
    while (this.t + this.h <= T + 1e-9 && n < m) { this.step(); n++; }
    return n;
  }

  // ---- 有人碰了：待机剧本停下，目标保持当前设置，等"回到待机"
  manual() {
    if (!this.cfg.auto) return;
    this.cfg.auto = false; this.release = false; this.aimCenter = false; this.autoFire = false; this.stage = -1;
  }
  setSpin(rev: number) { this.manual(); this.cfg.spin = rev; this.A.wT = rev * TAU; }
  grab() { this.manual(); this.held = [this.A.c[0], this.A.c[1]]; this.blend = null; if (this.trk.x) { this.trk.x[3] = 0; this.trk.x[4] = 0; } }  // 抓住的一刻目标停下，估计里的巡逻速度作废
  moveTo(x: number, y: number) { if (!this.held) this.grab(); this.held = [clamp(x, 2.0, 6.2), clamp(y, -2.4, 2.0)]; }
  // 放手：就在这个位置、这个距离上左右来回走（往离得远的那一侧先走）
  drop() {
    if (!this.held) return;
    const c = this.A.c; this.held = null;
    this.route = shuttleRoute(c[0], c[1], c[1] < 0);
    this.blend = null;
  }
  // 直接把目标放到 (x, y)，在这个距离上左右来回走
  place(x: number, y: number, towardPositive?: boolean) {
    this.manual();
    x = clamp(x, 2.0, 6.2); y = clamp(y, -2.4, 2.0);
    this.held = null; this.blend = null; this.A.c = [x, y];
    this.route = shuttleRoute(x, y, towardPositive === undefined ? y < 0 : towardPositive);
  }
  nudge(dx: number, dy: number) {
    const c = this.held || this.A.c;
    this.place(c[0] + dx, c[1] + dy, dy !== 0 ? dy > 0 : undefined);
  }
  // 回到待机：目标开回云台前的巡逻圈，一轮剧本从头开始
  resume() {
    if (this.cfg.auto) return;
    this.base += Math.max(this.cycle, 0) + 1;
    this.cfg.auto = true; this.held = null;
    this.blend = { from: [this.A.c[0], this.A.c[1]], t: 0, dur: 1.4 };
    this.route = lapRoute(V.dist); this.route.s = LAP_S0;
    this.t0 = this.t; this.cycle = -1; this.req = 0;
  }
  // 命中率：最近 V.win 发
  rate() { const r = this.results as number[]; let m = 0; for (const v of r) m += v; return { n: r.length, hits: m, total: this.stats.shots, totalHits: this.stats.hits }; }
  // 时间预算：曝光中点 -> 命中
  budget() {
    const sp = this.split(), P = this.planCmd as Plan | null, A = this.A;
    const tfly = P && !P.center ? P.tfly : tof(Math.hypot(A.c[0], A.c[1]) - V.muzzle, 0.03);
    const pre = sp[0] + sp[1] + sp[2] + V.tGim, w = Math.abs(this.trk.x ? (this.trk.x as number[])[6] : A.w);
    return { seg: [['检测', sp[0]], ['跟踪', sp[1]], ['瞄准', sp[2]], ['云台', V.tGim], ['飞行', tfly]] as [string, number][], pre, tfly, delta: pre + tfly, comp: this.cfg.mode === 'pred', turn: w * (pre + tfly) / D2R };
  }
}

// 测量协方差（世界轴）
function Rmeas(d: any, cam: Cam) {
  const los = nrm(sub(d.p, cam.o)), c = los[0], s = los[1], sd = 0.012 * d.dist, sl = 0.005 + 0.0008 * d.dist;
  const xx = c * c * sd * sd + s * s * sl * sl, yy = s * s * sd * sd + c * c * sl * sl, xy = c * s * (sd * sd - sl * sl);
  return [[xx, xy, 0, 0], [xy, yy, 0, 0], [0, 0, 1.6e-5 + 0.0001, 0], [0, 0, 0, 0.07 * 0.07]];
}

// ------------------------------------------------------------------------------------------------ 对照：两台一样的仿真
export class Duel {
  pred: Sim; seen: Sim;
  constructor(seed?: number) { this.pred = new Sim(seed, 'pred'); this.seen = new Sim(seed, 'seen'); }
  get all(): Sim[] { return [this.pred, this.seen]; }
  get t() { return this.pred.t; }
  advance(T: number, maxSteps?: number) { this.pred.advance(T, maxSteps); return this.seen.advance(T, maxSteps); }
  request() { for (const s of this.all) { s.manual(); s.request(); } }
  setSpin(rev: number) { for (const s of this.all) s.setSpin(rev); }
  grab() { for (const s of this.all) s.grab(); }
  moveTo(x: number, y: number) { for (const s of this.all) s.moveTo(x, y); }
  drop() { for (const s of this.all) s.drop(); }
  nudge(dx: number, dy: number) { for (const s of this.all) s.nudge(dx, dy); }
  place(x: number, y: number) { for (const s of this.all) s.place(x, y); }
  resume() { for (const s of this.all) s.resume(); }
  get auto() { return this.pred.cfg.auto as boolean; }
  // 静帧：手动模式，指定转速，先收敛，再每 0.25 s 打一发；停在最后一发命中之后
  settle(spin: number, shots = 8, at?: [number, number]) {
    for (const s of this.all) { s.startCycle(1); s.manual(); s.A.wT = spin * TAU; s.A.w = s.A.wT; if (at) s.place(at[0], at[1]); }
    this.advance(this.t + 3);
    for (let i = 0; i < shots; i++) { this.advance(this.t + 0.25); for (const s of this.all) s.request(); }
    this.runOut();
  }
  // 往后走到所有在飞的弹丸落地，再多走一点，让落点标记还留着
  runOut(maxT = 1.8) {
    const T0 = this.t;
    while (this.t - T0 < maxT && this.all.some((s) => s.shots.some((q: any) => q.alive) || s.req > 0)) this.advance(this.t + 0.01);
    this.advance(this.t + 0.02);
  }
}

// 画图要用的数学小工具
export { PI, TAU, D2R, clamp, wrap, add, sub, mul, dot, cross, len, nrm, madd };
