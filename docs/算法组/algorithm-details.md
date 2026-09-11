---
id: algorithm-details
title: 算法细节
slug: /算法组/algorithm-details
sidebar_position: 7
---

# 算法细节

## ArmorDetector

Detector 从同步帧取图像，经过模型前处理、推理、候选解码、NMS、语义过滤、四边形检查和 PnP，发布装甲板结果。

阅读顺序：

| 文件 | 内容 |
| --- | --- |
| `ArmorDetectorNetwork.hpp` | 模型选择与初始化 |
| `ArmorDetectorRuntime.hpp` | 处理阶段、输入槽和结果发布 |
| `infer/ArmorDetectorModelRegistry.hpp` | 模型枚举与工件、后端的对应 |
| `ArmorDetectorPnPSolver.hpp` | PnP 求解 |

OpenVINO 使用同步推理 worker，各输入槽分别持有请求与输出。输入繁忙导致的丢帧、推理失败和后处理失败分别统计。

模型格式和门限说明见[模型与数据](/算法组/models-data)。

## ArmorTracker

Tracker 用检测角点、原生标定和安装外参获得观测，再更新车辆状态与 EKF。

`ArmorTrackerPipeline.hpp` 负责订阅、发布和预览，`ArmorTrackerCore.hpp` 连接输入与核心处理，`ArmorTrackerModel.hpp` 实现观测、状态模型和滤波。

不同装甲板编号分别维护目标状态。目标选择考虑观测数量、距离、图像面积、自旋速度和视轴角差；`switch_margin` 控制换目标所需的分差。

常用参数在 `cfg.tracker`：

| 参数 | 用途 |
| --- | --- |
| `require_target_tag`、`target_tag_id` | 是否只跟踪指定编号 |
| `min_detect_count` | 进入跟踪所需的观测次数 |
| `max_temp_lost_count` | 暂时丢失后的保留次数 |
| `target_select` | 各评分项的权重、归一化参数和切换裕量 |

回放时间戳退回起点时，Tracker 会清除旧状态并重新建立时间基线。

## Aimer

`AimerTargetModel.hpp` 负责目标预测和装甲面展开，`AimerMath.hpp` 处理角度与弹道，`AimerPlanner.hpp` 生成云台计划，`AimerImpl.hpp` 连接回调与输出。

弹道模型包含二次空气阻力，使用 RK4 积分和一维求根寻找低弹道仰角。无法求解时输出空命令。

启用 MPC 后，yaw 和机械俯仰分别使用双积分模型。当前预测窗口为 100 个样本、步长 0.01 s，参考轨迹会逐步重新选择装甲面。

开火需要同时满足装甲面可打、计划与命中候选一致、命令稳定和云台对齐。姿态反馈来自 `host/gimbal_quat`。

延迟、阻力、加速度限制和 MPC 权重在 Aimer 的 `cfg` 中配置。预览由 `AimerPreview.hpp` 投影同帧目标，不参与弹道和 MPC 计算。

修改后使用[测试与回归](/算法组/testing)中的固定场景检查。识别精度、位姿误差和命中率需另用对应数据评测。

源码：[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector/tree/7eb9598decd84c9c04352a51a845cf544de2cf0a)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker/tree/ce1d472c4562c91bb875380f0ca1f8d2944381c2)、[Aimer](https://github.com/QDU-Robomaster/Aimer/tree/0ce19e6b6ac0a3b54680b39362f33e6780761515)。
