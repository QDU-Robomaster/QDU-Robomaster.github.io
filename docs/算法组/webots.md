---
id: algorithm-webots
title: Webots 仿真
slug: /算法组/webots
sidebar_position: 5
---

# Webots 仿真

`bsp-webots-autoaim` 的目的不是重新写一套“仿真自瞄”，而是在可重复的虚拟环境中运行真实的 Detector、Tracker 和 Aimer 链路。

第一次跑通环境和 world，请从 [快速上手](/算法组/quick-start) 开始；仓库本身的环境与构建命令见 [`bsp-webots-autoaim` 开发环境](/dev-environment/bsp-webots-autoaim)。

## 1. 整体链路

```text
Webots world
    ↓
WebotsCamera
    ↓
CameraSync / CameraFrameSync
    ↓
ArmorDetector (OpenVINO)
    ↓
ArmorTracker
    ↓
Aimer
    ↓
WebotsGimbal / WebotsFireNotify
```

当前新人培训统一使用 OpenVINO。模型、后端和运行配置由 BSP 显式选择；环境不满足时应直接报错，而不是静默切换另一套推理路径。

## 2. Webots 替换了什么

仿真主要替换真实世界里的设备和物理环境：

| 模块 | 作用 |
| --- | --- |
| `WebotsCamera` | 读取 Webots 相机、陀螺仪、加速度计和姿态信息。 |
| `CameraSync` / `CameraFrameSync` | 保留触发、同步和图像-IMU 对齐流程。 |
| `WebotsReferee` | 提供仿真裁判信息和弹速等状态。 |
| `WebotsGimbal` | 模拟云台动力学、执行和姿态反馈。 |
| `WebotsFireNotify` | 把 Aimer 的发射许可转换成仿真出弹事件。 |

下面三个核心算法模块仍是正常模块：

```text
ArmorDetector
ArmorTracker
Aimer
```

因此在 Webots 中改 Detector / Tracker / Aimer，和后续在真实系统里使用这些模块具有直接对应关系。

## 3. 主要入口

常用位置：

1. `User/xrobot.yaml`：BSP 模块实例和参数；
2. `Modules/modules.yaml`：XRobot 模块依赖；
3. `webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt`：主要 world；
4. `webots/protos/`：目标车和装甲板等仿真实体；
5. `run_headless_preview.py`：自动启动和 smoke test。

## 4. 图像与同步

Webots 相机不是预先录制的视频播放器。world 实时渲染图像，`WebotsCamera` 从相机节点获取当前图像和 IMU 状态，然后进入与正常视觉链路一致的同步接口。

默认链路保持：

```text
camera image / IMU
    ↓
CameraFrameSync
    ↓
synchronized frame
    ↓
ArmorDetector
```

因此可以检查：

- 图像时序；
- 图像与 IMU 对齐；
- Detector 输入；
- Tracker 状态更新；
- Aimer 输出；
- 云台闭环后的新相机视角。

## 5. Detector / Tracker / Aimer 预览

当前 BSP 可以同时提供三路 Web 预览：

```text
/stream/armor_detector
/stream/armor_tracker
/stream/aimer_preview
```

新人调试时优先沿这三层观察问题：

```text
Detector 看见了吗？
    ↓
Tracker 跟住了吗？
    ↓
Aimer 给出的目标合理吗？
```

这样比一开始只看“打没打中”更容易定位问题属于感知、状态估计还是瞄准规划。

## 6. Headless 与 GUI

两种方式都是同一个 BSP。

GUI 适合：

- 新人培训；
- 看世界和机器人运动；
- 直观看云台响应；
- 交互式调试。

Headless 适合：

- 自动 smoke test；
- 回归测试；
- 批量运行；
- CI/脚本化验证。

`run_headless_preview.py` 会在限定时间内要求真实 pipeline 帧出现；只有 controller 正常连接但没有 Detector 帧，不应该算通过。

## 7. Webots 能验证什么

适合验证：

- 模块能否组合和启动；
- OpenVINO Detector 是否正常推理；
- Detector → Tracker → Aimer 数据链；
- 图像 / IMU 同步关系；
- 目标运动下的跟踪行为；
- 云台控制响应；
- 发射许可逻辑；
- 可重复的回归场景。

不能用它代替：

- 真实相机成像差异；
- 实际机械装配误差；
- 真实通信链路的所有故障；
- 最终实车性能验收。

Webots 更适合作为“真实算法链路的可控软件在环环境”，而不是最终性能结论。

## 8. 新人后续学习顺序

建议按以下顺序：

```text
先跑通 world
→ 看懂三路 preview
→ 理解 User/xrobot.yaml
→ 理解 Detector 输入输出
→ 理解 Tracker 状态
→ 理解 Aimer 输出
→ 修改一个小参数并观察变化
→ 再进入具体算法任务
```

完整的新人流程见 [快速上手](/算法组/quick-start)，仓库环境与构建命令见 [`bsp-webots-autoaim` 开发环境](/dev-environment/bsp-webots-autoaim)。
