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
git submodule update --init --recursive
pip install libxr xrobot
xr_cubemx_cfg -d ./ --xrobot

xrobot_src_man create-sources
xrobot_init_mod \
  --config https://raw.githubusercontent.com/QDU-Robomaster/dev-c-robots/refs/heads/main/test.yaml \
  --dir ./Modules

xrobot_setup
```

## 与 `bsp-dev-c` 的差异

1. `bsp-dev-mc02` 需要执行 `xrobot_src_man create-sources`。
2. 模块初始化来源是 `QDU-Robomaster/dev-c-robots` 的 `test.yaml`。

官方文档：

1. [STM32 环境配置](https://xrobot-org.github.io/docs/env_setup/env-setup-stm32)
2. [STM32 代码生成](https://xrobot-org.github.io/docs/code_gen/stm32)
