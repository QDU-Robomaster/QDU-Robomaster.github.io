---
id: stm32-code-gen-spi
title: SPI
sidebar_position: 8
---

# SPI

You need to enable the corresponding DMA channels in STM32CubeMX and also enable SPI interrupts.

## Example

The last parameter determines the minimum number of bytes required to enable DMA transfer. If the data size is smaller than this value, DMA will not be used.

```cpp
STM32SPI spi1(&hspi1, spi1_rx_buf, spi1_tx_buf, 3);
```

## Configuration File

After code generation, an SPI configuration section will appear in the `User/libxr_config.yaml` file, formatted as follows:

```yaml
SPI:
  spi1:
    tx_buffer_size: 32
    rx_buffer_size: 32
    dma_section: ''
    dma_enable_min_size: 3
```

You can directly modify this file. To apply the updated configuration, run one of the following commands to regenerate the code:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
