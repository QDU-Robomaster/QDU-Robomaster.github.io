---
id: stm32-code-gen-gpio
title: GPIO
sidebar_position: 4
---

# GPIO

LibXR提供了GPIO的初始化，分为两种方式：普通输入输出引脚和中断引脚。

## 示例

根据在STM32CubeMX中是否配置为外部中断，生成如下代码:

```cpp
// GPIO配置为普通输入输出引脚
STM32GPIO gpioA0(GPIOA, GPIO_PIN_0);

// GPIO配置为外部中断引脚
STM32GPIO gpioA1(GPIOA, GPIO_PIN_1, EXTI1_IRQn);
```
