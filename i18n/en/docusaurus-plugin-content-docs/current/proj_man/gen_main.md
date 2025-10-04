---
id: proj-man-gen-main
title: Generate Main Function
sidebar_position: 3
---

# Auto-Generate Main Function (XRobotMain)

XRobot provides a main function generator tool `xrobot_gen_main`, which extracts constructor parameters from each module’s header `MANIFEST` section and automatically generates a unified entry function `XRobotMain` for building complete embedded applications efficiently.

---

## 1. What is XRobotMain?

`XRobotMain` is a unified main function that:

- Instantiates each module (based on MANIFEST parameters)
- Builds dependency relationships between modules
- Periodically calls each module's `Monitor()` method

The generated file is standard C++ code and can be compiled and used directly.

---

## 2. Quick Start

In a valid module directory structure, simply run:

```bash
xrobot_gen_main
```

Sample output:

```bash
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```

You will get two new files:

- `User/xrobot.yaml`: configuration file (you can edit parameters)
- `User/xrobot_main.hpp`: auto-generated main function source code

---

## 3. Modify Module Constructor Parameters

Open `User/xrobot.yaml`:

```yaml
global_settings:
  monitor_sleep_ms: 1000

modules:
  - name: BlinkLED
    constructor_args:
      blink_cycle: 250
```

You can adjust the parameters and rerun `xrobot_gen_main` to regenerate the updated main function.

---

## 4. Use an Existing Configuration File

If you already have a `xrobot.yaml` file, you can specify it explicitly:

```bash
xrobot_gen_main --config User/xrobot.yaml
```

This avoids re-scanning modules or overwriting existing settings.

---

## 5. Support for Template Parameters and Instance IDs

If a module's MANIFEST includes `template_args`, they will also be generated:

```yaml
- name: PID
  constructor_args:
    kp: 1.0
    ki: 0.2
  template_args:
    T: float
  id: pid_left
```

Generated code will look like:

```cpp
static PID<float> pid_left(hw, appmgr, 1.0, 0.2);
```

---

## 6. What Does the Generated Main Function Look Like?

```cpp
#include "app_framework.hpp"
#include "libxr.hpp"

// Module headers
#include "BlinkLED.hpp"

static void XRobotMain(LibXR::HardwareContainer &hw) {
  using namespace LibXR;
  ApplicationManager appmgr;

  // Auto-generated module instantiations
  static BlinkLED blinkled(hw, appmgr, 250);

  while (true) {
    appmgr.MonitorAll();
    Thread::Sleep(1000);
  }
}
```

---

## 8. Recommended Workflow

1. Ensure each module header includes a `=== MODULE MANIFEST` comment block
2. Run `xrobot_gen_main` to generate configuration and main function
3. Manually tweak YAML parameter values
4. Rerun the tool to regenerate the main function
5. Call `XRobotMain()` in your project to initialize the system
