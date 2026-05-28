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
git submodule update --init --recursive
pip install libxr xrobot
xr_cubemx_cfg -d ./ --xrobot
xrobot_setup
```

## 机器人配置

本地切换机器人时，替换 `xrobot_gen_main --config` 后面的 YAML，然后按官方 STM32 开发流程编译：

```bash
xrobot_gen_main --config User/RobotConfig/omni_infantry.yaml
```

官方文档：

1. [STM32 环境配置](https://xrobot-org.github.io/docs/env_setup/env-setup-stm32)
2. [STM32 代码生成](https://xrobot-org.github.io/docs/code_gen/stm32)
