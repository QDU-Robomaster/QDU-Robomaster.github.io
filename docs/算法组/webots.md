---
id: algorithm-webots
title: Webots 仿真
slug: /算法组/webots
sidebar_position: 8
---

# Webots 仿真

Webots 提供场景、相机、IMU 和机构动力学。`rm_auto_aim` 作为 external controller 接入，运行 OpenVINO Detector、Tracker 和 Aimer。

安装与启动步骤见[快速上手](/算法组/quick-start)。

## 程序怎么连接

```text
原生 Webots
  场景、相机渲染、目标运动、云台动力学
                    ↕ TCP
rm_auto_aim
  WebotsCamera → CameraFrameSync → Detector → Tracker → Aimer
  WebotsReferee                 WebotsGimbal / WebotsFireNotify
                    ↓
                浏览器预览
```

Windows 把 controller 放在 Docker 中，Linux 可以直接原生运行。Detector、Tracker、Aimer 都在同一个 controller 进程内。

Compose 的 `autoaim-build` 用来编译，`autoaim-preview` 用来运行无头检查。Windows 原生 GUI 路线只需要在容器中运行 controller。

## 文件位置

| 文件或目录 | 内容 |
| --- | --- |
| `User/xrobot.yaml` | 模块和参数 |
| `webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt` | 主场景 |
| `webots/protos/` | 目标车和装甲板模型 |
| `webots/controllers/forced_target_simple/forced_target_simple.py` | 目标运动控制 |
| `run_headless_preview.py` | 启动、记录和限时停止 |

URL 末尾的 `self` 对应场景中的机器人名。一个机器人同一时刻只连接一个 controller。

## 仿真模块

`WebotsCamera` 获取渲染图像和 IMU；CameraSync 与 CameraFrameSync 处理触发和同步。

`WebotsGimbal` 接收目标角和反馈，通过控制输出驱动仿真云台。`WebotsFireNotify` 根据发射许可、延迟、射频和热量设置生成出弹事件。`WebotsReferee` 提供裁判摘要。

当前配置直接通过进程内 Topic 连接这些模块，没有实例化 Host/MCU 的 SharedTopic 管道桥。

## GUI 与无头运行

GUI 适合观察场景、相机视角和机构运动。无头脚本使用同一个 world，在 Xvfb 环境中渲染，方便重复运行测试。

仿真步长、相机更新周期、同步周期和墙钟速度分别设置。默认相机周期为 10 ms，同步触发为 20 ms；`WEBOTS_SIM_FLOW_RATE` 设置目标仿真速度，实际速度还受渲染和推理耗时影响。

实体相机延迟、IMU 安装、USB 通信和机械误差仍需实机检查。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[WebotsGimbal](https://github.com/QDU-Robomaster/WebotsGimbal)、[WebotsFireNotify](https://github.com/QDU-Robomaster/WebotsFireNotify)。
