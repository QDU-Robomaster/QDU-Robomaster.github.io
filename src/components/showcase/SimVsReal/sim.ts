/* SimVsReal 的纯逻辑：两只时钟、模块链、帧池。不碰 DOM，`node --test src/components/showcase/SimVsReal/sim.test.mjs` 可以直接跑。

   同一套自瞄模块（CameraFrameSync -> ArmorDetector -> ArmorTracker -> Aimer），两端各接各的适配模块，时间语义不同：

   实车（bsp-linux-autoaim）
   - 相机由 C 板硬件外触发，User/RunConfig/hik.yaml 的触发目标是 100 Hz，停不下来。
   - CameraBase 的图像池固定两槽（image_slot_count = 2，“两帧背压窗口”）：一槽给采集线程写，另一槽给下游异步链路持有。
     池里没有可写槽位时 GetWritableImage() 返回 nullptr，这一帧就丢了。
   - 墙钟不会等任何人。

   仿真（bsp-webots-autoaim）
   - 时间是 Webots 的仿真时间。LibXR 的 Webots 系统在每个仿真步之后要等所有实时线程处理完这一步并重新挂起，
     下一步才继续（libxr/system/webots/libxr_system.cpp，AllWebotsRealtimeThreadsParkedUnlocked），
     所以检测慢了，仿真时钟就停在那里等它。
   - CameraSync 的触发周期 trigger_period_us = 20000，即仿真时间下 50 Hz；WEBOTS_SIM_FLOW_RATE 默认 1.0，是目标倍率。
   - 一帧检测没做完，下一帧不会产生，所以仿真侧不丢帧，只是跑得慢。

   这里的时间一律用整数微秒，事件边界才不会被浮点误差挤到一帧之外。 */

export const US = 1_000_000;

/** 实车相机触发周期：100 Hz（hik.yaml 的触发目标）。 */
export const REAL_CAM_PERIOD_US = 10_000;
/** 仿真触发周期：CameraSync.trigger_period_us = 20000，仿真时间。 */
export const SIM_TRIGGER_PERIOD_US = 20_000;
/** CameraBase::image_slot_count。 */
export const POOL_SLOTS = 2;
/** 检测基线耗时。两端跑同一份检测代码，所以“让检测变慢”对两端加同样的毫秒数。 */
export const BASE_DETECT_US = 6_000;
/** WEBOTS_SIM_FLOW_RATE 的默认值。 */
export const SIM_FLOW_RATE = 1;
export const MAX_EXTRA_MS = 30;
/** 保存最近多少个已处理帧的采集时间（画轨迹用）。 */
export const HISTORY = 100;
/** 帧带长度。 */
export const LEDGER = 48;
/** 灯条余辉时间常数（只用于显示）。 */
export const LAMP_TAU_US = 45_000;

export type SlotState = 'free' | 'queued' | 'detecting';
export interface Slot {
  state: SlotState;
  seq: number;
  capUs: number;
}
export interface Done {
  seq: number;
  capUs: number;
}

export interface RealLane {
  /** 墙钟，从 0 开始，不会停。 */
  nowUs: number;
  /** 相机已经出了多少帧。 */
  shot: number;
  slots: Slot[];
  /** 检测器完成当前帧的时刻；空闲时是 Infinity。 */
  doneAtUs: number;
  detSlot: number;
  processed: number;
  dropped: number;
  lastDropUs: number;
  last: Done | null;
  history: number[];
  /** 每个相机帧的去向：1 进了帧池，0 丢了。最新的在最后。 */
  ledger: number[];
  /** 四级（CameraFrameSync, ArmorDetector, ArmorTracker, Aimer）最近一次完成的墙钟时刻。 */
  stampUs: number[];
}

export interface SimLane {
  /** Webots 时钟。 */
  simUs: number;
  /** 这一路经过的墙钟时间（暂停时也在走）。 */
  wallUs: number;
  nextTriggerUs: number;
  seq: number;
  /** 当前这一帧的检测还要多少墙钟微秒；0 表示没有在检测。 */
  detLeftUs: number;
  curCapUs: number;
  processed: number;
  /** 恒为 0：下一帧要等这一帧检测完才会产生。保留字段是为了让界面上有这个计数。 */
  dropped: number;
  last: Done | null;
  history: number[];
  ledger: number[];
  stampUs: number[];
  /** 仿真时间 / 墙钟时间，指数平均（约 0.4 s）。 */
  speed: number;
  /** 墙钟时间里有多少比例在等检测，指数平均。 */
  holdFrac: number;
  heldUs: number;
}

export interface World {
  real: RealLane;
  sim: SimLane;
}

export interface Config {
  /** “让检测变慢”的毫秒数，0..30。 */
  extraMs: number;
  paused: boolean;
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function createWorld(): World {
  const slots: Slot[] = [];
  for (let i = 0; i < POOL_SLOTS; i++) slots.push({ state: 'free', seq: 0, capUs: 0 });
  return {
    real: {
      nowUs: 0,
      shot: 0,
      slots,
      doneAtUs: Infinity,
      detSlot: -1,
      processed: 0,
      dropped: 0,
      lastDropUs: -Infinity,
      last: null,
      history: [],
      ledger: [],
      stampUs: [-Infinity, -Infinity, -Infinity, -Infinity],
    },
    sim: {
      simUs: 0,
      wallUs: 0,
      nextTriggerUs: SIM_TRIGGER_PERIOD_US,
      seq: 0,
      detLeftUs: 0,
      curCapUs: 0,
      processed: 0,
      dropped: 0,
      last: null,
      history: [],
      ledger: [],
      stampUs: [-Infinity, -Infinity, -Infinity, -Infinity],
      speed: 1,
      holdFrac: 0,
      heldUs: 0,
    },
  };
}

/** 一帧检测要多少微秒（两端同一个数）。 */
export function detectUs(cfg: Config): number {
  return BASE_DETECT_US + Math.round(clamp(cfg.extraMs, 0, MAX_EXTRA_MS) * 1000);
}

function pushCapped(a: number[], v: number, cap: number): void {
  a.push(v);
  if (a.length > cap) a.shift();
}

// ------------------------------------------------------------------------------------------------ 实车一路
function realStart(r: RealLane, slot: number, cfg: Config): void {
  r.slots[slot].state = 'detecting';
  r.detSlot = slot;
  r.doneAtUs = r.nowUs + detectUs(cfg);
}

function realComplete(r: RealLane, cfg: Config): void {
  const s = r.slots[r.detSlot];
  r.processed++;
  r.last = { seq: s.seq, capUs: s.capUs };
  pushCapped(r.history, s.capUs, HISTORY);
  s.state = 'free';
  r.detSlot = -1;
  r.doneAtUs = Infinity;
  r.stampUs[1] = r.stampUs[2] = r.stampUs[3] = r.nowUs;
  let q = -1;
  for (let i = 0; i < r.slots.length; i++) {
    if (r.slots[i].state === 'queued' && (q < 0 || r.slots[i].seq < r.slots[q].seq)) q = i;
  }
  if (q >= 0) realStart(r, q, cfg);
}

function realArrive(r: RealLane, cfg: Config): void {
  r.shot++;
  r.stampUs[0] = r.nowUs;
  let free = -1;
  for (let i = 0; i < r.slots.length; i++) {
    if (r.slots[i].state === 'free') {
      free = i;
      break;
    }
  }
  if (free < 0) {
    r.dropped++;
    r.lastDropUs = r.nowUs;
    pushCapped(r.ledger, 0, LEDGER);
    return;
  }
  r.slots[free] = { state: 'queued', seq: r.shot, capUs: r.nowUs };
  pushCapped(r.ledger, 1, LEDGER);
  if (r.detSlot < 0) realStart(r, free, cfg);
}

function stepReal(r: RealLane, dtUs: number, cfg: Config): void {
  const end = r.nowUs + dtUs;
  for (let guard = 0; guard < 200000; guard++) {
    const nextShot = (r.shot + 1) * REAL_CAM_PERIOD_US;
    const next = Math.min(nextShot, r.doneAtUs);
    if (next > end) break;
    r.nowUs = next;
    // 同一时刻检测完成和新帧到达：先放槽位，再进新帧
    if (r.doneAtUs <= nextShot) realComplete(r, cfg);
    else realArrive(r, cfg);
  }
  r.nowUs = end;
}

// ------------------------------------------------------------------------------------------------ 仿真一路
function simFinish(s: SimLane): void {
  s.processed++;
  s.last = { seq: s.seq, capUs: s.curCapUs };
  pushCapped(s.history, s.curCapUs, HISTORY);
  s.stampUs[1] = s.stampUs[2] = s.stampUs[3] = s.wallUs;
}

function simTrigger(s: SimLane, cfg: Config): void {
  s.seq++;
  s.curCapUs = s.simUs;
  s.detLeftUs = detectUs(cfg);
  s.nextTriggerUs += SIM_TRIGGER_PERIOD_US;
  s.stampUs[0] = s.wallUs;
  pushCapped(s.ledger, 1, LEDGER);
}

function stepSim(s: SimLane, dtUs: number, cfg: Config): void {
  const sim0 = s.simUs;
  let left = dtUs;
  let held = 0;
  for (let guard = 0; guard < 200000 && left > 1e-6; guard++) {
    if (s.detLeftUs > 0) {
      // 暂停只拦下一步；已经在跑的检测是进程里的计算，照样做完
      const use = Math.min(left, s.detLeftUs);
      s.detLeftUs -= use;
      left -= use;
      s.wallUs += use;
      held += use;
      if (s.detLeftUs <= 1e-6) {
        s.detLeftUs = 0;
        simFinish(s);
      }
      continue;
    }
    if (cfg.paused) {
      s.wallUs += left;
      left = 0;
      break;
    }
    const need = (s.nextTriggerUs - s.simUs) / SIM_FLOW_RATE;
    if (need > left) {
      s.simUs += left * SIM_FLOW_RATE;
      s.wallUs += left;
      left = 0;
      break;
    }
    s.simUs = s.nextTriggerUs;
    s.wallUs += need;
    left -= need;
    simTrigger(s, cfg);
  }
  if (dtUs > 0) {
    const a = 1 - Math.exp(-dtUs / 400_000);
    s.speed += a * ((s.simUs - sim0) / dtUs - s.speed);
    s.holdFrac += a * (held / dtUs - s.holdFrac);
  }
  s.heldUs += held;
}

/** 两路各走 dtSec 个墙钟秒。 */
export function stepWorld(w: World, dtSec: number, cfg: Config): void {
  const dt = Math.max(0, dtSec) * US;
  stepReal(w.real, dt, cfg);
  stepSim(w.sim, dt, cfg);
}

/** 从头跑一段，给“减少动态”的静帧用：暂停时先跑一半再暂停另一半。 */
export function settle(extraMs: number, paused: boolean, seconds = 6, dt = 0.004): World {
  const w = createWorld();
  const run = (sec: number, cfg: Config): void => {
    for (let t = 0; t < sec - 1e-9; t += dt) stepWorld(w, Math.min(dt, sec - t), cfg);
  };
  if (paused) {
    run(seconds / 2, { extraMs, paused: false });
    run(seconds / 2, { extraMs, paused: true });
  } else {
    run(seconds, { extraMs, paused: false });
  }
  return w;
}

// ------------------------------------------------------------------------------------------------ 稳态模型（界面文案和单测对照用）
/** 实车稳态丢帧比例：检测比相机周期长，就按 1 - 周期/耗时 丢。 */
export function realDropModel(extraMs: number): number {
  const det = detectUs({ extraMs, paused: false });
  return det <= REAL_CAM_PERIOD_US ? 0 : 1 - REAL_CAM_PERIOD_US / det;
}

/** 仿真稳态速率：每个触发周期跑 P 仿真微秒，再等 det 微秒。 */
export function simSpeedModel(extraMs: number): number {
  const p = SIM_TRIGGER_PERIOD_US / SIM_FLOW_RATE;
  return p / (p + detectUs({ extraMs, paused: false }));
}

// ------------------------------------------------------------------------------------------------ 灯条
/** 四级模块的亮度 0..1：实车一路用墙钟，仿真一路用自己经过的墙钟（暂停时也在走，余辉会灭）。 */
export function lamps(w: World): { real: number[]; sim: number[] } {
  const lvl = (wall: number, stamps: number[], busy: boolean): number[] =>
    stamps.map((st, k) => (k === 1 && busy ? 1 : Math.exp(-(wall - st) / LAMP_TAU_US)));
  return {
    real: lvl(w.real.nowUs, w.real.stampUs, w.real.detSlot >= 0),
    sim: lvl(w.sim.wallUs, w.sim.stampUs, w.sim.detLeftUs > 0),
  };
}

// ------------------------------------------------------------------------------------------------ 自动演示
export const AUTO_CYCLE_S = 18;

function smooth(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** 没人碰滑块的时候，它自己扫一遍：先停在 0，升到 30，停一会儿，再降回来。 */
export function autoSweep(tSec: number): number {
  const p = ((tSec % AUTO_CYCLE_S) + AUTO_CYCLE_S) % AUTO_CYCLE_S;
  let v: number;
  if (p < 3) v = 0;
  else if (p < 6.5) v = smooth((p - 3) / 3.5);
  else if (p < 11.5) v = 1;
  else if (p < 15) v = 1 - smooth((p - 11.5) / 3.5);
  else v = 0;
  return Math.round(v * MAX_EXTRA_MS);
}

// ------------------------------------------------------------------------------------------------ 画面里的目标（相机卡共用）
const TAU = Math.PI * 2;

export interface TargetPose {
  /** 车体中心在画面里的位置，0..1。 */
  u: number;
  v: number;
  /** 远近缩放。 */
  s: number;
  /** 小陀螺转角。 */
  yaw: number;
}

/** 目标车在时刻 t（秒）的位置：左右平移、略有远近，同时在原地小陀螺。 */
export function targetPose(tSec: number): TargetPose {
  return {
    u: 0.5 + 0.22 * Math.sin((TAU * tSec) / 2.9),
    v: 0.57 + 0.045 * Math.sin((TAU * tSec) / 1.7 + 0.8),
    s: 1 + 0.15 * Math.sin((TAU * tSec) / 5.3),
    yaw: (TAU * tSec) / 2.4,
  };
}

export interface Plate {
  /** 第几块装甲板（0..3，车体四面）。 */
  k: number;
  /** 朝向相机的程度 cos，1 是正对，越小越斜。 */
  facing: number;
  /** 相对车体中心的横向位置，-1..1。 */
  x: number;
}

/** 四面装甲板里相机看得到的几块（朝向 cos 大于 minFacing）。 */
export function visiblePlates(yaw: number, minFacing = 0.12): Plate[] {
  const out: Plate[] = [];
  for (let k = 0; k < 4; k++) {
    const ph = yaw + (k * Math.PI) / 2;
    const facing = Math.cos(ph);
    if (facing > minFacing) out.push({ k, facing, x: Math.sin(ph) });
  }
  return out;
}

/** Aimer 的瞄点：在最新一帧的基础上往前预测的量（秒）。 */
export const AIM_LEAD_S = 0.12;
/** 画轨迹只看最近这么长（秒）。 */
export const TRAIL_WINDOW_S = 0.9;
