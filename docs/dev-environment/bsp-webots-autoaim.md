---
id: dev-environment-webots-autoaim
title: bsp-webots-autoaim
slug: /dev-environment/bsp-webots-autoaim
sidebar_position: 5
---

# bsp-webots-autoaim

`bsp-webots-autoaim` 是 Webots 自瞄仿真工程。

## 基本流程

```bash
git submodule update --init --recursive
pip install xrobot
```

构建前确认 `Modules/`、`libxr/` 已初始化，并设置 `OpenVINO_DIR`。

## 构建

```bash
cmake . -Bbuild -G Ninja \
  -DOpenVINO_DIR="$OPENVINO_DIR" \
  -DLIBXR_PRINT_INTEGER_ENABLE_64BIT=ON \
  -DLIBXR_PRINT_FLOAT_ENABLE_DOUBLE=ON \
  -DLIBXR_PRINT_ENABLE_POINTER=ON

cmake --build build
```

仓库里的 Docker 入口会在本地构建前按 `User/xrobot.yaml` 重新生成入口文件。

## 本地生成入口

仓库中提交了 `User/xrobot_main.hpp`。本地修改 `User/xrobot.yaml` 或模块配置后，应重新生成：

```bash
python3 -m xrobot.GenerateMain \
  --output User/xrobot_main.hpp \
  --config User/xrobot.yaml
```

## Docker 构建与预览

Windows 或缺少 Webots 依赖的环境可以使用仓库内 Docker 入口：

```powershell
.\docker\windows-deploy.ps1
.\docker\windows-deploy.ps1 -Preview -RuntimeSec 10
```

对应的 compose 服务为：

```powershell
docker compose run --rm --no-build autoaim-build
docker compose run --rm --no-build autoaim-preview
```

Docker 构建脚本默认要求模块已初始化。需要 Docker 入口代为初始化模块时，显式设置：

```powershell
$env:XR_FORCE_XROBOT_SETUP = "1"
```
