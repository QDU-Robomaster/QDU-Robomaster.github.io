---
id: stm32-code-gen-cache
title: Cache
sidebar_position: 13
---

# Cache (High Performance Cache)

In STM32 H7/F7 series with Cache support, the **LibXR** framework has already adapted to Cache features and automatically synchronizes Cache to ensure data consistency. Users only need to enable I-Cache and D-Cache in CubeMX to achieve high performance, without manually configuring the MPU.

---

## Basic Cache Configuration

- Refer to `ST AN4839 Application Note`: **When MPU is disabled, SRAM areas default to WBWA (Write-Back, Write-Allocate) mode.**
- When MPU is enabled, cache policy can be customized. (Not discussed here)

---

## Recommended DMA Buffer Memory Regions

Taking STM32H750 as an example, it has several internal RAM regions: **AXI RAM, SRAM1/2/3/4, ITCMRAM, DTCMRAM**. Their relation to Cache and DMA is as follows:

- ✅: **No need to care about Cache consistency** (TCM, directly connected to CPU, inaccessible to DMA)
- 🔄: **Requires Cache synchronization** (Cacheable, accessible by DMA/CPU, handled by LibXR)
- ❌: **DMA inaccessible**

|      | AXI RAM | SRAM1 | SRAM2 | SRAM3 | SRAM4 | ITCMRAM | DTCMRAM |
| ---- | ------- | ----- | ----- | ----- | ----- | ------- | ------- |
| CPU  | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ✅       | ✅       |
| DMA1 | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ❌       | ❌       |
| DMA2 | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ❌       | ❌       |
| BDMA | ❌       | ❌     | ❌     | ❌     | 🔄     | ❌       | ❌       |

**Notes:**

- AXI RAM, SRAM1~4: Suitable for large buffers, but **require Cache sync when accessed by DMA** (handled by LibXR).
- ITCMRAM, DTCMRAM: CPU-exclusive, high-speed, low-latency, **not involved in Cache, unsuitable for DMA buffers** (usually inaccessible to DMA).
- SRAM4: The only BDMA-accessible region on STM32H7, suitable for special peripheral buffers.

---

## Linker Script Section Example

In the `.ld` file of STM32H7, you can add sections like below to place variables in physical memory areas:

```ld
.ram_d3 (NOLOAD) : 
{
  . = ALIGN(4);
  *(.ram_d3)
  *(.ram_d3*)
  . = ALIGN(4);
} >RAM_D3

.axi_ram (NOLOAD) :
{
  . = ALIGN(4);
  *(.axi_ram)
  *(.axi_ram*)
  . = ALIGN(4);
} >RAM
```

---

## LibXR Buffer Allocation Example

In LibXR's `libxr_config.yaml` or your project config, it's recommended to **explicitly assign memory sections for each DMA peripheral**, for example:

```yaml
SPI:
  spi4:
    tx_buffer_size: 32
    rx_buffer_size: 32
    dma_section: '.axi_ram'
    dma_enable_min_size: 3
I2C:
  i2c1:
    buffer_size: 32
    dma_section: '.axi_ram'
    dma_enable_min_size: 3
USART:
  lpuart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    dma_section: '.ram_d3'
    tx_queue_size: 5
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    dma_section: '.axi_ram'
    tx_queue_size: 5
ADC:
  adc3:
    buffer_size: 128
    dma_section: '.ram_d3'
    vref: 3.3
```

---

## Generated Code Example

Run `xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp` to auto-generate:

```cpp
static uint16_t adc3_buf[64] __attribute__((section(".ram_d3")));
static uint8_t spi4_tx_buf[32] __attribute__((section(".axi_ram")));
static uint8_t spi4_rx_buf[32] __attribute__((section(".axi_ram")));
static uint8_t lpuart1_tx_buf[128] __attribute__((section(".ram_d3")));
static uint8_t lpuart1_rx_buf[128] __attribute__((section(".ram_d3")));
static uint8_t usart1_tx_buf[128] __attribute__((section(".axi_ram")));
static uint8_t usart1_rx_buf[128] __attribute__((section(".axi_ram")));
static uint8_t i2c1_buf[32] __attribute__((section(".axi_ram")));
```

## Usage

No special handling needed; usage is the same as without Cache.
