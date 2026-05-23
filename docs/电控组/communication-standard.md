---
id: ee-communication-standard
title: 通信规范
slug: /电控组/communication-standard
sidebar_position: 4
---

# 通信规范

电控通信优先沿用 XRobot / LibXR 的 Topic、Event 和 SharedTopic。新增接口先看这些机制是否已经覆盖，再考虑设备私有协议。

## 1. 通信分工

1. `Topic`：连续状态和数据流，例如姿态、电机状态、控制目标。
2. `Event`：离散动作和模式切换，例如遥控器输入触发模块模式。
3. `SharedTopic` / `SharedTopicClient`：把 Topic 数据转发到另一块板或主机。
4. `RamFS` / `Terminal`：调试命令和状态查看入口。
5. `CAN` / `UART`：电机、裁判系统、串口设备和板间链路。

## 2. 配置位置

电控工程的通信关系主要看 `User/RobotConfig/*.yaml`。

1. 模块实例通过配置文件创建。
2. 模块依赖通过配置文件连接。
3. Topic 名、UART 名、CAN 总线名以机器人配置为准。
4. `EventBinder` 用来连接输入事件和模块事件。
5. SharedTopic 的串口名、收发 topic 清单也在机器人配置里。

## 3. 跨组接口

算法组和电控组之间共享的数据，以 [坐标系规范](/coordinate-system-standard) 为准。

1. 坐标系、单位、时间戳含义保持一致。
2. Topic 名和字段语义改动前，确认两侧使用方同步更新。
3. 串口名、相机配置、手眼外参等运行差异写在对应运行配置里。

## 4. 排查顺序

通信异常通常按这个顺序排查：

1. 物理链路：线束、电源、终端电阻、串口设备。
2. 传输配置：CAN ID、UART 名、波特率。
3. 框架配置：Topic 名、Event 绑定、SharedTopic 配置。
4. 业务状态：模式、超时、离线保护。
