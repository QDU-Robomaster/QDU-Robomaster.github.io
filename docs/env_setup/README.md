---
id: env-setup
title: 环境配置
sidebar_position: 4
---

# 环境配置

本页将指导你如何在本地系统中配置和使用 LibXR/CodeGenerator/XRobot。

## 支持平台

LibXR本身是一个C++的库，不依赖于任何特定的操作系统，但需要依赖于C++17标准和C++标准库(无需操作系统,可以在裸机和RTOS上使用)。

CodeGenerator和XRobot是基于Python的包，需要Python3和pip3环境。

## 安装

### LibXR

直接拉取代码:

```bash
git clone https://github.com/Jiu-xiao/libxr.git
```

推荐使用submodules或者subtree:

```bash
git submodule add https://github.com/Jiu-xiao/libxr.git libxr
```

### CodeGenerator(libxr)与XRobot

直接通过pip安装:

```bash
pip install libxr xrobot
```

使用pipx安装:

```bash
### windows
python -m pip install --user pipx
python -m pipx ensurepath
pipx install libxr xrobot
pipx ensurepath
# Restart your terminal

### linux
sudo apt install pipx
pipx install libxr xrobot
pipx ensurepath
# Restart your terminal
```

注意不要同时用 pip 和 pipx 安装同一个包，否则你的环境变量可能会混乱，导致版本冲突。
