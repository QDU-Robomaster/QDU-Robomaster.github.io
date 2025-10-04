---
id: proj-man-init-mod
title: 初始化模块仓库
sidebar_position: 1
---

# 初始化模块仓库

XRobot 提供了模块初始化工具 `xrobot_init_mod`，用于自动拉取和同步你的项目依赖模块仓库。该工具支持**本地配置文件**和**远程配置文件**两种模式，并具备自动递归解析模块依赖、确保所有依赖和版本一致的能力。

---

## 基本用法

### 1. 初次运行（自动生成配置文件模板）

如果当前没有配置文件（如 `Modules/modules.yaml`），第一次运行会自动生成模板，供你后续编辑。

```bash
$ xrobot_init_mod
[WARN] Configuration file not found, creating template: Modules/modules.yaml
[INFO] Please edit the configuration file and rerun this script.
```

你只需要按照模板填写你的模块列表，例如：

```yaml
modules:
  - xrobot-org/BlinkLED
  - xrobot-org/MySensor@master
```

然后再次运行即可自动拉取所有模块仓库：

```bash
$ xrobot_init_mod
[INFO] Cloning new module: BlinkLED
[INFO] Cloning new module: MySensor
[SUCCESS] All modules and their dependencies processed.
```

---

### 2. 指定本地配置文件

如需指定本地配置文件，可使用 `--config` 选项：

```bash
$ xrobot_init_mod --config Modules/modules.yaml
[INFO] Updating module: BlinkLED
[SUCCESS] All modules and their dependencies processed.
```

---

### 3. 指定远程配置文件

如需指定远程配置文件（如 GitHub Raw 地址），也可直接传递 URL：

```bash
$ xrobot_init_mod --config https://raw.githubusercontent.com/<user>/<repo>/<branch>/modules.yaml
[INFO] Cloning new module: BlinkLED
[SUCCESS] All modules and其 dependencies processed.
```

---

### 4. 自定义仓库源（可选）

XRobot 支持通过 `sources.yaml` 配置多个模块源和镜像。  
如需指定自定义 sources 文件，可以用 `--sources` 选项：

```bash
$ xrobot_init_mod --config Modules/modules.yaml --sources Modules/sources.yaml
```

sources.yaml 支持聚合多个 index.yaml 源（如官方/私有镜像），典型格式如下：

```yaml
sources:
- url: https://xrobot-org.github.io/xrobot-modules/index.yaml
  priority: 0
...
```

---

## 递归依赖解析与版本一致性

- 工具会**自动递归解析所有依赖模块**（依赖信息写在各模块头文件 MANIFEST 区块中），确保依赖树完整且版本一致。
- 若同一模块被不同模块依赖但指定了不同版本，工具会**报错提示依赖冲突**，需你手动统一依赖版本。

---

## CMake 集成

自动同步的所有模块会被下载到 `Modules/` 目录。  
只需在你的工程 `CMakeLists.txt` 中加入如下代码即可自动包含所有模块：

```cmake
# 添加 XRobot Modules
include(${CMAKE_CURRENT_LIST_DIR}/Modules/CMakeLists.txt)
```

别忘了把LibXR也包含进来！

```cmake
# 一个简单的例子
project(xrobot_mod_test CXX)
set(CMAKE_CXX_STANDARD 17)
add_executable(xr_test main.cpp)
add_subdirectory(libxr)
target_include_directories(xr_test PUBLIC $<TARGET_PROPERTY:xr,INTERFACE_INCLUDE_DIRECTORIES> ${CMAKE_SOURCE_DIR}/User)
target_link_libraries(xr_test PUBLIC xr)
include(Modules/CMakeLists.txt)
```
