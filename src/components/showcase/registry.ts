/**
 * Widget registry for the home page showcases.
 *
 * Each widget lives in ./<Name>/index.tsx (default export) and is picked up by require.context in
 * lazy mode: every widget becomes its own chunk, requested only when Showcase mounts it. A name
 * whose directory does not exist yet is simply absent from the context, so Showcase renders its
 * placeholder and the build does not fail.
 */
import React from 'react';

export const SHOWCASE_NAMES = [
  'RobotLineup',
  'AutoAim',
  'CameraSync',
  'SimVsReal',
] as const;

export type ShowcaseName = (typeof SHOWCASE_NAMES)[number];

/** The only props a widget receives. */
export type ShowcaseWidgetProps = {
  /** In the viewport and the page is visible. false: stop animations and timers (the widget stays mounted). */
  active: boolean;
  /** The page's 动画 开/关 switch is off (default on; not the OS setting). true: show an informative still frame; interaction keeps working. */
  reducedMotion: boolean;
};

type WidgetModule = { default: React.ComponentType<ShowcaseWidgetProps> };
type WidgetContext = {
  keys(): string[];
  (id: string): Promise<WidgetModule>;
};
declare const require: {
  context(directory: string, deep: boolean, filter: RegExp, mode: 'lazy'): WidgetContext;
};

// The regular expression must stay a literal: webpack reads it at build time.
const widgetContext = require.context(
  './',
  true,
  /^\.\/(RobotLineup|AutoAim|CameraSync|SimVsReal)\/index\.(tsx|ts|jsx|js)$/,
  'lazy',
);

function widgetKey(name: ShowcaseName): string | undefined {
  const pattern = new RegExp(`^\\./${name}/index\\.(tsx|ts|jsx|js)$`);
  return widgetContext.keys().find((key) => pattern.test(key));
}

/** True when src/components/showcase/<name>/index.* exists at build time. */
export function hasShowcaseWidget(name: ShowcaseName): boolean {
  return widgetKey(name) !== undefined;
}

const lazyWidgets = new Map<ShowcaseName, React.LazyExoticComponent<React.ComponentType<ShowcaseWidgetProps>>>();

/** One React.lazy component per name, created on first use. Call only when hasShowcaseWidget(name). */
export function lazyShowcaseWidget(name: ShowcaseName): React.LazyExoticComponent<React.ComponentType<ShowcaseWidgetProps>> {
  let widget = lazyWidgets.get(name);
  if (!widget) {
    const key = widgetKey(name) as string;
    widget = React.lazy(() => widgetContext(key));
    lazyWidgets.set(name, widget);
  }
  return widget;
}
