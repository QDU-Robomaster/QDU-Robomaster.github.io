---
id: code-gen-xrobot-inter
title: Integrate with XRobot
sidebar_position: 2
---

# Integrate with XRobot

By including the `--xrobot` flag during code generation, the tool will produce a hardware container （[LibXR::HardwareContainer](https://jiu-xiao.github.io/libxr/class_lib_x_r_1_1_hardware_container.html)） specifically designed for XRobot initialization and runtime integration.

## Example

```bash
xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp --xrobot
[INFO] Detected FreeRTOS configuration
[INFO] FlashLayout is generated and injected, MCU: STM32G431KBU6
[INFO] Flash layout map written to: ./User/flash_map.hpp
[INFO] Successfully generated: ./User
[INFO] Generated header file: app_main.h
```

This will append the following XRobot-compatible structure in `app_main.cpp`:

```cpp
  LibXR::HardwareContainer peripherals{
    LibXR::Entry<LibXR::PowerManager>({power_manager, {"power_manager"}}),
    ...
  };

  XRobotMain(peripherals);
```

In addition, device aliases are declared in `libxr_config.yaml`, enabling high-level access via symbolic names:

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
