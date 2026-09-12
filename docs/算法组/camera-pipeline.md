---
id: algorithm-camera-pipeline
title: 相机与同步
slug: /算法组/camera-pipeline
sidebar_position: 4
---

# 相机与同步

相机负责产生图像，CameraSync 负责触发，CameraFrameSync 把图像和 IMU 对齐成同步帧。ArmorDetector 从这里接入。

```text
CameraSync ──触发与同步事件──┐
                            ↓
具体相机 ──图像────────→ CameraFrameSync → ArmorDetector
                            ↑
                        IMU 与姿态
```

## 输入源

`HikCamera` 对接实体相机，`CaptureFileCamera` 用于录像或内录包回放，`WebotsCamera` 提供仿真图像和 IMU。三种输入共用 CameraBase 的帧类型和图像槽。

Webots 默认相机每 10 ms 更新图像，同步触发周期为 20000 μs，即仿真时间下的 50 Hz。

## 帧几何与标定

| 类型 | 内容 |
| --- | --- |
| `FrameLayout` | 帧缓冲区的宽、高、步长和编码，通常作为模板参数 |
| `CameraCalibration` | 原生传感器尺寸、内参和畸变 |
| `FrameGeometry` | 当前帧的 ROI、下采样、翻转和采样相位 |

例如，1440×1080 传感器做 2×2 下采样，输出 720×540。FrameLayout 写 720×540，标定保留 1440×1080，坐标转换使用该帧的 geometry。

`FrameGeometry` 保存在 SharedFrame 中并随图像一起传递，因此每一帧都带着自己的 ROI、采样和翻转信息。

## 时间戳

HikCamera 使用相机设备时间戳并换算成微秒。缺少设备时间戳的帧会丢弃。

触发同步后，下游使用 `SyncedFrame::imu.timestamp_us`，对应同步的 IMU / 触发时间。相机时间戳另外保留，用于诊断。排查时要分清设备时间、同步时间和主机墙钟，它们不是同一套时钟。

Webots 的仿真时间也独立于墙钟。`WEBOTS_SIM_FLOW_RATE=0.1` 表示目标仿真速度为墙钟的十分之一。

## 图像生命周期

CameraBase 管理图像槽，SharedFrame 保留槽位引用。同步、检测、跟踪结果可以共用同一张图，不必逐级复制像素。

Detector 和 Tracker 发布的阶段对象指针只在同步回调期间有效。异步处理需要复制阶段对象，并保留其中的 SharedFrame。

处理队列长期积压时会占住图像槽。排查丢帧时一起看队列长度、空闲槽和各阶段处理速度。

## 相机外参

Tracker 使用的 OpenCV 相机系 C 为右、下、前，安装系 M 为右、前、上；固定的 C → M 变换已经由代码处理。

`cfg.extrinsic.camera_mount_to_body` 填写 M → B 的安装变换，旋转使用 wxyz 四元数，平移单位 m。算法 B 系为右、前、上。

源码：[CameraBase](https://github.com/QDU-Robomaster/CameraBase)、[CameraFrameSync](https://github.com/QDU-Robomaster/CameraFrameSync)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker)。
