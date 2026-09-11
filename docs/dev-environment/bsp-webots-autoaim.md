---
id: dev-environment-webots-autoaim
title: Webots 自瞄快速开始
slug: /dev-environment/bsp-webots-autoaim
sidebar_position: 5
---

# Webots 自瞄快速开始

这页用于算法组新人第一次配置 Webots 自瞄仿真环境。目标是从一台新电脑开始，完成：

1. 安装基础工具；
2. clone `bsp-webots-autoaim`；
3. 初始化 LibXR 与 XRobot 模块；
4. 编译 `rm_auto_aim`；
5. 启动 Webots world；
6. 让 controller 连上 Webots；
7. 确认 OpenVINO Detector、Tracker、Aimer 都在实际出帧。

当前新人培训统一使用 OpenVINO，不需要额外的板端运行环境。

## 1. 运行结构

周末培训推荐的 Windows 结构：

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

这样 Webots GUI 直接显示在 Windows 桌面，编译器、OpenCV、OpenVINO 和 XRobot 依赖则统一放在 Docker 中。

Linux 也支持完全原生运行：

```text
Linux Webots
    ↕
Linux rm_auto_aim
    ↓
OpenVINO
```

两条路线使用同一个 BSP、同一个 world、同一套 Detector / Tracker / Aimer。

---

## 2. Windows：推荐培训路线

### 2.1 安装

需要：

- Git；
- Docker Desktop，使用 Linux containers；
- Webots R2025a；
- VS Code（推荐）。

检查：

```powershell
git --version
docker version
& "C:\Program Files\Webots\msys64\mingw64\bin\webots.exe" --version
```

Webots 应输出 `R2025a`。`docker version` 必须能够显示 Server 信息。

### 2.2 Clone 第一个仓库

```powershell
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
```

这里有两类依赖：

- `libxr/` 是 Git submodule；
- `Modules/*` 是 XRobot 根据 `Modules/modules.yaml` 拉取的模块仓库，不是 Git submodule。

先不要直接修改 `User/xrobot_main.hpp`。它是根据 `User/xrobot.yaml` 生成的。

### 2.3 初始化模块并构建

第一次运行需要让 Docker 初始化缺失模块：

```powershell
docker compose build

docker compose run --rm `
  -e XR_FORCE_XROBOT_SETUP=1 `
  autoaim-build
```

成功后应得到：

```text
build/rm_auto_aim
```

以后普通重新编译：

```powershell
docker compose run --rm autoaim-build
```

如果只改了 `User/xrobot.yaml`，构建入口会重新生成：

```text
User/xrobot_main.hpp
User/xrobot_constexpr.hpp
```

### 2.4 启动 Windows 原生 Webots

打开 PowerShell 终端 1：

```powershell
& "C:\Program Files\Webots\msys64\mingw64\bin\webots.exe" `
  --port=1235 `
  --stdout `
  --stderr `
  --mode=fast `
  --extern-urls `
  .\webots\worlds\auto_aim_test_field_target_vehicle_camera_preview.wbt
```

Webots 会打开 GUI，并等待名为 `self` 的 external controller。

正常时终端会出现类似：

```text
Waiting for local or remote connection on port 1235 targeting robot named 'self'
```

不要关闭这个终端。

### 2.5 从 Docker 启动 controller

打开 PowerShell 终端 2：

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

这里有两个容易混淆的地址：

- `host.docker.internal`：Docker 容器访问 Windows 宿主机；
- `127.0.0.1`：只用于把预览网页绑定到 Windows 本机。

不要把 controller 地址写成容器内的 `127.0.0.1:1235`。

### 2.6 查看三路预览

浏览器打开：

```text
http://127.0.0.1:18080/
```

三路流：

```text
/stream/armor_detector
/stream/armor_tracker
/stream/aimer_preview
```

它们分别用于观察检测、跟踪和瞄准结果。

### 2.7 成功判据

controller 日志至少应看到：

```text
Platform initialized
ArmorDetector selected model=openvino-640x512 required_backend=OPENVINO compiled=1
ArmorDetector loaded OpenVINO model=... device=CPU input=640x512
Starting ArmorTracker
VisionPreview stream first frame: /stream/armor_detector
VisionPreview stream first frame: /stream/armor_tracker
VisionPreview stream first frame: /stream/aimer_preview
```

随后应该持续出现：

- `ArmorDetector trace frame=...`
- 检测结果和 PnP；
- Tracker 输出；
- Aimer 目标与 fire state；
- Webots 云台反馈。

只看到 `Waiting for local or remote connection` 不算完成。

停止时先在 controller 终端 `Ctrl+C`，再关闭 Webots。

---

## 3. Linux：原生 Webots + 原生 controller

Linux 路线不需要 Docker。

已验证环境：

- Ubuntu 24.04；
- Webots R2025a；
- GCC 13；
- CMake + Ninja；
- Python xrobot 0.3.1；
- OpenVINO 2025.4.0。

### 3.1 基础工具

```bash
sudo apt update
sudo apt install -y git cmake ninja-build g++ python3 python3-pip xvfb xauth
python3 -m pip install --user xrobot==0.3.1
```

另外安装 Webots R2025a、OpenCV 4 和 OpenVINO Runtime。

常见 OpenVINO CMake 路径：

```text
/opt/intel/openvino_2025.4.0/runtime/cmake
```

检查：

```bash
webots --version
cmake --version
ninja --version
python3 -m pip show xrobot
test -f /opt/intel/openvino_2025.4.0/runtime/cmake/OpenVINOConfig.cmake
```

如果 `xrobot_setup` 已安装但 shell 找不到：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 3.2 Clone 和初始化

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim

git submodule update --init --recursive

export PATH="$HOME/.local/bin:$PATH"
xrobot_setup
```

重新生成入口：

```bash
python3 -m xrobot.GenerateMain \
  --config User/xrobot.yaml \
  --output User/xrobot_main.hpp
```

### 3.3 编译

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake

cmake --build build -j4 --target rm_auto_aim
```

### 3.4 一条命令做 smoke test

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 \
  --sim-flow-rate 0.1 \
  --run-root .vscode-runs
```

成功时最后应看到：

```text
status=PASS reason=duration_reached detector_frames=... runtime_errors=0
```

这个入口会自己启动 Webots、连接 controller，并检查是否真的产生 pipeline 帧。

### 3.5 Linux GUI 手工运行

终端 1：

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

---

## 4. 第一次需要认识的文件

先看这些：

```text
README.md
User/xrobot.yaml
Modules/modules.yaml
webots/worlds/
webots/protos/
docker/
run_headless_preview.py
```

### `User/xrobot.yaml`

BSP 的模块实例和运行参数。Detector 当前显式使用 OpenVINO 模型。

### `Modules/modules.yaml`

XRobot 模块依赖列表。`xrobot_setup` 根据它准备 `Modules/*`。

### `webots/worlds/`

仿真 world。新人第一次运行使用：

```text
auto_aim_test_field_target_vehicle_camera_preview.wbt
```

### `webots/protos/`

目标车、装甲板等 Webots PROTO。

### `run_headless_preview.py`

Linux/容器环境的自动 smoke-test 入口。

---

## 5. 常见问题

### `Missing modules: ...`

说明 `Modules/*` 尚未初始化。

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

### `xrobot_setup: command not found`

```bash
ls ~/.local/bin/xrobot_setup
export PATH="$HOME/.local/bin:$PATH"
```

### CMake 找不到 OpenVINO

Linux 显式设置：

```bash
-DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake
```

Windows Docker 路线不需要在 Windows 宿主机单独配置 OpenVINO SDK。

### Webots 一直等待 external controller

检查：

1. Webots 是否使用 `--port=1235 --extern-urls` 启动；
2. Windows Docker 是否使用 `WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self`；
3. Linux 原生是否使用 `WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self`。

### `Failed to create thread ... Operation not permitted`

如果紧接着看到：

```text
retrying with default attributes
Platform initialized
```

这是实时调度属性不可用后的自动 fallback，不是启动失败。

### 预览网页打不开

Windows 路线默认映射：

```text
127.0.0.1:18080 -> container:8080
```

检查 controller 是否仍在运行，以及 18080 是否已被其他程序占用。

---

## 6. 新人第一次会议做到哪里

会议结束时至少应该能独立完成：

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

做到这里以后，再进入 Detector、Tracker、Aimer、云台控制和调参训练。

更多仿真结构说明见 [算法组：Webots 仿真](/算法组/webots)。
