---
id: stm32-code-gen-pwm
title: PWM
sidebar_position: 7
---

# PWM

代码生成工具会解析所有配置为PWM输出的定时器通道并生成代码。

## 示例

第三个参数为`true`时，使用此定时器通道的互补输出。

```cpp
STM32PWM pwm_timX_chX(&htimX, TIM_CHANNEL_X, false);
```
