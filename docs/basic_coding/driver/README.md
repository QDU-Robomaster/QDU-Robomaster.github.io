---
id: device-coding
title: 外设驱动
sidebar_position: 5
---

# 外设驱动（Device Drivers）

本模块汇总 LibXR 对常见硬件外设的抽象接口，提供统一的面向对象编程方式，支持异步操作、配置封装、平台适配等特性。

LibXR 所有设备接口均遵循以下设计原则：

- **平台无关**：抽象类接口统一命名、统一行为，不依赖底层硬件寄存器或驱动结构；
- **支持异步操作**：基于 `ReadPort` / `WritePort` 的通用操作模型，适配中断、DMA 等硬件机制；
- **类型安全**：接口参数和配置结构体使用强类型封装，提升可靠性与代码可读性；
- **最小依赖**：核心模块仅依赖 C++17 特性和 LibXR 基础组件，适用于裸机和各种 RTOS 平台；
- **灵活扩展**：每种外设可根据平台能力裁剪实现，支持复用系统资源（如共享总线）；

---

## 快速导航

- [GPIO（通用输入输出）](./gpio.md)
- [UART（串口通信）](./uart.md)
- [I2C（I2C 总线）](./i2c.md)
- [SPI（SPI 接口）](./spi.md)
- [CAN / FDCAN（控制器局域网）](./can.md)
- [ADC（模数转换）](./adc.md)
- [PWM（脉宽调制）](./pwm.md)
- [Flash（闪存接口）](./flash.md)
- [Power（电源管理）](./power.md)
- [Timebase（时间基准）](./timebase.md)

---

## 使用示例

每个外设抽象类通常包含以下组成：

- `Configuration` 配置结构体
- `SetConfig()` 设置接口
- `Read()` / `Write()` 数据传输接口
- `Enable()` / `Disable()` 控制接口（若适用）
- `Callback` 事件响应注册（如中断）

用户无需关心底层是STM32UART、ESP32UART还是LinuxUART，只需拿到基类指针并调用接口即可。
