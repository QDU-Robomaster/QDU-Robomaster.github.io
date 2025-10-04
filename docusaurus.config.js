// docusaurus.config.js（空模版本）
module.exports = {
  title: 'Docs',
  tagline: 'Your project tagline',
  url: 'https://QDU-Robomaster.github.io', // TODO: 站点域名
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  onDuplicateRoutes: 'warn',
  favicon: 'img/logo.jpg', // TODO: 替换站点 favicon

  // TODO: 替换为你的组织与项目名（用于 GitHub Pages 等）
  organizationName: 'QDU-Robomaster',
  projectName: 'QDU-Robomaster',

  i18n: {
    defaultLocale: 'zh',
    locales: ['en', 'zh'],
    localeConfigs: {
      en: { label: 'English' },
      zh: { label: '简体中文' },
    },
  },

  plugins: [
    [
      require.resolve('@cmfcmf/docusaurus-search-local'),
      /** @type {import('@cmfcmf/docusaurus-search-local').PluginOptions} */
      ({
        indexDocs: true,
        indexBlog: true,
        indexPages: false,
        language: ['en', 'zh'],
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
          editUrl: 'https://QDU-Robomaster.github.io/edit/master/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'QDU Robomaster Docs',
      logo: {
        alt: 'Site Logo',
        src: 'img/logo.jpg', // TODO: 替换站点 Logo
      },
      items: [
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://github.com/QDU-Robomaster', // TODO: 仓库地址（不需要可删除此项）
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            { label: '入门', to: '/docs/intro' }, // TODO: 确认你的首篇文档路径
          ],
        },
        // 其他分栏留空或按需添加
      ],
      copyright: `Copyright © ${new Date().getFullYear()} QDU Robomaster`,
    },

    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
      additionalLanguages: ['cmake', 'bash'],
    },
  },
};
