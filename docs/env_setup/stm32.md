---
id: env-setup-stm32
title: STM32环境配置
sidebar_position: 1
---

# STM32 环境配置

本页面将指导你如何配置STM32的开发环境，以便使用LibXR，CodeGenerator，XRobot。

推荐配合[视频教程](https://space.bilibili.com/339766655/lists/5028472)使用此文档。

## 基础环境

Windows安装：

* [git](https://git-scm.com/)
* [python](https://www.python.org/downloads/)

linux使用apt安装：

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx
```

## 基于GCC/Clang (新版STM32 VSCode 插件)

在STM32CubeMX (>=15.0)中，已经集成了Clang 相关工具链的CMake配置。 在`Project Manager`中选择`Default Compiler/Linker`为gcc或者starm-clang即可，不需要额外配置。LibXR_CppCodeGenerator提供的`xr_stm32_toolchain_switch`可以用于切换编译器与标准库。

在VSCode中安装使用插件`STMicroelectronics.stm32-vscode-extension`的预览版本即可，插件会自行下载工具链等资源。

Setup STM32Cube project的时候建议选择混合模式（gcc+starm-clang）以便适应所有情况。

---

### stm32cube-clangd 插件主要问题

* ~~不会为 `--query-driver` 自动添加 C++ 编译器路径，且手动添加后每次打开工程会被覆盖~~：新版已经修复
* 无法识别 ST-ARM-CLANG 的 `--multi-lib-config` 编译选项：避免使用混合（Hybrid）模式的starm-clang编译器，gcc、starm-clang+newlib和starm-clang+picolibc模式的starm-clang编译器均可以正常使用，推荐使用picolibc。

### CLion / 命令行编译

windows需要先配置相关path。安装STM32CubeCLT可能会简化下面某些设置。

```bash
# gcc
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${版本号}\bin

# starm-clang
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${版本号}\bin;
```

需要设置环境变量：

windows:

```powershell
$env:GCC_TOOLCHAIN_ROOT = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${版本号}\bin"
$env:CLANG_GCC_CMSIS_COMPILER = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${版本号}"
```

linux:

```bash
export GCC_TOOLCHAIN_ROOT=/opt/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin
export CLANG_GCC_CMSIS_COMPILER=/opt/st-arm-clang
```

编译时还要指定`-DCMAKE_TOOLCHAIN_FILE="cmake/gcc-arm-none-eabi.cmake"`或者`-DCMAKE_TOOLCHAIN_FILE="cmake/starm-clang.cmake"`来选择工具链。

### 旧版CubeMX工程(<15.0)迁移到新版本编译问题

如果提示链接不到库`ob`，则在工程根目录的`CMakeLists.txt`中添加:

```cmake
# Remove wrong libob.a library dependency when using cpp files
list(REMOVE_ITEM CMAKE_C_IMPLICIT_LINK_LIBRARIES ob)
```

## 基于GCC的旧版STM32 VSCode 插件（不推荐）

### Windows环境配置

需要安装[STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)

### Linux环境配置

需要安装的软件包:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

从[ARM官网](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads)下载适合你的编译器。例如使用x64的linux系统，请下载`x86_64 Linux hosted cross toolchains`下的`AArch32 bare-metal target (arm-none-eabi)`，即为arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz。

解压后移动到`/opt`下，创建软链接`/usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi`，即可使用`arm-none-eabi-`前缀的命令，例如`arm-none-eabi-gcc`。

然后使用链接命令：

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```
