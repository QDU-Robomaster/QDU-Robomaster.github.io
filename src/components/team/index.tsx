/**
 * 未来战队的识别元素。
 *
 * - TeamMark：战队 Logo 的矢量版（由 static/img/未来战队.jpg 描出，13 个多边形），用 currentColor 跟随主题。
 *   static/img/qdu-mark.svg / qdu-mark-paper.svg 是同一组路径的 ink / paper 两色文件，给导航栏和 favicon 用。
 * - ArmorPlate：装甲板式的牌子，中间是贴纸（Logo、兵种字），两侧是 --team-accent 灯条。
 */
import React from 'react';
import styles from './team.module.css';

const MARK_W = 137.9;
const MARK_H = 120;
const MARK =
  'M60.8 103.6L60.8 119.7L63.7 119.7L63.7 103.6ZM26.2 119.7L29.4 119.7L38.2 106.6L46.6 119.7L49.8 119.7L39.2 103.6L36.8 103.6ZM0.1 103.6L0.1 119.7L16.2 119.7L16.2 117.3L3 117.3L3 103.6ZM127 98.9L127 119.7L137.4 119.7L137.4 98.9ZM73.7 98.9L73.7 119.7L83.6 119.7L83.6 98.9ZM127 66.2L127 76.5L137.4 76.5L137.4 66.2ZM54.8 66.2L54.8 87.1L64.9 87.1L64.9 66.2ZM1.1 66.2L1.1 87.1L11.1 87.1L11.1 66.2ZM73.7 66.2L73.7 76L83.6 76L83.6 66.2ZM134.8 13.3L134.8 29.3L137.4 29.3L137.4 13.3ZM110.8 13.3L110.8 29.3L127 29.3L127 27L113.8 27L113.8 21.8L127 21.8L127 19.7L113.8 19.7L113.8 15.6L127 15.6L127 13.3ZM73.7 13.3L81.2 29.3L83.6 29.3L89.2 17L94.7 29.3L97.1 29.3L104.5 13.3L101.6 13.3L95.9 25.8L90.3 13.3L88 13.3L82.3 25.8L76.8 13.3ZM1.1 15.6L1.1 25.8L27.9 25.8L27.9 48.3L1.1 48.3L1.1 58.6L27.9 58.6L27.9 87.1L38.2 87.1L38.2 58.6L100.5 58.6L100.5 81.2L73.7 81.2L73.7 91.5L100.5 91.5L100.5 119.7L110.8 119.7L110.8 91.5L137.4 91.5L137.4 81.2L110.8 81.2L110.8 58.6L137.4 58.6L137.4 48.3L110.8 48.3L110.8 36.5L100.5 36.5L100.5 48.3L38.2 48.3L38.2 25.8L64.9 25.8L64.9 15.6L38.2 15.6L38.2 0L27.9 0L27.9 15.6Z';

export function TeamMark({ height = 28, title = '未来战队', className }: { height?: number; title?: string; className?: string }): JSX.Element {
  return (
    <svg
      role="img"
      aria-label={title}
      className={[styles.mark, className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      width={Math.round((height * MARK_W) / MARK_H)}
      height={height}
      fill="currentColor"
    >
      <path d={MARK} />
    </svg>
  );
}

/** size: s = 40 px tall (cards), l = 72 px tall (hero). */
export function ArmorPlate({
  size = 's',
  label,
  children,
  className,
}: {
  size?: 's' | 'l';
  /** Accessible name when the plate carries a picture rather than text. */
  label?: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={[styles.plate, size === 'l' ? styles.plateL : styles.plateS, className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <span className={styles.bar} aria-hidden="true" />
      <span className={styles.face}>{children}</span>
      <span className={styles.bar} aria-hidden="true" />
    </span>
  );
}
