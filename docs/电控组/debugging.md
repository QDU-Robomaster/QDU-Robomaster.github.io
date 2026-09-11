---
id: ee-debugging
title: 调试与上板
slug: /电控组/debugging
sidebar_position: 8
---

# 调试与上板

上板前确认固件对应的板卡和 YAML。第一次调试新配置，先断开执行机构动力，检查输入和反馈后再逐项通电。

## 常见问题

| 现象 | 检查位置 |
| --- | --- |
| 生成入口失败 | YAML 路径、模块是否下载、构造参数是否匹配 |
| CMake 找不到编译器 | 交叉工具链 PATH、工具链文件、构建目录 |
| 模块接口编译不过 | LibXR 和模块版本、生成文件是否更新 |
| 探针连接失败 | 供电、SWD 接线、芯片型号、探针设置 |
| 下载成功但 LED 不动 | 程序是否运行、断点、异常、模块初始化 |
| 终端有输出，主机收不到自瞄数据 | FS/HS CDC 接线、收发模块的串口名与 Topic 清单 |
| `Topic not found` | Topic 创建者、名称、域、模块构造顺序 |
| 电机有反馈但没有动作 | CMD 控制源、工作模式、事件绑定、输出路径 |

C 板的 USB 和其他外设名称见[外设映射](/电控组/hardware-mapping)。

## 看哪些状态

调电机先看反馈 ID、位置、速度和在线状态，再看控制目标和输出。IMU 先观察静止读数，然后分别做单轴动作，检查角速度与姿态方向。

自动控制没有响应时，从主机输入沿 `HostData → CMD → Gimbal` 查。遥控切换无效时，检查输入模块是否产生事件，以及 `EventBinder` 的目标实例和事件名。

调试入口由当前配置实际加载的模块提供。命令名称和参数可从模块帮助或 `CommandFunc` 查看。

## SharedTopic 接收统计

SharedTopic 会注册 `shared_topic:<uart_name>` 终端入口，支持：

```text
monitor [time_ms] [interval_ms]
```

其中串口名取自当前 YAML。统计用于查看接收数据量，业务是否正常还需要检查收到的 Topic 内容。

## 报告问题

带上板卡、BSP 和模块提交、运行 YAML、复现步骤，以及从启动开始的相关日志。异常或断言最好同时附调用栈。

修复后用相同配置和接线复测。检查范围写具体，例如“默认 LED 程序上板通过”或“全向步兵 3 配置编译通过”。

源码：[bsp-dev-c](https://github.com/QDU-Robomaster/bsp-dev-c)、[SharedTopic](https://github.com/xrobot-org/SharedTopic)。
