---
id: dev-environment-webots-autoaim
title: bsp-webots-autoaim
slug: /dev-environment/bsp-webots-autoaim
sidebar_position: 5
---

# bsp-webots-autoaim

`bsp-webots-autoaim` 用 Webots 提供相机、IMU、云台和发射机构仿真，Detector、Tracker、Aimer 与实车工程共用。Windows 上运行原生 Webots，Linux 编译和 controller 放在 Docker 容器中。

第一次上手直接按[算法组：快速上手](/算法组/quick-start)操作。本页只保留环境和构建相关的参考命令。

## 依赖

仓库有两类外部依赖：

- `libxr/` 是 Git submodule；
- `Modules/*` 由 XRobot 按 `Modules/modules.yaml` 拉取。

拉取仓库后先执行：

```powershell
git submodule update --init --recursive
```

XRobot 模块在开发容器中初始化：

```bash
xrobot setup
```

`xrobot setup` 按 `xrobot.lock` 中的提交检出模块，完成后应能看到 `Modules/QDU-Robomaster/ArmorDetector/`、`Modules/QDU-Robomaster/ArmorTracker/`、`Modules/QDU-Robomaster/Aimer/` 等目录。

`User/xrobot_main.hpp` 是生成文件，`User/xrobot.yaml` 中 `constexprs` 段的常量生成到其中的 `AutoAimRunConfig` 命名空间。修改 `User/xrobot.yaml` 后运行 `xrobot gen`，修改 `Modules/modules.yaml` 后运行 `xrobot setup`。生成入口过期时，CMake 构建停止并提示运行 `xrobot gen -c <配置>`。

## Windows 开发环境

在仓库根目录构建镜像：

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

之后继续开发只需启动已有容器：

```powershell
docker start qdu-autoaim-dev
```

进入容器：

```powershell
docker exec -it qdu-autoaim-dev bash
```

VS Code 使用 **Dev Containers: Attach to Running Container...** 连接 `qdu-autoaim-dev`，工程目录为 `/workspace`。

仓库仍保留 `compose.yaml` 和 `docker/windows-deploy.ps1`，供已有自动化和维护脚本使用。新人开发流程统一使用上面的单容器方式，不要与 Compose 开发容器混用。

## 构建

容器内配置 Debug 构建：

```bash
cmake -S . -B build/debug -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DAUTO_AIM_PREVIEW_IMAGE=ON
```

并行编译：

```bash
cmake --build build/debug \
  --target rm_auto_aim \
  --parallel "$(nproc)"
```

产物：

```text
build/debug/rm_auto_aim
build/debug/compile_commands.json
```

仓库的 VS Code CMake Tools 配置使用同一个 `build/debug`，因此状态栏或 CMake Tools 面板里的 **Build** 与上面的命令行构建共用一套产物。

CI 同时使用 GCC 和 Clang 构建。容器里也可以通过 `CC` / `CXX` 显式选择编译器，例如：

```bash
CC=gcc CXX=g++ cmake -S . -B build/gcc -G Ninja -DCMAKE_BUILD_TYPE=Debug
CC=clang CXX=clang++ cmake -S . -B build/clang -G Ninja -DCMAKE_BUILD_TYPE=Debug
```

## 运行 controller

先在 Windows Webots 中打开：

```text
webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

运行 world 后，Webots Console 会打印 external controller 端口。假设端口为 `1234`，在容器终端中设置：

```bash
export WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:1234/self
export WEBOTS_SIM_FLOW_RATE=0.1
export XR_ARMOR_OPENVINO_DEVICE=CPU
export QT_QPA_PLATFORM=offscreen

./build/debug/rm_auto_aim
```

controller 端口以 Webots Console 实际输出为准。容器访问 Windows Webots 使用 `host.docker.internal`，不能写容器自己的 `127.0.0.1`。

算法预览直接访问：

```text
http://127.0.0.1:8080/
```

## Linux 原生

Linux 不使用 Docker 时，准备好 Webots、OpenCV C++、OpenVINO、CMake、Ninja 和 XRobot 后直接构建：

```bash
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

Webots 与 controller 在同一台 Linux 主机运行时，controller 地址使用：

```bash
export WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1234/self
```

端口仍以 Webots Console 为准。

## 自动测试

无头 smoke test：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/debug/rm_auto_aim \
  --runtime-sec 40 \
  --sim-flow-rate 0.1 \
  --run-root .vscode-runs
```

更完整的目标 / 空场验收见[测试与回归](/算法组/testing)。

## 主要文件

```text
User/xrobot.yaml            BSP 模块实例和运行参数
Modules/modules.yaml        XRobot 模块依赖列表
webots/worlds/              仿真 world
webots/protos/              目标车、装甲板等 PROTO
docker/                     开发镜像和辅助脚本
compose.yaml                现有 Compose 自动化配置
run_headless_preview.py     无头 smoke test
```

## 常见问题

### `Missing modules: ...`

在开发容器中执行：

```bash
xrobot setup
```

### CMake 找不到 OpenVINO

Docker 镜像已经包含 OpenVINO。Linux 原生环境可显式传入：

```bash
-DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake
```

### Webots 一直等待 controller

检查 Webots Console 打印的端口，并确认容器中使用：

```text
WEBOTS_CONTROLLER_URL=tcp://host.docker.internal:<port>/self
```

Linux 原生则使用 `127.0.0.1`。

### 预览网页打不开

确认 `qdu-autoaim-dev` 创建时包含 `-p 8080:8080`，controller 仍在运行，然后访问 `http://127.0.0.1:8080/`。
