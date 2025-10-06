import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';
import { motion } from 'framer-motion';
import commitInfo from '../data/commitInfo.json';
import './Home.css';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={translate({ message: '首页', id: 'homepage.title' })}
      description={translate({
        message: 'XRobot 项目的文档首页',
        id: 'homepage.description',
      })}
    >
      <main>
        <div className="animated-background" />
        <section className="hero hero--primary">
          <div className="container">

            <motion.img
              src="/img/未来战队.png"
              alt="未来战队 Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 , x: '10rem' }}
              transition={{ duration: 1 }}
              style={{ width: '130px', marginBottom: '1rem' }}
            />
            <motion.img
              src="/img/XRobot.png"
              alt="XRobot Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 , y: '4rem',x: '10rem'}}
              transition={{ duration: 1 }}
              style={{ width: '440px', marginBottom: '1rem'}}
            />
            <motion.img
              src="/img/机甲大师.png"
              alt="机甲大师 Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 ,x: '11rem' }}
              transition={{ duration: 1 }}
              style={{ width: '120px', marginBottom: '1rem' }}
            />
            <motion.img
              src="/img/初音.png"
              alt="初音 Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 ,x: '45rem' , y: '16.8rem' }}
              transition={{ duration: 1 }}
              style={{ width: '300px', marginBottom: '1rem' }}
            />

            <motion.h1
              className="hero__title typewriter"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Translate id="homepage.heroTitle">欢迎来到 QDU-Robomaster(初音未来战队)</Translate>
            </motion.h1>

            <motion.p
              className="hero__subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <Translate id="homepage.heroSubtitle">
                面向Robomaster参赛队员的机器人开发平台
              </Translate>
            </motion.p>

            <motion.div
              className="buttons"
              style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Link
                className="button button--secondary button--lg"
                to="/intro"
              >
                <Translate id="homepage.getStarted">开始阅读</Translate>
              </Link>
              
              <Link
                className="button button--secondary button--lg"
                to="https://xrobot-org.github.io/libxr_web_demo/"
              >
                <Translate id="homepage.onlineDemo">在线演示</Translate>
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature1.title">文档支持</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature1.content">
                    通过模块化方式组织各类项目内容，从环境配置、入门到进阶应用，方便维护与查阅。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature2.title">完整生态</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature2.content">
                    开发环境支持Windows/Linux，提供Docker镜像来支持项目的模块化设计与自动化工作流。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature3.title">功能强大</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature3.content">
                    从对各种外设和不同RTOS的兼容，到坐标系旋转和运动学解算等多种算法组件，XRobot就像开发过程中的瑞士军刀。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature4.title">开源协作</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature4.content">
                    欢迎贡献者参与内容补充与修正，一起构建更好的XRobot。
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container margin-top--lg">
          <h2>
            <Translate id="homepage.versionTitle">当前文档对应仓库版本</Translate>
          </h2>
          <ul>
            XRobot: <code>{commitInfo.XRobot || 'N/A'}</code>{' '}
            libxr: <code>{commitInfo.LibXR || 'N/A'}</code>{' '}
            LibXR_CppCodeGenerator: <code>{commitInfo.CodeGen || 'N/A'}</code>
            bsp-dev-c: <code>{commitInfo['bsp-dev-c'] || 'N/A'}</code>{' '}
            bsp-dev-mc02: <code>{commitInfo['bsp-dev-mc02'] || 'N/A'}</code>{' '}
            AUTO-Aming-system: <code>{commitInfo['AUTO-Aming-system'] || 'N/A'}</code>{' '}
          </ul>
        </section>

        <section className="container margin-top--lg">
          <ul>
            <li>
              本文档仅包含使用和编码教程。 库函数 API 和命令行工具文档请参考{' '}
              <a
                href="https://xrobot-org.github.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://xrobot-org.github.io/
              </a>
              。
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}