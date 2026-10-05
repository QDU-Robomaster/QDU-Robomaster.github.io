// Unit tests for the RobotLineup core (sim.ts: data, idle choreography, layout). Drawing lives in iso.tsx / robots.tsx.
// A: the robot data matches the docs (config files, module names, route).
// C: the idle loop is deterministic, staggered, and the still frame does not depend on time.
// D: layout.
// run: node --test src/components/showcase/RobotLineup/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './sim.ts';

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, '..', '..', '..', '..', 'docs');
const configsMd = readFileSync(join(docs, '电控组', 'robot-configs.md'), 'utf8');
const modulesMd = readFileSync(join(docs, '电控组', 'modules.md'), 'utf8');
const IDS = ['dart', 'hero', 'infantry', 'sentry', 'aerial'];
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------------------------------------------------------------- A. data
test('five robots, left to right, each with a config and two or three modules', () => {
  assert.deepEqual(S.ROBOTS.map((r) => r.id), IDS);
  for (const r of S.ROBOTS) {
    assert.ok(r.modules.length >= 2 && r.modules.length <= 3, r.id);
    assert.ok(r.fact.length > 0 && !/[!！]/.test(r.fact), r.id);
  }
});
test('every config file is in the robot-configs table', () => {
  for (const r of S.ROBOTS) assert.ok(configsMd.includes('`' + r.file + '`'), r.file);
});
test('every module name is in the module index', () => {
  for (const r of S.ROBOTS) for (const m of r.modules) {
    const base = m.replace(/（.*）$/, '');
    assert.ok(modulesMd.includes('`' + base + '`'), `${r.id}: ${base}`);
  }
});
test('the card links to the robot-configs route', () => {
  assert.match(configsMd, new RegExp('^slug: ' + S.DOCS_ROUTE + '$', 'm'));
});

// ---------------------------------------------------------------- C. idle loop
test('poses are finite and deterministic over two cycles', () => {
  for (const id of IDS) for (let t = 0; t < 40; t += 0.05) {
    const a = S.poseAt(id, t), b = S.poseAt(id, t);
    assert.ok(finite(a.fric) && finite(a.disc));
    for (const k in a.pose) { assert.ok(finite(a.pose[k]), `${id} ${k} @${t}`); assert.equal(a.pose[k], b.pose[k]); }
  }
});
test('every robot has the numbers its drawing reads', () => {
  const need = {
    dart: ['yaw', 'pitch', 'd0x', 'd0z', 'd0a', 'd1z', 'd1a', 'push', 'fricAng', 'strip', 'armor'],
    hero: ['yaw', 'pitch', 'miniPitch', 'scopeOpen', 'fire', 'strip', 'armor'],
    infantry: ['yaw', 'pitch', 'spin', 'spinAmt', 'wheel', 'fire', 'strip', 'armor'],
    sentry: ['yaw', 'pitch', 'steer', 'slide', 'w', 'fire', 'strip', 'armor'],
    aerial: ['yaw', 'pitch', 'lift', 'tilt', 'blade', 'prop0', 'prop1', 'prop2', 'prop3', 'fire', 'strip', 'armor'],
  };
  for (const id of IDS) for (const t of [0, 3, 9, 17.5]) for (const k of need[id]) assert.ok(finite(S.poseAt(id, t).pose[k]), `${id}.${k} @${t}`);
});
test('the cycle repeats every 20 s (after the aerial robot has taken off)', () => {
  const keys = { hero: ['yaw', 'pitch', 'miniPitch', 'scopeOpen'], infantry: ['yaw', 'pitch'], dart: ['yaw', 'pitch', 'd0x', 'd1z', 'push'], sentry: ['steer', 'slide'], aerial: ['yaw', 'pitch', 'lift'] };
  for (const [id, ks] of Object.entries(keys)) for (let t = 4; t < 24; t += 0.37) {
    const a = S.poseAt(id, t).pose, b = S.poseAt(id, t + S.PERIOD).pose;
    for (const k of ks) assert.ok(Math.abs(a[k] - b[k]) < (k === 'lift' ? 1.5 : 1e-9), `${id} ${k} @${t}`);
  }
});
test('big moments never overlap, and every shot falls inside one', () => {
  const ev = S.EVENTS.slice().sort((a, b) => a[2] - b[2]);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i][2] >= ev[i - 1][3] - 1e-9, `${ev[i - 1][1]} / ${ev[i][1]}`);
  for (const id of IDS) for (let t = 0; t < 40; t += 0.02) for (const sh of S.poseAt(id, t).shots) {
    const u = ((sh.t0 % S.PERIOD) + S.PERIOD) % S.PERIOD;
    assert.ok(S.EVENTS.some(([r, , a, b]) => r === id && u >= a - 1e-6 && u <= b), `${id} shot @${u}`);
    assert.ok(sh.age >= 0 && sh.age < S.SHOT_LIFE);
  }
});
test('shots are reported once per bullet, for as long as they fly', () => {
  assert.equal(S.poseAt('hero', 7.7).shots.length, 0);
  const a = S.poseAt('hero', 7.9).shots;
  assert.equal(a.length, 1);
  assert.ok(Math.abs(a[0].age - 0.1) < 1e-9 && a[0].big);
  assert.equal(S.poseAt('hero', 8.4).shots.length, 0);
  assert.equal(S.poseAt('infantry', 4.6).shots.length, 3);
  assert.equal(S.poseAt('hero', 7.9 + S.PERIOD).shots.length, 1); // second cycle
});
test('the infantry spins two turns in 2.4 s while the gimbal keeps its heading', () => {
  const at = (t) => S.poseAt('infantry', t).pose;
  assert.equal(at(4.9).spin, 0);
  assert.ok(Math.abs(at(7.5).spin - 4 * Math.PI) < 1e-9);
  assert.ok(at(6.2).spinAmt > 0.99 && at(4.8).spinAmt === 0 && at(7.6).spinAmt === 0);
  for (let t = 5.5; t <= 6.9; t += 0.2) assert.ok(Math.abs(at(t).yaw - at(5.5).yaw) < 1e-9, `@${t}`);
  for (let t = 5.1; t <= 7.3; t += 0.2) assert.ok(at(t).wheel < at(t - 0.1).wheel, `wheels turn with the spin @${t}`);
});
test('the sentry crab walk: wheels turn 90 deg, slide out and back, wheels turn back', () => {
  const at = (t) => S.poseAt('sentry', t).pose;
  assert.equal(at(9).steer, 0);
  assert.ok(Math.abs(at(11.5).steer - Math.PI / 2) < 1e-9);
  assert.equal(at(13).steer, 0);
  assert.ok(at(11.75).slide > 25 && at(10.8).slide === 0 && at(12.3).slide < 1e-9);
  assert.ok(Math.abs(at(11.75).w * 19 - at(11.75).slide) < 1e-9); // wheels roll exactly as far as the robot slides
});
test('the sentry lidar turns all the time', () => {
  for (let t = 0; t < 14; t += 0.3) assert.ok(S.poseAt('sentry', t + 0.05).pose.radar - S.poseAt('sentry', t).pose.radar > 0.2, `@${t}`);
});
test('the dart: load, spin up, launch, reload (played 1.25x faster than the step table)', () => {
  const at = (t) => S.poseAt('dart', t);
  assert.ok(at(0.2).pose.d0z > 8 && at(1.4).pose.d0z < 0.01);
  assert.ok(Math.abs(at(2.6).pose.d0x - 40) < 1e-6 && at(2.6).fric > 0.5);
  assert.ok(at(3.4).pose.d0x > 60 && at(3.5).pose.d0x > at(3.4).pose.d0x);
  assert.equal(at(3.7).pose.d0a, 0);
  assert.ok(at(2.6).pose.push > 39 && at(6).pose.push === 0);
  assert.ok(at(6.5).pose.d0a === 1 && at(6.5).pose.d1a === 1);
});
test('the aerial robot takes off, then hovers; blades blur above half speed', () => {
  const at = (t) => S.poseAt('aerial', t);
  assert.equal(at(0.5).pose.lift, 0);
  assert.ok(at(5).pose.lift > 44 && at(5).disc > 0.9 && at(5).pose.blade < 0.01);
  assert.ok(at(0.2).pose.blade > 0.99 && at(0.2).disc === 0);
});
test('the still frame does not depend on time and shows the aerial robot hovering', () => {
  for (const id of IDS) {
    const a = S.poseAt(id, 0, true), b = S.poseAt(id, 13.7, true);
    assert.deepEqual(a.pose, b.pose, id);
    assert.equal(a.shots.length, 0, id);
  }
  const ae = S.poseAt('aerial', 0, true);
  assert.ok(ae.pose.lift > 44 && ae.disc > 0.9);
  assert.ok(S.poseAt('hero', 0, true).pose.scopeOpen > 1.4, 'MiniGimbal flap is open in the still frame');
});
test('light bars boot in sequence, then stay on', () => {
  const on = (id, t) => S.poseAt(id, t).pose.armor;
  assert.equal(on('hero', 0.05), 0);
  assert.equal(on('hero', 1), 1);
  for (const id of IDS) assert.equal(on(id, 2), 1);
});

// ---------------------------------------------------------------- D. layout
test('layout: wide above 640 px, strip below; every robot stands inside the viewBox', () => {
  for (const w of [320, 375, 414, 639, 640, 768, 996, 1100]) {
    const L = S.layout(w);
    assert.equal(L.mode, w < 640 ? 'strip' : 'wide', String(w));
    if (L.mode === 'wide') { assert.equal(L.w, w); assert.ok(Math.abs(L.h - (L.H * w) / L.W) <= 1); assert.equal(L.k, w / L.W); }
    assert.equal(L.w, Math.round(L.W * L.k));
    assert.deepEqual(L.order.slice().sort(), IDS.slice().sort());
    for (const id of IDS) {
      const p = L.place[id];
      assert.ok(p.x > 60 && p.x < L.W - 60 && p.y > L.y0 + 150 && p.y < L.y0 + L.H, `${w} ${id}`);
      assert.ok(p.s > 0.8 && p.s < 1.3);
    }
  }
});
test('layout: robots keep their order left to right; the strip gives each one a cell', () => {
  for (const w of [375, 1100]) {
    const L = S.layout(w);
    const xs = IDS.map((id) => L.place[id].x);
    assert.deepEqual(xs.slice().sort((a, b) => a - b), xs, String(w));
  }
  const L = S.layout(375);
  assert.ok(L.w > 3 * 375, 'the strip is wider than the screen and scrolls');
  for (let i = 1; i < IDS.length; i++) assert.ok(L.place[IDS[i]].x - L.place[IDS[i - 1]].x >= 280);
});
test('layout: the aerial robot stands behind the sentry in the wide view', () => {
  const L = S.layout(1100);
  assert.ok(L.order.indexOf('aerial') < L.order.indexOf('sentry'));
});

// ---------------------------------------------------------------- E. something is always moving
test('every robot keeps moving a little: the small motion never stops', () => {
  const span = (id, t, key) => { let lo = 1e9, hi = -1e9; for (let d = 0; d <= 0.8; d += 0.05) { const v = S.poseAt(id, t + d).pose[key]; lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; };
  for (const id of ['dart', 'hero', 'infantry', 'sentry', 'aerial']) for (let t = 4; t < 18; t += 0.1) {
    const deg = (k) => span(id, t, k) / (Math.PI / 180);
    const moving = deg('yaw') + deg('pitch') > 0.25 || span(id, t, 'strip') > 0.03 || (id === 'infantry' && span(id, t, 'spin') > 0.1);
    assert.ok(moving, `${id} @${t.toFixed(1)}: yaw ${deg('yaw').toFixed(2)} pitch ${deg('pitch').toFixed(2)} strip ${span(id, t, 'strip').toFixed(3)}`);
  }
});
test('at any moment at least two robots visibly move (lidar and propellers never stop; one big moment at a time)', () => {
  const bigAt = (t) => { const u = ((t % S.PERIOD) + S.PERIOD) % S.PERIOD; return S.EVENTS.filter(([, , a, b]) => u >= a && u <= b).length; };
  for (let t = 4; t < 18; t += 0.05) {
    assert.ok(S.poseAt('sentry', t + 0.05).pose.radar > S.poseAt('sentry', t).pose.radar, 'lidar');
    assert.ok(Math.abs(S.poseAt('aerial', t + 0.01).pose.prop0 - S.poseAt('aerial', t).pose.prop0) > 0.1, 'propeller');
    assert.ok(bigAt(t) <= 1, `big moments overlap @${t}`);
  }
  let covered = 0, n = 0; for (let t = 0; t < S.PERIOD; t += 0.05) { n++; if (bigAt(t) === 1) covered++; }
  assert.ok(covered / n > 0.8, `a big moment is on screen ${(100 * covered / n).toFixed(0)}% of the time`);
});
