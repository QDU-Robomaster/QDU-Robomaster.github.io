---
id: stm32-code-gen-pwm
title: PWM
sidebar_position: 7
---

# PWM

The code generation tool will parse all timer channels configured for PWM output and generate the corresponding code.

## Example

When the third parameter is set to `true`, the complementary output of this timer channel is used.

```cpp
STM32PWM pwm_timX_chX(&htimX, TIM_CHANNEL_X, false);
```
