// QDU-Robomaster 战队文档站。只有中文；视觉按 XRobot Style（src/css/xrstyle-tokens.css）。
module.exports = {
  title: 'QDU-Robomaster 战队文档',
  tagline: '指导新队员学习，并为其他队伍提供参考',
  url: 'https://QDU-Robomaster.github.io',
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onDuplicateRoutes: 'warn',
  favicon: 'img/qdu-mark.svg',

  organizationName: 'QDU-Robomaster',
  projectName: 'QDU-Robomaster.github.io',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'zh',
    locales: ['zh'],
    localeConfigs: {
      zh: { label: '简体中文', htmlLang: 'zh-CN' },
    },
  },

  plugins: [
    [
      require.resolve('@cmfcmf/docusaurus-search-local'),
      /** @type {import('@cmfcmf/docusaurus-search-local').PluginOptions} */
      ({
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        // 正文是中文，夹着大量英文模块名。只写 'zh' 时插件走 lunr-languages 的 nodejieba 接口，
        // 与这里装的 @node-rs/jieba 不兼容，构建会失败；两种语言一起写走插件自带的分词。
        language: ['zh', 'en'],
      }),
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/QDU-Robomaster/QDU-Robomaster.github.io/edit/master/',
        },
        blog: false,
        theme: {
          customCss: [
            require.resolve('./src/css/xrstyle-tokens.css'),
            require.resolve('./src/css/team-tokens.css'),
            require.resolve('./src/css/xrstyle-components.css'),
            require.resolve('./src/css/custom.css'),
          ],
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'QDU-Robomaster',
      logo: {
        alt: '未来战队',
        src: 'img/qdu-mark.svg',
        srcDark: 'img/qdu-mark-paper.svg',
        width: 32,
        height: 28,
      },
      items: [
        { to: '/intro', label: '文档', position: 'left', activeBaseRegex: '^/(intro|design-philosophy|coordinate-system-standard|git-collaboration)$' },
        { to: '/system-architecture', label: '整体架构', position: 'left' },
        { to: '/电控组', label: '电控组', position: 'left', activeBasePath: '/电控组' },
        { to: '/算法组', label: '算法组', position: 'left', activeBasePath: '/算法组' },
        { to: '/dev-environment', label: '开发环境', position: 'left', activeBasePath: '/dev-environment' },
        {
          href: 'https://github.com/QDU-Robomaster',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'light',
      links: [
        {
          title: '文档',
          items: [
            { label: '欢迎', to: '/intro' },
            { label: '整体架构', to: '/system-architecture' },
            { label: '电控组', to: '/电控组' },
            { label: '算法组', to: '/算法组' },
            { label: '开发环境', to: '/dev-environment' },
          ],
        },
        {
          title: '仓库',
          items: [
            { label: 'GitHub 组织', href: 'https://github.com/QDU-Robomaster' },
            { label: 'bsp-dev-c', href: 'https://github.com/QDU-Robomaster/bsp-dev-c' },
            { label: 'bsp-linux-autoaim', href: 'https://github.com/QDU-Robomaster/bsp-linux-autoaim' },
            { label: 'bsp-webots-autoaim', href: 'https://github.com/QDU-Robomaster/bsp-webots-autoaim' },
          ],
        },
        {
          title: '框架',
          items: [
            { label: 'XRobot 文档', href: 'https://xrobot-org.github.io/' },
            { label: 'XRobot', href: 'https://github.com/xrobot-org/XRobot' },
            { label: 'LibXR', href: 'https://github.com/xrobot-org/libxr' },
          ],
        },
        {
          title: '战队',
          items: [
            { label: '未来战队 B 站频道', href: 'https://space.bilibili.com/1309383975' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} QDU-Robomaster 未来战队`,
    },

    // 代码配色由 src/css/custom.css 按 XRobot Style 的 CodeBlock 规则给出，两个 Prism 主题都留空。
    prism: {
      theme: { plain: {}, styles: [] },
      darkTheme: { plain: {}, styles: [] },
      additionalLanguages: ['cmake', 'bash'],
    },
  },
};
