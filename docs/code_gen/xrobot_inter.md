---
id: code-gen-xrobot-inter
title: 与XRobot集成
sidebar_position: 2
---

# 与XRobot集成

在代码生成时加入`--xrobot`选项，可以生成对应的硬件容器（[LibXR::HardwareContainer](https://jiu-xiao.github.io/libxr/class_lib_x_r_1_1_hardware_container.html)）以供XRobot初始化。

## 示例

```bash
xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp --xrobot
[INFO] Detected FreeRTOS configuration
[INFO] FlashLayout is generated and injected, MCU: STM32G431KBU6
[INFO] Flash layout map written to: ./User/flash_map.hpp
[INFO] Successfully generated: ./User
[INFO] Generated header file: app_main.h
```

会在app_main.cpp中额外生成以下代码：

```cpp
  LibXR::HardwareContainer peripherals{
    LibXR::Entry<LibXR::PowerManager>({power_manager, {"power_manager"}}),
    ...
  };

  XRobotMain(peripherals);
```

同时在libxr_config.yaml中添加外设别名，上层代码可依靠这些别名访问外设：

```yaml
device_aliases:
  power_manager:
    type: PowerManager
    aliases:
    - power_manager
  LED:
    type: GPIO
    aliases:
    - LED
    - led_red
  ...
```
