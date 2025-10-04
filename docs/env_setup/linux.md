---
id: env-setup-linux
title: Linux环境配置
sidebar_position: 4
---

# Linux 环境配置

Linux下只需按照相关依赖包即可。

## 安装依赖

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build libwpa-client-dev libnm-dev libudev-dev gcc g++ gdb
```

## 使用Clang

直接用cmake指定C/C++编译器即可，无需特殊配置。
