---
id: algorithm-quick-start
title: 快速上手
slug: /算法组/quick-start
sidebar_position: 2
---

# 快速上手

Windows 下推荐用原生 Webots 显示场景，用 Docker 提供 Linux 编译和运行环境。Docker 容器手动启动，编译、运行 controller 等命令都在容器终端里执行。

## Windows

### 安装开发工具

先安装：

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)，使用 Linux containers
- [Webots](https://cyberbotics.com/doc/guide/installation-procedure)
- [VS Code](https://code.visualstudio.com/)

Windows 本机的 VS Code 只要求先安装：

```text
Dev Containers          ms-vscode-remote.remote-containers
```

XRobot、CMake Tools、clangd 等开发扩展安装在后面连接的 Linux 容器中。

### 拉取工程

PowerShell：

```powershell
git clone --config core.autocrlf=false https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
```

`libxr/` 是 Git submodule；`Modules/` 后面由 XRobot 下载。

### 准备开发容器

在仓库根目录构建开发镜像：

```powershell
docker build -t bsp-webots-autoaim-webots:local .\docker
```

创建开发容器：

```powershell
docker run -d `
  --name qdu-autoaim-dev `
  -p 8080:8080 `
  -v "${PWD}:/workspace" `
  -w /workspace `
  bsp-webots-autoaim-webots:local `
  sleep infinity
```

容器创建一次即可。以后从已有容器继续开发：

```powershell
docker start qdu-autoaim-dev
```

进入容器：

```powershell
docker exec -it qdu-autoaim-dev bash
```

后面的 Linux 命令默认都在这个容器终端中执行。

### 初始化 XRobot 模块

进入工程后执行：

```bash
xrobot setup
```

完成后应能看到 `Modules/QDU-Robomaster/ArmorDetector/`、`Modules/QDU-Robomaster/ArmorTracker/`、`Modules/QDU-Robomaster/Aimer/` 等目录，模块按 `xrobot.lock` 中的提交检出。`xrobot setup` 会同时生成入口文件 `User/xrobot_main.hpp`。

`User/xrobot_main.hpp` 由 XRobot 生成，`User/xrobot.yaml` 中 `constexprs` 段的常量生成到其中的 `AutoAimRunConfig` 命名空间。修改配置时改 YAML，再运行 `xrobot gen`。

### 配置与编译

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

`--parallel "$(nproc)"` 会按容器可用 CPU 核数并行编译。首次完整 Debug 构建仍会比较重。

## VS Code

### 连接开发容器

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

连接后在容器侧安装开发扩展。打开 Extensions 面板（`Ctrl+Shift+X`），搜索：

```text
@recommended
```

选择 **Install Workspace Recommended Extensions**。仓库已经在 `.vscode/extensions.json` 中声明推荐项，至少确认下面三个显示为 **Installed in Container: qdu-autoaim-dev**：

```text
XRobot                 xrobot.xrobot
CMake Tools            ms-vscode.cmake-tools
clangd                 llvm-vs-code-extensions.vscode-clangd
```

Python、Docker 和调试扩展也在推荐列表中。C/C++ 代码索引由 clangd 提供，Microsoft C/C++ IntelliSense 保持关闭。

这些扩展保存在 `qdu-autoaim-dev` 容器中。复用同一个容器时无需重复安装；删除并重建容器后再安装一次即可。

:::tip
这里使用 **Attach to Running Container** 连接已经启动的 `qdu-autoaim-dev`。`Reopen in Container` 会按 `.devcontainer` 配置另起一套 Compose 环境，两种方式不要混用。
:::

### 代码索引与跳转

这个工程使用 clangd 做 C/C++ 补全和跳转。它读取：

```text
build/debug/compile_commands.json
```

完成一次 Debug configure + build 后，`compile_commands.json` 才包含完整的编译参数。

Windows bind mount 下，首次 background index 往往需要一段时间。状态栏仍显示 indexing 时，跳转和补全尚未完全就绪。

索引完成后可以检查：

- `User/main.cpp` 中的 `XRobotMain` 能否 `F12` 跳转；
- `Modules/QDU-Robomaster/ArmorDetector/ArmorDetector.hpp` 中的类型能否正常跳转；
- include 是否不再整页报红。

`build/debug/compile_commands.json` 已存在而索引仍长期停滞时，可以重启 language server：

```text
Ctrl+Shift+P
→ clangd: Restart language server
```

这份数据库记录的是 `/workspace/...` 编译路径，因此应由容器中的 clangd 使用。

### 在 VS Code 中编译

首次完成 `xrobot setup` 后，仓库的 CMake Tools 配置会在打开工程时自动 configure：

```text
source      /workspace
build       /workspace/build/debug
generator   Ninja
build type  Debug
```

VS Code 底部状态栏或 CMake Tools 面板里的 **Build** 可以直接构建 `build/debug`，底层使用 Ninja 并行编译。

CMake 构建前检查 `User/xrobot_main.hpp` 是否与生成它的输入一致。修改 `User/xrobot.yaml` 后入口过期，构建停止并提示运行 `xrobot gen -c <配置>`；运行 `xrobot gen` 后再 Build。

仓库 task 提供包含生成步骤的完整流程：

```text
Ctrl+Shift+B
→ Build: Webots debug
```

它会显式执行：

```text
xrobot setup（检出模块并生成 XRobot 入口）
→ configure build/debug
→ 并行编译 rm_auto_aim
```

两种入口共用 `build/debug`。刚打开工程时 CMake Tools 会先 configure，状态栏完成后即可 Build。

## 打开 Webots 场景

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

后面连接 controller 时使用 Console 中显示的端口。

Webots 保持打开，controller 停止后它会继续等待下一次连接。

## 运行 controller

回到容器终端，先设置 controller 需要的环境变量。

假设 Webots Console 显示端口 1234：

```bash
export WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1234/self
export WEBOTS_SIM_FLOW_RATE=0.1
export XR_ARMOR_OPENVINO_DEVICE=CPU
export QT_QPA_PLATFORM=offscreen
```

再启动 controller：

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

Windows Docker 环境使用 CPU：

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

显式指定设备时，OpenVINO 会直接使用该设备；设备不可用则启动失败。

启动日志会打印实际推理设备：

```text
ArmorDetector loaded OpenVINO ... device=CPU input=640x512
```

## 查看算法预览

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

VS Code 通常会在 **Ports** 面板自动发现 8080。没有出现时再手动添加端口转发。

## 日常开发循环

常用代码位置：

```text
User/xrobot.yaml                       模块实例和参数
Modules/QDU-Robomaster/ArmorDetector/  检测
Modules/QDU-Robomaster/ArmorTracker/   跟踪
Modules/QDU-Robomaster/Aimer/          瞄准与弹道
webots/                                world、PROTO 和仿真资源
```

### C++ 修改

只改 C++ 时直接增量编译：

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

### YAML 与模块配置

先重新生成入口，再 build：

```bash
xrobot gen
cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

`xrobot gen` 由 `User/xrobot.yaml` 重新生成 `User/xrobot_main.hpp`。修改 `Modules/modules.yaml` 后改为运行 `xrobot setup`。`Ctrl+Shift+B → Build: Webots debug` 先执行 `xrobot setup`，因此同样会更新入口。

如果同时改了 CMakeLists、增加了源文件，CMake Tools 会重新 configure；命令行使用时重新执行一次前面的 `cmake -S ... -B ...` 即可。

### 重新启动 controller

正在运行的 controller 在终端中按：

```text
Ctrl+C
```

Webots 可以保持运行。

同一个 shell 中环境变量仍然有效，直接重新运行：

```bash
./build/debug/rm_auto_aim
```

新开的 `docker exec` shell 需要重新设置那几项环境变量。

## Linux 原生运行

Linux 可以直接在本机编译和运行。准备好 Git、CMake、Ninja、C++ 编译器、Python、Webots、OpenCV C++ 开发库和 OpenVINO C++ Runtime 后执行：

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive
pip install xrobot==1.0.0
xrobot setup

cmake -S . -B build/debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DAUTO_AIM_PREVIEW_IMAGE=ON

cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

在 Webots GUI 中打开同一个 `.wbt`，再在 controller 终端中设置：

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

`AUTO_DETECT` 按 `NPU → GPU → CPU` 选择 OpenVINO 能识别到的设备。启动日志中的 `ArmorDetector loaded OpenVINO ... device=...` 会给出最终结果。

较新的 Intel 平台，尤其 Core Ultra，通常带 Intel 核显，部分型号还带 NPU。OpenVINO 驱动完整时，`AUTO_DETECT` 往往可以直接把模型放到 GPU 或 NPU 上运行。相比 CPU 推理，这会明显减轻视觉模型对仿真速度的拖累；硬件条件合适时，Webots + 自瞄可以接近实时运行。

最终速度还受具体 GPU/NPU、驱动和 Webots 场景负载影响，直接看启动日志里的 `device=...` 和 Webots 实际运行速度即可。

自动回归和 CI 使用 `run_headless_preview.py`；日常开发以 GUI Webots + controller 为主。

## 继续阅读

Webots 比实车 Linux 自瞄多模拟了哪些东西，见 [Webots 仿真](/算法组/webots)。算法链路见[自瞄链路](/算法组/pipeline)，启动失败看[常见问题](/算法组/troubleshooting)。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)、[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)、[ArmorTracker](https://github.com/QDU-Robomaster/ArmorTracker)、[Aimer](https://github.com/QDU-Robomaster/Aimer)。
