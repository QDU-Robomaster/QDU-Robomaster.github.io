---
id: algorithm-sync-and-config
title: 相机同步与运行配置
slug: /算法组/sync-and-config
sidebar_position: 2
---

# 相机同步与运行配置

算法组常用入口由运行配置决定。不要把实车、回放和采集标定混成一个场景看。

## 1. 运行配置

`bsp-linux-autoaim` 的常用运行配置：

| 配置文件 | 用途 |
| --- | --- |
| `User/RunConfig/hik.yaml` | 实车 Hik 相机运行 |
| `User/RunConfig/capturefile.yaml` | 回放文件运行 |
| `User/RunConfig/vision_capture.yaml` | 同步采集和标定数据 |

`bsp-webots-autoaim` 使用 `User/xrobot.yaml` 生成入口。

## 2. CameraFrameSync

`CameraFrameSync` 负责把图像和 IMU 对齐。实车 `hik.yaml` 默认使用 `RAW_PROBE` 模式，通过 `camera_sync_command` / `camera_sync_result` 和 C 板同步触发。

实车链路里，`SharedTopic` 从 C 板接收：

1. `gimbal_gyro`
2. `gimbal_accl`
3. `gimbal_quat`
4. `camera_sync_result`
5. `robot_game_ref`

`SharedTopicClient` 向 C 板发送：

1. `target_euler`
2. `fire_notify`
3. `camera_sync_command`

## 3. VisionCapture

`User/RunConfig/vision_capture.yaml` 用来采集同步图像、IMU 和标定数据。这个配置只实例化相机、同步、SharedTopic 和 `VisionCapture`，不跑 Detector、Tracker、Aimer。

`VisionCapture` 主要用于：

1. 保存同步图像和 IMU 元数据。
2. 采集相机内参标定样本。
3. 采集手眼标定样本。
4. 输出可填回配置的手眼外参。

## 4. 手眼外参

手眼外参写在 `ArmorTracker.cfg.extrinsic.camera_mount_to_body`：

1. 实车 Hik 运行：`User/RunConfig/hik.yaml`
2. 回放运行：`User/RunConfig/capturefile.yaml`
3. Webots 运行：`User/xrobot.yaml`

这个字段表示相机安装坐标系到公开本体系的安装偏差。坐标系定义以 [坐标系规范](/coordinate-system-standard) 为准。
