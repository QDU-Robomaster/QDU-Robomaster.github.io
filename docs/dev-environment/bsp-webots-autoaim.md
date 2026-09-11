---
id: dev-environment-webots-autoaim
title: bsp-webots-autoaim
slug: /dev-environment/bsp-webots-autoaim
sidebar_position: 5
---

# bsp-webots-autoaim

`bsp-webots-autoaim` 是 Webots 自瞄仿真工程：在 Webots world 中运行真实的 Detector、Tracker、Aimer 链路，而不是另写一套仿真算法。

视觉推理统一使用 OpenVINO，不需要额外板端环境。

本页只讲这个仓库的环境、依赖和构建运行命令。第一次上手按顺序走完整流程，见 [算法组：快速上手](/算法组/quick-start)；仿真链路结构见 [Webots 仿真](/算法组/webots)。

## 依赖初始化

仓库有两类依赖，性质不同：

- `libxr/` 是 Git submodule，由 `git submodule update --init --recursive` 准备；
- `Modules/*` 由 XRobot 依据 `Modules/modules.yaml` 拉取，**不是** Git submodule。

`Modules/*` 未初始化时构建会直接失败：

```text
Missing modules: ...
```

因此首次构建必须显式初始化一次：

| 平台 | 命令 |
| --- | --- |
| Windows Docker | `docker compose run --rm -e XR_FORCE_XROBOT_SETUP=1 autoaim-build` |
| Linux 原生 | `export PATH="$HOME/.local/bin:$PATH"` 后执行 `xrobot_setup` |

这一步是有意的一次性动作：已经准备好的模块工作树不会被覆盖。

`User/xrobot_main.hpp` 由 `User/xrobot.yaml` 生成，不要直接手改；只改 `User/xrobot.yaml` 后重新构建即可。

## 基本流程

Windows 使用 Docker 内的 Linux controller：

```powershell
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim
git submodule update --init --recursive

docker compose build

docker compose run --rm `
  -e XR_FORCE_XROBOT_SETUP=1 `
  autoaim-build
```

compose 文件是仓库根目录的 `compose.yaml`，构建服务名为 `autoaim-build`。

Linux 原生：

```bash
git clone https://github.com/QDU-Robomaster/bsp-webots-autoaim.git
cd bsp-webots-autoaim

git submodule update --init --recursive

export PATH="$HOME/.local/bin:$PATH"
xrobot_setup
```

`docker/windows-deploy.ps1` 是 Windows 的脚本化入口，镜像构建、缺失模块初始化、连接原生 Webots 和预览端口映射都可以由它一次完成，等价于上面的手工命令。

## 构建

Windows Docker 路线不需要在宿主机单独安装 OpenVINO SDK，容器入口会自行查找。

Linux 原生需要显式指定 OpenVINO：

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake

cmake --build build -j4 --target rm_auto_aim
```

产物：

```text
build/rm_auto_aim
```

已验证的 Linux 原生环境：Ubuntu 24.04、Webots R2025a、GCC 13、CMake + Ninja、Python xrobot 0.3.1、OpenVINO 2025.4.0。

## 运行

Windows 原生 Webots 配 Docker controller：

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

- `host.docker.internal` 用于容器访问 Windows 宿主机；
- `127.0.0.1:18080` 只把预览网页绑定到本机。

不要把 controller 地址写成容器内的 `127.0.0.1:1235`。

Linux 原生：

```bash
WEBOTS_CONTROLLER_URL=tcp://127.0.0.1:1235/self \
XR_ARMOR_OPENVINO_DEVICE=CPU \
./build/rm_auto_aim
```

自动 smoke test：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 \
  --sim-flow-rate 0.1 \
  --run-root .vscode-runs
```

Webots 侧需要以 external controller 模式启动，主要 world 为：

```text
webots/worlds/auto_aim_test_field_target_vehicle_camera_preview.wbt
```

## 主要文件

```text
User/xrobot.yaml            BSP 模块实例和运行参数
Modules/modules.yaml        XRobot 模块依赖列表
webots/worlds/              仿真 world
webots/protos/              目标车、装甲板等 PROTO
docker/windows-deploy.ps1   Windows 脚本化入口
docker/entrypoints/         容器入口脚本
run_headless_preview.py     Linux / 容器自动 smoke test
```

## 常见问题

### `Missing modules: ...`

`Modules/*` 尚未初始化。Windows 加 `-e XR_FORCE_XROBOT_SETUP=1` 重跑一次；Linux 执行 `xrobot_setup`。

### `xrobot_setup: command not found`

```bash
ls ~/.local/bin/xrobot_setup
export PATH="$HOME/.local/bin:$PATH"
```

### CMake 找不到 OpenVINO

Linux 显式传入：

```bash
-DOpenVINO_DIR=/opt/intel/openvino_2025.4.0/runtime/cmake
```

### Webots 一直等待 external controller

1. Webots 是否以 `--port=1235 --extern-urls` 启动；
2. Windows Docker 是否使用 `tcp://host.docker.internal:1235/self`；
3. Linux 原生是否使用 `tcp://127.0.0.1:1235/self`。

### `Failed to create thread ... Operation not permitted`

若紧接着出现 `retrying with default attributes` 与 `Platform initialized`，这是实时调度属性不可用后的自动 fallback，不是启动失败。

### 预览网页打不开

Windows 默认映射 `127.0.0.1:18080 -> container:8080`。确认 controller 仍在运行，且 18080 未被其他程序占用。
