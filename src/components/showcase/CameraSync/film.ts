/* The camera's picture for the film strip: a grey, noisy view of an enemy infantry robot spinning in place (小陀螺) with its four
   armor plates. Geometry is pure and tested; renderShot() draws onto a canvas. The picture depends on the frame only through its
   exposure midpoint (where the plates are) and E (brightness, noise, smear along the spin), so every frame is a distinct moment. */

export const SHOT_W = 160, SHOT_H = 120;
export const SPIN_HZ = 2;                         // chassis revolutions per second
const R_PLATE = 34, PLATE_W = 38, PLATE_H = 28, CX = 80, PLATE_Y = 70;

export interface ShotInfo { k: number; n: number; E: number; tMid: number }
export interface Plate { x: number; w: number; cos: number; face: number }

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** chassis yaw (rad) at exposure time t (us) */
export const spinAngle = (tUs: number): number => 2 * Math.PI * SPIN_HZ * (tUs / 1e6) + 0.7;
/** how much light the sensor collects, relative to the 5 ms default */
export const exposureGain = (E: number): number => Math.pow(Math.max(E, 1) / 5000, 0.6);
/** plates facing the camera at yaw theta, far first. x = centre, w = apparent width (px); the four plates sit 90 degrees apart */
export function armorPlates(theta: number): Plate[] {
  const out: Plate[] = [];
  for (let i = 0; i < 4; i++) {
    const a = theta + i * Math.PI / 2, c = Math.cos(a);
    if (c > 0.06) out.push({ x: CX + R_PLATE * Math.sin(a), w: PLATE_W * c, cos: c, face: i });
  }
  return out.sort((p, q) => p.cos - q.cos);
}
/** sub-exposure times (us) that smear the picture across (most of) the exposure */
export function subTimes(tMid: number, E: number, n = 5): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(tMid + (n === 1 ? 0 : i / (n - 1) - 0.5) * E * 0.7);
  return out;
}
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const grey = (v: number): string => { const g = Math.round(clamp(v, 0, 1) * 255); return `rgb(${g},${g},${g})`; };

function drawScene(g: CanvasRenderingContext2D, theta: number, gain: number): void {
  const body = (v: number): string => grey(v * gain);
  const bar = grey(0.96 * Math.pow(gain, 0.25) + 0.04);
  // arena: back wall, floor, posts, a dark panel band
  g.fillStyle = body(0.34); g.fillRect(0, 0, SHOT_W, 80);
  g.fillStyle = body(0.46); g.fillRect(0, 80, SHOT_W, SHOT_H - 80);
  g.fillStyle = body(0.22); g.fillRect(0, 22, SHOT_W, 6);
  g.fillStyle = body(0.44); g.fillRect(12, 10, 7, 70); g.fillRect(141, 10, 7, 70);
  g.fillStyle = body(0.28); g.fillRect(0, 79, SHOT_W, 2);
  // shadow, wheels, chassis, top deck, gimbal and muzzle
  g.fillStyle = body(0.27); g.beginPath(); g.ellipse(CX, 95, 58, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = body(0.16); g.fillRect(38, 82, 16, 11); g.fillRect(106, 82, 16, 11);
  g.fillStyle = body(0.60); g.fillRect(42, 56, 76, 28);
  g.fillStyle = body(0.74); g.fillRect(42, 50, 76, 6);
  g.fillStyle = body(0.50); g.fillRect(70, 26, 20, 24);
  g.fillStyle = body(0.18); g.beginPath(); g.arc(CX, 37, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = body(0.62); g.beginPath(); g.arc(CX, 37, 2.4, 0, Math.PI * 2); g.fill();
  // armor plates: dark body, a light bar at each end, the number sticker between
  for (const p of armorPlates(theta)) {
    const x0 = p.x - p.w / 2, y0 = PLATE_Y - PLATE_H / 2, bw = Math.max(1.8, 8 * p.cos);
    g.fillStyle = body(0.07); g.fillRect(x0, y0, p.w, PLATE_H);
    g.fillStyle = body(0.88); g.fillRect(p.x - p.w * 0.18, PLATE_Y - 7, p.w * 0.36, 14);
    g.fillStyle = bar; g.fillRect(x0, PLATE_Y - 11, bw, 22); g.fillRect(x0 + p.w - bw, PLATE_Y - 11, bw, 22);
    g.save(); g.translate(p.x, PLATE_Y + 4); g.scale(p.cos, 1); g.fillStyle = body(0.10); g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.fillText('3', 0, 0); g.restore();
  }
}

/** draw one frame into a SHOT_W x SHOT_H canvas context */
export function renderShot(g: CanvasRenderingContext2D, f: ShotInfo): void {
  const gain = exposureGain(f.E), times = subTimes(f.tMid, f.E);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  times.forEach((t, i) => { g.globalAlpha = 1 / (i + 1); drawScene(g, spinAngle(t), gain); });
  g.globalAlpha = 1;
  const im = g.getImageData(0, 0, SHOT_W, SHOT_H), a = im.data, r = rng((f.k * 2654435761 + f.n) >>> 0), sig = 3 + 3.2 / Math.sqrt(Math.max(0.2, gain));
  for (let j = 0; j < SHOT_H; j++) {
    const row = (r() - 0.5) * 2.4;
    for (let i = 0; i < SHOT_W; i++) {
      const o = (j * SHOT_W + i) * 4, dx = (i - SHOT_W / 2) / (SHOT_W / 2), dy = (j - SHOT_H / 2) / (SHOT_H / 2), vg = 1 - 0.18 * (dx * dx + dy * dy);
      const v = clamp(a[o] * vg + (r() + r() + r() - 1.5) * sig + row, 0, 255);
      a[o] = a[o + 1] = a[o + 2] = v;
    }
  }
  g.putImageData(im, 0, 0);
}
