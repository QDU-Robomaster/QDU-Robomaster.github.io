---
id: algorithm-troubleshooting
title: 常见问题
slug: /算法组/troubleshooting
sidebar_position: 12
---

# 常见问题

## 编译不过

| 现象 | 处理 |
| --- | --- |
| `Missing modules` | 在工程根目录执行 `xrobot_setup` |
| `xrobot_setup: command not found` | 检查 XRobot 是否安装到当前 Python 环境，`python3 -m pip show xrobot` |
| 找不到 OpenVINO | 安装 C++ Runtime，并设置包含 `OpenVINOConfig.cmake` 的 `OpenVINO_DIR` |
| 找不到 OpenCV | 安装 C++ 开发库，必要时设置 `OpenCV_DIR`；Python `cv2` 不能替代 C++ 库 |
| 找不到 Webots 头文件或库 | 检查 `WEBOTS_HOME` 和 Webots controller SDK |
| 脚本出现 `bash\r` 或 `^M` | 将 shell 脚本换行格式改为 LF |
| YAML 修改后接口编译错误 | 先看生成的 XRobot 接口与模块版本是否匹配，再重新 build |

## VS Code 连不上开发容器

先确认 Docker 中只保留当前开发容器：

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
```

日常开发用的是：

```text
qdu-autoaim-dev
```

如果还能看到以前由 Compose 创建的：

```text
bsp-webots-autoaim-autoaim-dev-1
```

先确认旧容器里没有需要保留的任务，再删除它：

```powershell
docker rm -f bsp-webots-autoaim-autoaim-dev-1
```

随后在 VS Code 中使用：

```text
Dev Containers: Attach to Running Container...
→ qdu-autoaim-dev
```

工程目录应为 `/workspace`。

较新的 VS Code / Node 与旧版 Remote 扩展组合有时会在日志中出现：

```text
navigator is now a global in nodejs
```

遇到这种情况先更新 Dev Containers。仍有同样报错时，在用户设置中加入：

```json
"extensions.supportNodeGlobalNavigator": true
```

重启 VS Code 后重新 Attach。连接成功后，Extensions 面板中的 XRobot、CMake Tools、clangd 应显示为安装在 `qdu-autoaim-dev` 中。

## Webots 等不到 controller

先看 Webots Console 打印的 external controller 地址，例如：

```text
tcp://127.0.0.1:1234/self
```

Windows Docker 中，容器通过宿主机地址连接：

```bash
export WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1234/self
```

Linux 原生运行则使用：

```bash
export WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1234/self
```

端口以 Webots Console 为准。`self` 同一时间只能接一个 controller。

Windows 侧也可以确认端口是否正在监听：

```powershell
Get-NetTCPConnection -LocalPort 1234 -State Listen
```

## OpenVINO 模型加载失败

先看启动日志里的设备和模型信息。`XR_ARMOR_OPENVINO_DEVICE` 只控制推理设备，Detector 的模型枚举仍需选择 `OPENVINO_640X512`。

强制 `GPU` 或 `NPU` 时，OpenVINO 必须能枚举到对应设备。设备列表和模型文件检查见[模型与数据](/算法组/models-data)。

## 出现线程权限警告

Linux / Docker 中可能看到：

```text
Operation not permitted, retrying with default attributes
```

程序会退回普通线程属性继续创建线程。后面能正常完成模型加载并持续出帧时，这条日志本身不影响使用；如果程序停在这里，再看完整启动日志。

## 预览页面打不开或没有画面

Windows 开发容器启动时把 8080 映射到宿主机，直接访问：

```text
http://127.0.0.1:8080/
```

VS Code Attach 后通常也会在 **Ports** 面板发现 8080。

页面打不开时先确认 `rm_auto_aim` 仍在运行。页面能打开但没有图像时，从日志依次看相机、CameraFrameSync、Detector、Tracker、Aimer 是否持续有输出。

有检测框但云台不动或不开火时，再检查 `host/gimbal_quat`、跟踪状态和弹道结果。

## 仿真跑得慢

速度主要受三部分影响：Webots 渲染、OpenVINO 推理和 Debug 构建本身。CPU 推理较慢时可以先降低 `WEBOTS_SIM_FLOW_RATE`；Intel GPU / NPU 可用时优先让 OpenVINO 使用硬件加速。

如果图像位置或投影同时不对，则检查 FrameLayout、原生标定和逐帧 geometry 是否匹配。坐标与外参见[相机与同步](/算法组/camera-pipeline)。

提交问题时附上 BSP / 模块版本、运行 YAML、启动命令和相关日志，通常比单独截图更容易定位。
