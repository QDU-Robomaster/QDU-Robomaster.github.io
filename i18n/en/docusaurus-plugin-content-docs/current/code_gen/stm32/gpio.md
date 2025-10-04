---
id: stm32-code-gen-gpio
title: GPIO
sidebar_position: 4
---

# GPIO

LibXR provides GPIO initialization in two modes: standard input/output pins and interrupt pins.

## Example

Based on whether the pin is configured as an external interrupt in STM32CubeMX, the generated code will be as follows:

```cpp
// GPIO configured as a standard input/output pin
STM32GPIO gpioA0(GPIOA, GPIO_PIN_0);

// GPIO configured as an external interrupt pin
STM32GPIO gpioA1(GPIOA, GPIO_PIN_1, EXTI1_IRQn);
```
