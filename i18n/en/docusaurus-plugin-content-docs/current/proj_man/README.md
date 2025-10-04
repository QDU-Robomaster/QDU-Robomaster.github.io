---
id: proj-man
title: Project Management (XRobot)
sidebar_position: 7
---

# Project Management (XRobot)

XRobot is an automated code generation toolset designed for embedded systems (e.g., STM32), used in conjunction with the modular hardware abstraction layer LibXR. It supports module repository management, parameter configuration, and automatic main function generation, significantly improving engineering organization and development efficiency in embedded projects.

This chapter introduces XRobot's installation, directory structure, main features, CLI usage, and a full quick start workflow.

---

## Installation

**Recommended:** Install via `pipx` (supports isolated environments):

**Windows:**

```ps
python -m pip install --user pipx
python -m pipx ensurepath
pipx install xrobot
# Restart terminal
```

**Linux:**

```bash
sudo apt install pipx
pipx install xrobot
pipx ensurepath
# Restart terminal
```

**Or install with pip:**

```bash
pip install xrobot
```

**Source installation:**

```bash
git clone https://github.com/xrobot-org/XRobot.git
cd XRobot
pip install .
```

Please note that you should not use both pip and pipx to install the same package at the same time. If you do, your environment variables may become confused and cause version conflicts.

---

## Directory Structure Convention

XRobot recommends the following layout for module management and code generation:

```text
YourProject/
├── Modules/               # Stores module repositories
│   └── modules.yaml       # Repository list
│   └── sources.yaml       # (Optional) Source index
├── User/                  # User config and output files
│   ├── xrobot.yaml        # Configuration for construction
│   └── xrobot_main.hpp    # Auto-generated main function
```

---

## Feature Overview

- **Module repository fetch & sync**  
  Automatically fetches, syncs, and recursively parses module repositories to ensure dependency and version consistency.
- **Parameter auto-detection & configuration**  
  Automatically extracts parameters from module headers and manages YAML configuration.
- **Main function auto-generation**  
  Automatically generates a `XRobotMain()` C++ entry function based on configuration, supporting multiple modules, instances, and nesting.
- **Manifest parsing**  
  Parses and formats module manifest headers.
- **Module template generation**  
  One-click generation of a standardized module folder with CI.
- **Multi-source module management**  
  Supports local/remote YAML configuration and multi-source repository indexing.

---

## CLI Tools Summary

| Command               | Description                                              |
|-----------------------|----------------------------------------------------------|
| `xrobot_gen_main`     | Generate main C++ entry source file                      |
| `xrobot_mod_parser`   | Parse and show module manifest                           |
| `xrobot_create_mod`   | Create a new module folder & header                      |
| `xrobot_init_mod`     | Clone and recursively sync all module repos              |
| `xrobot_setup`        | One-click workspace setup & main function generation     |
| `xrobot_add_mod`      | Add repo or append module instance config                |
| `xrobot_src_man`      | Multi-source module repository management utility        |

See the following sections for detailed options and usage.

## Quick Start (Recommended Workflow)

```bash
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
... (cloning output) ...
[SUCCESS] All modules and their dependencies processed.
[INFO] Created default Modules/CMakeLists.txt: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp

All done! Main function generated at: User/xrobot_main.hpp

# 2. Pull or sync module repositories separately (optional)
$ xrobot_init_mod --config Modules/modules.yaml --directory Modules
... (sync output) ...

# 3. Create a module
$ xrobot_create_mod MySensor --desc "IMU interface module" --hw i2c1
[OK] Module MySensor generated at Modules/MySensor

# 4. View module information
$ xrobot_mod_parser --path ./Modules/MySensor/

=== Module: MySensor.hpp ===
Description       : IMU interface module
Constructor Args  :
Required Hardware : i2c1
Depends           : None

# 5. Add a module repository (custom source, optional)
$ xrobot_add_mod your-namespace/YourModule@main
[SUCCESS] Added repo module 'your-namespace/YourModule@main' to Modules/modules.yaml

# 6. Add a module instance
$ xrobot_add_mod MySensor
[SUCCESS] Appended module instance 'MySensor' as id 'MySensor_0' to User/xrobot.yaml

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

# 8. Regenerate main function (auto scan & config supported)
$ xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED, MySensor
[SUCCESS] Generated entry file: User/xrobot_main.hpp

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
