/**
 * RobotLineup: the first-screen lineup of the five robots that have whole-robot modules (dart, hero, infantry,
 * sentry, aerial). Each robot is a hand-drawn isometric SVG (robots.tsx, built from iso.tsx) redrawn from its pose
 * (sim.ts); colours come from the theme tokens in styles.module.css, so both themes need no JS.
 * Hover / tap / focus a robot: it stays lit, the others fade, a card names its config and main modules.
 * active=false stops the loop; reducedMotion shows one still frame (interaction unchanged).
 */
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import * as S from './sim';
import type { RobotId, Layout, PoseOut } from './sim';
import { ROBOT_VIEW } from './robots';
import { Tile } from './iso';
import styles from './styles.module.css';

type Props = { active: boolean; reducedMotion: boolean };
type Box = [number, number, number, number];

const TILE: Record<RobotId, number> = { dart: 58, hero: 70, infantry: 62, sentry: 70, aerial: 44 };
const FADE = 0.24;       // opacity of the robots that are not selected (CSS transition: duration-base)

/** What a robot's picture depends on, rounded: a robot whose signature did not change is not redrawn. */
function signature(po: PoseOut): string {
  let s = Math.round(po.fric * 100) + '|' + Math.round(po.disc * 100);
  for (const k in po.pose) s += '|' + Math.round(po.pose[k] * 400);
  for (const sh of po.shots) s += '|s' + Math.round(sh.age * 100) + (sh.big ? 'b' : '');
  return s;
}

const RobotNode = memo(function RobotNode({ id, po }: { id: RobotId; po: PoseOut; sig: string }): JSX.Element {
  const View = ROBOT_VIEW[id];
  return <View po={po} />;
}, (a, b) => a.sig === b.sig && a.id === b.id);

/** Floor: two families of lines along the ground axes of the isometric view. */
function floorPath(W: number, H: number, y0: number): string {
  const sl = Math.tan(Math.PI / 6), step = 64;
  let d = '';
  for (let c = y0 - W * sl; c < H + W * sl; c += step) {
    d += `M0,${c.toFixed(1)}L${W},${(c + W * sl).toFixed(1)}`;
    d += `M0,${(c + W * sl).toFixed(1)}L${W},${c.toFixed(1)}`;
  }
  return d;
}

type SceneProps = {
  L: Layout; active: boolean; reducedMotion: boolean;
  selected: RobotId | null;
  svgRef: React.RefObject<SVGSVGElement>;
  onHover: (id: RobotId | null) => void;
  onPick: (id: RobotId) => void;
};

/** The svg and its clock. Only this component re-renders every frame. */
function Scene({ L, active, reducedMotion, selected, svgRef, onHover, onPick }: SceneProps): JSX.Element {
  const [t, setT] = useState(0);
  const clock = useRef(0);
  useEffect(() => {
    if (!active || reducedMotion) { if (reducedMotion) setT(0); return undefined; }
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      clock.current += dt;
      setT(clock.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion]);
  const grid = useMemo(() => floorPath(L.W, L.y0 + L.H, L.mode === 'wide' ? 190 : 150), [L.W, L.H, L.y0, L.mode]);
  const hitFor = (id: RobotId): Props2 => ({
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType !== 'touch') onHover(id); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType !== 'touch') onHover(null); },
    onClick: () => onPick(id),
  });
  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      width={L.w}
      height={L.h}
      viewBox={`0 ${L.y0} ${L.W} ${L.H}`}
      role="img"
      aria-label="战队全兵种阵列：飞镖、英雄、步兵、哨兵、空中机器人"
    >
      <defs>
        <clipPath id="rl-floor"><rect x="0" y={L.mode === 'wide' ? 190 : 150} width={L.W} height={L.y0 + L.H - (L.mode === 'wide' ? 190 : 150)} /></clipPath>
      </defs>
      <path d={grid} className={styles.floor} clipPath="url(#rl-floor)" />
      {L.order.map((id) => {
        const pl = L.place[id], dim = selected !== null && selected !== id;
        return (
          <g key={id} className={styles.tileLayer} style={{ opacity: dim ? FADE : 1 }} transform={`translate(${pl.x} ${pl.y}) scale(${pl.s})`}>
            <Tile hs={TILE[id]} />
          </g>
        );
      })}
      {L.order.map((id) => {
        const pl = L.place[id];
        const po = S.poseAt(id, t, reducedMotion);
        const dim = selected !== null && selected !== id;
        return (
          <g key={id} data-robot={id} className={styles.robot} style={{ opacity: dim ? FADE : 1 }} transform={`translate(${pl.x} ${pl.y}) scale(${pl.s})`} {...hitFor(id)}>
            <RobotNode id={id} po={po} sig={signature(po)} />
          </g>
        );
      })}
    </svg>
  );
}
type Props2 = Pick<React.SVGProps<SVGGElement>, 'onPointerEnter' | 'onPointerLeave' | 'onClick'>;

export default function RobotLineup({ active, reducedMotion }: Props): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<RobotId | null>(null);
  const [pinned, setPinned] = useState<RobotId | null>(null);
  const [focused, setFocused] = useState<RobotId | null>(null);
  const [boxes, setBoxes] = useState<Partial<Record<RobotId, Box>>>({});
  const selected = hover ?? focused ?? pinned;

  const L: Layout | null = useMemo(() => (width > 0 ? S.layout(width) : null), [width]);

  // ---- size
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.round(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- where a robot is on screen (css px, inside the stage): measured from its drawing when it is selected
  const measure = useCallback((id: RobotId): void => {
    const g = svgRef.current?.querySelector(`[data-robot="${id}"]`) as SVGGElement | null;
    if (!g || !L) return;
    const b = g.getBBox();
    const pl = L.place[id];
    const box: Box = [(pl.x + b.x * pl.s) * L.k, (pl.y + b.y * pl.s - L.y0) * L.k, (pl.x + (b.x + b.width) * pl.s) * L.k, (pl.y + (b.y + b.height) * pl.s - L.y0) * L.k];
    setBoxes((o) => {
      const p = o[id];
      return p && p.every((v, i) => Math.abs(v - box[i]) < 1.5) ? o : { ...o, [id]: box };
    });
  }, [L]);
  useLayoutEffect(() => { if (selected) measure(selected); });
  const boxOf = (id: RobotId): Box => {
    const pl = L!.place[id];
    return boxes[id] ?? [(pl.x - 120 * pl.s) * L!.k, (pl.y - 230 * pl.s - L!.y0) * L!.k, (pl.x + 120 * pl.s) * L!.k, (pl.y + 30 * pl.s - L!.y0) * L!.k];
  };

  // ---- strip mode: start with the hero in view, scroll a robot into view when chosen from the list
  const scrollTo = useCallback((id: RobotId) => {
    const sc = scrollRef.current;
    if (!sc || !L || L.mode !== 'strip') return;
    const cx = L.place[id].x * L.k;
    sc.scrollTo({ left: Math.max(0, cx - sc.clientWidth / 2), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [L, reducedMotion]);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || !L || L.mode !== 'strip') return;
    sc.scrollLeft = Math.max(0, L.place.hero.x * L.k - sc.clientWidth / 2);
  }, [L]);

  // ---- pointer: leaving a robot clears the hover a moment later, so the pointer can travel to the card
  const clearTimer = useRef<number>(0);
  const holdHover = (id: RobotId | null) => {
    window.clearTimeout(clearTimer.current);
    if (id) { setHover(id); return; }
    clearTimer.current = window.setTimeout(() => setHover(null), 220);
  };
  useEffect(() => () => window.clearTimeout(clearTimer.current), []);
  const onPickRobot = useCallback((id: RobotId) => setPinned((p) => (p !== id ? id : null)), []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = S.ROBOTS.map((r) => r.id);
    const cur = focused ? ids.indexOf(focused) : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = ids[(cur + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      (rootRef.current?.querySelector(`[data-pick="${next}"]`) as HTMLButtonElement | null)?.focus();
    } else if (e.key === 'Escape') {
      setPinned(null);
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };

  const info = selected ? S.ROBOTS.find((r) => r.id === selected)! : null;
  const strip = L?.mode === 'strip';
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(200);
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 1) setCardH(h);
  });

  // card placement next to the robot (wide); below the strip (narrow)
  let cardStyle: React.CSSProperties | undefined;
  let leader: { x1: number; y1: number; x2: number; y2: number } | null = null;
  const CARD_W = 272;
  if (L && info && !strip) {
    const b = boxOf(info.id);
    const right = b[2] + 20 + CARD_W <= L.w - 8;
    const left = right ? b[2] + 20 : Math.max(8, b[0] - 20 - CARD_W);
    const top = Math.round(S.clamp(b[1] + (b[3] - b[1]) * 0.15, 8, Math.max(8, L.h - cardH - 8)));
    cardStyle = { left: Math.round(left), top, width: CARD_W };
    const ax = right ? b[2] - (b[2] - b[0]) * 0.18 : b[0] + (b[2] - b[0]) * 0.18;
    leader = { x1: ax, y1: b[1] + (b[3] - b[1]) * 0.42, x2: right ? left : left + CARD_W, y2: top + 22 };
  }

  const card = info ? (
    <div
      ref={cardRef}
      className={strip ? styles.cardBelow : styles.card}
      style={cardStyle}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') holdHover(info.id); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') holdHover(null); }}
    >
      <div className={styles.cardPath}>bsp-dev-c / RobotConfig</div>
      <div className={styles.cardHead}>
        <span className={styles.cardName}>{info.name}</span>
        {info.no ? <span className={styles.cardNo}>{info.no}</span> : null}
      </div>
      <code className={styles.cardFile}>{S.CONFIG_DIR}{info.file}</code>
      <ul className={styles.cardMods}>
        {info.modules.map((m) => <li key={m}><code>{m}</code></li>)}
      </ul>
      <p className={styles.cardFact}>{info.fact}</p>
      <Link className={styles.cardLink} to={S.DOCS_ROUTE}>看机器人配置</Link>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={styles.root} data-mode={L?.mode}>
      <div className={styles.stage} style={L && !strip ? { height: L.h } : undefined}>
        <div ref={scrollRef} className={strip ? styles.scroller : styles.fixed}>
          <div className={styles.canvasBox} style={L ? { width: L.w, height: L.h } : undefined}>
            {L ? (
              <Scene
                L={L}
                active={active}
                reducedMotion={reducedMotion}
                selected={selected}
                svgRef={svgRef}
                onHover={holdHover}
                onPick={onPickRobot}
              />
            ) : null}
            {L && selected ? <Brackets box={boxOf(selected)} /> : null}
            {L && strip ? S.ROBOTS.map((r) => (
              <span key={r.id} className={styles.snap} style={{ left: L.place[r.id].x * L.k }} />
            )) : null}
          </div>
        </div>
        {leader ? (
          <svg className={styles.leader} width={L!.w} height={L!.h} aria-hidden="true">
            <polyline points={`${leader.x1},${leader.y1} ${leader.x1 + (leader.x2 > leader.x1 ? 10 : -10)},${leader.y2} ${leader.x2},${leader.y2}`} />
            <rect x={leader.x1 - 2} y={leader.y1 - 2} width="4" height="4" />
          </svg>
        ) : null}
        {!strip ? <div aria-live="polite">{card}</div> : null}
      </div>
      <div className={styles.bar} role="group" aria-label="兵种" onKeyDown={onKeyDown}>
        {S.ROBOTS.map((r) => (
          <button
            key={r.id}
            type="button"
            data-pick={r.id}
            className={styles.pick}
            aria-pressed={pinned === r.id}
            data-on={selected === r.id ? 'true' : undefined}
            onFocus={(e) => {
              setFocused(r.id);
              scrollTo(r.id);
              if (e.currentTarget.matches(':focus-visible')) { window.clearTimeout(clearTimer.current); setHover(null); }
            }}
            onBlur={() => setFocused((f) => (f === r.id ? null : f))}
            onMouseEnter={() => holdHover(r.id)}
            onMouseLeave={() => holdHover(null)}
            onClick={() => { setPinned((p) => (p === r.id ? null : r.id)); scrollTo(r.id); }}
          >
            {r.no ? <span className={styles.pickNo}>{r.no}</span> : null}
            {r.name}
          </button>
        ))}
        {!selected && !strip ? <span className={styles.hint}>悬停或点一台车，看它的配置</span> : null}
      </div>
      {strip ? <div aria-live="polite">{card ?? <p className={styles.hintBelow}>左右滑动看全部兵种，点一台车看它的配置。</p>}</div> : null}
    </div>
  );
}

function Brackets({ box }: { box: [number, number, number, number] }): JSX.Element {
  const [x0, y0, x1, y1] = [box[0] - 8, box[1] - 8, box[2] + 8, box[3] + 4];
  const k = 10;
  const d = `M${x0},${y0 + k}V${y0}H${x0 + k}M${x1 - k},${y0}H${x1}V${y0 + k}M${x1},${y1 - k}V${y1}H${x1 - k}M${x0 + k},${y1}H${x0}V${y1 - k}`;
  return (
    <svg className={styles.brackets} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
