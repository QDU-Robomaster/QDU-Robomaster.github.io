---
id: proj-man-gen-main
title: 生成主函数
sidebar_position: 3
---

# 自动生成主函数（XRobotMain）

XRobot 提供了自动主函数生成工具 `xrobot_gen_main`，可根据每个模块头文件中的 MANIFEST 信息，自动提取构造参数并生成统一入口函数 `XRobotMain`，用于快速搭建完整的嵌入式应用框架。

---

## 1. 什么是 XRobotMain？

XRobotMain 是一个统一的主函数入口，用于：

- 实例化每个模块（从 MANIFEST 中提取参数）
- 构建模块之间的依赖关系
- 周期性调用每个模块的 `Monitor()` 方法

生成后的文件是标准的 C++ 源码，可以直接编译和使用。

---

## 2. 快速入门

在已有模块目录结构下，直接运行：

```bash
xrobot_gen_main
```

输出类似如下：

```bash
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```

你将看到两个新文件：

- `User/xrobot.yaml`：配置文件（你可以编辑参数）
- `User/xrobot_main.hpp`：主函数源码（自动生成）

---

## 3. 修改模块构造参数

打开 `User/xrobot.yaml`：

```yaml
global_settings:
  monitor_sleep_ms: 1000

modules:
  - name: BlinkLED
    constructor_args:
      blink_cycle: 250
```

你可以修改每个模块的参数，然后重新运行 `xrobot_gen_main`，主函数会自动更新。

---

## 4. 使用已有配置文件

如果你已有 `xrobot.yaml` 配置，可以指定读取：

```bash
xrobot_gen_main --config User/xrobot.yaml
```

这样可以避免重新扫描模块或覆盖配置。

---

## 5. 支持模板参数和实例名

如果模块 MANIFEST 中包含模板参数 `template_args`，也会一并生成：

```yaml
- name: PID
  constructor_args:
    kp: 1.0
    ki: 0.2
  template_args:
    T: float
  id: pid_left
```

生成代码类似：

```cpp
static PID<float> pid_left(hw, appmgr, 1.0, 0.2);
```

---

## 6. 最终生成的主函数长什么样？

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

## 8. 典型工作流推荐

1. 确保每个模块头文件包含 `=== MODULE MANIFEST` 注释块
2. 运行 `xrobot_gen_main` 自动生成配置和主函数
3. 手动调整 YAML 配置中的参数
4. 重复运行命令生成新的主函数
5. 在工程中调用 `XRobotMain()` 即可完成系统初始化
