---
id: stm32-code-gen-i2c
title: I2C
sidebar_position: 9
---

# I2C

In STM32CubeMX, you should enable the DMA channels for I2C and configure the necessary interrupt settings.

## Example

The last parameter specifies the minimum number of bytes to trigger DMA transfer. If the data size is below this threshold, DMA will not be used.

```cpp
STM32I2C i2c1(&hi2c1, i2c1_buf, 3);
```

## Configuration File

After code generation, an I2C configuration section will appear in the `User/libxr_config.yaml` file, formatted as follows:

```yaml
I2C:
  i2c1:
    buffer_size: 32
    dma_section: ''
    dma_enable_min_size: 3
```

- `buffer_size`: Size of the I2C transmission/reception buffer.  
- `dma_section`: The memory section where the DMA buffer is located.
- `dma_enable_min_size`: Minimum data size required to enable DMA transfer.

You can directly modify this file. To apply the updated configuration, run one of the following commands to regenerate the code:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
