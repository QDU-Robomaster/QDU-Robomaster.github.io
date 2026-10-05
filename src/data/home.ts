// Copy, links and lists for the home page (src/pages/index.tsx). Every href below is a route that
// exists in docs/ (checked by `onBrokenLinks: 'throw'` at build time) or an external URL.
// Text fields understand `code` and [label](/route), see ShowcaseSection's inline().

import type { DocLink } from '@site/src/components/showcase/ShowcaseSection';

export const GITHUB_ORG = 'https://github.com/QDU-Robomaster';
export const XROBOT_DOCS = 'https://xrobot-org.github.io/';

export const hero = {
  path: ['RoboMaster', 'QDU', '未来战队'],
  title: 'QDU-Robomaster',
  teamName: '初音未来战队',
  lead: '基于 XRobot 完成了全兵种的功能实现。',
  body: '这里是战队的开发文档，用来带新队员上手，也给其他队伍做参考。电控和算法两组的仓库、配置和链路，都能从这一页找到对应的文档。',
  quickLinks: [
    { href: '/电控组/robot-configs', label: '机器人配置' },
    { href: '/电控组/hardware-mapping', label: '外设映射' },
    { href: '/电控组/communication-standard', label: '通信规范' },
    { href: '/电控组/debugging', label: '调试与上板' },
    { href: '/算法组/sync-and-config', label: '运行配置' },
    { href: '/算法组/pipeline', label: '自瞄链路' },
    { href: '/算法组/webots', label: 'Webots 仿真' },
    { href: '/算法组/troubleshooting', label: '常见问题' },
  ] as DocLink[],
  onThisPage: [
    { href: '#robots', label: '兵种' },
    { href: '#autoaim', label: '自瞄链路' },
    { href: '#sim', label: '仿真' },
    { href: '#team', label: '开发环境与 Git' },
    { href: '#route', label: '新队员路线' },
    { href: '#more', label: '版本基线' },
  ] as DocLink[],
};

export const robotsSection = {
  id: 'robots',
  path: ['电控组', 'bsp-dev-c', 'RobotConfig'],
  title: '五个兵种，六份配置',
  body: [
    '整车配置都在 `bsp-dev-c` 的 `User/RobotConfig/` 下，电机 ID、反向、PID、几何参数和事件绑定写在各自的 YAML 里。换车型时替换 `xrobot_gen_main --config` 后面的文件，重新生成后编译。',
  ],
  docs: [
    { href: '/电控组/robot-configs', label: '机器人配置' },
    { href: '/电控组/modules', label: '模块索引' },
    { href: '/电控组/hardware-mapping', label: '外设映射' },
  ] as DocLink[],
};

export const autoaimSection = {
  id: 'autoaim',
  path: ['算法组', '自瞄链路'],
  title: '从相机到云台，一条自瞄链路',
  body: [
    '`HikCamera` 出图，`CameraFrameSync` 把图像和 IMU 按时间对齐成同步帧，`ArmorDetector` 找装甲板并解 PnP，`ArmorTracker` 按编号跟踪车辆，`Aimer` 预测运动、计算弹道和云台计划。结果经 `SharedTopicClient` 送到 C 板，由云台执行。',
    'Tracker 按装甲板编号分别维护车辆状态和 EKF；Aimer 预测目标运动，展开四个装甲面，挑出能打的一面再求弹道。弹道模型带二次空气阻力，用 RK4 积分。右边这块按步骤演示目标被发现、预测到开火的过程。',
  ],
  docs: [
    { href: '/算法组/pipeline', label: '自瞄链路' },
    { href: '/算法组/algorithm-details', label: '算法细节' },
    { href: '/算法组/camera-pipeline', label: '相机与同步' },
    { href: '/算法组/sync-and-config', label: '运行配置' },
  ] as DocLink[],
};

export const simSection = {
  id: 'sim',
  path: ['算法组', 'Webots'],
  title: 'Webots 和实车用同一套自瞄模块',
  body: [
    '`bsp-webots-autoaim` 用 `WebotsCamera`、`WebotsGimbal`、`WebotsFireNotify`、`WebotsReferee` 替换相机、云台、发射机构和裁判系统，Detector、Tracker、Aimer 与实车共用。没有整车，也能把检测、跟踪到瞄准的整条链路跑起来。',
    'Windows 上运行原生 Webots，controller 在 Docker 容器里编译运行；Linux 上两者都可以原生运行。',
  ],
  docs: [
    { href: '/算法组/webots', label: 'Webots 仿真' },
    { href: '/dev-environment/bsp-webots-autoaim', label: 'bsp-webots-autoaim 环境' },
    { href: '/算法组/quick-start', label: '算法组快速上手' },
  ] as DocLink[],
};

export const teamSection = {
  id: 'team',
  path: ['全组协作', '开发环境'],
  title: '开发环境与 Git 协作',
  body: [
    '战队有四个 BSP，每个一页环境说明。第一次接触某个平台，先按对应组的快速上手把工程跑通，再进入模块内部。',
    '两组之间交接的姿态、角速度和目标位置默认使用本体系 `B`（+X 车头，+Y 左侧，+Z 向上）；Topic 的名称、域、单位和时间戳按通信规范对齐。',
  ],
  docs: [
    { href: '/coordinate-system-standard', label: '坐标系规范' },
    { href: '/电控组/communication-standard', label: '通信规范' },
    { href: '/design-philosophy', label: '设计思想' },
  ] as DocLink[],
  envs: [
    {
      repo: 'bsp-dev-c',
      label: ['STM32', 'C 板'],
      href: '/dev-environment/bsp-dev-c',
      body: '当前主要的 C 板电控工程，整车配置在 `User/RobotConfig/`。Windows 原生 STM32 工具链或 Linux ARM 工具链都可以编译。',
      tags: ['STM32', 'Windows', 'Linux'],
    },
    {
      repo: 'bsp-dev-mc02',
      label: ['STM32', 'MC02'],
      href: '/dev-environment/bsp-dev-mc02',
      body: 'MC02 板级工程，默认程序是蜂鸣器测试。初始化比 C 板多一步 `xrobot_src_man create-sources`。',
      tags: ['STM32', 'Windows', 'Linux'],
    },
    {
      repo: 'bsp-linux-autoaim',
      label: ['Linux', '实车自瞄'],
      href: '/dev-environment/bsp-linux-autoaim',
      body: '实车 Linux 自瞄，接 Hik 相机，用 OpenVINO 推理。`User/RunConfig/` 下有实车相机、文件回放和采集标定几套运行配置。',
      tags: ['Linux', 'OpenVINO'],
    },
    {
      repo: 'bsp-webots-autoaim',
      label: ['Webots', '仿真'],
      href: '/dev-environment/bsp-webots-autoaim',
      body: 'Webots 自瞄仿真。Windows 上 Webots 原生运行，controller 在 Docker 容器里编译；Linux 可以全部原生运行。',
      tags: ['Webots', 'Docker', 'OpenVINO'],
    },
  ],
  gitTitle: 'Git 协作',
  gitBody: [
    '正式改动走分支，不直接提交到 `main`、`master`、`dev`。一个 PR 只处理一个主题，写清变更内容、验证方式和影响范围；坐标系、通信、同步链路这类改动实机验证后再合并。',
    '每个模块仓库维护自己的 CI，跨仓库改动在相关 PR 里互相引用，并写明合并顺序。',
  ],
  gitBranches: ['feature/<short-desc>', 'fix/<short-desc>', 'docs/<short-desc>', 'refactor/<short-desc>'],
  gitDoc: { href: '/git-collaboration', label: '团队工作流' } as DocLink,
};

export type RouteStep = { id: string; href: string; title: string; note: string };
export type RoutePath = { id: string; path: string[]; title: string; intro: string; steps: RouteStep[] };

export const routeSection = {
  id: 'route',
  path: ['新队员', '上手路线'],
  title: '新队员从这里开始',
  body: ['先读两组共用的几页，再按组往下走。每一步对应一篇文档，读完可以勾上；进度只保存在当前浏览器里。'],
  paths: [
    {
      id: 'shared',
      path: ['两组共用'],
      title: '先读这几页',
      intro: '为什么全队都用 XRobot，整车怎么连起来，两组之间按什么约定交接。',
      steps: [
        { id: 'intro', href: '/intro', title: '欢迎', note: '文档目录和框架文档入口' },
        { id: 'design', href: '/design-philosophy', title: '设计思想', note: '一套开发方式、分布式通信、模块复用' },
        { id: 'arch', href: '/system-architecture', title: '整体架构', note: '自瞄系统和下位机系统的结构图' },
        { id: 'frames', href: '/coordinate-system-standard', title: '坐标系规范', note: '本体系 B、BMI088 安装变换、云台目标字段' },
        { id: 'git', href: '/git-collaboration', title: '团队工作流', note: '分支、PR、CI 和跨仓库改动' },
        { id: 'env', href: '/dev-environment', title: '开发环境', note: '四个 BSP 的入口' },
      ],
    },
    {
      id: 'ee',
      path: ['电控组', 'bsp-dev-c'],
      title: '电控组',
      intro: '从 C 板的 LED 程序开始，走通生成、编译、烧录，再换成整车配置。',
      steps: [
        { id: 'ee-overview', href: '/电控组', title: '电控组文档总览', note: '常用工程和工程里的几个位置' },
        { id: 'ee-env', href: '/dev-environment/bsp-dev-c', title: 'bsp-dev-c 环境', note: '工具链和初始化命令' },
        { id: 'ee-quick', href: '/电控组/quick-start', title: '快速上手', note: '用 LED 程序走一遍生成、编译、烧录' },
        { id: 'ee-configs', href: '/电控组/robot-configs', title: '机器人配置', note: '各车型 YAML 和切换方法' },
        { id: 'ee-hw', href: '/电控组/hardware-mapping', title: '外设映射', note: 'YAML 里的名字对应哪个外设' },
        { id: 'ee-modules', href: '/电控组/modules', title: '模块索引', note: '每项功能在哪个模块仓库' },
        { id: 'ee-comm', href: '/电控组/communication-standard', title: '通信规范', note: 'Topic、Event 和主机通信' },
        { id: 'ee-code', href: '/电控组/code-standard', title: '代码规范', note: '命名、格式化和生成文件' },
        { id: 'ee-debug', href: '/电控组/debugging', title: '调试与上板', note: '常见问题和要看的状态' },
      ],
    },
    {
      id: 'algo',
      path: ['算法组', 'bsp-webots-autoaim'],
      title: '算法组',
      intro: '先在 Webots 里把整条链路跑起来，再顺着链路读每个模块。',
      steps: [
        { id: 'algo-overview', href: '/算法组', title: '算法组开发指南', note: '常用仓库和各页内容' },
        { id: 'algo-quick', href: '/算法组/quick-start', title: '快速上手', note: '开发容器、编译、连接 Webots、看预览' },
        { id: 'algo-modules', href: '/算法组/modules', title: '模块索引', note: '功能和源码文件的对应' },
        { id: 'algo-camera', href: '/算法组/camera-pipeline', title: '相机与同步', note: '触发、时间戳和帧几何' },
        { id: 'algo-config', href: '/算法组/sync-and-config', title: '运行配置', note: 'Webots 与 Linux 的运行 YAML' },
        { id: 'algo-pipeline', href: '/算法组/pipeline', title: '自瞄链路', note: 'Detector、Tracker、Aimer 之间的数据' },
        { id: 'algo-details', href: '/算法组/algorithm-details', title: '算法细节', note: '检测、跟踪、弹道和 MPC' },
        { id: 'algo-webots', href: '/算法组/webots', title: 'Webots 仿真', note: 'world、controller 和仿真设备' },
        { id: 'algo-testing', href: '/算法组/testing', title: '测试与回归', note: '场景冒烟测试和端到端验收' },
      ],
    },
  ] as RoutePath[],
};

export const moreSection = {
  id: 'more',
  path: ['框架', '仓库', '版本'],
  title: '框架文档、仓库和版本基线',
  body: [
    'XRobot / LibXR 的安装、代码生成、模块管理和 API 写在框架文档里，本站只写战队的用法。战队的 BSP 和模块仓库都在 GitHub 组织 `QDU-Robomaster` 下。',
  ],
  xrobot: {
    title: 'XRobot 框架文档',
    href: XROBOT_DOCS,
    host: 'xrobot-org.github.io',
    body: '环境配置、代码生成、模块管理、消息与事件系统，以及 LibXR 的类文档。',
  },
  github: {
    title: 'GitHub 组织',
    href: GITHUB_ORG,
    host: 'github.com/QDU-Robomaster',
    body: 'BSP、自瞄模块和 Webots 适配模块的源码，每个模块一个仓库。',
  },
  versionsTitle: '当前文档对应的仓库版本',
  // Keys of src/data/commitInfo.json (written by scripts/fetch-commits.js) and their repositories.
  versions: [
    { key: 'XRobot', label: 'XRobot', repo: 'xrobot-org/XRobot' },
    { key: 'LibXR', label: 'libxr', repo: 'Jiu-xiao/libxr' },
    { key: 'CodeGen', label: 'LibXR_CppCodeGenerator', repo: 'Jiu-xiao/LibXR_CppCodeGenerator' },
    { key: 'bsp-dev-c', label: 'bsp-dev-c', repo: 'QDU-Robomaster/bsp-dev-c' },
    { key: 'bsp-dev-mc02', label: 'bsp-dev-mc02', repo: 'QDU-Robomaster/bsp-dev-mc02' },
    { key: 'AUTO-Aming-system', label: 'AUTO-Aming-system', repo: 'QDU-Robomaster/AUTO-Aming-system' },
  ],
};
