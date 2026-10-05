/**
 * NewMemberRoute: the three onboarding paths on the home page, one document per step, with a
 * checkbox per step. Progress is kept in localStorage under STORAGE_KEY as an array of step ids.
 *
 * - SSR and the first client render show every step unchecked; saved progress is read in an
 *   effect, so the markup always matches during hydration.
 * - Every storage access is wrapped in try/catch (private windows, blocked site data). When the
 *   browser refuses, the checkboxes keep working for this visit and a line says so.
 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { PathLabel } from '@site/src/components/xr';
import type { RoutePath } from '@site/src/data/home';
import styles from './route.module.css';

const STORAGE_KEY = 'qdu-rm-home.route.v1';

function readSaved(): { ids: string[]; ok: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ids: [], ok: true };
    const parsed: unknown = JSON.parse(raw);
    return { ids: Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [], ok: true };
  } catch {
    return { ids: [], ok: false };
  }
}

function writeSaved(ids: string[]): boolean {
  try {
    if (ids.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export default function NewMemberRoute({ paths }: { paths: RoutePath[] }): JSX.Element {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    const saved = readSaved();
    setDone(new Set(saved.ids));
    setStorageOk(saved.ok);
    setLoaded(true);
  }, []);

  // Write after the saved progress has been read, so the first render never overwrites it.
  useEffect(() => {
    if (loaded) setStorageOk(writeSaved(Array.from(done)));
  }, [done, loaded]);

  const toggle = useCallback((id: string, checked: boolean) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => setDone(new Set()), []);

  const total = paths.reduce((n, p) => n + p.steps.length, 0);
  const checkedCount = paths.reduce((n, p) => n + p.steps.filter((s) => done.has(s.id)).length, 0);

  return (
    <div className={styles.route}>
      <div className={styles.paths}>
        {paths.map((p) => {
          const count = p.steps.filter((s) => done.has(s.id)).length;
          const headingId = `route-${p.id}-title`;
          return (
            <section key={p.id} className={styles.path} aria-labelledby={headingId}>
              <PathLabel path={p.path} />
              <h3 id={headingId} className={styles.pathTitle}>
                {p.title}
              </h3>
              <p className={styles.intro}>{p.intro}</p>
              <div className={styles.progress}>
                <span className={styles.count}>
                  {count}/{p.steps.length}
                </span>
                <span
                  className={styles.track}
                  role="progressbar"
                  aria-label={`${p.title}进度`}
                  aria-valuemin={0}
                  aria-valuemax={p.steps.length}
                  aria-valuenow={count}
                >
                  <span className={styles.fill} style={{ width: `${(100 * count) / p.steps.length}%` }} />
                </span>
              </div>
              <ol className={styles.steps}>
                {p.steps.map((step, i) => {
                  const inputId = `route-step-${step.id}`;
                  const checked = done.has(step.id);
                  return (
                    <li key={step.id} className={styles.step} data-done={checked || undefined}>
                      <label className={styles.hit} htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          className={styles.check}
                          checked={checked}
                          onChange={(e) => toggle(step.id, e.target.checked)}
                          aria-label={`读完：${step.title}`}
                        />
                      </label>
                      <span className={styles.index} aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={styles.text}>
                        <Link className={`xr-link ${styles.link}`} to={step.href}>
                          {step.title}
                        </Link>
                        <span className={styles.note}>{step.note}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
      <div className={styles.footer}>
        <span className={styles.total}>
          已读 {checkedCount}/{total}
        </span>
        <button type="button" className="xr-btn xr-btn-ghost" onClick={reset}>
          清空进度
        </button>
        {storageOk ? null : <span className={styles.warn}>当前浏览器不允许保存数据，勾选只在这次访问内有效。</span>}
      </div>
    </div>
  );
}
