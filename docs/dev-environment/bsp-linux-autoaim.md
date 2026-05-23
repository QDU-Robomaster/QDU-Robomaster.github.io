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
pip install xrobot
apt-get update
apt-get install -y --no-install-recommends libgpiod-dev
```

构建前确认 `Modules/`、`libxr/` 已初始化，并设置 `OPENVINO_DIR`。

## 构建

常用运行配置：

| 运行配置 | build dir |
| --- | --- |
| `User/RunConfig/capturefile.yaml` | `build_capturefile` |
| `User/RunConfig/hik.yaml` | `build_hik` |

```bash
xrobot_gen_main \
  --config User/RunConfig/<name>.yaml \
  --output User/xrobot_main.hpp

cmake . -B<build_dir> -G Ninja \
  -DOpenVINO_DIR="$OPENVINO_DIR" \
  -DLIBXR_PRINT_INTEGER_ENABLE_64BIT=ON \
  -DLIBXR_PRINT_FLOAT_ENABLE_DOUBLE=ON \
  -DLIBXR_PRINT_ENABLE_POINTER=ON

cmake --build <build_dir> --target rm_auto_aim
```

## 本地硬件运行补充

1. Hik SDK 已安装并能被动态链接器找到。
2. OpenVINO runtime 能被 CMake 和运行时找到。
3. 相机、串口、topic 名称和 `User/RunConfig/hik.yaml` 一致。
4. 手眼外参写在 `User/RunConfig/hik.yaml` 的 `ArmorTracker.cfg.extrinsic.camera_mount_to_body`；回放配置对应 `User/RunConfig/capturefile.yaml` 的同名字段。
