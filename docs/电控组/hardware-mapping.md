---
id: ee-hardware-mapping
title: 外设映射
slug: /电控组/hardware-mapping
sidebar_position: 5
---

# 外设映射

`bsp-dev-c/User/app_main.cpp` 创建外设对象，并用 `XR_REGISTER` 注册。配置中 `can_bus`、`uart` 等硬件参数填写这些对象名。

## C 板常用外设

| 名称 | 对象 | 0.x 别名 |
| --- | --- | --- |
| `can1` | CAN1 | `imu_can` |
| `can2` | CAN2 | |
| `spi1` | SPI1 | `spi_bmi088` |
| `ACCL_CS`、`GYRO_CS` | BMI088 加速度计、陀螺仪片选 | `bmi088_accl_cs`、`bmi088_gyro_cs` |
| `ACCL_INT`、`GYRO_INT` | BMI088 两路数据就绪中断 | `bmi088_accl_int`、`bmi088_gyro_int` |
| `pwm_tim10_ch1` | TIM10 CH1 | `pwm_bmi088_heat` |
| `usart3` | USART3 | `uart_dr16` |
| `usart1` | USART1 | `uart_referee`、`imu_data_uart` |
| `usart6` | USART6 | `uart_ai`、`uart_ext_controller` |
| `usb_otg_fs_cdc` | USB OTG FS CDC | `usb_ai` |
| `usb_otg_hs_cdc`、`usb_otg_hs_cdc2` | USB OTG HS 两路 CDC | |
| `CAMERA` | 相机触发 GPIO | |
| `pwm_tim4_ch3` | TIM4 CH3 | `pwm_buzzer` |
| `pwm_tim1_ch1` | TIM1 CH1 | `pwm_launcher_cover_servo`、`pwm_a` |
| `adc3_adc_channel_8` | ADC3 通道 8 | `adc_bat` |

配置直接使用注册的对象名，0.x 别名列只用于对照旧配置。引脚位置、电平和接线还需查板卡原理图与 `.ioc`。MC02 使用自己的外设映射。

## 两路 USB CDC

当前 C 板的标准输入输出接在 FS CDC：

```cpp
STDIO::read_ = usb_otg_fs_cdc.read_port_;
STDIO::write_ = usb_otg_fs_cdc.write_port_;
```

`omni_infantry_3.yaml` 的主机通信使用 HS CDC：

```yaml
- uart: usb_otg_hs_cdc
```

因此终端接 FS，自瞄通信按这份配置接 HS。USB CDC 在 LibXR 中以 `LibXR::UART` 注册，模块参数为 `uart`。

## 从配置查到对象

在 YAML 中找到对象名，然后到 `User/app_main.cpp` 搜索同名注册项。例如：

```cpp
XR_REGISTER(usb_otg_hs_cdc, LibXR::UART);
```

更改外设时，一起检查 `.ioc` 的初始化设置、`app_main.cpp` 中的对象和缓冲区，以及 YAML 引用。模块参数改变则直接修改对应配置。

源码：[bsp-dev-c](https://github.com/QDU-Robomaster/bsp-dev-c)。
