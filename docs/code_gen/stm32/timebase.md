---
id: stm32-code-gen-timebase
title: 时钟基准
sidebar_position: 2
---

# 时钟基准

STM32CubeMX默认会将Systick作为时钟基准，也可以手动指定其他定时器。

对于裸机来说，保持时钟基准为Systick即可，但是建议将Systick的中断优先级调至最高。

对于RTOS，建议指定其他定时器作为时钟基准，并且将该定时器的中断优先级调至最高。

## 示例

代码生成工具会根据STM32CubeMX的时钟配置生成如下代码:

```cpp
// Systick 作为时钟基准
STM32Timebase timebase();
```

```cpp
// Systick 作为时钟基准
STM32TimerTimebase timebase(&htimX); // X 为时钟基准的定时器
```

## 使用

```cpp
// 获取微秒级时间戳
LibXR::Timebase::GetMicroseconds();

// 获取毫秒级时间戳
LibXR::Timebase::GetMilliseconds();
```
