---
id: algorithm-quick-start
title: 快速上手
slug: /算法组/quick-start
sidebar_position: 6
---

# 快速上手

这页是算法组新人第一次跑 Webots 自瞄仿真的完整顺序。目标是会议结束前能独立做完：

```text
安装环境
→ clone bsp-webots-autoaim
→ 初始化依赖
→ 编译 rm_auto_aim
→ 打开 Webots world
→ controller connected
→ OpenVINO Detector 出帧
→ Tracker / Aimer 有输出
→ 浏览器看到三路 preview
```

仓库的环境、依赖、构建和命令清单集中在 [`bsp-webots-autoaim` 开发环境](/dev-environment/bsp-webots-autoaim)；仿真链路为什么这么搭见 [Webots 仿真](/算法组/webots)。

## 1. 先理解运行结构

Windows 培训推荐的结构：

```text
Windows 原生 Webots GUI
        │
        │ tcp://host.docker.internal:1235/self
        ▼
Docker Linux controller
        │
        ├─ WebotsCamera / CameraSync
        ├─ CameraFrameSync
        ├─ ArmorDetector (OpenVINO)
        ├─ ArmorTracker
        ├─ Aimer
        └─ WebotsGimbal / WebotsFireNotify
```

Webots GUI 直接显示在 Windows 桌面，编译器、OpenCV、OpenVINO 和 XRobot 依赖统一放在 Docker 里。

Linux 也支持 Webots 与 controller 全原生运行。两条路线使用同一个 world、同一套 Detector / Tracker / Aimer。

新人培训统一使用 OpenVINO，不需要额外的板端运行环境。

## 2. Windows 路线（培训推荐）

### 2.1 安装

需要：

- Git；
- Docker Desktop，使用 Linux containers；
- Webots R2025a；
- VS Code（推荐）。

```powershell
git --version
docker version
& "C:\Program Files\Webots\msys64\mingw64\bin\webots.exe" --version
```

Webots 应输出 `R2025a`；`docker version` 必须能显示 Server 信息。

### 2.2 Clone 第一个仓库

```powershell
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
```

`libxr/` 是 Git submodule；`Modules/*` 不是，它由 XRobot 依据 `Modules/modules.yaml` 拉取。

先不要直接改 `User/xrobot_main.hpp`，它由 `User/xrobot.yaml` 生成。

### 2.3 第一次构建

```powershell
docker compose build

docker compose run --rm `
  -e XR_FORCE_XROBOT_SETUP=1 `
  autoaim-build
```

首次带 `XR_FORCE_XROBOT_SETUP=1` 是必须的：不带的话，`Modules/*` 还没初始化，构建会直接报 `Missing modules`。

同样的事情也可以用脚本一次做完：

```powershell
powershell -ExecutionPolicy Bypass -File .\docker\windows-deploy.ps1
```

成功后应得到：

```text
build/rm_auto_aim
```

### 2.4 启动 Windows 原生 Webots

PowerShell 终端 1：

```powershell
& "C:\Program Files\Webots\msys64\mingw64\bin\webots.exe" `
  --port=1235 `
  --stdout `
  --stderr `
  --mode=fast `
  --extern-urls `
  .\webots\worlds\auto_aim_test_field_target_vehicle_camera_preview.wbt
```

Webots 会打开 GUI，并等待名为 `self` 的 external controller。正常时终端输出：

```text
Waiting for local or remote connection on port 1235 targeting robot named 'self'
```

不要关闭这个终端。

### 2.5 从 Docker 启动 controller

PowerShell 终端 2：

```powershell
docker compose run --rm `
  -p 127.0.0.1:18080:8080 `
  -e XR_ARMOR_OPENVINO_DEVICE=CPU `
  -e WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self `
  -e USER=xrobot `
  -e USERNAME=xrobot `
  autoaim-build `
  /workspace/build/rm_auto_aim
```

两个容易混的地址：

- `host.docker.internal`：容器访问 Windows 宿主机；
- `127.0.0.1:18080`：只把预览网页绑定到本机。

容器里的 `127.0.0.1` 指向容器自身，所以不能写成 `tcp://127.0.0.1:1235/self`。

用脚本的等价写法：

```powershell
powershell -ExecutionPolicy Bypass -File .\docker\windows-deploy.ps1 `
  -SkipImageBuild `
  -ControllerUrl tcp://host.docker.internal:1235/self
```

18080 被占用时可以加 `-PreviewPort 18081`。

### 2.6 查看三路预览

浏览器打开：

```text
http://127.0.0.1:18080/
```

```text
/stream/armor_detector
/stream/armor_tracker
/stream/aimer_preview
```

它们分别对应检测、跟踪和瞄准结果。

## 3. Linux 路线（全原生）

已验证环境：Ubuntu 24.04、Webots R2025a、GCC 13、CMake + Ninja、Python xrobot 0.3.1、OpenVINO 2025.4.0。

```bash
sudo apt update
sudo apt install -y git cmake ninja-build g++ python3 python3-pip xvfb xauth
python3 -m pip install --user xrobot==0.3.1
```

另外安装 Webots R2025a、OpenCV 4 和 OpenVINO Runtime。

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim

git submodule update --init --recursive

export PATH="$HOME/.local/bin:$PATH"
xrobot_setup

cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake
cmake --build build -j4 --target rm_auto_aim
```

一条命令做 smoke test：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 \
  --sim-flow-rate 0.1 \
  --run-root .vscode-runs
```

手工跑 GUI 时，终端 1：

```bash
webots \
  --port=1235 \
  --stdout \
  --stderr \
  --mode=fast \
  --extern-urls \
  webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

终端 2：

```bash
WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/rm_auto_aim
```

## 4. 什么算跑通了

controller 日志至少应出现：

```text
Platform initialized
ArmorDetector selected model=openvino-640x512 required_backend=OPENVINO compiled=1
ArmorDetector loaded OpenVINO model=... device=CPU input=640x512
Starting ArmorTracker
VisionPreview stream first frame: /stream/armor_detector
VisionPreview stream first frame: /stream/armor_tracker
VisionPreview stream first frame: /stream/aimer_preview
```

Linux smoke test 应输出：

```text
status=PASS reason=duration_reached detector_frames=... runtime_errors=0
```

只看 Webots 停在 `Waiting for local or remote connection` **不算**完成。

停止时先在 controller 终端 `Ctrl+C`，再关闭 Webots。

## 5. 常见问题

### `Missing modules: ...`

`Modules/*` 未初始化。

Windows：

```powershell
docker compose run --rm `
  -e XR_FORCE_XROBOT_SETUP=1 `
  autoaim-build
```

Linux：

```bash
export PATH="$HOME/.local/bin:$PATH"
xrobot_setup
```

### controller 连不上 Webots

Windows 必须用 `tcp://host.docker.internal:1235/self`，Linux 原生用 `tcp://127.0.0.1:1235/self`。同时确认 Webots 是以 `--port=1235 --extern-urls` 启动的。

### `Failed to create thread ... Operation not permitted`

如果紧接着出现 `retrying with default attributes` 和 `Platform initialized`，这是实时调度属性不可用后的自动 fallback，不是启动失败。

### 预览网页打不开

默认 `127.0.0.1:18080 -> container:8080`。确认 controller 仍在运行，且端口未被占用。

## 6. 会议之后

按这个顺序继续：

```text
看懂三路 preview
→ 理解 User/xrobot.yaml
→ 理解 Detector 输入输出
→ 理解 Tracker 状态
→ 理解 Aimer 输出
→ 改一个小参数并观察变化
→ 再进入具体算法任务
```

做到这里以后，再进入 Detector、Tracker、Aimer、云台控制和调参训练。
