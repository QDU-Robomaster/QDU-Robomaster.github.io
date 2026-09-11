---
id: algorithm-modules
title: 模块索引
slug: /算法组/modules
sidebar_position: 3
---

# 模块索引

模块下载到 BSP 的 `Modules/` 目录。依赖清单在 `Modules/modules.yaml`，实际实例在运行 YAML 中。

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

Detector、Tracker 和 Aimer 各自持有预览对象，不需要另外启动独立的预览算法进程。

## 通信与仿真

`SharedTopic` / `SharedTopicClient` 收发主机与 C 板之间的数据。`CMD` 提供控制命令类型与控制源管理，`Referee` 提供裁判类型等公共定义。

Webots 使用 `WebotsReferee` 提供裁判信息，`WebotsGimbal` 控制仿真云台，`WebotsFireNotify` 处理出弹事件。连接关系见[Webots 仿真](/算法组/webots)。

## 查看版本和修改

模块目录是独立仓库，进入对应模块检查：

```bash
git -C Modules/ArmorDetector log -1 --oneline
git -C Modules/ArmorDetector status --short
```

模块实现提交到模块仓库；模型选择、设备参数和实例连接提交到 BSP。

源码：[Webots 模块清单](https://github.com/QDU-Robomaster/bsp-webots-autoaim/blob/264c312fff724748784520ff4de0a22afcecd3d4/Modules/modules.yaml)、[Linux 模块清单](https://github.com/QDU-Robomaster/bsp-linux-autoaim/blob/abef156bac8805ccccda30d092fa5979a4aef9ef/Modules/modules.yaml)。
