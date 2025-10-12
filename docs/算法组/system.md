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
sudo apt install pipx
sudo reboot  # 确保 PATH 生效
pipx install xrobot libxr
pipx ensurepath
```

## 📦 外部库依赖
### OpenCV 与 海康相机 SDK
- 海康相机驱动下载地址:[点击前往下载页面](https://www.hikrobotics.com/cn/machinevision/service/download/?module=0)

``` bash
# 安装 OpenCV 开发库
sudo apt install libopencv-dev

# 安装海康相机运行时 SDK（请根据实际下载的文件名调整）
sudo dpkg -i MvCamCtrlSDK_Runtime-4.6.1_x86_64_20250902.deb
```

## ⚙️ 算法组仓库配置

请确保已完成 [Linux 环境配置](#linux-环境配置)，包括 `xrobot` 和 `libxr` 的安装。

### 1.克隆主仓库并初始化子模块

```bash
git clone https://github.com/QDU-Robomaster/bsp-dev-autoaim.git
cd bsp-dev-autoaim
git submodule update --init --recursive
```
### 2. 配置项目（使用libxr,xrobot集成）
```bash
xrobot_setup
xrobot_gen_main
```
> 📌 上述命令将完成： 
- 生成 XRobot 项目骨架与主函数入口

## 💻 VSC配置
安装下列三个插件即可运行

![算法插件 Logo](/img/算法插件.jpg)