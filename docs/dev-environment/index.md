---
id: dev-environment
title: 开发环境
slug: /dev-environment
sidebar_position: 1
---

# 开发环境

这里汇总队内主要 BSP 的开发入口，每页对应一个仓库的环境、依赖和构建运行方式。

第一次接触某个平台时，先按对应组的快速上手流程把整个工程跑通，再进入模块内部。

## 仓库入口

1. [`bsp-dev-c`](/dev-environment/bsp-dev-c)：当前主要 C 板电控工程。
2. [`bsp-dev-mc02`](/dev-environment/bsp-dev-mc02)：MC02 备选嵌入式平台。
3. [`bsp-linux-autoaim`](/dev-environment/bsp-linux-autoaim)：Linux 自瞄工程。
4. [`bsp-webots-autoaim`](/dev-environment/bsp-webots-autoaim)：Webots 自瞄仿真工程。

各组的新人流程单独放在组的目录下，例如算法组 Webots 仿真从 [快速上手](/算法组/quick-start) 开始，电控组从 [快速上手](/电控组/quick-start) 开始。

Webots 培训推荐 Windows 原生 Webots + Docker controller；Linux 也支持 Webots 与 controller 全原生运行。两条路线统一使用 OpenVINO。
