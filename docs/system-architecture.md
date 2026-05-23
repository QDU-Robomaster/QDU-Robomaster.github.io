---
id: system-architecture
title: 整体架构
slug: /system-architecture
sidebar_position: 3
---

# 整体架构

## 自瞄系统架构

<img src="/img/autoaim-system.svg" alt="整体架构图" />

我们为上位机提供了两套开发环境，一套是用于实机的 Linux，使用 USB CDC 连接下位机通信。下位机通过硬件触发相机采集来做到相机 - IMU 同步。另一套 Webots 实现了完整的云台 / 下位机通信环境（通过管道模拟串口），用于实现全量的算法仿真。同步后的相机 - IMU 数据经过 detector、tracker、aimer 后，变为下位机云台可执行的 plan 来进行控制。

## 下位机系统架构

<img src="/img/device-system.svg" alt="下位机系统架构图" />

下位机主要通过操作外设，完成与传感器、上位机通信，控制执行器等工作。与上位机一样，所有模块使用 topic 进行解耦。

## 导航系统架构

TODO
