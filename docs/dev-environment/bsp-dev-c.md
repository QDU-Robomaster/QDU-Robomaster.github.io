---
id: dev-environment-devc
title: bsp-dev-c
slug: /dev-environment/bsp-dev-c
sidebar_position: 2
---

# bsp-dev-c

`bsp-dev-c` 是当前主要 C 板电控工程。

本地可使用 Windows 原生 STM32Cube / ARM 工具链，也可使用 Linux 下的 ARM 工具链。
STM32 编译环境按 XRobot 官方 STM32 环境配置处理；队内工程初始化和机器人配置如下。

## 基本流程

```bash
git clone --recursive https://github.com/QDU-Robomaster/bsp-dev-c.git
cd bsp-dev-c
pip install xrobot==1.0.0 libxr==6.0.0
xrobot setup
```

`xrobot` 与 `libxr` 的版本记录在 `Modules/modules.yaml` 的 `xrobot:` 和 `User/libxr_config.yaml` 的 `generator:` 中。`xrobot setup` 按 `xrobot.lock` 中的提交检出模块、检查所有配置并生成 `User/xrobot_main.hpp`。已克隆但未带子模块时，先运行 `git submodule update --init --recursive`。

在 CubeMX 中修改并重新生成代码后，运行 `libxr stm32 setup` 更新 `User/app_main.cpp`、`User/app_main.h`、`User/flash_map.hpp`、`User/libxr_config.yaml` 和 `cmake/LibXR.CMake`，`User Code` 区域保留。

## 机器人配置

本地切换机器人时，用 `xrobot gen -c` 选择 YAML，然后按官方 STM32 开发流程编译：

```bash
xrobot gen -c User/RobotConfig/omni_infantry_3.yaml
cmake --preset debug
cmake --build --preset debug
```

之后运行的 `xrobot gen` 和 `xrobot setup` 沿用这次选择的配置。配置修改后 `User/xrobot_main.hpp` 过期，构建停止并提示运行 `xrobot gen -c <配置>`。`tools/build.sh -c <配置> -p <预设>` 依次执行格式化、`xrobot gen`、CMake 配置与构建。

官方文档：

1. [STM32 环境配置](https://xrobot.work/docs/env_setup/env-setup-stm32)
2. [STM32 代码生成](https://xrobot.work/docs/code_gen/stm32)
3. [配置格式](https://xrobot.work/docs/proj_man/proj-man-config)
