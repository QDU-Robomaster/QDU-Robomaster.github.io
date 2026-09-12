---
id: algorithm-modules
title: 模块索引
slug: /算法组/modules
sidebar_position: 3
---

# 模块索引

各功能模块位于 BSP 的 `Modules/` 目录。`Modules/modules.yaml` 记录依赖版本，运行 YAML 决定本次启动哪些模块以及使用什么参数。

## 相机和同步

| 模块 | 用途 |
| --- | --- |
| `CameraBase` | 帧布局、标定、逐帧几何、图像槽和共享帧类型 |
| `HikCamera` | Hikrobot 相机取流与设备设置 |
| `CaptureFileCamera` | 图像和 IMU 文件回放 |
| `WebotsCamera` | Webots 图像与 IMU 输入 |
| `CameraSync` | 相机触发和同步命令执行 |
| `CameraFrameSync` | 图像与 IMU 配对、档位和同步状态管理 |

三种相机共用 CameraBase 的类型。触发与配对由 CameraSync、CameraFrameSync 分别处理，具体流程见[相机与同步](/算法组/camera-pipeline)。

## 视觉算法

| 模块 | 用途 | 主要文件 |
| --- | --- | --- |
| `ArmorDetector` | 装甲板检测、分类、角点和 PnP | `ArmorDetectorNetwork.hpp`、`ArmorDetectorRuntime.hpp`、`ArmorDetectorPnPSolver.hpp` |
| `ArmorTracker` | 车辆状态估计与目标选择 | `ArmorTrackerPipeline.hpp`、`ArmorTrackerCore.hpp`、`ArmorTrackerModel.hpp` |
| `Aimer` | 目标预测、弹道和云台计划 | `AimerImpl.hpp`、`AimerTargetModel.hpp`、`AimerMath.hpp`、`AimerPlanner.hpp` |
| `VisionPreview` | 窗口或 Web 图像预览 | `VisionPreview.hpp` |
| `VisionCapture` | 图像记录、标定采样与内参求解 | `VisionCapture.hpp` 及采样、记录实现 |
| `DurationStatistics` | 处理耗时统计 | 模块头文件与调用位置 |

Detector、Tracker 和 Aimer 的预览直接挂在各自模块上，共用 VisionPreview 的 HTTP 服务。

## 通信与仿真

`SharedTopic` / `SharedTopicClient` 收发主机与 C 板之间的数据。`CMD` 提供控制命令类型与控制源管理，`Referee` 提供裁判类型等公共定义。

Webots 使用 `WebotsReferee` 提供裁判信息，`WebotsGimbal` 控制仿真云台，`WebotsFireNotify` 处理出弹事件。连接关系见[Webots 仿真](/算法组/webots)。

## 版本与修改

`Modules/` 下的模块都是独立仓库，可以直接查看版本和工作树：

```bash
git -C Modules/ArmorDetector log -1 --oneline
git -C Modules/ArmorDetector status --short
```

算法实现改在对应模块仓库；模型选择、设备参数和模块连接属于 BSP 配置。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[bsp-linux-autoaim](https://github.com/QDU-Robomaster/bsp-linux-autoaim)。
