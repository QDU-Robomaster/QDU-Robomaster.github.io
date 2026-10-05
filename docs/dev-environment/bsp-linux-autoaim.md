---
id: dev-environment-linux-autoaim
title: bsp-linux-autoaim
slug: /dev-environment/bsp-linux-autoaim
sidebar_position: 4
---

# bsp-linux-autoaim

`bsp-linux-autoaim` 是实车 Linux 自瞄工程。

## 基本流程

```bash
git submodule update --init --recursive
pip install xrobot==1.0.0
xrobot setup
apt-get update
apt-get install -y --no-install-recommends libgpiod-dev
```

`xrobot==1.0.0` 与 `Modules/modules.yaml` 的 `xrobot:` 一致。`xrobot setup` 按 `xrobot.lock` 中的提交检出 `Modules/`、检查所有配置并生成 `User/xrobot_main.hpp`。HailoRT 或 OpenVINO 不在 CMake 默认搜索路径时，设置 `HailoRT_DIR`、`OpenVINO_DIR` 或 `CMAKE_PREFIX_PATH`。

## 构建

常用运行配置：

| 运行配置 | 用途 |
| --- | --- |
| `User/xrobot.yaml` | 默认配置，完整自瞄链路 |
| `User/RunConfig/hik.yaml` | 实机 Hik 配置 |
| `User/RunConfig/sentry.yaml` | 哨兵配置 |
| `User/RunConfig/vision_capture.yaml` | 同步采集与标定数据 |

```bash
xrobot gen -c User/RunConfig/<name>.yaml
cmake --preset debug
cmake --build --preset debug --target rm_auto_aim
```

`xrobot gen -c` 选择配置，之后运行的 `xrobot gen` 和 `xrobot setup` 沿用这次选择。各配置 `constexprs` 段的常量生成到 `User/xrobot_main.hpp` 的 `AutoAimRunConfig` 命名空间。配置修改后 `User/xrobot_main.hpp` 过期，构建停止并提示运行 `xrobot gen -c <配置>`。CMake 预设有 `debug`、`relWithDebInfo` 和 `release`，产物为 `build/<预设>/rm_auto_aim`。

## 本地硬件运行补充

1. Hik SDK 已安装并能被动态链接器找到。
2. HailoRT 或 OpenVINO runtime 能被 CMake 和运行时找到；`User/xrobot.yaml`、`hik.yaml` 和 `sentry.yaml` 的 `INT16_HEAD_L` 使用 HailoRT。
3. 相机、串口、topic 名称和 `User/RunConfig/hik.yaml` 一致。
4. 手眼外参写在 `User/RunConfig/hik.yaml` 的 `ArmorTracker.cfg.extrinsic.camera_mount_to_body`；`User/xrobot.yaml` 和 `User/RunConfig/sentry.yaml` 使用各自文件中的同名字段。
