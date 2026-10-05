/* 主画面里的两台“机器”：云台 + 敌方装甲目标，几何取自旧展示页 5-2 的 gimbalParts / targetParts。
   左边实车和右边仿真用的是同一份面表、同一个投影，只是实车按材质填色、仿真只描线；
   各自按各自时钟（实车墙钟、Webots 仿真时间）取姿态。纯函数，不碰 DOM。

   世界：x 向前，y 向左，z 向上，单位米；等轴投影 sx = (x - y)·cos30·s，sy = (x + y)·sin30·s - z·s。
   相机在 (+,+,+) 一侧，朝向 (1,1,1)：法线与 (1,1,1) 点积为正的面可见，(x + y + z) 大的更近。 */

export type V3 = [number, number, number];
export type Kind = 's' | 'c' | 'l' | 'd';
export type Frame = 'base' | 'yaw' | 'pitch' | 'body';

export interface Face {
  v: V3[];
  /** 反照率 0..1。 */
  alb: number;
  kind: Kind;
  frame: Frame;
  /** 战队色点缀（编码器板、电机端盖）。 */
  team: boolean;
  /** 圆柱侧面第几段（描线时隔一段画一条）。 */
  ci: number;
}

const TAU = Math.PI * 2;
const ALB: Record<string, number> = {
  alu: 0.58,
  graphite: 0.17,
  white: 0.74,
  neutral: 0.46,
  pcb: 0.4,
  glass: 0.06,
  cream: 0.62,
  led: 0.4,
  ic: 0.08,
};

// ------------------------------------------------------------------------------------------------ 向量小工具
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const madd = (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const X: V3 = [1, 0, 0];
const Y: V3 = [0, 1, 0];
const Z: V3 = [0, 0, 1];

type Mat = string;
interface Part {
  frame: Frame;
  faces: Array<{ v: V3[]; mat: Mat; kind: Kind; ci: number }>;
}

function obox(c: V3, u: V3, v: V3, w: V3, a: number, b: number, h: number, mat: Mat, kind: Kind = 's') {
  const P = (su: number, sv: number, sw: number): V3 => [
    c[0] + su * a * u[0] + sv * b * v[0] + sw * h * w[0],
    c[1] + su * a * u[1] + sv * b * v[1] + sw * h * w[1],
    c[2] + su * a * u[2] + sv * b * v[2] + sw * h * w[2],
  ];
  const F: number[][][] = [
    [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]],
    [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
    [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
    [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
    [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]],
  ];
  return F.map((f) => ({ v: f.map((s) => P(s[0], s[1], s[2])), mat, kind, ci: 0 }));
}
const box = (c: V3, half: V3, mat: Mat, kind: Kind = 's') => obox(c, X, Y, Z, half[0], half[1], half[2], mat, kind);

function basis(a: V3): [V3, V3] {
  const ref = Math.abs(a[2]) < 0.9 ? Z : X;
  const e1 = nrm(cross(ref, a));
  return [e1, cross(a, e1)];
}

function cyl(p0: V3, p1: V3, r: number, mat: Mat, n = 12, capMat?: Mat) {
  const a = nrm(sub(p1, p0));
  const [e1, e2] = basis(a);
  const q: V3[] = [];
  const out: Array<{ v: V3[]; mat: Mat; kind: Kind; ci: number }> = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    q.push(add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push({ v: [add(p0, q[i]), add(p0, q[j]), add(p1, q[j]), add(p1, q[i])], mat, kind: 'c', ci: i });
  }
  out.push({ v: q.map((o) => add(p1, o)), mat: capMat ?? mat, kind: 's', ci: 0 });
  out.push({ v: q.map((o) => add(p0, o)).reverse(), mat: capMat ?? mat, kind: 's', ci: 0 });
  return out;
}
const part = (frame: Frame, ...faces: Array<ReturnType<typeof box>>): Part => ({ frame, faces: ([] as Part['faces']).concat(...faces) });

// ------------------------------------------------------------------------------------------------ 几何（米）
const V = {
  r1: 0.2,
  r2: 0.25,
  dz: 0.05,
  tilt: (15 * Math.PI) / 180,
  z1: 0.155,
  panelW: 0.135,
  panelH: 0.125,
  barH: 0.058,
  pivotH: 0.215,
};

function gimbalParts(): Part[] {
  const P: Part[] = [];
  const H = V.pivotH;
  const bolts: Part['faces'][] = [];
  for (const [x, y] of [[0.1, 0.1], [-0.1, 0.1], [0.1, -0.1], [-0.1, -0.1]]) bolts.push(cyl([x, y, 0.012], [x, y, 0.017], 0.007, 'graphite', 6));
  P.push(part('base', box([0, 0, 0.006], [0.13, 0.13, 0.006], 'alu'), ...bolts));
  P.push(part('base', cyl([0, 0, 0.012], [0, 0, 0.058], 0.042, 'graphite', 12)));
  P.push(part('base', cyl([0, 0, 0.058], [0, 0, 0.066], 0.06, 'graphite', 14, 'pcb'), box([0.064, 0, 0.062], [0.006, 0.007, 0.004], 'cream')));
  P.push(part('base', cyl([0, 0, 0.066], [0, 0, 0.088], 0.054, 'graphite', 14)));
  const screws: Part['faces'][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    screws.push(cyl([0.036 * Math.cos(a), 0.036 * Math.sin(a), 0.1], [0.036 * Math.cos(a), 0.036 * Math.sin(a), 0.102], 0.004, 'graphite', 5));
  }
  P.push(part('yaw', cyl([0, 0, 0.088], [0, 0, 0.1], 0.05, 'alu', 14), ...screws));
  const holes: Part['faces'][] = [];
  for (const s of [-1, 1]) for (const z of [0.14, 0.185]) holes.push(obox([0, s * 0.0835, z], X, Y, Z, 0.017, 0.0006, 0.011, 'graphite', 'd'));
  P.push(part('yaw', box([0, 0, 0.104], [0.045, 0.087, 0.004], 'alu'), box([0, 0.079, 0.176], [0.032, 0.004, 0.068], 'alu'), box([0, -0.079, 0.176], [0.032, 0.004, 0.068], 'alu'), ...holes));
  P.push(part('yaw', cyl([0, 0.083, H], [0, 0.108, H], 0.036, 'graphite', 12), cyl([0, 0.108, H], [0, 0.114, H], 0.024, 'pcb', 10)));
  P.push(part('yaw', cyl([0, -0.083, H], [0, -0.097, H], 0.021, 'alu', 10)));
  P.push(part('pitch', box([0, 0, 0], [0.07, 0.068, 0.036], 'graphite'),
    obox([-0.01, 0.0685, -0.004], X, Y, Z, 0.04, 0.0006, 0.004, 'ic', 'd'), obox([-0.01, 0.0685, 0.01], X, Y, Z, 0.04, 0.0006, 0.004, 'ic', 'd')));
  P.push(part('pitch', cyl([0.034, 0.034, 0.036], [0.034, 0.034, 0.05], 0.019, 'alu', 10), cyl([0.034, -0.034, 0.036], [0.034, -0.034, 0.05], 0.019, 'alu', 10)));
  P.push(part('pitch', cyl([0.07, 0, 0], [0.235, 0, 0], 0.011, 'alu', 10), cyl([0.235, 0, 0], [0.25, 0, 0], 0.015, 'graphite', 12)));
  P.push(part('pitch', cyl([-0.036, 0, 0.036], [-0.036, 0, 0.042], 0.012, 'graphite', 8), box([-0.036, 0, 0.07], [0.03, 0.03, 0.028], 'white')));
  P.push(part('pitch', box([0.05, 0, 0.041], [0.013, 0.012, 0.005], 'alu'), box([0.058, 0, 0.058], [0.02, 0.019, 0.019], 'graphite'),
    cyl([0.078, 0, 0.058], [0.096, 0, 0.058], 0.0135, 'graphite', 12), cyl([0.096, 0, 0.058], [0.0975, 0, 0.058], 0.011, 'glass', 12)));
  return P;
}

function faceFrame(j: number, r: number, z: number) {
  const ph = (j * Math.PI) / 2;
  const ct = Math.cos(V.tilt);
  const st = Math.sin(V.tilt);
  const cp = Math.cos(ph);
  const sp = Math.sin(ph);
  return { ph, p: [r * cp, r * sp, z] as V3, n: [cp * ct, sp * ct, st] as V3, t: [-sp, cp, 0] as V3, u: [-cp * st, -sp * st, ct] as V3 };
}

function targetParts(): Part[] {
  const P: Part[] = [];
  P.push(part('body', box([0, 0, 0.09], [0.14, 0.14, 0.016], 'graphite')));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const d: V3 = [Math.cos(a), Math.sin(a), 0];
    const c: V3 = [0.172 * d[0], 0.172 * d[1], 0.05];
    P.push(part('body', box([0.148 * d[0], 0.148 * d[1], 0.084], [0.018, 0.018, 0.012], 'alu'), cyl(madd(c, d, -0.014), madd(c, d, 0.014), 0.05, 'graphite', 12), cyl(madd(c, d, 0.014), madd(c, d, 0.018), 0.022, 'alu', 8)));
  }
  P.push(part('body', cyl([0, 0, 0.106], [0, 0, 0.25], 0.03, 'alu', 10)));
  P.push(part('body', cyl([0, 0, 0.25], [0, 0, 0.264], 0.056, 'graphite', 12), cyl([0, 0, 0.264], [0, 0, 0.268], 0.044, 'glass', 12)));
  for (let j = 0; j < 4; j++) {
    const r = j % 2 ? V.r2 : V.r1;
    const z = V.z1 + (j % 2 ? V.dz : 0);
    const F = faceFrame(j, r, z);
    const faces: Part['faces'] = [];
    const arm0: V3 = [0.03 * Math.cos(F.ph), 0.03 * Math.sin(F.ph), z];
    const arm1 = madd(F.p, F.n, -0.03);
    const ax = nrm(sub(arm1, arm0));
    const av = nrm(cross(Z, ax));
    const aw = cross(ax, av);
    const am = mul(add(arm0, arm1), 0.5);
    const al = len(sub(arm1, arm0)) / 2;
    faces.push(...obox(am, ax, av, aw, al, 0.009, 0.009, 'alu'));
    faces.push(...obox(madd(F.p, F.n, -0.021), F.n, F.t, F.u, 0.009, 0.03, 0.03, 'graphite'));
    faces.push(...obox(madd(F.p, F.n, -0.006), F.n, F.t, F.u, 0.006, V.panelW / 2, V.panelH / 2, 'white'));
    faces.push(...obox(madd(F.p, F.n, 0.0006), F.n, F.t, F.u, 0.0006, V.panelW / 2 - 0.014, V.panelH / 2 - 0.016, 'neutral', 'd'));
    faces.push(...obox(madd(madd(F.p, F.n, 0.0012), F.u, -V.panelH / 2 + 0.008), F.n, F.t, F.u, 0.0006, 0.02, 0.003, 'graphite', 'd'));
    P.push({ frame: 'body', faces });
    const bars: Part['faces'] = [];
    for (const s of [-1, 1]) bars.push(...obox(madd(madd(F.p, F.t, s * (V.panelW / 2 + 0.007)), F.n, -0.004), F.n, F.t, F.u, 0.006, 0.0065, V.barH / 2, 'led', 'l'));
    P.push({ frame: 'body', faces: bars });
  }
  return P;
}

function flatten(parts: Part[]): Face[] {
  const out: Face[] = [];
  for (const pt of parts) {
    for (const f of pt.faces) out.push({ v: f.v, alb: ALB[f.mat] ?? 0.4, kind: f.kind, frame: pt.frame, team: f.mat === 'pcb', ci: f.ci });
  }
  return out;
}

let GIM: Face[] | null = null;
let TGT: Face[] | null = null;
const gimbalFaces = (): Face[] => GIM ?? (GIM = flatten(gimbalParts()));
const targetFaces = (): Face[] => TGT ?? (TGT = flatten(targetParts()));

// ------------------------------------------------------------------------------------------------ 场景布局（世界米）
/** 云台底座中心、放大倍数。 */
export const GIMBAL_AT: V3 = [-0.3, 0, 0];
export const GIMBAL_K = 1.6;
/** 目标车放大倍数。 */
export const TARGET_K = 1.2;
/** 地板（x 向前 y 向左）。 */
export const SLAB = { x0: -0.62, x1: 1.0, y0: -0.42, y1: 0.42, t: 0.05 };
/** 地板中心，投影时当作原点。 */
export const SLAB_C: V3 = [(SLAB.x0 + SLAB.x1) / 2, 0, 0];

export interface Pose {
  /** 车体中心（世界）。 */
  c: [number, number];
  /** 小陀螺转角。 */
  th: number;
  psi: number;
  phi: number;
}

/** 时刻 t（秒）：目标一边前后左右平移一边小陀螺，云台跟着它转。 */
export function poseAt(t: number): Pose {
  const cx = 0.56 + 0.1 * Math.sin((TAU * t) / 5.3 + 0.6);
  const cy = 0.2 * Math.sin((TAU * t) / 2.9);
  const dx = cx - GIMBAL_AT[0];
  const dy = cy - GIMBAL_AT[1];
  const psi = Math.atan2(dy, dx);
  const phi = Math.atan2(0.2 - V.pivotH * GIMBAL_K, Math.hypot(dx, dy));
  return { c: [cx, cy], th: (TAU * t) / 2.4, psi, phi };
}

// ------------------------------------------------------------------------------------------------ 投影与出面
const C30 = Math.cos(Math.PI / 6);
export type P2 = [number, number];

export function project(p: V3, s: number): P2 {
  const x = p[0] - SLAB_C[0];
  const y = p[1] - SLAB_C[1];
  return [(x - y) * C30 * s, (x + y) * 0.5 * s - p[2] * s];
}

export interface DrawFace {
  pts: P2[];
  /** 越大越近。 */
  depth: number;
  /** 0..1 明暗（含反照率）。 */
  tone: number;
  kind: Kind;
  team: boolean;
  ci: number;
}

const LIGHT = nrm([-0.2, 0.55, 0.8]);

function emit(out: DrawFace[], f: Face, q: V3[], s: number): void {
  const n = nrm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
  if (n[0] + n[1] + n[2] <= 0) return;
  let dep = 0;
  for (const p of q) dep += p[0] + p[1] + p[2];
  const lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  out.push({
    pts: q.map((p) => project(p, s)),
    depth: dep / q.length,
    tone: f.alb * (0.42 + 0.58 * lam) * (f.kind === 'd' ? 0.6 : 1),
    kind: f.kind,
    team: f.team,
    ci: f.ci,
  });
}

/** 一台机器在 pose 下的所有可见面（已按由远到近排好）。 */
export function rigFaces(pose: Pose, s: number): DrawFace[] {
  const out: DrawFace[] = [];
  const cy = Math.cos(pose.psi);
  const sy = Math.sin(pose.psi);
  const cp = Math.cos(pose.phi);
  const sp = Math.sin(pose.phi);
  for (const f of gimbalFaces()) {
    const q = f.v.map((p): V3 => {
      let x = p[0];
      let y = p[1];
      let z = p[2];
      if (f.frame === 'pitch') {
        const nx = x * cp - z * sp;
        const nz = x * sp + z * cp + V.pivotH;
        x = nx;
        z = nz;
      }
      if (f.frame !== 'base') {
        const nx = x * cy - y * sy;
        const ny = x * sy + y * cy;
        x = nx;
        y = ny;
      }
      return [GIMBAL_AT[0] + x * GIMBAL_K, GIMBAL_AT[1] + y * GIMBAL_K, z * GIMBAL_K];
    });
    emit(out, f, q, s);
  }
  const ct = Math.cos(pose.th);
  const st = Math.sin(pose.th);
  for (const f of targetFaces()) {
    const q = f.v.map((p): V3 => [pose.c[0] + (p[0] * ct - p[1] * st) * TARGET_K, pose.c[1] + (p[0] * st + p[1] * ct) * TARGET_K, p[2] * TARGET_K]);
    emit(out, f, q, s);
  }
  out.sort((a, b) => a.depth - b.depth);
  return out;
}

/** 云台镜头的世界位置（连线、引出线用）。 */
export function cameraPoint(pose: Pose): V3 {
  const p: V3 = [0.0975, 0, 0.058];
  const cp = Math.cos(pose.phi);
  const sp = Math.sin(pose.phi);
  const x1 = p[0] * cp - p[2] * sp;
  const z1 = p[0] * sp + p[2] * cp + V.pivotH;
  const cy = Math.cos(pose.psi);
  const sy = Math.sin(pose.psi);
  return [GIMBAL_AT[0] + (x1 * cy) * GIMBAL_K, GIMBAL_AT[1] + (x1 * sy) * GIMBAL_K, z1 * GIMBAL_K];
}

/** 地板上的一个点（世界）转成画面点。 */
export const ground = (x: number, y: number, z: number, s: number): P2 => project([x, y, z], s);

/** 地板四周的外轮廓（画面上六个点，顺时针从后角起）：用来画地板块的侧面。 */
export function slabCorners(s: number): { top: P2[]; bottom: P2[] } {
  const { x0, x1, y0, y1, t } = SLAB;
  const top: P2[] = [project([x0, y1, 0], s), project([x1, y1, 0], s), project([x1, y0, 0], s), project([x0, y0, 0], s)];
  const bottom: P2[] = [project([x0, y1, -t], s), project([x1, y1, -t], s), project([x1, y0, -t], s), project([x0, y0, -t], s)];
  return { top, bottom };
}
