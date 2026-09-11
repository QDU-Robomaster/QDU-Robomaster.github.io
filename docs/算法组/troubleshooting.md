---
id: algorithm-troubleshooting
title: 常见问题
slug: /算法组/troubleshooting
sidebar_position: 12
---

# 常见问题

## 构建失败

| 报错 | 处理 |
| --- | --- |
| `Missing modules` | 首次 Docker 构建加 `-e XR_FORCE_XROBOT_SETUP=1`；Linux 执行 `xrobot_setup` |
| `xrobot_setup: command not found` | 激活安装 XRobot 的 Python 环境，检查 `python3 -m pip show xrobot` |
| 找不到 OpenVINO | 安装 C++ Runtime，并设置含 `OpenVINOConfig.cmake` 的 `OpenVINO_DIR` |
| 找不到 OpenCV | 安装 C++ 开发库，必要时传入 `OpenCV_DIR`；Python 的 cv2 不能替代它 |
| 找不到 Webots 头文件或库 | 检查 `WEBOTS_HOME` 和 controller SDK 版本 |
| 脚本出现 `bash\r` 或 `^M` | 检查换行格式，shell 脚本需要 LF |
| YAML 生成后接口编译不过 | 检查模块版本和配置参数，重新生成入口 |

## Webots 一直等待连接

Windows Docker 使用：

```text
WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self
```

Linux 本机原生使用：

```text
WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self
```

检查场景已打开、端口为 1235、机器人名为 `self`，环境变量传入了运行程序。Windows 可在 PowerShell 中查看监听：

```powershell
Get-NetTCPConnection -LocalPort 1235 -State Listen
```

容器内的 localhost 是容器自身。当前程序通过环境变量连接，不使用 `url=...` 位置参数。同一个 `self` 只运行一个 controller。

## 模型加载失败

检查 YAML 的 `network.model`、模型文件、Runtime 和设备。`XR_ARMOR_OPENVINO_DEVICE=CPU` 只选择 OpenVINO 设备，模型枚举仍需设置为 `OPENVINO_640X512`。

文件哈希和输入格式见[模型与数据](/算法组/models-data)。

## 线程权限警告

出现下面的日志后，线程会尝试用默认属性重建：

```text
Operation not permitted, retrying with default attributes
```

继续看后续是否完成初始化、加载模型和持续出帧。只有这条警告而没有后续输出时，还需查看完整启动日志。

## 网页没有画面

Windows 默认访问 18080，Linux 原生访问 8080。1235 是 controller 连接端口。

确认程序仍在运行，并查看三路 `stream first frame` 日志。网页可打开但没有结果时，依次检查相机发布、同步状态、Detector 完成帧、Tracker 目标和 Aimer 命令。

有检测框但没有自动开火时，检查跟踪状态、弹道结果和 `host/gimbal_quat` 反馈。

## 运行慢或坐标不对

软件渲染、CPU 推理和预览都会增加耗时。先降低 `WEBOTS_SIM_FLOW_RATE`，保持相机与模型配置不变。

换分辨率或回放数据后出现投影错误，检查 FrameLayout、原生标定和逐帧 geometry 是否配套。安装外参和坐标定义见[相机与同步](/算法组/camera-pipeline)。

报告问题时附上系统、BSP 和模块版本、YAML、启动命令及相关日志。[测试与回归](/算法组/testing)中的固定场景可用于复现。
