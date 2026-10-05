import React, { useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import { Duel, TAU, D2R, type Mode } from './sim';
import { drawCam, readTokens, type Tokens } from './draw';
import { sceneView, groundSvg, buildScene, buildTop, clampTarget, type View } from './scene';

type ShowcaseProps = { active: boolean; reducedMotion: boolean };

const SEED = 52;
const WARM = 1.4;          // 待机从目标刚被发现的时候开始看
const STILL_SPIN = 1.2;    // 静帧和"复位"的转速（圈/s）
const RESUME_MS = 14000;   // 没人碰这么久，自动回到待机
const DOC = '/算法组/algorithm-details';

// 待机一轮的七步，每步一句
const CAPS = [
  'ArmorDetector 在画面里框出一块装甲板，ArmorTracker 用这一块建立目标。',
  '只看到一两块板：EKF 先在板后方放一个半径，再补全中心、转速、radius_1、radius_2 和 dz，椭圆随之收紧。',
  'Δ = 检测 + 跟踪 + 瞄准 + 云台 + 飞行，飞行时间随落点迭代三次。',
  '把四块板推到 t+Δ（虚线），取正对枪线的一块，十字是瞄点。',
  '开火闸门四项都过才发射：面可打、枪线与命中面一致、命令稳定、云台对齐。',
  '转过一块：改打下一块，云台提前减速再追。',
  '转向反了：转速估计在几帧内翻号，继续打。',
];

type Snap = ReturnType<typeof makeSnap>;
function makeSnap(D: Duel, mode: Mode) {
  const S = D[mode], trk = S.trk, fr = S.frame, B = S.budget(), G = S.gate, Pl = S.planCmd, x = trk.x as number[] | null;
  const used: any[] = fr && fr.used ? fr.used : [];
  const best = used.length ? used.slice().sort((a, b) => a.d.ang - b.d.ang)[0] : null;
  return {
    auto: D.auto as boolean, stage: S.stage as number, spin: S.A.wT / TAU, state: S.trackState() as string,
    dets: fr ? (fr.dets.length as number) : 0, detMs: S.split()[0] * 1000,
    face: best ? (best.k as number) : -1,
    sigma: x ? trk.ellipse()[0] * 100 : NaN, vyaw: x ? x[6] : NaN, r1: x ? x[7] : NaN, r2: x ? x[8] : NaN, dz: x ? x[9] : NaN,
    seg: B.seg, pre: B.pre * 1000, tfly: B.tfly * 1000, delta: B.delta * 1000, comp: B.comp as boolean, turn: B.turn as number,
    aimK: Pl && !Pl.center ? (Pl.k as number) : -1, center: !!(Pl && Pl.center), hasPlan: !!Pl,
    gate: { open: G.open as boolean, why: G.why as string, ang: G.ang / D2R, sig: G.sig * 100, gim: G.gim * 100, cons: G.cons as boolean },
    pred: D.pred.rate(), seen: D.seen.rate(),
    dry: S.t - S.lastDry < 3 ? (S.dryWhy as string) : null,
  };
}

const DRY_WHY: Record<string, string> = { nt: '没有目标', ctr: '还在收敛', sig: '预测还不稳', gim: '云台没到位', face: '板太斜', cons: '枪线在两块板之间' };
const f1 = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const sgn = (v: number, d = 1) => (Number.isFinite(v) ? (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d) : '—');
const spinText = (v: number) => (Math.abs(v) < 0.05 ? '不转' : (v > 0 ? '顺时针 ' : '逆时针 ') + Math.abs(v).toFixed(1) + ' 圈/s');
const tw = (s: string, px = 11) => Array.from(s).reduce((a, c) => a + (c.charCodeAt(0) > 255 ? px : px * 0.57), 0);

function Gate({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return <span className={ok === null ? styles.gNa : ok ? styles.gOk : styles.gNo}>{children}</span>;
}

function Budget({ s, width }: { s: Snap | null; width: number }) {
  const bw = Math.max(240, width);
  const seg = s ? s.seg : [['检测', 14.2], ['跟踪', 2.8], ['瞄准', 0.6], ['云台', 21.4], ['飞行', 168]] as [string, number][];
  const ms = seg.map(([n, v]) => [n, s ? (n === '飞行' ? s.tfly : (v as number) * 1000) : v] as [string, number]);
  const pre = ms.slice(0, 4).reduce((a, b) => a + b[1], 0), mid = bw * 0.4;
  const X = (v: number) => (v <= pre ? (mid * v) / pre : mid + (bw - mid) * Math.min(1, (v - pre) / 250));
  const fills = ['var(--ch1)', 'var(--ch0)', 'var(--ch2)', 'var(--ch3)', 'var(--ink-muted)'];
  const comp = s ? s.comp : true, y0 = 17, bh = 14;
  let acc = 0; const bars = ms.map(([n, v], i) => { const a = X(acc), b = X(acc + v); acc += v; return { n, v, a, w: Math.max(1.6, b - a - 1), i }; });
  // 图例：色块 + 名字 + 毫秒，排不下就折行
  let lx = 0, ly = y0 + bh + 16; const leg = bars.map((b) => { const label = b.n + ' ' + b.v.toFixed(1), w = 12 + tw(label) + 12; if (lx + w > bw && lx > 0) { lx = 0; ly += 16; } const it = { ...b, label, x: lx, y: ly }; lx += w; return it; });
  const H = ly + 6, total = pre + ms[4][1];
  return (
    <div className={styles.budget}>
      <svg width={bw} height={H} viewBox={`0 0 ${bw} ${H}`} role="img" aria-label={`时间预算：检测、跟踪、瞄准、云台、飞行，合计 ${f1(total, 0)} 毫秒`}>
        <defs><pattern id="aa-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" className={styles.hatch} /></pattern></defs>
        <text x={0} y={10} className={styles.svgMut}>曝光中点</text>
        <text x={bw} y={10} textAnchor="end" className={styles.svgMut}>命中</text>
        <g opacity={comp ? 1 : 0.45}>
          {bars.map((b) => <rect key={b.i} x={b.a} y={y0} width={b.w} height={bh} style={{ fill: fills[b.i] }} className={b.i === 4 ? styles.flight : undefined} />)}
        </g>
        {!comp && <rect x={0} y={y0} width={Math.max(1, X(total))} height={bh} fill="url(#aa-hatch)" />}
        <path d={`M ${mid - 3} ${y0 + bh + 2} L ${mid} ${y0 - 2} M ${mid + 1} ${y0 + bh + 2} L ${mid + 4} ${y0 - 2}`} className={styles.brk} />
        {leg.map((b) => (
          <g key={b.i} opacity={!comp ? 0.55 : 1}>
            <rect x={b.x} y={b.y - 8} width={8} height={8} style={{ fill: fills[b.i] }} className={b.i === 4 ? styles.flight : undefined} />
            <text x={b.x + 12} y={b.y} className={styles.svgInk}>{b.label}</text>
          </g>
        ))}
      </svg>
      <p className={styles.note}>
        {s
          ? comp
            ? <>{spinText(s.spin).replace(/^(顺|逆)时针 /, '')} 的目标在 {'Δ'} 里转 <b>{f1(s.turn, 0)}°</b>，打 t+{'Δ'} 的那块。</>
            : <>{'Δ'} 里目标转了 <b>{f1(s.turn, 0)}°</b>，这里没算：弹丸到时板已经走了。</>
          : ' '}
      </p>
    </div>
  );
}

export default function AutoAim({ active, reducedMotion }: ShowcaseProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const sceneWrap = useRef<HTMLDivElement | null>(null), topWrap = useRef<HTMLDivElement | null>(null), camWrap = useRef<HTMLDivElement | null>(null), budWrap = useRef<HTMLDivElement | null>(null);
  const sceneSvg = useRef<SVGSVGElement | null>(null), sceneG = useRef<SVGGElement | null>(null), topSvg = useRef<SVGSVGElement | null>(null), topG = useRef<SVGGElement | null>(null);
  const camCv = useRef<HTMLCanvasElement | null>(null), handle = useRef<HTMLDivElement | null>(null);
  const view = useRef<View | null>(null), ground = useRef('');
  const duel = useRef<Duel | null>(null);
  const tok = useRef<Tokens | null>(null);
  const sizes = useRef({ scene: { w: 0, h: 0 }, top: { w: 0, h: 0 }, cam: { w: 0, h: 0 }, dpr: 1 });
  const drag = useRef<{ dx: number; dy: number; pid: number } | null>(null);
  const lastTouch = useRef(0);
  const rmRef = useRef(reducedMotion);
  const modeRef = useRef<Mode>('pred');
  const redrawRef = useRef<() => void>(() => {});
  const posRef = useRef<[number, number] | null>(null);   // 减少动态下用户放的位置

  const [mode, setModeState] = useState<Mode>('pred');
  const [snap, setSnap] = useState<Snap | null>(null);
  const [spinUI, setSpinUI] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(true);
  const [budW, setBudW] = useState(340);
  rmRef.current = reducedMotion;

  const refresh = () => { const D = duel.current; if (D) setSnap(makeSnap(D, modeRef.current)); };
  const touch = () => { lastTouch.current = performance.now(); };
  // 减少动态：没有动画，每次操作之后重新算一张静帧
  const reseed = (spin: number, at?: [number, number] | null) => {
    const D = new Duel(SEED); D.settle(spin, 8, at || undefined); duel.current = D; refresh(); redrawRef.current();
  };

  redrawRef.current = () => {
    const D = duel.current, t = tok.current, sz = sizes.current; if (!D || !t) return;
    const S = D[modeRef.current], dpr = sz.dpr, cls = styles as Record<string, string>;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark', v = view.current;
    if (v && sceneG.current) {
      sceneG.current.innerHTML = ground.current + buildScene(S, v, dark, cls);
      const h = handle.current;
      if (h) { const p = v.pr([S.A.c[0], S.A.c[1], 0.14 * v.mt]), hs = Math.min(190, Math.max(60, 0.55 * v.mt * v.s * 0.9)); h.style.width = h.style.height = hs + 'px'; h.style.transform = `translate(${(p[0] - hs / 2).toFixed(1)}px, ${(p[1] - hs / 2).toFixed(1)}px)`; }
    }
    if (topG.current && sz.top.w > 0) topG.current.innerHTML = buildTop(S, sz.top.w, sz.top.h, cls);
    if (camCv.current && sz.cam.w > 0) {
      const x = camCv.current.getContext('2d'); if (x) { x.setTransform(dpr, 0, 0, dpr, 0, 0); drawCam(x, sz.cam.w, sz.cam.h, S, t); }
    }
  };

  // 初始化：待机从目标刚被发现处开始；减少动态给一张静帧
  useEffect(() => {
    if (rootRef.current) tok.current = readTokens(rootRef.current);
    if (reducedMotion) reseed(STILL_SPIN, posRef.current);
    else { const D = new Duel(SEED); D.advance(WARM); duel.current = D; setSpinUI(null); refresh(); redrawRef.current(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // 尺寸：随容器
  useEffect(() => {
    const fitCv = (el: HTMLElement | null, cv: HTMLCanvasElement | null) => {
      if (!el || !cv) return;
      const r = el.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      sizes.current.dpr = dpr; sizes.current.cam = { w, h };
      const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    };
    const fitSvg = (el: HTMLElement | null, svg: SVGSVGElement | null) => {
      if (!el || !svg) return null;
      const r = el.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); return { w, h };
    };
    const run = () => {
      fitCv(camWrap.current, camCv.current);
      const a = fitSvg(sceneWrap.current, sceneSvg.current); if (a) { sizes.current.scene = a; view.current = sceneView(a.w, a.h); ground.current = groundSvg(view.current, styles as Record<string, string>); }
      const b = fitSvg(topWrap.current, topSvg.current); if (b) sizes.current.top = b;
      if (budWrap.current) setBudW(Math.round(budWrap.current.getBoundingClientRect().width) - 24);
      redrawRef.current();
    };
    run();
    const ro = new ResizeObserver(run);
    [sceneWrap.current, topWrap.current, camWrap.current, budWrap.current].forEach((e) => e && ro.observe(e));
    return () => ro.disconnect();
  }, []);

  // 主题切换：重读 token
  useEffect(() => {
    const mo = new MutationObserver(() => { if (rootRef.current) { tok.current = readTokens(rootRef.current); redrawRef.current(); } });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  // 动画循环：只在 active 且没有减少动态时跑
  useEffect(() => {
    if (!active || reducedMotion) return;
    let raf = 0, last = performance.now(), lastSnap = 0;
    const tick = (now: number) => {
      const D = duel.current;
      if (D) {
        const dt = Math.min(0.05, (now - last) / 1000); D.advance(D.t + dt);
        if (!D.auto && !drag.current && now - lastTouch.current > RESUME_MS) { D.resume(); setSpinUI(null); }
        redrawRef.current();
        if (now - lastSnap > 120) { lastSnap = now; refresh(); }
      }
      last = now; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reducedMotion]);

  // ---- 操作
  const setMode = (m: Mode) => { modeRef.current = m; setModeState(m); refresh(); redrawRef.current(); };
  const fire = () => {
    const D = duel.current; if (!D) return; touch(); D.request();
    if (rmRef.current) { D.runOut(); redrawRef.current(); }
    refresh();
  };
  const onSpin = (v: number) => {
    const D = duel.current; if (!D) return; touch(); setSpinUI(v);
    if (rmRef.current) reseed(v, posRef.current); else { D.setSpin(v); refresh(); }
  };
  const back = () => {
    const D = duel.current; if (!D) return; touch(); setSpinUI(null);
    if (rmRef.current) { posRef.current = null; reseed(STILL_SPIN, null); } else { D.resume(); refresh(); }
  };
  const local = (e: { clientX: number; clientY: number }) => { const r = sceneWrap.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as [number, number]; };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const D = duel.current; if (!D) return; e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const v = view.current!, p = local(e), w = v.un(p[0], p[1], 0.14 * v.mt), A = D.pred.A;
    drag.current = { dx: A.c[0] - w[0], dy: A.c[1] - w[1], pid: e.pointerId };
    touch(); setHint(false); setDragging(true); D.grab(); setSpinUI((v) => (v === null ? D.pred.A.wT / TAU : v));
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const D = duel.current, d = drag.current; if (!D || !d) return;
    const v = view.current!, p = local(e), w = v.un(p[0], p[1], 0.14 * v.mt);
    const [x, y] = clampTarget(w[0] + d.dx, w[1] + d.dy);
    touch();
    if (rmRef.current) { for (const s of D.all) s.A.c = [x, y]; redrawRef.current(); } else D.moveTo(x, y);
  };
  const onUp = () => {
    const D = duel.current; if (!D || !drag.current) return;
    drag.current = null; setDragging(false); touch();
    const c = D.pred.A.c;
    if (rmRef.current) { posRef.current = [c[0], c[1]]; reseed(spinUI === null ? STILL_SPIN : spinUI, posRef.current); } else { D.drop(); refresh(); }
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const D = duel.current; if (!D) return;
    const k = e.key, st = e.shiftKey ? 0.3 : 0.1;
    const d = k === 'ArrowUp' ? [st, 0] : k === 'ArrowDown' ? [-st, 0] : k === 'ArrowLeft' ? [0, -st] : k === 'ArrowRight' ? [0, st] : null;
    if (!d) return; e.preventDefault(); touch(); setHint(false); setSpinUI((v) => (v === null ? D.pred.A.wT / TAU : v));
    D.nudge(d[0], d[1]);
    if (rmRef.current) { const c = D.pred.A.c; posRef.current = [c[0], c[1]]; reseed(spinUI === null ? STILL_SPIN : spinUI, posRef.current); } else refresh();
  };

  const s = snap, manual = s ? !s.auto : false;
  const spinVal = spinUI !== null ? spinUI : s ? s.spin : STILL_SPIN;
  const mkRate = (r: { n: number; hits: number } | undefined) => (r && r.n > 0 ? { pct: Math.round((100 * r.hits) / r.n), txt: `${Math.round((100 * r.hits) / r.n)}%`, sub: `${r.hits}/${r.n}` } : { pct: 0, txt: '—', sub: '0/0' });
  const rates = [{ id: 'pred' as Mode, name: '预测', ...mkRate(s?.pred) }, { id: 'seen' as Mode, name: '看到哪瞄哪', ...mkRate(s?.seen) }];

  let cap = ' ';
  if (s) {
    if (dragging) cap = '拖动中：估计和云台会重新跟上。';
    else if (s.dry !== null) cap = '闸门没放行（' + (DRY_WHY[s.dry] || '条件没满足') + '），这一发没打出去。';
    else if (!s.auto && s.state !== 'lost' && mode === 'seen' && s.turn > 60 && Math.abs((((s.turn + 45) % 90) + 90) % 90 - 45) < 20) cap = 'Δ 里转了 ' + f1(s.turn, 0) + '°，差不多整数块：下一块板正好到了原位，看到哪瞄哪会蒙中一些。';
    else if (!s.auto) cap = s.state === 'lost' ? '等目标进入视野。' : mode === 'pred' ? '手动：按开火，闸门放行再发射。转速和位置按你放的来。' : '手动：打最近一次看到的位置，弹丸到的时候板已经转走了。';
    else cap = CAPS[Math.max(0, s.stage)];
  }
  const g = s ? s.gate : null;
  const pm = mode === 'pred';

  return (
    <section ref={rootRef} className={styles.root} aria-label="自瞄：整车跟踪和四个面的预测">
      <div className={styles.pipe}>
        <div className={styles.chip}>
          <div className={styles.head}><span className={styles.name}>ArmorDetector</span></div>
          <div className={styles.l1}>{s && s.dets > 0 ? <>检出 <b>{s.dets}</b> 块板 · 编号 3 · 角点 → PnP · {f1(s.detMs)} ms</> : '本帧没有检出'}</div>
          <div className={styles.l2}>armor_detector/armors_frame</div>
        </div>
        <div className={styles.chip}>
          <div className={styles.head}><span className={styles.name}>ArmorTracker</span><span className={styles.topic}>tracker/target_frame</span><span className={styles.state}>{s ? s.state : 'lost'}</span></div>
          <div className={styles.l1}>{s && s.state !== 'lost' ? <>tracked_face_index <b>{s.face >= 0 ? s.face : '—'}</b> · 中心 σ <b>{f1(s.sigma)}</b> cm</> : '目标丢失，等检测'}</div>
          <div className={styles.l2}>{s && s.state !== 'lost' ? `v_yaw ${sgn(s.vyaw)} · radius_1 ${f1(s.r1, 2)} · radius_2 ${f1(s.r2, 2)} · dz ${sgn(s.dz, 2)}` : '整车 EKF：中心、速度、yaw、v_yaw、半径、dz'}</div>
        </div>
        <div className={styles.chip}>
          <div className={styles.head}><span className={styles.name}>Aimer</span><span className={styles.topic}>host/target_euler</span><span className={styles.state}>{g && g.open ? 'fire 开' : 'fire 关'}</span></div>
          <div className={styles.l1}>
            {!s || !s.hasPlan ? '等 ArmorTracker 的目标'
              : !pm ? <>看到哪瞄哪 · 不做预测</>
              : s.center ? '先收敛，还没开始预测'
              : <>{'Δ'} <b>{f1(s.delta, 0)}</b> ms → 打第 <b>{s.aimK}</b> 块 · 飞行 {f1(s.tfly, 0)} ms</>}
          </div>
          <div className={styles.l2}>
            {g && s && s.hasPlan && !s.center ? (
              <>
                <Gate ok={g.ang < 40}>面可打 {f1(g.ang, 0)}°</Gate>
                <Gate ok={pm ? g.cons : null}>枪线一致</Gate>
                <Gate ok={pm ? g.sig < 3 : null}>命令稳定</Gate>
                <Gate ok={g.gim < (pm ? 2.8 : 3.92)}>云台对齐 {f1(g.gim)} cm</Gate>
              </>
            ) : '闸门：面可打 · 枪线一致 · 命令稳定 · 云台对齐'}
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <figure className={styles.top}>
          <div ref={sceneWrap} className={styles.sceneWrap}>
            <svg ref={sceneSvg} className={styles.svg} role="img" aria-label="等轴场景：云台在左下，枪管和相机同轴；右侧靶场垫上是转着的目标，看到的面画实线，t+Δ 的四个面画虚线，弹丸沿下坠弹道飞向打的那块板">
              <g ref={sceneG} />
            </svg>
            <div
              ref={handle}
              className={styles.handle}
              data-held={dragging ? '' : undefined}
              tabIndex={0}
              role="group"
              aria-label="目标。拖动或用方向键改位置，Shift 加大步长"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey}
            />
            {hint && <span className={styles.hint}>拖动目标改位置</span>}
            <span className={styles.tag}>云台 · 小陀螺目标 · 靶场垫</span>
          </div>
          <figcaption className={styles.legend}>
            <span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" className={styles.swInk} /></svg>看到的面</span>
            <span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" className={styles.swCh1} strokeDasharray="4 3" /></svg>t+{'Δ'} 的四个面</span>
            <span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" className={styles.swRay} strokeDasharray="5 3" /></svg>下坠弹道</span>
            <span><svg width="24" height="10" aria-hidden="true"><ellipse cx="12" cy="5" rx="10" ry="3.4" className={styles.swEst} /></svg>EKF 2σ</span>
            <span><svg width="30" height="10" aria-hidden="true"><circle cx="5" cy="5" r="2.6" className={styles.swFill} /><path d="M 19 2 L 25 8 M 25 2 L 19 8" className={styles.swRay} /></svg>落点 中 / 偏</span>
          </figcaption>
        </figure>

        <div className={styles.side}>
          <figure className={styles.cam}>
            <div ref={camWrap} className={styles.camWrap}>
              <canvas ref={camCv} className={styles.cv} role="img" aria-label="相机视角：灰度画面，灯条过曝，检测框、PnP 坐标轴和预测十字叠在上面" />
            </div>
          </figure>
          <figure className={styles.topCard}>
            <div ref={topWrap} className={styles.topWrap}>
              <svg ref={topSvg} className={styles.svg} role="img" aria-label="俯视小图：云台在下方，枪管射线向上；目标的估计椭圆、速度箭头，看到的面实线，t+Δ 的四个面虚线，落点留在图上">
                <g ref={topG} />
              </svg>
              <span className={styles.tag}>俯视 · 云台在下方</span>
            </div>
          </figure>
          <div ref={budWrap} className={styles.budWrap}><Budget s={s} width={budW} /></div>
        </div>

        <div className={styles.ctl}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={fire}>开火</button>
          <div className={styles.field}>
            <span className={styles.lab} id="aa-aim-lab">瞄法</span>
            <div className={styles.seg} role="group" aria-labelledby="aa-aim-lab">
              <button type="button" aria-pressed={pm} onClick={() => setMode('pred')}>预测</button>
              <button type="button" aria-pressed={!pm} onClick={() => setMode('seen')}>看到哪瞄哪</button>
            </div>
          </div>
          <label className={styles.field}>
            <span className={styles.lab}>转速</span>
            <input type="range" min={-2.5} max={2.5} step={0.1} value={spinVal} onChange={(e) => onSpin(parseFloat(e.target.value))} aria-valuetext={spinText(spinVal)} />
            <span className={styles.val}>{spinText(spinVal)}</span>
          </label>
          {(manual || reducedMotion) && <button type="button" className={styles.btn} onClick={back}>{reducedMotion ? '复位' : '回到待机'}</button>}
          <div className={styles.rates} role="group" aria-label="命中率：同一个目标，两种瞄法各打一遍">
            <div className={styles.ratesT}>命中率 · 最近 24 发 · 同一个目标，两种瞄法各打一遍</div>
            {rates.map((r) => (
              <div key={r.id} className={styles.rrow} data-on={mode === r.id ? '' : undefined}>
                <span className={styles.rname}>{r.name}</span>
                <span className={styles.bar} aria-hidden="true"><span className={styles.fill} style={{ width: r.pct + '%' }} /></span>
                <span className={styles.rv}><b>{r.txt}</b> <span className={styles.rs}>{r.sub}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.cap}><p>{cap}</p><Link className={styles.doc} to={DOC}>看文档：算法细节</Link></div>
      </div>
    </section>
  );
}
