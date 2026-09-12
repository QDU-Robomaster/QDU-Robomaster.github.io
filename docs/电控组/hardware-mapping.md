---
id: ee-hardware-mapping
title: 外设映射
slug: /电控组/hardware-mapping
sidebar_position: 5
---

# 外设映射

`bsp-dev-c/User/app_main.cpp` 创建外设对象，并通过 HardwareContainer 注册名称。YAML 中的 `can_bus_name`、`uart_name` 等参数使用这些名称。

## C 板常用外设

| 名称 | 对象 |
| --- | --- |
| `can1`、`imu_can` | CAN1 |
| `can2` | CAN2 |
| `spi_bmi088` | SPI1 |
| `bmi088_accl_cs`、`bmi088_gyro_cs` | BMI088 加速度计、陀螺仪片选 |
| `bmi088_accl_int`、`bmi088_gyro_int` | BMI088 两路数据就绪中断 |
| `pwm_bmi088_heat` | TIM10 CH1 |
| `uart_dr16` | USART3 |
| `uart_referee`、`imu_data_uart` | USART1 |
| `uart_ai`、`uart_ext_controller` | USART6 |
| `usb_ai`、`usb_otg_fs_cdc` | USB OTG FS CDC |
| `usb_otg_hs_cdc` | USB OTG HS CDC |
| `CAMERA` | 相机触发 GPIO |
| `pwm_buzzer` | TIM4 CH3 |
| `pwm_launcher_cover_servo`、`pwm_a` | TIM1 CH1 |
| `adc_bat` | ADC3 通道 8 |

同一行的多个名字是别名，指向同一个对象。引脚位置、电平和接线还需查板卡原理图与 `.ioc`。MC02 使用自己的外设映射。

## 两路 USB CDC

当前 C 板的标准输入输出接在 FS CDC：

```cpp
STDIO::read_ = usb_otg_fs_cdc.read_port_;
STDIO::write_ = usb_otg_fs_cdc.write_port_;
```

`omni_infantry_3.yaml` 的主机通信使用 HS CDC：

```yaml
uart_name: usb_otg_hs_cdc
```

因此终端接 FS，自瞄通信按这份配置接 HS。USB CDC 在 LibXR 中使用 UART 接口，参数叫 `uart_name`。

## 从配置查到对象

在 YAML 中找到逻辑名，然后到 `User/app_main.cpp` 搜索同名注册项。例如：

```cpp
LibXR::Entry<LibXR::UART>({usb_otg_hs_cdc, {"usb_otg_hs_cdc"}}),
```

更改外设时，一起检查 `.ioc` 的初始化设置、`app_main.cpp` 中的对象和缓冲区，以及 YAML 引用。模块参数改变则直接修改对应配置。

源码：[bsp-dev-c](https://github.com/QDU-Robomaster/bsp-dev-c)。
