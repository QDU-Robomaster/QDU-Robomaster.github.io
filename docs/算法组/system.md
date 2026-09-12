---
id: algorithm-overview
title: 算法组开发指南
slug: /算法组
sidebar_position: 1
---

# 算法组开发指南

自瞄工程从相机和 IMU 开始，经过同步、装甲板检测和目标跟踪，最后由 Aimer 生成云台目标与开火请求。Webots 和实体机器人共用 Detector、Tracker、Aimer，只在输入、通信和执行端使用不同的 BSP 模块。

刚接触工程时先走一遍[快速上手](/算法组/quick-start)。Webots 可以把整条链路跑起来，不依赖实体机器人。

## 常用仓库

| 仓库 | 用途 | 环境配置 |
| --- | --- | --- |
| `bsp-webots-autoaim` | 仿真场景与自瞄 controller | [bsp-webots-autoaim](/dev-environment/bsp-webots-autoaim) |
| `bsp-linux-autoaim` | 实体相机、文件回放和采集标定 | [bsp-linux-autoaim](/dev-environment/bsp-linux-autoaim) |

`Modules/modules.yaml` 列出依赖，`User/xrobot.yaml` 或 `User/RunConfig/` 下的 YAML 决定实际运行配置。XRobot 的模块管理和代码生成用法见[上游文档](https://xrobot-org.github.io/docs/proj_man)。

## 从哪里开始

| 内容 | 页面 |
| --- | --- |
| 启动工程、连接 Webots、查看画面 | [快速上手](/算法组/quick-start) |
| 功能与源码文件对应 | [模块索引](/算法组/modules) |
| 相机、触发、时间戳和图像几何 | [相机与同步](/算法组/camera-pipeline) |
| 不同输入和运行 YAML | [运行配置](/算法组/sync-and-config) |
| Detector、Tracker、Aimer 之间的数据 | [自瞄链路](/算法组/pipeline) |
| 检测、跟踪、弹道和计划实现 | [算法细节](/算法组/algorithm-details) |
| world、controller 和仿真设备 | [Webots 仿真](/算法组/webots) |
| 记录文件、内参标定和手眼采样 | [数据记录与标定](/算法组/recording-calibration) |
| OpenVINO 模型格式与文件检查 | [模型与数据](/算法组/models-data) |
| 配置、启动器和场景测试 | [测试与回归](/算法组/testing) |
| 构建、连接、模型和画面故障 | [常见问题](/算法组/troubleshooting) |
