/**
 * Showcase: the shell around one widget (see README.md in this directory).
 *
 *   <Showcase name="AutoAim" />                                     reserves 440 px until mounted
 *   <Showcase name="AutoAim" height={{ desktop: 480, mobile: 420 }} />
 *
 * - Nothing of the widget runs during SSR. Its chunk is requested on the client when the frame
 *   comes within LOAD_MARGIN of the viewport, inside BrowserOnly + Suspense; once mounted it stays
 *   mounted.
 * - `active` is true while the frame intersects the viewport and the page is visible. Widgets stop
 *   their animations and timers when it turns false.
 * - `reducedMotion` is the opposite of the page's "动画 开 / 关" switch (motion.ts, default on, kept in
 *   localStorage); it does not follow the OS setting.
 * - A name without a directory, a chunk that fails to load and a widget that throws all render the
 *   placeholder; the rest of the page keeps working.
 */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { hasShowcaseWidget, lazyShowcaseWidget, type ShowcaseName } from './registry';
import { useMotionOn } from './motion';
import styles from './showcase.module.css';

export type { ShowcaseName, ShowcaseWidgetProps } from './registry';

/** Mount a little before the frame scrolls in, so the chunk is ready when it is seen. */
const LOAD_MARGIN = '400px 0px';

/** Reserved height when the caller gives none (desktop widgets are 380–520 px tall). */
const DEFAULT_HEIGHT = 440;

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

/** near: has come within LOAD_MARGIN once (sticky). inView: intersects the viewport now. */
function useViewport(ref: React.RefObject<HTMLElement>, enabled: boolean): { near: boolean; inView: boolean } {
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      setInView(true);
      return undefined;
    }
    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          nearObserver.disconnect();
        }
      },
      { rootMargin: LOAD_MARGIN },
    );
    const viewObserver = new IntersectionObserver((entries) => {
      setInView(entries[entries.length - 1].isIntersecting);
    });
    nearObserver.observe(element);
    viewObserver.observe(element);
    return () => {
      nearObserver.disconnect();
      viewObserver.disconnect();
    };
  }, [ref, enabled]);
  return { near, inView };
}

class WidgetBoundary extends React.Component<
  { name: string; fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // The placeholder replaces the widget; the page stays usable.
    console.warn(`[showcase] ${this.props.name} failed`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export type ShowcaseHeight = number | { desktop: number; mobile?: number };

export type ShowcaseProps = {
  name: ShowcaseName;
  /** Space reserved before the widget mounts, in px (desktop and, optionally, ≤720 px screens). Default 440. */
  height?: ShowcaseHeight;
  /** Accessible name of the region. */
  label?: string;
  className?: string;
};

type FrameState = 'missing' | 'waiting' | 'mounted';

const PLACEHOLDER_TEXT = { missing: '未接入', failed: '没有加载出来', waiting: '' } as const;

function Placeholder({ name, state }: { name: ShowcaseName; state: keyof typeof PLACEHOLDER_TEXT }): JSX.Element {
  return (
    <div className={styles.placeholder} data-state={state}>
      {PLACEHOLDER_TEXT[state] ? (
        <span className={styles.placeholderText}>
          <code>{name}</code> {PLACEHOLDER_TEXT[state]}
        </span>
      ) : null}
    </div>
  );
}

export default function Showcase({ name, height = DEFAULT_HEIGHT, label, className }: ShowcaseProps): JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const available = hasShowcaseWidget(name);
  const { near, inView } = useViewport(frameRef, available);
  const pageVisible = usePageVisible();
  const reducedMotion = !useMotionOn();
  const desktop = typeof height === 'number' ? height : height.desktop;
  const mobile = typeof height === 'number' ? height : height.mobile ?? height.desktop;
  const active = inView && pageVisible;
  const state: FrameState = !available ? 'missing' : near ? 'mounted' : 'waiting';
  const waiting = <Placeholder name={name} state="waiting" />;

  return (
    <figure
      className={[styles.frame, className].filter(Boolean).join(' ')}
      aria-label={label}
      data-showcase={name}
      data-showcase-state={state}
      data-active={available ? String(active) : undefined}
    >
      <div
        ref={frameRef}
        className={styles.stage}
        style={{ '--showcase-height': `${desktop}px`, '--showcase-height-mobile': `${mobile}px` } as React.CSSProperties}
      >
        {state === 'mounted' ? (
          <BrowserOnly fallback={waiting}>
            {() => {
              const Widget = lazyShowcaseWidget(name);
              return (
                <WidgetBoundary name={name} fallback={<Placeholder name={name} state="failed" />}>
                  <Suspense fallback={waiting}>
                    <Widget active={active} reducedMotion={reducedMotion} />
                  </Suspense>
                </WidgetBoundary>
              );
            }}
          </BrowserOnly>
        ) : (
          <Placeholder name={name} state={state === 'missing' ? 'missing' : 'waiting'} />
        )}
      </div>
    </figure>
  );
}
