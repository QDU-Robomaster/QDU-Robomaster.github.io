// Tests for the widget's view model (show.ts): time flow, the three interactions, the film strip, the readout, reduced motion.
// run: node --test "src/components/showcase/CameraSync/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { Show, filmItems, readout, rollWidth, normalRatio, busyRatio, E_MIN, E_MAX, PRE, POST, AUTO_E } from './show.ts';
import * as S from './sim.ts';

const run = (show, sec, fps = 60) => { for (let i = 0; i < Math.round(sec * fps); i++) show.tick(1 / fps); };
const runUntil = (show, pred, maxSec) => { for (let t = 0; t < maxSec * 60; t++) { if (pred()) return t / 60; show.tick(1 / 60); } return pred() ? maxSec : Infinity; };

test('mounts in RUNNING with a full film strip and nothing in the future', () => {
  const s = new Show();
  assert.equal(s.B.host.st, 'RUNNING'); assert.equal(s.rate, 10000); assert.equal(s.mode, 'roll');
  const film = filmItems(s.B, s.tau, 9); assert.ok(film.length >= 8, 'enough frames for the widest strip');
  for (const c of film) assert.ok(!c.gap);
  for (let i = 1; i < film.length; i++) assert.equal(film[i].k, film[i - 1].k + 1, 'consecutive frame numbers');
  assert.ok(s.latestPair().tPair <= s.tau);
  const r = readout(s); assert.equal(r.kind, 'pair'); assert.match(r.head, /^帧 \d+ 配 IMU #\d+$/);
});

test('view time follows the slow-motion ratio: one 100 Hz frame about every 1.8 s', () => {
  const s = new Show(); const k0 = s.latestPair().k, tau0 = s.tau;
  run(s, 1.8); const dTau = s.tau - tau0;
  assert.ok(Math.abs(dTau - 1.8 * 1e6 * normalRatio(10000)) < 600, 'tau advanced by 1.8 s * ratio: ' + dTau);
  run(s, 5.4);
  const k1 = s.latestPair().k; assert.ok(k1 - k0 >= 3 && k1 - k0 <= 4, 'about 3 frames in 7.2 s, got ' + (k1 - k0));
  const w = s.window(); assert.ok(Math.abs((w[1] - w[0]) - rollWidth(10000)) < 1);
  assert.ok(Math.abs(w[0] + 0.86 * (w[1] - w[0]) - s.tau) < 1, '"now" sits at 86 % of the window');
});

test('E slider: tune mode holds time, previews the held frame, new frames use the new E', () => {
  const s = new Show(); run(s, 2);
  const held = s.latestPair(), tau0 = s.tau;
  s.setE(8000);
  assert.equal(s.mode, 'tune'); assert.equal(s.B.cam.E, 8000); assert.equal(s.tune.ts, held.ts);
  run(s, 0.5); assert.equal(s.tau, tau0, 'time held while the slider is down');
  const q = s.tunePreview();
  assert.equal(q.E, 8000); assert.equal(q.tMid, held.ts + S.DELAY + 4000);
  assert.equal(q.n, S.previewPair(held.ts, 8000).n); assert.ok(Math.abs(q.d) <= S.TOL);
  assert.equal(q.tImg, held.ts + S.DELAY + 8000 + S.READ);
  const n8 = q.n; s.setE(2000); assert.equal(s.tunePreview().n, S.previewPair(held.ts, 2000).n); assert.ok(n8 - s.tunePreview().n >= 2, 'a shorter E pairs an earlier sample');
  assert.match(readout(s).head, /^E 2\.0 ms$/);
  s.releaseE(); run(s, 0.5); assert.equal(s.mode, 'tune', 'preview stays a moment after release'); run(s, 0.6); assert.equal(s.mode, 'roll');
  const t = runUntil(s, () => s.B.pairs.length && s.B.pairs[s.B.pairs.length - 1].E === 2000, 6); assert.ok(t < 6, 'a frame exposed with the new E gets paired');
  const p = s.B.pairs[s.B.pairs.length - 1]; assert.equal(p.tMid, p.ts + S.DELAY + 1000);
});

test('a slider that never reports pointer-up cannot freeze time for good', () => {
  const s = new Show(); run(s, 1); s.setE(6000); const tau0 = s.tau;
  run(s, 4); assert.equal(s.mode, 'tune'); assert.equal(s.tau, tau0);
  run(s, 3); assert.equal(s.mode, 'roll'); run(s, 1); assert.ok(s.tau > tau0);
});

test('idle demo: E steps through 5 / 2 / 8 ms every few frames until the first interaction, then stays put', () => {
  const s = new Show(); assert.ok(s.auto); const seen = new Set();
  for (let i = 0; i < 60 * 40; i++) { s.tick(1 / 60); seen.add(s.E); }
  assert.deepEqual([...seen].sort((a, b) => a - b), [...AUTO_E].sort((a, b) => a - b));
  const Es = new Set(s.B.pairs.slice(-12).map(p => p.E)); assert.ok(Es.size >= 2, 'the paired frames really were exposed differently');
  for (const p of s.B.pairs.slice(-12)) assert.ok(AUTO_E.includes(p.E));
  s.setE(3300); assert.equal(s.auto, false); run(s, 40); assert.equal(s.E, 3300); assert.equal(s.B.pairs.at(-1).E, 3300);
  for (const act of [s2 => s2.dropNext(), s2 => s2.setRate(50000)]) { const t = new Show(); act(t); assert.equal(t.auto, false); }
  assert.equal(new Show({ reduced: true }).auto, false);
});

test('E slider clamps and snaps to 0.1 ms', () => {
  const s = new Show(); s.setE(50); assert.equal(s.E, E_MIN); s.setE(99999); assert.equal(s.E, E_MAX); s.setE(5049); assert.equal(s.E, 5000); s.setE(5051); assert.equal(s.E, 5100);
});

test('lost frame: armed for the next edge, hurried, recognised by sequence, film gets an empty cell', () => {
  const s = new Show(); run(s, 1);
  s.dropNext(); assert.equal(s.B.cam.dropNext, 1); assert.ok(s.busy);
  const t = runUntil(s, () => s.notice !== null, 5); assert.ok(t <= 3, 'recognised within 3 s of wall time, took ' + t);
  assert.equal(s.B.drops, 1);
  const n = s.notice; assert.equal(n.ks.length, 1); assert.equal(n.by, n.ks[0] + 1); assert.equal(n.stride, 2);
  const film = filmItems(s.B, s.tau, 9); const gap = film.filter(c => c.gap); assert.equal(gap.length, 1); assert.equal(gap[0].k, n.ks[0]);
  const gi = film.indexOf(gap[0]); assert.equal(film[gi + 1].k, n.by, 'the gap sits right before the frame that revealed it'); assert.equal(film[gi - 1].k, n.ks[0] - 1);
  const r = readout(s); assert.equal(r.kind, 'gap'); assert.match(r.head, new RegExp('帧 ' + n.ks[0] + ' 缺图')); assert.match(r.body, /trigger_sequence/);
  run(s, 8); assert.equal(s.notice, null, 'the notice fades');
  assert.ok(!s.busy);
});

test('lost frame twice in a row: both holes show', () => {
  const s = new Show(); run(s, 1); s.dropNext(); s.dropNext();
  assert.equal(s.B.cam.dropNext, 2);
  runUntil(s, () => s.notice !== null, 6);
  const film = filmItems(s.B, s.tau, 12); assert.equal(film.filter(c => c.gap).length, 2);
  assert.equal(s.notice.stride, 3); assert.equal(s.notice.ks.length, 2);
});

test('100 Hz -> 20 Hz: STOP, settle, START, first frame one period later, then 50 samples between edges', () => {
  const s = new Show(); run(s, 1);
  s.setRate(50000); assert.equal(s.B.host.st, 'WAIT_STOP_ACK');
  const seen = new Set(); const t = runUntil(s, () => { seen.add(s.B.host.st); return s.B.host.st === 'RUNNING' && s.B.host.matched; }, 8);
  assert.ok(t < 5, 'first 20 Hz frame paired within 5 s of wall time, took ' + t);
  assert.ok(seen.has('SETTLING') && seen.has('WAIT_START_ACK'));
  assert.equal(s.B.host.period, 50000); assert.equal(s.hz, 20);
  run(s, 8);
  const xs = s.B.exps.filter(x => x.seq === s.B.host.startSeq); assert.ok(xs.length >= 2);
  for (let i = 1; i < xs.length; i++) assert.equal(xs[i].n - xs[i - 1].n, 50);
  assert.equal(xs[0].k, 1, 'k restarts at 1');
  assert.ok(Math.abs(s.wRoll - rollWidth(50000)) < 2000, 'the window zooms out with the rate');
  s.setRate(10000); runUntil(s, () => s.B.host.period === 10000 && s.B.host.matched, 8); assert.equal(s.hz, 100);
});

test('readout walks through the handshake', () => {
  const s = new Show(); s.setRate(50000);
  const heads = []; for (let i = 0; i < 600; i++) { s.tick(1 / 60); const r = readout(s); if (heads[heads.length - 1] !== r.head && r.kind === 'sync') heads.push(r.head); if (s.B.host.matched && s.B.host.st === 'RUNNING' && i > 60) break; }
  assert.ok(heads[0].startsWith('发 STOP')); assert.ok(heads.some(h => h.startsWith('稳定 10 ms'))); assert.ok(heads.some(h => h.startsWith('发 START，周期 50 ms')));
});

test('busy ratio lets a click finish in about two seconds', () => {
  for (const P of [10000, 50000]) { assert.ok(busyRatio(P) > normalRatio(P)); assert.ok((P + 45000) / (busyRatio(P) * 1e6) <= 2.5 + 1e-9); }
});

test('reduced motion: a held frame, interactions jump and stay still', () => {
  const s = new Show({ reduced: true });
  assert.equal(s.mode, 'hold'); const f = s.focus; assert.ok(f && f.tPair <= s.tau);
  const w = s.window(); assert.deepEqual(w, [f.ts - PRE, f.ts + POST]);
  const tau0 = s.tau; run(s, 3); assert.equal(s.tau, tau0, 'nothing moves');
  assert.equal(readout(s).kind, 'pair'); assert.equal(filmItems(s.B, s.tau, 9).at(-1).k, f.k, 'the film ends with the held frame');
  s.setE(8200); assert.equal(s.mode, 'tune'); assert.deepEqual(s.window(), [f.ts - PRE, f.ts + POST]);
  s.releaseE(); assert.equal(s.mode, 'hold'); assert.equal(s.focus.E, 8200, 'the new held frame was exposed with the new E'); assert.notEqual(s.focus.k, f.k);
  s.dropNext(); assert.equal(s.mode, 'hold'); assert.ok(s.notice && s.notice.until === Infinity); assert.equal(s.focus.k, s.notice.by);
  const w2 = s.window(); assert.ok(w2[0] <= s.focus.ts - s.focus.period - PRE + 1, 'the window starts before the lost frame');
  const film = filmItems(s.B, s.tau, 9); assert.ok(film.at(-2).gap && film.at(-1).k === s.focus.k);
  s.setRate(50000); assert.equal(s.mode, 'hold'); assert.equal(s.focus.period, 50000); assert.equal(s.notice, null);
  s.setRate(10000); assert.equal(s.focus.period, 10000);
});

test('switching reduced motion off resumes rolling at the bench time', () => {
  const s = new Show({ reduced: true }); s.setReduced(false);
  assert.equal(s.mode, 'roll'); assert.equal(s.tau, s.B.now); const tau0 = s.tau; run(s, 1); assert.ok(s.tau > tau0);
  s.setReduced(true); assert.equal(s.mode, 'hold');
});

test('long run stays bounded and keeps pairing', () => {
  const s = new Show(); run(s, 400, 30);
  assert.ok(s.B.exps.length <= 3100 && s.B.pairs.length <= 3100);
  assert.ok(s.B.drops === 0 && s.B.host.st === 'RUNNING');
  assert.ok(s.latestPair().tPair <= s.tau);
});
