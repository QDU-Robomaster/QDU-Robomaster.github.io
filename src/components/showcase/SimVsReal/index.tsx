/* SimVsReal：同一套自瞄模块，一边接实车，一边接 Webots 仿真。
   主画面是一个等轴场景：左边实车（全材质的云台和装甲目标），右边 Webots（同一份几何，只画线框，铺网格地面）；
   中间一座共用模块塔，两端各接各的适配模块；下方是两张相机画面卡。
   - 两只时钟：实车是墙钟，不会停；Webots 是仿真时间，等检测、暂停时都会停，右边那台机器跟着冻住。
   - “让检测变慢”：实车 100 Hz 照常出帧，两槽帧池满了就丢帧；仿真时钟停下来等检测，一帧不丢。
   - “暂停仿真”：只停 Webots 时钟。
   - 点任一模块：共用模块显示“两边同一份代码”和两边的配置文件；适配模块显示它换成了谁。
   逻辑在 sim.ts（纯函数，有单测），几何在 scene.ts，版面在 layout.ts，这里只管绘制和交互。 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import {
  LEDGER,
  MAX_EXTRA_MS,
  REAL_CAM_PERIOD_US,
  BASE_DETECT_US,
  TRAIL_WINDOW_S,
  US,
  autoSweep,
  createWorld,
  lamps,
  settle,
  simSpeedModel,
  stepWorld,
} from './sim';
import type { Config, World } from './sim';
import { NODES, SHARED_NOTE, SHARED_ORDER, SHARED_SUB } from './nodes';
import type { NodeId, NodeInfo } from './nodes';
import { drawLedger, drawRealCard, drawSimCard, readTokens } from './draw';
import type { CardView, Tokens } from './draw';
import { computeLayout } from './layout';
import type { Box, Layout } from './layout';
import { SLAB, cameraPoint, ground, poseAt, project, rigFaces, slabCorners } from './scene';
import type { DrawFace, P2 } from './scene';

export type ShowcaseProps = { active: boolean; reducedMotion: boolean };

/** 容器窄于这个宽度就上下排。 */
const NARROW_BELOW = 900;
/** 减少动态时静帧用的检测变慢量：丢帧和仿真落后都看得清。 */
const STILL_EXTRA_MS = 24;
const BASE_MS = BASE_DETECT_US / 1000;
const CAM_MS = REAL_CAM_PERIOD_US / 1000;
/** 主画面重画的最短间隔（秒）。 */
const RIG_DT = 0.03;
const SVGNS = 'http://www.w3.org/2000/svg';

const cx = (...a: Array<string | false | undefined>): string => a.filter(Boolean).join(' ');

function cardView(w: World, lane: 'real' | 'sim', still: boolean): CardView {
  const l = lane === 'real' ? w.real : w.sim;
  const last = l.last;
  if (!last) return { frameT: null, hist: [], seq: 0, badge: null };
  const lo = last.capUs - TRAIL_WINDOW_S * US;
  const hist = l.history.filter((h) => h >= lo).map((h) => h / US);
  let badge: string | null = null;
  if (lane === 'real') {
    const recent = w.real.nowUs - w.real.lastDropUs < 250_000;
    if (w.real.dropped > 0 && (recent || still)) badge = '丢帧 ' + w.real.dropped;
  }
  return { frameT: last.capUs / US, hist, seq: last.seq, badge };
}

type Cell = HTMLElement | SVGElement | HTMLCanvasElement | null;

// ------------------------------------------------------------------------------------------------ 主画面：机器的面 -> 池里的 <path>
/** 明暗 -> 颜色：只用 token，亮色主题越亮越靠近 paper-raised，暗色主题越亮越靠近 ink。 */
function toneColor(tone: number, team: boolean, dark: boolean): string {
  const q = Math.round(Math.max(0, Math.min(1, tone / 0.7)) * 16);
  const p = dark ? Math.round((q / 16) * 78) + 4 : Math.round((1 - q / 16) * 90) + 4;
  const base = `color-mix(in srgb, var(--ink) ${p}%, var(--paper-raised))`;
  return team ? `color-mix(in srgb, var(--team-accent, var(--ch1)) 58%, ${base})` : base;
}

const poly = (pts: P2[]): string => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';

interface PathSpec {
  d: string;
  cls: string;
  color: string;
}

function specsOf(list: DrawFace[], wire: boolean, dark: boolean): PathSpec[] {
  const out: PathSpec[] = [];
  for (const f of list) {
    if (wire) {
      if (f.kind === 'c') {
        if (f.ci % 2) continue;
        out.push({ d: 'M' + f.pts[0][0].toFixed(1) + ' ' + f.pts[0][1].toFixed(1) + 'L' + f.pts[3][0].toFixed(1) + ' ' + f.pts[3][1].toFixed(1), cls: styles.wf, color: '' });
      } else if (f.kind === 'l') {
        out.push({ d: poly(f.pts), cls: styles.wl, color: '' });
      } else if (f.kind === 's') {
        out.push({ d: poly(f.pts), cls: styles.wf, color: '' });
      }
    } else if (f.kind === 'l') {
      out.push({ d: poly(f.pts), cls: styles.fl, color: '' });
    } else {
      out.push({ d: poly(f.pts), cls: f.kind === 'c' ? styles.fc : f.kind === 'd' ? styles.fd : styles.fs, color: toneColor(f.tone, f.team, dark) });
    }
  }
  return out;
}

interface PoolEl extends SVGPathElement {
  __d?: string;
  __c?: string;
  __k?: string;
}

function applySpecs(g: SVGGElement, specs: PathSpec[]): void {
  const kids = g.children;
  for (let i = 0; i < specs.length; i++) {
    let el = kids[i] as PoolEl | undefined;
    if (!el) {
      el = document.createElementNS(SVGNS, 'path') as PoolEl;
      g.appendChild(el);
    }
    const sp = specs[i];
    if (el.__d !== sp.d) {
      el.setAttribute('d', sp.d);
      el.__d = sp.d;
    }
    if (el.__c !== sp.cls) {
      el.setAttribute('class', sp.cls);
      el.__c = sp.cls;
    }
    if (el.__k !== sp.color) {
      el.style.color = sp.color;
      el.__k = sp.color;
    }
  }
  for (let i = kids.length - 1; i >= specs.length; i--) g.removeChild(kids[i]);
}

/** 在底座上看得见的几根线：地板外轮廓、目标圈。 */
function ringPath(s: number): string {
  const pts: P2[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push(ground(0.56 + 0.3 * Math.cos(a), 0.3 * Math.sin(a), 0, s));
  }
  return poly(pts);
}

function gridPath(s: number): string {
  const { x0, x1, y0, y1 } = SLAB;
  let d = '';
  const nx = 8;
  const ny = 4;
  const m = (p: P2): string => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    d += 'M' + m(ground(x, y0, 0, s)) + 'L' + m(ground(x, y1, 0, s));
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    d += 'M' + m(ground(x0, y, 0, s)) + 'L' + m(ground(x1, y, 0, s));
  }
  return d;
}

function insetPath(s: number): string {
  const { x0, x1, y0, y1 } = SLAB;
  const k = 0.07;
  return poly([ground(x0 + k, y1 - k, 0, s), ground(x1 - k, y1 - k, 0, s), ground(x1 - k, y0 + k, 0, s), ground(x0 + k, y0 + k, 0, s)]);
}

export default function SimVsReal({ active, reducedMotion }: ShowcaseProps): JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const [W, setW] = useState(1000);
  const [extraMs, setExtraMs] = useState<number>(reducedMotion ? STILL_EXTRA_MS : 0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState<boolean>(!reducedMotion);
  const [sel, setSel] = useState<NodeId>('ArmorDetector');
  const narrow = W < NARROW_BELOW;
  const L: Layout = useMemo(() => computeLayout(W, narrow), [W, narrow]);
  const layoutRef = useRef<Layout>(L);
  layoutRef.current = L;

  const worldRef = useRef<World | null>(null);
  if (worldRef.current === null) worldRef.current = reducedMotion ? settle(STILL_EXTRA_MS, false) : createWorld();
  const cfgRef = useRef<Config>({ extraMs, paused });
  const autoRef = useRef(auto);
  const touchedRef = useRef(false);
  const autoT = useRef(0);
  const tokensRef = useRef<Tokens | null>(null);
  const darkRef = useRef(false);
  const themeVer = useRef(0);
  const cells = useRef<Record<string, Cell>>({});
  const cache = useRef<Record<string, string>>({});
  const drawKey = useRef<Record<string, string>>({});
  const rigLast = useRef({ r: -9, s: -9 });
  const rigForce = useRef(true);
  const modeRef = useRef({ active, reducedMotion });
  modeRef.current = { active, reducedMotion };

  const setCell = useCallback(
    (k: string) => (n: Cell) => {
      cells.current[k] = n;
    },
    [],
  );

  // ---------------------------------------------------------------------------------- 绘制 / 写 DOM
  const setText = (k: string, v: string): void => {
    const n = cells.current[k];
    if (n && cache.current[k] !== v) {
      n.textContent = v;
      cache.current[k] = v;
    }
  };
  const setAttr = (k: string, name: string, v: string): void => {
    const n = cells.current[k];
    const key = k + '@' + name;
    if (n && cache.current[key] !== v) {
      n.setAttribute(name, v);
      cache.current[key] = v;
    }
  };

  const paintRigs = useCallback((): void => {
    const w = worldRef.current as World;
    const lay = layoutRef.current;
    const force = rigForce.current;
    rigForce.current = false;
    const tR = w.real.nowUs / US;
    const tS = w.sim.simUs / US;
    const last = rigLast.current;
    const dark = darkRef.current;
    const side = (key: 'real' | 'sim', t: number, g: Cell, dropEl: Cell): void => {
      const pose = poseAt(t);
      if (g) applySpecs(g as unknown as SVGGElement, specsOf(rigFaces(pose, lay.s), key === 'sim', dark));
      const cam = project(cameraPoint(pose), lay.s);
      const o = lay.rig[key];
      if (dropEl) {
        dropEl.setAttribute('x2', (o[0] + cam[0]).toFixed(1));
        dropEl.setAttribute('y2', (o[1] + cam[1]).toFixed(1));
      }
    };
    if (force || Math.abs(tR - last.r) >= RIG_DT) {
      last.r = tR;
      side('real', tR, cells.current.rigR, cells.current.dropR);
    }
    if (force || Math.abs(tS - last.s) >= RIG_DT) {
      last.s = tS;
      side('sim', tS, cells.current.rigS, cells.current.dropS);
    }
  }, []);

  const paint = useCallback((): void => {
    const w = worldRef.current as World;
    const tk = tokensRef.current;
    if (!tk) return;
    const cfg = cfgRef.current;
    const still = modeRef.current.reducedMotion;
    const r = w.real;
    const s = w.sim;

    // 时钟
    setText('rClock', (r.nowUs / US).toFixed(3) + ' s');
    setText('sClock', (s.simUs / US).toFixed(3) + ' s');
    setAttr('rHand', 'transform', 'rotate(' + (((r.nowUs / US) % 10) * 36).toFixed(2) + ' 17 22)');
    setAttr('sHand', 'transform', 'rotate(' + (((s.simUs / US) % 10) * 36).toFixed(2) + ' 17 22)');
    const lag = Math.max(0, (s.wallUs - s.simUs) / US);
    const halted = cfg.paused && s.detLeftUs === 0;
    const waiting = !halted && s.holdFrac > 0.5;
    setText('sSub', (halted ? '暂停 · ' : '') + '落后 ' + lag.toFixed(1) + ' s');
    setAttr('sClockBox', 'data-state', halted ? 'pause' : waiting ? 'wait' : 'run');
    setAttr('rigSBox', 'data-state', halted ? 'pause' : waiting ? 'wait' : 'run');

    // 统计
    const slotState = r.slots.map((x) => x.state);
    setText('rShot', String(r.shot));
    setText('rProc', String(r.processed));
    setText('rDrop', String(r.dropped));
    cells.current.rDrop?.classList.toggle(styles.failVal, r.dropped > 0);
    slotState.forEach((st, i) => setAttr('slot' + i, 'data-state', st));
    setAttr('pool', 'data-flash', r.nowUs - r.lastDropUs < 300_000 ? '1' : '0');
    setText('sSeq', String(s.seq));
    setText('sProc', String(s.processed));
    setText('sDrop', String(s.dropped));
    setText('sSpeed', s.speed.toFixed(2) + '×');

    // 灯条
    const lm = lamps(w);
    for (let k = 0; k < 4; k++) {
      const a = cells.current['lampR' + k];
      const b = cells.current['lampS' + k];
      if (a) a.style.opacity = (0.2 + 0.8 * lm.real[k]).toFixed(2);
      if (b) b.style.opacity = (0.2 + 0.8 * lm.sim[k]).toFixed(2);
    }

    paintRigs();

    // 画布：只在内容变了的时候重画
    const rv = cardView(w, 'real', still);
    const sv = cardView(w, 'sim', still);
    sv.badge = halted ? '已暂停' : waiting ? '等检测' : null;
    const rc = cells.current.rCv as HTMLCanvasElement | null;
    const sc = cells.current.sCv as HTMLCanvasElement | null;
    const rl = cells.current.rLedger as HTMLCanvasElement | null;
    const sl = cells.current.sLedger as HTMLCanvasElement | null;
    const size = (c: HTMLCanvasElement | null): string => (c ? c.clientWidth + 'x' + c.clientHeight : '');
    const dk = drawKey.current;
    if (rc) {
      const key = [rv.seq, rv.badge, size(rc), themeVer.current].join('|');
      if (dk.rCv !== key) {
        drawRealCard(rc, rv, tk);
        dk.rCv = key;
      }
    }
    if (sc) {
      const key = [sv.seq, sv.badge, size(sc), themeVer.current].join('|');
      if (dk.sCv !== key) {
        drawSimCard(sc, sv, tk);
        dk.sCv = key;
      }
    }
    if (rl) {
      const key = [r.shot, size(rl), themeVer.current].join('|');
      if (dk.rLedger !== key) {
        drawLedger(rl, r.ledger, LEDGER, tk.ch0, tk.fail);
        dk.rLedger = key;
      }
    }
    if (sl) {
      const key = [s.seq, size(sl), themeVer.current].join('|');
      if (dk.sLedger !== key) {
        drawLedger(sl, s.ledger, LEDGER, tk.ch1, tk.fail);
        dk.sLedger = key;
      }
    }
  }, [paintRigs]);

  // ---------------------------------------------------------------------------------- 布局宽度、主题
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return undefined;
    const readTheme = (): void => {
      tokensRef.current = readTokens(root);
      darkRef.current = document.documentElement.getAttribute('data-theme') === 'dark';
    };
    readTheme();
    const measure = (): void => {
      const w = Math.round(stage.clientWidth);
      if (w > 0) setW((o) => (o === w ? o : w));
    };
    measure();
    paint();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      measure();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    });
    ro.observe(stage);
    const mo = new MutationObserver(() => {
      readTheme();
      themeVer.current++;
      rigForce.current = true;
      paint();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [paint]);

  // 版面变了（宽度、窄屏切换）：机器按新比例重画，画布尺寸也变了
  useLayoutEffect(() => {
    rigForce.current = true;
    cache.current = {};
    paint();
    const id = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(id);
  }, [L, paint]);

  // ---------------------------------------------------------------------------------- 减少动态：静帧
  useEffect(() => {
    if (!reducedMotion) return;
    worldRef.current = settle(extraMs, paused);
    cfgRef.current = { extraMs, paused };
    drawKey.current = {};
    rigForce.current = true;
    paint();
  }, [reducedMotion, extraMs, paused, paint]);

  useEffect(() => {
    if (reducedMotion) {
      autoRef.current = false;
      setAuto(false);
      if (!touchedRef.current) setExtraMs(STILL_EXTRA_MS);
    } else if (!touchedRef.current) {
      autoRef.current = true;
      setAuto(true);
      setExtraMs(0);
      worldRef.current = createWorld();
      cfgRef.current = { extraMs: 0, paused: false };
      setPaused(false);
      drawKey.current = {};
      rigForce.current = true;
    }
  }, [reducedMotion]);

  // ---------------------------------------------------------------------------------- 动画循环
  useEffect(() => {
    if (!active || reducedMotion) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (autoRef.current) {
        autoT.current += dt;
        const v = autoSweep(autoT.current);
        if (v !== cfgRef.current.extraMs) {
          cfgRef.current.extraMs = v;
          setExtraMs(v);
        }
      }
      stepWorld(worldRef.current as World, dt, cfgRef.current);
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion, paint]);

  // ---------------------------------------------------------------------------------- 交互
  const takeOver = (): void => {
    touchedRef.current = true;
    autoRef.current = false;
    setAuto(false);
  };
  const onSlide = (e: React.ChangeEvent<HTMLInputElement>): void => {
    takeOver();
    const v = Math.max(0, Math.min(MAX_EXTRA_MS, Number(e.target.value) || 0));
    cfgRef.current.extraMs = v;
    setExtraMs(v);
  };
  const onPause = (): void => {
    const next = !cfgRef.current.paused;
    cfgRef.current.paused = next;
    setPaused(next);
  };

  // ---------------------------------------------------------------------------------- 渲染
  const det = BASE_MS + extraMs;
  const speed = simSpeedModel(extraMs);
  const node = NODES[sel];
  const mk = (lane: 'real' | 'sim'): string => `url(#${uid}${lane})`;

  const onKey = (id: NodeId) => (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSel(id);
    }
  };

  const chipEl = (c: Layout['chips'][number]): JSX.Element => {
    const { id, box: b, sub, lane } = c;
    const two = !!sub && b.h > 30;
    return (
      <g
        key={id}
        className={cx(styles.chip, lane === 'real' ? styles.laneReal : styles.laneSim)}
        role="button"
        tabIndex={0}
        aria-pressed={sel === id}
        aria-label={NODES[id].title + (sub ? '，' + sub : '')}
        onClick={() => setSel(id)}
        onKeyDown={onKey(id)}
      >
        <title>{NODES[id].role}</title>
        <rect className={styles.chipBody} x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h - 1} />
        <rect className={styles.chipBar} x={b.x} y={b.y} width={3} height={b.h} />
        <text className={styles.chipName} x={b.x + 11} y={two ? b.y + 14 : b.y + b.h / 2 + 4}>
          {NODES[id].title}
        </text>
        {two ? (
          <text className={styles.chipSub} x={b.x + 11} y={b.y + 27}>
            {sub}
          </text>
        ) : null}
      </g>
    );
  };

  const tileEl = (id: (typeof SHARED_ORDER)[number], k: number): JSX.Element => {
    const b: Box = L.shared[k];
    const dx = 8;
    const dy = 5;
    return (
      <g key={id} className={styles.tile} role="button" tabIndex={0} aria-pressed={sel === id} aria-label={id + '，' + SHARED_NOTE} onClick={() => setSel(id)} onKeyDown={onKey(id)}>
        <title>{SHARED_NOTE}</title>
        <polygon className={styles.tTop} points={`${b.x},${b.y} ${b.x + b.w},${b.y} ${b.x + b.w + dx},${b.y - dy} ${b.x + dx},${b.y - dy}`} />
        <polygon className={styles.tSide} points={`${b.x + b.w},${b.y} ${b.x + b.w + dx},${b.y - dy} ${b.x + b.w + dx},${b.y + b.h - dy} ${b.x + b.w},${b.y + b.h}`} />
        <rect className={styles.tFront} x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h - 1} />
        <rect className={cx(styles.lamp, styles.laneReal)} ref={setCell('lampR' + k)} x={b.x + 1} y={b.y + 1} width={8} height={b.h - 2} />
        <rect className={cx(styles.lamp, styles.laneSim)} ref={setCell('lampS' + k)} x={b.x + b.w - 9} y={b.y + 1} width={8} height={b.h - 2} />
        <text className={styles.tName} x={b.x + b.w / 2} y={b.y + 17}>
          {id}
        </text>
        <text className={styles.tSub} x={b.x + b.w / 2} y={b.y + 31}>
          {SHARED_SUB[id]}
        </text>
      </g>
    );
  };

  const clockEl = (lane: 'real' | 'sim', p: P2): JSX.Element => (
    <g
      key={lane}
      className={cx(styles.clock, lane === 'real' ? styles.laneReal : styles.laneSim)}
      transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}
      data-state="run"
      ref={lane === 'sim' ? setCell('sClockBox') : undefined}
    >
      <rect className={styles.clockBg} x={0} y={0} width={96} height={52} />
      <circle className={styles.dialRing} cx={17} cy={22} r={15} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return <line key={i} className={styles.dialTick} x1={17 + Math.sin(a) * 12.5} y1={22 - Math.cos(a) * 12.5} x2={17 + Math.sin(a) * 15} y2={22 - Math.cos(a) * 15} />;
      })}
      <line className={styles.dialHand} x1={17} y1={22} x2={17} y2={10} ref={setCell(lane === 'real' ? 'rHand' : 'sHand')} />
      <circle className={styles.dialHub} cx={17} cy={22} r={1.8} />
      <text className={styles.clockLabel} x={38} y={14}>
        {lane === 'real' ? '实车时钟' : 'Webots 时钟'}
      </text>
      <text className={styles.clockVal} x={38} y={31} ref={setCell(lane === 'real' ? 'rClock' : 'sClock')}>
        0.000 s
      </text>
      <text className={styles.clockSub} x={38} y={45} ref={lane === 'sim' ? setCell('sSub') : undefined}>
        {lane === 'real' ? '墙钟 · 不停' : '落后 0.0 s'}
      </text>
    </g>
  );

  const slab = slabCorners(L.s);
  const pts = (a: P2[]): string => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const pt1 = (p: P2): string => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  const ring = ringPath(L.s);
  const rigReal = (
    <g transform={`translate(${L.rig.real[0].toFixed(1)} ${L.rig.real[1].toFixed(1)})`} aria-hidden="true">
      <polygon className={styles.slabL} points={pts([slab.top[0], slab.top[1], slab.bottom[1], slab.bottom[0]])} />
      <polygon className={styles.slabR} points={pts([slab.top[1], slab.top[2], slab.bottom[2], slab.bottom[1]])} />
      <polygon className={styles.slabTop} points={pts(slab.top)} />
      <path className={styles.mark} d={insetPath(L.s)} />
      <path className={styles.mark} d={ring} />
      <g ref={setCell('rigR')} />
    </g>
  );
  const rigSim = (
    <g transform={`translate(${L.rig.sim[0].toFixed(1)} ${L.rig.sim[1].toFixed(1)})`} aria-hidden="true" ref={setCell('rigSBox')} data-state="run" className={styles.simRig}>
      <path className={styles.grid} d={gridPath(L.s)} />
      <polygon className={styles.slabLine} points={pts(slab.top)} />
      <path
        className={styles.slabLine}
        d={`M${pt1(slab.top[0])}L${pt1(slab.bottom[0])}L${pt1(slab.bottom[1])}L${pt1(slab.bottom[2])}L${pt1(slab.top[2])}M${pt1(slab.top[1])}L${pt1(slab.bottom[1])}`}
      />
      <path className={styles.markDash} d={ring} />
      <g ref={setCell('rigS')} />
    </g>
  );

  return (
    <section ref={rootRef} className={styles.root} aria-label="同一套自瞄模块：左边接实车，右边接 Webots 仿真">
      <div className={styles.stage} ref={stageRef} style={{ height: L.H }} data-narrow={narrow}>
        <svg className={styles.svg} width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} role="group" aria-label="实车与仿真共用的自瞄模块">
          <defs>
            <marker id={uid + 'real'} viewBox="0 0 7 7" refX="6" refY="3.5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
              <path className={styles.mkReal} d="M0 0L7 3.5L0 7z" />
            </marker>
            <marker id={uid + 'sim'} viewBox="0 0 7 7" refX="6" refY="3.5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
              <path className={styles.mkSim} d="M0 0L7 3.5L0 7z" />
            </marker>
          </defs>

          {/* 标题 */}
          <g className={styles.laneReal} aria-hidden="true">
            <rect className={styles.headBar} x={L.head.real.x} y={L.head.real.y} width={3} height={42} />
            <text className={styles.headTitle} x={L.head.real.x + 11} y={L.head.real.y + 14}>
              实车
            </text>
            <text className={styles.headRepo} x={L.head.real.x + 11} y={L.head.real.y + 28}>
              bsp-linux-autoaim
            </text>
            <text className={styles.headSub} x={L.head.real.x + 11} y={L.head.real.y + 41}>
              Linux · Hik 相机 · USB CDC
            </text>
          </g>
          <g className={styles.laneSim} aria-hidden="true">
            {L.head.sim.end ? (
              <>
                <rect className={styles.headBar} x={L.head.sim.x - 3} y={L.head.sim.y} width={3} height={42} />
                <text className={cx(styles.headTitle, styles.end)} x={L.head.sim.x - 11} y={L.head.sim.y + 14}>
                  仿真
                </text>
                <text className={cx(styles.headRepo, styles.end)} x={L.head.sim.x - 11} y={L.head.sim.y + 28}>
                  bsp-webots-autoaim
                </text>
                <text className={cx(styles.headSub, styles.end)} x={L.head.sim.x - 11} y={L.head.sim.y + 41}>
                  Webots controller · 仿真时间
                </text>
              </>
            ) : (
              <>
                <rect className={styles.headBar} x={L.head.sim.x} y={L.head.sim.y} width={3} height={42} />
                <text className={styles.headTitle} x={L.head.sim.x + 11} y={L.head.sim.y + 14}>
                  仿真
                </text>
                <text className={styles.headRepo} x={L.head.sim.x + 11} y={L.head.sim.y + 28}>
                  bsp-webots-autoaim
                </text>
                <text className={styles.headSub} x={L.head.sim.x + 11} y={L.head.sim.y + 41}>
                  Webots controller · 仿真时间
                </text>
              </>
            )}
          </g>

          {rigReal}
          {rigSim}

          {/* 相机适配模块到云台镜头的引出线 */}
          <line className={cx(styles.drop, styles.laneReal)} ref={setCell('dropR')} x1={L.drop.real[0]} y1={L.drop.real[1]} x2={L.drop.real[0]} y2={L.drop.real[1] + 20} />
          <line className={cx(styles.drop, styles.laneSim)} ref={setCell('dropS')} x1={L.drop.sim[0]} y1={L.drop.sim[1]} x2={L.drop.sim[0]} y2={L.drop.sim[1] + 20} />

          {/* 连线 */}
          {L.conns.map((c, i) => (
            <path key={i} className={cx(styles.conn, c.lane === 'real' ? styles.laneReal : styles.laneSim)} d={c.d} markerEnd={c.arrow ? mk(c.lane) : undefined} />
          ))}
          {SHARED_ORDER.slice(0, 3).map((id, k) => {
            const b = L.shared[k];
            const y1 = b.y + b.h + 1;
            const y2 = L.shared[k + 1].y - 1;
            return (
              <g key={id} aria-hidden="true">
                <path className={cx(styles.conn, styles.laneReal)} d={`M${b.x + 24} ${y1}L${b.x + 24} ${y2}`} markerEnd={mk('real')} />
                <path className={cx(styles.conn, styles.laneSim)} d={`M${b.x + b.w - 24} ${y1}L${b.x + b.w - 24} ${y2}`} markerEnd={mk('sim')} />
              </g>
            );
          })}

          <text className={styles.cap} x={L.caption[0]} y={L.caption[1]}>
            共用 · 点一个模块看配置
          </text>
          {SHARED_ORDER.map((id, k) => tileEl(id, k))}
          {L.chips.map((c) => chipEl(c))}
          {clockEl('real', L.clock.real)}
          {clockEl('sim', L.clock.sim)}
        </svg>

        {/* 相机画面卡与读数 */}
        {(['real', 'sim'] as const).map((lane) => {
          const cb = L.card[lane];
          const sb = L.stats[lane];
          const real = lane === 'real';
          return (
            <React.Fragment key={lane}>
              <div className={cx(styles.card, real ? styles.laneReal : styles.laneSim)} style={{ left: cb.x, top: cb.y, width: cb.w }}>
                <div className={styles.cardHead}>
                  <b>{real ? '实车视角' : '仿真视角'}</b>
                  <span>{real ? '720×540' : '800×600'}</span>
                </div>
                <canvas className={styles.cv} ref={setCell(real ? 'rCv' : 'sCv')} aria-hidden="true" />
              </div>
              <dl className={cx(styles.stats, real ? styles.laneReal : styles.laneSim)} style={{ left: sb.x, top: sb.y, width: sb.w }}>
                <dt>{real ? '出帧' : '触发'}</dt>
                <dd ref={setCell(real ? 'rShot' : 'sSeq')}>0</dd>
                <dt>已处理</dt>
                <dd ref={setCell(real ? 'rProc' : 'sProc')}>0</dd>
                <dt>丢帧</dt>
                <dd ref={setCell(real ? 'rDrop' : 'sDrop')}>0</dd>
                {real ? (
                  <>
                    <dt>帧池 2 槽</dt>
                    <dd>
                      <span className={styles.pool} ref={setCell('pool')} data-flash="0">
                        <span className={styles.slot} ref={setCell('slot0')} data-state="free" />
                        <span className={styles.slot} ref={setCell('slot1')} data-state="free" />
                      </span>
                    </dd>
                  </>
                ) : (
                  <>
                    <dt>仿真速率</dt>
                    <dd ref={setCell('sSpeed')}>1.00×</dd>
                  </>
                )}
                <div className={styles.ledgerWrap}>
                  <canvas className={styles.ledger} ref={setCell(real ? 'rLedger' : 'sLedger')} aria-hidden="true" />
                </div>
              </dl>
            </React.Fragment>
          );
        })}
      </div>

      <div className={styles.bottom} data-narrow={narrow}>
        <div className={styles.ctl}>
          <div className={styles.ctlHead}>
            <label className={styles.ctlLabel} htmlFor="simvsreal-slow">
              让检测变慢
            </label>
            <span className={styles.ctlVal} aria-hidden="true">
              +{extraMs} ms
            </span>
          </div>
          <div className={styles.rangeWrap}>
            <input
              id="simvsreal-slow"
              className={styles.range}
              type="range"
              min={0}
              max={MAX_EXTRA_MS}
              step={1}
              value={extraMs}
              onChange={onSlide}
              onPointerDown={takeOver}
              onKeyDown={(e) => {
                if (/^(Arrow|Home$|End$|Page)/.test(e.key)) takeOver();
              }}
              aria-valuetext={'检测多花 ' + extraMs + ' 毫秒，每帧共 ' + det + ' 毫秒'}
            />
            <span className={styles.thr} title="检测耗时 = 相机周期 10 ms" aria-hidden="true" />
          </div>
          <div className={styles.ticks} aria-hidden="true">
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30 ms</span>
          </div>
          <div className={styles.ctlRow}>
            <button type="button" className={styles.btn} aria-pressed={paused} onClick={onPause}>
              {paused ? '继续仿真' : '暂停仿真'}
            </button>
            {auto ? <span className={styles.autoTag}>自动演示中 · 拖动滑块接管</span> : null}
          </div>
          <p className={styles.says}>
            {paused ? (
              <>
                <b>仿真已暂停</b>：Webots 时钟停住，实车时钟照常走，相机照常出帧。继续之后接着往下走，不补帧。
              </>
            ) : det > CAM_MS ? (
              <>
                <b>检测 {det} ms/帧</b>，比相机周期 {CAM_MS} ms 长：实车帧池 2 槽装不下，丢帧；仿真时钟停下来等检测，一帧不丢，速率降到{' '}
                {speed.toFixed(2)}×。
              </>
            ) : (
              <>
                <b>检测 {det} ms/帧</b>，没超过相机周期 {CAM_MS} ms：实车每帧都处理完；仿真每帧也要等检测做完，所以只有{' '}
                {speed.toFixed(2)}× 实时。
              </>
            )}
          </p>
        </div>

        <Detail node={node} />
      </div>
    </section>
  );
}

/** 'bsp-linux-autoaim/User/RunConfig/hik.yaml' -> 'User/RunConfig/hik.yaml'：仓库名已经在两端的标题里了。 */
const inRepo = (file: string): string => file.split('/').slice(1).join('/');

function Detail({ node }: { node: NodeInfo }): JSX.Element {
  const shared = node.kind === 'shared';
  const tag = shared ? SHARED_NOTE : node.kind === 'real' ? '实车这一端' : '仿真这一端';
  return (
    <div className={styles.detail} aria-live="polite">
      <div className={styles.dHead}>
        <span className={styles.dTitle}>{node.title}</span>
        <span className={cx(styles.tag, !shared && styles.tagSide)}>{tag}</span>
      </div>
      <p className={styles.dRole}>{node.role}</p>
      {shared && node.real && node.sim ? (
        <div className={styles.cfg} role="table" aria-label={node.title + ' 两边的配置'}>
          <div className={cx(styles.cfgCell, styles.cfgHeadBlank)} role="presentation" />
          <div className={cx(styles.cfgCell, styles.cfgHead, styles.laneReal)} role="columnheader">
            <b>实车</b>
            <span className={styles.cfgPath}>{inRepo(node.real.file)}</span>
          </div>
          <div className={cx(styles.cfgCell, styles.cfgHead, styles.laneSim)} role="columnheader">
            <b>仿真</b>
            <span className={styles.cfgPath}>{inRepo(node.sim.file)}</span>
          </div>
          <div className={cx(styles.cfgCell, styles.cfgKey, styles.cfgKeyRow)} role="rowheader">
            模块实例
          </div>
          <div className={styles.cfgCell} role="cell" title={node.real.file}>
            {node.real.id}
          </div>
          <div className={styles.cfgCell} role="cell" title={node.sim.file}>
            {node.sim.id}
          </div>
          {(node.diffs ?? []).map((d) => (
            <React.Fragment key={d.key}>
              <div className={cx(styles.cfgCell, styles.cfgKey, styles.cfgKeyRow)} role="rowheader">
                {d.key}
              </div>
              <div className={cx(styles.cfgCell, styles.cfgDiff)} role="cell">
                {d.real}
              </div>
              <div className={cx(styles.cfgCell, styles.cfgDiff)} role="cell">
                {d.sim}
              </div>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <ul className={styles.facts}>
          {node.swap ? (
            <li>
              <span className={styles.factKey}>换掉 · </span>
              {node.swap}
            </li>
          ) : null}
          {(node.real ?? node.sim) ? (
            <li>
              <span className={styles.factKey}>配置 · </span>
              {inRepo((node.real ?? node.sim)?.file ?? '')} › {(node.real ?? node.sim)?.id}
            </li>
          ) : null}
          {(node.facts ?? []).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      <div className={styles.dLinks}>
        <Link to="/算法组/webots">看文档</Link>
        {node.doc.to !== '/算法组/webots' ? <Link to={node.doc.to}>{node.doc.label}</Link> : null}
        {node.repo ? (
          <a href={'https://github.com/' + node.repo} target="_blank" rel="noopener noreferrer">
            源码 · {node.repo.split('/')[1]}
          </a>
        ) : null}
      </div>
    </div>
  );
}

