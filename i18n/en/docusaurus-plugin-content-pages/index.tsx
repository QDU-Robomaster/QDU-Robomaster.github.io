import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';
import { motion } from 'framer-motion';
import commitInfo from '../../../src/data/commitInfo.json';
import '../../../src/pages/Home.css';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={translate({ message: 'Home', id: 'homepage.title' })}
      description={translate({
        message: 'Documentation homepage for the XRobot project',
        id: 'homepage.description',
      })}
    >
      <main>
        <div className="animated-background" />
        <section className="hero hero--primary">
          <div className="container">
            <motion.img
              src="/img/XRobot.png"
              alt="XRobot Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              style={{ width: '240px', marginBottom: '1rem' }}
            />

            <motion.h1
              className="hero__title typewriter"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Translate id="homepage.heroTitle">Welcome to XRobot</Translate>
            </motion.h1>

            <motion.p
              className="hero__subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <Translate id="homepage.heroSubtitle">
                A documentation and tutorial platform for robotics/embedded developers.
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
                to="/docs/intro"
              >
                <Translate id="homepage.getStarted">Get Started</Translate>
              </Link>

              <Link
                className="button button--secondary button--lg"
                to="https://xrobot-org.github.io/libxr_web_demo/index_en.html"
              >
                <Translate id="homepage.onlineDemo">Online Demo</Translate>
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature1.title">Documentation Support</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature1.content">
                    Organize all kinds of project content in a modular way—from environment setup to advanced usage—making it easy to maintain and browse.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature2.title">Complete Ecosystem</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature2.content">
                    Development environments support both Windows and Linux, with Docker images to enable modular design and automation.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature3.title">Powerful Features</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature3.content">
                    From supporting various peripherals and RTOSes to coordinate transformations and kinematic solvers, XRobot is your Swiss army knife for development.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature4.title">Open Source Collaboration</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature4.content">
                    Contributors are welcome to help expand and improve content—let’s build a better XRobot together.
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container margin-top--lg">
          <h2>
            <Translate id="homepage.versionTitle">Current Repository Versions</Translate>
          </h2>
          <ul>
            XRobot: <code>{commitInfo.XRobot || 'N/A'}</code>{' '}
            libxr: <code>{commitInfo.LibXR || 'N/A'}</code>{' '}
            LibXR_CppCodeGenerator: <code>{commitInfo.CodeGen || 'N/A'}</code>
          </ul>
        </section>

        <section className="container margin-top--lg">
          <ul>
            This documentation only includes usage guides and coding tutorials.
            For API references and CLI tools, please see the Documents section in the footer.
          </ul>
        </section>
      </main>
    </Layout>
  );
}
