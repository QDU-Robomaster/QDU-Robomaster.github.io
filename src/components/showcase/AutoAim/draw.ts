/* AutoAim · 画布绘制：相机视角（灰度图）。只在被调用时才碰 canvas，模块顶层不访问 window / document。
 * 俯视图读主题 token（getComputedStyle，主题切换时重读）；相机视角是一张灰度图，不随主题变，叠加层用固定的亮色。 */
import {
  V, TAU, PI, D2R, clamp, wrap, add, sub, dot, cross, nrm, madd, faceFrame, camOf, project, gimbalFrames, SHUTTLE_Y,
  type Sim, type Plan, type V3, type Cam,
} from './sim';

// ------------------------------------------------------------------------------------------------ token
export type Tokens = {
  paper: string; raised: string; sunken: string; line: string; lineS: string; ink: string; mut: string; onInk: string; focus: string;
  ch0: string; ch1: string; ch2: string; ch3: string; accent: string; mono: string; sans: string; dark: boolean;
};
export function readTokens(el: Element): Tokens {
  const cs = getComputedStyle(el), g = (n: string, d = '') => cs.getPropertyValue(n).trim() || d;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    paper: g('--paper', '#f2f3f2'), raised: g('--paper-raised', '#fff'), sunken: g('--paper-sunken', '#e6e8e6'),
    line: g('--line', '#d3d6d3'), lineS: g('--line-strong', '#7c827e'), ink: g('--ink', '#111312'), mut: g('--ink-muted', '#4d524f'),
    onInk: g('--on-ink', '#f2f3f2'), focus: g('--focus', '#111312'),
    ch0: g('--ch0', '#7a5c00'), ch1: g('--ch1', '#006573'), ch2: g('--ch2', '#a1206f'), ch3: g('--ch3', '#2a6e1b'),
    accent: g('--team-accent', dark ? '#ff6b5f' : '#c0392b'),
    mono: g('--font-mono', 'ui-monospace, Consolas, monospace'), sans: g('--font-sans', 'system-ui, sans-serif'), dark,
  };
}

function poly(x: CanvasRenderingContext2D, pts: number[][]) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); }

// ------------------------------------------------------------------------------------------------ 相机视角
// 一台车的网格（目标局部坐标）：底盘、轮子、立柱、四块装甲板（板体、前面、编号贴纸、两根灯条）
type MFace = { v: V3[]; alb: number; kind: 'solid' | 'light' | 'sticker'; digit?: string };
function obox(c: number[], u: number[], v: number[], w: number[], a: number, b: number, h: number, alb: number, kind: MFace['kind'] = 'solid'): MFace[] {
  const Pp = (su: number, sv: number, sw: number): V3 => [c[0] + su * a * u[0] + sv * b * v[0] + sw * h * w[0], c[1] + su * a * u[1] + sv * b * v[1] + sw * h * w[1], c[2] + su * a * u[2] + sv * b * v[2] + sw * h * w[2]];
  const Ft = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
    [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]];
  return Ft.map((f) => ({ v: f.map((q) => Pp(q[0], q[1], q[2])), alb, kind }));
}
let MESH: MFace[] | null = null;
function targetMesh(): MFace[] {
  if (MESH) return MESH;
  const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1], M: MFace[] = [];
  M.push(...obox([0, 0, 0.09], X, Y, Z, 0.14, 0.14, 0.016, 0.2));
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + i * PI / 2, d: V3 = [Math.cos(a), Math.sin(a), 0], pp: V3 = [-d[1], d[0], 0];
    M.push(...obox([0.172 * d[0], 0.172 * d[1], 0.05], d, pp, Z, 0.015, 0.05, 0.05, 0.1));
  }
  M.push(...obox([0, 0, 0.178], X, Y, Z, 0.03, 0.03, 0.072, 0.34));
  M.push(...obox([0, 0, 0.257], X, Y, Z, 0.05, 0.05, 0.011, 0.14));
  for (let j = 0; j < 4; j++) {
    const r = j % 2 ? V.r2 : V.r1, z = V.z1 + (j % 2 ? V.dz : 0), F = faceFrame(j, 0, [0, 0], r, z), ph = F.ph;
    const ex: V3 = [Math.cos(ph), Math.sin(ph), 0], ey: V3 = [-Math.sin(ph), Math.cos(ph), 0];
    M.push(...obox([ex[0] * r * 0.5, ex[1] * r * 0.5, z], ex, ey, Z, r * 0.5 - 0.02, 0.009, 0.009, 0.5));
    M.push(...obox(madd(F.p, F.n, -0.006), F.n, F.t, F.u, 0.006, V.panelW / 2, V.panelH / 2, 0.16));
    // 前面的深色底板（略凸）和编号贴纸
    M.push(...obox(madd(F.p, F.n, 0.0004), F.n, F.t, F.u, 0.0006, V.panelW / 2 - 0.012, V.panelH / 2 - 0.014, 0.1).slice(0, 1));
    M.push({ v: [madd(madd(F.p, F.n, 0.0011), F.t, -0.026), madd(madd(F.p, F.n, 0.0011), F.t, 0.026), madd(madd(F.p, F.n, 0.0011), F.t, 0.026), madd(madd(F.p, F.n, 0.0011), F.t, -0.026)].map((q, i) => madd(q, F.u, i < 2 ? -0.026 : 0.026)) as V3[], alb: 1, kind: 'sticker', digit: '3' });
    for (const sg of [-1, 1]) M.push(...obox(madd(madd(F.p, F.t, sg * V.barX), F.n, -0.002), F.n, F.t, F.u, 0.006, V.barW / 2, V.barH / 2, 1, 'light'));
  }
  MESH = M; return M;
}
const CAM = { bg: '#0a0c0b', floor: 'rgba(170,178,174,0.11)', white: '#f2f3f2', ink: '#e6e8e6', mut: '#a3a9a5', cyan: '#4fdded', pink: '#ff85cb', green: '#8be36a', yellow: '#ffd84d', accent: '#ff6b5f' };
const LCAM = nrm([0.3, -0.25, 1]);
let NOISE: HTMLCanvasElement | null = null;
export const CAM_CROP = 1.9, CAM_DY = 0.14;   // 显示窗口：放大 1.9 倍，往上抬一点（枪管为抵消下坠是抬着的）
const REASON: Record<string, string> = { nt: ' · 无目标', ctr: ' · 先收敛', sig: ' · 预测还不稳', gim: ' · 云台没到位', face: ' · 板太斜', cons: ' · 枪线在两块板之间' };

export function drawCam(x: CanvasRenderingContext2D, W: number, H: number, S: Sim, tok: Tokens) {
  x.clearRect(0, 0, W, H);
  x.fillStyle = CAM.bg; x.fillRect(0, 0, W, H);
  const fr = S.frame;
  x.font = '600 10px ' + tok.mono; x.textBaseline = 'alphabetic';
  if (!fr) { x.fillStyle = CAM.mut; x.textAlign = 'center'; x.fillText('等第一帧', W / 2, H / 2); x.textAlign = 'left'; return; }
  const cam: Cam = camOf(fr.snap.g), sc = W / 2 * CAM_CROP;
  const Pi = (p: number[]): V3 | null => { const q = project(cam, p); return q ? [W / 2 + q[0] * sc, H / 2 + (q[1] - CAM_DY) * sc, q[2]] : null; };
  const Ni = (q: number[]): number[] => [W / 2 + q[0] * sc, H / 2 + (q[1] - CAM_DY) * sc];
  // 地面：每 0.5 m 一条距离线和横向线
  x.lineWidth = 1; x.strokeStyle = CAM.floor;
  const seg = (a: number[], b: number[]) => { x.beginPath(); let on = false; for (let i = 0; i <= 20; i++) { const p = Pi([a[0] + (b[0] - a[0]) * i / 20, a[1] + (b[1] - a[1]) * i / 20, 0]); if (!p) { on = false; continue; } if (!on) { x.moveTo(p[0], p[1]); on = true; } else x.lineTo(p[0], p[1]); } x.stroke(); };
  for (let d = 2; d <= 8; d += 0.5) seg([d, -3], [d, 3]);
  for (let y = -3; y <= 3; y += 0.5) seg([1.5, y], [8.5, y]);

  // 目标：用曝光那一刻的位姿画（和检测框对得上）
  const T = fr.snap.A, ct = Math.cos(T.th), st = Math.sin(T.th), tx = (p: number[]): V3 => [T.c[0] + p[0] * ct - p[1] * st, T.c[1] + p[0] * st + p[1] * ct, p[2]];
  const out: { z: number; pp: V3[]; val: number; kind: MFace['kind']; digit?: string; q: V3[] }[] = [];
  for (const f of targetMesh()) {
    const q = f.v.map(tx), n = nrm(cross(sub(q[1], q[0]), sub(q[2], q[0])));
    if (dot(n, sub(cam.o, q[0])) <= 0) continue;
    const pp = q.map(Pi); if (pp.some((v) => !v)) continue;
    let z = 0; for (const v of pp as V3[]) z += v[2];
    const val = f.kind === 'light' ? 255 : f.kind === 'sticker' ? 214 : Math.round(255 * clamp(f.alb * (0.3 + 0.7 * Math.max(0, dot(n, LCAM))) * 0.62, 0, 1));
    out.push({ z: z / 4, pp: pp as V3[], val, kind: f.kind, digit: f.digit, q });
  }
  out.sort((a, b) => b.z - a.z);
  for (const f of out) {
    poly(x, f.pp); x.fillStyle = 'rgb(' + f.val + ',' + f.val + ',' + f.val + ')'; x.fill();
    if (f.kind === 'sticker') {
      // 数字：按贴纸四边形的屏幕方向摆正
      const [a, b, c, d] = f.pp, hx = [(b[0] - a[0] + c[0] - d[0]) / 2, (b[1] - a[1] + c[1] - d[1]) / 2], vy = [(a[0] - d[0] + b[0] - c[0]) / 2, (a[1] - d[1] + b[1] - c[1]) / 2];
      const sg = hx[0] < 0 ? -1 : 1, cx = (a[0] + b[0] + c[0] + d[0]) / 4, cy = (a[1] + b[1] + c[1] + d[1]) / 4, k = 1 / 60;
      x.save(); x.transform(hx[0] * sg * k, hx[1] * sg * k, vy[0] * k * 0.98, vy[1] * k * 0.98, cx, cy);
      x.fillStyle = '#0a0c0b'; x.font = '700 62px ' + tok.sans; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(f.digit || '', 0, 3); x.restore();
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    }
  }
  // 灯条的光晕
  x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#fff'; x.lineJoin = 'round';
  for (const [lw, a] of [[7, 0.07], [4, 0.14], [2, 0.3]] as [number, number][]) { x.lineWidth = lw; x.globalAlpha = a; for (const f of out) if (f.kind === 'light') { poly(x, f.pp); x.stroke(); } }
  x.restore();
  // 传感器噪点
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = 96; NOISE.height = 96; const nx = NOISE.getContext('2d') as CanvasRenderingContext2D, im = nx.createImageData(96, 96); let a = 7; for (let i = 0; i < im.data.length; i += 4) { a = (a * 1664525 + 1013904223) >>> 0; const v = (a >>> 24); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } nx.putImageData(im, 0, 0); }
  x.save(); x.globalAlpha = 0.045; x.globalCompositeOperation = 'lighter'; const ox = (fr.k * 37) % 96, oy = (fr.k * 53) % 96; for (let yy = -oy; yy < H; yy += 96) for (let xx = -ox; xx < W; xx += 96) x.drawImage(NOISE, xx, yy); x.restore();

  // 检测框：灯条四个端点围出的四边形；被 EKF 用上的那几块再画 PnP 坐标轴
  const usedSet = new Set<any>((fr.used || []).map((u: any) => u.d));
  for (const d of fr.dets) {
    const pp = d.corners.map((q: number[]) => Ni(q)), used = usedSet.has(d);
    x.strokeStyle = used ? CAM.ink : 'rgba(230,232,230,0.5)'; x.lineWidth = used ? 1.5 : 1; poly(x, pp); x.stroke();
    const lx = Math.min(...pp.map((q: number[]) => q[0])), ty = Math.min(...pp.map((q: number[]) => q[1]));
    x.fillStyle = used ? CAM.ink : 'rgba(230,232,230,0.6)'; x.fillText('3 · ' + d.dist.toFixed(2) + ' m', lx, ty - 6);
    if (used) {
      const o = Pi(d.p), ph = d.phi, ct2 = Math.cos(V.tilt), st2 = Math.sin(V.tilt);
      const ax = (v: number[], col: string) => { const e = Pi(madd(d.p, v, 0.1)); if (!o || !e) return; x.strokeStyle = col; x.lineWidth = 1.6; x.beginPath(); x.moveTo(o[0], o[1]); x.lineTo(e[0], e[1]); x.stroke(); };
      ax([-Math.sin(ph), Math.cos(ph), 0], CAM.yellow); ax([-Math.cos(ph) * st2, -Math.sin(ph) * st2, ct2], CAM.green); ax([Math.cos(ph) * ct2, Math.sin(ph) * ct2, st2], CAM.cyan);
    }
  }
  // 命中点：留在板上
  if (S.marks.length) {
    const Fs = [0, 1, 2, 3].map((j) => faceFrame(j, T.th, T.c, j % 2 ? V.r2 : V.r1, V.z1 + (j % 2 ? V.dz : 0)));
    for (const m of S.marks) {
      const F = Fs[m.j], q = Pi(add(add(F.p, [F.t[0] * m.a, F.t[1] * m.a, F.t[2] * m.a]), [F.u[0] * m.b, F.u[1] * m.b, F.u[2] * m.b])), a = clamp(1 - (S.t - m.t) / 1.5, 0, 1);
      if (!q) continue; x.globalAlpha = 0.4 + 0.6 * a; x.strokeStyle = CAM.accent; x.lineWidth = 1.6; x.beginPath(); x.arc(q[0], q[1], 3 + 9 * (1 - a), 0, TAU); x.stroke(); x.fillStyle = CAM.white; x.beginPath(); x.arc(q[0], q[1], 2.2, 0, TAU); x.fill(); x.globalAlpha = 1;
    }
  }
  // 弹丸：沿光轴飞出去，画一小段尾巴
  for (const sh of S.shots) {
    if (!sh.alive || sh.trail.length < 2) continue;
    x.strokeStyle = CAM.white; x.lineWidth = 1.4; x.beginPath(); let on = false;
    for (const p of sh.trail.slice(-8)) { const q = Pi(p); if (!q) continue; if (!on) { x.moveTo(q[0], q[1]); on = true; } else x.lineTo(q[0], q[1]); }
    x.stroke();
  }
  // t+Δ：四块板推到弹丸到的时刻（虚线），要打的那块实线，十字是瞄点
  const Pc = S.planCmd as Plan | null;
  if (Pc && Pc.faces && !Pc.center && S.cfg.mode === 'pred') {
    for (const F of Pc.faces.faces) {
      const w = V.panelW / 2, hh = V.panelH / 2, pp = [madd(madd(F.p, F.t, -w), F.u, -hh), madd(madd(F.p, F.t, w), F.u, -hh), madd(madd(F.p, F.t, w), F.u, hh), madd(madd(F.p, F.t, -w), F.u, hh)].map(Pi);
      if (pp.some((v) => !v)) continue; const sel = F.j === Pc.k, fwd = dot(F.n, sub(cam.o, F.p)) > 0;
      x.strokeStyle = CAM.pink; x.globalAlpha = sel ? 1 : fwd ? 0.85 : 0.35; x.lineWidth = sel ? 2 : 1.2; x.setLineDash(sel ? [] : [4, 3]); poly(x, pp as V3[]); x.stroke();
    }
    x.globalAlpha = 1; x.setLineDash([]);
  }
  // 光轴（相机和枪管同轴）与瞄点
  x.strokeStyle = 'rgba(230,232,230,0.5)'; x.lineWidth = 1; x.beginPath(); const by = H / 2 - CAM_DY * sc; x.moveTo(W / 2 - 6, by); x.lineTo(W / 2 + 6, by); x.moveTo(W / 2, by - 6); x.lineTo(W / 2, by + 6); x.stroke();
  const Pa = S.planCmd as Plan | null;
  if (Pa && !Pa.center) {
    const q = Pi(Pa.p);
    if (q) {
      x.strokeStyle = S.cfg.mode === 'pred' ? CAM.pink : CAM.ink; x.lineWidth = 1.6; x.beginPath(); x.arc(q[0], q[1], 7, 0, TAU);
      x.moveTo(q[0] - 12, q[1]); x.lineTo(q[0] - 3, q[1]); x.moveTo(q[0] + 3, q[1]); x.lineTo(q[0] + 12, q[1]); x.moveTo(q[0], q[1] - 12); x.lineTo(q[0], q[1] - 3); x.moveTo(q[0], q[1] + 3); x.lineTo(q[0], q[1] + 12); x.stroke();
    }
  }
  // 角标
  const G = S.gate;
  x.textAlign = 'left'; x.fillStyle = CAM.mut; x.fillText('armors_frame', 8, 14);
  x.textAlign = 'right'; x.fillStyle = G.open ? CAM.ink : CAM.mut;
  x.fillText(G.open ? 'fire 开' : 'fire 关' + (REASON[G.why] || ''), W - 8, 14);
  x.textAlign = 'left'; x.fillStyle = CAM.mut;
  x.fillText(S.cfg.mode === 'pred' ? '虚线 t+Δ · 十字 瞄点' : '十字 = 最近一次看到的位置', 8, H - 8);
  if (S.trk.x && fr.used && fr.used.length) { x.textAlign = 'right'; x.fillText('tracked_face_index ' + fr.used.slice().sort((a: any, b: any) => a.d.ang - b.d.ang)[0].k, W - 8, H - 8); x.textAlign = 'left'; }
}
