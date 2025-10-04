---
id: stm32-code-gen-dac
title: DAC
sidebar_position: 6
---

# DAC

无需开启DMA，只做普通DAC输出。

## 示例

代码生成工具会读取每个DAC外设开启的通道，生成如下代码:

```cpp
STM32DAC dac1_out1(&hdac1, DAC_CHANNEL_1, 0.0, 3.3);
```

## 配置文件

在上一步代码生成后，会在`User/libxr_config.yaml`文件中出现ADC配置文件，格式如下：

```yaml
DAC:
  dac1:
    init_voltage: 0.0
    vref: 3.3
```

其中`init_voltage`为初始输出电压，`vref`为参考电压。

可直接修改该文件。如需应用更新配置，请执行以下任一命令以重新生成代码：  
`xr_cubemx_cfg -d .`  
或  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
