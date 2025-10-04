---
id: proj-man-init-mod
title: Initialize Module Repositories
sidebar_position: 1
---

# Initialize Module Repositories

XRobot provides the module initialization tool `xrobot_init_mod` to automatically fetch and synchronize your project's dependency module repositories. This tool supports both **local config files** and **remote config files**, and it can **recursively resolve module dependencies** to ensure all versions are consistent.

---

## Basic Usage

### 1. First Run (Auto-generate Config Template)

If no config file (e.g., `Modules/modules.yaml`) exists, the tool will create a template on first run:

```bash
$ xrobot_init_mod
[WARN] Configuration file not found, creating template: Modules/modules.yaml
[INFO] Please edit the configuration file and rerun this script.
```

You just need to fill in the module list like:

```yaml
modules:
  - xrobot-org/BlinkLED
  - xrobot-org/MySensor@master
```

Then re-run to automatically fetch all module repositories:

```bash
$ xrobot_init_mod
[INFO] Cloning new module: BlinkLED
[INFO] Cloning new module: MySensor
[SUCCESS] All modules and their dependencies processed.
```

---

### 2. Specify Local Config File

To use a specific local config file, use the `--config` option:

```bash
$ xrobot_init_mod --config Modules/modules.yaml
[INFO] Updating module: BlinkLED
[SUCCESS] All modules and their dependencies processed.
```

---

### 3. Specify Remote Config File

You can also use a remote config file (e.g., GitHub raw link):

```bash
$ xrobot_init_mod --config https://raw.githubusercontent.com/<user>/<repo>/<branch>/modules.yaml
[INFO] Cloning new module: BlinkLED
[SUCCESS] All modules and their dependencies processed.
```

---

### 4. Custom Repository Sources (Optional)

XRobot supports multiple module sources and mirrors configured via `sources.yaml`.  
Use the `--sources` option to specify a custom sources file:

```bash
$ xrobot_init_mod --config Modules/modules.yaml --sources Modules/sources.yaml
```

A typical `sources.yaml` example:

```yaml
sources:
- url: https://xrobot-org.github.io/xrobot-modules/index.yaml
  priority: 0
...
```

---

## Recursive Dependency Resolution & Version Consistency

- The tool will **recursively parse all dependent modules** (dependencies are defined in the MANIFEST block of each module header) to ensure a complete and consistent dependency tree.
- If different modules require different versions of the same dependency, the tool will **report a conflict** for you to manually resolve.

---

## CMake Integration

All fetched modules are stored under the `Modules/` directory.  
To include them in your CMake project, simply add:

```cmake
# Include XRobot Modules
include(${CMAKE_CURRENT_LIST_DIR}/Modules/CMakeLists.txt)
```

Don't forget to include LibXR too!

```cmake
# A simple example
project(xrobot_mod_test CXX)
set(CMAKE_CXX_STANDARD 17)
add_executable(xr_test main.cpp)
add_subdirectory(libxr)
target_include_directories(xr_test PUBLIC $<TARGET_PROPERTY:xr,INTERFACE_INCLUDE_DIRECTORIES> ${CMAKE_SOURCE_DIR}/User)
target_link_libraries(xr_test PUBLIC xr)
include(Modules/CMakeLists.txt)
```
