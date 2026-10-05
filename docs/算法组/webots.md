---
id: algorithm-webots
title: Webots 仿真
slug: /算法组/webots
sidebar_position: 8
---

# Webots 仿真

Webots 版本保留了和实车相同的 Detector → Tracker → Aimer 主链路，并用仿真设备替代相机、云台、发射机构和部分下位机功能。这样可以在没有整车的情况下观察完整的感知—跟踪—瞄准闭环。

安装、编译和启动见[快速上手](/算法组/quick-start)。

## 仿真覆盖哪些东西

| 实车 | Webots |
| --- | --- |
| `HikCamera` 读取工业相机 | `WebotsCamera` 读取 Webots Camera 图像 |
| 相机 IMU 与触发同步 | Webots 提供 gyro、accelerometer、inertial unit，继续走 CameraSync / CameraFrameSync |
| Linux 通过 `SharedTopic` / `SharedTopicClient` 与 C 板交换控制数据 | 仿真模块直接接收同一组 host Topic，在 controller 内完成执行与反馈 |
| C 板控制云台 | `WebotsGimbal` 驱动仿真云台电机和关节 |
| 发射机构执行开火 | `WebotsFireNotify` 处理开火请求、射频、延迟和热量，并生成出弹事件 |
| 裁判系统提供比赛状态 | `WebotsReferee` 提供弹速、热量等算法需要的裁判信息 |
| 对手机器人运动 | world 和 `forced_target_simple.py` 控制目标运动 |

这套仿真主要验证视觉算法和机构闭环。Linux 实车上的 USB / 串口驱动、通信时延和丢包属于另一层问题，不参与 Webots 的日常算法调试。

## 系统连接

```text
Webots
  world
  ├─ Camera
  ├─ gyro / accelerometer / inertial unit
  ├─ 目标车辆
  ├─ 云台关节与电机
  └─ 发射相关实体
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
      ├─ host/target_euler ─→ WebotsGimbal ─→ 云台
      └─ host/fire_notify  ─→ WebotsFireNotify ─→ 出弹事件
                                 ↓
                           WebotsReferee
```

Webots 和 `rm_auto_aim` 是两个进程，通过 external controller 接口连接。Detector、Tracker、Aimer 以及 Webots 侧的适配模块都运行在 `rm_auto_aim` 中。

## 仿真模块

### WebotsCamera

`WebotsCamera` 读取场景中的相机图像，同时发布：

```text
camera_gyro
camera_accelerometer
camera_inertial_unit
```

后面的 CameraSync、CameraFrameSync、Detector 和 Tracker 与实车共用，因此算法模块不需要针对 Webots 再维护一套输入接口。

### WebotsGimbal

Aimer 输出 `host/target_euler`。实车上这组目标值交给下位机执行，Webots 中则由 `WebotsGimbal` 驱动云台模型。

云台姿态和 `camera_gyro` 再作为反馈回到算法侧，因此仿真中能看到转动过程、惯性和跟踪误差，而不是简单地把关节瞬间设到目标角。

### WebotsFireNotify

`WebotsFireNotify` 接收 `host/fire_notify`，负责把 Aimer 的开火请求变成仿真中的发射事件。这里会处理射频、开火延迟、单发热量、热量上限和冷却等约束。

### WebotsReferee

`WebotsReferee` 将发射机构状态整理为 `robot_game_ref` 使用的裁判信息。Aimer 因此可以沿用实车上的弹速和热量接口。

### forced_target_simple

`forced_target_simple.py` 控制目标车运动，用来产生稳定、可重复的跟踪和瞄准场景。它属于 world 的测试逻辑，不属于自瞄算法。

## 主要文件

| 文件或目录 | 内容 |
| --- | --- |
| `User/xrobot.yaml` | 仿真模块实例与参数 |
| `webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt` | 主测试场景 |
| `webots/protos/` | 目标车、装甲板等 PROTO |
| `webots/controllers/forced_target_simple/forced_target_simple.py` | 目标运动脚本 |
| `Modules/QDU-Robomaster/WebotsCamera/` | 图像与 IMU 输入 |
| `Modules/QDU-Robomaster/WebotsGimbal/` | 云台模型接口 |
| `Modules/QDU-Robomaster/WebotsFireNotify/` | 发射机构接口 |
| `Modules/QDU-Robomaster/WebotsReferee/` | 裁判信息接口 |
| `run_headless_preview.py` | 无头回归测试 |

## GUI 与无头运行

日常开发用 GUI 最直观：在 Webots 中打开 `.wbt`，观察目标、相机画面和云台运动，再连接 controller。

无头模式使用同一个 world，适合自动回归和长时间测试。`WEBOTS_SIM_FLOW_RATE` 控制仿真时间相对墙钟的目标倍率；最终能跑多快还取决于 Webots 渲染和 OpenVINO 推理速度。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[WebotsGimbal](https://github.com/QDU-Robomaster/WebotsGimbal)、[WebotsFireNotify](https://github.com/QDU-Robomaster/WebotsFireNotify)、[WebotsReferee](https://github.com/QDU-Robomaster/WebotsReferee)。
