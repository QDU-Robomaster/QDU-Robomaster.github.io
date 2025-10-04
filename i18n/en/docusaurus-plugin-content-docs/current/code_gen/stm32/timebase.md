---
id: stm32-code-gen-timebase
title: Timebase
sidebar_position: 2
---

# Timebase

By default, STM32CubeMX uses the Systick timer as the system timebase, but other timers can be manually selected as well.

For bare-metal systems, it is recommended to keep Systick as the timebase, but the interrupt priority of Systick should be set to the highest.

For RTOS-based systems, it is advisable to assign a different timer as the timebase and also set its interrupt priority to the highest.

## Example

The code generator will produce the following based on the timebase configuration in STM32CubeMX:

```cpp
// Using Systick as the timebase
STM32Timebase timebase();
```

```cpp
// Using a hardware timer as the timebase
STM32TimerTimebase timebase(&htimX); // X refers to the configured timer used as the timebase
```

## Usage

```cpp
// Get microsecond-level timestamp
LibXR::Timebase::GetMicroseconds();

// Get millisecond-level timestamp
LibXR::Timebase::GetMilliseconds();
```
