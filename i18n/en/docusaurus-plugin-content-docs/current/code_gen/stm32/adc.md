---
id: stm32-code-gen-adc
title: ADC
sidebar_position: 5
---

# ADC

It is recommended to enable DMA transfer in STM32CubeMX, activate continuous conversion, and configure the DMA channel in circular mode.

## Example

The code generator will read the enabled channels for each ADC peripheral and their order in continuous conversion mode to generate the following code:

```cpp
// Create the ADC object
STM32ADC adcX(&hadcX, adcX_buf, {ADC_CHANNEL_1, ADC_CHANNEL_2, ...}, 3.3);

// Retrieve each ADC channel object
auto adcX_adc_channel_1 = adcX.GetChannel(0);
auto adcX_adc_channel_2 = adcX.GetChannel(1);
...
```

Note: `STM32ADC` is not derived from the ADC base class. Instead, it contains multiple ADC channel objects that are derived from the base ADC class.

## Configuration File

After the code is generated, an ADC configuration section will appear in the `User/libxr_config.yaml` file, formatted as follows:

```yaml
ADC:
  adcX:
    buffer_size: 128
    dma_section: ''
    vref: 3.3
```

- `buffer_size`: The size of the ADC buffer.  
- `dma_section`: The memory section where the DMA buffer is located.
- `vref`: The reference voltage for the ADC, in volts.

You can modify this file directly. To apply the updated configuration, run either of the following commands to regenerate the code:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
