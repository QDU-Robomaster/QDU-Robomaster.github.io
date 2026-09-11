---
id: ee-robot-configs
title: 机器人配置
slug: /电控组/robot-configs
sidebar_position: 3
---

# 机器人配置

C 板的车型配置在 `User/RobotConfig/`。电机 ID、反向、PID、几何参数和事件绑定都在对应 YAML 中修改。

## 配置清单

| 文件 | 已配置的主要功能 |
| --- | --- |
| `aerial.yaml` | 姿态、遥控、云台、步兵发射机构、主机通信 |
| `dart.yaml` | 电机、遥控、裁判、Dart、主机通信 |
| `hero.yaml` | 底盘、云台、MiniGimbal、HeroLauncher、功率管理、通信 |
| `omni_infantry_3.yaml` | 全向底盘、云台、步兵发射机构、相机同步、通信 |
| `omni_infantry_4.yaml` | 另一份全向步兵配置，设备分配和参数单独维护 |
| `sentry.yaml` | 底盘、云台、步兵发射机构、SentryProtocol、功率管理、通信 |
| `helm_infantry.yaml` | 仅 BlinkLED |
| `radar.yaml` | 仅 BlinkLED |
| `wheel_leg.yaml` | 仅 BlinkLED |

根目录下的默认配置是 `User/xrobot.yaml`，也只有 BlinkLED。表中后三份车型文件目前还没有整车模块。

旧命令里的 `omni_infantry.yaml` 已不在这份源码中，使用 `_3` 或 `_4` 文件。

## 切换配置

在仓库根目录执行：

```bash
xrobot_gen_main --config User/RobotConfig/omni_infantry_3.yaml
```

然后重新编译。也可以让构建脚本完成生成与编译：

```bash
bash tools/build.sh --skip-format -c User/RobotConfig/omni_infantry_3.yaml -b build/omni3
```

同一工作树只保留一份生成入口。并行构建不同车型时需要分开工作树，否则生成器会同时写 `User/xrobot_main.hpp`。

## 电机配置示例

`omni_infantry_3.yaml` 中的一路轮电机：

```yaml
- id: motor_wheel_0
  name: RMMotor
  constructor_args:
    param:
      model: RMMotor::Model::MOTOR_M3508
      reverse: false
      feedback_id: 515
      can_bus_name: can1
```

`motor_wheel_0` 是实例名，`RMMotor` 是模块类型，`can1` 是 BSP 注册的 CAN 对象。换设备时核对型号、反馈 ID 和反向；其他模块通过实例引用使用这台电机。

## 改动位置

车型参数改 YAML；板级外设改 `.ioc` 和 `User/app_main.cpp`；控制算法改对应模块仓库。新增配置项还需更新模块 manifest 和构造参数。

外设名称见[外设映射](/电控组/hardware-mapping)，功能实现见[模块索引](/电控组/modules)。

源码：[RobotConfig](https://github.com/QDU-Robomaster/bsp-dev-c/tree/ddba1b8b9697adfb0fdafbaaa6a3929254c328fb/User/RobotConfig)。
