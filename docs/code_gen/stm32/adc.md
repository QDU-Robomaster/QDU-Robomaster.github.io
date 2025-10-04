---
id: stm32-code-gen-adc
title: ADC
sidebar_position: 5
---

# ADC

推荐在STM32CubeMX里面开启dma传输，使能连续转换并将dma通道配置为循环模式。

## 示例

代码生成工具会读取每个ADC外设开启的通道和连续转换模式下的通道顺序，生成如下代码:

```cpp
// 生成ADC对象
STM32ADC adcX(&hadcX, adcX_buf, {ADC_CHANNEL_1, ADC_CHANNEL_2, ...}, 3.3);

// 获取每个ADC通道对象
auto adcX_adc_channel_1 = adcX.GetChannel(0);
auto adcX_adc_channel_2 = adcX.GetChannel(1);
...
```

STM32ADC类并不是由ADC基类的派生，而是包含了多个由ADC基类派生的ADC通道对象。

## 配置文件

在上一步代码生成后，会在`User/libxr_config.yaml`文件中出现ADC配置文件，格式如下：

```yaml
ADC:
  adcX:
    buffer_size: 128
    dma_section: ''
    vref: 3.3
```

其中`buffer_size`为ADC缓冲区大小，`dma_section`为缓冲区所在的内存区域，`vref`为ADC参考电压，单位为V。

可直接修改该文件。如需应用更新配置，请执行以下任一命令以重新生成代码：  
`xr_cubemx_cfg -d .`  
或  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
