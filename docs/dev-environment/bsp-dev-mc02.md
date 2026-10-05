---
id: dev-environment-mc02
title: bsp-dev-mc02
slug: /dev-environment/bsp-dev-mc02
sidebar_position: 3
---

# bsp-dev-mc02

`bsp-dev-mc02` 是 MC02 嵌入式平台工程。

本地可使用 Windows 原生 STM32Cube / ARM 工具链，也可使用 Linux 下的 ARM 工具链。
STM32 编译环境按 XRobot 官方 STM32 环境配置处理；MC02 工程初始化差异如下。

## 基本流程

```bash
git clone --recursive https://github.com/QDU-Robomaster/bsp-dev-mc02.git
cd bsp-dev-mc02
pip install xrobot==1.0.0 libxr==6.0.0
xrobot setup
cmake --preset Debug
cmake --build --preset Debug
```

`xrobot setup` 按 `xrobot.lock` 中的提交检出模块、检查配置并生成 `User/xrobot_main.hpp`。在 CubeMX 中修改并重新生成代码后，运行 `libxr stm32 setup` 更新 `User/app_main.cpp`、`User/app_main.h`、`User/flash_map.hpp`、`User/libxr_config.yaml` 和 `cmake/LibXR.CMake`，`User Code` 区域保留。

## 与 `bsp-dev-c` 的差异

1. `bsp-dev-mc02` 只有 `User/xrobot.yaml` 一份配置，`xrobot setup` 直接由它生成 `User/xrobot_main.hpp`。
2. CMake 预设为 `Debug` 和 `Release`，产物为 `build/<预设>/CtrBoard-H7_ALL.elf`。

官方文档：

1. [STM32 环境配置](https://xrobot.work/docs/env_setup/env-setup-stm32)
2. [STM32 代码生成](https://xrobot.work/docs/code_gen/stm32)
3. [配置格式](https://xrobot.work/docs/proj_man/proj-man-config)
