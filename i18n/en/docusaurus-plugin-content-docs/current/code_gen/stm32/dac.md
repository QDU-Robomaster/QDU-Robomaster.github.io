---
id: stm32-code-gen-dac
title: DAC
sidebar_position: 6
---

# DAC

DMA is not enabled; this is for standard DAC output only.

## Example

The code generator will read the enabled channels for each DAC peripheral and generate code like:

```cpp
STM32DAC dac1_out1(&hdac1, DAC_CHANNEL_1, 0.0, 3.3);
```

## Configuration File

After the code generation step, a DAC configuration will appear in the `User/libxr_config.yaml` file in the following format:

```yaml
DAC:
  dac1:
    init_voltage: 0.0
    vref: 3.3
```

Here, `init_voltage` is the initial output voltage, and `vref` is the reference voltage.

You can edit this file directly. To apply the updated configuration, run either of the following commands to regenerate code:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
