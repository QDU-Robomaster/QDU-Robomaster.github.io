---
id: ee-quick-start
title: 快速上手
slug: /电控组/quick-start
sidebar_position: 5
---

# 快速上手

本文给新成员提供电控工程从 0 到能编译运行的最短路径。

## 1. 前置环境

开发环境统一使用 Linux（Ubuntu 22.04/24.04 均可）。

### 1.1 安装基础工具

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake ninja-build tar xz-utils wget pipx gcc g++ gdb
pipx ensurepath
```

### 1.2 安装 XRobot / LibXR 工具

```bash
pipx install xrobot
pipx install libxr
```

安装后确认：

```bash
xrobot --help
libxr --help
```

## 2. 获取电控仓库

```bash
git clone https://github.com/QDU-Robomaster/bsp-dev-c.git
cd bsp-dev-c
git submodule update --init --recursive
```

## 3. 初始化工程

在 `bsp-dev-c` 根目录执行：

```bash
xr_cubemx_cfg -d . --xrobot
xr_stm32_toolchain_switch clang -p
xrobot_setup
xrobot_gen_main
```

这些命令会完成：

1. CubeMX 工程解析。
2. 工具链配置切换。
3. XRobot 工程骨架和主入口生成。

## 4. 添加模块（最常用）

```bash
xrobot_add_mod CMD --instance-id cmd
xrobot_add_mod Gimbal --instance-id gimbal
xrobot_add_mod Chassis --instance-id chassis
xrobot_gen_main
```

建议流程：

1. 先加基础输入模块（CMD/传感器）。
2. 再加执行模块（Gimbal/Chassis/Launcher）。
3. 每次改模块配置后都重新 `xrobot_gen_main`。

## 5. 编译与构建

### 5.1 Debug 构建

```bash
cube-cmake --build /home/leo/Documents/bsp-dev-c/build/debug --
```

### 5.2 Release 构建

```bash
cube-cmake --build /home/leo/Documents/bsp-dev-c/build/release --
```

## 6. 代码格式化

项目中已有格式化脚本，建议在提交前执行：

```bash
tools/format_driver_src.sh
```

只检查不改文件：

```bash
tools/format_driver_src.sh --check
```

## 7. 新人首周建议任务

1. 跑通一次完整构建（Debug + Release）。
2. 阅读 `CMD / Gimbal / Chassis` 三个模块 README。
3. 完成一次小改动并通过编译。
4. 提交一次规范 PR（含文档更新）。

## 8. 常见问题

### 8.1 `xrobot` 命令找不到

1. 执行 `pipx ensurepath` 后重新打开终端。
2. 检查 `~/.local/bin` 是否在 `PATH`。

### 8.2 生成主函数后编译报模块未找到

1. 检查模块是否已添加到配置文件。
2. 检查子模块是否初始化完整。
3. 重新执行 `xrobot_gen_main`。

### 8.3 模块加了但运行没有效果

1. 检查构造参数、依赖模块和硬件节点名。
2. 检查 Topic 名称是否和订阅侧一致。
3. 先用最小配置验证，再逐步加复杂参数。

## 9. 推荐阅读

1. 官方项目初始化：<https://xrobot-org.github.io/docs/project-management/init-project/>
2. 官方快速开始：<https://xrobot-org.github.io/docs/project-management/quick-start/>
3. 官方命令使用：<https://xrobot-org.github.io/docs/project-management/commands/>
