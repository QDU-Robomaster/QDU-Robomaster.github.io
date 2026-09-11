---
id: algorithm-sync-and-config
title: 运行配置
slug: /算法组/sync-and-config
sidebar_position: 5
---

# 运行配置

Webots 使用 `User/xrobot.yaml`。Linux BSP 除默认配置外，还在 `User/RunConfig/` 中提供相机运行、文件回放和采集配置。

## Webots

| 项目 | 配置 |
| --- | --- |
| 图像 | 800×600，BGR8，step 2400 |
| 模型 | `ArmorDetectorModel::OPENVINO_640X512` |
| 同步模式 | `CameraFrameSyncMode::TRIGGER` |
| 触发周期 | 20000 μs |
| 预览端口 | 三路共用 8080 |
| 默认弹速 | 23 m/s |

运行方式见[快速上手](/算法组/quick-start)。

## Linux RunConfig

| 文件 | 输入 | 运行内容 |
| --- | --- | --- |
| `User/xrobot.yaml` | Hik 相机 | 默认实体相机、自瞄和主机通信 |
| `hik.yaml` | Hik 相机，2×2 下采样输出 720×540 | 同步、Detector、Tracker、Aimer、主机收发 |
| `capturefile.yaml` | 1440×1080 历史视频与 IMU 文件 | 文件回放、同步、自瞄；关闭 DevC USB |
| `sentry.yaml` | 自由运行 Hik 相机，独立标定 | 自瞄和通信，裁判输入使用 `sentry_ref` |
| `vision_capture.yaml` | 同步相机图像 | VisionCapture 记录或标定，不运行自瞄三模块 |

`hik.yaml` 的原生标定尺寸为 1440×1080，触发目标为 100 Hz。相机参数中的自由运行帧率与外触发频率分别设置。

上述 Linux 检测配置使用 `INT16_HEAD_L`；桌面培训使用 Webots 的 OpenVINO 配置。切换模型需要改 `cfg.network.model` 并具备对应 Runtime。

## 生成入口

选择所需配置执行一条命令：

```bash
python3 -m xrobot.GenerateMain --config User/RunConfig/hik.yaml --output User/xrobot_main.hpp
python3 -m xrobot.GenerateMain --config User/RunConfig/capturefile.yaml --output User/xrobot_main.hpp
python3 -m xrobot.GenerateMain --config User/RunConfig/sentry.yaml --output User/xrobot_main.hpp
python3 -m xrobot.GenerateMain --config User/RunConfig/vision_capture.yaml --output User/xrobot_main.hpp
```

不带 `--config` 时使用 `User/xrobot.yaml`。切换后重新编译。同一工作树的生成入口共用，不能同时为两份配置运行生成器。

## 常用参数位置

| 参数 | 位置 |
| --- | --- |
| 曝光、触发、下采样 | 相机实例的 `constructor_args.runtime` |
| 同步模式、偏移和周期 | CameraFrameSync 的 `runtime` 与触发侧配置 |
| 模型、置信度、NMS | ArmorDetector 的 `cfg.network` |
| 跟踪与目标选择 | ArmorTracker 的 `cfg.tracker` |
| 手眼外参 | ArmorTracker 的 `cfg.extrinsic.camera_mount_to_body` |
| 延迟、弹道、MPC | Aimer 的 `cfg` |
| 预览 | 对应模块的 `cfg.preview` |
| 记录与标定 | VisionCapture 的 `cfg` |

`vision_capture.yaml` 同时设置了 `mode: record` 和 `camera_calibration.enabled: true`，会进入内参标定。普通记录时需要关闭该标定开关，详细设置见[数据记录与标定](/算法组/recording-calibration)。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[bsp-linux-autoaim](https://github.com/QDU-Robomaster/bsp-linux-autoaim)。
