---
id: ee-quick-start
title: 快速上手
slug: /电控组/quick-start
sidebar_position: 5
---

# 快速上手

下面是第一次拉起 `bsp-dev-c` 会用到的几步。STM32 编译、烧录和本地 IDE 配置按 [XRobot 官方 STM32 环境配置](https://xrobot-org.github.io/docs/env_setup/env-setup-stm32) 处理；Windows 原生 STM32 开发也是正常路径。

## 1. 准备 Python 工具

先完成 STM32 开发环境，再安装 XRobot / LibXR 的 Python 工具：

```bash
python -m pip install -U xrobot libxr
```

## 2. 获取仓库

```bash
git clone https://github.com/QDU-Robomaster/bsp-dev-c.git
cd bsp-dev-c
git submodule update --init --recursive
```

## 3. 初始化工程

```bash
xr_cubemx_cfg -d . --xrobot
xrobot_setup
```

## 4. 选择机器人配置

```bash
xrobot_gen_main --config User/RobotConfig/omni_infantry.yaml
```

常用机器人配置在 `User/RobotConfig/` 下，例如 `hero.yaml`、`omni_infantry.yaml`、`sentry.yaml`、`wheel_leg.yaml`。

换车或换配置后，重新执行 `xrobot_gen_main --config <yaml>`，再按官方 STM32 流程编译。

## 5. 相关文档

1. [`bsp-dev-c` 开发环境](/dev-environment/bsp-dev-c)
2. [XRobot STM32 代码生成](https://xrobot-org.github.io/docs/code_gen/stm32)
