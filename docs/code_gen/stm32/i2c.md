---
id: stm32-code-gen-i2c
title: I2C
sidebar_position: 9
---

# I2C

在 STM32CubeMX 中，需要启用 I2C 对应的 DMA 通道，并配置相关中断。

## 示例

最后一个参数表示启用 DMA 传输的最小字节数，低于该值将不启用 DMA。

```cpp
STM32I2C i2c1(&hi2c1, i2c1_buf, 3);
```

## 配置文件

代码生成后，会在 `User/libxr_config.yaml` 文件中生成如下 I2C 配置：

```yaml
I2C:
  i2c1:
    buffer_size: 32
    dma_section: ''
    dma_enable_min_size: 3
```

- `buffer_size`：I2C 传输/接收缓冲区大小  
- `dma_section`：缓冲区所在的内存区域
- `dma_enable_min_size`：启用 DMA 的最小传输字节数

可直接修改该文件。如需应用更新配置，请执行以下任一命令以重新生成代码：  
`xr_cubemx_cfg -d .`  
或  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
