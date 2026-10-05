// RobotLineup · robots: the five robots, each drawn by hand in iso.tsx's kit (boxes, bars, plates, wheels) from a pose.
// Units are px at scale 1; the robot's origin is the centre of its footprint on the ground. A robot is a function of
// its pose (sim.ts): the parts that move (gimbal, wheels, props, dart) are `frame()`s fed with the pose numbers.
// Painter's order inside each robot is written out by hand, far to near.
import React from 'react';
import { Armor, Box, Panel, Cone, Cyl, Flash, Flat, Tracer, Wheel, cls, frame, proj, pts, ID } from './iso';
import type { P2, Tf, V3 } from './iso';
import type { PoseOut, RobotId } from './sim';
import styles from './styles.module.css';

type Props = { po: PoseOut };

/** Vent slots on a skirt face: two blocks of three slots on either side of the armour plate. */
function Vents({ tf, c, face, from = 24, to = 42 }: { tf: Tf; c: V3; face: number; from?: number; to?: number }): JSX.Element {
  const slots: JSX.Element[] = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) slots.push(<rect key={s + ':' + k} x={s > 0 ? from : -to} y={-5 + k * 4} width={to - from} height={2} className={styles.vent} />);
  return <Panel tf={tf} c={c} face={face}>{slots}</Panel>;
}

/** Muzzle flash and bullets of a launcher whose tip sits at `tip` (local) and points along local +x. */
function Muzzle({ tf, tip, po, big = false }: { tf: Tf; tip: V3; po: PoseOut; big?: boolean }): JSX.Element {
  const w0 = tf(tip), w1 = tf([tip[0] + 1, tip[1], tip[2]]);
  const dir: V3 = [w1[0] - w0[0], w1[1] - w0[1], w1[2] - w0[2]];
  const s0 = proj(w0), s1 = proj(w1);
  return (
    <g>
      <Flash at={s0} dir={[s1[0] - s0[0], s1[1] - s0[1]]} k={Math.min(1, (po.pose.fire - 1.1) * (big ? 1.1 : 1.5))} />
      {po.shots.map((s) => <Tracer key={s.t0} tip={w0} dir={dir} age={s.age} big={s.big || big} />)}
    </g>
  );
}

// ================================================================================================ hero
const HERO_WHEELS: [number, number][] = [[-50, -64], [50, -64], [-50, 64], [50, 64]];

export function Hero({ po }: Props): JSX.Element {
  const p = po.pose;
  const lit = p.strip;
  const Y = frame([-4, 0, 42], p.yaw);
  const P = frame([0, 0, 52], 0, p.pitch, Y);
  const M = frame([-10, 0, 16], 0, p.miniPitch, P);
  const Lid = frame([8, 0, 10], 0, p.scopeOpen, M);
  const wheel = (i: number): JSX.Element => (
    <Wheel key={i} tf={ID} c={[HERO_WHEELS[i][0], HERO_WHEELS[i][1], 25]} axle={Math.PI / 2} r={25} t={18} roll={0} kind="mecanum" />
  );
  return (
    <g>
      {wheel(0)}{wheel(1)}
      {/* chassis */}
      <Box tf={ID} p={[-62, -48, 14]} d={[124, 96, 20]} m="body" />
      <Box tf={ID} p={[-56, -42, 34]} d={[112, 84, 8]} m="dark" />
      <Box tf={ID} p={[-52, -34, 42]} d={[56, 68, 6]} m="body" />
      <Armor tf={ID} c={[62, 0, 24]} face={0} no="1" lit={lit} w={40} h={22} />
      <Armor tf={ID} c={[0, 48, 24]} face={Math.PI / 2} no="1" lit={lit} w={40} h={22} />
      <Vents tf={ID} c={[62, 0, 24]} face={0} from={26} to={42} />
      <Vents tf={ID} c={[0, 48, 24]} face={Math.PI / 2} from={26} to={50} />
      {wheel(2)}{wheel(3)}
      {/* turret: rear hopper, bearing, pillar, left arm, launcher, right arm */}
      <Box tf={Y} p={[-40, -20, 6]} d={[28, 40, 26]} m="body" top="metal" />
      <Cyl tf={Y} a={[0, 0, 0]} b={[0, 0, 7]} r={24} m="metal" strips={false} />
      <Box tf={Y} p={[-16, -18, 7]} d={[32, 36, 24]} m="dark" />
      <Box tf={Y} p={[-12, -36, 16]} d={[26, 9, 46]} m="body" />
      <Cyl tf={Y} a={[0, -40, 52]} b={[0, 40, 52]} r={3.2} m="metal" />
      <Box tf={P} p={[-32, -14, -14]} d={[64, 28, 28]} m="dark" />
      <Cyl tf={P} a={[10, 14, 0]} b={[10, 19, 0]} r={9} m="metal" strips={false} />
      <Box tf={P} p={[-28, -11, 14]} d={[38, 22, 12]} m="body" top="metal" />
      <Cyl tf={P} a={[32, 0, 0]} b={[56, 0, 0]} r={11} m="body" />
      <Cyl tf={P} a={[56, 0, 0]} b={[86, 0, 0]} r={8.4} m="metal" />
      <Cyl tf={P} a={[86, 0, 0]} b={[94, 0, 0]} r={10.2} m="dark" capM="rubber" />
      {/* MiniGimbal: camera pod with a flap over the lens */}
      <Box tf={M} p={[-8, -7, 0]} d={[16, 14, 10]} m="dark" />
      <Cyl tf={M} a={[8, 0, 5]} b={[13, 0, 5]} r={3.8} m="glass" capM="glass" strips={false} />
      <Box tf={Lid} p={[0, -7.5, -10]} d={[2, 15, 10]} m="body" />
      <Box tf={Y} p={[-12, 27, 16]} d={[26, 9, 46]} m="body" />
      <Muzzle tf={P} tip={[94, 0, 0]} po={po} big />
    </g>
  );
}

// ================================================================================================ infantry
const INF_WHEELS: [number, number, number][] = [[-48, -48, -160], [48, -48, -20], [-48, 48, 160], [48, 48, 20]];

export function Infantry({ po }: Props): JSX.Element {
  const p = po.pose;
  const lit = p.strip;
  const Y = frame([0, 0, 36], p.yaw);
  const P = frame([0, 0, 38], 0, p.pitch, Y);
  const wheel = (i: number): JSX.Element => {
    const [x, y, deg] = INF_WHEELS[i];
    return <Wheel key={i} tf={ID} c={[x, y, 20]} axle={(deg * Math.PI) / 180} r={20} t={14} roll={p.wheel} kind="omni" />;
  };
  const amt = p.spinAmt;
  const ring = (back: boolean): JSX.Element | null => {
    if (amt <= 0.02) return null;
    const segs: JSX.Element[] = [];
    for (let k = 0; k < 4; k++) {
      const a0 = p.spin + (k * Math.PI) / 2;
      const P2s: P2[] = [];
      for (let j = 0; j <= 12; j++) { const a = a0 + (j / 12 - 0.5) * 1.1; P2s.push(proj([84 * Math.cos(a), 84 * Math.sin(a), 24])); }
      const mid = a0;
      const isBack = Math.cos(mid) + Math.sin(mid) < 0;
      if (isBack !== back) continue;
      segs.push(<polyline key={k} points={pts(P2s)} className={styles.spinArc} />);
    }
    const full: P2[] = [];
    for (let j = 0; j <= 40; j++) { const a = (j / 40) * Math.PI * 2; full.push(proj([84 * Math.cos(a), 84 * Math.sin(a), 24])); }
    // the dashed ring is drawn once, with the back arcs
    return <g opacity={amt}>{back ? <polyline points={pts(full)} className={styles.spinRing} /> : null}{segs}</g>;
  };
  return (
    <g>
      {ring(true)}
      {wheel(0)}{wheel(1)}
      <Box tf={ID} p={[-42, -42, 8]} d={[84, 84, 22]} m="dark" />
      <Box tf={ID} p={[-38, -38, 30]} d={[76, 76, 6]} m="body" />
      <Armor tf={ID} c={[42, 0, 19]} face={0} no="3" lit={lit} />
      <Armor tf={ID} c={[0, 42, 19]} face={Math.PI / 2} no="3" lit={lit} />
      <Vents tf={ID} c={[42, 0, 19]} face={0} from={22} to={36} />
      <Vents tf={ID} c={[0, 42, 19]} face={Math.PI / 2} from={22} to={36} />
      {wheel(2)}{wheel(3)}
      {ring(false)}
      {/* gimbal: hopper behind, bearing, pillar, left arm, launcher, right arm */}
      <Box tf={Y} p={[-34, -14, 0]} d={[24, 28, 26]} m="body" top="metal" />
      <Cyl tf={Y} a={[0, 0, 0]} b={[0, 0, 6]} r={18} m="metal" strips={false} />
      <Box tf={Y} p={[-12, -14, 6]} d={[24, 28, 16]} m="dark" />
      <Box tf={Y} p={[-10, -27, 16]} d={[20, 8, 34]} m="body" />
      <Cyl tf={Y} a={[0, -30, 38 - 0]} b={[0, 30, 38]} r={3} m="metal" />
      <Box tf={P} p={[-16, -9, -8]} d={[36, 18, 16]} m="dark" />
      <Box tf={P} p={[8, -8, -6]} d={[14, 16, 12]} m="metal" />
      <Box tf={P} p={[-6, -5, 8]} d={[14, 10, 8]} m="dark" />
      <Cyl tf={P} a={[8, 0, 12]} b={[13, 0, 12]} r={3.2} m="glass" capM="glass" strips={false} />
      <Cyl tf={P} a={[20, 0, 0]} b={[56, 0, 0]} r={3.6} m="metal" />
      <Cyl tf={P} a={[56, 0, 0]} b={[60, 0, 0]} r={4.6} m="dark" capM="rubber" />
      <Box tf={Y} p={[-10, 19, 16]} d={[20, 8, 34]} m="body" />
      <Muzzle tf={P} tip={[60, 0, 0]} po={po} />
    </g>
  );
}

// ================================================================================================ sentry
const SEN_WHEELS: [number, number][] = [[-48, -56], [48, -56], [-48, 56], [48, 56]];

export function Sentry({ po }: Props): JSX.Element {
  const p = po.pose;
  const lit = p.strip;
  const R = frame([0, p.slide, 0]);
  const Y = frame([0, 0, 42], p.yaw, 0, R);
  const P = frame([0, 0, 56], 0, p.pitch, Y);
  const Rd = frame([-30, 24, 59], p.radar, 0, Y);
  const wheel = (i: number): JSX.Element => (
    <g key={i}>
      <Wheel tf={R} c={[SEN_WHEELS[i][0], SEN_WHEELS[i][1], 19]} axle={Math.PI / 2 + p.steer} r={19} t={14} roll={p.w} kind="helm" />
      <Cyl tf={R} a={[SEN_WHEELS[i][0], SEN_WHEELS[i][1], 36]} b={[SEN_WHEELS[i][0], SEN_WHEELS[i][1], 44]} r={5.2} m="dark" capM="metal" strips={false} />
    </g>
  );
  return (
    <g>
      {wheel(0)}{wheel(1)}
      <Box tf={R} p={[-54, -46, 14]} d={[108, 92, 22]} m="body" />
      <Box tf={R} p={[-48, -40, 36]} d={[96, 80, 6]} m="dark" />
      <Box tf={R} p={[-46, -30, 42]} d={[26, 60, 12]} m="body" top="metal" />
      <Armor tf={R} c={[54, 0, 25]} face={0} no="7" lit={lit} w={38} h={22} />
      <Armor tf={R} c={[0, 46, 25]} face={Math.PI / 2} no="7" lit={lit} w={38} h={22} />
      <Vents tf={R} c={[54, 0, 25]} face={0} from={25} to={44} />
      <Vents tf={R} c={[0, 46, 25]} face={Math.PI / 2} from={25} to={48} />
      {wheel(2)}{wheel(3)}
      {/* gimbal: hopper, antenna, bearing, pillar, left arm, launcher, right arm */}
      <Box tf={Y} p={[-40, -22, 0]} d={[30, 44, 34]} m="body" top="metal" />
      <Cyl tf={Y} a={[-30, 24, 4]} b={[-30, 24, 54]} r={1.8} m="metal" strips={false} />
      {/* lidar on the mast: a dark drum with a window that turns with p.radar */}
      <Cyl tf={Y} a={[-30, 24, 54]} b={[-30, 24, 64]} r={8} m="dark" capM="metal" strips={false} />
      <Box tf={Rd} p={[4.5, -3.5, -3]} d={[4, 7, 6]} m="glass" />
      <Box tf={Rd} p={[-8.5, -3.5, -3]} d={[4, 7, 6]} m="metal" />
      <Cyl tf={Y} a={[0, 0, 0]} b={[0, 0, 7]} r={20} m="metal" strips={false} />
      <Cyl tf={Y} a={[0, 0, 7]} b={[0, 0, 22]} r={13} m="dark" strips={false} />
      <Box tf={Y} p={[-10, -28, 14]} d={[22, 8, 36]} m="body" />
      <Cyl tf={Y} a={[0, -32, 14 + 0]} b={[0, 32, 14]} r={3} m="metal" />
      <Box tf={P} p={[-20, -11, -10]} d={[46, 22, 20]} m="dark" />
      <Box tf={P} p={[-4, -7, 10]} d={[16, 14, 8]} m="metal" />
      <Cyl tf={P} a={[26, 0, 0]} b={[70, 0, 0]} r={4.4} m="metal" />
      <Cyl tf={P} a={[70, 0, 0]} b={[75, 0, 0]} r={5.6} m="dark" capM="rubber" />
      <Box tf={Y} p={[-10, 20, 14]} d={[22, 8, 36]} m="body" />
      <Muzzle tf={P} tip={[75, 0, 0]} po={po} />
    </g>
  );
}

// ================================================================================================ aerial
const MOTORS: [number, number][] = [[-58, -58], [58, -58], [-58, 58], [58, 58]];
/** Order far to near: (-,-), (+,-), (-,+), (+,+). */

export function Aerial({ po }: Props): JSX.Element {
  const p = po.pose;
  const on = Math.min(1, 0.2 + 0.8 * p.armor);
  const A = frame([0, 0, 26 + p.lift], 0, p.tilt);
  const Y = frame([30, 0, -7], p.yaw, 0, A);
  const P = frame([0, 0, -15], 0, p.pitch, Y);
  const blade = p.blade, disc = po.disc;
  const arm = (i: number): JSX.Element => {
    const [mx, my] = MOTORS[i];
    const ang = p['prop' + i];
    const Bs: JSX.Element[] = [];
    if (blade > 0.04) {
      for (let s = 0; s < 2; s++) {
        const a = ang + s * Math.PI;
        const c = Math.cos(a), sn = Math.sin(a);
        const loc = (r: number, w: number): [number, number] => [mx + r * c - w * sn, my + r * sn + w * c];
        Bs.push(<Flat key={s} tf={A} z={18} m="dark" P={[loc(4, -2.4), loc(33, -3.6), loc(33, 2.4), loc(4, 3)]} cn={cls('dark', 'M')} />);
      }
    }
    const ring: P2[] = [];
    for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; ring.push(proj(A([mx + 34 * Math.cos(a), my + 34 * Math.sin(a), 18]))); }
    return (
      <g key={i}>
        <Cyl tf={A} a={[0, 0, 4]} b={[mx, my, 4]} r={3.6} m="dark" />
        <Cyl tf={A} a={[mx, my, 4]} b={[mx, my, 14]} r={7.5} m="metal" strips={false} />
        <g opacity={on}><Box tf={A} p={[mx * 0.8 - 2, my * 0.8 - 2, 7]} d={[4, 4, 2.4]} m="accent" /></g>
        <Cyl tf={A} a={[mx, my, 14]} b={[mx, my, 18]} r={3} m="dark" strips={false} />
        <g opacity={blade}>{Bs}</g>
        {disc > 0.02 ? (
          <g opacity={disc}>
            <polygon points={pts(ring)} className={styles.disc} />
            <polygon points={pts(ring.map((q, j) => [q[0] * 0.6 + proj(A([mx, my, 18]))[0] * 0.4, q[1] * 0.6 + proj(A([mx, my, 18]))[1] * 0.4] as P2))} className={styles.discIn} />
          </g>
        ) : null}
      </g>
    );
  };
  const leg = (x: number, y: number): JSX.Element => (
    <g key={x + ':' + y}>
      <Cyl tf={A} a={[x, y, -2]} b={[x * 1.5, y * 1.5, -24]} r={1.8} m="metal" strips={false} />
      <Box tf={A} p={[x * 1.5 - 6, y * 1.5 - 1.5, -26]} d={[12, 3, 2.4]} m="dark" />
    </g>
  );
  return (
    <g>
      {leg(-24, -18)}{arm(0)}
      {arm(1)}{arm(2)}
      {leg(24, -18)}{leg(-24, 18)}
      <Box tf={A} p={[-34, -24, -6]} d={[68, 48, 14]} m="dark" />
      <Box tf={A} p={[-24, -19, 8]} d={[46, 38, 8]} m="body" top="metal" />
      <g opacity={on}><Box tf={A} p={[24, -10, 8]} d={[8, 20, 5]} m="accent" /></g>
      {/* gimbal hung under the nose */}
      <Cyl tf={Y} a={[0, 0, 0]} b={[0, 0, -7]} r={7} m="metal" strips={false} />
      <Box tf={Y} p={[-6, -15, -22]} d={[12, 3, 18]} m="body" />
      <Box tf={P} p={[-8, -6, -5]} d={[22, 12, 10]} m="dark" />
      <Box tf={P} p={[0, -4, 5]} d={[10, 8, 6]} m="dark" />
      <Cyl tf={P} a={[10, 0, 8]} b={[13, 0, 8]} r={2.6} m="glass" capM="glass" strips={false} />
      <Cyl tf={P} a={[14, 0, 0]} b={[36, 0, 0]} r={3} m="metal" />
      <Box tf={Y} p={[-6, 12, -22]} d={[12, 3, 18]} m="body" />
      {leg(24, 18)}
      {arm(3)}
      <Muzzle tf={P} tip={[36, 0, 0]} po={po} />
    </g>
  );
}

// ================================================================================================ dart
export function Dart({ po }: Props): JSX.Element {
  const p = po.pose;
  const fric = po.fric;
  // the station is turned half a turn: the dart leaves towards the back of the picture, we see the launcher from behind
  const R = frame([0, 0, 0], Math.PI);
  const Y = frame([0, 0, 24], p.yaw, 0, R);
  const P = frame([-30, 0, 24], 0, p.pitch, Y);
  const dart = (x: number, z: number, a: number, key: string): JSX.Element | null =>
    a < 0.02 ? null : (
      <g key={key} opacity={a}>
        <Cyl tf={P} a={[x, 0, z]} b={[x + 42, 0, z]} r={4.6} m="metal" />
        <Cone tf={P} a={[x + 42, 0, z]} b={[x + 64, 0, z]} r={4.6} m="body" />
        <Box tf={P} p={[x - 1, -8, z - 0.5]} d={[10, 16, 1]} m="accent" />
        <Box tf={P} p={[x - 1, -0.5, z - 8]} d={[10, 1, 16]} m="accent" />
      </g>
    );
  // friction wheels squeeze the dart from both sides; sgn is the side (local y)
  const fw = (x: number, sgn: number): JSX.Element => (
    <g key={x + ':' + sgn}>
      <Cyl tf={P} a={[x, sgn * 10.6, 0]} b={[x, sgn * 24, 0]} r={7} m="dark" strips={false} />
      <Cyl tf={P} a={[x, sgn * 4.6, 0]} b={[x, sgn * 10.6, 0]} r={9.5} m="rubber" strips={false} />
      {fric > 0.04 ? <FricBlur tf={P} x={x} y={sgn > 0 ? 4.6 : -10.6} amt={fric} ang={p.fricAng} /> : null}
    </g>
  );
  return (
    <g>
      {/* base, yaw table, pitch frame; far side (local +x, +y) first */}
      <Box tf={R} p={[-62, -52, 0]} d={[124, 104, 10]} m="dark" />
      <Box tf={R} p={[-62, -60, 10]} d={[28, 20, 22]} m="body" top="metal" />
      <Box tf={R} p={[34, 38, 10]} d={[24, 18, 16]} m="body" top="metal" />
      <Cyl tf={R} a={[0, 0, 10]} b={[0, 0, 24]} r={30} m="metal" strips={false} />
      <Box tf={Y} p={[-36, -24, 0]} d={[24, 48, 14]} m="dark" />
      {/* pitch frame: M3508 at the rear, trough, rails, magazine, pusher, wheels, darts */}
      <Cyl tf={P} a={[-58, 0, 3]} b={[-38, 0, 3]} r={9} m="dark" strips={false} />
      <Box tf={P} p={[-34, -15, -7]} d={[170, 30, 4]} m="dark" />
      <Box tf={P} p={[-34, -17, -4]} d={[170, 5, 6]} m="metal" />
      <Box tf={P} p={[-34, 12, -4]} d={[170, 5, 6]} m="metal" />
      {/* magazine above the rail */}
      <Box tf={P} p={[2, -14, 22]} d={[56, 3, 20]} m="body" />
      <Box tf={P} p={[2, 11, 22]} d={[56, 3, 20]} m="body" />
      {dart(6, p.d1z, p.d1a, 'd1')}
      {dart(6 + p.d0x, p.d0z, p.d0a, 'd0')}
      {/* pusher */}
      <Cyl tf={P} a={[-38, 0, 3]} b={[-16 + p.push, 0, 3]} r={2.6} m="metal" strips={false} />
      <Box tf={P} p={[-18 + p.push, -6, -3]} d={[8, 12, 12]} m="dark" />
      {fw(70, 1)}{fw(112, 1)}{fw(70, -1)}{fw(112, -1)}
    </g>
  );
}

/** Spinning friction wheel: a few arcs on the visible face (plane y). */
function FricBlur({ tf, x, y, amt, ang }: { tf: Tf; x: number; y: number; amt: number; ang: number }): JSX.Element {
  const arcs: JSX.Element[] = [];
  for (let k = 0; k < 3; k++) {
    const P2s: P2[] = [];
    for (let j = 0; j <= 8; j++) {
      const a = ang * 3 + k * 2.1 + (j / 8) * 1.7;
      const r = 8.2 - k * 1.5;
      P2s.push(proj(tf([x + r * Math.cos(a), y, r * Math.sin(a)])));
    }
    arcs.push(<polyline key={k} points={pts(P2s)} className={styles.fric} />);
  }
  return <g opacity={amt}>{arcs}</g>;
}

export const ROBOT_VIEW: Record<RobotId, (p: Props) => JSX.Element> = { dart: Dart, hero: Hero, infantry: Infantry, sentry: Sentry, aerial: Aerial };
