# showcase

首页上的交互小部件和它们的外壳。共同约定见下文和 `registry.ts` 里的 `ShowcaseWidgetProps`。

## 目录

| 位置 | 内容 |
| --- | --- |
| `Showcase.tsx` | 外壳：`<Showcase name="AutoAim" />`，可选 `height={{ desktop, mobile }}` |
| `ShowcaseSection.tsx` | 首页的一节（`ShowcaseSection`）和节内的一块（`ShowcasePanel`）：PathLabel、标题、两三句说明、相关文档，旁边或下方挂一个小部件 |
| `registry.ts` | 小部件名单和按需引入 |
| `<Name>/index.tsx` | 小部件本体，默认导出 |
| `<Name>/styles.module.css`、`<Name>/sim.ts` | 样式和不碰 DOM 的纯逻辑（`node --test` 单测） |

现有的名字：`RobotLineup`、`AutoAim`、`CameraSync`、`SimVsReal`。

## 外壳做的事

`Showcase` 收到一个名字，在 `registry.ts` 里查这个名字对应的 `<Name>/index.*`。`registry.ts` 用 webpack 的 `require.context(..., 'lazy')` 扫描这些目录，每个小部件单独成一个 chunk；目录还不存在的名字不在扫描结果里，外壳显示带名字的占位框，构建照常通过。

挂载和播放按下面的顺序进行：

1. 服务端渲染和首次渲染只输出一个按 `height` 预留高度（默认 440 px，可分桌面和 ≤720 px 两档）的占位框，页面不会因为小部件加载而跳动。
2. 占位框进入视口前 400 px 时，在 `BrowserOnly` + `React.lazy` + `Suspense` 里请求 chunk 并挂载。挂载后不再卸载。
3. 小部件收到两个参数：
   - `active`：占位框和视口相交且页面可见（`document.visibilityState`）时为 `true`。离开视口或切到别的标签页时变成 `false`，小部件停掉所有动画和定时器，保留当前画面。
   - `reducedMotion`：跟随 `prefers-reduced-motion: reduce`，系统设置改变时同步更新。为 `true` 时显示一张有信息量的静帧，交互照常可用。
4. chunk 加载失败或小部件渲染时抛错，`WidgetBoundary` 把它换成占位框，并在控制台写一条 `[showcase] <Name> failed` 警告；页面其他部分不受影响。

外壳的 `<figure>` 上有 `data-showcase`、`data-showcase-state`（`missing` / `waiting` / `mounted`）和 `data-active`，截图和自测脚本可以据此判断状态。

## 新增一个小部件

1. 建 `<Name>/index.tsx`，默认导出一个接收 `ShowcaseWidgetProps`（`registry.ts`）的组件。模块顶层不访问 `window` / `document`。
2. 把名字加进 `registry.ts` 的 `SHOWCASE_NAMES` 和 `require.context` 的正则（正则必须写成字面量，webpack 在构建时读取它）。
3. 首页用 `ShowcaseSection` 的 `widget` 或 `ShowcasePanel` 挂上，`height` 写桌面和 ≤720 px 两档预留高度。

## 讲解层的循环动画

XRobot Style 的 INV-16 规定动效不超过 `duration-base`、不循环。首页小部件属于设计系统的讲解层：它们演示的是一段机制（装甲板跟踪、相机触发、话题包收发），需要循环播放才看得出来。这一层按下面的规则开例外：

- 循环动画只在 `active === true` 时运行。实现上用 `requestAnimationFrame` 或定时器驱动，并在 `active` 变成 `false` 时取消；不使用 CSS 的 `animation-iteration-count: infinite`，因为外壳无法暂停它。
- `reducedMotion === true` 时不播放循环，显示一张静帧，静帧本身要能读出这段机制的要点（例如标出四块装甲板和选中的那一块）。
- 例外只适用于 `src/components/showcase/<Name>/` 内的小部件。页面本身、导航、按钮、卡片仍按 INV-16：只有 hover、按下、展开等状态反馈，时长不超过 160 ms。
- 小部件里状态反馈类的过渡（hover、切换选项）同样不超过 160 ms。

## 颜色

只用 token 变量（`src/css/xrstyle-tokens.css`）：界面用 `--paper*`、`--line*`、`--ink*`、`--on-ink`、`--focus`，通道色 `--ch0..3` 只给数据。战队强调色 `--team-accent`（图形）和 `--team-accent-ink`（文字）定义在 `src/css/team-tokens.css`，只用于少量战队标识，例如己方装甲灯条；不在它上面放字。它和 `--ch1` 同在青色区，己方标识用实心块加 `--ink` 描边，`--ch1` 只画数据线，两者不要挨着放。

画布里用 `getComputedStyle(document.documentElement)` 读变量，`html[data-theme]` 变化时（`MutationObserver`）重读。
