---
id: algorithm-overview
title: 算法组文档总览
slug: /算法组
sidebar_position: 1
---

# 算法组文档总览

这里放算法组常用工程、运行配置和链路说明。环境安装和构建命令放在开发环境页。

## 1. 先读

1. [设计思想](/design-philosophy)
2. [坐标系规范](/coordinate-system-standard)
3. [开发环境](/dev-environment)
4. [Git 协作指南](/git-collaboration)

## 2. 常用仓库

1. `bsp-linux-autoaim`：实车 Linux 自瞄工程。
2. `bsp-webots-autoaim`：Webots 自瞄仿真工程。
3. `Modules/modules.yaml`：视觉、通信、预览等模块清单。
4. `Modules/sources.yaml`：模块来源配置。

## 3. 目录内容

1. [相机同步与运行配置](/算法组/sync-and-config)：实车、回放、采集标定三类入口，以及手眼外参写在哪里。
2. [实车自瞄链路](/算法组/pipeline)：`CameraFrameSync -> ArmorDetector -> ArmorTracker -> Aimer` 的数据流。
3. [算法细节](/算法组/algorithm-details)：Detector、Tracker、Aimer 的主要计算内容。
4. [Webots 仿真](/算法组/webots)：Webots 相机、云台、裁判和发射机构怎么接入同一条自瞄链路。

## 4. 电控接口

1. 坐标系、单位、姿态字段和目标位姿含义看 [坐标系规范](/coordinate-system-standard)。
2. Topic 名、字段语义和时间戳含义改动前，确认电控侧同步更新。
3. 相机、串口、模型路径、回放文件和外参放在运行配置里。

## 5. 开发入口

1. [`bsp-linux-autoaim` 开发环境](/dev-environment/bsp-linux-autoaim)
2. [`bsp-webots-autoaim` 开发环境](/dev-environment/bsp-webots-autoaim)
