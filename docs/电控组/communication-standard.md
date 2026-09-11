---
id: ee-communication-standard
title: 通信规范
slug: /电控组/communication-standard
sidebar_position: 6
---

# 通信规范

模块间使用 Topic 传递数据，模式切换等动作通过 Event 连接。框架接口见 [消息系统](https://xrobot-org.github.io/docs/basic_coding/middleware/message)和[事件系统](https://xrobot-org.github.io/docs/basic_coding/middleware/event)。

## 主机与 C 板

以 `omni_infantry_3.yaml` 和 Linux `hik.yaml` 为例，通信清单如下：

| 方向 | Topic | 内容 |
| --- | --- | --- |
| 主机 → C 板 | `target_euler` | 云台角度、角速度、角加速度 |
| 主机 → C 板 | `fire_notify` | 发射许可 |
| 主机 → C 板 | `camera_sync_command` | 相机同步命令 |
| C 板 → 主机 | `gimbal_gyro`、`gimbal_accl`、`gimbal_quat` | IMU 与姿态 |
| C 板 → 主机 | `camera_sync_result` | 触发与同步结果 |
| C 板 → 主机 | `robot_game_ref` | 裁判摘要 |

C 板使用默认 Topic 域，Linux 接收端将这些数据放入 `host` 域。

C 板接收侧配置：

```yaml
- id: sharedtopic
  name: SharedTopic
  constructor_args:
    uart_name: usb_otg_hs_cdc
    buffer_size: 512
    topic_configs:
    - target_euler
    - fire_notify
    - camera_sync_command
```

同一配置中的 `SharedTopicClient` 负责反方向发送。FS 与 HS CDC 的用途见[外设映射](/电控组/hardware-mapping)。

## SharedTopic 的几个名字

`SharedTopic` 和 `SharedTopicClient` 是两个模块仓库。前者使用 `Topic::Server` 接收并解析串口数据，后者订阅本地 Topic、打包并发送。USB CDC 同样可以承载这条链路。

`LibXR::LinuxSharedTopic` 则是同机跨进程共享内存接口，与这两个串口模块不同。

两个串口模块构造时会查找 Topic。出现 `Topic not found` 时，检查创建顺序、名称和域；接收 Topic 应在接收模块启动前创建好。

## 云台目标字段

当前 Aimer 将机械俯仰同时写入 `rol`、`pit`，以及各自的 `_dot`、`_ddot` 字段。实体 HostData/CMD/Gimbal 路径使用 `pit`，WebotsGimbal 使用 `rol`。偏航使用 `yaw` 一组字段。

角度单位为 rad，角速度为 rad/s，角加速度为 rad/s²。这一兼容映射见 [Aimer 的发布代码](https://github.com/QDU-Robomaster/Aimer/blob/0ce19e6b6ac0a3b54680b39362f33e6780761515/AimerImpl.hpp)。

## 接口变更

修改 Topic 时同时检查收发两侧的类型、名称、域、单位和时间戳。异步处理还要确认消息有效期，回调中借用的指针不能直接留给另一个线程。

遥控事件在机器人 YAML 的 `EventBinder` 中连接。排查模式切换时，依次看输入事件、绑定关系和 CMD 当前控制源。

源码：[C 板收发配置](https://github.com/QDU-Robomaster/bsp-dev-c/blob/ddba1b8b9697adfb0fdafbaaa6a3929254c328fb/User/RobotConfig/omni_infantry_3.yaml)、[Linux 收发配置](https://github.com/QDU-Robomaster/bsp-linux-autoaim/blob/abef156bac8805ccccda30d092fa5979a4aef9ef/User/RunConfig/hik.yaml)。
