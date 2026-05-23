---
id: ee-overview
title: 电控组文档总览
slug: /电控组
sidebar_position: 1
---

# 电控组文档总览

这里放电控组自己的工程说明：先找到仓库、配置文件和常用流程。工具安装、编译、烧录放在开发环境页；跨组共用的内容放在全组文档。

## 1. 先读

1. [设计思想](/design-philosophy)
2. [坐标系规范](/coordinate-system-standard)
3. [`bsp-dev-c` 开发环境](/dev-environment/bsp-dev-c)
4. [Git 协作指南](/git-collaboration)

## 2. 常用位置

1. `bsp-dev-c`：当前主要 C 板电控工程。
2. `bsp-dev-mc02`：MC02 相关工程。
3. `Modules/modules.yaml`：工程使用的模块清单。
4. `Modules/sources.yaml`：模块来源配置。
5. `User/RobotConfig/*.yaml`：不同机器人的模块实例、参数和连接关系。
6. `User/xrobot_main.hpp`：由 `xrobot_gen_main` 生成的入口文件。

## 3. 目录内容

1. [快速上手](/电控组/quick-start)：第一次拉取仓库、初始化模块、生成机器人入口。
2. [代码规范](/电控组/code-standard)：电控 C++ 模块、配置和调试入口的写法。
3. [通信规范](/电控组/communication-standard)：Topic、Event、SharedTopic、CAN / UART 怎么分工。
