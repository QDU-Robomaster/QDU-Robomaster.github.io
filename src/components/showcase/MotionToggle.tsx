/* 首页的“动画 开 / 关”开关：一对互斥按钮，状态见 motion.ts。 */
import React from 'react';
import { setMotionOn, useMotionOn } from './motion';
import styles from './showcase.module.css';

export default function MotionToggle({ className }: { className?: string }): JSX.Element {
  const on = useMotionOn();
  return (
    <div className={[styles.motion, className].filter(Boolean).join(' ')} role="group" aria-label="页面动画">
      <span className={styles.motionLabel}>动画</span>
      <button type="button" className={styles.motionBtn} aria-pressed={on} onClick={() => setMotionOn(true)}>
        开
      </button>
      <button type="button" className={styles.motionBtn} aria-pressed={!on} onClick={() => setMotionOn(false)}>
        关
      </button>
    </div>
  );
}
