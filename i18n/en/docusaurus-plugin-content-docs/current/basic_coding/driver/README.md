---
id: device-coding
title: Device Drivers
sidebar_position: 5
---

# Device Drivers

This module summarizes LibXR's abstract interfaces for common hardware peripherals, providing a unified object-oriented programming approach. It supports asynchronous operations, configuration encapsulation, and platform adaptation.

All device interfaces in LibXR follow these design principles:

- **Platform Independent**: Abstract class interfaces have unified naming and behavior, independent of low-level hardware registers or driver structures;  
- **Asynchronous Operation Support**: Uses the general operation model based on `ReadPort` / `WritePort`, compatible with interrupts, DMA, and other hardware mechanisms;  
- **Type Safety**: Interface parameters and configuration structures use strong typing to improve reliability and code readability;  
- **Minimal Dependencies**: Core modules rely only on C++17 features and basic LibXR components, suitable for bare-metal systems and various RTOS platforms;  
- **Flexible Extension**: Each peripheral can be implemented according to platform capabilities, supporting resource reuse (e.g., shared buses);  

---

## Quick Navigation

- [GPIO (General Purpose Input/Output)](./gpio.md)  
- [UART (Serial Communication)](./uart.md)  
- [I2C (I2C Bus)](./i2c.md)  
- [SPI (SPI Interface)](./spi.md)  
- [CAN / FDCAN (Controller Area Network)](./can.md)  
- [ADC (Analog-to-Digital Conversion)](./adc.md)  
- [PWM (Pulse-Width Modulation)](./pwm.md)  
- [Flash (Flash Interface)](./flash.md)  
- [Power (Power Management)](./power.md)  
- [Timebase (Time Base)](./timebase.md)  

---

## Usage Example

Each peripheral abstraction class typically includes the following components:

- `Configuration` structure for settings  
- `SetConfig()` configuration interface  
- `Read()` / `Write()` for data transfer  
- `Enable()` / `Disable()` for control (if applicable)  
- `Callback` registration for event handling (e.g., interrupts)  

Users do not need to worry whether the backend is STM32UART, ESP32UART, or LinuxUART — just use the base class pointer and call the provided interface.
