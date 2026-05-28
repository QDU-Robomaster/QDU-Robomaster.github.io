---
id: git-collaboration
title: 团队工作流
slug: /git-collaboration
sidebar_position: 5
---

# 团队工作流

## 分支

正式改动应通过分支提交，不直接进入 `main`、`master`、`dev`。

分支名应直接反映改动内容。常用写法：

```text
feature/<short-desc>
fix/<short-desc>
docs/<short-desc>
refactor/<short-desc>
```

## PR

一个 PR 只处理一个明确主题。

PR 里至少写清楚：

1. 变更内容
2. 验证方式
3. 影响范围

坐标系、通信、同步链路、ABI、多平台行为、默认参数等相关改动，应在实机验证后再合并。

## CI

CI 用于每次推送以及合并前后的检查。

每个模块仓库都应维护独立 CI。

新模块在开发初始就应接入 CI，不在功能完成后再补。

BSP 仓库的 CI 应覆盖所有支持的机器人配置，并以较高频率定时触发。

## 跨仓库

跨仓库改动应在相关 PR 中相互引用，并明确合并顺序。

依赖尚未合并时，应写明依赖仓库、分支和 PR。
上游合并后，应先同步主线，再整理当前 PR。

示例：

```text
当前 PR:
- bsp-linux-autoaim: fix/camera-sync-adapter

依赖:
- CameraFrameSync: branch fix/timestamp-align
- 上游 PR: https://github.com/QDU-Robomaster/CameraFrameSync/pull/12

当前状态:
- 这个 PR 现在基于 `CameraFrameSync/fix/timestamp-align` 联调
- 在 CameraFrameSync 上游 PR 合并前，这个 PR 不进入主干
- 等 CameraFrameSync 合并后，将当前分支同步到最新主线，再整理这个 PR

合并顺序:
1. CameraFrameSync
2. bsp-linux-autoaim
```

## 许可证

公开仓库原则上采用 `GPL-3.0-or-later`。具体以各仓库根目录中的 `LICENSE` 文件为准。没有 `LICENSE` 的仓库，后续按这一方向补齐。

## 禁止行为

组织下所有代码所有权归青岛大学未来战队所有。

禁止为了绕开工作流而 fork 仓库后在分叉仓库独立开发。所有更新应在组织仓库分支中完成。

禁止使用 zip 包等方式传递正式代码更新。

永远不允许以任何方式绕过 CI。

私自分叉、拒不上传代码、不遵守工作流者，由组长或队长单独谈话。
