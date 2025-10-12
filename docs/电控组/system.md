---
id: system
title: 环境配置
sidebar_position: 1
---

## 🌐 支持平台

- **LibXR** 是一个纯 C++ 库，**不依赖特定操作系统**，仅需支持 **C++17 标准** 及标准库。  
  ✅ 可在裸机（bare-metal）或各类 RTOS 上运行。

- **CodeGenerator** 与 **XRobot** 是基于 Python 的工具包，需安装：
  - **Python 3**
  - **pip3**

> 💡 **说明**：本仓库为未来战队内部使用。鉴于电控组与算法组统一采用 **Linux 开发环境**，本文仅提供 Linux 配置指南。  
> 更详细的教程请参阅官方文档：[XRobot 官网](https://xrobot-org.github.io/)

---

## 🐧 Linux 环境配置

推荐使用 `pipx` 管理 Python 工具，避免污染系统环境：

```bash
sudo apt update 
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx
sudo reboot  # 确保 PATH 生效
pipx install xrobot libxr
pipx ensurepath
```

## ⚙️ 电控组仓库配置

请确保已完成 [Linux 环境配置](#linux-环境配置)，包括 `xrobot` 和 `libxr` 的安装。

### 1. 克隆主仓库并初始化子模块

```bash
git clone https://github.com/QDU-Robomaster/bsp-dev-c.git
cd bsp-dev-c
git submodule update --init --recursive
```
### 2. 配置项目（使用libxr,xrobot集成）
``` bash 
xr_cubemx_cfg -d . --xrobot
xr_stm32_toolchain_switch clang -p
xrobot_setup
xrobot_gen_main
```
> 📌 上述命令将完成： 
- CubeMX 工程自动解析
- 切换至 Clang 编译器
- 生成 XRobot 项目骨架与主函数入口

## 💻 VSC配置
安装所有的推荐插件即可

![XRobot Logo](/img/电控插件.jpg)