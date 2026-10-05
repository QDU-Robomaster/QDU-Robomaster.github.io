/**
 * ShowcaseSection: one section of the home page. PathLabel, title, two or three sentences and the
 * related documents next to (left / right) or above (stack) a Showcase widget; optional children
 * follow underneath. Collapses to one column at ≤996 px.
 *
 * ShowcasePanel: the same structure one level down (h3), for a section with several widgets.
 *
 * Text props understand two pieces of inline markup: `code` and [label](/route).
 */
import React from 'react';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import { PathLabel } from '@site/src/components/xr';
import Showcase, { type ShowcaseHeight, type ShowcaseName } from './Showcase';
import styles from './showcase.module.css';

const INLINE = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Renders `code` and [label](href) inside a plain string. */
export function inline(text: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <Link key={i} className="xr-link" to={link[2]}>
          {link[1]}
        </Link>
      );
    }
    return part;
  });
}

export type DocLink = { href: string; label: string };

export type ShowcaseWidget = { name: ShowcaseName; height: ShowcaseHeight; label?: string };

export function DocLinks({ docs, title, inlineList = false }: { docs: DocLink[]; title: string; inlineList?: boolean }): JSX.Element {
  return (
    <nav className={styles.docs} aria-label={`相关文档：${title}`}>
      <span className={`xr-path ${styles.docsLabel}`}>相关文档</span>
      <ul className={[styles.docsList, inlineList && styles.docsInline].filter(Boolean).join(' ')}>
        {docs.map((doc) => (
          <li key={doc.href}>
            <Link className="xr-link" to={doc.href}>
              {doc.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type CopyProps = {
  path?: string;
  title: string;
  body: string[];
  docs?: DocLink[];
  headingId: string;
  level: 2 | 3;
  inlineDocs: boolean;
};

function Copy({ path, title, body, docs, headingId, level, inlineDocs }: CopyProps): JSX.Element {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <>
      {path ? <PathLabel path={path} /> : null}
      <H id={headingId} className={level === 2 ? styles.title : styles.panelTitle}>
        {title}
      </H>
      <div className={styles.body}>
        {body.map((paragraph, i) => (
          <p key={i}>{inline(paragraph)}</p>
        ))}
      </div>
      {docs && docs.length ? <DocLinks docs={docs} title={title} inlineList={inlineDocs} /> : null}
    </>
  );
}

/** Stacked header: copy on the left, the document list beside it on wide screens. */
function StackHead({ path, title, body, docs, headingId }: Omit<CopyProps, 'level' | 'inlineDocs'>): JSX.Element {
  return (
    <div className={styles.stackHead}>
      <div className={styles.stackMain}>
        <Copy path={path} title={title} body={body} headingId={headingId} level={2} inlineDocs={false} />
      </div>
      {docs && docs.length ? (
        <div className={styles.stackDocs}>
          <DocLinks docs={docs} title={title} />
        </div>
      ) : null}
    </div>
  );
}

export type ShowcaseSectionProps = {
  id: string;
  /** PathLabel above the title, e.g. "算法组 / 自瞄链路". */
  path: string;
  title: string;
  /** Paragraphs; `code` and [label](/route) are rendered. */
  body: string[];
  docs?: DocLink[];
  /** Copy beside the widget (left / right) or above it (stack). Without a widget the copy spans the page. */
  layout?: 'left' | 'right' | 'stack';
  widget?: ShowcaseWidget;
  children?: React.ReactNode;
  className?: string;
};

export default function ShowcaseSection({
  id,
  path,
  title,
  body,
  docs,
  layout = 'left',
  widget,
  children,
  className,
}: ShowcaseSectionProps): JSX.Element {
  const headingId = `${id}-title`;
  const stacked = layout === 'stack' || !widget;
  // Register the section id so links such as <Link to="#route"> pass the broken-anchor check.
  useBrokenLinks().collectAnchor(id);
  return (
    <section id={id} className={[styles.section, className].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <div className={styles.container}>
        {stacked ? (
          <>
            <StackHead path={path} title={title} body={body} docs={docs} headingId={headingId} />
            {widget ? (
              <div className={styles.stackStage}>
                <Showcase name={widget.name} height={widget.height} label={widget.label ?? title} />
              </div>
            ) : null}
          </>
        ) : (
          <div className={[styles.split, layout === 'right' && styles.right].filter(Boolean).join(' ')}>
            <div className={styles.copy}>
              <Copy path={path} title={title} body={body} docs={docs} headingId={headingId} level={2} inlineDocs={false} />
            </div>
            <div className={styles.stageColumn}>
              <Showcase name={widget!.name} height={widget!.height} label={widget!.label ?? title} />
            </div>
          </div>
        )}
        {children ? <div className={styles.after}>{children}</div> : null}
      </div>
    </section>
  );
}

export type ShowcasePanelProps = {
  id: string;
  path?: string;
  title: string;
  body: string[];
  docs?: DocLink[];
  layout?: 'left' | 'right' | 'stack';
  widget: ShowcaseWidget;
};

export function ShowcasePanel({ id, path, title, body, docs, layout = 'stack', widget }: ShowcasePanelProps): JSX.Element {
  const headingId = `${id}-title`;
  useBrokenLinks().collectAnchor(id);
  return (
    <article id={id} className={styles.panel} aria-labelledby={headingId}>
      <div className={[styles.split, layout === 'right' && styles.right, layout === 'stack' && styles.stack].filter(Boolean).join(' ')}>
        <div className={styles.copy}>
          <Copy path={path} title={title} body={body} docs={docs} headingId={headingId} level={3} inlineDocs={layout === 'stack'} />
        </div>
        <div className={styles.stageColumn}>
          <Showcase name={widget.name} height={widget.height} label={widget.label ?? title} />
        </div>
      </div>
    </article>
  );
}
