---
id: dev-environment
title: 开发环境
slug: /dev-environment
sidebar_position: 1
---

# 开发环境

这里汇总队内主要 BSP 的开发入口。第一次接触某个平台时，优先从对应页面的快速开始流程跑通完整工程，再进入模块内部。

## 仓库入口

1. [`bsp-dev-c`](/dev-environment/bsp-dev-c)：当前主要 C 板电控工程。
2. [`bsp-dev-mc02`](/dev-environment/bsp-dev-mc02)：MC02 备选嵌入式平台。
3. [`bsp-linux-autoaim`](/dev-environment/bsp-linux-autoaim)：Linux 自瞄工程。
4. [`Webots 自瞄快速开始`](/dev-environment/bsp-webots-autoaim)：算法新人推荐入口，从环境配置、clone 第一个仓库到跑通 Detector / Tracker / Aimer。

Webots 新人培训推荐 Windows 原生 Webots + Docker controller；Linux 也支持 Webots 与 controller 全原生运行。两条路线统一使用 OpenVINO。
