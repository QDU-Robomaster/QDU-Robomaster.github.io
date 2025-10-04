---
id: proj-man
title: 项目管理（XRobot）
sidebar_position: 7
---

# 项目管理（XRobot）

XRobot 是一套面向嵌入式系统（如 STM32）的自动化代码生成工具，配合模块化硬件抽象层 LibXR 使用。它支持模块仓库管理、参数配置和主函数自动生成等工作，极大提高嵌入式项目的工程组织和开发效率。

本章介绍 XRobot 的安装、目录结构、主要功能、命令行工具用法，以及完整的快速上手流程。

---

## 安装

推荐通过 pipx 安装（支持隔离环境）：

**Windows：**

```ps
python -m pip install --user pipx
python -m pipx ensurepath
pipx install xrobot
# 重启终端
```

**Linux：**

```bash
sudo apt install pipx
pipx install xrobot
pipx ensurepath
# 重启终端
```

**或者使用 pip 安装：**

```bash
pip install xrobot
```

**源码安装：**

```bash
git clone https://github.com/xrobot-org/XRobot.git
cd XRobot
pip install .
```

注意不要同时用 pip 和 pipx 安装同一个包，否则你的环境变量可能会混乱，导致版本冲突。

---

## 目录结构约定

XRobot 推荐如下目录布局进行模块管理和代码生成：

```text
YourProject/
├── Modules/               # 存放模块仓库
│   └── modules.yaml       # 仓库列表
│   └── sources.yaml       # （可选）模块源索引
├── User/                  # 用户配置与生成输出
│   ├── xrobot.yaml        # 构造参数配置
│   └── xrobot_main.hpp    # 自动生成主函数
```

---

## 功能总览

- **模块仓库拉取与同步**  
  自动拉取、同步和递归解析模块仓库，保证依赖与版本一致性。
- **参数自动提取与配置**  
  自动解析模块头文件参数，生成和管理 YAML 配置文件。
- **自动主函数生成**  
  根据配置自动生成 C++ 入口函数 `XRobotMain()`，支持多模块、实例和嵌套结构。
- **manifest 解析**  
  解析并格式化模块头文件清单（manifest）。
- **模块模板快速生成**  
  一键生成包含 CI 的标准化模块目录。
- **多源模块管理**  
  支持本地/远程 YAML 配置和多模块源索引管理。

---

## 命令行工具一览

| 命令 Command        | 说明                             | Description                                        |
| ------------------- | -------------------------------- | -------------------------------------------------- |
| `xrobot_gen_main`   | 自动生成 C++ 主函数              | Generate main C++ entry source file                |
| `xrobot_mod_parser` | 解析模块并打印 manifest 信息     | Parse and show module manifest                     |
| `xrobot_create_mod` | 快速创建标准化模块目录           | Create a new module folder & header                |
| `xrobot_init_mod`   | 拉取并递归同步所有模块仓库       | Clone and recursively sync all module repos        |
| `xrobot_setup`      | 一键初始化工作区和生成主函数     | One-click workspace setup & main function generate |
| `xrobot_add_mod`    | 添加模块仓库或追加模块实例到配置 | Add repo or append module instance config          |
| `xrobot_src_man`    | 多源模块仓库管理与索引工具       | Multi-source module repository management utility  |

详细参数和用法见后续章节。

---

## 快速上手（推荐流程）

```bash
# 1. 一键初始化环境、拉取模块、生成主函数（推荐）
# 1. One-click initialize workspace, fetch modules, and generate main function (recommended)
$ xrobot_setup
Starting XRobot auto-configuration...
[INFO] Created default Modules/modules.yaml
Please edit this file; each line should be a full module name like:
  - xrobot-org/BlinkLED
  - your-namespace/YourModule@dev
[INFO] Created default Modules/sources.yaml
Please configure sources index.yaml for official or custom/private mirrors.
Default official source already included.

$ xrobot_setup
Starting XRobot auto-configuration...
[EXEC] xrobot_init_mod --config Modules/modules.yaml --directory Modules --sources Modules/sources.yaml
[INFO] Cloning new module: xrobot-org/BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 31, done.
remote: Counting objects: 100% (31/31), done.
remote: Compressing objects: 100% (21/21), done.
remote: Total 31 (delta 10), reused 31 (delta 10), pack-reused 0 (from 0)
Receiving objects: 100% (31/31), 4.43 KiB | 2.22 MiB/s, done.
Resolving deltas: 100% (10/10), done.
[SUCCESS] All modules and their dependencies processed.
[INFO] Created default Modules/CMakeLists.txt: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp

All done! Main function generated at: User/xrobot_main.hpp

# 2. 单独拉取/同步模块仓库（可选）
# 2. Pull or sync module repositories separately (optional)
$ xrobot_init_mod --config Modules/modules.yaml --directory Modules
[INFO] Updating module: xrobot-org/BlinkLED
Already up to date.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules and their dependencies processed.

# 3. 创建模块
# 3. Create a module
$ xrobot_create_mod MySensor --desc "IMU interface module" --hw i2c1
[OK] Module MySensor generated at Modules/MySensor

# 4. 查看模块信息
# 4. View module information
$ xrobot_mod_parser --path ./Modules/MySensor/

=== Module: MySensor.hpp ===
Description       : IMU interface module

Constructor Args  :
Required Hardware : i2c1
Depends           : None

# 5. 添加模块仓库（如需自定义来源）
# 5. Add a module repository (custom source, optional)
$ xrobot_add_mod your-namespace/YourModule@main
[SUCCESS] Added repo module 'your-namespace/YourModule@main' to Modules/modules.yaml

# 6. 添加模块实例
# 6. Add a module instance
$ xrobot_add_mod MySensor
[SUCCESS] Appended module instance 'MySensor' as id 'MySensor_0' to User/xrobot.yaml

# 7. 查看模块实例
# 7. View module instances
$ cat ./User/xrobot.yaml
global_settings:
  monitor_sleep_ms: 1000
modules:
- name: BlinkLED
  constructor_args:
    blink_cycle: 250
- id: MySensor_0
  name: MySensor
  constructor_args: {}

# 8. 重新生成主函数（支持自动扫描和配置）
# 8. Regenerate main function (auto scan & config supported)
$ xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED, MySensor
[SUCCESS] Generated entry file: User/xrobot_main.hpp

# 9. 查看主函数
# 9. View main function
$ cat ./User/xrobot_main.hpp
#include "app_framework.hpp"
#include "libxr.hpp"

// Module headers
#include "BlinkLED.hpp"
#include "MySensor.hpp"

static void XRobotMain(LibXR::HardwareContainer &hw) {
  using namespace LibXR;
  ApplicationManager appmgr;

  // Auto-generated module instantiations
  static BlinkLED blinkled(hw, appmgr, 250);
  static MySensor MySensor_0(hw, appmgr);

  while (true) {
    appmgr.MonitorAll();
    Thread::Sleep(1000);
  }
}
```
