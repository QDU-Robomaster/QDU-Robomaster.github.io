/**
 * QDU-Robomaster home page. Structure follows REQ.md section 2:
 * hero (RobotLineup) → robots → auto-aim (AutoAim) → simulation (SimVsReal) → environments and Git →
 * new-member route → framework, repositories and version baseline.
 * Copy and links live in src/data/home.ts; robot cards come from src/data/robots.ts (generated).
 */
import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { Button, Logo, PathLabel, Tag } from '@site/src/components/xr';
import { ArmorPlate, TeamMark } from '@site/src/components/team';
import Showcase from '@site/src/components/showcase/Showcase';
import MotionToggle from '@site/src/components/showcase/MotionToggle';
import ShowcaseSection, { DocLinks, ShowcasePanel, inline } from '@site/src/components/showcase/ShowcaseSection';
import NewMemberRoute from '@site/src/components/home/NewMemberRoute';
import { OMITTED_CONFIGS, ROBOTS, ROBOT_SOURCE_DOC, type Robot } from '@site/src/data/robots';
import commitInfo from '@site/src/data/commitInfo.json';
import {
  GITHUB_ORG,
  autoaimSection,
  hero,
  moreSection,
  robotsSection,
  routeSection,
  simSection,
  teamSection,
} from '@site/src/data/home';
import styles from './index.module.css';

function Hero(): JSX.Element {
  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.heroBrand}>
              <ArmorPlate size="l">
                <TeamMark height={44} />
              </ArmorPlate>
              <PathLabel path={hero.path} />
            </div>
            <h1 className={styles.display}>{hero.title}</h1>
            <p className={styles.lead}>
              <span className={styles.teamName}>{hero.teamName}</span>
              {hero.lead}
            </p>
            <p className={styles.heroBody}>{hero.body}</p>
            <div className={styles.actions}>
              <Button variant="primary" href="#route">
                新队员从这里开始
              </Button>
              <Button href="/system-architecture">整体架构</Button>
              <Button href={GITHUB_ORG}>GitHub</Button>
            </div>
          </div>
          <nav className={styles.quick} aria-label="常用页面">
            <span className="xr-path">常用页面</span>
            <ul className={styles.quickList}>
              {hero.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link className="xr-link" to={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="xr-path">本页</span>
            <ul className={styles.anchorList}>
              {hero.onThisPage.map((link) => (
                <li key={link.href}>
                  <a className="xr-link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className={styles.lineup}>
          <div className={styles.lineupBar}>
            <MotionToggle />
          </div>
          <Showcase name="RobotLineup" height={{ desktop: 480, mobile: 420 }} label="全兵种阵列：英雄、步兵、哨兵、空中、飞镖" />
        </div>
      </div>
    </header>
  );
}

function RobotCard({ robot }: { robot: Robot }): JSX.Element {
  const [first, ...others] = robot.files;
  return (
    <article className={`xr-card ${styles.robotCard}`} aria-labelledby={`robot-${robot.id}`}>
      <div className={styles.robotHead}>
        <ArmorPlate label={`${robot.name}装甲板`}>{robot.glyph}</ArmorPlate>
        <div className={styles.robotName}>
          <PathLabel path={['机器人 ID', robot.refereeId]} />
          <h3 id={`robot-${robot.id}`} className="xr-card-title">
            {robot.name}
          </h3>
        </div>
      </div>
      <dl className={styles.robotFacts}>
        <dt>配置</dt>
        <dd className={styles.robotFiles}>
          {robot.files.map((f) => (
            <code key={f.file}>{f.file}</code>
          ))}
        </dd>
        <dt>功能</dt>
        <dd>
          {robot.functions.join('、')}
          {others.map((f) => (
            <span key={f.file} className={styles.robotOther}>
              <code>{f.file}</code>：{f.summary}
            </span>
          ))}
        </dd>
        <dt>模块</dt>
        <dd className={styles.robotModules}>
          {robot.modules.map((m) => (
            <Tag key={m}>{m}</Tag>
          ))}
        </dd>
      </dl>
      <code className={styles.command} title={`生成 ${first.file} 的入口`}>
        {robot.command}
      </code>
      <ul className={styles.robotLinks}>
        {robot.docs.map((doc) => (
          <li key={doc.href}>
            <Link className="xr-link" to={doc.href}>
              {doc.label}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function omittedLine(): string | null {
  if (!OMITTED_CONFIGS.length) return null;
  const files = OMITTED_CONFIGS.map((c) => `\`${c.file}\``).join('、');
  const same = OMITTED_CONFIGS.every((c) => c.summary === OMITTED_CONFIGS[0].summary);
  return same
    ? `${files} 目前${OMITTED_CONFIGS[0].summary}，还没有整车模块，这里没有列出。`
    : `${files} 还没有整车模块，这里没有列出。`;
}

function Robots(): JSX.Element {
  const omitted = omittedLine();
  return (
    <ShowcaseSection
      id={robotsSection.id}
      path={robotsSection.path.join(' / ')}
      title={robotsSection.title}
      body={omitted ? [...robotsSection.body, omitted] : robotsSection.body}
      docs={robotsSection.docs}
      layout="stack"
    >
      <div className={styles.robotGrid}>
        {ROBOTS.map((robot) => (
          <RobotCard key={robot.id} robot={robot} />
        ))}
      </div>
      <p className={styles.caption}>
        {inline(`卡片由 \`scripts/gen-robots.js\` 按[机器人配置](${ROBOT_SOURCE_DOC})页的配置清单生成。`)}
      </p>
    </ShowcaseSection>
  );
}

function AutoAim(): JSX.Element {
  return (
    <ShowcaseSection
      id={autoaimSection.id}
      path={autoaimSection.path.join(' / ')}
      title={autoaimSection.title}
      body={autoaimSection.body}
      docs={autoaimSection.docs}
      layout="right"
      widget={{ name: 'AutoAim', height: { desktop: 560, mobile: 600 }, label: '自瞄：跟踪与瞄准' }}
    >
      <ShowcasePanel
        id="camera-sync"
        path="算法组 / 相机与同步"
        title="每张图都知道是哪一刻拍的"
        body={[
          '`CameraSync` 在 C 板的 IMU 回调里计时，到点拉高触发线，相机开始曝光，同时把这次采样的时间戳放进 SyncEvent 发给上位机。图像晚几毫秒才到，`CameraFrameSync` 按序号配上 SyncEvent，取曝光中点最近的一次 IMU 采样。',
          '拖曝光时间，看中点怎么挪；让相机丢一帧，看上位机怎么靠序号发现；切到 20 Hz，看 STOP、稳定、START 的握手。',
        ]}
        docs={[{ href: '/算法组/sync-and-config', label: '看文档' }]}
        layout="stack"
        widget={{ name: 'CameraSync', height: { desktop: 560, mobile: 900 }, label: '相机与 IMU 的硬同步' }}
      />
    </ShowcaseSection>
  );
}

function Team(): JSX.Element {
  return (
    <ShowcaseSection
      id={teamSection.id}
      path={teamSection.path.join(' / ')}
      title={teamSection.title}
      body={teamSection.body}
      docs={teamSection.docs}
      layout="stack"
    >
      <div className={styles.envGrid}>
        {teamSection.envs.map((env) => (
          <article key={env.repo} className={`xr-card ${styles.envCard}`}>
            <PathLabel path={env.label} />
            <h4 className="xr-card-title">
              <Link to={env.href}>{env.repo}</Link>
            </h4>
            <div className="xr-card-body">
              <p>{inline(env.body)}</p>
            </div>
            <div className={styles.envTags}>
              {env.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <ul className={styles.robotLinks}>
              <li>
                <Link className="xr-link" to={env.href}>
                  环境说明
                </Link>
              </li>
              <li>
                <a className="xr-link" href={`${GITHUB_ORG}/${env.repo}`}>
                  源码
                </a>
              </li>
            </ul>
          </article>
        ))}
      </div>
      <div className={styles.git}>
        <div className={styles.gitCopy}>
          <h3 className={styles.subTitle}>{teamSection.gitTitle}</h3>
          {teamSection.gitBody.map((p, i) => (
            <p key={i} className={styles.subBody}>
              {inline(p)}
            </p>
          ))}
          <DocLinks docs={[teamSection.gitDoc]} title={teamSection.gitTitle} inlineList />
        </div>
        <ul className={styles.branches} aria-label="分支命名">
          {teamSection.gitBranches.map((b) => (
            <li key={b}>
              <code>{b}</code>
            </li>
          ))}
        </ul>
      </div>
    </ShowcaseSection>
  );
}

function Route(): JSX.Element {
  return (
    <ShowcaseSection
      id={routeSection.id}
      path={routeSection.path.join(' / ')}
      title={routeSection.title}
      body={routeSection.body}
      layout="stack"
    >
      <NewMemberRoute paths={routeSection.paths} />
    </ShowcaseSection>
  );
}

function More(): JSX.Element {
  const info = commitInfo as Record<string, string>;
  return (
    <ShowcaseSection id={moreSection.id} path={moreSection.path.join(' / ')} title={moreSection.title} body={moreSection.body} layout="stack">
      <div className={styles.moreGrid}>
        <article className={`xr-card ${styles.moreCard}`}>
          <span className={styles.moreMark}>
            <Logo height={28} />
          </span>
          <h3 className="xr-card-title">
            <Link to={moreSection.xrobot.href}>{moreSection.xrobot.title}</Link>
          </h3>
          <div className="xr-card-body">
            <p>{moreSection.xrobot.body}</p>
          </div>
          <span className={styles.host}>{moreSection.xrobot.host}</span>
        </article>
        <article className={`xr-card ${styles.moreCard}`}>
          <span className={styles.moreMark}>
            <TeamMark height={28} />
          </span>
          <h3 className="xr-card-title">
            <Link to={moreSection.github.href}>{moreSection.github.title}</Link>
          </h3>
          <div className="xr-card-body">
            <p>{moreSection.github.body}</p>
          </div>
          <span className={styles.host}>{moreSection.github.host}</span>
        </article>
        <article className={`xr-card ${styles.moreCard} ${styles.versionCard}`}>
          <h3 className="xr-card-title">{moreSection.versionsTitle}</h3>
          <table className={styles.versions}>
            <thead>
              <tr>
                <th scope="col">仓库</th>
                <th scope="col">提交</th>
              </tr>
            </thead>
            <tbody>
              {moreSection.versions.map((v) => {
                const sha = info[v.key];
                const known = typeof sha === 'string' && /^[0-9a-f]{7,40}$/.test(sha);
                return (
                  <tr key={v.key}>
                    <td>
                      <a className="xr-link" href={`https://github.com/${v.repo}`}>
                        {v.label}
                      </a>
                    </td>
                    <td>
                      {known ? (
                        <a className={`xr-link ${styles.sha}`} href={`https://github.com/${v.repo}/commit/${sha}`}>
                          {sha}
                        </a>
                      ) : (
                        <span className={styles.sha}>未取到</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </div>
    </ShowcaseSection>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout description="初音未来战队基于 XRobot 完成了全兵种的功能实现。这里有电控、算法两组的上手路线、整车配置、自瞄链路和 Webots 仿真。">
      <main className={styles.page}>
        <Hero />
        <Robots />
        <AutoAim />
        <ShowcaseSection
          id={simSection.id}
          path={simSection.path.join(' / ')}
          title={simSection.title}
          body={simSection.body}
          docs={simSection.docs}
          layout="right"
          widget={{ name: 'SimVsReal', height: { desktop: 800, mobile: 900 }, label: 'Webots 与实车' }}
        />
        <Team />
        <Route />
        <More />
      </main>
    </Layout>
  );
}
