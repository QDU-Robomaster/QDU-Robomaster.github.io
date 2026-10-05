/* AutoAim · 画面：等轴场景（云台、小陀螺目标、靶场扇形垫、弹道）和右侧的俯视小图，都输出 SVG 字符串。
 * 颜色全部走 CSS 类 / var(--token)，主题切换时不用重画；这里只在明暗不同的地方用 color-mix 配面的明度。
 * 模块顶层不碰 window / document。 */
import { V, TAU, PI, D2R, clamp, nrm, sub, dot, cross, madd, faceFrame, camOf, project, barEnds, gimbalXf, gimbalFrames, shotStep, SHUTTLE_Y, type V3, type Plan, type Face } from './sim';

export type Cls = Record<string, string>;
const f1 = (v: number) => v.toFixed(1);
const FAN = { a0: -30 * D2R, a1: 30 * D2R, r0: 1.3, r1: 5.2 };

// ------------------------------------------------------------------------------------------------ 视角
export type View = {
  W: number; H: number; s: number; phi: number; narrow: boolean; vv: V3; mt: number; mg: number;
  pr: (p: number[]) => [number, number, number];
  un: (px: number, py: number, z: number) => [number, number];
};
/* 世界：x 朝靶场，y 向右，z 向上。窄屏把视角转得更"竖"一点，目标在画面里能大一些。 */
export function sceneView(W: number, H: number): View {
  const narrow = W < 620, phi = (narrow ? 58 : 20) * D2R, el = (narrow ? 34 : 27) * D2R;
  const cp = Math.cos(phi), sp = Math.sin(phi), se = Math.sin(el), ce = Math.cos(el);
  const raw = (x: number, y: number, z: number): [number, number, number] => { const D = -x * sp + y * cp; return [x * cp + y * sp, D * se - z * ce, D * ce + z * se]; };
  // 取景只框云台和目标的活动区；扇形垫比取景大，边缘被画面裁掉
  const mt = narrow ? 2.3 : 2.0, mg = narrow ? 2.0 : 1.9;
  const pts: number[][] = [[0, 0, 0.42 * mg], [-0.32 * mg, -0.32 * mg, 0], [-0.32 * mg, 0.32 * mg, 0], [0.32 * mg, 0.32 * mg, 0], [0.32 * mg, -0.32 * mg, 0]];
  for (const x of [2.6, 5.0]) for (const y of [-1.9, 1.4]) pts.push([x, y, 0], [x, y, 0.4 * mt]);
  for (let r = 2; r <= 5; r++) pts.push([r * Math.cos(FAN.a1), r * Math.sin(FAN.a1), 0]);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { const r = raw(p[0], p[1], p[2]); x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1]); }
  const mL = 14, mR = 14, mT = narrow ? 44 : 30, mB = 28;
  const s = Math.min((W - mL - mR) / (x1 - x0), (H - mT - mB) / (y1 - y0));
  const ox = mL + ((W - mL - mR) - (x1 - x0) * s) / 2 - x0 * s, oy = mT + ((H - mT - mB) - (y1 - y0) * s) / 2 - y0 * s;
  const view: View = {
    W, H, s, phi, narrow, mt, mg, vv: [-sp * ce, cp * ce, se],
    pr: (p) => { const r = raw(p[0], p[1], p[2]); return [ox + r[0] * s, oy + r[1] * s, r[2]]; },
    un: (px, py, z) => { const X = (px - ox) / s, Y = (py - oy) / s, D = (Y + z * ce) / se; return [X * cp - D * sp, X * sp + D * cp]; },
  };
  checkRoundTrip(view);
  return view;
}
/* 往返断言：世界 -> 屏幕 -> 世界必须回到原点，且世界 +y 对应屏幕向右、+x 对应屏幕向上（拖动方向靠它）。出错只在控制台报，不影响画面。 */
export function checkRoundTrip(v: View): number {
  let worst = 0;
  for (const [x, y, z] of [[3, 0, 0], [4, 1.2, 0.28], [5, -1.5, 0.28], [2.2, 0.6, 0]]) {
    const q = v.pr([x, y, z]), u = v.un(q[0], q[1], z);
    worst = Math.max(worst, Math.hypot(u[0] - x, u[1] - y));
  }
  const o = v.pr([3, 0, 0]), dy = v.pr([3, 0.5, 0]), dx = v.pr([3.5, 0, 0]);
  if (!(dy[0] > o[0] && dx[1] < o[1])) worst = Math.max(worst, 1);
  if (worst > 1e-6) console.error('[AutoAim] 投影/逆投影往返误差 ' + worst);
  return worst;
}
// 目标可以拖到的范围（极坐标：离云台 1.9–5.0 m，偏角 ±27°）
export function clampTarget(x: number, y: number): [number, number] {
  let r = Math.hypot(x, y), a = Math.atan2(y, x);
  r = clamp(r, 1.9, 5.0); a = clamp(a, -27 * D2R, 27 * D2R);
  return [r * Math.cos(a), r * Math.sin(a)];
}

const pts = (a: ArrayLike<number>[]) => a.map((q) => f1(q[0]) + ',' + f1(q[1])).join(' ');
const dstr = (a: ArrayLike<number>[]) => a.map((q, i) => (i ? 'L' : 'M') + f1(q[0]) + ' ' + f1(q[1])).join('');

// ------------------------------------------------------------------------------------------------ 地面：扇形靶场垫
// 云台和目标按 mg / mt 倍放大（以各自的底座为中心），靠近它们的点（弹道、枪线、估计椭圆）跟着一起被推开，
// 过渡区 0.5–3 m 内平滑回到真实位置。放大只是为了让模型在 4 m 的靶场里看得清。
function makeWarp(v: View, c: number[]) {
  const Mt = v.mt, Mg = v.mg, R0 = 0.5, R1 = 3.0;
  const w = (d: number) => { const u = clamp((R1 - d) / (R1 - R0), 0, 1); return u * u * (3 - 2 * u); };
  return (p: number[]): number[] => {
    const wg = w(Math.hypot(p[0], p[1], p[2] - 0.1)), wt = w(Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - 0.1));
    return [p[0] + (Mg - 1) * p[0] * wg + (Mt - 1) * (p[0] - c[0]) * wt, p[1] + (Mg - 1) * p[1] * wg + (Mt - 1) * (p[1] - c[1]) * wt, p[2] + (Mg - 1) * p[2] * wg + (Mt - 1) * p[2] * wt];
  };
}

export function groundSvg(v: View, cls: Cls): string {
  const P = (x: number, y: number) => v.pr([x, y, 0]);
  const arc = (r: number, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = FAN.a0 + (FAN.a1 - FAN.a0) * i / n; return P(r * Math.cos(a), r * Math.sin(a)); });
  let s = `<polygon class="${cls.fan}" points="${pts(arc(FAN.r1).concat(arc(FAN.r0).reverse()))}"/>`;
  for (let a = -30; a <= 30; a += 10) { const A = a * D2R, p = P(FAN.r0 * Math.cos(A), FAN.r0 * Math.sin(A)), q = P(FAN.r1 * Math.cos(A), FAN.r1 * Math.sin(A)); s += `<path class="${a === 0 ? cls.glS : cls.gl}" d="${dstr([p, q])}"/>`; }
  for (let r = 2; r <= 5; r++) {
    s += `<path class="${cls.gl}" d="${dstr(arc(r))}"/>`;
    const q = P(r * Math.cos(FAN.a1), r * Math.sin(FAN.a1));
    s += `<text class="${cls.lab}" x="${f1(q[0] + 6)}" y="${f1(q[1] + 11)}">${r} m</text>`;
  }
  s += `<path class="${cls.glS}" d="${dstr(arc(FAN.r1))}"/><path class="${cls.glS}" d="${dstr(arc(FAN.r0))}"/>`;
  return s;
}

// ------------------------------------------------------------------------------------------------ 网格：面的列表，按需变换、剔除背面、排序
type Face = { f: string; v: V3[]; tone: number; kind: 'm' | 'a' | 'b' | 'd' | 'l'; bias?: number };
const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
const FT = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
  [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]];
function box(f: string, c: number[], h: number[], tone = 0.3, kind: Face['kind'] = 'm', ax: [V3, V3, V3] = [X, Y, Z], bias = 0): Face[] {
  const pt = (a: number, b: number, d: number): V3 => [0, 1, 2].map((i) => c[i] + a * h[0] * ax[0][i] + b * h[1] * ax[1][i] + d * h[2] * ax[2][i]) as V3;
  return FT.map((q) => ({ f, v: q.map((w) => pt(w[0], w[1], w[2])), tone, kind, bias }));
}
// 圆柱：轴 a，e1 × e2 = a
function cyl(f: string, c: number[], a: V3, e1: V3, e2: V3, r: number, hh: number, tone = 0.3, kind: Face['kind'] = 'm', n = 14): Face[] {
  const ring = (k: number) => Array.from({ length: n }, (_, i) => { const t = i / n * TAU, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [0, 1, 2].map((j) => c[j] + a[j] * hh * k + e1[j] * cs + e2[j] * sn) as V3; });
  const top = ring(1), bot = ring(-1), out: Face[] = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push({ f, v: [bot[i], bot[j], top[j], top[i]], tone, kind }); }
  out.push({ f, v: top, tone, kind }); out.push({ f, v: bot.slice().reverse(), tone, kind });
  return out;
}

let GIM: Face[] | null = null;
function gimbalMesh(): Face[] {
  if (GIM) return GIM;
  const M: Face[] = [];
  // 底座：板、板沿的战队色条、立柱（base）
  M.push(...box('b', [0, 0, 0.008], [0.17, 0.15, 0.008], 0.2));
  M.push(...box('b', [0.135, 0, 0.0195], [0.032, 0.15, 0.0035], 0, 'a'));
  M.push(...box('b', [0, 0, 0.05], [0.075, 0.075, 0.034], 0.62));
  // 偏航电机和编码器环（yaw 转）：环上八个刻度，0° 那个是战队色
  M.push(...cyl('y', [0, 0, 0.109], Z, X, Y, 0.06, 0.025, 0.45));
  M.push(...cyl('y', [0, 0, 0.1425], Z, X, Y, 0.078, 0.0085, 0.12, 'm', 18));
  for (let k = 0; k < 8; k++) {
    const t = k * PI / 4, e1: V3 = [Math.cos(t), Math.sin(t), 0], e2: V3 = [-Math.sin(t), Math.cos(t), 0];
    M.push(...box('y', [0.078 * e1[0], 0.078 * e1[1], 0.1545], [0.007, 0.0035, 0.0035], 0.2, k === 0 ? 'a' : 'm', [e1, e2, Z]));
  }
  // 俯仰架：底块加两块侧板（yaw 转）
  M.push(...box('y', [0, 0, 0.168], [0.045, 0.075, 0.012], 0.5));
  M.push(...box('y', [0, 0.07, 0.225], [0.052, 0.007, 0.05], 0.3));
  M.push(...box('y', [0, -0.07, 0.225], [0.052, 0.007, 0.05], 0.3));
  // 俯仰电机（沿 y 轴，在侧板外）
  M.push(...cyl('p', [0, 0.092, 0], Y, Z, X, 0.032, 0.013, 0.55));
  M.push(...cyl('p', [0, -0.092, 0], Y, Z, X, 0.032, 0.013, 0.55));
  // 俯仰体：发射机构、枪管、枪口环，相机在上面（pitch 转）
  M.push(...box('p', [0.02, 0, 0], [0.075, 0.055, 0.035], 0.55));
  M.push(...box('p', [0.16, 0, -0.012], [0.09, 0.011, 0.011], 0.7));
  M.push(...box('p', [0.232, 0, -0.012], [0.012, 0.02, 0.02], 0, 'a'));
  M.push(...box('p', [0.0975, 0, 0.058], [0.03, 0.026, 0.022], 0.25));
  M.push(...cyl('p', [0.133, 0, 0.058], X, Y, Z, 0.017, 0.009, 1, 'l'));
  GIM = M; return M;
}

let TGT: Face[] | null = null;
function targetMesh(): Face[] {
  if (TGT) return TGT;
  const M: Face[] = [];
  M.push(...box('t', [0, 0, 0.09], [0.14, 0.14, 0.016], 0.45));
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + i * PI / 2, d: V3 = [Math.cos(a), Math.sin(a), 0], pp: V3 = [-d[1], d[0], 0];
    M.push(...box('t', [0.172 * d[0], 0.172 * d[1], 0.05], [0.015, 0.05, 0.05], 0.85, 'm', [d, pp, Z]));
  }
  M.push(...box('t', [0, 0, 0.178], [0.03, 0.03, 0.072], 0.35));
  M.push(...box('t', [0, 0, 0.257], [0.05, 0.05, 0.011], 0.15));
  for (let j = 0; j < 4; j++) {
    const r = j % 2 ? V.r2 : V.r1, z = V.z1 + (j % 2 ? V.dz : 0), F = faceFrame(j, 0, [0, 0], r, z), ph = F.ph;
    const ex: V3 = [Math.cos(ph), Math.sin(ph), 0], ey: V3 = [-Math.sin(ph), Math.cos(ph), 0], ax: [V3, V3, V3] = [F.n, F.t, F.u];
    M.push(...box('t', [ex[0] * r * 0.5, ex[1] * r * 0.5, z], [r * 0.5 - 0.02, 0.009, 0.009], 0.5, 'm', [ex, ey, Z]));
    M.push(...box('t', madd(F.p, F.n, -0.006), [0.006, V.panelW / 2, V.panelH / 2], 0.05, 'm', ax));
    const q = (su: number, sv: number): V3 => madd(madd(madd(F.p, F.n, 0.0011), F.t, su), F.u, sv);
    M.push({ f: 't', v: [q(-0.026, -0.026), q(0.026, -0.026), q(0.026, 0.026), q(-0.026, 0.026)], tone: 0, kind: 'd', bias: 0.04 });
    for (const sg of [-1, 1]) M.push(...box('t', madd(madd(F.p, F.t, sg * V.barX), F.n, -0.002), [0.006, V.barW / 2, V.barH / 2], 0, 'b', ax, 0.05));
  }
  TGT = M; return M;
}

const LIGHT = nrm([-0.45, 0.55, 0.75]);
function fillOf(n: V3, tone: number, dark: boolean) {
  const lit = clamp(0.3 + 0.7 * Math.max(0, dot(n, LIGHT)), 0, 1);
  const p = dark ? (6 + 34 * lit) * (1 - 0.7 * tone) : 2 + 26 * (1 - lit) + 58 * tone * (0.6 + 0.4 * (1 - lit));
  return `fill:color-mix(in srgb,var(--paper-raised) ${(100 - p).toFixed(0)}%,var(--ink) ${p.toFixed(0)}%)`;
}
function render(F: Face[], xf: (f: string, p: V3) => V3, v: View, dark: boolean, cls: Cls): string {
  const out: { d: number; s: string }[] = [];
  for (const f of F) {
    const w = f.v.map((p) => xf(f.f, p));
    const n = nrm(cross(sub(w[1], w[0]), sub(w[2], w[0])));
    const facing = dot(n, v.vv);
    if (facing <= 0.02) continue;
    // 灯条和贴图在掠射角（接近侧面）上淡出，而不是在阈值处突然出现 / 消失
    const fade = f.kind === 'd' || f.kind === 'b' ? clamp((facing - 0.02) / 0.2, 0, 1) : 1;
    let d = 0; const q = w.map((p) => { const r = v.pr(p); d += r[2]; return r; });
    const c = f.kind === 'm' ? cls.fo : f.kind === 'a' ? cls.fa : f.kind === 'b' ? cls.fb : f.kind === 'd' ? cls.fd : cls.fl;
    out.push({ d: d / w.length + (f.bias || 0), s: `<polygon class="${c}"${fade < 1 ? ` opacity="${fade.toFixed(2)}"` : ''}${f.kind === 'm' ? ` style="${fillOf(n, f.tone, dark)}"` : ''} points="${pts(q)}"/>` });
  }
  out.sort((a, b) => a.d - b.d);
  return out.map((o) => o.s).join('');
}

// ------------------------------------------------------------------------------------------------ 场景
function quad(F: { p: number[]; t: number[]; u: number[] }, hw: number, hh: number, v: View) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => v.pr(madd(madd(F.p, F.t, hw * a), F.u, hh * b)));
}
function ellipseGround(cx: number, cy: number, E: number[], k: number, v: View, n = 40) {
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n * TAU, ex = k * E[0] * Math.cos(u), ey = k * E[1] * Math.sin(u); return v.pr([cx + ex * Math.cos(E[2]) - ey * Math.sin(E[2]), cy + ex * Math.sin(E[2]) + ey * Math.cos(E[2]), 0]); });
}

/* 显示上的面直接用仿真真值（EKF、闸门、开火、命中率统计照旧用估计，相机卡里的检测框照旧）：
 * - "看到的面"：真实目标上当前对相机可见的那几块板，真值位姿；朝向越接近侧面越淡，不会突然出现 / 消失；
 * - t+Δ 的四个面：目标运动模型（匀速 + 匀转速）的真值外推 Δ 之后的位姿。 */
function visibleTruth(S: any): { F: Face; op: number }[] {
  const cam = camOf(S.g), out: { F: Face; op: number }[] = [];
  for (const F of S.A.faces() as Face[]) {
    const to = sub(cam.o, F.p), dist = Math.hypot(to[0], to[1], to[2]), ca = dot(F.n, to) / dist;
    if (ca < 0.33) continue;
    const ends = barEnds(F).map((q) => project(cam, q));
    if (ends.some((e) => !e || Math.abs(e[0]) > 0.97 || Math.abs(e[1]) > V.aspect * 0.97)) continue;
    out.push({ F, op: clamp((ca - 0.33) / 0.2, 0.25, 1) });
  }
  return out;
}
function truthPred(S: any, pred: Plan): Face[] {
  const A = S.A, dt = Math.max(0, pred.tau - (S.t - S.trk.t));
  const c = [A.c[0] + A.v[0] * dt, A.c[1] + A.v[1] * dt], th = A.th + A.w * dt;
  return [0, 1, 2, 3].map((j) => faceFrame(j, th, c, j % 2 ? V.r2 : V.r1, V.z1 + (j % 2 ? V.dz : 0)));
}

export function buildScene(S: any, v0: View, dark: boolean, cls: Cls): string {
  const A = S.A, trk = S.trk, fr = S.frame, g = S.g, c = A.c, th = A.th, ct = Math.cos(th), st = Math.sin(th);
  const Pc = S.planCmd as Plan | null, pred = Pc && Pc.faces && !Pc.center && S.cfg.mode === 'pred' ? Pc : null;
  const W = makeWarp(v0, c), v: View = { ...v0, pr: (p) => v0.pr(W(p)) };
  let s = '';
  /* 弹道的画法（和旧版 5-2 一样）：起点、终点各自按模型的放大画到屏幕上，中间沿这两点的连线走，
   * 真实弹道相对"枪口到落点连线"的下坠量（世界坐标里采样）夸大后叠在竖直方向。
   * 屏幕位置 = 直线 + 只随进度变化的竖直量，所以不会自交；弹丸和弧线用的是同一个映射，沿同一条线飞。 */
  const flight = (p0: number[], aim: number[], p: number[], onChord = false): [number, number, number] => {
    const D = Math.hypot(aim[0] - p0[0], aim[1] - p0[1]) || 1, a = Math.hypot(p[0] - p0[0], p[1] - p0[1]) / D;
    const A0 = W(onChord ? [p0[0], p0[1], 0] : p0), A1 = W(onChord ? [aim[0], aim[1], 0] : aim), sag = p[2] - (p0[2] + (aim[2] - p0[2]) * a);
    return v0.pr([A0[0] + (A1[0] - A0[0]) * a, A0[1] + (A1[1] - A0[1]) * a, A0[2] + (A1[2] - A0[2]) * a + (onChord ? 0 : sag) * 0.5 * (v0.mg + v0.mt)]);
  };

  // ---- 地面：巡逻路线、目标的两圈半径、落点、估计的椭圆
  if (S.route.kind === 'lap') s += `<path class="${cls.route}" d="${dstr(S.route.pts.map((p: number[]) => v0.pr([p[0], p[1], 0])))}"/>`;
  else s += `<path class="${cls.route}" d="${dstr([v0.pr([S.route.pts[0][0], -SHUTTLE_Y, 0]), v0.pr([S.route.pts[0][0], SHUTTLE_Y, 0])])}"/>`;
  for (const r of [V.r1, V.r2]) s += `<polyline class="${cls.ring}" points="${pts(Array.from({ length: 41 }, (_, i) => v.pr([c[0] + r * Math.cos(i / 40 * TAU), c[1] + r * Math.sin(i / 40 * TAU), 0])))}"/>`;
  for (const r of S.impacts) {
    const age = S.t - r.t; if (age < 0.05 || age > 7 || r.kind === 'hit') continue;
    const q = v.pr([r.q[0], r.q[1], 0]), a = clamp(1 - age / 7, 0.15, 1);
    s += r.kind === 'body'
      ? `<circle class="${cls.miss}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="3.4" opacity="${a.toFixed(2)}"/>`
      : `<path class="${cls.miss}" opacity="${a.toFixed(2)}" d="M${f1(q[0] - 3.5)} ${f1(q[1] - 3.5)}L${f1(q[0] + 3.5)} ${f1(q[1] + 3.5)}M${f1(q[0] + 3.5)} ${f1(q[1] - 3.5)}L${f1(q[0] - 3.5)} ${f1(q[1] + 3.5)}"/>`;
  }
  let now: any = null;
  if (trk.x && fr) {
    now = trk.facesAt(S.t - trk.t);
    const E = trk.ellipse(), cc = v.pr([now.c[0], now.c[1], 0]);
    s += `<polyline class="${cls.est}" points="${pts(ellipseGround(now.c[0], now.c[1], E, 2, v))}"/>`;
    s += `<path class="${cls.est}" d="M${f1(cc[0] - 5)} ${f1(cc[1])}L${f1(cc[0] + 5)} ${f1(cc[1])}M${f1(cc[0])} ${f1(cc[1] - 3)}L${f1(cc[0])} ${f1(cc[1] + 3)}"/>`;
  }

  // ---- 目标
  s += render(targetMesh(), (_f, p) => [c[0] + p[0] * ct - p[1] * st, c[1] + p[0] * st + p[1] * ct, p[2]], v, dark, cls);

  // ---- 枪线和下坠弹道：枪管抬着，弹丸沿弧落到板上
  {
    const F = gimbalFrames(g.psi, g.phi), dist = pred ? Math.hypot(pred.p[0], pred.p[1]) - 0.25 : Math.hypot(c[0], c[1]), m = F.muzzle;
    const sight = [v.pr(m), v.pr(madd(m, F.f, dist + 0.3))];
    s += `<path class="${cls.sight}" d="${dstr(sight)}"/>`;
    const sh = { p: m.slice() as number[], v: F.f.map((k) => k * V.v0) as number[] }, ap: number[][] = [m.slice()];
    for (let i = 0; i < 72; i++) { shotStep(sh, 0.008); ap.push(sh.p.slice()); if (sh.p[2] < 0 || Math.hypot(sh.p[0], sh.p[1]) > dist + 0.02) break; }
    const e = ap[ap.length - 1], fl = ap.map((p) => flight(m, e, p)), gr = ap.map((p) => flight(m, e, p, true));
    s += `<path class="${cls.arcG}" d="${dstr([gr[0], gr[gr.length - 1]])}"/><path class="${cls.arc}" d="${dstr(fl)}"/>`;
    const lp = sight[0], lq = fl[Math.floor(fl.length * 0.5)], lt = sight[1];
    if (!v.narrow) s += `<text class="${cls.lab}" x="${f1(lq[0] - 6)}" y="${f1(lq[1] + 18)}">下坠弹道</text>`;
    if (!v.narrow) s += `<text class="${cls.lab}" x="${f1(lp[0] + (lt[0] - lp[0]) * 0.1 - 4)}" y="${f1(lp[1] + (lt[1] - lp[1]) * 0.1 - 10)}">枪管 · 相机同轴</text>`;
  }

  // ---- 看到的面（真值位姿，当前对相机可见的板）：实线框；t+Δ 的四个面（真值外推）：虚线，打的那块实线加十字
  for (const { F, op } of visibleTruth(S)) {
    s += `<polygon data-j="s${F.j}" class="${cls.seen}" opacity="${op.toFixed(2)}" points="${pts(quad(F, V.panelW / 2 + 0.02, V.panelH / 2 + 0.02, v))}"/>`;
  }
  if (pred && now) {
    const pf = truthPred(S, pred), dt = Math.max(0, pred.tau - (S.t - trk.t)), k = pred.k;
    for (const F of pf) {
      const sel = F.j === k;
      s += `<polygon data-j="p${F.j}" class="${sel ? cls.predSel : cls.pred}" points="${pts(quad(F, V.panelW / 2 + 0.012, V.panelH / 2 + 0.012, v))}"/>`;
    }
    const r = (k % 2 ? V.r2 : V.r1) + 0.05, a0 = A.th + k * PI / 2, a1 = a0 + A.w * dt, zz = V.z1 + (k % 2 ? V.dz : 0);
    s += `<path class="${cls.predArc}" d="${dstr(Array.from({ length: 25 }, (_, i) => { const a = a0 + (a1 - a0) * i / 24; return v.pr([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), zz]); }))}"/>`;
    const aimP = madd(pf[k].p, sub(pred.p, pred.faces!.faces[k].p)), q = v.pr(aimP), lab = v.pr(madd(aimP, [0, 0, 1], 0.16));
    s += `<path class="${cls.cross}" d="M${f1(q[0] - 9)} ${f1(q[1])}L${f1(q[0] - 3)} ${f1(q[1])}M${f1(q[0] + 3)} ${f1(q[1])}L${f1(q[0] + 9)} ${f1(q[1])}M${f1(q[0])} ${f1(q[1] - 9)}L${f1(q[0])} ${f1(q[1] - 3)}M${f1(q[0])} ${f1(q[1] + 3)}L${f1(q[0])} ${f1(q[1] + 9)}"/>`;
    s += `<text class="${cls.labP}" x="${f1(lab[0] + 6)}" y="${f1(lab[1] - 4)}">t+Δ · 第 ${k} 块</text>`;
  }

  // ---- 命中点：贴在板上跟着转
  if (S.marks.length) {
    const Fs = [0, 1, 2, 3].map((j) => faceFrame(j, th, c, j % 2 ? V.r2 : V.r1, V.z1 + (j % 2 ? V.dz : 0)));
    for (const m of S.marks) {
      const a = clamp(1 - (S.t - m.t) / 1.5, 0, 1); if (a <= 0) continue;
      const F = Fs[m.j], q = v.pr(madd(madd(madd(F.p, F.t, m.a), F.u, m.b), F.n, 0.004));
      s += `<circle class="${cls.mark}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="${(3 + 7 * (1 - a)).toFixed(1)}" opacity="${(0.35 + 0.65 * a).toFixed(2)}"/><circle class="${cls.markDot}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="2" opacity="${(0.4 + 0.6 * a).toFixed(2)}"/>`;
    }
  }

  // ---- 弹丸：尾巴、地面影子、弹头
  for (const sh of S.shots) {
    const fade = sh.alive ? 1 : clamp(1 - (S.t - sh.end) / 0.6, 0, 1);
    if (fade <= 0 || sh.trail.length < 2) continue;
    const tr = (sh.trail as V3[]).slice(-34), fp = (p: number[]) => flight(sh.p0, sh.aim, p);
    s += `<path class="${cls.shot}" opacity="${(0.25 + 0.75 * fade).toFixed(2)}" d="${dstr(tr.map(fp))}"/>`;
    if (sh.alive) { const q = fp(sh.p), q0 = flight(sh.p0, sh.aim, sh.p, true); s += `<circle class="${cls.shotSh}" cx="${f1(q0[0])}" cy="${f1(q0[1])}" r="2.2"/><circle class="${cls.shotDot}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="2.6"/>`; }
  }

  // ---- 云台：偏航和俯仰按仿真实时转
  const gx = (f: string, p: V3): V3 => gimbalXf(f === 'b' ? 'base' : f === 'y' ? 'yaw' : 'pitch', p, g.psi, g.phi);
  s += render(gimbalMesh(), gx, v, dark, cls);
  const lb = v.pr([-0.05, 0.36, 0]);
  s += `<text class="${cls.labI}" x="${f1(lb[0] + 4)}" y="${f1(lb[1] + 12)}">云台</text>`;
  return s;
}

// ------------------------------------------------------------------------------------------------ 俯视小图
export const WIN = { xc: 4.08, yc: -0.3, w: 3.2, h: 1.9 };
export function topLayout(W: number, H: number) {
  const s = Math.min(W / WIN.w, H / WIN.h);
  const toS = (x: number, y: number): [number, number] => [W / 2 + (y - WIN.yc) * s, H / 2 - (x - WIN.xc) * s];
  return { W, H, s, toS, hx: H / 2 / s, hy: W / 2 / s };
}

export function buildTop(S: any, W: number, H: number, cls: Cls): string {
  const L = topLayout(W, H), s = L.s, P = L.toS, A = S.A, trk = S.trk, fr = S.frame, c = A.c, th = A.th;
  const rot = (lx: number, ly: number): [number, number] => P(c[0] + lx * Math.cos(th) - ly * Math.sin(th), c[1] + lx * Math.sin(th) + ly * Math.cos(th));
  let o = '';
  for (let xw = Math.ceil((WIN.xc - L.hx) * 2) / 2; xw <= WIN.xc + L.hx; xw += 0.5) { const q = P(xw, 0), y = Math.round(q[1]) + 0.5; o += `<path class="${cls.tGrid}" d="M0 ${y}H${W}"/>`; if (q[1] > 30 && q[1] < H - 4) o += `<text class="${cls.lab}" x="4" y="${f1(q[1] - 3)}">${xw.toFixed(1)} m</text>`; }
  for (let yw = Math.ceil((WIN.yc - L.hy) * 2) / 2; yw <= WIN.yc + L.hy; yw += 0.5) { const x = Math.round(P(0, yw)[0]) + 0.5; o += `<path class="${cls.tGrid}" d="M${x} 0V${H}"/>`; }
  if (S.route.kind === 'lap') o += `<path class="${cls.route}" d="${dstr(S.route.pts.map((p: number[]) => P(p[0], p[1])))}"/>`;
  else o += `<path class="${cls.route}" d="${dstr([P(S.route.pts[0][0], -SHUTTLE_Y), P(S.route.pts[0][0], SHUTTLE_Y)])}"/>`;
  // 枪管射线（己方：战队色）
  const F = gimbalFrames(S.g.psi, S.g.phi), dn = nrm([F.f[0], F.f[1], 0]), b0 = P(0, 0), b1 = P(dn[0] * 9, dn[1] * 9);
  o += `<path class="${cls.tRay}" d="${dstr([b0, b1])}"/>`;
  // 车：底盘方框、四块板（一条板加两根灯条）
  o += `<polygon class="${cls.tCar}" points="${pts([rot(-0.14, -0.14), rot(0.14, -0.14), rot(0.14, 0.14), rot(-0.14, 0.14)])}"/>`;
  const seenT = visibleTruth(S), seenJ = new Set<number>(seenT.map((e) => e.F.j));
  for (const Fc of A.faces()) {
    const t = Fc.t, n = Fc.n, cc = P(c[0], c[1]), pc = P(Fc.p[0], Fc.p[1]);
    o += `<path class="${cls.tGrid}" d="${dstr([cc, pc])}"/>`;
    const a = P(Fc.p[0] - t[0] * V.panelW / 2, Fc.p[1] - t[1] * V.panelW / 2), b = P(Fc.p[0] + t[0] * V.panelW / 2, Fc.p[1] + t[1] * V.panelW / 2);
    o += `<path class="${seenJ.has(Fc.j) ? cls.tPlateSeen : cls.tPlate}" d="${dstr([a, b])}"/>`;
    for (const sg of [-1, 1]) {
      const bw = Math.max(2.5, V.barW * s) / s / 2, bd = Math.max(4, 0.026 * s) / s / 2, cx = Fc.p[0] + t[0] * sg * V.barX, cy = Fc.p[1] + t[1] * sg * V.barX;
      o += `<polygon class="${cls.tBar}" points="${pts([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => P(cx + t[0] * bw * u + n[0] * bd * w, cy + t[1] * bw * u + n[1] * bd * w)))}"/>`;
    }
  }
  // 估计：2σ 椭圆、中心、速度；t+Δ 的四个面
  if (trk.x && fr) {
    const now = trk.facesAt(S.t - trk.t), cc = P(now.c[0], now.c[1]), E = trk.ellipse(), X9 = trk.x;
    o += `<polyline class="${cls.est}" points="${pts(Array.from({ length: 49 }, (_, i) => { const u = i / 48 * TAU, ex = 2 * E[0] * Math.cos(u), ey = 2 * E[1] * Math.sin(u); return P(now.c[0] + ex * Math.cos(E[2]) - ey * Math.sin(E[2]), now.c[1] + ex * Math.sin(E[2]) + ey * Math.cos(E[2])); }))}"/>`;
    o += `<path class="${cls.est}" d="M${f1(cc[0] - 5)} ${f1(cc[1])}H${f1(cc[0] + 5)}M${f1(cc[0])} ${f1(cc[1] - 5)}V${f1(cc[1] + 5)}"/>`;
    if (Math.hypot(X9[3], X9[4]) > 0.05) { const vq = P(now.c[0] + X9[3] * 0.8, now.c[1] + X9[4] * 0.8); o += `<path class="${cls.tVel}" d="${dstr([cc, vq])}"/>`; }
    const Pc = S.planCmd as Plan | null;
    if (Pc && Pc.faces && !Pc.center && S.cfg.mode === 'pred') {
      for (const Fq of truthPred(S, Pc)) {
        const t = Fq.t, n = Fq.n, hw = V.panelW / 2 + 0.022, hd = 0.03;
        o += `<polygon class="${Fq.j === Pc.k ? cls.tSel : cls.tPred}" points="${pts([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(Fq.p[0] + t[0] * hw * a + n[0] * hd * b, Fq.p[1] + t[1] * hw * a + n[1] * hd * b)))}"/>`;
      }
    }
  }
  for (const { F: Fq, op } of seenT) {
    const t = Fq.t, n = Fq.n, hw = V.panelW / 2 + 0.022, hd = 0.03;
    o += `<polygon class="${cls.tSeen}" opacity="${op.toFixed(2)}" points="${pts([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(Fq.p[0] + t[0] * hw * a + n[0] * hd * b, Fq.p[1] + t[1] * hw * a + n[1] * hd * b)))}"/>`;
  }
  for (const sh of S.shots) {
    const fade = sh.alive ? 1 : clamp(1 - (S.t - sh.end) / 0.6, 0, 1); if (fade <= 0 || sh.trail.length < 2) continue;
    o += `<path class="${cls.shot}" opacity="${(0.25 + 0.6 * fade).toFixed(2)}" d="${dstr((sh.trail as V3[]).slice(-36).map((p) => P(p[0], p[1])))}"/>`;
    if (sh.alive) { const q = P(sh.p[0], sh.p[1]); o += `<circle class="${cls.shotDot}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="2.4"/>`; }
  }
  for (const r of S.impacts) {
    const age = S.t - r.t; if (age < 0.05 || age > 9) continue;
    const q = P(r.q[0], r.q[1]), a = clamp(1 - age / 9, 0.2, 1);
    o += r.kind === 'hit' ? `<circle class="${cls.markDot}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="2" opacity="${a.toFixed(2)}"/>`
      : `<path class="${cls.miss}" opacity="${a.toFixed(2)}" d="M${f1(q[0] - 3.5)} ${f1(q[1] - 3.5)}l7 7M${f1(q[0] + 3.5)} ${f1(q[1] - 3.5)}l-7 7"/>`;
  }
  const q = P(0, 0), bx = clamp(P(dn[0] * ((WIN.xc - H / 2 / s) / (dn[0] || 1e-6)), dn[1] * ((WIN.xc - H / 2 / s) / (dn[0] || 1e-6)))[0], 14, W - 44);
  void q;
  o += `<text class="${cls.lab}" x="${f1(bx + 6)}" y="${H - 4}">枪管</text><polygon class="${cls.tTri}" points="${f1(bx - 4)},${H} ${f1(bx + 4)},${H} ${f1(bx)},${H - 7}"/>`;
  return o;
}
