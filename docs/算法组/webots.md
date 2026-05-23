---
id: algorithm-webots
title: Webots 仿真
slug: /算法组/webots
sidebar_position: 5
---

# Webots 仿真

`bsp-webots-autoaim` 使用 `User/xrobot.yaml` 生成入口。它不是单独写一套自瞄逻辑，而是把相机、云台、裁判和发射机构换成 Webots 侧模块，再复用同一条 Detector、Tracker、Aimer 链路。

## 1. 入口和资源

常用位置：

1. `User/xrobot.yaml`：Webots 自瞄运行配置。
2. `webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt`：主要 world 入口。
3. `webots/protos/`：目标车、装甲板等 Webots PROTO。
4. `run_headless_preview.py`：无头预览入口。

## 2. 模块

| 模块 | 作用 |
| --- | --- |
| `WebotsCamera` | 从 Webots 相机和 IMU 取图像、角速度、加速度和四元数，按触发节拍提交图像。 |
| `CameraSync` / `CameraFrameSync` | 保留同步触发和图像-IMU 对齐流程；Webots 配置里同步目标为 `50Hz`。 |
| `ArmorDetector` / `ArmorTracker` / `Aimer` | 与实车链路相同的检测、跟踪和瞄准模块。 |
| `WebotsReferee` | 提供仿真裁判信息。 |
| `WebotsGimbal` | 模拟云台执行机构和反馈，不直接把视觉目标写成相机姿态。 |
| `WebotsFireNotify` | 处理 `fire_notify` 请求，加入发弹延迟、射频和热量限制后发布仿真出弹事件。 |

## 3. 和实车的关系

Webots 用于让实车自瞄链路在可控目标和可复现环境里跑起来。仿真里没有真实串口，但通信仍按 Host / MCU 两侧边界组织：用 pipe 模拟实际串口链路的收发行为，再通过 SharedTopic 走同样的数据转发关系。

这样可以检查 Detector、Tracker、Aimer 和跨端通信的在线连接，也能保留相机同步命令、云台目标和发射许可的链路形状。但它不能替代实车相机、线缆、C 板同步和云台机械误差的检查。
