---
id: ee-overview
title: 电控组文档总览
slug: /电控组
sidebar_position: 1
---

# 电控组文档总览

电控工程使用 XRobot / LibXR。板级初始化放在 BSP，底盘、云台等功能放在独立模块里，各车的设备和参数写在 YAML 中。

第一次使用从[快速上手](/电控组/quick-start)开始。框架安装、代码生成和模块创建见 [XRobot 文档](https://xrobot.work/)。

## 常用工程

| 仓库 | 用途 | 环境配置 |
| --- | --- | --- |
| `bsp-dev-c` | C 板电控，包含多种机器人配置 | [bsp-dev-c](/dev-environment/bsp-dev-c) |
| `bsp-dev-mc02` | MC02 板级工程 | [bsp-dev-mc02](/dev-environment/bsp-dev-mc02) |

C 板默认程序只有 LED 闪烁，整车配置在 `User/RobotConfig/`。MC02 的默认程序为蜂鸣器测试。

## 工程里几个常用位置

| 位置 | 内容 |
| --- | --- |
| `User/app_main.cpp` | 创建外设对象、注册 HardwareContainer、启动应用 |
| `User/RobotConfig/*.yaml` | 机器人模块、设备参数和事件绑定 |
| `User/xrobot.yaml` | 默认运行配置 |
| `User/xrobot_main.hpp` | 按 YAML 生成的模块入口 |
| `Modules/modules.yaml` | 模块依赖清单 |
| `Modules/sources.yaml` | 模块来源索引 |
| `Modules/<Name>/` | 独立模块仓库 |
| `Middlewares/Third_Party/LibXR/` | LibXR submodule |

## 文档目录

[机器人配置](/电控组/robot-configs)列出各份 YAML 的内容；[模块索引](/电控组/modules)用于查找功能实现；[外设映射](/电控组/hardware-mapping)对应 C 板的 CAN、串口、USB 和 GPIO。

日常修改用到的规则和排查方法分别放在[代码规范](/电控组/code-standard)、[通信规范](/电控组/communication-standard)和[调试与上板](/电控组/debugging)。提交代码按站内[团队工作流](/git-collaboration)执行。
