---
id: env-setup-stm32
title: STM32 Environment Setup
sidebar_position: 1
---

# STM32 Environment Setup

This page will guide you on how to configure your STM32 development environment for use with **LibXR**, **CodeGenerator**, and **XRobot**.

## Basic Environment

Windows installation:

* [git](https://git-scm.com/)
* [python](https://www.python.org/downloads/)

For Linux, install with apt:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx
```

---

## Based on GCC/Clang (New STM32 VSCode Extension)

Since **STM32CubeMX (>=15.0)**, CMake configurations for Clang toolchains are already integrated.  
In the `Project Manager`, select `Default Compiler/Linker` as **gcc** or **starm-clang**. No extra setup is required.  
`LibXR_CppCodeGenerator` provides the helper script `xr_stm32_toolchain_switch` for switching compilers and standard libraries.

In VSCode, install the preview version of the extension `STMicroelectronics.stm32-vscode-extension`. The extension will automatically download toolchains and required resources.

When setting up a new STM32Cube project, it is recommended to use the **hybrid mode (gcc + starm-clang)** for maximum compatibility.

---

### stm32cube-clangd Extension Issues

* ~~Did not automatically add the C++ compiler path for `--query-driver`, and manual additions were overwritten each time the project was opened~~ → **Fixed in the latest version**.
* Still does **not** recognize ST-ARM-CLANG’s `--multi-lib-config` option.  
  → Avoid using **Hybrid (STARM_HYBRID)** mode with starm-clang.  
  → `gcc`, `starm-clang+newlib` and `starm-clang+picolibc` modes work correctly. **Recommended: starm-clang + picolibc**.

---

### CLion / Command-Line Compilation

On Windows, you need to add toolchains to your `PATH`. Installing **STM32CubeCLT** can simplify some of these settings.

```bash
# gcc
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${version}\bin

# starm-clang
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${version}\bin;
```

You also need to set environment variables:

**Windows:**

```powershell
$env:GCC_TOOLCHAIN_ROOT = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${version}\bin"
$env:CLANG_GCC_CMSIS_COMPILER = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${version}"
```

**Linux:**

```bash
export GCC_TOOLCHAIN_ROOT=/opt/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin
export CLANG_GCC_CMSIS_COMPILER=/opt/st-arm-clang
```

During compilation, specify:

```bash
-DCMAKE_TOOLCHAIN_FILE="cmake/gcc-arm-none-eabi.cmake"
```

or

```bash
-DCMAKE_TOOLCHAIN_FILE="cmake/starm-clang.cmake"
```

---

### Migrating Legacy CubeMX Projects (<15.0) to New Compilation

If you encounter a link error with the `ob` library, add this to your root `CMakeLists.txt`:

```cmake
# Remove wrong libob.a library dependency when using cpp files
list(REMOVE_ITEM CMAKE_C_IMPLICIT_LINK_LIBRARIES ob)
```

---

## Based on GCC (Legacy STM32 VSCode Extension) — *Not Recommended*

### Windows Environment Setup

Install [STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)

### Linux Environment Setup

Install required packages:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

Download the appropriate compiler from the [ARM official website](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads).  
For example, on x64 Linux, download the `AArch32 bare-metal target (arm-none-eabi)` under `x86_64 Linux hosted cross toolchains`:  
`arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz`

Extract and move it to `/opt`, then create a symlink:

```bash
sudo ln -s /opt/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi /usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi
```

You can now use commands like `arm-none-eabi-gcc`.

For convenience, link binaries:

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```
