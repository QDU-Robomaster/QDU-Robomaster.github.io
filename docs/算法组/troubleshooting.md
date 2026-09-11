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
| `Missing modules` | 进入开发容器或 Linux 工程目录执行 `xrobot_setup`，确认 `Modules/` 已生成 |
| `xrobot_setup: command not found` | 激活安装 XRobot 的 Python 环境，检查 `python3 -m pip show xrobot` |
| 找不到 OpenVINO | 安装 C++ Runtime，并设置含 `OpenVINOConfig.cmake` 的 `OpenVINO_DIR` |
| 找不到 OpenCV | 安装 C++ 开发库，必要时传入 `OpenCV_DIR`；Python 的 cv2 不能替代它 |
| 找不到 Webots 头文件或库 | 检查 `WEBOTS_HOME` 和 controller SDK 版本 |
| 脚本出现 `bash\r` 或 `^M` | 检查换行格式，shell 脚本需要 LF |
| YAML 生成后接口编译不过 | 检查模块版本和配置参数，重新生成入口 |

## VS Code 连接开发容器失败

先确认 Docker 本身正常：

```powershell
docker version
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
```

当前新人流程只应保留一个 Webots 开发容器：

```text
qdu-autoaim-dev
```

如果同时还看到旧的：

```text
bsp-webots-autoaim-autoaim-dev-1
```

说明之前的 Compose / `Reopen in Container` 路线又创建了一套开发容器。先确认里面没有需要保留的运行任务，再删除旧容器：

```powershell
docker rm -f bsp-webots-autoaim-autoaim-dev-1
```

然后使用：

```text
Dev Containers: Attach to Running Container...
→ qdu-autoaim-dev
```

不要对这个工程再使用 **Reopen in Container**。

如果日志出现：

```text
navigator is now a global in nodejs
```

先更新 Dev Containers 扩展。仍然出现时，在 VS Code 用户设置中加入兼容项：

```json
"extensions.supportNodeGlobalNavigator": true
```

然后完整重启 VS Code 再 attach。该项用于新版 VS Code / Node 与旧 Remote 扩展的迁移兼容，不是工程配置的一部分。

连接成功后，容器里应能看到 VS Code Server，并且 Extensions 面板中的 XRobot、CMake Tools、clangd 显示为 **Installed in Container: qdu-autoaim-dev**。

## Webots 一直等待连接

先看 Webots Console 实际打印的 external controller 地址，例如：

```text
ipc://1234/self
tcp://<ip_address>:1234/self
```

Windows Docker 中按实际端口设置：

```bash
export WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1234/self
```

Linux 本机原生运行则使用：

```bash
export WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1234/self
```

端口不是固定值，以 Webots Console 当前打印的值为准。检查场景已运行、机器人名为 `self`，并确认环境变量是在启动 `rm_auto_aim` 的同一个 shell 中设置的。

容器里的 `localhost` 是容器自身，所以 Windows Docker 不能写 `127.0.0.1`。同一个 `self` 同一时刻只能连接一个 controller。

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

当前 Windows 开发容器通过 `-p 8080:8080` 映射预览端口，Windows 和 Linux 都访问：

```text
http://127.0.0.1:8080/
```

VS Code attach 后通常也会自动在 **Ports** 面板发现 8080；没有自动出现时再手动转发。

Webots external controller 的端口和网页 8080 不是一回事。

确认程序仍在运行，并查看三路 `stream first frame` 日志。网页可打开但没有结果时，依次检查相机发布、同步状态、Detector 完成帧、Tracker 目标和 Aimer 命令。

有检测框但没有自动开火时，检查跟踪状态、弹道结果和 `host/gimbal_quat` 反馈。

## 运行慢或坐标不对

软件渲染、CPU 推理和预览都会增加耗时。先降低 `WEBOTS_SIM_FLOW_RATE`，保持相机与模型配置不变。

换分辨率或回放数据后出现投影错误，检查 FrameLayout、原生标定和逐帧 geometry 是否配套。安装外参和坐标定义见[相机与同步](/算法组/camera-pipeline)。

报告问题时附上系统、BSP 和模块版本、YAML、启动命令及相关日志。[测试与回归](/算法组/testing)中的固定场景可用于复现。
