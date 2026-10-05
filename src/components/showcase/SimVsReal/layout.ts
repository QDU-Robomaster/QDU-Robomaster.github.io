/* 主画面的版面：宽屏左实车 / 中间共用模块塔 / 右仿真；窄屏上下排：实车 / 共用模块 / 仿真。
   所有坐标都是 SVG 用户单位，viewBox 宽度等于容器宽度（1 单位 = 1 CSS 像素），所以字号不会被缩放。 */
import type { NodeId } from './nodes';
import { NODES, SHARED_ORDER } from './nodes';
import type { P2 } from './scene';
import { SLAB } from './scene';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Conn {
  d: string;
  lane: 'real' | 'sim';
  /** 末端画不画箭头。 */
  arrow: boolean;
}
export interface Layout {
  W: number;
  H: number;
  narrow: boolean;
  s: number;
  rig: { real: P2; sim: P2 };
  head: { real: { x: number; y: number }; sim: { x: number; y: number; end: boolean } };
  shared: Box[];
  caption: P2;
  clock: { real: P2; sim: P2 };
  chips: Array<{ id: NodeId; box: Box; sub?: string; lane: 'real' | 'sim' }>;
  card: { real: Box; sim: Box };
  stats: { real: Box; sim: Box };
  conns: Conn[];
  /** 引出线起点（相机适配模块底边中点）。 */
  drop: { real: P2; sim: P2 };
  /** 引出线起点之下是不是要接到云台镜头上（窄屏也接）。 */
  tower: Box;
}

const CHIP_SUB: Partial<Record<NodeId, string>> = {
  SharedTopicClient: '发给 C 板',
  UsbCdc: 'DevC-USB',
  CBoard: '云台 发射 裁判',
  HostTopic: '进程内',
  HikCamera: '外触发 ← C 板',
  WebotsCamera: '仿真相机',
  CameraSync: '触发 GPIO',
};

/** 字符串在小字号下的粗略宽度：ASCII 按等宽，CJK 按一个字高。 */
export function textW(s: string, px: number): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? px : px * 0.6;
  return w;
}

function chipW(id: NodeId, sub: boolean): number {
  const name = textW(NODES[id].title, 11);
  const sb = sub && CHIP_SUB[id] ? textW(CHIP_SUB[id] as string, 10) : 0;
  return Math.ceil(Math.max(name, sb)) + 22;
}

export const TILE_H = 42;
export const TILE_GAP = 14;
const CARD_HEAD = 16;

const arrowPath = (pts: Array<[number, number]>): string => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');

export function computeLayout(W: number, narrow: boolean): Layout {
  return narrow ? narrowLayout(W) : wideLayout(W);
}

// ------------------------------------------------------------------------------------------------ 宽屏
function wideLayout(W: number): Layout {
  const cx = W / 2;
  const tw = 188;
  const tx = cx - tw / 2;
  const ty0 = 84;
  const shared: Box[] = SHARED_ORDER.map((_, k) => ({ x: tx, y: ty0 + k * (TILE_H + TILE_GAP), w: tw, h: TILE_H }));
  const towerBottom = shared[3].y + TILE_H;
  const half = tx; // 左侧可用宽度
  const s = Math.max(100, Math.min(172, (half - 30) / 2.1));
  const k = s / 140;
  const rx = half / 2;
  const ry = 106 + 93 * k; // 云台顶在 ry - 93k 附近，留给相机适配模块
  const gx = -0.49 * 0.866 * s; // 云台底座的画面偏移
  const rig = { real: [rx, ry] as P2, sim: [W - rx, ry] as P2 };
  const chips: Layout['chips'] = [];
  const conns: Conn[] = [];

  // 相机适配模块：实车 HikCamera；仿真 WebotsCamera -> CameraSync
  const hw = Math.max(chipW('HikCamera', true), 120);
  const hik: Box = { x: rig.real[0] + gx - hw / 2, y: 58, w: hw, h: 34 };
  chips.push({ id: 'HikCamera', box: hik, sub: CHIP_SUB.HikCamera, lane: 'real' });
  const sw = Math.max(chipW('CameraSync', true), chipW('WebotsCamera', true), 120);
  const sgx = rig.sim[0] + gx;
  const wcam: Box = { x: sgx - sw / 2, y: 12, w: sw, h: 34 };
  const csync: Box = { x: sgx - sw / 2, y: 58, w: sw, h: 34 };
  chips.push({ id: 'WebotsCamera', box: wcam, sub: CHIP_SUB.WebotsCamera, lane: 'sim' });
  chips.push({ id: 'CameraSync', box: csync, sub: CHIP_SUB.CameraSync, lane: 'sim' });
  const cfsMid = shared[0].y + TILE_H / 2;
  conns.push({ d: arrowPath([[hik.x + hik.w, hik.y + hik.h / 2], [tx - 26, hik.y + hik.h / 2], [tx - 26, cfsMid], [tx - 2, cfsMid]]), lane: 'real', arrow: true });
  conns.push({ d: arrowPath([[csync.x, csync.y + csync.h / 2], [tx + tw + 26, csync.y + csync.h / 2], [tx + tw + 26, cfsMid], [tx + tw + 2, cfsMid]]), lane: 'sim', arrow: true });
  conns.push({ d: arrowPath([[wcam.x + wcam.w / 2, wcam.y + wcam.h], [csync.x + csync.w / 2, csync.y - 2]]), lane: 'sim', arrow: true });

  // 输出：Aim -> 实车（向左三个）/ 仿真（host Topic + 三个执行模块）
  const aim = shared[3];
  const aimMid = aim.y + TILE_H / 2;
  const outY = Math.max(towerBottom + 36, ry + 0.665 * s + 40);
  const gap = 18;
  let xr = tx - 12;
  conns.push({ d: arrowPath([[tx, aimMid], [tx - 8, aimMid], [tx - 8, outY], [xr + 2, outY]]), lane: 'real', arrow: true });
  for (const id of ['SharedTopicClient', 'UsbCdc', 'CBoard'] as NodeId[]) {
    const w = chipW(id, true);
    const b: Box = { x: xr - w, y: outY - 17, w, h: 34 };
    chips.push({ id, box: b, sub: CHIP_SUB[id], lane: 'real' });
    xr -= w;
    if (id !== 'CBoard') {
      conns.push({ d: arrowPath([[xr, outY], [xr - gap + 2, outY]]), lane: 'real', arrow: true });
      xr -= gap;
    }
  }
  const hx = tx + tw + 12;
  const hw2 = chipW('HostTopic', true);
  conns.push({ d: arrowPath([[tx + tw, aimMid], [tx + tw + 8, aimMid], [tx + tw + 8, outY], [hx - 2, outY]]), lane: 'sim', arrow: true });
  chips.push({ id: 'HostTopic', box: { x: hx, y: outY - 17, w: hw2, h: 34 }, sub: CHIP_SUB.HostTopic, lane: 'sim' });
  const gx0 = hx + hw2 + gap;
  const bar = hx + hw2 + gap / 2;
  const r1y = outY - 25;
  const r2y = outY + 3;
  const ids1: NodeId[] = ['WebotsGimbal', 'WebotsReferee'];
  let xg = gx0;
  for (const id of ids1) {
    const w = chipW(id, false);
    chips.push({ id, box: { x: xg, y: r1y, w, h: 22 }, lane: 'sim' });
    xg += w + 8;
  }
  chips.push({ id: 'WebotsFireNotify', box: { x: gx0, y: r2y, w: chipW('WebotsFireNotify', false), h: 22 }, lane: 'sim' });
  conns.push({ d: arrowPath([[hx + hw2, outY], [bar, outY]]), lane: 'sim', arrow: false });
  conns.push({ d: arrowPath([[bar, r1y + 11], [bar, r2y + 11]]), lane: 'sim', arrow: false });
  conns.push({ d: arrowPath([[bar, r1y + 11], [gx0 - 2, r1y + 11]]), lane: 'sim', arrow: true });
  conns.push({ d: arrowPath([[bar, r2y + 11], [gx0 - 2, r2y + 11]]), lane: 'sim', arrow: true });

  // 相机卡与读数
  const cy0 = outY + 48;
  const cw = Math.max(140, Math.min(208, cx - 14 * 3 - 126));
  const ch = CARD_HEAD + Math.round(cw * 0.75);
  const stW = Math.max(120, Math.min(170, cx - 14 - cw - 14 - 12));
  const cardReal: Box = { x: 14, y: cy0, w: cw, h: ch };
  const cardSim: Box = { x: W - 14 - cw, y: cy0, w: cw, h: ch };
  const stReal: Box = { x: 14 + cw + 14, y: cy0 + CARD_HEAD, w: stW, h: ch - CARD_HEAD };
  const stSim: Box = { x: W - 14 - cw - 14 - stW, y: cy0 + CARD_HEAD, w: stW, h: ch - CARD_HEAD };

  // 实车卡：相机适配模块到画面的暗示线
  return {
    W,
    H: cy0 + ch + 6,
    narrow: false,
    s,
    rig,
    head: { real: { x: 14, y: 8 }, sim: { x: W - 14, y: 8, end: true } },
    shared,
    caption: [cx, ty0 - 12],
    clock: { real: [cx - 102, 6], sim: [cx + 6, 6] },
    chips,
    card: { real: cardReal, sim: cardSim },
    stats: { real: stReal, sim: stSim },
    conns,
    drop: { real: [hik.x + hik.w / 2, hik.y + hik.h], sim: [csync.x + csync.w / 2, csync.y + csync.h] },
    tower: { x: tx, y: ty0, w: tw, h: towerBottom - ty0 },
  };
}

// ------------------------------------------------------------------------------------------------ 窄屏
function narrowLayout(W: number): Layout {
  const s = Math.max(86, Math.min(140, (W - 8) / 2.15));
  const k = s / 140;
  const chips: Layout['chips'] = [];
  const conns: Conn[] = [];
  const rigBlock = (top: number): { cy: number; bottom: number } => {
    const cy = top + 93 * k;
    return { cy, bottom: cy + (0.615 * s + SLAB.t * s) + 6 };
  };

  // 实车
  let y = 0;
  const headReal = { x: 0, y };
  y += 50;
  const gxn = -0.49 * 0.866 * s;
  const hwN = Math.max(chipW('HikCamera', true), 120);
  const hik: Box = { x: Math.max(0, Math.min(W - hwN, W / 2 + gxn - hwN / 2)), y, w: hwN, h: 34 };
  chips.push({ id: 'HikCamera', box: hik, sub: CHIP_SUB.HikCamera, lane: 'real' });
  y += 34 + 8;
  const rr = rigBlock(y);
  const rxReal = W / 2;
  y = rr.bottom + 6;
  const cw = Math.min(176, Math.floor(W * 0.52));
  const ch = CARD_HEAD + Math.round(cw * 0.75);
  const cardReal: Box = { x: 0, y, w: cw, h: ch };
  const stReal: Box = { x: cw + 12, y: y + CARD_HEAD, w: W - cw - 12, h: ch - CARD_HEAD };
  y += ch + 12;
  // 实车输出：横排三个（窄屏不带副标题）
  let xo = 0;
  const outRealY = y;
  const realOut: NodeId[] = ['SharedTopicClient', 'UsbCdc', 'CBoard'];
  realOut.forEach((id, i) => {
    const w = chipW(id, false);
    chips.push({ id, box: { x: xo, y: outRealY, w, h: 26 }, lane: 'real' });
    xo += w;
    if (i < realOut.length - 1) {
      conns.push({ d: arrowPath([[xo, outRealY + 13], [xo + 11, outRealY + 13]]), lane: 'real', arrow: true });
      xo += 13;
    }
  });
  y += 26 + 20;

  // 共用塔
  const clockY = y;
  y += 52;
  const captionY = y + 6;
  y += 36;
  const tw = Math.min(236, W - 36);
  const tx = (W - tw) / 2;
  const towerTop = y;
  const shared: Box[] = SHARED_ORDER.map((_, i) => ({ x: tx, y: towerTop + i * (TILE_H + TILE_GAP), w: tw, h: TILE_H }));
  const towerBottom = shared[3].y + TILE_H;
  y = towerBottom + 30;
  // 塔两端：两边各自接进来、各自接出去（短桩，实车在左四分位，仿真在右四分位）
  const lx = tx + tw * 0.22;
  const rxq = tx + tw * 0.78;
  conns.push({ d: arrowPath([[lx, towerTop - 14], [lx, towerTop - 2]]), lane: 'real', arrow: true });
  conns.push({ d: arrowPath([[rxq, towerTop - 14], [rxq, towerTop - 2]]), lane: 'sim', arrow: true });
  conns.push({ d: arrowPath([[lx, towerBottom + 2], [lx, towerBottom + 14]]), lane: 'real', arrow: true });
  conns.push({ d: arrowPath([[rxq, towerBottom + 2], [rxq, towerBottom + 14]]), lane: 'sim', arrow: true });

  // 仿真
  const headSim = { x: 0, y, end: false };
  y += 50;
  const sw = Math.floor((W - 12) / 2);
  const wcam: Box = { x: 0, y, w: sw, h: 34 };
  const csync: Box = { x: sw + 12, y, w: sw, h: 34 };
  chips.push({ id: 'WebotsCamera', box: wcam, sub: CHIP_SUB.WebotsCamera, lane: 'sim' });
  chips.push({ id: 'CameraSync', box: csync, sub: CHIP_SUB.CameraSync, lane: 'sim' });
  conns.push({ d: arrowPath([[wcam.x + wcam.w, wcam.y + 17], [csync.x - 2, csync.y + 17]]), lane: 'sim', arrow: true });
  y += 34 + 8;
  const sr = rigBlock(y);
  const rxSim = W / 2;
  y = sr.bottom + 6;
  const cardSim: Box = { x: 0, y, w: cw, h: ch };
  const stSim: Box = { x: cw + 12, y: y + CARD_HEAD, w: W - cw - 12, h: ch - CARD_HEAD };
  y += ch + 12;
  // 仿真输出：host Topic -> 三个执行模块（竖排）
  const hId: NodeId = 'HostTopic';
  const hw = chipW(hId, true);
  const outSimY = y;
  chips.push({ id: hId, box: { x: 0, y: outSimY, w: hw, h: 34 }, sub: CHIP_SUB[hId], lane: 'sim' });
  const gx0 = hw + 22;
  const bar = hw + 11;
  const simOut: NodeId[] = ['WebotsGimbal', 'WebotsFireNotify', 'WebotsReferee'];
  simOut.forEach((id, i) => {
    const yy = outSimY - 14 + i * 26;
    chips.push({ id, box: { x: gx0, y: yy, w: chipW(id, false), h: 22 }, lane: 'sim' });
    conns.push({ d: arrowPath([[bar, yy + 11], [gx0 - 2, yy + 11]]), lane: 'sim', arrow: true });
  });
  conns.push({ d: arrowPath([[hw, outSimY + 17], [bar, outSimY + 17]]), lane: 'sim', arrow: false });
  conns.push({ d: arrowPath([[bar, outSimY - 14 + 11], [bar, outSimY - 14 + 2 * 26 + 11]]), lane: 'sim', arrow: false });
  const simOutBottom = outSimY - 14 + 3 * 26;
  y = Math.max(outSimY + 34, simOutBottom) + 4;
  return {
    W,
    H: y,
    narrow: true,
    s,
    rig: { real: [rxReal, rr.cy], sim: [rxSim, sr.cy] },
    head: { real: headReal, sim: headSim },
    shared,
    caption: [W / 2, captionY],
    clock: { real: [Math.max(0, W / 2 - 150), clockY], sim: [W / 2 + 6, clockY] },
    chips,
    card: { real: cardReal, sim: cardSim },
    stats: { real: stReal, sim: stSim },
    conns,
    drop: { real: [hik.x + hik.w / 2, hik.y + hik.h], sim: [Math.min(wcam.x + wcam.w - 6, Math.max(6, rxSim + gxn)), wcam.y + wcam.h] },
    tower: { x: tx, y: towerTop, w: tw, h: towerBottom - towerTop },
  };
}
