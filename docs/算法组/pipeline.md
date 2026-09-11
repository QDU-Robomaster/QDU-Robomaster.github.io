---
id: algorithm-pipeline
title: 自瞄链路
slug: /算法组/pipeline
sidebar_position: 6
---

# 自瞄链路

```text
HikCamera / CaptureFileCamera / WebotsCamera
                    ↓
             CameraFrameSync
                    ↓
              ArmorDetector
                    ↓ armor_detector/armors_frame
              ArmorTracker
                    ↓ tracker/target_frame
                  Aimer
             ↙             ↘
 host/target_euler      host/fire_notify
```

实体 Linux BSP 通过 SharedTopicClient 把控制结果送到 C 板；Webots 则把同样的输出交给 WebotsGimbal 和 WebotsFireNotify。

## 同步帧与检测

CameraFrameSync 输出图像、IMU 和同帧几何。Detector 把图像转换为模型输入，然后完成检测、过滤和 PnP。

Webots 原图为 800×600，OpenVINO 网络输入为 640×512。网络前处理负责尺寸转换，相机标定仍使用原生尺寸。

## 检测与跟踪

`armor_detector/armors_frame` 的负载是 `const DetectedFrame<Layout>*`，包含共享图像、IMU、类别、角点和 PnP 结果。

发布的角点、中心与包围盒使用原生传感器像素坐标。显示时再映射回当前帧。

Tracker 使用这些角点和原生 K/D 重新做 PnP，当前模型采用 230 mm 大装甲板尺寸，并不直接沿用 Detector 的 pose。

## 跟踪与瞄准

Tracker 按编号维护多个车辆状态，按评分和切换滞回选出一个目标，发布 `tracker/target_frame`。

负载 `const TrackedFrame*` 包含选中目标、共享图像、IMU 和预览投影变换。异步处理需复制阶段对象并保留 SharedFrame，见[相机与同步](/算法组/camera-pipeline)。

目标位置使用惯性解算轴 O，x 向右、y 向前、z 向上，轴向不随当前云台 yaw 旋转。方位角计算为：

```text
yaw = atan2(-x, y)
```

正前方为零，左侧为正。

## 执行输出

Aimer 预测目标运动、选择装甲面、计算弹道和云台计划，发布目标包与发射许可。

| 字段 | 内容 | 单位 |
| --- | --- | --- |
| `rol`、`pit` | 同一机械俯仰目标 | rad |
| `yaw` | 偏航目标 | rad |
| `rol_dot`、`pit_dot`、`yaw_dot` | 对应角速度 | rad/s |
| `rol_ddot`、`pit_ddot`、`yaw_ddot` | 对应角加速度 | rad/s² |

Aimer 同时填充 `rol` 和 `pit` 两组俯仰字段：WebotsGimbal 读取 `rol`，实体 HostData/CMD/Gimbal 路径使用 `pit`。

## 裁判与预览

裁判摘要来自 `host/robot_game_ref`，类型为 `RefereeTypes::RobotGameRefereePack`。Aimer 使用配置的默认弹速，并读取热量上限和冷却值；没有热量数据时日志显示 `heat=unknown`。

`host/gimbal_quat` 用于自动开火对齐检查，缺失时不自动开火。

Detector、Tracker 和 Aimer 分别生成预览，共用 VisionPreview 的 HTTP 服务。三路图像均来自实际处理的帧。

源码：[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker)、[Aimer](https://github.com/QDU-Robomaster/Aimer)。
