---
id: algorithm-details
title: 算法细节
slug: /算法组/algorithm-details
sidebar_position: 4
---

# 算法细节

这里记录自瞄主链路里会影响结果的核心计算。模型训练、数据集整理和离线评测另行记录。

## 1. ArmorDetector

`ArmorDetector` 的输出不是普通框，而是带四角点和 PnP 位姿的装甲板结果。

处理流程：

1. 从 `CameraFrameSync` 读取同步帧。
2. 将图像送入 OpenVINO 模型。
3. 解码颜色、编号、置信度和四角点。
4. 过滤低置信度、颜色不匹配、编号无效或几何异常的候选。
5. 对有效候选做 PnP，发布 `armor_detector/armors_frame`。

当前配置启用数字 refine：检测候选成立后，再用数字分类结果修正编号；置信度不足或尺寸类型冲突时不会覆盖 detector 编号。

## 2. ArmorTracker

`ArmorTracker` 读取 Detector 结果和同帧 IMU，使用 `camera_mount_to_body` 手眼外参把相机观测转换到公开本体系。

Tracker 内部按装甲板编号维护目标状态。同一帧出现多个编号时，各编号独立更新，最后只输出当前选中的目标。

目标选择会参考：

1. 近期观测数量。
2. 距离。
3. 图像面积。
4. 自旋速度。
5. 相对当前视轴的角差。
6. 切换裕量。

输出 `tracker/target_frame` 使用公开坐标约定：右手系，`x` 向右，`y` 向前，`z` 向上。

## 3. Aimer

`Aimer` 在 Tracker 输出之后工作。它会按延迟预测目标位置，展开可打装甲板，解算弹道，再生成 yaw / roll 云台目标。

当前 Aimer 关注这些输入：

1. `tracker/target_frame`：目标状态。
2. `host/robot_game_ref`：弹速、热量上限和冷却值等裁判信息。
3. `host/gimbal_quat`：云台姿态反馈，用于自动开火判断。

弹道解算使用带空气阻力的弹丸运动模型。云台目标规划使用 yaw / roll 双轴 TinyMPC。自动开火还会检查命中候选、命令稳定性和云台反馈。

## 4. 坐标边界

坐标、目标角和 `host/target_euler` 字段含义以 [坐标系规范](/coordinate-system-standard) 为准。算法组页不重新定义坐标。
