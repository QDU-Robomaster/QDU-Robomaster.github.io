---
id: algorithm-quick-start
title: 快速上手
slug: /算法组/quick-start
sidebar_position: 2
---

# 快速上手

Windows 下推荐用原生 Webots 显示场景，用 Docker 提供 Linux 编译和运行环境。Docker 容器手动启动，编译、运行 controller 等命令都在容器终端里执行。

## Windows

### 1. 安装工具

先安装：

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)，使用 Linux containers
- [Webots](https://cyberbotics.com/doc/guide/installation-procedure)
- [VS Code](https://code.visualstudio.com/)

Windows 本机的 VS Code 只要求先安装：

```text
Dev Containers          ms-vscode-remote.remote-containers
```

XRobot、CMake Tools、clangd 等开发扩展要安装在后面连接的 Linux 容器里，不要只装在 Windows 本机。

### 2. 拉取工程

PowerShell：

```powershell
git clone --config core.autocrlf=false https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
```

`libxr/` 是 Git submodule；`Modules/` 后面由 XRobot 下载。

### 3. 构建并启动开发容器

仍然在仓库根目录：

```powershell
docker build -t bsp-webots-autoaim-webots:local .\docker
```

第一次创建开发容器：

```powershell
docker run -d `
  --name qdu-autoaim-dev `
  -p 8080:8080 `
  -v "${PWD}:/workspace" `
  -w /workspace `
  bsp-webots-autoaim-webots:local `
  sleep infinity
```

以后不用重新 `docker run`，启动已有容器即可：

```powershell
docker start qdu-autoaim-dev
```

进入容器：

```powershell
docker exec -it qdu-autoaim-dev bash
```

下面没有特别说明的 Linux 命令，都在这个容器终端中执行。

### 4. 初始化 XRobot 模块

第一次进入工程执行：

```bash
xrobot_setup
```

完成后应能看到 `Modules/ArmorDetector/`、`Modules/ArmorTracker/`、`Modules/Aimer/` 等目录。`xrobot_setup` 会同时生成当前入口文件；后续 CMake 也会在 YAML 变化时自动重新生成。

`User/xrobot_main.hpp` 和 `User/xrobot_constexpr.hpp` 都是生成文件，不要手改。

### 5. 第一次编译

先 configure：

```bash
cmake -S . -B build/debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DAUTO_AIM_PREVIEW_IMAGE=ON
```

再并行编译：

```bash
cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

生成：

```text
build/debug/rm_auto_aim
build/debug/compile_commands.json
```

不要漏掉 `--parallel`。第一次完整 Debug 编译比较重，不并行会明显变慢。

## VS Code

### 连接到刚才的容器

Windows 上打开 VS Code，按 `Ctrl+Shift+P`：

```text
Dev Containers: Attach to Running Container...
```

选择：

```text
qdu-autoaim-dev
```

然后在这个 VS Code 窗口中打开：

```text
/workspace
```

第一次连接后先安装容器侧开发扩展。打开 Extensions 面板（`Ctrl+Shift+X`），搜索：

```text
@recommended
```

选择 **Install Workspace Recommended Extensions**。仓库已经在 `.vscode/extensions.json` 中声明推荐项，至少确认下面三个显示为 **Installed in Container: qdu-autoaim-dev**：

```text
XRobot                 xrobot.xrobot
CMake Tools            ms-vscode.cmake-tools
clangd                 llvm-vs-code-extensions.vscode-clangd
```

Python、Docker 和调试扩展也在推荐列表中，可以一并安装。当前工程使用 clangd，因此不建议另外启用 Microsoft C/C++ IntelliSense。

这些扩展安装在 `qdu-autoaim-dev` 容器环境中。以后只要复用同一个容器就会保留；如果执行 `docker rm qdu-autoaim-dev` 后重新创建容器，需要重新安装一次。

:::tip
这套流程使用 **Attach to Running Container**。不要再对这个工程使用 **Reopen in Container**，否则 `.devcontainer` 配置可能再创建一套 Compose 开发容器，造成两个 `/workspace` 指向不同工程目录。
:::

### clangd 第一次会比较慢

这个工程的 C/C++ 补全使用 clangd，不使用 Microsoft C/C++ IntelliSense。clangd 读取：

```text
build/debug/compile_commands.json
```

所以必须至少完成一次上面的 Debug configure + build，再看代码补全。

Windows bind mount 下第一次 background index 可能超过一分钟。刚打开文件时暂时不能跳转并不一定是配置错误，先看 VS Code 状态栏里的 clangd 是否仍在 indexing。

索引完成后可以检查：

- `User/main.cpp` 中的 `XRobotMain` 能否 `F12` 跳转；
- `Modules/ArmorDetector/ArmorDetector.hpp` 中的类型能否正常跳转；
- include 是否不再整页报红。

如果 `build/debug/compile_commands.json` 已经存在，但索引长期没有恢复，再执行：

```text
Ctrl+Shift+P
→ clangd: Restart language server
```

不要在 Windows 宿主机上直接让 clangd 读取这份数据库；里面的编译路径是 `/workspace/...`，应该在容器里的 VS Code 中使用。

### VS Code 里怎么编译

首次完成 `xrobot_setup` 后，仓库的 CMake Tools 配置会在打开工程时自动 configure：

```text
source      /workspace
build       /workspace/build/debug
generator   Ninja
build type  Debug
```

因此 VS Code 底部状态栏或 CMake Tools 面板里的 **Build** 按钮可以直接使用。它会使用 Ninja 并行构建；不再要求先手工选择 kit 或 preset。

CMake 还会跟踪：

```text
User/xrobot.yaml
Modules/modules.yaml
```

这些配置变化后，普通 CMake build 会先自动执行 XRobot 入口生成，再编译 `rm_auto_aim`。所以改 YAML 后也不需要再手工运行 `python3 -m xrobot.GenerateMain`。

如果希望明确执行完整流程，也可以继续使用仓库 task：

```text
Ctrl+Shift+B
→ Build: Webots debug
```

它会显式执行：

```text
生成 XRobot 入口
→ configure build/debug
→ 并行编译 rm_auto_aim
```

两种入口最终使用同一个 `build/debug`。第一次打开工程时如果 CMake Tools 仍在 configure，等状态栏完成后再点 Build。

## 手动打开 Webots

不需要用 PowerShell 命令启动 Webots。

1. 从开始菜单打开 Webots；
2. 选择 **File → Open World...**；
3. 打开：

```text
webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

4. 点击工具栏的运行按钮。

场景中的机器人 `self` 使用 `<extern>` controller。Webots Console 会显示 external controller 地址，例如：

```text
ipc://1234/self
tcp://<ip_address>:1234/self
```

记住这里显示的端口。端口不一定必须写成 1234/1235，以 Webots 当前打印的值为准。

Webots 保持打开，controller 停止后它会继续等待下一次连接。

## 运行 controller

回到容器终端。**不要直接执行二进制**，先把运行环境变量写好。

假设 Webots Console 显示端口 1234：

```bash
export WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1234/self
export WEBOTS_SIM_FLOW_RATE=0.1
export XR_ARMOR_OPENVINO_DEVICE=CPU
export QT_QPA_PLATFORM=offscreen
```

然后再运行：

```bash
./build/debug/rm_auto_aim
```

其中：

| 变量 | 作用 |
| --- | --- |
| `WEBOTS_CONTROLLER_URL` | Docker 中的 controller 连接 Windows Webots |
| `WEBOTS_SIM_FLOW_RATE` | 仿真运行倍率 |
| `XR_ARMOR_OPENVINO_DEVICE` | OpenVINO 推理设备 |
| `QT_QPA_PLATFORM` | 容器中不弹本地图形窗口 |

Windows 当前这套 Docker 环境使用 CPU：

```bash
export XR_ARMOR_OPENVINO_DEVICE=CPU
```

OpenVINO 还支持：

```text
GPU
NPU
AUTO_DETECT
```

`AUTO_DETECT` 的顺序是：

```text
NPU → GPU → CPU
```

显式指定某个设备而该设备不可用时，会直接报错，不会偷偷换到 CPU。

启动后看日志确认实际设备：

```text
ArmorDetector loaded OpenVINO ... device=CPU input=640x512
```

## 看预览

Docker 启动时已经把容器 8080 映射到 Windows：

```text
http://127.0.0.1:8080/
```

页面中应有：

```text
Detector
Tracker
Aimer
```

VS Code 在连接容器后通常也会自动发现监听端口，并在 **Ports** 面板中显示 8080。正常情况下不用手工再点 `Forward a Port`；如果没有自动出现，再手动添加即可。

## 修改、编译、重新运行

常用代码位置：

```text
User/xrobot.yaml        模块实例和参数
Modules/ArmorDetector/  检测
Modules/ArmorTracker/   跟踪
Modules/Aimer/          瞄准与弹道
webots/                 world、PROTO 和仿真资源
```

### 只改 C++

不用重新 configure：

```bash
cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

或者：

```text
Ctrl+Shift+P
→ Tasks: Run Task
→ CMake: build Webots debug
```

### 改了 YAML

直接 build 即可：

```bash
cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

CMake 会发现 `User/xrobot.yaml` 更新，先自动重新生成 `User/xrobot_main.hpp` 和 `User/xrobot_constexpr.hpp`，再继续编译。VS Code 的 CMake Tools **Build** 按钮和 `Ctrl+Shift+B → Build: Webots debug` 也都会得到同样的生成结果。

如果同时改了 CMakeLists、增加了源文件，CMake Tools 会重新 configure；命令行使用时重新执行一次前面的 `cmake -S ... -B ...` 即可。

### 重新运行

正在运行的 controller 在终端中按：

```text
Ctrl+C
```

Webots 不用关。

如果仍在同一个 shell，前面 `export` 的环境变量还在，直接：

```bash
./build/debug/rm_auto_aim
```

如果重新开了一个 `docker exec` shell，要重新执行那几条 `export`。

## Linux 原生运行

Linux 不需要 Docker 时，编译命令和上面基本一样。先安装 Git、CMake、Ninja、C++ 编译器、Python、Webots、OpenCV C++ 开发库和 OpenVINO C++ Runtime，再执行：

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
xrobot_setup

cmake -S . -B build/debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DAUTO_AIM_PREVIEW_IMAGE=ON

cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

Webots 仍可按 GUI 手动打开同一个 `.wbt`。然后在运行 controller 的终端中设置：

```bash
export WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1234/self
export WEBOTS_SIM_FLOW_RATE=0.1
export XR_ARMOR_OPENVINO_DEVICE=AUTO_DETECT
export QT_QPA_PLATFORM=offscreen
```

端口按 Webots Console 实际显示修改。

运行：

```bash
./build/debug/rm_auto_aim
```

Linux 主机如果同时有 NPU、GPU 和 CPU，自动模式优先 `NPU → GPU → CPU`。启动后仍以 `ArmorDetector loaded OpenVINO ... device=...` 为准。

如果你的电脑使用较新的 Intel 处理器，尤其是 Core Ultra 这类平台，通常同时带 Intel 核显，部分型号还带 NPU。驱动和 OpenVINO Runtime 安装正确时，`AUTO_DETECT` 很可能可以直接使用 `GPU` 或 `NPU`，不必把推理固定在 CPU。GPU/NPU 对这个视觉模型通常能显著降低推理耗时，也会减少 controller 对仿真速度的拖累；在硬件和场景合适时，Webots + 自瞄整条链路可以运行到接近实时的程度。

实际能否达到实时仍受 GPU/NPU 型号、驱动、Webots 渲染负载和场景复杂度影响。先看启动日志确认真正使用了哪个设备，再观察实际仿真速度；不要只根据 CPU 型号判断。

重复测试或 CI 再使用 `run_headless_preview.py`，日常新人上手先把上面的 GUI + 手工 controller 路线跑通。

## 接下来

Webots 比实车 Linux 自瞄多模拟了哪些东西，见 [Webots 仿真](/算法组/webots)。算法链路见[自瞄链路](/算法组/pipeline)，启动失败看[常见问题](/算法组/troubleshooting)。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker)、[Aimer](https://github.com/QDU-Robomaster/Aimer)。
