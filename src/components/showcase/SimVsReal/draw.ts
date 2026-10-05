/* 两张相机小卡和两条帧带的 canvas 绘制。模块顶层不碰 window / document，用到的时候才取。

   实车卡：暗场景，噪点，曝光逐帧起伏，灯条过曝发光；画面停在“最近一个处理完的帧”上，丢帧时画面就一格一格跳。
   仿真卡：干净的平涂和网格地面，颜色走主题 token；画面是仿真时间里最近处理完的那一帧。
   两张卡画同一个目标（sim.ts 的 targetPose / visiblePlates）：一辆在小陀螺的步兵，四面装甲板，每面左右各一根灯条，
   中间是数字贴纸。叠在上面的是 ArmorDetector 的框和角点、ArmorTracker 的轨迹、Aimer 的瞄点。 */
import { AIM_LEAD_S, targetPose, visiblePlates } from './sim';
import type { Plate } from './sim';

export interface Tokens {
  ink: string;
  inkMuted: string;
  line: string;
  lineStrong: string;
  paper: string;
  paperRaised: string;
  paperSunken: string;
  ch0: string;
  ch1: string;
  ch2: string;
  ch3: string;
  fail: string;
  mono: string;
  sans: string;
}

export function readTokens(el: Element): Tokens {
  const cs = getComputedStyle(el);
  const g = (name: string, fb: string): string => cs.getPropertyValue(name).trim() || fb;
  return {
    ink: g('--ink', '#111312'),
    inkMuted: g('--ink-muted', '#4d524f'),
    line: g('--line', '#d3d6d3'),
    lineStrong: g('--line-strong', '#7c827e'),
    paper: g('--paper', '#f2f3f2'),
    paperRaised: g('--paper-raised', '#ffffff'),
    paperSunken: g('--paper-sunken', '#e6e8e6'),
    ch0: g('--ch0', '#7a5c00'),
    ch1: g('--ch1', '#006573'),
    ch2: g('--ch2', '#a1206f'),
    ch3: g('--ch3', '#2a6e1b'),
    fail: g('--fail', '#b42318'),
    mono: g('--font-mono', 'ui-monospace, Consolas, monospace'),
    sans: g('--font-sans', 'system-ui, sans-serif'),
  };
}

export interface CardView {
  /** 最近一个处理完的帧的采集时间（秒）；还没有就是 null。 */
  frameT: number | null;
  /** 轨迹窗口内已处理帧的采集时间（秒）。 */
  hist: number[];
  /** 这一帧的序号，噪点和曝光的种子。 */
  seq: number;
  badge: string | null;
}

/** 让 canvas 的像素尺寸跟上它的 CSS 尺寸。返回 false 表示现在没有可画的面积。 */
export function fitCanvas(cv: HTMLCanvasElement): { w: number; h: number; dpr: number } | null {
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (w < 2 || h < 2) return null;
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  if (cv.width !== pw || cv.height !== ph) {
    cv.width = pw;
    cv.height = ph;
  }
  return { w, h, dpr };
}

// ---------------------------------------------------------------------------------------------- 小工具
function rng(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let noiseTile: HTMLCanvasElement | null = null;
function getNoise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const n = document.createElement('canvas');
  n.width = n.height = 96;
  const x = n.getContext('2d') as CanvasRenderingContext2D;
  const im = x.createImageData(96, 96);
  const r = rng(11);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.round(r() * 255);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  noiseTile = n;
  return n;
}

/** 贴纸上的数字用等宽粗体。 */
const REAL_FONT = 'ui-monospace, Consolas, monospace';

interface TargetStyle {
  chassis: string;
  chassisEdge: string;
  wheel: string;
  turret: string;
  plate: string;
  plateEdge: string;
  sticker: string;
  digit: string;
  barCore: string;
  barFlat: string;
  /** 灯条光晕（由内到外的两层）；null 就是平涂。 */
  halo: [string, string] | null;
}

const REAL_STYLE: TargetStyle = {
  chassis: '#262c29',
  chassisEdge: '#404943',
  wheel: '#0e100f',
  turret: '#2d3430',
  plate: '#2a302c',
  plateEdge: '#454e48',
  sticker: '#c9cdca',
  digit: '#181b19',
  barCore: '#ffe9e4',
  barFlat: '#ff6b5c',
  halo: ['rgba(255,59,48,.5)', 'rgba(255,59,48,.2)'],
};

function simStyle(tk: Tokens): TargetStyle {
  return {
    chassis: tk.paperRaised,
    chassisEdge: tk.lineStrong,
    wheel: tk.inkMuted,
    turret: tk.paperRaised,
    plate: '#3b403d',
    plateEdge: tk.lineStrong,
    sticker: '#e9ebe9',
    digit: '#1a1d1b',
    barCore: '#e8473a',
    barFlat: '#e8473a',
    halo: null,
  };
}

interface Geo {
  W: number;
  H: number;
  k: number;
}

/** 目标车相对画面宽度的放大（近距离的敌方步兵）。 */
const VEHICLE = 1.4;

function centre(g: Geo, t: number): { x: number; y: number; sc: number } {
  const p = targetPose(t);
  return { x: p.u * g.W, y: p.v * g.H, sc: p.s * g.k * VEHICLE };
}

/** 一块装甲板在画面里的矩形（中心、宽、高）。 */
function plateRect(g: Geo, t: number, pl: Plate): { cx: number; cy: number; w: number; h: number } {
  const c = centre(g, t);
  return {
    cx: c.x + pl.x * 19 * c.sc,
    cy: c.y + 4 * c.sc,
    w: Math.max(3 * c.sc, 22 * c.sc * pl.facing),
    h: 10 * c.sc,
  };
}

function drawTarget(x: CanvasRenderingContext2D, g: Geo, t: number, st: TargetStyle): void {
  const p = targetPose(t);
  const c = centre(g, t);
  const { sc } = c;
  // 轮子、底盘、云台
  x.fillStyle = st.wheel;
  x.fillRect(c.x - 27 * sc, c.y + 6 * sc, 8 * sc, 9 * sc);
  x.fillRect(c.x + 19 * sc, c.y + 6 * sc, 8 * sc, 9 * sc);
  x.fillStyle = st.chassis;
  x.fillRect(c.x - 23 * sc, c.y - 7 * sc, 46 * sc, 20 * sc);
  x.strokeStyle = st.chassisEdge;
  x.lineWidth = 1;
  x.strokeRect(c.x - 23 * sc + 0.5, c.y - 7 * sc + 0.5, 46 * sc - 1, 20 * sc - 1);
  x.fillStyle = st.turret;
  x.fillRect(c.x - 8 * sc, c.y - 15 * sc, 16 * sc, 8 * sc);
  x.strokeRect(c.x - 8 * sc + 0.5, c.y - 15 * sc + 0.5, 16 * sc - 1, 8 * sc - 1);
  x.fillStyle = st.wheel;
  const bx = c.x + Math.sin(p.yaw * 0.5) * 6 * sc;
  x.fillRect(bx, c.y - 12 * sc, 13 * sc, 2.2 * sc);
  // 装甲板：远的先画
  const plates = visiblePlates(p.yaw).sort((a, b) => a.facing - b.facing);
  for (const pl of plates) {
    const r = plateRect(g, t, pl);
    const x0 = r.cx - r.w / 2;
    const y0 = r.cy - r.h / 2;
    x.fillStyle = st.plate;
    x.fillRect(x0, y0, r.w, r.h);
    x.strokeStyle = st.plateEdge;
    x.strokeRect(x0 + 0.5, y0 + 0.5, r.w - 1, r.h - 1);
    // 数字贴纸
    const sw = r.w * 0.34;
    if (sw > 2.5) {
      x.fillStyle = st.sticker;
      x.fillRect(r.cx - sw / 2, r.cy - r.h * 0.3, sw, r.h * 0.6);
      if (sw > 7) {
        x.fillStyle = st.digit;
        x.font = `700 ${Math.round(r.h * 0.6)}px ${REAL_FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('3', r.cx, r.cy + 0.5);
      }
    }
    // 左右灯条
    const bw = Math.max(1.6, 2.6 * sc * (0.55 + 0.45 * pl.facing));
    const bh = r.h * 1.18;
    for (const side of [-1, 1]) {
      const bxc = r.cx + (side * (r.w - bw)) / 2;
      if (st.halo) {
        x.fillStyle = st.halo[1];
        x.fillRect(bxc - bw * 2.1, r.cy - bh / 2 - 2, bw * 4.2, bh + 4);
        x.fillStyle = st.halo[0];
        x.fillRect(bxc - bw * 1.2, r.cy - bh / 2 - 1, bw * 2.4, bh + 2);
      }
      x.fillStyle = st.halo ? st.barCore : st.barFlat;
      x.fillRect(bxc - bw / 2, r.cy - bh / 2, bw, bh);
    }
  }
}
interface Overlay {
  box: string;
  trail: string;
  aim: string;
}

function drawOverlay(x: CanvasRenderingContext2D, g: Geo, view: CardView, ov: Overlay, mono: string): void {
  if (view.frameT === null) return;
  const t = view.frameT;
  // ArmorTracker：轨迹（车体中心，每个处理完的帧一个点）
  x.strokeStyle = ov.trail;
  x.fillStyle = ov.trail;
  x.lineWidth = 1;
  x.globalAlpha = 0.5;
  x.beginPath();
  view.hist.forEach((ht, i) => {
    const c = centre(g, ht);
    if (i === 0) x.moveTo(c.x, c.y);
    else x.lineTo(c.x, c.y);
  });
  x.stroke();
  x.globalAlpha = 1;
  const n = view.hist.length;
  view.hist.forEach((ht, i) => {
    const c = centre(g, ht);
    x.globalAlpha = 0.35 + 0.65 * ((i + 1) / n);
    x.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 2, 2);
  });
  x.globalAlpha = 1;
  // ArmorDetector：框和四个角点
  const pose = targetPose(t);
  x.strokeStyle = ov.box;
  x.fillStyle = ov.box;
  x.lineWidth = 1;
  x.font = `600 9px ${mono}`;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  for (const pl of visiblePlates(pose.yaw, 0.35)) {
    const r = plateRect(g, t, pl);
    const pad = 3 * g.k;
    const x0 = Math.round(r.cx - r.w / 2 - pad) + 0.5;
    const y0 = Math.round(r.cy - r.h / 2 - pad) + 0.5;
    const bw = Math.round(r.w + pad * 2);
    const bh = Math.round(r.h + pad * 2);
    x.strokeRect(x0, y0, bw, bh);
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      x.fillRect(Math.round(r.cx + (dx * r.w) / 2) - 1, Math.round(r.cy + (dy * r.h) / 2) - 1, 2, 2);
    }
    x.fillText('红 3', x0, y0 - 3);
  }
  // Aimer：瞄点，在最新一帧的基础上往前预测
  const a = centre(g, t + AIM_LEAD_S);
  x.strokeStyle = ov.aim;
  x.beginPath();
  x.moveTo(a.x - 7, a.y + 0.5);
  x.lineTo(a.x + 7, a.y + 0.5);
  x.moveTo(a.x + 0.5, a.y - 7);
  x.lineTo(a.x + 0.5, a.y + 7);
  x.stroke();
  x.beginPath();
  x.arc(a.x + 0.5, a.y + 0.5, 4, 0, Math.PI * 2);
  x.stroke();
}

function drawOsd(x: CanvasRenderingContext2D, text: string, fg: string, mono: string, H: number): void {
  x.font = `500 9px ${mono}`;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.fillStyle = fg;
  x.fillText(text, 6, H - 6);
}

function drawBadge(x: CanvasRenderingContext2D, text: string, fg: string, bg: string, edge: string, mono: string, W: number): void {
  x.font = `600 10px ${mono}`;
  const w = Math.ceil(x.measureText(text).width) + 10;
  const x0 = W - w - 6;
  x.fillStyle = bg;
  x.fillRect(x0, 6, w, 16);
  x.strokeStyle = edge;
  x.lineWidth = 1;
  x.strokeRect(x0 + 0.5, 6.5, w - 1, 15);
  x.fillStyle = fg;
  x.textAlign = 'left';
  x.textBaseline = 'middle';
  x.fillText(text, x0 + 5, 14.5);
}

// ---------------------------------------------------------------------------------------------- 实车卡
export function drawRealCard(cv: HTMLCanvasElement, view: CardView, tk: Tokens): void {
  const fit = fitCanvas(cv);
  if (!fit) return;
  const x = cv.getContext('2d') as CanvasRenderingContext2D;
  const { w: W, h: H, dpr } = fit;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g: Geo = { W, H, k: W / 184 };
  // 场景：暗场、地面略亮一点、地面和墙的交界一条淡线
  x.fillStyle = '#0a0c0b';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#101311';
  x.fillRect(0, H * 0.42, W, H * 0.58);
  x.fillStyle = 'rgba(200,210,204,.10)';
  x.fillRect(0, Math.round(H * 0.42), W, 1);
  if (view.frameT !== null) drawTarget(x, g, view.frameT, REAL_STYLE);
  // 曝光：逐帧起伏，约每 3.7 s 一个来回，再叠一点帧间抖动
  const r = rng(view.seq * 7919 + 3);
  const t = view.frameT ?? 0;
  const ex = 0.1 * Math.sin((Math.PI * 2 * t) / 3.7) + 0.05 * (r() - 0.5);
  x.fillStyle = ex > 0 ? `rgba(255,255,255,${(ex * 0.55).toFixed(3)})` : `rgba(0,0,0,${(-ex * 1.1).toFixed(3)})`;
  x.fillRect(0, 0, W, H);
  // 噪点：同一张噪声贴图，每帧换个偏移
  const noise = getNoise();
  x.save();
  x.globalAlpha = 0.13;
  x.globalCompositeOperation = 'lighter';
  const ox = Math.floor(r() * 96);
  const oy = Math.floor(r() * 96);
  for (let yy = -oy; yy < H; yy += 96) for (let xx = -ox; xx < W; xx += 96) x.drawImage(noise, xx, yy);
  x.restore();
  // 暗角
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.66);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.5)');
  x.fillStyle = vg;
  x.fillRect(0, 0, W, H);
  // 叠加层。卡片本身永远是暗场，所以用暗色主题的通道色
  drawOverlay(x, g, view, { box: '#e6e8e6', trail: '#8be36a', aim: '#ff85cb' }, tk.mono);
  drawOsd(x, '720×540 · 100 Hz', 'rgba(230,232,230,.75)', tk.mono, H);
  if (view.badge) drawBadge(x, view.badge, '#ffb4a8', 'rgba(10,12,11,.88)', '#ff8a7a', tk.mono, W);
}

// ---------------------------------------------------------------------------------------------- 仿真卡
export function drawSimCard(cv: HTMLCanvasElement, view: CardView, tk: Tokens): void {
  const fit = fitCanvas(cv);
  if (!fit) return;
  const x = cv.getContext('2d') as CanvasRenderingContext2D;
  const { w: W, h: H, dpr } = fit;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g: Geo = { W, H, k: W / 184 };
  const hy = Math.round(H * 0.4);
  x.fillStyle = tk.paperSunken;
  x.fillRect(0, 0, W, H);
  x.fillStyle = tk.paper;
  x.fillRect(0, hy, W, H - hy);
  // 网格地面：消失点在地平线中央，横线按透视间距
  x.strokeStyle = tk.lineStrong;
  x.lineWidth = 1;
  x.globalAlpha = 0.4;
  x.beginPath();
  for (let i = -6; i <= 6; i++) {
    x.moveTo(W / 2 + 0.5, hy);
    x.lineTo(W / 2 + i * (W / 4.2) + 0.5, H);
  }
  for (let j = 1; j <= 7; j++) {
    const yy = Math.round(hy + (H - hy) * Math.pow(j / 7, 1.9)) + 0.5;
    x.moveTo(0, yy);
    x.lineTo(W, yy);
  }
  x.stroke();
  x.globalAlpha = 1;
  x.fillStyle = tk.lineStrong;
  x.fillRect(0, hy, W, 1);
  if (view.frameT !== null) drawTarget(x, g, view.frameT, simStyle(tk));
  drawOverlay(x, g, view, { box: tk.ink, trail: tk.ch3, aim: tk.ch2 }, tk.mono);
  drawOsd(x, '800×600 · 50 Hz（仿真时间）', tk.inkMuted, tk.mono, H);
  if (view.badge) drawBadge(x, view.badge, tk.ink, tk.paperRaised, tk.ink, tk.mono, W);
}

// ---------------------------------------------------------------------------------------------- 帧带
/** 最近 N 个相机帧的去向：1 进了池（实心条），0 丢了（空心框）。最新的在右边。 */
export function drawLedger(cv: HTMLCanvasElement, cells: number[], cap: number, laneColor: string, failColor: string): void {
  const fit = fitCanvas(cv);
  if (!fit) return;
  const x = cv.getContext('2d') as CanvasRenderingContext2D;
  const { w: W, h: H, dpr } = fit;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, W, H);
  const cw = W / cap;
  const off = cap - cells.length;
  x.lineWidth = 1;
  for (let i = 0; i < cells.length; i++) {
    const x0 = Math.round((off + i) * cw);
    const x1 = Math.round((off + i + 1) * cw) - 1;
    const bw = Math.max(1, x1 - x0);
    if (cells[i] === 1) {
      x.fillStyle = laneColor;
      x.fillRect(x0, 2, bw, H - 4);
    } else {
      x.strokeStyle = failColor;
      x.strokeRect(x0 + 0.5, 2.5, Math.max(1, bw - 1), H - 5);
    }
  }
}
