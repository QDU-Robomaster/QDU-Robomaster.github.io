---
id: algorithm-quick-start
title: 快速上手
slug: /算法组/quick-start
sidebar_position: 2
---

# 快速上手

Windows 使用原生 Webots 显示场景，在 Docker 内编译和运行 controller。Linux 可以把两者都装在本机。两种方式都使用 OpenVINO。

## Windows

### 安装工具

安装 [Git](https://git-scm.com/downloads)、[Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) 和 [Webots R2025a](https://github.com/cyberbotics/webots/releases/tag/R2025a)。Docker Desktop 使用 Linux containers。

打开 PowerShell，检查：

```powershell
git --version
docker version
docker compose version
& "$env:ProgramFiles\Webots\msys64\mingw64\bin\webots.exe" --version
```

Docker 应显示 Server 信息，Webots 应输出 R2025a。Webots 装在其他位置时，替换命令中的路径。

### 拉取和编译

在准备存放工程的目录中执行：

```powershell
git clone --config core.autocrlf=false https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
docker compose build
docker compose run --rm -e XR_FORCE_XROBOT_SETUP=1 autoaim-build
```

`libxr/` 由 Git submodule 下载，`Modules/` 由 XRobot 下载。首次构建带上 `XR_FORCE_XROBOT_SETUP=1` 初始化模块，之后增量编译只需：

```powershell
docker compose run --rm autoaim-build
```

生成的程序是 `build/rm_auto_aim`，在容器中运行。

### 打开 Webots 场景

PowerShell 终端 1，在仓库根目录执行：

```powershell
& "$env:ProgramFiles\Webots\msys64\mingw64\bin\webots.exe" `
  --port=1235 --stdout --stderr --mode=fast --extern-urls `
  .\webots\worlds\auto_aim_test_field_target_vehicle_camera_preview.wbt
```

场景加载后，会等待名为 `self` 的 external controller。保持 Webots 打开。

### 连接 controller

另开 PowerShell 终端 2，进入同一个仓库：

```powershell
docker compose run --rm `
  -p 127.0.0.1:18080:8080 `
  -e XR_ARMOR_OPENVINO_DEVICE=CPU `
  -e WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self `
  -e WEBOTS_SIM_FLOW_RATE=0.1 `
  -e USER=xrobot -e USERNAME=xrobot `
  autoaim-build /workspace/build/rm_auto_aim
```

`host.docker.internal` 是容器访问 Windows 的地址。连接地址通过 `WEBOTS_CONTROLLER_URL` 传入；容器内的 `127.0.0.1` 指向容器自身。

这里先用 0.1 倍仿真速度，运行稳定后再提高 `WEBOTS_SIM_FLOW_RATE`。

### 查看画面

浏览器打开：

```text
http://127.0.0.1:18080/
```

页面包含 Detector、Tracker 和 Aimer 三路预览。日志应显示 OpenVINO 模型已加载到 CPU，随后持续出现检测与跟踪结果。

若 18080 被占用，将端口映射改为 `127.0.0.1:18081:8080`，浏览器改用 18081。

## Linux 原生运行

### 安装依赖

下面使用 Ubuntu 24.04、Webots R2025a 和 OpenVINO 2025.4.0。OpenCV 需要 C++ 开发库；已有运行环境使用 4.13.0。

```bash
sudo apt update
sudo apt install -y git cmake ninja-build g++ python3 python3-venv xvfb xauth
python3 -m venv "$HOME/.venvs/qdu-xrobot"
. "$HOME/.venvs/qdu-xrobot/bin/activate"
python3 -m pip install xrobot==0.3.1
```

另行安装 [Webots R2025a](https://github.com/cyberbotics/webots/releases/tag/R2025a)、[OpenCV](https://docs.opencv.org/4.x/d7/d9f/tutorial_linux_install.html) 和 [OpenVINO C++ Runtime](https://docs.openvino.ai/2025/get-started/install-openvino/install-openvino-archive-linux.html)。

设置安装目录。`OPENVINO_ROOT` 替换为实际路径，下面以解压到 `~/opt/` 为例：

```bash
export WEBOTS_HOME="$(dirname "$(readlink -f "$(command -v webots)")")"
export OPENVINO_ROOT="$HOME/opt/openvino_2025.4.0"
. "$OPENVINO_ROOT/setupvars.sh"
export OpenVINO_DIR="$OPENVINO_ROOT/runtime/cmake"
```

### 拉取和编译

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
xrobot_setup
python3 -m xrobot.GenerateMain --config User/xrobot.yaml --output User/xrobot_main.hpp
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DWEBOTS_HOME="$WEBOTS_HOME" \
  -DOpenVINO_DIR="$OpenVINO_DIR"
cmake --build build --target rm_auto_aim --parallel 4
```

OpenCV 装在自定义目录时，再传入 `-DOpenCV_DIR=...`，指向含 `OpenCVConfig.cmake` 的目录。

### 打开场景并连接

终端 1：

```bash
webots --port=1235 --stdout --stderr --mode=fast --extern-urls \
  webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

终端 2，同样在仓库根目录：

```bash
WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self \
WEBOTS_SIM_FLOW_RATE=0.1 \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/rm_auto_aim
```

浏览器访问 `http://127.0.0.1:8080/`。只在本机查看时，可把 YAML 中三路预览的 `web_bind_address` 都改成 `127.0.0.1`，再生成、编译。

### 无头运行

没有桌面或需要重复测试时，用脚本启动同一场景：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 --sim-flow-rate 0.1 --run-root .vscode-runs
```

脚本负责启动和停止 Webots，不要同时再连接一个手工 controller。正常运行结束后，摘要显示 `status=PASS`、`runtime_errors=0`。

## 修改与停止

手工运行时，先在 controller 终端按 Ctrl+C，再关闭 Webots。

参数从 `User/xrobot.yaml` 修改。改完后重新生成和编译，第一次可以只调整某一路预览的 `preview_scale`，观察它对显示的影响。

接下来查看[模块索引](/算法组/modules)和[自瞄链路](/算法组/pipeline)。启动失败的排查方法在[常见问题](/算法组/troubleshooting)。

源码：[Compose 配置](https://github.com/QDU-Robomaster/bsp-webots-autoaim/blob/264c312fff724748784520ff4de0a22afcecd3d4/compose.yaml)、[构建入口](https://github.com/QDU-Robomaster/bsp-webots-autoaim/blob/264c312fff724748784520ff4de0a22afcecd3d4/docker/entrypoints/build.sh)。
