// RobotLineup · sim: robot data, idle choreography and layout. Pure numbers (no DOM, no drawing).
// The idle loop is one 14 s cycle. Every robot always moves a little (gimbals sweep, light bars breathe, the sentry's lidar
// turns, the aerial robot hovers and bobs), and one robot at a time does something big: dart load + launch (0.5-3.9 s),
// infantry burst (4.3 s) and spin-top (5.0-7.4 s), hero 42 mm shot (7.8 s) and MiniGimbal lob view (8.4 s on),
// sentry burst (9.6 s) and crab walk (10.4-12.6 s), aerial burst (12.8 s). Big moments never overlap.
// What each number looks like is decided in robots.tsx (hand-drawn SVG); angles here are radians, lengths are px.

// ------------------------------------------------------------------------------------------ data
export type RobotId = 'dart' | 'hero' | 'infantry' | 'sentry' | 'aerial';
export type RobotInfo = { id: RobotId; name: string; no: string; file: string; modules: string[]; fact: string };

/** Left to right as they stand. Module names as in User/RobotConfig/*.yaml (bsp-dev-c). */
export const ROBOTS: RobotInfo[] = [
  { id: 'dart', name: '飞镖', no: '', file: 'dart.yaml', modules: ['Dart', 'Referee', 'HostData'], fact: '4 个摩擦轮电机分两级，M2006 推镖，俯仰和偏航各一个 M3508。' },
  { id: 'hero', name: '英雄', no: '1', file: 'hero.yaml', modules: ['Chassis（Mecanum）', 'HeroLauncher', 'MiniGimbal'], fact: '42 mm 发射机构用 4 个摩擦轮电机；MiniGimbal 有吊射模式和镜头开合。' },
  { id: 'infantry', name: '步兵', no: '3', file: 'omni_infantry_3.yaml', modules: ['Chassis（Omni）', 'InfantryLauncher', 'CameraSync'], fact: '全向轮底盘，CameraSync 给相机打触发。另一份 omni_infantry_4.yaml 单独维护参数。' },
  { id: 'sentry', name: '哨兵', no: '7', file: 'sentry.yaml', modules: ['Chassis（Helm）', 'SentryProtocol', 'Gimbal'], fact: '舵轮底盘：4 个 M3508 驱动，4 个 GM6020 转向。' },
  { id: 'aerial', name: '空中', no: '', file: 'aerial.yaml', modules: ['Gimbal', 'InfantryLauncher', 'MadgwickAHRS'], fact: '这份配置是云台、发射和 BMI088 姿态解算，没有底盘。' },
];
export const DOCS_ROUTE = '/电控组/robot-configs';
export const CONFIG_DIR = 'User/RobotConfig/';

// ------------------------------------------------------------------------------------------ timing helpers
export const D2R = Math.PI / 180;
export const TAU = Math.PI * 2;
export const PERIOD = 14;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const sm = (x: number): number => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const ss = (t: number, a: number, b: number): number => sm((t - a) / (b - a));
/** Move-and-hold: keys [t0, t1, value]; between t0 and t1 the value eases from the previous one. */
function keyed(keys: [number, number, number][], t: number, init: number): number {
  let v = init;
  for (const [t0, t1, val] of keys) {
    if (t >= t1) { v = val; continue; }
    if (t > t0) return v + (val - v) * ss(t, t0, t1);
    return v;
  }
  return v;
}
const cyc = (t: number): number => ((t % PERIOD) + PERIOD) % PERIOD;
/** Light that decays after each event time. */
function flash(times: number[], u: number, k = 0.16): number {
  let f = 0;
  for (const te of times) { const d = u - te; if (d >= 0 && d < 1.2) f = Math.max(f, Math.exp(-d / k)); }
  return f;
}
/** Armour light bars switching on at boot (with a short flicker). */
function bootLight(t: number, tOn: number): number {
  if (t < tOn) return 0;
  const d = t - tOn;
  if (d > 0.3) return 1;
  return [1, 0.15, 1, 1, 0.3, 1][Math.floor(d * 20) % 6];
}

/** The big moments of the cycle (robot, what, start, end). They never overlap. Small moves (gimbals sweeping, light
 *  bars breathing, hover, radar) are always on for every robot and are not listed. */
export const EVENTS: [RobotId, string, number, number][] = [
  ['dart', '装填并发射', 0.5, 3.9],
  ['infantry', '点射', 4.3, 4.9],
  ['infantry', '小陀螺', 5.0, 7.4],
  ['hero', '42 mm 发射', 7.6, 8.3],
  ['hero', 'MiniGimbal 吊射视角', 8.4, 9.4],
  ['sentry', '点射', 9.6, 10.3],
  ['sentry', '舵轮横移', 10.4, 12.6],
  ['aerial', '点射', 12.8, 13.7],
];

/** One bullet in the air: t0 is its start (s on the widget clock), age how long ago that was. */
export type Shot = { t0: number; age: number; big: boolean };
export type PoseOut = { pose: Record<string, number>; shots: Shot[]; fric: number; disc: number };
/** A shot is drawn for this long (s). */
export const SHOT_LIFE = 0.5;

/** Always-on small motion: k cycles per loop, so the loop closes. */
const wob = (t: number, k: number, ph: number): number => Math.sin((TAU * t) / (PERIOD / k) + ph);
/** Dart timeline: the loading steps below are written for 0.6-5.8 s; the cycle plays them 1.25x faster. */
const dartClock = (u: number): number => (u < 0.6 ? u : 0.6 + (u - 0.6) * 1.25);
/** Inverse of dartClock for ud >= 0.6. */
const dartClockInv = (ud: number): number => 0.6 + (ud - 0.6) / 1.25;
/** Phase of each robot's light-bar breathing. */
const BREATH: Record<RobotId, number> = { dart: 0, hero: 1.3, infantry: 2.6, sentry: 3.9, aerial: 5.2 };

/** Pose of one robot at time t (seconds since the widget started). still: the reduced-motion frame.
 *  Keys common to the gimbal robots: yaw / pitch (rad, yaw to the right, pitch up), fire (1 at rest, >1 just after a
 *  shot), strip (light bar level), armor (boot flicker 0..1). */
export function poseAt(id: RobotId, t: number, still = false): PoseOut {
  if (still) t = STILL_T[id];
  const u = cyc(t);
  const p: Record<string, number> = {};
  const shots: Shot[] = [];
  const shotsAt = (times: number[], big: boolean): void => {
    for (const s of times) {
      const t0 = t - u + s;
      for (const t1 of [t0, t0 - PERIOD]) if (t - t1 >= 0 && t - t1 < SHOT_LIFE) shots.push({ t0: t1, age: t - t1, big });
    }
  };
  let fric = 0, disc = 0;
  const boot = still ? 1 : bootLight(t, BOOT[id]);
  p.armor = boot;
  // light bars breathe (5 cycles per loop, each robot out of phase)
  const breath = 0.84 + 0.16 * wob(t, 5, BREATH[id]);
  if (id === 'infantry') {
    const sp = 2 * TAU * ss(u, 5.0, 7.4);
    p.spin = sp;                       // chassis spin angle; the gimbal keeps its heading, so yaw does not change
    p.spinAmt = ss(u, 5.0, 5.4) - ss(u, 7.0, 7.4);
    p.wheel = -sp * 3;
    // the gimbal scans a few degrees all the time, and holds its heading while the chassis spins
    const sweep = 1 - p.spinAmt;
    p.yaw = (keyed([[0.8, 1.8, -26], [2.6, 3.4, 18], [3.9, 4.2, 8], [8.6, 9.6, -32], [11.4, 12.4, 22], [13.2, 13.8, 0]], u, 0) + sweep * 6 * wob(t, 3, 0.4)) * D2R;
    p.pitch = (keyed([[0.8, 1.8, 4], [2.6, 3.4, 7], [3.9, 4.2, 3], [8.6, 9.6, 1], [11.4, 12.4, 2], [13.2, 13.8, 2]], u, 2) + sweep * 1.5 * wob(t, 4, 1.1)) * D2R;
    const st = [4.3, 4.42, 4.54];
    shotsAt(st, false);
    p.fire = 1 + flash(st, u, 0.07);
    p.strip = boot * (breath + 0.8 * flash(st, u, 0.1));
  } else if (id === 'hero') {
    p.yaw = (keyed([[1.0, 2.2, -20], [5.2, 6.2, 16], [9.8, 11.0, -10], [12.8, 13.8, 0]], u, 0) + 4 * wob(t, 2, 1.7)) * D2R;
    p.pitch = (keyed([[1.0, 2.2, 2], [5.2, 6.2, 6], [9.8, 11.0, 2], [12.8, 13.8, 3]], u, 3) + 1.2 * wob(t, 3, 0.2)) * D2R;
    p.miniPitch = keyed([[8.6, 9.2, 14], [11.2, 11.8, 0]], u, 0) * D2R;
    p.scopeOpen = keyed([[8.4, 8.9, 86], [11.8, 12.3, 0]], u, 0) * D2R;
    shotsAt([7.8], true);
    p.fire = 1 + flash([7.8], u, 0.1);
    p.strip = boot * (breath + 0.9 * flash([7.8], u, 0.14));
  } else if (id === 'sentry') {
    // crab walk: the four steering wheels turn 90 deg, the whole robot slides to the side and back
    const steer = ss(u, 10.4, 10.9) - ss(u, 12.2, 12.6);
    const slide = 26 * (ss(u, 10.9, 11.7) - ss(u, 11.8, 12.2));
    p.steer = steer * 90 * D2R;
    p.slide = slide;
    p.w = slide / 19;                  // wheel radius 19 px
    p.yaw = 28 * wob(t, 3, 0) * D2R;   // the gimbal patrols all the time
    p.pitch = (2.5 + 2 * wob(t, 4, 1)) * D2R;
    p.radar = TAU * 1.1 * t;           // the lidar on the mast turns all the time
    const st = [9.6, 9.76];
    shotsAt(st, false);
    p.fire = 1 + flash(st, u, 0.07);
    p.strip = boot * (breath + 0.8 * flash(st, u, 0.1));
  } else if (id === 'aerial') {
    const T = 1.6;
    const rpm = still ? 1 : ss(t, 0, T);
    const x = clamp(t / T, 0, 1);
    const integ = t < T ? T * (x * x * x - (x * x * x * x) / 2) : t - T / 2;
    const w = TAU * 9;
    for (let i = 0; i < 4; i++) p['prop' + i] = (i % 2 ? -1 : 1) * w * integ + i;
    const lift = still ? 1 : ss(t, 1.1, 3.4);
    p.lift = lift * (46 + 2.8 * wob(t, 6, 0));   // px above the landing pose; bobs while hovering
    p.roll = 2.2 * D2R * wob(t, 5, 0) * lift;
    p.tilt = (1.6 * wob(t, 4, 1) - 2) * D2R * lift;
    p.blade = 1 - ss(rpm, 0.35, 0.8);   // 1: blades visible, 0: only the blur disc
    disc = ss(rpm, 0.3, 0.9);
    p.yaw = (keyed([[2.6, 3.6, -18], [6.2, 7.4, 12], [10.4, 11.6, 30], [13.4, 14, 0]], u, 0) + 3 * wob(t, 3, 2)) * D2R;
    p.pitch = (keyed([[2.6, 3.6, -14], [6.2, 7.4, -6], [10.4, 11.4, -10], [13.4, 14, -8]], u, -8) + 1.2 * wob(t, 4, 0.6)) * D2R;
    const st = [12.8, 12.9, 13.0];
    shotsAt(st, false);
    p.fire = 1 + flash(st, u, 0.07);
    p.strip = boot * (breath + 0.8 * flash(st, u, 0.1));
  } else if (id === 'dart') {
    p.yaw = (keyed([[6.5, 7.2, 3], [9, 9.7, -2], [12, 12.7, 0]], u, 0) + 2.2 * wob(t, 3, 0.9)) * D2R;
    p.pitch = (34 + 0.8 * wob(t, 4, 0.3)) * D2R;
    // dart 0 is on the rail, dart 1 waits in the magazine above it. Loading: dart 0 drops in, the pusher
    // slides it onto the wheels, the wheels spin up, the pusher fires it, the next dart comes down.
    const ud = dartClock(u);
    if (ud < 4.6) {
      const drop = ss(ud, 0.6, 1.2);
      p.d0z = 9 * (1 - drop);
      p.d1z = 24 - 9 * drop;
      p.d1a = 1;
      let x = 40 * ss(ud, 1.4, 2.6), a = 1;
      if (ud >= 3.8) {
        const tau = ud - 3.8, v = 1100, acc = 9000, t1 = v / acc;
        x = 40 + (tau < t1 ? 0.5 * acc * tau * tau : 0.5 * acc * t1 * t1 + v * (tau - t1));
        a = 1 - ss(tau, 0.22, 0.5);
      }
      p.d0x = x; p.d0a = a;
    } else {
      p.d0x = 0; p.d0z = 9; p.d0a = ss(ud, 4.8, 5.5);
      p.d1z = 24; p.d1a = ss(ud, 5.0, 5.8);
    }
    p.push = 40 * ss(ud, 1.4, 2.6) + 22 * ss(ud, 3.8, 3.9) - 62 * ss(ud, 4.3, 5.2);
    fric = ss(ud, 2.4, 3.4) - ss(ud, 4.4, 5.4);
    p.fricAng = (t * 60) % TAU;
    p.strip = boot * (breath + 0.9 * flash([dartClockInv(3.8)], u, 0.16));
  }
  return { pose: p, shots, fric, disc };
}
/** Boot order of the light bars (s). */
const BOOT: Record<RobotId, number> = { dart: 0.55, hero: 0.15, infantry: 0.3, sentry: 0.45, aerial: 0.6 };
/** The reduced-motion frame: every robot at a telling moment (aerial hovering, dart on the rail, hero lob view open). */
const STILL_T: Record<RobotId, number> = { dart: 2.5, hero: 10.0, infantry: 3.0, sentry: 5.0, aerial: 6.0 };

// ------------------------------------------------------------------------------------------ layout
/** Everything is drawn in a viewBox of W x H units; k converts units to CSS px. place: where each robot's ground
 *  origin goes (units) and its scale. */
export type Place = { x: number; y: number; s: number };
export type Layout = {
  mode: 'wide' | 'strip';
  /** viewBox: origin (0, y0), size W x H. */
  W: number; H: number; y0: number;
  k: number;
  /** CSS size of the svg. */
  w: number; h: number;
  place: Record<RobotId, Place>;
  /** Back to front. */
  order: RobotId[];
};

const WIDE_W = 1200, WIDE_H = 390, WIDE_Y0 = 170;
const WIDE: Record<RobotId, Place> = {
  dart: { x: 140, y: 436, s: 1.02 },
  hero: { x: 398, y: 462, s: 1.16 },
  infantry: { x: 655, y: 474, s: 1.2 },
  sentry: { x: 918, y: 462, s: 1.15 },
  aerial: { x: 1068, y: 392, s: 0.98 },
};
const CELL = 290, STRIP_H = 345, STRIP_Y0 = 40;
const WIDE_ORDER: RobotId[] = ['dart', 'aerial', 'hero', 'infantry', 'sentry'];

/** Layout for a container width (px). Wide: the group stands together. Narrow (< 640 px): one row to swipe. */
export function layout(width: number, narrow?: boolean): Layout {
  const strip = narrow ?? width < 640;
  if (!strip) {
    const k = width / WIDE_W;
    return { mode: 'wide', W: WIDE_W, H: WIDE_H, y0: WIDE_Y0, k, w: width, h: Math.round(WIDE_H * k), place: WIDE, order: WIDE_ORDER };
  }
  const k = clamp(width / 440, 0.72, 0.95);
  const place = {} as Record<RobotId, Place>;
  ROBOTS.forEach((r, i) => {
    place[r.id] = { x: CELL * i + CELL / 2, y: r.id === 'aerial' ? 300 : 318, s: r.id === 'dart' ? 0.92 : 1 };
  });
  const W = CELL * ROBOTS.length;
  return { mode: 'strip', W, H: STRIP_H, y0: STRIP_Y0, k, w: Math.round(W * k), h: Math.round(STRIP_H * k), place, order: ROBOTS.map((r) => r.id) };
}
