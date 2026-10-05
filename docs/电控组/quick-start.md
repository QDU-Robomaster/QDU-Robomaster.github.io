---
id: ee-quick-start
title: 快速上手
slug: /电控组/quick-start
sidebar_position: 2
---

# 快速上手

先用 C 板默认的 LED 程序走一遍下载、生成、编译和烧录，再换成整车配置。

## 准备工具

按 [STM32 环境配置](https://xrobot.work/docs/env_setup/env-setup-stm32)安装工具链和调试工具。Windows 可以直接使用原生 STM32 开发环境。

XRobot 和代码生成器装在自己的 Python 环境中：

```bash
python -m pip install xrobot==1.0.0 libxr==6.0.0
```

这里的 Python 包 `libxr` 是代码生成工具。工程使用的 C++ 库通过 Git submodule 获取。两个包的版本记录在 `Modules/modules.yaml` 的 `xrobot:` 和 `User/libxr_config.yaml` 的 `generator:` 中。

## 拉取与初始化

```bash
git clone --recursive https://github.com/QDU-Robomaster/bsp-dev-c.git
cd bsp-dev-c
xrobot setup
```

LibXR 位于 `Middlewares/Third_Party/LibXR/`，各模块按 `xrobot.lock` 中的提交检出到 `Modules/<owner>/<Repo>/`。`xrobot setup` 同时检查所有配置，并由默认配置 `User/xrobot.yaml` 生成入口 `User/xrobot_main.hpp`：

```yaml
modules:
  - module: xrobot-org/BlinkLED
    id: blink_led
    args:
      - led: LED_B
      - blink_cycle: 250
settings:
  monitor_sleep_ms: 1000
```

默认配置创建 `BlinkLED` 实例 `blink_led`，`blink_cycle` 为 250。`LED_B` 是 `User/app_main.cpp` 中用 `XR_REGISTER` 注册的 GPIO。配置格式见 [XRobot 文档](https://xrobot.work/docs/proj_man/proj-man-config)。

## 编译

在安装好 STM32 工具的 Bash 或 Git Bash 中执行：

```bash
bash tools/build.sh --skip-format -c User/xrobot.yaml -b build/debug
```

脚本会生成入口、配置 CMake 并编译。`--skip-format` 只跳过源码格式化，方便第一次构建时保持下载下来的模块不变。

构建目录中应有：

```text
build/debug/DevC.elf
build/debug/DevC.hex
build/debug/DevC.bin
```

使用原生 PowerShell 开发时，可按 [bsp-dev-c 环境页](/dev-environment/bsp-dev-c)配置工具链后通过 CMake 编译。

## 烧录与调试

连接 C 板和调试探针，在 STM32 调试工具中选择刚生成的 `DevC.elf`，确认芯片型号和 SWD 连接后下载、复位。程序启动后观察 LED。

没有预期现象时，先检查是否停在断点、异常或初始化阶段。终端输出接在 USB OTG FS CDC；接线和端口名称见[外设映射](/电控组/hardware-mapping)。

首次运行整车配置前，先断开电机动力，核对 CAN ID、方向和限位后再逐项通电。

## 改一个参数

把 `User/xrobot.yaml` 中的 `blink_cycle` 从 250 改为 500，重新生成、编译并烧录，观察 LED 周期的变化。配置改在 YAML 中，生成头文件会在下一次运行生成器时覆盖。

整车配置另放在 `User/RobotConfig/`，例如：

```bash
xrobot gen -c User/RobotConfig/omni_infantry_3.yaml
```

之后运行的 `xrobot gen` 和 `xrobot setup` 沿用这次选择的配置。各份文件的用途见[机器人配置](/电控组/robot-configs)。

源码：[bsp-dev-c](https://github.com/QDU-Robomaster/bsp-dev-c)。
