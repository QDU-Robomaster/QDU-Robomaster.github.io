---
id: algorithm-pipeline
title: 实车自瞄链路
slug: /算法组/pipeline
sidebar_position: 3
---

# 实车自瞄链路

`User/RunConfig/hik.yaml` 是实车运行入口，主链路是：

```text
HikCamera
  -> CameraFrameSync
  -> ArmorDetector
  -> ArmorTracker
  -> Aimer
  -> SharedTopicClient
```

`User/RunConfig/capturefile.yaml` 用来回放视觉链路。它保留 Detector、Tracker、Aimer 的处理流程，但输入来自记录文件，不依赖 Hik 相机和 C 板。

## 1. 模块职责

| 模块 | 负责内容 |
| --- | --- |
| `HikCamera` | 读取 Hik 相机图像，实车配置使用硬件触发。 |
| `CameraFrameSync` | 对齐图像和 IMU，向后级提供同步帧。 |
| `ArmorDetector` | 从同步帧读取图像和 IMU，检测装甲板四角点，过滤候选后做 PnP。 |
| `ArmorTracker` | 读取 Detector 结果和同帧 IMU，结合手眼外参维护目标状态，发布 `tracker/target_frame`。 |
| `Aimer` | 读取 `tracker/target_frame`，生成云台目标和发射许可。 |
| `SharedTopicClient` | 把 `target_euler`、`fire_notify`、`camera_sync_command` 转发到 C 板。 |

## 2. Detector 到 Tracker

`ArmorDetector` 发布 `armor_detector/armors_frame`。这个结果包含当前帧装甲板检测结果、图像时间戳和同步帧引用。

`ArmorTracker` 消费 Detector 输出后，只向后级发布一个当前选择目标：`tracker/target_frame`。多目标状态可以同时维护，但对 Aimer 的接口保持单一目标。

## 3. Tracker 到 Aimer

`Aimer` 只使用 `tracker/target_frame` 做目标选择、预测和弹道计算。原始图像和 IMU 只用于内置预览投影，不参与额外决策。

输出给电控侧的 topic：

1. `host/target_euler`：云台目标角、角速度和角加速度前馈。
2. `host/fire_notify`：发射许可。

机械俯仰轴使用 `target_euler.rol` 字段，具体字段含义看 [坐标系规范](/coordinate-system-standard)。
