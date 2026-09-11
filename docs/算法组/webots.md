---
id: algorithm-webots
title: Webots 仿真
slug: /算法组/webots
sidebar_position: 8
---

# Webots 仿真

`bsp-webots-autoaim` 不是把 `bsp-linux-autoaim` 原样搬进 Webots。算法主链仍然是 Detector → Tracker → Aimer，但实车上原本由相机、MCU、云台和发射机构完成的部分，需要在仿真里补出来。

安装、编译和启动步骤见[快速上手](/算法组/quick-start)。

## 和 Linux 实车自瞄有什么不同

| 实车 Linux 自瞄 | Webots 仿真 |
| --- | --- |
| `HikCamera` 读取真实相机 | `WebotsCamera` 读取 Webots 渲染图像 |
| 实际 IMU / 相机同步 | Webots 模拟 gyro、accelerometer、inertial unit，再走 CameraSync / CameraFrameSync |
| `SharedTopic` / `SharedTopicClient` 通过 `DevC-USB` 与 MCU 通信 | 当前 Webots BSP 不走真实串口，也没有 pipe/SharedTopic 串口桥；host Topic 在 controller 进程内直接被仿真模块消费 |
| MCU 执行云台控制 | `WebotsGimbal` 接收 `host/target_euler`，驱动 Webots 云台电机和动力学 |
| 实际发射机构执行开火 | `WebotsFireNotify` 模拟开火请求、射频限制、延迟和热量，并产生出弹事件 |
| 实际裁判系统提供状态 | `WebotsReferee` 生成仿真裁判摘要 |
| 真实目标运动 | world 中的目标车和 `forced_target_simple.py` 负责目标运动 |

所以 Webots 多出来的重点不是另一套 Detector / Tracker / Aimer，而是**把算法前后的物理世界和下位机行为补出来**。

当前版本没有模拟 Linux ↔ MCU 的真实串口传输时延、丢包和 USB 驱动行为。以后如果需要做基于 pipe/PTY 的串口仿真，应单独加在通信层，不能把当前进程内 Topic 当成已经模拟了串口。

## 当前结构

```text
Windows / Linux 上的 Webots
  world
  ├─ 相机图像
  ├─ gyro / accelerometer / inertial unit
  ├─ 目标车辆运动
  ├─ 云台关节和电机
  └─ 发射机构相关实体
                 ↕ external controller
rm_auto_aim
  WebotsCamera
      ↓
  CameraSync / CameraFrameSync
      ↓
  ArmorDetector
      ↓
  ArmorTracker
      ↓
  Aimer
      ├─ host/target_euler ─→ WebotsGimbal ─→ 云台电机
      └─ host/fire_notify  ─→ WebotsFireNotify ─→ 出弹事件
                                 ↓
                           WebotsReferee
```

Detector、Tracker、Aimer 和这些仿真模块都在同一个 `rm_auto_aim` 进程内。Webots 自身单独运行，通过 external controller 接口连接这个进程。

## 几个仿真模块分别做什么

### WebotsCamera

读取 Webots Camera 图像，并从仿真设备取得：

```text
camera_gyro
camera_accelerometer
camera_inertial_unit
```

这些数据继续进入现有 CameraSync / CameraFrameSync，所以后面的 Detector、Tracker 不需要为 Webots 另写一套输入接口。

### WebotsGimbal

Aimer 发布 `host/target_euler` 后，实车上这份命令最终会交给下位机执行；Webots 中由 `WebotsGimbal` 读取同一个 payload，做云台控制并驱动仿真电机。

它还读取相机姿态和 `camera_gyro` 作为反馈，因此能看到云台运动、惯性和控制误差，而不是只把目标角瞬间写到关节位置。

### WebotsFireNotify

读取 `host/fire_notify`，模拟：

- 开火请求；
- 最大射频；
- 开火延迟；
- 单发热量；
- 热量上限和冷却；
- 实际出弹事件。

这部分用来把 Aimer 的“请求开火”和仿真里真正发生一次发射区分开。

### WebotsReferee

把发射机构状态整理成算法侧使用的裁判摘要，例如弹速、热量上限和冷却等。这样 Aimer 仍然通过和实车相同的 `robot_game_ref` 语义读取状态。

### forced_target_simple

控制 world 中目标车的运动，用于稳定重复的跟踪和瞄准测试。它不是算法模块，只是仿真目标运动脚本。

## 文件位置

| 文件或目录 | 内容 |
| --- | --- |
| `User/xrobot.yaml` | 仿真模块实例和参数 |
| `webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt` | 主 world |
| `webots/protos/` | 目标车、装甲板等 PROTO |
| `webots/controllers/forced_target_simple/forced_target_simple.py` | 目标运动 |
| `Modules/WebotsCamera/` | 图像和 IMU 仿真输入 |
| `Modules/WebotsGimbal/` | 云台控制和动力学接口 |
| `Modules/WebotsFireNotify/` | 发射机构模拟 |
| `Modules/WebotsReferee/` | 裁判摘要模拟 |
| `run_headless_preview.py` | 无头重复测试 |

## GUI 和无头运行

日常开发先用 GUI。直接在 Webots 里打开 `.wbt`，观察目标、相机和云台运动，再从容器或 Linux 终端连接 controller。

无头模式使用同一个 world，适合回归测试和长时间跑数据，不适合作为新人第一次接触 Webots 的入口。

当前相机渲染周期和同步触发周期是两套设置。`WEBOTS_SIM_FLOW_RATE` 控制仿真相对墙钟的目标倍率，实际速度还会受 Webots 渲染和 OpenVINO 推理耗时影响。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[WebotsGimbal](https://github.com/QDU-Robomaster/WebotsGimbal)、[WebotsFireNotify](https://github.com/QDU-Robomaster/WebotsFireNotify)、[WebotsReferee](https://github.com/QDU-Robomaster/WebotsReferee)。
