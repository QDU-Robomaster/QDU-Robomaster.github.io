/* CameraSync: the C board triggers the camera, and every frame gets the IMU attitude of its exposure midpoint.
   Four lanes on one time axis (IMU samples, trigger line, exposure bar, host), a film strip below, three controls:
   exposure time E, "the camera loses a frame", 100 Hz | 20 Hz. All the mechanism is in sim.ts / show.ts; this file is the view. */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import { E_DEF, E_MAX, E_MIN, E_STEP, Show, filmItems, readout } from './show.ts';
import type { FilmCell, Mode, Rate, Readout } from './show.ts';
import { CANVAS_H, drawLanes, readColors } from './lanes.ts';
import { SvgCtx } from './svgctx.ts';
import { SCENE_VB, drawScene } from './scene.ts';
import type { Colors } from './lanes.ts';
import { SHOT_H, SHOT_W, renderShot } from './film.ts';

export type ShowcaseProps = { active: boolean; reducedMotion: boolean };

// the layout effects only matter in the browser; this keeps a server render quiet
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const CELL_W = 88, CELL_GAP = 8;
const cellWidth = (w: number, narrow: boolean): number => (narrow ? Math.min(CELL_W, Math.floor((w - 2 * CELL_GAP) / 3)) : CELL_W);

interface Ui {
  E: number; film: FilmCell[]; read: Readout; mode: Mode; hz: number; state: string; slow: string; frames: number; drops: number; armed: boolean; sig: string;
}
const STATE_LABEL: Record<string, string> = { WAIT_STOP_ACK: '等 STOP 的 ACK', SETTLING: '稳定 10 ms', WAIT_START_ACK: '等 START 的 ACK', RUNNING: 'RUNNING', IDLE: 'IDLE' };

function deriveUi(S: Show, cap: number): Ui {
  const film = filmItems(S.B, S.known, cap + 1), read = readout(S), H = S.B.host;
  const armed = S.dropWant > 0 || S.B.cam.dropNext > 0;
  const ui = { E: S.E / 1000, film, read, mode: S.mode, hz: S.hz, state: STATE_LABEL[H.st] || H.st, slow: S.slowLabel(), frames: S.B.frames, drops: S.B.drops, armed, sig: '' };
  ui.sig = [ui.E, film.map(c => c.key).join(','), read.head, read.body, ui.mode, ui.hz, ui.state, ui.slow, ui.frames, ui.drops, armed].join('|');
  return ui;
}

function Shot({ cell, w, h, cache }: { cell: FilmCell; w: number; h: number; cache: Map<string, HTMLCanvasElement> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d'); if (!g) return;
    let shot = cache.get(cell.key);
    if (!shot) {
      shot = document.createElement('canvas'); shot.width = SHOT_W; shot.height = SHOT_H;
      const sg = shot.getContext('2d', { willReadFrequently: true });
      if (sg) renderShot(sg, cell);
      cache.set(cell.key, shot);
      if (cache.size > 48) { const first = cache.keys().next().value; if (first !== undefined) cache.delete(first); }
    }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(shot, 0, 0, cv.width, cv.height);
  }, [cell.key, w, h, cache]);
  return <canvas ref={ref} className={styles.shot} style={{ width: w, height: h }} aria-hidden="true" />;
}

export default function CameraSync({ active, reducedMotion }: ShowcaseProps) {
  const showRef = useRef<Show | null>(null);
  if (!showRef.current) showRef.current = new Show({ reduced: reducedMotion });
  const show = showRef.current;

  const rootRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const lanesSvg = useRef<SVGGElement>(null);
  const sceneSvg = useRef<SVGGElement>(null);
  const colorsRef = useRef<Colors>(readColors());
  const fontsRef = useRef({ mono: 'monospace', sans: 'sans-serif' });
  const cache = useRef(new Map<string, HTMLCanvasElement>()).current;
  const [layout, setLayout] = useState({ w: 1000, narrow: false, stack: false, cap: 8 });
  const layoutRef = useRef(layout); layoutRef.current = layout;
  const [ui, setUi] = useState<Ui>(() => deriveUi(show, 8));
  const uiRef = useRef(ui); uiRef.current = ui;
  const [E, setEState] = useState(E_DEF / 1000);
  const [rate, setRate] = useState<Rate>(10000);

  const firstKeys = useRef<Set<string> | null>(null);
  if (!firstKeys.current) firstKeys.current = new Set(ui.film.map(c => c.key));
  const cellW = cellWidth(layout.w, layout.narrow), cellH = Math.round(cellW * 3 / 4), pitch = cellW + CELL_GAP;

  const draw = useCallback((): void => {
    const lg = lanesSvg.current, sg = sceneSvg.current; if (!lg || !sg) return;
    const { w, narrow } = layoutRef.current;
    const ctx = new SvgCtx(fontsRef.current);
    drawLanes(ctx, show, colorsRef.current, { W: w, narrow });
    lg.innerHTML = ctx.html();
    sg.innerHTML = drawScene(show);
  }, [show]);

  const syncUi = useCallback((): void => {
    const next = deriveUi(show, layoutRef.current.cap);
    if (next.sig !== uiRef.current.sig) setUi(next);
    if (!pressed.current && show.auto) setEState(prev => (Math.abs(prev - next.E) > 1e-6 ? next.E : prev));      // the idle demo moves the slider
  }, [show]);

  // measure: the width of the lanes block decides the lane gutter, canvas size and how many film cells fit
  useIsoLayoutEffect(() => {
    const el = lanesRef.current; if (!el) return;
    const apply = (): void => {
      const w = Math.max(240, Math.floor(el.getBoundingClientRect().width)), narrow = w < 560, stack = w < 720;
      const cw = cellWidth(w, narrow), cap = Math.max(2, Math.floor((w + CELL_GAP) / (cw + CELL_GAP)));
      setLayout(p => (p.w === w && p.narrow === narrow && p.stack === stack && p.cap === cap ? p : { w, narrow, stack, cap }));
    };
    apply();
    const ro = new ResizeObserver(apply); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // text measuring needs the real font names (SVG itself reads the CSS variables)
  useIsoLayoutEffect(() => {
    const root = rootRef.current; if (!root) return;
    const cs = getComputedStyle(root);
    fontsRef.current = { mono: cs.getPropertyValue('--font-mono').trim() || 'monospace', sans: cs.getPropertyValue('--font-sans').trim() || 'sans-serif' };
    draw();
  }, [draw]);

  // the lanes svg follows the container width
  useIsoLayoutEffect(() => { draw(); syncUi(); }, [layout, draw, syncUi]);

  // the clock: runs only while active and moving; otherwise one draw per change
  useEffect(() => {
    show.setReduced(reducedMotion);
    draw(); syncUi();
    if (!active || reducedMotion) return;
    let raf = 0, last = performance.now();
    const loop = (now: number): void => {
      show.tick((now - last) / 1000); last = now;
      draw(); syncUi();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion, show, draw, syncUi]);

  // ---- controls
  const releaseTimer = useRef(0), pressed = useRef(false);
  const settle = useCallback((): void => { draw(); syncUi(); }, [draw, syncUi]);
  const onE = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(ev.target.value); setEState(v);
    show.setE(v * 1000); settle();
    window.clearTimeout(releaseTimer.current);
    if (!pressed.current) releaseTimer.current = window.setTimeout(() => { show.releaseE(); settle(); }, 450);
  };
  const onEDown = (): void => { pressed.current = true; window.clearTimeout(releaseTimer.current); };
  const onEUp = (): void => { pressed.current = false; window.clearTimeout(releaseTimer.current); show.releaseE(); settle(); };
  useEffect(() => () => window.clearTimeout(releaseTimer.current), []);
  const onDrop = (): void => { show.dropNext(); settle(); };
  const onRate = (r: Rate): void => { setRate(r); show.setRate(r); settle(); };

  const items = ui.film, off = Math.max(0, items.length - layout.cap);
  const modeLabel = ui.mode === 'tune' ? '调曝光' : ui.mode === 'hold' ? '静帧' : ui.state + ' · ' + ui.slow;

  return (
    <div ref={rootRef} className={styles.root} data-narrow={layout.narrow} data-stack={layout.stack} data-reduced={reducedMotion || undefined} role="group" aria-label="相机与 IMU 的硬同步：触发、曝光、按曝光中点配对">
      <div className={styles.head}>
        <div className={styles.headMain}>
        <div className={styles.pathRow}>
          <p className={styles.path}>C 板 / CameraSync → 上位机 / CameraFrameSync</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.slider}>
            <label className={styles.sliderLabel} htmlFor="camerasync-e">曝光 E</label>
            <input id="camerasync-e" className={styles.range} type="range" min={E_MIN / 1000} max={E_MAX / 1000} step={E_STEP / 1000} value={E}
              onChange={onE} onPointerDown={onEDown} onPointerUp={onEUp} onPointerCancel={onEUp} onBlur={onEUp}
              aria-valuetext={E.toFixed(1) + ' 毫秒'} />
            <output className={styles.sliderValue} htmlFor="camerasync-e">{E.toFixed(1)} ms</output>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={onDrop}>相机丢一帧</button>
            <div className={styles.seg} role="radiogroup" aria-label="触发频率">
              {([10000, 50000] as Rate[]).map(r => (
                <button key={r} type="button" role="radio" aria-checked={rate === r} className={styles.segBtn} onClick={() => onRate(r)}>{1e6 / r} Hz</button>
              ))}
            </div>
            <span className={styles.state} data-mode={ui.mode}>{modeLabel}</span>
          </div>
        </div>
        </div>
        <svg className={styles.scene} viewBox={SCENE_VB} role="img" aria-label="C 板的触发线接到工业相机：触发时镜头亮起开始曝光，曝光结束后图像经 USB 送到上位机，SyncEvent 经串口送到上位机。">
          <g ref={sceneSvg} />
        </svg>
      </div>

      <div ref={lanesRef} className={styles.lanes}>
        <svg className={styles.svg} width={layout.w} height={CANVAS_H} viewBox={`0 0 ${layout.w} ${CANVAS_H}`} role="img"
          aria-label="时间轴：IMU 采样、触发线、曝光条、上位机四条泳道共用一根时间轴。曝光中点到最近一次 IMU 采样有一根配对线。">
          <g ref={lanesSvg} />
        </svg>
      </div>

      <div className={styles.film}>
        <div className={styles.filmHead}>
          <span className={styles.path}>上位机 / 底片</span>
          <span className={styles.stats}>{ui.hz} Hz · 配对 {ui.frames} · 缺 {ui.drops}</span>
        </div>
        <ol className={styles.cells} style={{ height: cellH, ['--pitch' as string]: pitch + 'px' }} aria-label="最近几帧">
          {items.map((c, i) => (
            <li key={c.key} className={(c.gap ? styles.cellGap : styles.cell) + (firstKeys.current!.has(c.key) ? '' : ' ' + styles.fresh)} style={{ width: cellW, height: cellH, transform: `translateX(${(i - off) * pitch}px)` }}
              aria-label={c.gap ? `缺帧 ${c.k}，图像没有到` : `帧 ${c.k}，配对 IMU ${c.n}`}>
              {c.gap ? (
                <span className={styles.gapText}><b>没收到</b><span>序号对不上</span></span>
              ) : (
                <Shot cell={c} w={cellW - 2} h={cellH - 2} cache={cache} />
              )}
              <span className={styles.chipTop} aria-hidden="true">帧 {c.k}</span>
              {!c.gap && <span className={styles.chipBottom} aria-hidden="true">IMU #{c.n}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.readout} data-kind={ui.read.kind}>
        <span className={styles.readHead}>{ui.read.head}</span>
        <span className={styles.readBody}>{ui.read.body}</span>
      </div>
    </div>
  );
}
