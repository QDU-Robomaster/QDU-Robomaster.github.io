---
id: system
title: 环境配置
sidebar_position: 1
---

## 支持平台
LibXR本身是一个C++的库，不依赖于任何特定的操作系统，但需要依赖于C++17标准和C++标准库(无需操作系统,可以在裸机和RTOS上使用)。

CodeGenerator和XRobot是基于Python的包，需要Python3和pip3环境

**本仓库为未来战队队内使用仓库，由于电控组和算法组统一使用Linux开发环境故只给出Linux环境配置教程，详细教程请移步[XRobot](https://xrobot-org.github.io/)**

## Linux 环境配置
``` bash
sudo apt install pipx
sudo reboot
pipx install xrobot libxr
pipx ensurepath
```

## 算法组仓库配置
``` bash
git clone https://github.com/QDU-Robomaster/bsp-dev-autoaim.git
cd bsp-dev-autoaim
git submodule update --init --recursive
```

## VSC配置
安装下列三个插件即可运行

![算法插件 Logo](/img/算法插件.jpg)