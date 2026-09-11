---
id: ee-modules
title: 模块索引
slug: /电控组/modules
sidebar_position: 4
---

# 模块索引

C 板的 `Modules/modules.yaml` 声明了下面这些依赖。实际运行哪些模块，取决于选择的机器人 YAML。

## 功能对应

| 模块 | 用途 |
| --- | --- |
| `BlinkLED`、`BuzzerAlarm` | LED 和蜂鸣器提示 |
| `BMI088`、`MadgwickAHRS` | IMU 采集、温度控制和姿态解算 |
| `CameraSync` | 相机触发与同步事件 |
| `DR16`、`VT13` | 遥控和控制输入 |
| `CMD` | 控制源选择及底盘、云台、发射命令 |
| `Motor`、`RMMotor`、`DMMotor` | 通用电机接口及具体电机驱动 |
| `Chassis` | 底盘控制 |
| `Gimbal`、`MiniGimbal` | 云台控制 |
| `InfantryLauncher`、`HeroLauncher`、`Dart` | 发射机构控制 |
| `LegVmc` | 腿部虚拟模型控制 |
| `SuperPower`、`PowerControl` | 超级电容通信与功率控制 |
| `Referee`、`SentryProtocol` | 裁判系统与哨兵相关协议 |
| `HostData` | 将主机目标接入 CMD |
| `SharedTopic`、`SharedTopicClient` | 跨设备 Topic 收发 |
| `EventBinder` | 连接模块事件 |

例如依赖清单包含 `LegVmc`，但 `wheel_leg.yaml` 目前只有 BlinkLED。各车型已经配置的内容见[机器人配置](/电控组/robot-configs)。

## 模块从哪里来

`Modules/sources.yaml` 配置来源索引。清单中的 `xrobot-org/` 和 `qdu-future/` 是索引使用的前缀，实际仓库地址由索引解析。

初始化后，模块目录通常各自带有 `.git`。查看云台模块的版本和修改：

```bash
git -C Modules/Gimbal log -1 --oneline
git -C Modules/Gimbal status --short
git -C Modules/Gimbal diff
```

功能改动提交到模块仓库，设备和参数改动提交到 BSP。添加模块、manifest 和生成器的用法见 [XRobot 工程管理](https://xrobot-org.github.io/docs/proj_man)。

源码：[模块清单](https://github.com/QDU-Robomaster/bsp-dev-c/blob/ddba1b8b9697adfb0fdafbaaa6a3929254c328fb/Modules/modules.yaml)、[来源索引](https://github.com/QDU-Robomaster/bsp-dev-c/blob/ddba1b8b9697adfb0fdafbaaa6a3929254c328fb/Modules/sources.yaml)。
