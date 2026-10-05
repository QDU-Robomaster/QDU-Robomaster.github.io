/* 首页“动画 开 / 关”开关的状态：默认开，选择存 localStorage（读写都包 try/catch，存不了就只在本次页面里生效）。
 * 小部件的 reducedMotion 由这个开关决定，不再直接跟系统的“减少动态”。 */
import { useSyncExternalStore } from 'react';

export const MOTION_KEY = 'qdu-rm-motion';

const listeners = new Set<() => void>();
let current: boolean | null = null;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(MOTION_KEY) !== 'off';
  } catch {
    return true;
  }
}

function snapshot(): boolean {
  if (current === null) current = readStored();
  return current;
}

export function setMotionOn(on: boolean): void {
  current = on;
  try {
    window.localStorage.setItem(MOTION_KEY, on ? 'on' : 'off');
  } catch {
    /* 存不了就算了 */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === MOTION_KEY || e.key === null) {
      current = readStored();
      fn();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** 服务端渲染和水合的第一帧都是“开”，客户端读到存储之后再更新。 */
export function useMotionOn(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
