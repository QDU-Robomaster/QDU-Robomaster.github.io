---
id: algorithm-quick-start
title: 快速上手
slug: /算法组/quick-start
sidebar_position: 2
---

# 快速上手

Windows 使用原生 Webots 显示场景，在 Docker 内开发和运行 controller。Linux 可以把 Webots 和 controller 都装在本机。两种方式都使用 OpenVINO。

这页按实际开发顺序写：先跑起来，再用 VS Code 打开工程、确认代码跳转和补全正常，最后改代码、重新编译和重新运行。

## Windows

### 安装工具

安装：

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)，使用 Linux containers
- [Webots](https://cyberbotics.com/doc/guide/installation-procedure)
- [VS Code](https://code.visualstudio.com/)
- VS Code 的 **Dev Containers** 扩展

打开 PowerShell 检查：

```powershell
git --version
docker version
docker compose version
& "$env:ProgramFiles\Webots\msys64\mingw64\bin\webots.exe" --version
code --version
```

Docker 应显示 Server 信息。Webots 装在其他位置时，替换命令中的路径；`code` 命令不可用时，也可以从 VS Code 的 **File → Open Folder** 打开工程。

### 拉取工程和初始化模块

```powershell
git clone --config core.autocrlf=false https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive

docker compose build
docker compose run --rm -e XR_FORCE_XROBOT_SETUP=1 autoaim-build
```

`libxr/` 由 Git submodule 下载，`Modules/` 由 XRobot 下载。首次构建带上 `XR_FORCE_XROBOT_SETUP=1`，把模块准备好；后面不需要每次重复这一步。

### 用 VS Code 打开工作区

在仓库根目录执行：

```powershell
code .
```

VS Code 打开后按 `Ctrl+Shift+P`，执行：

```text
Dev Containers: Reopen in Container
```

第一次进入会构建并启动开发容器。完成后，VS Code 左下角应显示当前窗口已经在 Dev Container 中。

仓库会在容器里安装推荐扩展，包括 CMake Tools、clangd、XRobot、Python 和调试插件。这个项目的 C/C++ 补全由 **clangd** 提供，仓库设置已经关闭 Microsoft C/C++ 扩展自己的 IntelliSense，避免两套语言服务同时工作。

### 第一次 Debug 构建

clangd 需要 `compile_commands.json` 才能正确理解头文件、宏和编译参数。进入 Dev Container 后先执行一次：

```text
Ctrl+Shift+B
→ Build: Webots debug
```

这个任务会依次：

```text
重新生成 User/xrobot_main.hpp
→ CMake configure 到 build/debug
→ 编译 build/debug/rm_auto_aim
→ 生成 build/debug/compile_commands.json
```

构建完成后等 clangd 完成后台索引。可以用下面两个动作确认智能提示不是“假正常”：

1. 打开 `User/main.cpp`，在 `XRobotMain` 上按 `F12`，应能跳到生成的入口；
2. 打开 `Modules/ArmorDetector/ArmorDetector.hpp`，类型和头文件应能正常跳转，不应整页提示找不到 include。

如果刚生成 `compile_commands.json` 仍有旧诊断，执行：

```text
Ctrl+Shift+P
→ clangd: Restart language server
```

仓库的 clangd 配置固定读取 `build/debug/compile_commands.json`。因此 Windows 下不要在宿主机直接用 clangd 去读取 Docker 生成的 `/workspace/...` 编译路径；代码编辑也放在 Dev Container 窗口里完成。

### 打开 Webots 场景

Webots 仍然运行在 Windows，而不是 Dev Container 里。

在 Windows PowerShell 中、仓库根目录执行：

```powershell
& "$env:ProgramFiles\Webots\msys64\mingw64\bin\webots.exe" `
  --port=1235 --stdout --stderr --mode=fast --extern-urls `
  .\webots\worlds\auto_aim_test_field_target_vehicle_camera_preview.wbt
```

场景加载后，会等待名为 `self` 的 external controller。保持 Webots 打开。

### 从 VS Code 运行 controller

回到 **Dev Container 里的 VS Code Terminal**：

```bash
WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self \
WEBOTS_SIM_FLOW_RATE=0.1 \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/debug/rm_auto_aim
```

`host.docker.internal` 是容器访问 Windows 宿主机的地址。这里先用较低的仿真速度，运行稳定后再调整 `WEBOTS_SIM_FLOW_RATE`。

三路预览在容器的 8080 端口。VS Code 底部打开 **Ports** 面板，选择 **Forward a Port**，输入：

```text
8080
```

然后直接打开 VS Code 显示的 Local Address。页面应包含 Detector、Tracker 和 Aimer 三路预览。

日志应能看到 OpenVINO 模型加载，随后持续出现检测、跟踪和瞄准结果。

## 修改代码、编译和重新运行

### 改哪里

常用位置：

```text
User/xrobot.yaml        模块实例和参数
Modules/ArmorDetector/  检测
Modules/ArmorTracker/   跟踪
Modules/Aimer/          瞄准与弹道
webots/                 场景和仿真资源
```

不要手改 `User/xrobot_main.hpp`。它是从 YAML 生成的，下次生成会覆盖手工修改。

### 改 YAML 或模块连接

修改 `User/xrobot.yaml` 后执行：

```text
Ctrl+Shift+B
→ Build: Webots debug
```

这个任务会重新生成入口、重新 configure 并编译。

### 只改 C++

只修改 `Modules/...` 下的 C++，且没有改 CMake 或 YAML 时，可以少跑两步：

```text
Ctrl+Shift+P
→ Tasks: Run Task
→ CMake: build Webots debug
```

如果增加了源文件、改了 CMake 或不确定构建状态，直接重新执行完整的 `Build: Webots debug`。

### 重新运行

controller 正在运行时，先在 VS Code Terminal 中按 `Ctrl+C`。Webots 场景可以保持打开，它会重新等待 external controller。

编译完成后再次执行：

```bash
WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1235/self \
WEBOTS_SIM_FLOW_RATE=0.1 \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/debug/rm_auto_aim
```

不需要每改一行代码就重新 `docker compose build`，也不需要重新打开 Webots。

想单步调试时，可以使用 VS Code 的 **Run and Debug**，选择仓库已有的 `Webots: Debug controller (paste extern URL)` 配置；Windows + Dev Container 下输入：

```text
tcp://host.docker.internal:1235/self
```

该调试配置会先执行 Debug 构建。

## Linux 原生运行

### 安装依赖

安装 Git、CMake、Ninja、C++ 编译器、Python/venv、Webots、OpenCV C++ 开发库和 OpenVINO C++ Runtime。

例如 Debian/Ubuntu 系统先准备基础工具：

```bash
sudo apt update
sudo apt install -y git cmake ninja-build g++ python3 python3-venv xvfb xauth
python3 -m venv "$HOME/.venvs/qdu-xrobot"
. "$HOME/.venvs/qdu-xrobot/bin/activate"
python3 -m pip install xrobot
```

Webots、OpenCV 和 OpenVINO 按各自官方安装方式安装。如果 OpenVINO 不在 CMake 默认搜索路径，设置 `OpenVINO_DIR` 指向实际的 `runtime/cmake`：

```bash
export OpenVINO_DIR="/path/to/openvino/runtime/cmake"
```

Webots 不在默认位置时，同样设置：

```bash
export WEBOTS_HOME="/path/to/webots"
```

### 拉取工程

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
xrobot_setup
```

### 用 VS Code 打开

建议从已经配置好 OpenVINO / Webots 环境变量的终端启动 VS Code：

```bash
code .
```

安装仓库推荐扩展后，执行：

```text
Ctrl+Shift+B
→ Build: Webots debug
```

同样会生成 `build/debug/compile_commands.json`，clangd 会从这个目录建立索引。打开 `User/main.cpp` 用 `F12` 测一下跳转，再开始改代码。

如果你的 Webots 不在仓库默认路径，VS Code task 使用的环境也必须能看到正确的 `WEBOTS_HOME`；最简单的方法就是从已经 export 好变量的终端执行 `code .`。

### 打开场景和 controller

终端 1：

```bash
webots --port=1235 --stdout --stderr --mode=fast --extern-urls \
  webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

终端 2：

```bash
WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self \
WEBOTS_SIM_FLOW_RATE=0.1 \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/debug/rm_auto_aim
```

浏览器访问 `http://127.0.0.1:8080/`。

修改代码后的编译规则和 Windows 一样：YAML / CMake 改动跑完整 `Build: Webots debug`，纯 C++ 改动可以只跑 `CMake: build Webots debug`，然后停止旧 controller 再启动即可。

### 无头运行

需要重复测试时：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/debug/rm_auto_aim \
  --runtime-sec 40 --sim-flow-rate 0.1 --run-root .vscode-runs
```

脚本负责启动和停止 Webots，不要同时再连接一个手工 controller。正常结束后摘要应显示 `status=PASS`、`runtime_errors=0`。

## 接下来

先看[模块索引](/算法组/modules)和[自瞄链路](/算法组/pipeline)。启动失败时看[常见问题](/算法组/troubleshooting)。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker)、[Aimer](https://github.com/QDU-Robomaster/Aimer)。
